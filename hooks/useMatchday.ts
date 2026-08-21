import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { CompetitionConfig } from '../types/database';
import { useAppStore } from '../lib/store';

export function useMatchday(competitionId?: string) {
  const [config, setConfig] = useState<CompetitionConfig>({
    competition_id: '',
    current_jornada: 1,
    picks_open: true,
    picks_deadline: null,
  });
  const [loading, setLoading] = useState(true);

  const { activeLeague } = useAppStore();
  const targetCompId = competitionId || activeLeague?.competition_id;

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);

      let baseConfig: CompetitionConfig | null = null;

      // 1. Fetch competition config for target competition
      if (targetCompId) {
        const { data: compConfig, error } = await supabase
          .from('sur_competition_config')
          .select('*')
          .eq('competition_id', targetCompId)
          .maybeSingle();

        if (!error && compConfig) {
          baseConfig = compConfig;
        }
      }

      // 2. Fallback to default active competition config in sur_competition_config
      if (!baseConfig) {
        // Query LaLiga by default (or the first competition)
        const { data: defaultComp } = await supabase
          .from('sur_competitions')
          .select('id')
          .eq('short_name', 'laliga')
          .maybeSingle();

        const defaultId = defaultComp?.id;

        if (defaultId) {
          const { data: compConfig } = await supabase
            .from('sur_competition_config')
            .select('*')
            .eq('competition_id', defaultId)
            .maybeSingle();

          if (compConfig) {
            baseConfig = compConfig;
          }
        }

        if (!baseConfig) {
          const { data: firstConfig } = await supabase
            .from('sur_competition_config')
            .select('*')
            .limit(1)
            .maybeSingle();

          if (firstConfig) {
            baseConfig = firstConfig;
          }
        }
      }

      if (baseConfig) {
        // Return exact authoritative current jornada and config without altering global jornada
        setConfig(baseConfig);
      }
    } catch (err) {
      console.error('Error fetching matchday config:', err);
    } finally {
      setLoading(false);
    }
  }, [targetCompId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    config,
    loading,
    refetch: fetchConfig,
  };
}
