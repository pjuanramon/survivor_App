import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import {
  Trophy,
  Skull,
  ShieldAlert,
  ArrowRight,
  BookOpen,
  MessageSquare,
  Share2,
  Globe,
  Settings,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/colors';
import {
  COUNTRY_FLAGS,
  isEuroSurvivorLeague,
  MAX_YELLOW_CARDS_DEFAULT,
} from '../../constants/competitions';
import { CountdownTimer } from '../../components/shared/CountdownTimer';
import { LeagueSelector } from '../../components/leagues/LeagueSelector';
import { CreateLeagueModal } from '../../components/leagues/CreateLeagueModal';
import { CreatePicksModal } from '../../components/leagues/CreatePicksModal';
import { LeagueChatModal } from '../../components/leagues/LeagueChatModal';
import { ExploreOpenLeaguesModal } from '../../components/leagues/ExploreOpenLeaguesModal';
import { AdminRoundModal } from '../../components/leagues/AdminRoundModal';
import { ShareCardModal } from '../../components/shared/ShareCard';
import { useAppStore } from '../../lib/store';
import { useLeagues } from '../../hooks/useLeagues';
import { useMatchday } from '../../hooks/useMatchday';
import { useRounds, isVirtualRoundId } from '../../hooks/useRounds';

interface SlotPickInfo {
  teamName: string;
  countryFlag: string;
  matchVs: string | null;
  isAutoAssigned: boolean;
}

interface PickDetail {
  id: string;
  entry_name: string;
  is_alive: boolean;
  yellow_cards: number;
  elimination_reason?: string | null;
  total_points: number;
  total_gf: number;
  homePick: SlotPickInfo | null;
  euroPick: SlotPickInfo | null;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { activeLeague } = useAppStore();
  const { config, loading: configLoading, refetch: refetchMatchday } = useMatchday(activeLeague?.competition_id);
  const { refetch: refetchLeagues } = useLeagues();
  const { activeRound, refetchRounds } = useRounds(activeLeague);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLeagueAdmin, setIsLeagueAdmin] = useState(false);
  const [picks, setPicks] = useState<PickDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [exploreOpenVisible, setExploreOpenVisible] = useState(false);
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [createPicksModalVisible, setCreatePicksModalVisible] = useState(false);

  const isEuroDouble = isEuroSurvivorLeague(activeLeague, activeRound?.game_mode);
  const maxYellows = activeRound?.max_yellow_cards || MAX_YELLOW_CARDS_DEFAULT;

  const fetchDashboardData = useCallback(async () => {
    if (configLoading) return;

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || (await supabase.auth.getUser()).data?.user;
      if (!user) {
        setLoading(false);
        return;
      }
      setCurrentUserId(user.id);

      if (!activeLeague?.id) {
        setPicks([]);
        setIsLeagueAdmin(false);
        return;
      }

      // Verificar si el usuario es Admin de la liga activa
      if (activeLeague.creator_id === user.id) {
        setIsLeagueAdmin(true);
      } else {
        const { data: memberRow } = await supabase
          .from('sur_league_members')
          .select('role')
          .eq('league_id', activeLeague.id)
          .eq('user_id', user.id)
          .maybeSingle();
        setIsLeagueAdmin(memberRow?.role === 'admin');
      }

      const activeJornada = config.current_jornada || 1;

      // Consultar entradas del usuario en la liga y ronda activa
      let entriesQuery = supabase
        .from('sur_entries')
        .select('*')
        .eq('player_id', user.id)
        .eq('league_id', activeLeague.id);

      if (activeRound?.id && !isVirtualRoundId(activeRound.id)) {
        entriesQuery = entriesQuery.or(`round_id.eq.${activeRound.id},round_id.is.null`);
      }

      const { data: entriesData, error: entriesError } = await entriesQuery;

      if (entriesError || !entriesData || entriesData.length === 0) {
        setPicks([]);
        return;
      }

      const entryIds = entriesData.map((e: any) => e.id);
      const { data: allSels } = await supabase
        .from('sur_selections')
        .select(`
          *,
          team:sur_teams!team_id(
            id,
            name,
            competition_id,
            competition:sur_competitions!competition_id(short_name, country)
          )
        `)
        .in('entry_id', entryIds)
        .eq('jornada', activeJornada);

      // Cargar partidos de la jornada para mostrar rivales ("vs Rival")
      const teamIdsPicked = Array.from(
        new Set((allSels || []).map((s: any) => s.team_id).filter(Boolean))
      );

      let matchesData: any[] = [];
      if (teamIdsPicked.length > 0) {
        const { data: mRows } = await supabase
          .from('sur_matches')
          .select(`
            home_team_id,
            away_team_id,
            home_team:sur_teams!home_team_id(id, name),
            away_team:sur_teams!away_team_id(id, name)
          `)
          .eq('jornada', activeJornada);
        matchesData = mRows || [];
      }

      const resolveSlotInfo = (sel: any): SlotPickInfo | null => {
        if (!sel?.team?.name) return null;
        const tName = sel.team.name;
        const countryCode = sel.team?.competition?.country || 'ES';
        const flag = COUNTRY_FLAGS[countryCode] || '⚽';

        const isAuto =
          !!sel.is_auto_assigned ||
          !!(
            sel.created_at &&
            config.picks_deadline &&
            new Date(sel.created_at) > new Date(config.picks_deadline)
          );

        const matchRow = matchesData.find(
          (m) => m.home_team_id === sel.team_id || m.away_team_id === sel.team_id
        );
        let matchVs: string | null = null;
        if (matchRow) {
          const home = matchRow.home_team?.name || 'Local';
          const away = matchRow.away_team?.name || 'Visitante';
          matchVs = matchRow.home_team_id === sel.team_id ? `vs ${away} (L)` : `@ ${home} (V)`;
        }

        return {
          teamName: tName,
          countryFlag: flag,
          matchVs,
          isAutoAssigned: isAuto,
        };
      };

      const mappedPicks: PickDetail[] = entriesData.map((entry: any) => {
        const entrySels = (allSels || []).filter((s: any) => s.entry_id === entry.id);

        const homeSel =
          entrySels.find((s: any) => (s.slot || 'home') === 'home') ||
          (!isEuroDouble ? entrySels[0] : null);
        const euroSel = entrySels.find((s: any) => s.slot === 'euro') || null;

        return {
          id: entry.id,
          entry_name: entry.entry_name,
          is_alive: entry.is_alive,
          yellow_cards: entry.yellow_cards || 0,
          elimination_reason: entry.elimination_reason || null,
          total_points: entry.total_points || 0,
          total_gf: entry.total_gf || 0,
          homePick: resolveSlotInfo(homeSel),
          euroPick: resolveSlotInfo(euroSel),
        };
      });

      setPicks(mappedPicks);
    } catch (error) {
      console.error('Error fetching dashboard picks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeLeague, activeRound?.id, isEuroDouble, config.current_jornada, configLoading, config.picks_deadline]);

  useEffect(() => {
    if (!configLoading) {
      fetchDashboardData();
    }
  }, [fetchDashboardData, configLoading]);

  const onRefresh = () => {
    setRefreshing(true);
    refetchMatchday();
    refetchLeagues();
    refetchRounds();
    fetchDashboardData();
  };

  const nextAvailableJornada = config.picks_open
    ? config.current_jornada
    : config.current_jornada + 1;

  if (loading || configLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Mis Partidas</Text>
            <Text style={styles.headerSubtitle}>
              {activeRound?.name || 'Ronda 1'} • Jornada {config.current_jornada}
            </Text>
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              onPress={() => setExploreOpenVisible(true)}
              style={styles.openGamesPill}
              activeOpacity={0.8}
            >
              <Globe size={15} color="#000000" />
              <Text style={styles.openGamesPillText}>Salas Abiertas</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/rules')}
              style={styles.rulesPill}
              activeOpacity={0.7}
            >
              <BookOpen size={15} color={COLORS.primary} />
              <Text style={styles.rulesPillText}>Reglas</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* League Selector */}
        <LeagueSelector
          onCreateOrJoinPress={() => setCreateModalVisible(true)}
        />

        {/* Format & Capacity Status Strip */}
        {activeLeague && (
          <View style={styles.formatBanner}>
            <Text style={styles.formatBannerText}>
              {isEuroDouble
                ? '🌍 Modo Euro-Survivor: 1 LaLiga + 1 Europa • 🟨 2 Amarillas = Roja'
                : `⚽ Modo Clásico (${activeLeague.competition?.name || '1 Pick'}) • 🟨 Amarilla por empate`}
            </Text>
            <Text style={styles.capacityBadge}>
              Cupo {activeLeague.max_players || 25}
            </Text>
          </View>
        )}

        {/* League Action Bar (Chat, Invite & Admin Panel) */}
        {activeLeague && (
          <View style={styles.leagueActionBar}>
            <TouchableOpacity
              onPress={() => setChatModalVisible(true)}
              style={styles.actionPill}
              activeOpacity={0.7}
            >
              <MessageSquare size={15} color={COLORS.primary} style={{ marginRight: 5 }} />
              <Text style={styles.actionPillText}>Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShareModalVisible(true)}
              style={[styles.actionPill, styles.actionPillHighlight]}
              activeOpacity={0.7}
            >
              <Share2 size={15} color={COLORS.textInverse} style={{ marginRight: 5 }} />
              <Text style={[styles.actionPillText, { color: COLORS.textInverse }]}>
                Invitar
              </Text>
            </TouchableOpacity>

            {(isLeagueAdmin || activeLeague.creator_id === currentUserId) && (
              <TouchableOpacity
                onPress={() => setAdminModalVisible(true)}
                style={styles.actionPillAdmin}
                activeOpacity={0.7}
              >
                <Settings size={15} color="#FBBF24" style={{ marginRight: 5 }} />
                <Text style={[styles.actionPillText, { color: '#FBBF24' }]}>
                  Admin
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Live Countdown Timer */}
        {config.picks_open && config.picks_deadline && (
          <CountdownTimer
            deadline={config.picks_deadline}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Picks Cards */}
        {!activeLeague ? (
          <View style={styles.emptyCard}>
            <Trophy size={48} color={COLORS.primary} />
            <Text style={styles.emptyTitle}>¡Bienvenido a Futvivor!</Text>
            <Text style={styles.emptySubtitle}>
              Organiza una partida privada con amigos (hasta 25) o entra al instante en una Sala Abierta Euro-Survivor de 30 jugadores.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity
                onPress={() => setExploreOpenVisible(true)}
                style={[styles.actionBtn, { flex: 1 }]}
                activeOpacity={0.85}
              >
                <Text style={styles.actionBtnText}>⚡ Sala Abierta</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setCreateModalVisible(true)}
                style={[styles.actionBtnSecondary, { flex: 1 }]}
                activeOpacity={0.85}
              >
                <Text style={styles.actionBtnSecondaryText}>+ Crear Grupo</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : picks.length === 0 ? (
          <View style={styles.emptyCard}>
            <ShieldAlert size={48} color={COLORS.warning} />
            <Text style={styles.emptyTitle}>Sin vidas activas en esta ronda</Text>
            <Text style={styles.emptySubtitle}>
              Configura tus vidas para empezar a competir en esta partida.
            </Text>
            <TouchableOpacity
              onPress={() => setCreatePicksModalVisible(true)}
              style={styles.actionBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>Activar Vidas</Text>
            </TouchableOpacity>
          </View>
        ) : (
          picks.map((pick) => {
            const isWarnedYellow = pick.is_alive && pick.yellow_cards > 0;
            const missingAnyPick = isEuroDouble
              ? !pick.homePick || !pick.euroPick
              : !pick.homePick;

            return (
              <View
                key={pick.id}
                style={[
                  styles.pickCard,
                  isWarnedYellow && styles.pickCardYellowWarn,
                  !pick.is_alive && styles.pickCardDead,
                ]}
              >
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.pickBadgeRow}>
                    <View
                      style={[
                        styles.statusIconCircle,
                        pick.is_alive
                          ? styles.statusCircleAlive
                          : styles.statusCircleDead,
                      ]}
                    >
                      {pick.is_alive ? (
                        <Trophy size={16} color={COLORS.alive} />
                      ) : (
                        <Skull size={16} color="#EF4444" />
                      )}
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.pickName,
                          !pick.is_alive && styles.pickNameDead,
                        ]}
                      >
                        {pick.entry_name}
                      </Text>
                      <Text style={styles.miniStats}>
                        {pick.total_points} PTS • {pick.total_gf} GF
                      </Text>
                    </View>
                  </View>

                  <View style={styles.badgesRight}>
                    {/* Tarjetas Amarillas Pill */}
                    {pick.is_alive ? (
                      <View
                        style={[
                          styles.yellowBadge,
                          isWarnedYellow && styles.yellowBadgeActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.yellowBadgeText,
                            isWarnedYellow && styles.yellowBadgeTextActive,
                          ]}
                        >
                          {isWarnedYellow
                            ? `🟨 ${pick.yellow_cards}/${maxYellows} APERCIBIDO`
                            : `0/${maxYellows} 🟨`}
                        </Text>
                      </View>
                    ) : null}

                    <View
                      style={[
                        styles.statusTag,
                        pick.is_alive ? styles.tagAlive : styles.tagDead,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagText,
                          pick.is_alive ? styles.tagTextAlive : styles.tagTextDead,
                        ]}
                      >
                        {pick.is_alive ? 'VIVO' : '🟥 RIP'}
                      </Text>
                    </View>
                  </View>
                </View>

                {isWarnedYellow && (
                  <View style={styles.yellowAlertBanner}>
                    <Text style={styles.yellowAlertText}>
                      🟨 ¡Cuidado! Estás apercibido: un empate más acumula la 2ª amarilla y supone Tarjeta Roja (eliminación).
                    </Text>
                  </View>
                )}

                {/* Selection Section */}
                {pick.is_alive ? (
                  <View style={styles.selectionBox}>
                    <View style={styles.selectionBoxHeader}>
                      <Text style={styles.selectionLabel}>
                        {isEuroDouble
                          ? `TICKET DOBLE • JORNADA ${config.current_jornada}`
                          : `SELECCIÓN • JORNADA ${config.current_jornada}`}
                      </Text>

                      <TouchableOpacity
                        onPress={() => router.push('/(tabs)/select')}
                        style={styles.selectBtn}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.selectBtnText}>
                          {missingAnyPick ? 'Elegir Ahora' : 'Cambiar'}
                        </Text>
                        <ArrowRight size={13} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>

                    {/* Bala 1: Casa / LaLiga */}
                    <View style={styles.slotRow}>
                      <View style={styles.slotTag}>
                        <Text style={styles.slotTagText}>
                          {isEuroDouble ? '🇪🇸 BALA 1 (LALIGA)' : '⚽ TU EQUIPO'}
                        </Text>
                      </View>
                      {pick.homePick ? (
                        <View style={styles.slotTeamInfo}>
                          <Text
                            style={[
                              styles.teamName,
                              pick.homePick.isAutoAssigned && styles.teamNameAuto,
                            ]}
                          >
                            {pick.homePick.countryFlag} {pick.homePick.teamName}
                            {pick.homePick.isAutoAssigned ? ' ⚠️' : ''}
                          </Text>
                          {pick.homePick.matchVs && (
                            <Text style={styles.matchVs}>{pick.homePick.matchVs}</Text>
                          )}
                        </View>
                      ) : (
                        <Text style={styles.pendingText}>⚠️ Pendiente de elegir</Text>
                      )}
                    </View>

                    {/* Bala 2: Europa (solo en Euro-Survivor) */}
                    {isEuroDouble && (
                      <View style={[styles.slotRow, styles.slotRowSecond]}>
                        <View style={[styles.slotTag, styles.slotTagEuro]}>
                          <Text style={[styles.slotTagText, { color: '#60A5FA' }]}>
                            🌍 BALA 2 (EUROPA)
                          </Text>
                        </View>
                        {pick.euroPick ? (
                          <View style={styles.slotTeamInfo}>
                            <Text
                              style={[
                                styles.teamName,
                                pick.euroPick.isAutoAssigned && styles.teamNameAuto,
                              ]}
                            >
                              {pick.euroPick.countryFlag} {pick.euroPick.teamName}
                              {pick.euroPick.isAutoAssigned ? ' ⚠️' : ''}
                            </Text>
                            {pick.euroPick.matchVs && (
                              <Text style={styles.matchVs}>{pick.euroPick.matchVs}</Text>
                            )}
                          </View>
                        ) : (
                          <Text style={styles.pendingText}>⚠️ Elige Premier / Serie A / Bundesliga</Text>
                        )}
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.deadNoticeBox}>
                    <View style={styles.deadNoticeHeader}>
                      <Skull size={16} color="#EF4444" style={{ marginRight: 6 }} />
                      <Text style={styles.deadNoticeTitle}>
                        {pick.elimination_reason === 'double_yellow'
                          ? 'EXPULSADO POR DOBLE AMARILLA (🟨+🟨=🟥)'
                          : 'VIDA ELIMINADA (ROJA DIRECTA 🟥)'}
                      </Text>
                    </View>
                    <Text style={styles.deadNoticeSub}>
                      Esta vida cayó eliminada. Sigue el desenlace de la ronda o entra mientras tanto en una Sala Abierta nueva.
                    </Text>
                    <View style={styles.deadStatsRow}>
                      <Text style={styles.deadStatsLabel}>
                        Puntos Finales: <Text style={styles.deadStatsValue}>{pick.total_points}</Text>  •  GF: <Text style={styles.deadStatsValue}>{pick.total_gf}</Text>  •  🟨: <Text style={styles.deadStatsValue}>{pick.yellow_cards}</Text>
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Create League Modal */}
      <CreateLeagueModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
      />

      {/* Explore Open Leagues Modal */}
      <ExploreOpenLeaguesModal
        visible={exploreOpenVisible}
        onClose={() => setExploreOpenVisible(false)}
        onJoined={fetchDashboardData}
      />

      {/* Admin Round & Settings Modal */}
      {activeLeague && (
        <AdminRoundModal
          visible={adminModalVisible}
          onClose={() => setAdminModalVisible(false)}
          league={activeLeague}
          nextJornada={nextAvailableJornada}
          onUpdated={fetchDashboardData}
        />
      )}

      {/* League Chat Modal */}
      {activeLeague && (
        <LeagueChatModal
          visible={chatModalVisible}
          onClose={() => setChatModalVisible(false)}
          leagueId={activeLeague.id}
          leagueName={activeLeague.name}
        />
      )}

      {/* Create Picks Modal */}
      {activeLeague && (
        <CreatePicksModal
          visible={createPicksModalVisible}
          onClose={() => setCreatePicksModalVisible(false)}
          onSuccess={fetchDashboardData}
          leagueId={activeLeague.id}
          leagueName={activeLeague.name}
        />
      )}

      {/* Share Card Modal */}
      {activeLeague && (
        <ShareCardModal
          visible={shareModalVisible}
          onClose={() => setShareModalVisible(false)}
          data={{
            type: 'invite',
            leagueName: activeLeague.name,
            inviteCode: activeLeague.invite_code,
            competitionName: activeLeague.competition?.name || 'Euro-Survivor',
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    maxWidth: 620,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  openGamesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 5,
  },
  openGamesPillText: {
    color: COLORS.textInverse,
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  rulesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  rulesPillText: {
    color: COLORS.textPrimary,
    fontWeight: '800',
    fontSize: 11,
    marginLeft: 5,
    textTransform: 'uppercase',
  },
  formatBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
  },
  formatBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  capacityBadge: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.primary,
    backgroundColor: COLORS.primaryMuted,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  leagueActionBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  actionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  actionPillHighlight: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  actionPillAdmin: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 19,
  },
  actionBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: COLORS.textInverse,
    fontWeight: '900',
    fontSize: 13,
  },
  actionBtnSecondary: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnSecondaryText: {
    color: COLORS.textPrimary,
    fontWeight: '800',
    fontSize: 13,
  },
  pickCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  pickCardYellowWarn: {
    borderColor: 'rgba(251, 191, 36, 0.55)',
  },
  pickCardDead: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    opacity: 0.78,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  statusCircleAlive: {
    backgroundColor: COLORS.aliveBg,
  },
  statusCircleDead: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  pickName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  pickNameDead: {
    color: '#EF4444',
    textDecorationLine: 'line-through',
  },
  miniStats: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '700',
    marginTop: 1,
  },
  badgesRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  yellowBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  yellowBadgeActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.16)',
    borderColor: '#FBBF24',
  },
  yellowBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  yellowBadgeTextActive: {
    color: '#FBBF24',
  },
  statusTag: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tagAlive: {
    backgroundColor: COLORS.aliveBg,
  },
  tagDead: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  tagText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tagTextAlive: {
    color: COLORS.alive,
  },
  tagTextDead: {
    color: '#EF4444',
  },
  yellowAlertBanner: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    padding: 9,
    marginBottom: 12,
  },
  yellowAlertText: {
    fontSize: 11,
    color: '#FBBF24',
    fontWeight: '700',
    lineHeight: 16,
  },
  selectionBox: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  selectionBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  slotRow: {
    paddingVertical: 8,
  },
  slotRowSecond: {
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
    marginTop: 6,
    paddingTop: 10,
  },
  slotTag: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryMuted,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    marginBottom: 5,
  },
  slotTagEuro: {
    backgroundColor: COLORS.infoBg,
  },
  slotTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.4,
  },
  slotTeamInfo: {
    marginTop: 2,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  teamNameAuto: {
    color: COLORS.warning,
  },
  matchVs: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  pendingText: {
    fontSize: 12,
    color: COLORS.warning,
    fontWeight: '700',
    marginTop: 2,
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  selectBtnText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    marginRight: 4,
  },
  deadNoticeBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  deadNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  deadNoticeTitle: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  deadNoticeSub: {
    color: '#D1D5DB',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 8,
  },
  deadStatsRow: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  deadStatsLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
  },
  deadStatsValue: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
