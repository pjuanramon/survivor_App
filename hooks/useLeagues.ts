import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { League, Competition } from '../types/database';
import { useAppStore } from '../lib/store';

export function useLeagues() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { activeLeague, setActiveLeague, refreshKey, triggerRefresh } = useAppStore();

  const fetchLeagues = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLeagues([]);
        return;
      }

      // 1. Fetch leagues where user is creator
      const { data: creatorLeaguesData } = await supabase
        .from('sur_leagues')
        .select('id')
        .eq('creator_id', user.id);

      // 2. Fetch leagues from membership
      const { data: memberLeaguesData } = await supabase
        .from('sur_league_members')
        .select('league_id')
        .eq('user_id', user.id);

      // 3. Fetch leagues from player entries
      const { data: userEntriesData } = await supabase
        .from('sur_entries')
        .select('league_id')
        .eq('player_id', user.id);

      // 4. Fetch main LaLiga general league fallback
      const { data: mainLeagueData } = await supabase
        .from('sur_leagues')
        .select('id')
        .eq('invite_code', 'LALIGA26')
        .maybeSingle();

      const creatorIds = (creatorLeaguesData || []).map((l) => l.id).filter(Boolean);
      const memberIds = (memberLeaguesData || []).map((m) => m.league_id).filter(Boolean);
      const entryIds = (userEntriesData || []).map((e) => e.league_id).filter(Boolean);
      const defaultIds = mainLeagueData ? [mainLeagueData.id] : [];

      // Combine unique league IDs for this user
      const userLeagueIds = Array.from(
        new Set([...creatorIds, ...memberIds, ...entryIds, ...defaultIds])
      );

      if (userLeagueIds.length > 0) {
        const { data: leaguesData, error: leaguesError } = await supabase
          .from('sur_leagues')
          .select(`
            id,
            name,
            invite_code,
            competition_id,
            creator_id,
            max_players,
            is_public,
            avatar_emoji,
            start_jornada,
            created_at,
            competition:sur_competitions (
              id,
              name,
              short_name,
              country,
              season,
              total_jornadas,
              is_active
            )
          `)
          .in('id', userLeagueIds);

        if (leaguesError) throw leaguesError;

        const loadedLeagues: League[] = (leaguesData || []).filter(Boolean) as any;
        setLeagues(loadedLeagues);

        // Auto-select active league
        const currentActive = useAppStore.getState().activeLeague;
        if (loadedLeagues.length > 0) {
          if (!currentActive || !loadedLeagues.find((l) => l.id === currentActive.id)) {
            const preferred =
              loadedLeagues.find((l) => l.creator_id === user.id) ||
              loadedLeagues.find((l) => l.invite_code === 'LALIGA26') ||
              loadedLeagues[0];
            setActiveLeague(preferred);
          }
        }
      } else {
        setLeagues([]);
        setActiveLeague(null);
      }
    } catch (err: any) {
      console.error('Error fetching leagues:', err);
      setError(err.message || 'Error al cargar ligas');
    } finally {
      setLoading(false);
    }
  }, [refreshKey]);

  useEffect(() => {
    fetchLeagues();
  }, [fetchLeagues]);

  // Generate 6-char alphanumeric invite code
  function generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Create League
  async function createLeague({
    name,
    competitionId,
    avatarEmoji = '⚽',
  }: {
    name: string;
    competitionId: string;
    avatarEmoji?: string;
  }): Promise<{ success: boolean; league?: League; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const inviteCode = generateInviteCode();

      // Determine starting jornada: if picks are closed for current jornada, start at next upcoming
      let startJornada = 1;
      const { data: compConfig } = await supabase
        .from('sur_competition_config')
        .select('*')
        .eq('competition_id', competitionId)
        .maybeSingle();

      if (compConfig) {
        startJornada = compConfig.picks_open
          ? compConfig.current_jornada
          : compConfig.current_jornada + 1;
      }

      const { data: newLeague, error: leagueError } = await supabase
        .from('sur_leagues')
        .insert({
          name: name.trim(),
          invite_code: inviteCode,
          competition_id: competitionId,
          creator_id: user.id,
          avatar_emoji: avatarEmoji,
          is_public: false,
          start_jornada: startJornada,
        })
        .select(`
          id,
          name,
          invite_code,
          competition_id,
          creator_id,
          max_players,
          is_public,
          avatar_emoji,
          start_jornada,
          created_at,
          competition:sur_competitions (
            id,
            name,
            short_name,
            country,
            season,
            total_jornadas,
            is_active
          )
        `)
        .single();

      if (leagueError) throw leagueError;

      // Add creator as admin in league_members
      await supabase
        .from('sur_league_members')
        .insert({
          league_id: newLeague.id,
          user_id: user.id,
          role: 'admin',
        });

      triggerRefresh();
      return { success: true, league: newLeague as any };
    } catch (err: any) {
      console.error('Error creating league:', err);
      return { success: false, error: err.message || 'Error al crear la liga' };
    }
  }

  // Join League by Invite Code
  async function joinLeagueByCode(
    inviteCode: string
  ): Promise<{ success: boolean; league?: League; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const cleanCode = inviteCode.trim().toUpperCase();

      // Find league by code
      const { data: league, error: findError } = await supabase
        .from('sur_leagues')
        .select(`
          id,
          name,
          invite_code,
          competition_id,
          creator_id,
          max_players,
          is_public,
          avatar_emoji,
          start_jornada,
          created_at,
          competition:sur_competitions (
            id,
            name,
            short_name,
            country,
            season,
            total_jornadas,
            is_active
          )
        `)
        .eq('invite_code', cleanCode)
        .maybeSingle();

      if (findError) throw findError;
      if (!league) throw new Error('Código de liga no encontrado. Verifica el código e intenta de nuevo.');

      // Check if league has already started and is closed
      const startJornada = (league as any).start_jornada || 1;
      const { data: compConfig } = await supabase
        .from('sur_competition_config')
        .select('*')
        .eq('competition_id', league.competition_id)
        .maybeSingle();

      if (compConfig) {
        const isStarted =
          compConfig.current_jornada > startJornada ||
          (compConfig.current_jornada === startJornada && !compConfig.picks_open);

        if (isStarted) {
          throw new Error(
            `🔒 Esta liga ya comenzó en la Jornada ${startJornada} y está cerrada a nuevos participantes. Pídele al creador que abra una liga para la siguiente jornada o crea tú una nueva.`
          );
        }
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('sur_league_members')
        .select('role')
        .eq('league_id', league.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingMember) {
        // Add user to league
        const { error: joinError } = await supabase
          .from('sur_league_members')
          .insert({
            league_id: league.id,
            user_id: user.id,
            role: 'player',
          });

        if (joinError) throw joinError;

        // Auto-create initial pick for new member if none exists
        const { data: existingEntries } = await supabase
          .from('sur_entries')
          .select('id')
          .eq('player_id', user.id)
          .eq('league_id', league.id);

        if (!existingEntries || existingEntries.length === 0) {
          await supabase.from('sur_entries').insert({
            player_id: user.id,
            entry_name: 'Pick 1',
            league_id: league.id,
            is_alive: true,
            total_points: 0,
            total_gf: 0,
          });
        }
      }

      setActiveLeague(league as any);
      triggerRefresh();
      return { success: true, league: league as any };
    } catch (err: any) {
      console.error('Error joining league:', err);
      return { success: false, error: err.message || 'Error al unirse a la liga' };
    }
  }

  return {
    leagues,
    activeLeague,
    setActiveLeague,
    loading,
    error,
    refetch: fetchLeagues,
    createLeague,
    joinLeagueByCode,
  };
}
