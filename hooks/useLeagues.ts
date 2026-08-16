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

      // Fetch leagues where user is a member
      const { data: memberLeagues, error: memberError } = await supabase
        .from('sur_league_members')
        .select(`
          league:sur_leagues (
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
          )
        `)
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      const loadedLeagues: League[] = (memberLeagues || [])
        .map((item: any) => item.league)
        .filter(Boolean);

      setLeagues(loadedLeagues);

      // Auto-select active league safely without re-triggering loop
      const currentActive = useAppStore.getState().activeLeague;
      if (loadedLeagues.length > 0) {
        if (!currentActive || !loadedLeagues.find((l) => l.id === currentActive.id)) {
          setActiveLeague(loadedLeagues[0]);
        }
      } else {
        if (currentActive !== null) {
          setActiveLeague(null);
        }
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
    isPublic = false,
  }: {
    name: string;
    competitionId: string;
    avatarEmoji?: string;
    isPublic?: boolean;
  }): Promise<{ success: boolean; league?: League; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
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
          is_public: isPublic,
        })
        .select()
        .single();

      if (leagueError) throw leagueError;

      // Add creator as admin in league_members
      const { error: memberError } = await supabase
        .from('sur_league_members')
        .insert({
          league_id: newLeague.id,
          user_id: user.id,
          role: 'admin',
        });

      if (memberError) throw memberError;

      triggerRefresh();
      return { success: true, league: newLeague };
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
        .select('*')
        .eq('invite_code', cleanCode)
        .maybeSingle();

      if (findError) throw findError;
      if (!league) throw new Error('Código de liga no encontrado');

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('sur_league_members')
        .select('role')
        .eq('league_id', league.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingMember) {
        setActiveLeague(league);
        return { success: true, league };
      }

      // Add user to league
      const { error: joinError } = await supabase
        .from('sur_league_members')
        .insert({
          league_id: league.id,
          user_id: user.id,
          role: 'player',
        });

      if (joinError) throw joinError;

      triggerRefresh();
      return { success: true, league };
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
