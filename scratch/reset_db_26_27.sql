-- ==========================================================
-- SURVIVOR APP — RESET TEMPORADA LA LIGA 26/27
-- Copia y ejecuta este script en el Editor SQL de Supabase
-- ==========================================================

-- 1. Limpieza de datos de la temporada anterior
DELETE FROM sur_selections;
DELETE FROM sur_entries;
DELETE FROM sur_matches;

-- 2. Actualización de Equipos La Liga 26/27
-- Borrar descendidos
DELETE FROM sur_teams WHERE name IN ('Real Oviedo', 'Girona FC', 'RCD Mallorca', 'Oviedo', 'Girona', 'Mallorca');

-- Insertar ascendidos (si no existen ya)
INSERT INTO sur_teams (name)
SELECT 'Racing de Santander' WHERE NOT EXISTS (SELECT 1 FROM sur_teams WHERE name = 'Racing de Santander');

INSERT INTO sur_teams (name)
SELECT 'RC Deportivo de La Coruña' WHERE NOT EXISTS (SELECT 1 FROM sur_teams WHERE name = 'RC Deportivo de La Coruña');

INSERT INTO sur_teams (name)
SELECT 'Málaga CF' WHERE NOT EXISTS (SELECT 1 FROM sur_teams WHERE name = 'Málaga CF');

-- 3. Crear / Actualizar Tabla de Configuración de Liga (sur_config)
CREATE TABLE IF NOT EXISTS sur_config (
  id INT PRIMARY KEY DEFAULT 1,
  current_jornada INT NOT NULL DEFAULT 1,
  picks_open BOOLEAN NOT NULL DEFAULT true,
  picks_deadline TIMESTAMPTZ
);

INSERT INTO sur_config (id, current_jornada, picks_open, picks_deadline)
VALUES (1, 1, true, '2026-08-15T17:30:00Z')
ON CONFLICT (id) DO UPDATE
  SET current_jornada = 1,
      picks_open = true,
      picks_deadline = '2026-08-15T17:30:00Z';

-- 4. Insertar Partidos de la Jornada 1
-- (Asegúrate de que los IDs de los equipos coinciden o inserta por subconsulta)
INSERT INTO sur_matches (jornada, home_team_id, away_team_id, match_date)
VALUES
  (1, (SELECT id FROM sur_teams WHERE name LIKE '%Alavés%' LIMIT 1), (SELECT id FROM sur_teams WHERE name LIKE '%Getafe%' LIMIT 1), '2026-08-15T17:30:00Z'),
  (1, (SELECT id FROM sur_teams WHERE name LIKE '%Sevilla%' LIMIT 1), (SELECT id FROM sur_teams WHERE name LIKE '%Rayo%' LIMIT 1), '2026-08-15T19:30:00Z'),
  (1, (SELECT id FROM sur_teams WHERE name LIKE '%Racing%' LIMIT 1), (SELECT id FROM sur_teams WHERE name LIKE '%Villarreal%' LIMIT 1), '2026-08-16T15:00:00Z'),
  (1, (SELECT id FROM sur_teams WHERE name LIKE '%Espanyol%' LIMIT 1), (SELECT id FROM sur_teams WHERE name LIKE '%Levante%' LIMIT 1), '2026-08-16T17:00:00Z'),
  (1, (SELECT id FROM sur_teams WHERE name LIKE '%Celta%' LIMIT 1), (SELECT id FROM sur_teams WHERE name LIKE '%Osasuna%' LIMIT 1), '2026-08-16T19:30:00Z'),
  (1, (SELECT id FROM sur_teams WHERE name LIKE '%Deportivo%' LIMIT 1), (SELECT id FROM sur_teams WHERE name LIKE '%Elche%' LIMIT 1), '2026-08-17T19:00:00Z'),
  (1, (SELECT id FROM sur_teams WHERE name LIKE '%Atlético%' LIMIT 1), (SELECT id FROM sur_teams WHERE name LIKE '%Málaga%' LIMIT 1), '2026-08-19T18:00:00Z'),
  (1, (SELECT id FROM sur_teams WHERE name LIKE '%Valencia%' LIMIT 1), (SELECT id FROM sur_teams WHERE name LIKE '%Betis%' LIMIT 1), '2026-08-25T18:00:00Z'),
  (1, (SELECT id FROM sur_teams WHERE name LIKE '%Real Madrid%' LIMIT 1), (SELECT id FROM sur_teams WHERE name LIKE '%Sociedad%' LIMIT 1), '2026-08-26T18:00:00Z'),
  (1, (SELECT id FROM sur_teams WHERE name LIKE '%Barcelona%' LIMIT 1), (SELECT id FROM sur_teams WHERE name LIKE '%Athletic%' LIMIT 1), '2026-08-27T18:00:00Z');
