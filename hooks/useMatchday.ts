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

      // 1. Fetch competition config
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

      // Fallback to legacy sur_config
      if (!baseConfig) {
        const { data: legacyConfig } = await supabase
          .from('sur_config')
          .select('*')
          .eq('id', 1)
          .maybeSingle();

        if (legacyConfig) {
          baseConfig = {
            competition_id: targetCompId || '',
            current_jornada: legacyConfig.current_jornada || 1,
            picks_open: legacyConfig.picks_open ?? true,
            picks_deadline: legacyConfig.picks_deadline || null,
          };
        }
      }

      if (baseConfig) {
        const leagueStart = activeLeague?.start_jornada;

        // If league starts in a future jornada, use that starting jornada with open picks
        if (leagueStart && leagueStart > baseConfig.current_jornada) {
          setConfig({
            ...baseConfig,
            current_jornada: leagueStart,
            picks_open: true,
          });
        } else if (!baseConfig.picks_open && !activeLeague?.is_public && (!leagueStart || leagueStart <= baseConfig.current_jornada)) {
          // If current jornada picks are locked, private league defaults to next upcoming complete jornada
          setConfig({
            ...baseConfig,
            current_jornada: baseConfig.current_jornada + 1,
            picks_open: true,
          });
        } else {
          setConfig(baseConfig);
        }
      }
    } catch (err) {
      console.error('Error fetching matchday config:', err);
    } finally {
      setLoading(false);
    }
  }, [targetCompId, activeLeague?.id, activeLeague?.start_jornada, activeLeague?.is_public]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    config,
    loading,
    refetch: fetchConfig,
  };
}
