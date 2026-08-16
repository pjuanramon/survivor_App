-- =========================================================================
-- FUTVIVOR — MIGRATION V3: REALTIME LEAGUE CHAT
-- =========================================================================

CREATE TABLE IF NOT EXISTS sur_league_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id UUID REFERENCES sur_leagues(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar Supabase Realtime para la tabla de mensajes
ALTER PUBLICATION supabase_realtime ADD TABLE sur_league_messages;
