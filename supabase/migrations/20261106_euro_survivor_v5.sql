-- ============================================================================
-- FUTVIVOR 2.0 — MIGRATION V5: EURO-SURVIVOR, TARJETAS AMARILLAS, RONDAS & SALAS ABIERTAS
-- ============================================================================
-- Ejecuta este script en el SQL Editor de Supabase (es 100% idempotente y
-- conserva intactas todas las ligas, vidas y selecciones actuales).
-- ============================================================================

-- 0. Asegurar tabla de Chat en Tiempo Real (Migration V3 pendiente)
CREATE TABLE IF NOT EXISTS sur_league_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id UUID REFERENCES sur_leagues(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sur_league_messages_league_created
  ON sur_league_messages(league_id, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'sur_league_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sur_league_messages;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 1. Registrar las 4 Ligas Principales + Competición Paraguas "Euro-Survivor"
UPDATE sur_competitions SET is_active = false WHERE short_name NOT IN ('euro_survivor', 'laliga', 'premier', 'seriea', 'bundesliga');

INSERT INTO sur_competitions (name, short_name, country, season, total_jornadas, is_active)
VALUES
  ('Euro-Survivor (4 Grandes Ligas)', 'euro_survivor', 'EU', '2026-27', 38, true),
  ('LaLiga 26/27', 'laliga', 'ES', '2026-27', 38, true),
  ('Premier League 26/27', 'premier', 'EN', '2026-27', 38, true),
  ('Serie A 26/27', 'seriea', 'IT', '2026-27', 38, true),
  ('Bundesliga 26/27', 'bundesliga', 'DE', '2026-27', 34, true)
ON CONFLICT (short_name) DO UPDATE
  SET name = EXCLUDED.name,
      is_active = EXCLUDED.is_active;

-- Asegurar configuración activa en Jornada 1 para Euro-Survivor
INSERT INTO sur_competition_config (competition_id, current_jornada, picks_open, picks_deadline)
SELECT
  euro.id,
  COALESCE(ll.current_jornada, 1),
  true,
  COALESCE(ll.picks_deadline, '2026-11-06T20:00:00Z'::timestamptz)
FROM sur_competitions euro
LEFT JOIN sur_competitions laliga ON laliga.short_name = 'laliga'
LEFT JOIN sur_competition_config ll ON ll.competition_id = laliga.id
WHERE euro.short_name = 'euro_survivor'
ON CONFLICT (competition_id) DO NOTHING;

-- 2. Ventanas Globales de Fin de Semana (sur_windows)
CREATE TABLE IF NOT EXISTS sur_windows (
  id SERIAL PRIMARY KEY,
  window_number INT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  picks_open BOOLEAN NOT NULL DEFAULT true,
  picks_deadline TIMESTAMPTZ NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('upcoming', 'open', 'live', 'finished')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sur_matches ADD COLUMN IF NOT EXISTS window_number INT;
ALTER TABLE sur_matches ADD COLUMN IF NOT EXISTS match_date TIMESTAMPTZ;
UPDATE sur_matches SET window_number = jornada WHERE window_number IS NULL;

CREATE INDEX IF NOT EXISTS idx_sur_matches_comp_jornada ON sur_matches(competition_id, jornada);
CREATE INDEX IF NOT EXISTS idx_sur_matches_window ON sur_matches(window_number);

-- 3. Evolucionar sur_leagues para escalado (Grupos Amigos 25, Salas Abiertas 30, Comunidades PRO 250)
ALTER TABLE sur_leagues ADD COLUMN IF NOT EXISTS start_jornada INT DEFAULT 1;
ALTER TABLE sur_leagues ADD COLUMN IF NOT EXISTS league_type TEXT DEFAULT 'private'
  CHECK (league_type IN ('private', 'community', 'official_room'));
ALTER TABLE sur_leagues ADD COLUMN IF NOT EXISTS room_number INT;
ALTER TABLE sur_leagues ADD COLUMN IF NOT EXISTS current_round_number INT DEFAULT 1;
ALTER TABLE sur_leagues ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE sur_leagues ALTER COLUMN max_players SET DEFAULT 25;

-- Marcar la Sala Abierta Oficial #1 (EURO01) con tipo official_room y room_number = 1
UPDATE sur_leagues
SET league_type = 'official_room', room_number = 1, start_jornada = 1
WHERE invite_code = 'EURO01';

CREATE INDEX IF NOT EXISTS idx_sur_leagues_public_lobby
  ON sur_leagues(is_public, league_type, created_at DESC);

-- 4. Nueva Tabla sur_rounds (Separa el Grupo Permanente de cada Partida/Ronda)
CREATE TABLE IF NOT EXISTS sur_rounds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id UUID REFERENCES sur_leagues(id) ON DELETE CASCADE NOT NULL,
  round_number INT NOT NULL DEFAULT 1,
  name TEXT NOT NULL DEFAULT 'Ronda 1',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'active', 'finished')),
  game_mode TEXT NOT NULL DEFAULT 'euro_double' CHECK (game_mode IN ('euro_double', 'single_league')),
  max_lives_per_player INT NOT NULL DEFAULT 1 CHECK (max_lives_per_player BETWEEN 1 AND 5),
  max_yellow_cards INT NOT NULL DEFAULT 2,
  sudden_death_threshold INT NOT NULL DEFAULT 3,
  start_jornada INT NOT NULL DEFAULT 1,
  end_jornada INT,
  winner_entry_id UUID,
  auto_restart BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (league_id, round_number)
);

CREATE INDEX IF NOT EXISTS idx_sur_rounds_league_status ON sur_rounds(league_id, status);

-- Backfill automático: Crear Ronda 1 para todas las ligas existentes sin perder nada
INSERT INTO sur_rounds (
  league_id,
  round_number,
  name,
  status,
  game_mode,
  max_lives_per_player,
  max_yellow_cards,
  start_jornada,
  auto_restart
)
SELECT
  l.id,
  1,
  'Ronda 1',
  'active',
  CASE WHEN c.short_name = 'euro_survivor' THEN 'euro_double' ELSE 'single_league' END,
  1,
  2,
  COALESCE(l.start_jornada, 1),
  true
FROM sur_leagues l
LEFT JOIN sur_competitions c ON c.id = l.competition_id
ON CONFLICT (league_id, round_number) DO NOTHING;

-- 5. Evolucionar sur_entries (Tarjetas Amarillas + Vínculo a Ronda)
ALTER TABLE sur_entries ADD COLUMN IF NOT EXISTS round_id UUID REFERENCES sur_rounds(id) ON DELETE CASCADE;
ALTER TABLE sur_entries ADD COLUMN IF NOT EXISTS yellow_cards INT NOT NULL DEFAULT 0;
ALTER TABLE sur_entries ADD COLUMN IF NOT EXISTS elimination_reason TEXT;
ALTER TABLE sur_entries ADD COLUMN IF NOT EXISTS eliminated_jornada INT;

-- Vincular entradas existentes a la Ronda 1 de su liga
UPDATE sur_entries e
SET round_id = r.id
FROM sur_rounds r
WHERE e.league_id = r.league_id
  AND r.round_number = 1
  AND e.round_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_sur_entries_league_round ON sur_entries(league_id, round_id);
CREATE INDEX IF NOT EXISTS idx_sur_entries_player ON sur_entries(player_id);

-- 6. Evolucionar sur_selections para "Doble Bala" (slot: 'home' | 'euro')
ALTER TABLE sur_selections ADD COLUMN IF NOT EXISTS round_id UUID REFERENCES sur_rounds(id) ON DELETE CASCADE;
ALTER TABLE sur_selections ADD COLUMN IF NOT EXISTS slot TEXT NOT NULL DEFAULT 'home'
  CHECK (slot IN ('home', 'euro'));
ALTER TABLE sur_selections ADD COLUMN IF NOT EXISTS outcome TEXT DEFAULT 'pending'
  CHECK (outcome IN ('pending', 'win', 'draw_yellow', 'loss_red'));
ALTER TABLE sur_selections ADD COLUMN IF NOT EXISTS points_awarded INT DEFAULT 0;
ALTER TABLE sur_selections ADD COLUMN IF NOT EXISTS gf_awarded INT DEFAULT 0;
ALTER TABLE sur_selections ADD COLUMN IF NOT EXISTS is_auto_assigned BOOLEAN DEFAULT false;

-- Vincular selecciones existentes a la ronda de su entry
UPDATE sur_selections s
SET round_id = e.round_id
FROM sur_entries e
WHERE s.entry_id = e.id
  AND s.round_id IS NULL;

-- Reemplazar constraint único antiguo (entry_id, jornada) por (entry_id, jornada, slot)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'sur_selections'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%(entry_id, jornada)%'
      AND pg_get_constraintdef(oid) NOT LIKE '%slot%'
  ) LOOP
    EXECUTE 'ALTER TABLE sur_selections DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'sur_selections'::regclass
      AND conname = 'sur_selections_entry_jornada_slot_key'
  ) THEN
    ALTER TABLE sur_selections
      ADD CONSTRAINT sur_selections_entry_jornada_slot_key UNIQUE (entry_id, jornada, slot);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sur_selections_entry_jornada ON sur_selections(entry_id, jornada);
CREATE INDEX IF NOT EXISTS idx_sur_selections_round_jornada ON sur_selections(round_id, jornada);

-- 7. Permisos RLS permisivos consistentes con la arquitectura actual + RPC Anti-Cheat
ALTER TABLE sur_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE sur_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE sur_league_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sur_windows' AND policyname = 'Public read windows') THEN
    CREATE POLICY "Public read windows" ON sur_windows FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sur_rounds' AND policyname = 'Public read rounds') THEN
    CREATE POLICY "Public read rounds" ON sur_rounds FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sur_rounds' AND policyname = 'Auth write rounds') THEN
    CREATE POLICY "Auth write rounds" ON sur_rounds FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sur_league_messages' AND policyname = 'Public read messages') THEN
    CREATE POLICY "Public read messages" ON sur_league_messages FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sur_league_messages' AND policyname = 'Auth insert messages') THEN
    CREATE POLICY "Auth insert messages" ON sur_league_messages FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- 8. RPC Anti-Cheat y Ultra-Escalable para Clasificación
-- Oculta en el servidor el team_id y team_name de los rivales mientras el plazo esté abierto
CREATE OR REPLACE FUNCTION get_round_selections_safe(
  p_league_id UUID,
  p_round_id UUID DEFAULT NULL,
  p_viewer_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  entry_id UUID,
  jornada INT,
  slot TEXT,
  team_id UUID,
  team_name TEXT,
  team_country TEXT,
  outcome TEXT,
  is_auto_assigned BOOLEAN,
  created_at TIMESTAMPTZ,
  is_hidden BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_comp_id UUID;
  v_current_jornada INT;
  v_picks_open BOOLEAN;
  v_deadline TIMESTAMPTZ;
  v_effectively_open BOOLEAN;
BEGIN
  SELECT l.competition_id INTO v_comp_id
  FROM sur_leagues l
  WHERE l.id = p_league_id;

  SELECT cc.current_jornada, cc.picks_open, cc.picks_deadline
  INTO v_current_jornada, v_picks_open, v_deadline
  FROM sur_competition_config cc
  WHERE cc.competition_id = v_comp_id;

  v_effectively_open := COALESCE(v_picks_open, false)
    AND (v_deadline IS NULL OR now() < v_deadline);

  RETURN QUERY
  SELECT
    s.entry_id,
    s.jornada,
    COALESCE(s.slot, 'home') AS slot,
    CASE
      WHEN e.player_id <> COALESCE(p_viewer_id, '00000000-0000-0000-0000-000000000000'::uuid)
           AND (s.jornada > COALESCE(v_current_jornada, 1)
                OR (s.jornada = COALESCE(v_current_jornada, 1) AND v_effectively_open))
      THEN NULL
      ELSE s.team_id
    END AS team_id,
    CASE
      WHEN e.player_id <> COALESCE(p_viewer_id, '00000000-0000-0000-0000-000000000000'::uuid)
           AND (s.jornada > COALESCE(v_current_jornada, 1)
                OR (s.jornada = COALESCE(v_current_jornada, 1) AND v_effectively_open))
      THEN 'Oculto'
      ELSE t.name
    END AS team_name,
    CASE
      WHEN e.player_id <> COALESCE(p_viewer_id, '00000000-0000-0000-0000-000000000000'::uuid)
           AND (s.jornada > COALESCE(v_current_jornada, 1)
                OR (s.jornada = COALESCE(v_current_jornada, 1) AND v_effectively_open))
      THEN NULL
      ELSE c.country
    END AS team_country,
    COALESCE(s.outcome, 'pending') AS outcome,
    COALESCE(s.is_auto_assigned, false) AS is_auto_assigned,
    s.created_at,
    (
      e.player_id <> COALESCE(p_viewer_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (s.jornada > COALESCE(v_current_jornada, 1)
           OR (s.jornada = COALESCE(v_current_jornada, 1) AND v_effectively_open))
    ) AS is_hidden
  FROM sur_selections s
  JOIN sur_entries e ON e.id = s.entry_id
  LEFT JOIN sur_teams t ON t.id = s.team_id
  LEFT JOIN sur_competitions c ON c.id = t.competition_id
  WHERE e.league_id = p_league_id
    AND (p_round_id IS NULL OR e.round_id = p_round_id);
END;
$$;

-- 9. RPC Matchmaking Automático: Unirse a Sala Abierta Oficial (Salas auto-escalables de 30)
CREATE OR REPLACE FUNCTION join_quick_open_room(p_user_id UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_euro_comp_id UUID;
  v_next_jornada INT;
  v_target_league_id UUID;
  v_target_round_id UUID;
  v_next_room_num INT;
  v_invite_code TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  INSERT INTO sur_profiles (id, username)
  SELECT p_user_id, COALESCE(split_part(email, '@', 1), 'Superviviente')
  FROM auth.users
  WHERE id = p_user_id
  ON CONFLICT (id) DO NOTHING;

  SELECT id INTO v_euro_comp_id FROM sur_competitions WHERE short_name = 'euro_survivor' LIMIT 1;
  SELECT CASE WHEN picks_open THEN current_jornada ELSE current_jornada + 1 END
  INTO v_next_jornada
  FROM sur_competition_config
  WHERE competition_id = v_euro_comp_id;

  v_next_jornada := COALESCE(v_next_jornada, 1);

  -- 1. Si el usuario ya está en una sala oficial abierta que aún no ha empezado o está activa con vida, devolverla
  SELECT l.id INTO v_target_league_id
  FROM sur_leagues l
  JOIN sur_league_members m ON m.league_id = l.id
  WHERE l.league_type = 'official_room'
    AND m.user_id = p_user_id
    AND l.start_jornada >= v_next_jornada
  LIMIT 1;

  -- 2. Buscar sala oficial pública con hueco (< max_players) para la próxima jornada
  IF v_target_league_id IS NULL THEN
    SELECT l.id INTO v_target_league_id
    FROM sur_leagues l
    LEFT JOIN sur_league_members m ON m.league_id = l.id
    WHERE l.league_type = 'official_room'
      AND l.is_public = true
      AND COALESCE(l.start_jornada, v_next_jornada) >= v_next_jornada
    GROUP BY l.id, l.max_players, l.room_number
    HAVING COUNT(m.user_id) < COALESCE(l.max_players, 30)
    ORDER BY l.room_number ASC NULLS LAST
    LIMIT 1;
  END IF;

  -- 3. Si todas están llenas (30/30), abrir automáticamente la siguiente Sala Oficial
  IF v_target_league_id IS NULL THEN
    SELECT COALESCE(MAX(room_number), 0) + 1 INTO v_next_room_num
    FROM sur_leagues
    WHERE league_type = 'official_room';

    v_invite_code := 'EURO' || LPAD(v_next_room_num::TEXT, 2, '0');

    INSERT INTO sur_leagues (
      name,
      invite_code,
      competition_id,
      creator_id,
      max_players,
      is_public,
      league_type,
      room_number,
      start_jornada,
      avatar_emoji
    ) VALUES (
      'Sala Euro-Survivor #' || v_next_room_num,
      v_invite_code,
      v_euro_comp_id,
      p_user_id,
      30,
      true,
      'official_room',
      v_next_room_num,
      v_next_jornada,
      '🌍'
    )
    RETURNING id INTO v_target_league_id;

    INSERT INTO sur_rounds (
      league_id,
      round_number,
      name,
      status,
      game_mode,
      max_lives_per_player,
      max_yellow_cards,
      start_jornada,
      auto_restart
    ) VALUES (
      v_target_league_id,
      1,
      'Ronda 1',
      'open',
      'euro_double',
      1,
      2,
      v_next_jornada,
      true
    );
  END IF;

  SELECT id INTO v_target_round_id
  FROM sur_rounds
  WHERE league_id = v_target_league_id
  ORDER BY round_number DESC
  LIMIT 1;

  INSERT INTO sur_league_members (league_id, user_id, role)
  VALUES (v_target_league_id, p_user_id, 'player')
  ON CONFLICT (league_id, user_id) DO NOTHING;

  IF NOT EXISTS (
    SELECT 1 FROM sur_entries
    WHERE league_id = v_target_league_id
      AND (round_id = v_target_round_id OR v_target_round_id IS NULL)
      AND player_id = p_user_id
  ) THEN
    INSERT INTO sur_entries (
      player_id,
      league_id,
      round_id,
      entry_name,
      is_alive,
      yellow_cards,
      total_points,
      total_gf
    ) VALUES (
      p_user_id,
      v_target_league_id,
      v_target_round_id,
      'Vida 1',
      true,
      0,
      0,
      0
    );
  END IF;

  RETURN v_target_league_id;
END;
$$;
