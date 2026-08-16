import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { League } from '../types/database';
import { useAppStore } from '../lib/store';

export function useLeagues() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    leagues,
    setLeagues,
    activeLeague,
    setActiveLeague,
    refreshKey,
    triggerRefresh,
  } = useAppStore();

  const fetchLeagues = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Get authenticated user
      const { data: { session } } = await supabase.auth.getSession();
      let user = session?.user;

      if (!user) {
        const { data: userData } = await supabase.auth.getUser();
        user = userData?.user ?? null;
      }

      if (!user) {
        setLeagues([]);
        setActiveLeague(null);
        return;
      }

      // 2. Fetch leagues where user is creator, member, or has entries (run in parallel)
      const [creatorRes, memberRes, entryRes] = await Promise.all([
        supabase.from('sur_leagues').select('id').eq('creator_id', user.id),
        supabase.from('sur_league_members').select('league_id').eq('user_id', user.id),
        supabase.from('sur_entries').select('league_id').eq('player_id', user.id),
      ]);

      const creatorIds = (creatorRes.data || []).map((l) => l.id).filter(Boolean);
      const memberIds = (memberRes.data || []).map((m) => m.league_id).filter(Boolean);
      const entryIds = (entryRes.data || []).map((e) => e.league_id).filter(Boolean);

      const userLeagueIds = Array.from(
        new Set([...creatorIds, ...memberIds, ...entryIds])
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
              loadedLeagues.find((l) => l.creator_id === user?.id) || loadedLeagues[0];
            setActiveLeague(preferred);
          }
        }
      } else {
        setLeagues([]);
        setActiveLeague(null);
      }
    } catch (err: any) {
      console.error('Error fetching user leagues:', err);
      setError(err.message || 'Error al cargar ligas');
    } finally {
      setLoading(false);
    }
  }, [refreshKey, setLeagues, setActiveLeague]);

  useEffect(() => {
    fetchLeagues();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchLeagues();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
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
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || (await supabase.auth.getUser()).data?.user;
      if (!user) throw new Error('Usuario no autenticado');

      const inviteCode = generateInviteCode();

      const { data: newLeague, error: leagueError } = await supabase
        .from('sur_leagues')
        .insert({
          name: name.trim(),
          invite_code: inviteCode,
          competition_id: competitionId,
          creator_id: user.id,
          avatar_emoji: avatarEmoji,
          is_public: false,
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
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || (await supabase.auth.getUser()).data?.user;
      if (!user) throw new Error('Usuario no autenticado');

      const cleanCode = inviteCode.trim().toUpperCase();

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

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('sur_league_members')
        .select('role')
        .eq('league_id', league.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingMember) {
        const { error: joinError } = await supabase
          .from('sur_league_members')
          .insert({
            league_id: league.id,
            user_id: user.id,
            role: 'player',
          });

        if (joinError) throw joinError;

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
