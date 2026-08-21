import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { supabase } from '../../lib/supabase';
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
              {activeLeague?.name || 'Futvivor'} • Jornada {config.current_jornada}
            </Text>
          </View>
        </View>

        {/* League Selector Bar */}
        <LeagueSelector
          onCreateOrJoinPress={() => setCreateModalVisible(true)}
        />

        {/* MATRIX TABLE VIEW WITH FIXED FIRST 2 COLUMNS */}
        {leaderboard.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              No hay registros de jugadores en la clasificación aún.
            </Text>
          </View>
        ) : (
          <View style={styles.matrixCard}>
            <View style={styles.tableFlexRow}>
              {/* ======================================================== */}
              {/* 1. FIXED LEFT COLUMNS (JUGADOR & VIDA)                   */}
              {/* ======================================================== */}
              <View style={styles.fixedSideContainer}>
                {/* Header Fixed */}
                <View style={styles.tableHeaderRowFixed}>
                  <Text style={[styles.thCell, styles.thPlayer]}>JUGADOR</Text>
                  <Text style={[styles.thCell, styles.thPickName]}>VIDA</Text>
                </View>

                {/* Rows Fixed */}
                {leaderboard.map((entry, idx) => {
                  const isCurrentUser = currentUserId === entry.player_id;
                  const isAlt = idx % 2 === 1;

                  return (
                    <View
                      key={entry.id}
                      style={[
                        styles.tableRowFixed,
                        isAlt && styles.tableRowAlt,
                        !entry.is_alive && styles.tableRowDead,
                      ]}
                    >
                      {/* Player Username */}
                      <View style={[styles.tdCell, styles.thPlayer, styles.playerTd]}>
                        <Text
                          style={[
                            styles.tdText,
                            isCurrentUser && styles.currentUserHighlight,
                            !entry.is_alive && styles.tdTextDead,
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
                          {entry.is_alive ? '●' : '❌'}
                        </Text>
                      </View>

                      {/* Entry / Vida Name */}
                      <View style={[styles.tdCell, styles.thPickName]}>
                        <Text
                          style={[
                            styles.tdSubText,
                            !entry.is_alive && styles.tdTextDead,
                          ]}
                          numberOfLines={1}
                        >
                          {entry.entry_name}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* ======================================================== */}
              {/* 2. SCROLLABLE RIGHT COLUMNS (PTS, GF, JORNADA 1, 2...)   */}
              {/* ======================================================== */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                style={styles.scrollableSideContainer}
              >
                <View>
                  {/* Header Scrollable */}
                  <View style={styles.tableHeaderRowScrollable}>
                    <Text style={[styles.thCell, styles.thPts]}>PTS</Text>
                    <Text style={[styles.thCell, styles.thGf]}>GF</Text>
                    {matchdayColumns.map((j) => (
                      <Text key={j} style={[styles.thCell, styles.thJornada]}>
                        JORNADA {j}
                      </Text>
                    ))}
                  </View>

                  {/* Rows Scrollable */}
                  {leaderboard.map((entry, idx) => {
                    const isCurrentUser = currentUserId === entry.player_id;
                    const isAlt = idx % 2 === 1;

                    return (
                      <View
                        key={entry.id}
                        style={[
                          styles.tableRowScrollable,
                          isAlt && styles.tableRowAlt,
                          !entry.is_alive && styles.tableRowDead,
                        ]}
                      >
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
                              ) : (
                                <View
                                  style={[
                                    styles.teamBadge,
                                    isCurrentJornada &&
                                      isCurrentUser &&
                                      styles.userPickBadge,
                                    !entry.is_alive && styles.teamBadgeDead,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.teamPickText,
                                      isCurrentJornada &&
                                        isCurrentUser &&
                                        styles.userPickText,
                                      !entry.is_alive && styles.teamPickTextDead,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {sel.team?.name || 'Selección'}
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

const ROW_HEIGHT = 48;
const HEADER_HEIGHT = 40;

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
    padding: 16,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  matrixCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
    marginTop: 8,
  },
  tableFlexRow: {
    flexDirection: 'row',
  },
  // Fixed side (Jugador + Vida)
  fixedSideContainer: {
    backgroundColor: COLORS.surface,
    borderRightWidth: 1.5,
    borderRightColor: COLORS.surfaceBorder,
    zIndex: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  tableHeaderRowFixed: {
    flexDirection: 'row',
    alignItems: 'center',
    height: HEADER_HEIGHT,
    backgroundColor: COLORS.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
    paddingHorizontal: 8,
  },
  tableRowFixed: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ROW_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
    paddingHorizontal: 8,
  },
  // Scrollable side (PTS, GF, Jornadas)
  scrollableSideContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  tableHeaderRowScrollable: {
    flexDirection: 'row',
    alignItems: 'center',
    height: HEADER_HEIGHT,
    backgroundColor: COLORS.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
    paddingHorizontal: 6,
  },
  tableRowScrollable: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ROW_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
    paddingHorizontal: 6,
  },
  tableRowAlt: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  tableRowDead: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  // Cell styling
  thCell: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  thPlayer: {
    width: 112,
    paddingLeft: 2,
  },
  thPickName: {
    width: 72,
  },
  thPts: {
    width: 44,
    textAlign: 'center',
  },
  thGf: {
    width: 40,
    textAlign: 'center',
  },
  thJornada: {
    width: 145,
    minWidth: 145,
    textAlign: 'center',
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
    flexShrink: 1,
  },
  tdTextDead: {
    color: '#EF4444',
    textDecorationLine: 'line-through',
    textDecorationColor: '#EF4444',
    opacity: 0.85,
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
    fontSize: 10,
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
  teamBadge: {
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    minWidth: 128,
    alignItems: 'center',
  },
  teamBadgeDead: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  teamPickText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  teamPickTextDead: {
    color: '#F87171',
    textDecorationLine: 'line-through',
    textDecorationColor: '#EF4444',
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
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginTop: 10,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});
