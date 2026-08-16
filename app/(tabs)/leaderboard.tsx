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
import { Trophy, Skull, Lock, Eye, Table, LayoutList } from 'lucide-react-native';
import { COLORS } from '../../constants/colors';
import { LeagueSelector } from '../../components/leagues/LeagueSelector';
import { CreateLeagueModal } from '../../components/leagues/CreateLeagueModal';
import { useAppStore } from '../../lib/store';
import { useMatchday } from '../../hooks/useMatchday';

interface Entry {
  id: string;
  player_id: string;
  entry_name: string;
  is_alive: boolean;
  total_points: number;
  total_gf: number;
  league_id?: string;
  profiles: { username: string } | null;
}

interface Selection {
  entry_id: string;
  jornada: number;
  team_id: string;
  team: { name: string } | null;
}

export default function LeaderboardScreen() {
  const [viewMode, setViewMode] = useState<'ranking' | 'matrix'>('ranking');
  const [leaderboard, setLeaderboard] = useState<Entry[]>([]);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const { activeLeague } = useAppStore();
  const { config } = useMatchday(activeLeague?.competition_id);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      // Fetch Leaderboard Entries (filtered by active league if present)
      let entriesQuery = supabase
        .from('sur_entries')
        .select(`
          id,
          player_id,
          entry_name,
          is_alive,
          total_points,
          total_gf,
          league_id,
          profiles:sur_profiles(username)
        `)
        .order('is_alive', { ascending: false })
        .order('total_points', { ascending: false })
        .order('total_gf', { ascending: false });

      if (activeLeague?.id) {
        entriesQuery = entriesQuery.or(
          `league_id.eq.${activeLeague.id},league_id.is.null`
        );
      }

      const { data: entriesData, error: errEntries } = await entriesQuery;

      if (!errEntries && entriesData) {
        setLeaderboard(entriesData as any);
      }

      // Fetch All Selections for the Matrix
      const { data: selData } = await supabase
        .from('sur_selections')
        .select(`
          entry_id,
          jornada,
          team_id,
          team:sur_teams!team_id(name)
        `);

      setSelections((selData as any) || []);
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeLeague]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const isDeadlinePassed = config.picks_deadline
    ? new Date() > new Date(config.picks_deadline)
    : true;
  const isPicksRevealed = true; // Picks are open & revealed for live match tracking

  // Generate matchdays list for table columns
  const matchdayColumns = Array.from(
    { length: Math.max(1, config.current_jornada) },
    (_, i) => i + 1
  );

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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Clasificación</Text>
            <Text style={styles.subtitle}>
              {activeLeague?.name || 'Futvivor'} • J{config.current_jornada}
            </Text>
          </View>

          {/* Toggle View Mode */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              onPress={() => setViewMode('ranking')}
              style={[
                styles.toggleBtn,
                viewMode === 'ranking' && styles.toggleBtnActive,
              ]}
              activeOpacity={0.7}
            >
              <LayoutList
                size={16}
                color={
                  viewMode === 'ranking'
                    ? COLORS.textInverse
                    : COLORS.textSecondary
                }
              />
              <Text
                style={[
                  styles.toggleBtnText,
                  viewMode === 'ranking' && styles.toggleBtnTextActive,
                ]}
              >
                RANKING
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setViewMode('matrix')}
              style={[
                styles.toggleBtn,
                viewMode === 'matrix' && styles.toggleBtnActive,
              ]}
              activeOpacity={0.7}
            >
              <Table
                size={16}
                color={
                  viewMode === 'matrix'
                    ? COLORS.textInverse
                    : COLORS.textSecondary
                }
              />
              <Text
                style={[
                  styles.toggleBtnText,
                  viewMode === 'matrix' && styles.toggleBtnTextActive,
                ]}
              >
                TABLA
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* League Selector Bar */}
        <LeagueSelector
          onCreateOrJoinPress={() => setCreateModalVisible(true)}
        />

        {/* View Mode 1: RANKING CARDS */}
        {viewMode === 'ranking' &&
          (leaderboard.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                No hay registros de jugadores en la clasificación aún.
              </Text>
            </View>
          ) : (
            leaderboard.map((entry, index) => (
              <View
                key={entry.id}
                style={[styles.card, !entry.is_alive && styles.cardDead]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.userInfo}>
                    <View
                      style={[
                        styles.avatarCircle,
                        entry.is_alive
                          ? styles.avatarAlive
                          : styles.avatarDead,
                      ]}
                    >
                      {entry.is_alive ? (
                        <Trophy size={18} color={COLORS.alive} />
                      ) : (
                        <Skull size={18} color={COLORS.dead} />
                      )}
                    </View>
                    <View>
                      <Text style={styles.username}>
                        {entry.profiles?.username || 'Usuario'}
                      </Text>
                      <Text style={styles.entryName}>{entry.entry_name}</Text>
                    </View>
                  </View>

                  <View style={styles.rankInfo}>
                    <Text
                      style={[
                        styles.statusText,
                        entry.is_alive
                          ? styles.statusAlive
                          : styles.statusDead,
                      ]}
                    >
                      {entry.is_alive ? 'VIVO' : 'RIP'}
                    </Text>
                    <Text style={styles.rankNumber}>#{index + 1}</Text>
                  </View>
                </View>

                {/* Bento Stats */}
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>PUNTOS</Text>
                    <Text style={styles.statValue}>{entry.total_points}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>GOLES A FAVOR</Text>
                    <Text style={styles.statValue}>{entry.total_gf}</Text>
                  </View>
                </View>
              </View>
            ))
          ))}

        {/* View Mode 2: MATRIX TABLE VIEW */}
        {viewMode === 'matrix' && (
          <View style={styles.matrixContainer}>
            {/* Secrecy Warning Banner */}
            {!isPicksRevealed && (
              <View style={styles.secrecyBanner}>
                <Lock size={14} color={COLORS.warning} style={{ marginRight: 6 }} />
                <Text style={styles.secrecyText}>
                  Modo Secreto activo en la J{config.current_jornada}. Los picks
                  de tus rivales se revelarán al inicio del primer partido.
                </Text>
              </View>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View>
                {/* Table Header */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.thCell, styles.thPlayer]}>JUGADOR</Text>
                  <Text style={[styles.thCell, styles.thPickName]}>VIDA</Text>
                  <Text style={[styles.thCell, styles.thPts]}>PTS</Text>
                  <Text style={[styles.thCell, styles.thGf]}>GF</Text>
                  {matchdayColumns.map((j) => (
                    <Text key={j} style={[styles.thCell, styles.thJornada]}>
                      J{j}
                    </Text>
                  ))}
                </View>

                {/* Table Rows */}
                {leaderboard.map((entry, idx) => {
                  const isCurrentUser = currentUserId === entry.player_id;

                  return (
                    <View
                      key={entry.id}
                      style={[
                        styles.tableRow,
                        idx % 2 === 1 && styles.tableRowAlt,
                        !entry.is_alive && styles.tableRowDead,
                      ]}
                    >
                      {/* Player Username */}
                      <View style={[styles.tdCell, styles.thPlayer, styles.playerTd]}>
                        <Text
                          style={[
                            styles.tdText,
                            isCurrentUser && styles.currentUserHighlight,
                          ]}
                          numberOfLines={1}
                        >
                          {entry.profiles?.username || 'Usuario'}
                        </Text>
                        <Text
                          style={[
                            styles.aliveDot,
                            entry.is_alive ? styles.dotAlive : styles.dotDead,
                          ]}
                        >
                          {entry.is_alive ? '●' : '💀'}
                        </Text>
                      </View>

                      {/* Entry Name */}
                      <View style={[styles.tdCell, styles.thPickName]}>
                        <Text style={styles.tdSubText} numberOfLines={1}>
                          {entry.entry_name}
                        </Text>
                      </View>

                      {/* Points */}
                      <View style={[styles.tdCell, styles.thPts]}>
                        <Text style={styles.tdTextBold}>
                          {entry.total_points}
                        </Text>
                      </View>

                      {/* GF */}
                      <View style={[styles.tdCell, styles.thGf]}>
                        <Text style={styles.tdText}>{entry.total_gf}</Text>
                      </View>

                      {/* Matchday Columns */}
                      {matchdayColumns.map((j) => {
                        const sel = selections.find(
                          (s) => s.entry_id === entry.id && s.jornada === j
                        );
                        const isCurrentJornada = j === config.current_jornada;
                        const isHidden =
                          isCurrentJornada && !isPicksRevealed && !isCurrentUser;

                        return (
                          <View
                            key={j}
                            style={[
                              styles.tdCell,
                              styles.thJornada,
                              styles.jornadaCell,
                            ]}
                          >
                            {!sel ? (
                              <Text style={styles.emptyDash}>-</Text>
                            ) : isHidden ? (
                              <View style={styles.hiddenPickBadge}>
                                <Lock size={10} color={COLORS.warning} />
                                <Text style={styles.hiddenPickText}>Oculto</Text>
                              </View>
                            ) : (
                              <View
                                style={[
                                  styles.teamBadge,
                                  isCurrentJornada &&
                                    isCurrentUser &&
                                    styles.userPickBadge,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.teamPickText,
                                    isCurrentJornada &&
                                      isCurrentUser &&
                                      styles.userPickText,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {sel.team?.name || 'Sel'}
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Create League Modal */}
      <CreateLeagueModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
      />
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
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.primary,
  },
  toggleBtnText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 4,
  },
  toggleBtnTextActive: {
    color: COLORS.textInverse,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  cardDead: {
    borderColor: 'rgba(255, 77, 77, 0.25)',
    backgroundColor: 'rgba(255, 77, 77, 0.02)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarAlive: {
    backgroundColor: COLORS.aliveBg,
  },
  avatarDead: {
    backgroundColor: COLORS.deadBg,
  },
  username: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  entryName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rankInfo: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  statusAlive: {
    color: COLORS.alive,
  },
  statusDead: {
    color: COLORS.dead,
  },
  rankNumber: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
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
  matrixContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
    marginTop: 4,
  },
  secrecyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 184, 0, 0.2)',
  },
  secrecyText: {
    color: COLORS.warning,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  thCell: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  thPlayer: {
    width: 110,
    paddingLeft: 4,
  },
  thPickName: {
    width: 75,
  },
  thPts: {
    width: 40,
    textAlign: 'center',
  },
  thGf: {
    width: 35,
    textAlign: 'center',
  },
  thJornada: {
    width: 85,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  tableRowAlt: {
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
  },
  tableRowDead: {
    opacity: 0.55,
  },
  tdCell: {
    justifyContent: 'center',
  },
  playerTd: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  tdText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  tdTextBold: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '800',
    textAlign: 'center',
  },
  tdSubText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  currentUserHighlight: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  aliveDot: {
    marginLeft: 4,
    fontSize: 11,
  },
  dotAlive: {
    color: COLORS.alive,
  },
  dotDead: {
    color: COLORS.dead,
  },
  jornadaCell: {
    alignItems: 'center',
  },
  emptyDash: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  hiddenPickBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 184, 0, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.3)',
  },
  hiddenPickText: {
    color: COLORS.warning,
    fontSize: 9,
    fontWeight: '800',
    marginLeft: 3,
  },
  teamBadge: {
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    maxWidth: 75,
  },
  teamPickText: {
    color: COLORS.textPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  userPickBadge: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  userPickText: {
    color: COLORS.primary,
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});
