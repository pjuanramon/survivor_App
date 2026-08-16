export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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
  short_name: 'laliga' | 'ligamx' | string;
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
}

export interface Match {
  id: string;
  jornada: number;
  home_team_id: string;
  away_team_id: string;
  match_date: string;
  home_score?: number | null;
  away_score?: number | null;
  is_postponed?: boolean;
  is_finished?: boolean;
  competition_id?: string | null;
  home_team?: Team;
  away_team?: Team;
}

export interface League {
  id: string;
  name: string;
  invite_code: string;
  competition_id: string;
  creator_id: string;
  max_players: number;
  is_public: boolean;
  avatar_emoji: string;
  created_at: string;
  competition?: Competition;
  creator_profile?: Profile;
  members_count?: number;
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
  entry_name: string;
  is_alive: boolean;
  total_points: number;
  total_gf: number;
  created_at?: string;
}

export interface Selection {
  id?: string;
  entry_id: string;
  team_id: string;
  jornada: number;
  created_at?: string;
  team?: Team;
}

export interface LeaderboardRow {
  entry_id: string;
  entry_name: string;
  player_id: string;
  username: string;
  is_alive: boolean;
  total_points: number;
  total_gf: number;
  rank: number;
  selections: {
    jornada: number;
    team_name: string;
    is_hidden: boolean;
    is_user_pick: boolean;
  }[];
}
