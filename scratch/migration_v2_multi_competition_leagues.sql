-- =========================================================================
-- FUTVIVOR — MIGRATION V2: MULTI-COMPETITION (LALIGA + LIGA MX) & MULTI-LEAGUE
-- Copia y ejecuta este script en el SQL Editor de Supabase
-- =========================================================================

-- 1. Crear Tabla de Competiciones
CREATE TABLE IF NOT EXISTS sur_competitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT UNIQUE NOT NULL,
  country TEXT NOT NULL,
  season TEXT NOT NULL,
  total_jornadas INT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar Competiciones Base (LaLiga + Liga MX)
INSERT INTO sur_competitions (name, short_name, country, season, total_jornadas, is_active)
VALUES 
  ('LaLiga 26/27', 'laliga', 'ES', '2026-27', 38, true),
  ('Liga MX Apertura 2026', 'ligamx', 'MX', 'Apertura 2026', 17, true)
ON CONFLICT (short_name) DO UPDATE
  SET name = EXCLUDED.name,
      season = EXCLUDED.season,
      total_jornadas = EXCLUDED.total_jornadas,
      is_active = EXCLUDED.is_active;

-- 2. Crear Tabla de Configuración por Competición
CREATE TABLE IF NOT EXISTS sur_competition_config (
  competition_id UUID PRIMARY KEY REFERENCES sur_competitions(id) ON DELETE CASCADE,
  current_jornada INT NOT NULL DEFAULT 1,
  picks_open BOOLEAN NOT NULL DEFAULT true,
  picks_deadline TIMESTAMPTZ
);

-- Config inicial para LaLiga
INSERT INTO sur_competition_config (competition_id, current_jornada, picks_open, picks_deadline)
SELECT id, 1, true, '2026-08-15T17:30:00Z'
FROM sur_competitions WHERE short_name = 'laliga'
ON CONFLICT (competition_id) DO NOTHING;

-- Config inicial para Liga MX (Apertura 2026)
INSERT INTO sur_competition_config (competition_id, current_jornada, picks_open, picks_deadline)
SELECT id, 1, true, now() + interval '5 days'
FROM sur_competitions WHERE short_name = 'ligamx'
ON CONFLICT (competition_id) DO NOTHING;

-- 3. Vincular Equipos a Competición
ALTER TABLE sur_teams ADD COLUMN IF NOT EXISTS competition_id UUID REFERENCES sur_competitions(id);

-- Asignar equipos existentes a LaLiga
UPDATE sur_teams 
SET competition_id = (SELECT id FROM sur_competitions WHERE short_name = 'laliga' LIMIT 1)
WHERE competition_id IS NULL;

-- Insertar Equipos de Liga MX (18 equipos oficiales de la temporada 2026-2027)
WITH ligamx AS (SELECT id FROM sur_competitions WHERE short_name = 'ligamx' LIMIT 1)
INSERT INTO sur_teams (name, competition_id)
SELECT team_name, ligamx.id
FROM ligamx, (VALUES
  ('América'),
  ('Guadalajara (Chivas)'),
  ('Cruz Azul'),
  ('Pumas UNAM'),
  ('Tigres UANL'),
  ('Monterrey (Rayados)'),
  ('Toluca'),
  ('Pachuca'),
  ('León'),
  ('Santos Laguna'),
  ('Atlas'),
  ('Atlético de San Luis'),
  ('Necaxa'),
  ('Puebla'),
  ('Tijuana (Xolos)'),
  ('Juárez (Bravos)'),
  ('Querétaro (Gallos Blancos)'),
  ('Atlante')
) AS t(team_name)
WHERE NOT EXISTS (
  SELECT 1 FROM sur_teams WHERE name = t.team_name AND competition_id = ligamx.id
);

-- 4. Vincular Partidos a Competición
ALTER TABLE sur_matches ADD COLUMN IF NOT EXISTS competition_id UUID REFERENCES sur_competitions(id);
UPDATE sur_matches 
SET competition_id = (SELECT id FROM sur_competitions WHERE short_name = 'laliga' LIMIT 1)
WHERE competition_id IS NULL;

-- 5. Crear Tabla de Ligas de Amigos (sur_leagues)
CREATE TABLE IF NOT EXISTS sur_leagues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  competition_id UUID REFERENCES sur_competitions(id) NOT NULL,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  max_players INT DEFAULT 50,
  is_public BOOLEAN DEFAULT false,
  avatar_emoji TEXT DEFAULT '⚽',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Crear Tabla de Miembros de Liga (sur_league_members)
CREATE TABLE IF NOT EXISTS sur_league_members (
  league_id UUID REFERENCES sur_leagues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'player' CHECK (role IN ('admin', 'player')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (league_id, user_id)
);

-- 7. Vincular Entradas a Liga (sur_entries)
ALTER TABLE sur_entries ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES sur_leagues(id) ON DELETE CASCADE;

-- 8. Actualizar Perfiles con Campos Sociales y Pro (sur_profiles)
ALTER TABLE sur_profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE sur_profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id);
ALTER TABLE sur_profiles ADD COLUMN IF NOT EXISTS badges TEXT[] DEFAULT '{}';
ALTER TABLE sur_profiles ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT false;
ALTER TABLE sur_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 9. Crear Liga Pública por Defecto para usuarios existentes (LaLiga General)
DO $$
DECLARE
  v_laliga_id UUID;
  v_default_league_id UUID;
  v_first_user_id UUID;
BEGIN
  SELECT id INTO v_laliga_id FROM sur_competitions WHERE short_name = 'laliga' LIMIT 1;
  SELECT id INTO v_first_user_id FROM auth.users LIMIT 1;

  IF v_laliga_id IS NOT NULL AND v_first_user_id IS NOT NULL THEN
    -- Check if default league exists
    SELECT id INTO v_default_league_id FROM sur_leagues WHERE invite_code = 'LALIGA26' LIMIT 1;

    IF v_default_league_id IS NULL THEN
      INSERT INTO sur_leagues (name, invite_code, competition_id, creator_id, is_public, avatar_emoji)
      VALUES ('Liga General LaLiga 26/27', 'LALIGA26', v_laliga_id, v_first_user_id, true, '🏆')
      RETURNING id INTO v_default_league_id;
    END IF;

    -- Asignar entries huérfanas a la liga por defecto
    UPDATE sur_entries SET league_id = v_default_league_id WHERE league_id IS NULL;

    -- Asegurar que todos los usuarios existentes con entries son miembros de la liga
    INSERT INTO sur_league_members (league_id, user_id, role)
    SELECT DISTINCT v_default_league_id, player_id, 'player'
    FROM sur_entries
    ON CONFLICT (league_id, user_id) DO NOTHING;
  END IF;
END $$;
