import { create } from 'zustand';
import { League, Profile, Competition } from '../types/database';
import { DEFAULT_COMPETITION } from '../constants/competitions';

interface AppState {
  // Active competition
  activeCompetitionShortName: string;
  setActiveCompetitionShortName: (shortName: string) => void;

  // Global list of user leagues
  leagues: League[];
  setLeagues: (leagues: League[]) => void;

  // Active league
  activeLeague: League | null;
  setActiveLeague: (league: League | null) => void;

  // Current user profile
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;

  // Selected pick entry index
  selectedPickIndex: number;
  setSelectedPickIndex: (index: number) => void;

  // Global refresh key
  refreshKey: number;
  triggerRefresh: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeCompetitionShortName: DEFAULT_COMPETITION,
  setActiveCompetitionShortName: (shortName) =>
    set({ activeCompetitionShortName: shortName }),

  leagues: [],
  setLeagues: (leagues) => set({ leagues }),

  activeLeague: null,
  setActiveLeague: (league) => set({ activeLeague: league }),

  profile: null,
  setProfile: (profile) => set({ profile }),

  selectedPickIndex: 0,
  setSelectedPickIndex: (index) => set({ selectedPickIndex: index }),

  refreshKey: 0,
  triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
}));
