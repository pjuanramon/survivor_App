export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type GameMode = 'euro_double' | 'single_league';
export type PickSlot = 'home' | 'euro';
export type LeagueType = 'private' | 'community' | 'official_room';
export type SelectionOutcome = 'pending' | 'win' | 'draw_yellow' | 'loss_red';

export interface Profile {
  id: string;
  username: string;
  avatar_url?: string | null;
  referral_code?: string | null;
  referred_by?: string | null;
  badges?: string[];
  is_pro?: boolean;
  created_at?: string;
}

export interface Competition {
  id: string;
  name: string;
  short_name: 'euro_survivor' | 'laliga' | 'premier' | 'seriea' | 'bundesliga' | string;
  country: string;
  season: string;
  total_jornadas: number;
  is_active: boolean;
  created_at?: string;
}

export interface CompetitionConfig {
  competition_id: string;
  current_jornada: number;
  picks_open: boolean;
  picks_deadline: string | null;
}

export interface Team {
  id: string;
  name: string;
  short_name?: string | null;
  logo_url?: string | null;
  competition_id?: string | null;
  competition?: Competition;
}

export interface Match {
  id: string;
  jornada: number;
  window_number?: number | null;
  home_team_id: string;
  away_team_id: string;
  match_date?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  status?: string | null;
  is_postponed?: boolean;
  is_finished?: boolean;
  competition_id?: string | null;
  home_team?: Team;
  away_team?: Team;
  competition?: Competition;
}

export interface League {
  id: string;
  name: string;
  invite_code: string;
  competition_id: string;
  creator_id: string;
  max_players: number;
  is_public: boolean;
  league_type?: LeagueType;
  room_number?: number | null;
  current_round_number?: number;
  description?: string | null;
  avatar_emoji: string;
  created_at: string;
  start_jornada?: number;
  competition?: Competition;
  creator_profile?: Profile;
  members_count?: number;
  alive_count?: number;
}

export interface Round {
  id: string;
  league_id: string;
  round_number: number;
  name: string;
  status: 'open' | 'active' | 'finished';
  game_mode: GameMode;
  max_lives_per_player: number;
  max_yellow_cards: number;
  sudden_death_threshold: number;
  start_jornada: number;
  end_jornada?: number | null;
  winner_entry_id?: string | null;
  auto_restart: boolean;
  created_at?: string;
}

export interface LeagueMember {
  league_id: string;
  user_id: string;
  role: 'admin' | 'player';
  joined_at: string;
  profile?: Profile;
}

export interface Entry {
  id: string;
  player_id: string;
  league_id?: string | null;
  round_id?: string | null;
  entry_name: string;
  is_alive: boolean;
  yellow_cards?: number;
  elimination_reason?: 'loss_red' | 'double_yellow' | 'missed_deadline' | string | null;
  eliminated_jornada?: number | null;
  total_points: number;
  total_gf: number;
  created_at?: string;
}

export interface Selection {
  id?: string;
  entry_id: string;
  round_id?: string | null;
  team_id: string;
  jornada: number;
  slot?: PickSlot;
  outcome?: SelectionOutcome;
  points_awarded?: number;
  gf_awarded?: number;
  is_auto_assigned?: boolean;
  created_at?: string;
  team?: Team;
}

export interface SeasonStandingRow {
  player_id: string;
  username: string;
  rounds_played: number;
  round_titles: number;
  total_points: number;
  total_gf: number;
  alive_entries: number;
}
