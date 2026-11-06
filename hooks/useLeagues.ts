import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { GameMode, League, LeagueType } from '../types/database';
import { useAppStore } from '../lib/store';
import {
  LEAGUE_CAPACITY_LIMITS,
  MAX_YELLOW_CARDS_DEFAULT,
  SUDDEN_DEATH_ALIVE_THRESHOLD,
} from '../constants/competitions';

const LEAGUE_SELECT_QUERY = `
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
`;

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

      const { data: { session } } = await supabase.auth.getSession();
      let user = session?.user;

      if (!user) {
        const { data: userData } = await supabase.auth.getUser();
        user = userData?.user ?? undefined;
      }

      if (!user) {
        setLeagues([]);
        setActiveLeague(null);
        return;
      }

      const [creatorRes, memberRes, entryRes] = await Promise.all([
        supabase.from('sur_leagues').select('id, name, invite_code').eq('creator_id', user.id),
        supabase.from('sur_league_members').select('league_id').eq('user_id', user.id),
        supabase.from('sur_entries').select('league_id').eq('player_id', user.id),
      ]);

      const memberIds = (memberRes.data || []).map((m) => m.league_id).filter(Boolean);
      const entryIds = (entryRes.data || []).map((e) => e.league_id).filter(Boolean);
      const enrolledSet = new Set([...memberIds, ...entryIds]);

      // No auto-incluir salas abiertas oficiales del sistema salvo que el usuario se haya inscrito
      const creatorIds = (creatorRes.data || [])
        .filter((l: any) => {
          const isSystemOpenRoom =
            l.invite_code === 'EURO01' ||
            (typeof l.name === 'string' && l.name.startsWith('Sala Euro-Survivor #'));
          return !isSystemOpenRoom || enrolledSet.has(l.id);
        })
        .map((l: any) => l.id)
        .filter(Boolean);

      const userLeagueIds = Array.from(
        new Set([...creatorIds, ...memberIds, ...entryIds])
      );

      if (userLeagueIds.length > 0) {
        const { data: leaguesData, error: leaguesError } = await supabase
          .from('sur_leagues')
          .select(LEAGUE_SELECT_QUERY)
          .in('id', userLeagueIds);

        if (leaguesError) throw leaguesError;

        const loadedLeagues: League[] = (leaguesData || []).filter(Boolean) as any;
        setLeagues(loadedLeagues);

        const currentActive = useAppStore.getState().activeLeague;
        if (loadedLeagues.length > 0) {
          const updatedMatch = currentActive
            ? loadedLeagues.find((l) => l.id === currentActive.id)
            : null;
          if (updatedMatch) {
            setActiveLeague(updatedMatch);
          } else {
            const preferred =
              loadedLeagues.find((l) => l.competition?.short_name === 'euro_survivor') ||
              loadedLeagues.find((l) => l.creator_id === user?.id) ||
              loadedLeagues[0];
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

  function generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async function ensurePlayerInitialEntries({
    userId,
    userEmail,
    leagueId,
    roundId,
    livesCount = 1,
  }: {
    userId: string;
    userEmail?: string | null;
    leagueId: string;
    roundId?: string | null;
    livesCount?: number;
  }) {
    // Garantizar que exista perfil en sur_profiles antes de insertar en sur_entries
    const { data: existingProfile } = await supabase
      .from('sur_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingProfile) {
      await supabase.from('sur_profiles').insert({
        id: userId,
        username: userEmail?.split('@')[0] || 'Superviviente',
      });
    }

    let existingQuery = supabase
      .from('sur_entries')
      .select('id')
      .eq('player_id', userId)
      .eq('league_id', leagueId);

    if (roundId) {
      existingQuery = existingQuery.eq('round_id', roundId);
    }

    const { data: existingEntries } = await existingQuery;
    if (existingEntries && existingEntries.length > 0) return;

    const baseRows = Array.from({ length: Math.max(1, livesCount) }).map((_, idx) => ({
      player_id: userId,
      entry_name: `Vida ${idx + 1}`,
      league_id: leagueId,
      ...(roundId ? { round_id: roundId, yellow_cards: 0 } : {}),
      is_alive: true,
      total_points: 0,
      total_gf: 0,
    }));

    const { error: insertErr } = await supabase.from('sur_entries').insert(baseRows);
    if (insertErr && roundId) {
      // Fallback si las columnas V5 aún no se han ejecutado en Supabase
      const fallbackRows = Array.from({ length: Math.max(1, livesCount) }).map((_, idx) => ({
        player_id: userId,
        entry_name: `Vida ${idx + 1}`,
        league_id: leagueId,
        is_alive: true,
        total_points: 0,
        total_gf: 0,
      }));
      await supabase.from('sur_entries').insert(fallbackRows);
    }
  }

  /**
   * Crear nueva Liga (Privada de amigos máx 25, Partida Abierta máx 30, o Comunidad PRO hasta 250)
   */
  async function createLeague({
    name,
    competitionId,
    avatarEmoji = '🌍',
    isPublic = false,
    maxPlayers = LEAGUE_CAPACITY_LIMITS.FREE_PRIVATE_MAX,
    leagueType = 'private',
    gameMode = 'euro_double',
    maxLivesPerPlayer = 1,
    startJornada = 1,
    autoRestart = true,
  }: {
    name: string;
    competitionId: string;
    avatarEmoji?: string;
    isPublic?: boolean;
    maxPlayers?: number;
    leagueType?: LeagueType;
    gameMode?: GameMode;
    maxLivesPerPlayer?: number;
    startJornada?: number;
    autoRestart?: boolean;
  }): Promise<{ success: boolean; league?: League; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || (await supabase.auth.getUser()).data?.user;
      if (!user) throw new Error('Usuario no autenticado');

      const inviteCode = generateInviteCode();

      // Intentar inserción con metadatos V5 y fallback automático al esquema V2 si procede
      let newLeague: any = null;
      const extendedInsert = await supabase
        .from('sur_leagues')
        .insert({
          name: name.trim(),
          invite_code: inviteCode,
          competition_id: competitionId,
          creator_id: user.id,
          avatar_emoji: avatarEmoji,
          is_public: isPublic,
          max_players: maxPlayers,
          league_type: leagueType,
          start_jornada: startJornada,
        })
        .select(LEAGUE_SELECT_QUERY)
        .single();

      if (extendedInsert.error) {
        const legacyInsert = await supabase
          .from('sur_leagues')
          .insert({
            name: name.trim(),
            invite_code: inviteCode,
            competition_id: competitionId,
            creator_id: user.id,
            avatar_emoji: avatarEmoji,
            is_public: isPublic,
            max_players: maxPlayers,
          })
          .select(LEAGUE_SELECT_QUERY)
          .single();

        if (legacyInsert.error) throw legacyInsert.error;
        newLeague = legacyInsert.data;
      } else {
        newLeague = extendedInsert.data;
      }

      // Añadir creador como admin
      await supabase
        .from('sur_league_members')
        .insert({
          league_id: newLeague.id,
          user_id: user.id,
          role: 'admin',
        });

      // Crear Ronda 1 si sur_rounds ya está activa
      let createdRoundId: string | null = null;
      const { data: roundData, error: roundErr } = await supabase
        .from('sur_rounds')
        .insert({
          league_id: newLeague.id,
          round_number: 1,
          name: 'Ronda 1',
          status: 'open',
          game_mode: gameMode,
          max_lives_per_player: maxLivesPerPlayer,
          max_yellow_cards: MAX_YELLOW_CARDS_DEFAULT,
          sudden_death_threshold: SUDDEN_DEATH_ALIVE_THRESHOLD,
          start_jornada: startJornada,
          auto_restart: autoRestart,
        })
        .select('id')
        .maybeSingle();

      if (!roundErr && roundData?.id) {
        createdRoundId = roundData.id;
      }

      await ensurePlayerInitialEntries({
        userId: user.id,
        userEmail: user.email,
        leagueId: newLeague.id,
        roundId: createdRoundId,
        livesCount: maxLivesPerPlayer,
      });

      triggerRefresh();
      return { success: true, league: newLeague as League };
    } catch (err: any) {
      console.error('Error creating league:', err);
      return { success: false, error: err.message || 'Error al crear la liga' };
    }
  }

  /**
   * Validación común de cupo máximo y alta de jugador en una liga
   */
  async function enrollUserInLeague(
    league: League,
    userId: string,
    userEmail?: string | null
  ): Promise<{ success: boolean; league?: League; error?: string }> {
    const { data: existingProfile } = await supabase
      .from('sur_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingProfile) {
      await supabase.from('sur_profiles').insert({
        id: userId,
        username: userEmail?.split('@')[0] || 'Superviviente',
      });
    }

    const { data: existingMember } = await supabase
      .from('sur_league_members')
      .select('role')
      .eq('league_id', league.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingMember) {
      // Verificar cupo máximo de la sala (25 amigos / 30 abierta / 250 comunidad)
      const { count: currentMembersCount } = await supabase
        .from('sur_league_members')
        .select('user_id', { count: 'exact', head: true })
        .eq('league_id', league.id);

      const cap = league.max_players || LEAGUE_CAPACITY_LIMITS.FREE_PRIVATE_MAX;
      if ((currentMembersCount || 0) >= cap) {
        return {
          success: false,
          error: `¡Sala completa! Esta partida ha alcanzado su cupo máximo (${cap}/${cap} jugadores).`,
        };
      }

      const { error: joinError } = await supabase
        .from('sur_league_members')
        .insert({
          league_id: league.id,
          user_id: userId,
          role: 'player',
        });

      if (joinError) throw joinError;
    }

    // Buscar ronda actual y cuántas vidas corresponden
    let activeRoundId: string | null = null;
    let defaultLives = 1;
    const { data: latestRound } = await supabase
      .from('sur_rounds')
      .select('id, max_lives_per_player')
      .eq('league_id', league.id)
      .order('round_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestRound) {
      activeRoundId = latestRound.id;
      defaultLives = latestRound.max_lives_per_player || 1;
    }

    await ensurePlayerInitialEntries({
      userId,
      userEmail,
      leagueId: league.id,
      roundId: activeRoundId,
      livesCount: defaultLives,
    });

    setActiveLeague(league);
    triggerRefresh();
    return { success: true, league };
  }

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
        .select(LEAGUE_SELECT_QUERY)
        .eq('invite_code', cleanCode)
        .maybeSingle();

      if (findError) throw findError;
      if (!league) {
        throw new Error('Código de partida no encontrado. Verifica el código e intenta de nuevo.');
      }

      return await enrollUserInLeague(league as any, user.id, user.email);
    } catch (err: any) {
      console.error('Error joining league:', err);
      return { success: false, error: err.message || 'Error al unirse a la liga' };
    }
  }

  /**
   * Explorar todas las Partidas Abiertas públicas con contador real de plazas ocupadas
   */
  async function fetchPublicLeagues(): Promise<League[]> {
    try {
      const { data: publicData, error: pubErr } = await supabase
        .from('sur_leagues')
        .select(LEAGUE_SELECT_QUERY)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(30);

      if (pubErr || !publicData) return [];

      const enriched = await Promise.all(
        publicData.map(async (lg: any) => {
          const [{ count: membersCount }, { count: aliveCount }] = await Promise.all([
            supabase
              .from('sur_league_members')
              .select('user_id', { count: 'exact', head: true })
              .eq('league_id', lg.id),
            supabase
              .from('sur_entries')
              .select('id', { count: 'exact', head: true })
              .eq('league_id', lg.id)
              .eq('is_alive', true),
          ]);
          return {
            ...lg,
            members_count: membersCount || 0,
            alive_count: aliveCount || 0,
          } as League;
        })
      );

      return enriched;
    } catch (err) {
      console.error('Error fetching public leagues:', err);
      return [];
    }
  }

  async function joinPublicLeague(
    league: League
  ): Promise<{ success: boolean; league?: League; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || (await supabase.auth.getUser()).data?.user;
      if (!user) throw new Error('Usuario no autenticado');

      return await enrollUserInLeague(league, user.id, user.email);
    } catch (err: any) {
      return { success: false, error: err.message || 'No se pudo entrar a la sala abierta' };
    }
  }

  /**
   * Matchmaking 1-Clic: Mete al jugador en una Sala Euro-Survivor de 30 personas con hueco,
   * o abre automáticamente la siguiente Sala (#2, #3...) si las actuales llegaron a 30/30.
   */
  async function joinQuickOpenRoom(): Promise<{ success: boolean; league?: League; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || (await supabase.auth.getUser()).data?.user;
      if (!user) throw new Error('Usuario no autenticado');

      // 1. Intentar RPC atómico en servidor (Migration V5)
      const { data: rpcLeagueId, error: rpcErr } = await supabase.rpc('join_quick_open_room', {
        p_user_id: user.id,
      });

      if (!rpcErr && rpcLeagueId) {
        const { data: joinedLg } = await supabase
          .from('sur_leagues')
          .select(LEAGUE_SELECT_QUERY)
          .eq('id', rpcLeagueId)
          .single();

        if (joinedLg) {
          setActiveLeague(joinedLg as any);
          triggerRefresh();
          return { success: true, league: joinedLg as any };
        }
      }

      // 2. Fallback cliente si aún no está aplicada la función RPC
      const openList = await fetchPublicLeagues();
      const availableEuroRoom = openList.find(
        (l) =>
          l.competition?.short_name === 'euro_survivor' &&
          (l.members_count || 0) < (l.max_players || LEAGUE_CAPACITY_LIMITS.OPEN_MATCHMAKING_ROOM)
      );

      if (availableEuroRoom) {
        return await enrollUserInLeague(availableEuroRoom, user.id, user.email);
      }

      const { data: euroComp } = await supabase
        .from('sur_competitions')
        .select('id')
        .eq('short_name', 'euro_survivor')
        .maybeSingle();

      if (!euroComp?.id) {
        throw new Error('Competición Euro-Survivor no disponible.');
      }

      const nextRoomIndex =
        openList.filter((l) => l.name.startsWith('Sala Euro-Survivor')).length + 1;

      return await createLeague({
        name: `Sala Euro-Survivor #${nextRoomIndex} (Abierta)`,
        competitionId: euroComp.id,
        avatarEmoji: '🌍',
        isPublic: true,
        maxPlayers: LEAGUE_CAPACITY_LIMITS.OPEN_MATCHMAKING_ROOM,
        leagueType: 'official_room',
        gameMode: 'euro_double',
        maxLivesPerPlayer: 1,
      });
    } catch (err: any) {
      console.error('Error in quick open room:', err);
      return { success: false, error: err.message || 'No se pudo entrar a una sala rápida' };
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
    fetchPublicLeagues,
    joinPublicLeague,
    joinQuickOpenRoom,
  };
}
