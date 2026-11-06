import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { GameMode, League, Round } from '../types/database';
import { useAppStore } from '../lib/store';
import { isEuroSurvivorLeague, MAX_YELLOW_CARDS_DEFAULT, SUDDEN_DEATH_ALIVE_THRESHOLD } from '../constants/competitions';

function buildVirtualRound(league: League): Round {
  return {
    id: `virtual-${league.id}`,
    league_id: league.id,
    round_number: 1,
    name: 'Ronda 1',
    status: 'active',
    game_mode: isEuroSurvivorLeague(league) ? 'euro_double' : 'single_league',
    max_lives_per_player: 2,
    max_yellow_cards: MAX_YELLOW_CARDS_DEFAULT,
    sudden_death_threshold: SUDDEN_DEATH_ALIVE_THRESHOLD,
    start_jornada: league.start_jornada || 1,
    auto_restart: true,
  };
}

export function isVirtualRoundId(roundId?: string | null): boolean {
  return !roundId || roundId.startsWith('virtual-');
}

export function useRounds(targetLeague?: League | null) {
  const { activeLeague, activeRound, setActiveRound, refreshKey, triggerRefresh } = useAppStore();
  const league = targetLeague === undefined ? activeLeague : targetLeague;

  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(false);
  const [schemaReady, setSchemaReady] = useState(true);

  const fetchRounds = useCallback(async () => {
    if (!league?.id) {
      setRounds([]);
      setActiveRound(null);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sur_rounds')
        .select('*')
        .eq('league_id', league.id)
        .order('round_number', { ascending: false });

      if (error) {
        // Fallback elegante si aún no se ha corrido migration_v5 en el SQL Editor
        setSchemaReady(false);
        const fallback = buildVirtualRound(league);
        setRounds([fallback]);
        setActiveRound(fallback);
        return;
      }

      setSchemaReady(true);
      if (data && data.length > 0) {
        const loaded = data as Round[];
        setRounds(loaded);
        const current = useAppStore.getState().activeRound;
        const stillValid = current && loaded.find((r) => r.id === current.id);
        if (!stillValid) {
          const activeOrLatest =
            loaded.find((r) => r.status === 'active' || r.status === 'open') || loaded[0];
          setActiveRound(activeOrLatest);
        }
      } else {
        const fallback = buildVirtualRound(league);
        setRounds([fallback]);
        setActiveRound(fallback);
      }
    } catch {
      const fallback = buildVirtualRound(league);
      setRounds([fallback]);
      setActiveRound(fallback);
    } finally {
      setLoading(false);
    }
  }, [league?.id, refreshKey, setActiveRound]);

  useEffect(() => {
    fetchRounds();
  }, [fetchRounds]);

  /**
   * Acción de Admin: Lanzar Nueva Ronda en el mismo grupo de amigos / comunidad.
   * Todos los miembros reviven automáticamente con equipos limpios y 0 amarillas.
   */
  async function launchNewRound({
    gameMode = 'euro_double',
    maxLivesPerPlayer = 1,
    maxYellowCards = MAX_YELLOW_CARDS_DEFAULT,
    startJornada = 1,
    autoRestart = true,
  }: {
    gameMode?: GameMode;
    maxLivesPerPlayer?: number;
    maxYellowCards?: number;
    startJornada?: number;
    autoRestart?: boolean;
  }): Promise<{ success: boolean; round?: Round; error?: string }> {
    if (!league?.id) {
      return { success: false, error: 'Selecciona una liga activa primero.' };
    }

    try {
      // Si cambia a Euro-Survivor, actualizar competition_id de la liga al paraguas euro_survivor
      if (gameMode === 'euro_double') {
        const { data: euroComp } = await supabase
          .from('sur_competitions')
          .select('id')
          .eq('short_name', 'euro_survivor')
          .maybeSingle();

        if (euroComp?.id && league.competition_id !== euroComp.id) {
          await supabase
            .from('sur_leagues')
            .update({ competition_id: euroComp.id })
            .eq('id', league.id);
        }
      }

      const maxRoundNum = rounds
        .filter((r) => !isVirtualRoundId(r.id))
        .reduce((acc, r) => Math.max(acc, r.round_number), 0);
      const nextNum = maxRoundNum + 1;

      // Marcar rondas previas como finalizadas
      await supabase
        .from('sur_rounds')
        .update({ status: 'finished' })
        .eq('league_id', league.id)
        .neq('status', 'finished');

      const { data: newRound, error: roundErr } = await supabase
        .from('sur_rounds')
        .insert({
          league_id: league.id,
          round_number: nextNum,
          name: `Ronda ${nextNum}`,
          status: 'active',
          game_mode: gameMode,
          max_lives_per_player: maxLivesPerPlayer,
          max_yellow_cards: maxYellowCards,
          sudden_death_threshold: SUDDEN_DEATH_ALIVE_THRESHOLD,
          start_jornada: startJornada,
          auto_restart: autoRestart,
        })
        .select('*')
        .single();

      if (roundErr) {
        throw new Error(
          roundErr.message.includes('sur_rounds')
            ? 'Ejecuta primero la migración SQL V5 en Supabase para habilitar múltiples rondas.'
            : roundErr.message
        );
      }

      // Revivir automáticamente a todos los miembros del grupo en la nueva ronda
      const { data: members } = await supabase
        .from('sur_league_members')
        .select('user_id')
        .eq('league_id', league.id);

      const uniqueUserIds = Array.from(
        new Set([league.creator_id, ...(members || []).map((m) => m.user_id)].filter(Boolean))
      );

      if (uniqueUserIds.length > 0) {
        const revivedEntries = uniqueUserIds.flatMap((uid) =>
          Array.from({ length: maxLivesPerPlayer }).map((_, i) => ({
            player_id: uid,
            league_id: league.id,
            round_id: newRound.id,
            entry_name: `Vida ${i + 1}`,
            is_alive: true,
            yellow_cards: 0,
            total_points: 0,
            total_gf: 0,
          }))
        );

        await supabase.from('sur_entries').insert(revivedEntries);
      }

      setActiveRound(newRound as Round);
      triggerRefresh();
      return { success: true, round: newRound as Round };
    } catch (err: any) {
      console.error('Error launching new round:', err);
      return { success: false, error: err.message || 'No se pudo crear la nueva ronda' };
    }
  }

  return {
    rounds,
    activeRound,
    setActiveRound,
    loading,
    schemaReady,
    refetchRounds: fetchRounds,
    launchNewRound,
  };
}
