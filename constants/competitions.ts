export type CompetitionPool = 'umbrella' | 'home' | 'euro';

export interface CompetitionMeta {
  id: string;
  name: string;
  shortName: 'euro_survivor' | 'laliga' | 'premier' | 'seriea' | 'bundesliga' | string;
  displayName: string;
  country: string;
  countryFlag: string;
  season: string;
  totalJornadas: number;
  teamsCount: number;
  badgeColor: string;
  pool: CompetitionPool;
}

/**
 * Límites óptimos de escalabilidad y monetización por tipo de sala
 */
export const LEAGUE_CAPACITY_LIMITS = {
  MIN_OFFICIAL_PLAYERS: 4,
  FREE_PRIVATE_MAX: 25,       // Grupos de amigos gratis (4-5 semanas por ronda)
  OPEN_MATCHMAKING_ROOM: 30,  // Salas públicas auto-generadas
  PRO_COMMUNITY_MAX: 250,     // Bares, empresas, peñas y streamers (Admin PRO)
} as const;

export const MAX_YELLOW_CARDS_DEFAULT = 2; // 2 amarillas (empates) = ROJA (Eliminado)
export const SUDDEN_DEATH_ALIVE_THRESHOLD = 3; // <=3 supervivientes: empate mata directo

// Las 3 ligas que componen el bombo "Europa" acompañando a LaLiga (Las 4 Grandes Ligas)
export const EURO_POOL_SHORT_NAMES = ['premier', 'seriea', 'bundesliga'] as const;

export const COUNTRY_FLAGS: Record<string, string> = {
  EU: '🌍',
  ES: '🇪🇸',
  EN: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  IT: '🇮🇹',
  DE: '🇩🇪',
};

export const COMPETITIONS: Record<string, CompetitionMeta> = {
  euro_survivor: {
    id: 'euro-survivor-26-27',
    name: 'Euro-Survivor (4 Grandes Ligas)',
    shortName: 'euro_survivor',
    displayName: '🌍 Euro-Survivor (4 Grandes Ligas)',
    country: 'EU',
    countryFlag: '🌍',
    season: '2026-27',
    totalJornadas: 38,
    teamsCount: 78,
    badgeColor: '#D8FF00',
    pool: 'umbrella',
  },
  laliga: {
    id: 'laliga-26-27',
    name: 'LaLiga 26/27',
    shortName: 'laliga',
    displayName: '🇪🇸 LaLiga EA Sports',
    country: 'ES',
    countryFlag: '🇪🇸',
    season: '2026-27',
    totalJornadas: 38,
    teamsCount: 20,
    badgeColor: '#AA151B',
    pool: 'home',
  },
  premier: {
    id: 'premier-26-27',
    name: 'Premier League 26/27',
    shortName: 'premier',
    displayName: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League',
    country: 'EN',
    countryFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    season: '2026-27',
    totalJornadas: 38,
    teamsCount: 20,
    badgeColor: '#3D195B',
    pool: 'euro',
  },
  seriea: {
    id: 'seriea-26-27',
    name: 'Serie A 26/27',
    shortName: 'seriea',
    displayName: '🇮🇹 Serie A',
    country: 'IT',
    countryFlag: '🇮🇹',
    season: '2026-27',
    totalJornadas: 38,
    teamsCount: 20,
    badgeColor: '#024494',
    pool: 'euro',
  },
  bundesliga: {
    id: 'bundesliga-26-27',
    name: 'Bundesliga 26/27',
    shortName: 'bundesliga',
    displayName: '🇩🇪 Bundesliga',
    country: 'DE',
    countryFlag: '🇩🇪',
    season: '2026-27',
    totalJornadas: 34,
    teamsCount: 18,
    badgeColor: '#D20515',
    pool: 'euro',
  },
};

export const DEFAULT_COMPETITION = 'euro_survivor';

export function isEuroSurvivorLeague(
  league?: { competition?: { short_name?: string } | null } | null,
  roundMode?: string
): boolean {
  if (roundMode === 'euro_double') return true;
  if (roundMode === 'single_league') return false;
  return !league?.competition?.short_name || league.competition.short_name === 'euro_survivor';
}
