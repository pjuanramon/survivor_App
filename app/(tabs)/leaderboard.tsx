import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, ActivityIndicator, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Trophy, Skull, Lock, Eye, Table, LayoutList } from 'lucide-react-native';

interface Entry {
  id: string;
  player_id: string;
  entry_name: string;
  is_alive: boolean;
  total_points: number;
  total_gf: number;
  profiles: { username: string } | null;
}

interface Selection {
  entry_id: string;
  jornada: number;
  team_id: string;
  team: { name: string } | null;
}

interface Config {
  current_jornada: number;
  picks_open: boolean;
  picks_deadline?: string;
}

export default function LeaderboardScreen() {
  const [viewMode, setViewMode] = useState<'ranking' | 'matrix'>('ranking');
  const [leaderboard, setLeaderboard] = useState<Entry[]>([]);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [config, setConfig] = useState<Config>({ current_jornada: 1, picks_open: true });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      // 1. Fetch Config
      const { data: configData } = await supabase
        .from('sur_config')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      const activeJornada = configData?.current_jornada || 1;
      const defaultDeadline = '2026-08-15T17:30:00.000Z';
      setConfig({
        current_jornada: activeJornada,
        picks_open: configData ? configData.picks_open : true,
        picks_deadline: configData?.picks_deadline || defaultDeadline,
      });

      // 2. Fetch Leaderboard Entries
      const { data: entriesData, error: errEntries } = await supabase
        .from('sur_entries')
        .select(`
          id,
          player_id,
          entry_name,
          is_alive,
          total_points,
          total_gf,
          profiles:sur_profiles(username)
        `)
        .order('is_alive', { ascending: false })
        .order('total_points', { ascending: false })
        .order('total_gf', { ascending: false });

      if (!errEntries && entriesData) {
        setLeaderboard(entriesData as any);
      }

      // 3. Fetch All Selections for the Matrix
      const { data: selData } = await supabase
        .from('sur_selections')
        .select(`
          entry_id,
          jornada,
          team_id,
          team:sur_teams!team_id(name)
        `);

      setSelections(selData as any || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const isDeadlinePassed = config.picks_deadline ? new Date() > new Date(config.picks_deadline) : false;
  const isPicksRevealed = !config.picks_open || isDeadlinePassed;

  // Generate matchdays list for table columns (e.g. [1, 2, ... current_jornada])
  const matchdayColumns = Array.from({ length: Math.max(1, config.current_jornada) }, (_, i) => i + 1);

  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator color="#00FF9D" size="large" />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00FF9D" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Clasificación</Text>
            <Text style={styles.subtitle}>Survivor Football La Liga 26/27</Text>
          </View>

          {/* Toggle View Mode */}
          <View style={styles.toggleRow}>
            <TouchableOpacity 
              onPress={() => setViewMode('ranking')}
              style={[styles.toggleBtn, viewMode === 'ranking' && styles.toggleBtnActive]}
              activeOpacity={0.7}
            >
              <LayoutList size={16} color={viewMode === 'ranking' ? '#000000' : '#888888'} />
              <Text style={[styles.toggleBtnText, viewMode === 'ranking' && styles.toggleBtnTextActive]}>RANKING</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setViewMode('matrix')}
              style={[styles.toggleBtn, viewMode === 'matrix' && styles.toggleBtnActive]}
              activeOpacity={0.7}
            >
              <Table size={16} color={viewMode === 'matrix' ? '#000000' : '#888888'} />
              <Text style={[styles.toggleBtnText, viewMode === 'matrix' && styles.toggleBtnTextActive]}>TABLA PICKS</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* View Mode 1: RANKING CARDS */}
        {viewMode === 'ranking' && (
          leaderboard.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No hay registros de jugadores en la clasificación aún.</Text>
            </View>
          ) : (
            leaderboard.map((entry, index) => (
              <View 
                key={entry.id} 
                style={[styles.card, !entry.is_alive && styles.cardDead]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.userInfo}>
                    <View style={[styles.avatarCircle, entry.is_alive ? styles.avatarAlive : styles.avatarDead]}>
                      {entry.is_alive ? (
                        <Trophy size={18} color="#00FF9D" />
                      ) : (
                        <Skull size={18} color="#EF4444" />
                      )}
                    </View>
                    <View>
                      <Text style={styles.username}>{entry.profiles?.username || 'Usuario'}</Text>
                      <Text style={styles.entryName}>{entry.entry_name}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.rankInfo}>
                    <Text style={[styles.statusText, entry.is_alive ? styles.statusAlive : styles.statusDead]}>
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
          )
        )}

        {/* View Mode 2: MATRIX TABLE BY MATCHDAY */}
        {viewMode === 'matrix' && (
          <View style={styles.matrixContainer}>
            {/* Status Notice Banner */}
            <View style={[styles.matrixNotice, isPicksRevealed ? styles.noticePublic : styles.noticePrivate]}>
              {isPicksRevealed ? (
                <Eye size={18} color="#00FF9D" style={{ marginRight: 8 }} />
              ) : (
                <Lock size={18} color="#FBBF24" style={{ marginRight: 8 }} />
              )}
              <Text style={styles.matrixNoticeText}>
                {isPicksRevealed 
                  ? `🔓 Picks de la Jornada ${config.current_jornada} REVELADOS a todos los jugadores.`
                  : `🔒 Picks de la Jornada ${config.current_jornada} OCULTOS hasta el inicio del primer partido.`}
              </Text>
            </View>

            {/* Table */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={true}
              nestedScrollEnabled={true}
              contentContainerStyle={styles.matrixScrollContent}
            >
              <View>
                {/* Table Header Row */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableHeaderCell, styles.cellUserWidth]}>JUGADOR / PICK</Text>
                  {matchdayColumns.map(j => (
                    <Text key={j} style={[styles.tableHeaderCell, styles.cellJornadaWidth]}>
                      J{j} {j === config.current_jornada ? '★' : ''}
                    </Text>
                  ))}
                </View>

                {/* Table Body Rows */}
                {leaderboard.length === 0 ? (
                  <View style={styles.emptyTableBox}>
                    <Text style={styles.emptyText}>Sin registros de picks.</Text>
                  </View>
                ) : (
                  leaderboard.map((entry) => {
                    const isOwner = currentUserId === entry.player_id;

                    return (
                      <View key={entry.id} style={[styles.tableBodyRow, !entry.is_alive && styles.tableRowDead]}>
                        {/* User / Pick Cell */}
                        <View style={[styles.tableCell, styles.cellUserWidth, styles.cellUserFlex]}>
                          <View style={styles.userRowFlex}>
                            {!entry.is_alive && (
                              <Skull size={13} color="#EF4444" style={{ marginRight: 4 }} />
                            )}
                            <Text 
                              style={[styles.cellUsername, !entry.is_alive && styles.cellUsernameDead]} 
                              numberOfLines={1}
                            >
                              {entry.profiles?.username || 'Usuario'}
                            </Text>
                          </View>
                          <Text style={[styles.cellEntryName, !entry.is_alive && styles.cellEntryNameDead]}>
                            {entry.entry_name} {!entry.is_alive && '• RIP'}
                          </Text>
                        </View>

                        {/* Matchday Choice Cells */}
                        {matchdayColumns.map(j => {
                          const sel = selections.find(s => s.entry_id === entry.id && s.jornada === j);
                          const teamName = sel?.team?.name || null;
                          const isCurrentJornada = j === config.current_jornada;
                          const canViewCell = !isCurrentJornada || isPicksRevealed || isOwner;

                          return (
                            <View key={j} style={[styles.tableCell, styles.cellJornadaWidth]}>
                              {teamName ? (
                                canViewCell ? (
                                  <View style={[styles.teamPill, !entry.is_alive && styles.teamPillDead]}>
                                    <Text 
                                      style={[styles.teamPillText, !entry.is_alive && styles.teamPillTextDead]} 
                                      numberOfLines={1}
                                    >
                                      {teamName}
                                    </Text>
                                    {isCurrentJornada && isOwner && !isPicksRevealed && (
                                      <Text style={styles.yourPickSub}>TU PICK</Text>
                                    )}
                                  </View>
                                ) : (
                                  <View style={styles.hiddenPill}>
                                    <Lock size={12} color="#FBBF24" />
                                    <Text style={styles.hiddenText}>Oculto</Text>
                                  </View>
                                )
                              ) : (
                                <Text style={styles.emptyCellText}>—</Text>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    );
                  })
                )}
              </View>
            </ScrollView>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    maxWidth: 700,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    marginBottom: 20,
    marginTop: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
  },
  subtitle: {
    color: '#888888',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#262626',
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  toggleBtnActive: {
    backgroundColor: '#00FF9D',
  },
  toggleBtnText: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  toggleBtnTextActive: {
    color: '#000000',
  },
  emptyBox: {
    backgroundColor: '#161616',
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
  },
  emptyText: {
    color: '#888888',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#161616',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  cardDead: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    opacity: 0.65,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarAlive: {
    backgroundColor: 'rgba(0, 255, 157, 0.15)',
  },
  avatarDead: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  username: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  entryName: {
    color: '#888888',
    fontSize: 12,
  },
  rankInfo: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 18,
    fontWeight: '900',
  },
  statusAlive: {
    color: '#00FF9D',
  },
  statusDead: {
    color: '#EF4444',
  },
  rankNumber: {
    color: '#666666',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222222',
  },
  statLabel: {
    color: '#888888',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 2,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  /* Matrix Table Styles */
  matrixContainer: {
    marginTop: 4,
  },
  matrixScrollContent: {
    paddingRight: 32,
    minWidth: '100%',
  },
  matrixNotice: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  noticePublic: {
    backgroundColor: 'rgba(0, 255, 157, 0.1)',
    borderColor: 'rgba(0, 255, 157, 0.3)',
  },
  noticePrivate: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  matrixNoticeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#262626',
  },
  tableHeaderCell: {
    color: '#00FF9D',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  tableBodyRow: {
    flexDirection: 'row',
    backgroundColor: '#121212',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#222222',
    alignItems: 'center',
  },
  tableRowDead: {
    backgroundColor: '#181112',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  tableCell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cellUserWidth: {
    width: 155,
    alignItems: 'flex-start',
    paddingLeft: 8,
  },
  cellUserFlex: {
    justifyContent: 'center',
  },
  userRowFlex: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cellJornadaWidth: {
    width: 130,
  },
  cellUsername: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  cellUsernameDead: {
    color: '#EF4444',
    textDecorationLine: 'line-through',
    fontWeight: '800',
  },
  cellEntryName: {
    color: '#888888',
    fontSize: 11,
  },
  cellEntryNameDead: {
    color: '#F87171',
    textDecorationLine: 'line-through',
  },
  teamPill: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  teamPillDead: {
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  teamPillText: {
    color: '#00FF9D',
    fontSize: 12,
    fontWeight: '800',
  },
  teamPillTextDead: {
    color: '#F87171',
    textDecorationLine: 'line-through',
  },
  yourPickSub: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    marginTop: 2,
  },
  hiddenPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: '100%',
  },
  hiddenText: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCellText: {
    color: '#444444',
    fontSize: 14,
  },
  emptyTableBox: {
    padding: 24,
    alignItems: 'center',
  },
});
