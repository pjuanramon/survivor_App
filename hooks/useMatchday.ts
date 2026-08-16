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
