export interface CompetitionMeta {
  id: string;
  name: string;
  shortName: 'laliga' | 'ligamx';
  displayName: string;
  country: string;
  countryFlag: string;
  season: string;
  totalJornadas: number;
  teamsCount: number;
  badgeColor: string;
}

export const COMPETITIONS: Record<string, CompetitionMeta> = {
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
  },
  ligamx: {
    id: 'ligamx-apertura-2026',
    name: 'Liga MX Apertura 2026',
    shortName: 'ligamx',
    displayName: '🇲🇽 Liga BBVA MX',
    country: 'MX',
    countryFlag: '🇲🇽',
    season: 'Apertura 2026',
    totalJornadas: 17,
    teamsCount: 18,
    badgeColor: '#006847',
  },
};

export const DEFAULT_COMPETITION = 'laliga';
