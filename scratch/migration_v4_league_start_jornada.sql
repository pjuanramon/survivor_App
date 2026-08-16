-- =========================================================================
-- FUTVIVOR — MIGRATION V4: LEAGUE START JORNADA & LIGA MX NEXT MATCHDAY
-- =========================================================================

-- 1. Añadir columna start_jornada a sur_leagues
ALTER TABLE sur_leagues ADD COLUMN IF NOT EXISTS start_jornada INT DEFAULT 1;

-- 2. Actualizar configuración de Liga MX:
-- Actualmente en Apertura 2026 está en curso la J4 (picks cerrados).
-- La próxima jornada disponible para ligas nuevas es la JORNADA 5.
UPDATE sur_competition_config
SET current_jornada = 4,
    picks_open = false,
    picks_deadline = now() - interval '1 day'
WHERE competition_id = (SELECT id FROM sur_competitions WHERE short_name = 'ligamx' LIMIT 1);
