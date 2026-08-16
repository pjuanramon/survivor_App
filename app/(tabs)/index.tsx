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
import { Trophy, Skull, ShieldAlert, ArrowRight, BookOpen, Sparkles, MessageSquare, Share2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { CountdownTimer } from '../../components/shared/CountdownTimer';
import { LeagueSelector } from '../../components/leagues/LeagueSelector';
import { CreateLeagueModal } from '../../components/leagues/CreateLeagueModal';
import { CreatePicksModal } from '../../components/leagues/CreatePicksModal';
import { LeagueChatModal } from '../../components/leagues/LeagueChatModal';
import { ShareCardModal } from '../../components/shared/ShareCard';
import { useAppStore } from '../../lib/store';
import { useLeagues } from '../../hooks/useLeagues';
import { useMatchday } from '../../hooks/useMatchday';

interface PickDetail {
  id: string;
  entry_name: string;
  is_alive: boolean;
  total_points: number;
  total_gf: number;
  current_team_name?: string | null;
  current_match_vs?: string | null;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { activeLeague } = useAppStore();
  const { config, refetch: refetchMatchday } = useMatchday(activeLeague?.competition_id);
  const { refetch: refetchLeagues } = useLeagues();

  const [picks, setPicks] = useState<PickDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [createPicksModalVisible, setCreatePicksModalVisible] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const activeJornada = config.current_jornada || 1;

      // Query entries, filtered by active league if present
      let entriesQuery = supabase
        .from('sur_entries')
        .select('id, entry_name, is_alive, total_points, total_gf, league_id')
        .eq('player_id', user.id);

      if (activeLeague?.id) {
        entriesQuery = entriesQuery.or(`league_id.eq.${activeLeague.id},league_id.is.null`);
      }

      const { data: entriesData, error: entriesError } = await entriesQuery;

      if (entriesError || !entriesData || entriesData.length === 0) {
        setPicks([]);
        return;
      }

      const picksWithDetails: PickDetail[] = await Promise.all(
        entriesData.map(async (entry) => {
          const { data: selData } = await supabase
            .from('sur_selections')
            .select(`
              team_id,
              team:sur_teams!team_id(name)
            `)
            .eq('entry_id', entry.id)
            .eq('jornada', activeJornada)
            .maybeSingle();

          let teamName = (selData as any)?.team?.name || null;
          let matchVs = null;

          if (teamName) {
            const { data: matchData } = await supabase
              .from('sur_matches')
              .select(`
                home_team:sur_teams!home_team_id(id, name),
                away_team:sur_teams!away_team_id(id, name)
              `)
              .eq('jornada', activeJornada)
              .or(`home_team_id.eq.${(selData as any).team_id},away_team_id.eq.${(selData as any).team_id}`)
              .maybeSingle();

            if (matchData) {
              const home = (matchData as any).home_team?.name || 'Equipo';
              const away = (matchData as any).away_team?.name || 'Rival';
              matchVs = home === teamName ? `vs ${away} (Local)` : `@ ${home} (Visitante)`;
            }
          }

          return {
            ...entry,
            current_team_name: teamName,
            current_match_vs: matchVs,
          };
        })
      );

      setPicks(picksWithDetails);
    } catch (error) {
      console.error('Error fetching dashboard picks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeLeague, config.current_jornada]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    refetchMatchday();
    refetchLeagues();
    fetchDashboardData();
  };

  if (loading) {
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
          <View>
            <Text style={styles.headerTitle}>Mis Picks</Text>
            <Text style={styles.headerSubtitle}>
              Jornada {config.current_jornada} Activa
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/rules')}
            style={styles.rulesPill}
            activeOpacity={0.7}
          >
            <BookOpen size={16} color={COLORS.primary} />
            <Text style={styles.rulesPillText}>Reglas</Text>
          </TouchableOpacity>
        </View>

        {/* League Selector */}
        <LeagueSelector
          onCreateOrJoinPress={() => setCreateModalVisible(true)}
        />

        {/* League Action Bar (Chat & Invite) */}
        {activeLeague && (
          <View style={styles.leagueActionBar}>
            <TouchableOpacity
              onPress={() => setChatModalVisible(true)}
              style={styles.actionPill}
              activeOpacity={0.7}
            >
              <MessageSquare size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.actionPillText}>Chat de Liga</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShareModalVisible(true)}
              style={[styles.actionPill, styles.actionPillHighlight]}
              activeOpacity={0.7}
            >
              <Share2 size={16} color={COLORS.textInverse} style={{ marginRight: 6 }} />
              <Text style={[styles.actionPillText, { color: COLORS.textInverse }]}>
                Invitar Amigos
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Live Countdown Timer */}
        {config.picks_deadline && (
          <CountdownTimer
            deadline={config.picks_deadline}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Picks Cards */}
        {picks.length === 0 ? (
          <View style={styles.emptyCard}>
            <ShieldAlert size={48} color={COLORS.warning} />
            <Text style={styles.emptyTitle}>Sin picks registrados</Text>
            <Text style={styles.emptySubtitle}>
              Aún no tienes vidas configuradas para esta liga.
            </Text>
            <TouchableOpacity
              onPress={() => setCreatePicksModalVisible(true)}
              style={styles.actionBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>Crear Picks</Text>
            </TouchableOpacity>
          </View>
        ) : (
          picks.map((pick) => (
            <View
              key={pick.id}
              style={[
                styles.pickCard,
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
                      <Skull size={16} color={COLORS.dead} />
                    )}
                  </View>
                  <Text style={styles.pickName}>{pick.entry_name}</Text>
                </View>

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
                    {pick.is_alive ? 'VIVO' : 'ELIMINADO'}
                  </Text>
                </View>
              </View>

              {/* Selection Section */}
              <View style={styles.selectionBox}>
                <Text style={styles.selectionLabel}>
                  SELECCIÓN JORNADA {config.current_jornada}
                </Text>
                {pick.current_team_name ? (
                  <View>
                    <Text style={styles.teamName}>{pick.current_team_name}</Text>
                    {pick.current_match_vs && (
                      <Text style={styles.matchVs}>{pick.current_match_vs}</Text>
                    )}
                  </View>
                ) : (
                  <View style={styles.pendingRow}>
                    <Text style={styles.pendingText}>⚠️ Pendiente de elegir</Text>
                    {pick.is_alive && (
                      <TouchableOpacity
                        onPress={() => router.push('/(tabs)/select')}
                        style={styles.selectBtn}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.selectBtnText}>Elegir</Text>
                        <ArrowRight size={14} color={COLORS.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              {/* Stats Row */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>PUNTOS</Text>
                  <Text style={styles.statValue}>{pick.total_points}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>GOLES A FAVOR</Text>
                  <Text style={styles.statValue}>{pick.total_gf}</Text>
                </View>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Create League Modal */}
      <CreateLeagueModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
      />

      {/* League Chat Modal */}
      {activeLeague && (
        <LeagueChatModal
          visible={chatModalVisible}
          onClose={() => setChatModalVisible(false)}
          leagueId={activeLeague.id}
          leagueName={activeLeague.name}
        />
      )}

      {/* Create Picks Modal for this League */}
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
            competitionName: activeLeague.competition?.name || 'LaLiga 26/27',
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
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  rulesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 157, 0.3)',
  },
  rulesPillText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 6,
  },
  leagueActionBar: {
    flexDirection: 'row',
    gap: 10,
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
    paddingHorizontal: 12,
  },
  actionPillHighlight: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  actionPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  actionBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnText: {
    color: COLORS.textInverse,
    fontWeight: '800',
    fontSize: 14,
  },
  pickCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  pickCardDead: {
    borderColor: 'rgba(255, 77, 77, 0.3)',
    backgroundColor: 'rgba(255, 77, 77, 0.03)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  pickBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  statusCircleAlive: {
    backgroundColor: COLORS.aliveBg,
  },
  statusCircleDead: {
    backgroundColor: COLORS.deadBg,
  },
  pickName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagAlive: {
    backgroundColor: COLORS.aliveBg,
  },
  tagDead: {
    backgroundColor: COLORS.deadBg,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tagTextAlive: {
    color: COLORS.alive,
  },
  tagTextDead: {
    color: COLORS.dead,
  },
  selectionBox: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  selectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  teamName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  matchVs: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  pendingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingText: {
    fontSize: 13,
    color: COLORS.warning,
    fontWeight: '600',
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 157, 0.3)',
  },
  selectBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    marginRight: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statItem: {
    flex: 1,
    backgroundColor: COLORS.surfaceElevated,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
});
