import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../constants/colors';
import { COUNTRY_FLAGS, isEuroSurvivorLeague } from '../../constants/competitions';
import { LeagueSelector } from '../../components/leagues/LeagueSelector';
import { CreateLeagueModal } from '../../components/leagues/CreateLeagueModal';
import { useAppStore } from '../../lib/store';
import { useMatchday } from '../../hooks/useMatchday';
import { useAuth } from '../../hooks/useAuth';
import { useRounds, isVirtualRoundId } from '../../hooks/useRounds';
import { SeasonStandingRow } from '../../types/database';

interface LeaderboardEntry {
  id: string;
  player_id: string;
  round_id?: string | null;
  entry_name: string;
  is_alive: boolean;
  yellow_cards?: number;
  total_points: number;
  total_gf: number;
  league_id?: string;
  profiles: { username: string } | null;
}

interface SafeSelection {
  entry_id: string;
  jornada: number;
  slot: string;
  team_id: string | null;
  team_name: string | null;
  team_country?: string | null;
  is_auto_assigned?: boolean;
  is_hidden?: boolean;
  created_at?: string;
}

export default function LeaderboardScreen() {
  const [viewMode, setViewMode] = useState<'round' | 'season'>('round');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [seasonStandings, setSeasonStandings] = useState<SeasonStandingRow[]>([]);
  const [selections, setSelections] = useState<SafeSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const { user } = useAuth();
  const currentUserId = user?.id;

  const { activeLeague } = useAppStore();
  const { config } = useMatchday(activeLeague?.competition_id);
  const { rounds, activeRound, setActiveRound } = useRounds(activeLeague);

  const isEuroDouble = isEuroSurvivorLeague(activeLeague, activeRound?.game_mode);
  const rowHeight = isEuroDouble ? 62 : 48;

  const isDeadlinePassed = config.picks_deadline
    ? new Date() >= new Date(config.picks_deadline)
    : false;
  const isPicksEffectivelyOpen = config.picks_open && !isDeadlinePassed;

  const fetchData = useCallback(async () => {
    if (!activeLeague?.id) {
      setLeaderboard([]);
      setSelections([]);
      setSeasonStandings([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setLoading(true);

      // 1. Traer TODAS las entradas de esta liga (sirve para Ranking General y filtramos Ronda Actual)
      const { data: allLeagueEntries, error: errEntries } = await supabase
        .from('sur_entries')
        .select(`
          id,
          player_id,
          round_id,
          entry_name,
          is_alive,
          yellow_cards,
          total_points,
          total_gf,
          league_id,
          profiles:sur_profiles(username)
        `)
        .eq('league_id', activeLeague.id)
        .order('is_alive', { ascending: false })
        .order('total_points', { ascending: false })
        .order('total_gf', { ascending: false });

      const entriesList: LeaderboardEntry[] = (!errEntries && allLeagueEntries ? allLeagueEntries : []) as any;

      // Filtrar entradas de la ronda seleccionada
      const roundEntries =
        activeRound?.id && !isVirtualRoundId(activeRound.id)
          ? entriesList.filter((e) => !e.round_id || e.round_id === activeRound.id)
          : entriesList;

      setLeaderboard(roundEntries);

      // Calcular Ranking General Anual del grupo agregando todas las rondas de la liga
      const finishedWinnerEntryIds = new Set(
        rounds
          .filter((r) => r.status === 'finished' && r.winner_entry_id)
          .map((r) => r.winner_entry_id as string)
      );

      const playerMap = new Map<string, SeasonStandingRow & { roundsSet: Set<string> }>();
      entriesList.forEach((e) => {
        const pid = e.player_id;
        const uname = e.profiles?.username || 'Jugador';
        if (!playerMap.has(pid)) {
          playerMap.set(pid, {
            player_id: pid,
            username: uname,
            rounds_played: 0,
            round_titles: 0,
            total_points: 0,
            total_gf: 0,
            alive_entries: 0,
            roundsSet: new Set(),
          });
        }
        const agg = playerMap.get(pid)!;
        agg.total_points += e.total_points || 0;
        agg.total_gf += e.total_gf || 0;
        if (e.is_alive) agg.alive_entries += 1;
        if (finishedWinnerEntryIds.has(e.id)) agg.round_titles += 1;
        agg.roundsSet.add(e.round_id || 'round-1');
      });

      const computedSeason = Array.from(playerMap.values())
        .map(({ roundsSet, ...rest }) => ({
          ...rest,
          rounds_played: roundsSet.size,
        }))
        .sort(
          (a, b) =>
            b.round_titles - a.round_titles ||
            b.total_points - a.total_points ||
            b.total_gf - a.total_gf
        );

      setSeasonStandings(computedSeason);

      // 2. Traer Selecciones de la Ronda de forma ESCALABLE y ANTI-CHEAT
      if (roundEntries.length === 0) {
        setSelections([]);
        return;
      }

      const targetRoundParam =
        activeRound?.id && !isVirtualRoundId(activeRound.id) ? activeRound.id : null;

      const { data: rpcSelections, error: rpcErr } = await supabase.rpc(
        'get_round_selections_safe',
        {
          p_league_id: activeLeague.id,
          p_round_id: targetRoundParam,
          p_viewer_id: currentUserId || null,
        }
      );

      if (!rpcErr && rpcSelections) {
        setSelections(rpcSelections as SafeSelection[]);
      } else {
        // Fallback filtrado únicamente por los entryIds de esta sala (¡nunca descarga toda la BD!)
        const entryIds = roundEntries.map((e) => e.id);
        const { data: selData } = await supabase
          .from('sur_selections')
          .select(`
            *,
            team:sur_teams!team_id(
              name,
              competition:sur_competitions!competition_id(country)
            )
          `)
          .in('entry_id', entryIds);

        const mappedFallback: SafeSelection[] = ((selData as any) || []).map((s: any) => ({
          entry_id: s.entry_id,
          jornada: s.jornada,
          slot: s.slot || 'home',
          team_id: s.team_id,
          team_name: s.team?.name || 'Selección',
          team_country: s.team?.competition?.country || 'ES',
          is_auto_assigned: s.is_auto_assigned,
          created_at: s.created_at,
        }));
        setSelections(mappedFallback);
      }
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeLeague?.id, activeRound?.id, currentUserId, rounds]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const startJornada = activeRound?.start_jornada || activeLeague?.start_jornada || 1;
  const targetJornada = !config.picks_open ? config.current_jornada + 1 : config.current_jornada;
  const maxJornadasToShow = Math.max(startJornada, config.current_jornada, targetJornada);
  const matchdayColumns = Array.from(
    { length: Math.max(1, maxJornadasToShow - startJornada + 1) },
    (_, i) => startJornada + i
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
              {activeLeague?.name || 'Futvivor'} • {activeRound?.name || 'Ronda 1'} • J{config.current_jornada}
            </Text>
          </View>
        </View>

        {/* League Selector */}
        <LeagueSelector
          onCreateOrJoinPress={() => setCreateModalVisible(true)}
        />

        {/* Conmutador Ronda Actual vs Ranking General del Grupo */}
        <View style={styles.modeSwitchRow}>
          <TouchableOpacity
            onPress={() => setViewMode('round')}
            style={[styles.modeBtn, viewMode === 'round' && styles.modeBtnActive]}
          >
            <Text style={[styles.modeBtnText, viewMode === 'round' && styles.modeBtnTextActive]}>
              ⚡ Ronda Actual
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode('season')}
            style={[styles.modeBtn, viewMode === 'season' && styles.modeBtnActive]}
          >
            <Text style={[styles.modeBtnText, viewMode === 'season' && styles.modeBtnTextActive]}>
              🏆 General Anual
            </Text>
          </TouchableOpacity>
        </View>

        {/* Selector de Rondas Históricas si hay varias */}
        {viewMode === 'round' && rounds.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roundsBar}>
            {rounds.map((r) => {
              const selected = activeRound?.id === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => setActiveRound(r)}
                  style={[styles.roundChip, selected && styles.roundChipActive]}
                >
                  <Text style={[styles.roundChipText, selected && styles.roundChipTextActive]}>
                    {r.name} {r.status === 'finished' ? '🏁' : '🟢'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {viewMode === 'season' ? (
          /* ============================================================== */
          /* VISTA RANKING GENERAL ANUAL (ACUMULADO DE TODAS LAS RONDAS)    */
          /* ============================================================== */
          seasonStandings.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Aún no hay puntuaciones registradas en este grupo.</Text>
            </View>
          ) : (
            <View style={styles.seasonCard}>
              <View style={styles.seasonHeader}>
                <Text style={[styles.thCell, { width: 34 }]}>#</Text>
                <Text style={[styles.thCell, { flex: 1 }]}>JUGADOR</Text>
                <Text style={[styles.thCell, { width: 54, textAlign: 'center' }]}>🏆</Text>
                <Text style={[styles.thCell, { width: 54, textAlign: 'center' }]}>PTS</Text>
                <Text style={[styles.thCell, { width: 46, textAlign: 'center' }]}>GF</Text>
              </View>
              {seasonStandings.map((row, idx) => {
                const isMe = row.player_id === currentUserId;
                return (
                  <View key={row.player_id} style={[styles.seasonRow, idx % 2 === 1 && styles.tableRowAlt]}>
                    <Text style={[styles.rankNum, idx === 0 && { color: '#FBBF24' }]}>
                      {idx + 1}º
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tdText, isMe && styles.currentUserHighlight]} numberOfLines={1}>
                        {row.username}
                      </Text>
                      <Text style={styles.seasonMeta}>
                        {row.rounds_played} {row.rounds_played === 1 ? 'ronda' : 'rondas'} • {row.alive_entries} vivas
                      </Text>
                    </View>
                    <Text style={[styles.tdTextBold, { width: 54, color: '#FBBF24' }]}>
                      {row.round_titles}
                    </Text>
                    <Text style={[styles.tdTextBold, { width: 54 }]}>
                      {row.total_points}
                    </Text>
                    <Text style={[styles.tdText, { width: 46, textAlign: 'center' }]}>
                      {row.total_gf}
                    </Text>
                  </View>
                );
              })}
            </View>
          )
        ) : (
          /* ============================================================== */
          /* VISTA MATRIZ DE SUPERVIVENCIA (RONDA ACTUAL)                   */
          /* ============================================================== */
          <>
            {isPicksEffectivelyOpen ? (
              <View style={styles.privacyBanner}>
                <Text style={styles.privacyBannerIcon}>🔒</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.privacyBannerTitle}>
                    Picks Protegidos en Servidor (Jornada {config.current_jornada})
                  </Text>
                  <Text style={styles.privacyBannerSub}>
                    Las selecciones rivales son secretas y se revelan automáticamente al cierre del plazo.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={[styles.privacyBanner, styles.privacyBannerOpen]}>
                <Text style={styles.privacyBannerIcon}>🔓</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.privacyBannerTitle, { color: COLORS.primary }]}>
                    Jornada {config.current_jornada} en Juego
                  </Text>
                  <Text style={styles.privacyBannerSub}>
                    Plazo cerrado: todos los tickets de la jornada son públicos.
                  </Text>
                </View>
              </View>
            )}

            {leaderboard.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  No hay vidas registradas en esta ronda aún.
                </Text>
              </View>
            ) : (
              <View style={styles.matrixCard}>
                <View style={styles.tableFlexRow}>
                  {/* 1. FIXED LEFT COLUMNS */}
                  <View style={styles.fixedSideContainer}>
                    <View style={styles.tableHeaderRowFixed}>
                      <Text style={[styles.thCell, styles.thPlayer]}>JUGADOR</Text>
                      <Text style={[styles.thCell, styles.thPickName]}>VIDA</Text>
                    </View>

                    {leaderboard.map((entry, idx) => {
                      const isCurrentUser = currentUserId === entry.player_id;
                      const isAlt = idx % 2 === 1;

                      return (
                        <View
                          key={entry.id}
                          style={[
                            styles.tableRowFixed,
                            { height: rowHeight },
                            isAlt && styles.tableRowAlt,
                            !entry.is_alive && styles.tableRowDead,
                          ]}
                        >
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
                              {entry.is_alive ? '●' : '🟥'}
                            </Text>
                          </View>

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

                  {/* 2. SCROLLABLE RIGHT COLUMNS (PTS, GF, 🟨, JORNADAS) */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={true}
                    style={styles.scrollableSideContainer}
                  >
                    <View>
                      <View style={styles.tableHeaderRowScrollable}>
                        <Text style={[styles.thCell, styles.thPts]}>PTS</Text>
                        <Text style={[styles.thCell, styles.thGf]}>GF</Text>
                        <Text style={[styles.thCell, styles.thYellow]}>🟨</Text>
                        {matchdayColumns.map((j) => (
                          <Text key={j} style={[styles.thCell, styles.thJornada]}>
                            JORNADA {j}
                          </Text>
                        ))}
                      </View>

                      {leaderboard.map((entry, idx) => {
                        const isCurrentUser = currentUserId === entry.player_id;
                        const isAlt = idx % 2 === 1;
                        const yCards = entry.yellow_cards || 0;

                        return (
                          <View
                            key={entry.id}
                            style={[
                              styles.tableRowScrollable,
                              { height: rowHeight },
                              isAlt && styles.tableRowAlt,
                              !entry.is_alive && styles.tableRowDead,
                            ]}
                          >
                            <View style={[styles.tdCell, styles.thPts]}>
                              <Text style={styles.tdTextBold}>{entry.total_points}</Text>
                            </View>

                            <View style={[styles.tdCell, styles.thGf]}>
                              <Text style={[styles.tdText, { textAlign: 'center' }]}>{entry.total_gf}</Text>
                            </View>

                            <View style={[styles.tdCell, styles.thYellow]}>
                              <Text
                                style={[
                                  styles.yellowCountText,
                                  yCards === 1 && { color: '#FBBF24' },
                                  yCards >= 2 && { color: '#EF4444' },
                                ]}
                              >
                                {yCards > 0 ? `${yCards}` : '-'}
                              </Text>
                            </View>

                            {matchdayColumns.map((j) => {
                              const cellSels = selections.filter(
                                (s) => s.entry_id === entry.id && s.jornada === j
                              );
                              const isFutureOrOpen =
                                j > config.current_jornada ||
                                (j === config.current_jornada && isPicksEffectivelyOpen);
                              const shouldMask =
                                cellSels.some((s) => s.is_hidden) || (isFutureOrOpen && !isCurrentUser);

                              return (
                                <View
                                  key={j}
                                  style={[styles.tdCell, styles.thJornada, styles.jornadaCell]}
                                >
                                  {cellSels.length === 0 ? (
                                    <Text style={styles.emptyDash}>-</Text>
                                  ) : shouldMask ? (
                                    <View style={[styles.teamBadge, styles.secretBadge]}>
                                      <Text style={styles.secretText}>
                                        🔒 {isEuroDouble ? `${cellSels.length}/2 Sellado` : 'Oculto'}
                                      </Text>
                                    </View>
                                  ) : (
                                    <View style={{ gap: 3, alignItems: 'center' }}>
                                      {cellSels.map((sel, sIdx) => {
                                        const flag =
                                          COUNTRY_FLAGS[sel.team_country || (sel.slot === 'euro' ? 'EU' : 'ES')] ||
                                          '⚽';
                                        const isAuto =
                                          !!sel.is_auto_assigned ||
                                          !!(
                                            sel.created_at &&
                                            config.picks_deadline &&
                                            new Date(sel.created_at) > new Date(config.picks_deadline)
                                          );

                                        return (
                                          <View
                                            key={`${j}-${sel.slot}-${sIdx}`}
                                            style={[
                                              styles.teamBadge,
                                              isEuroDouble && styles.teamBadgeCompact,
                                              j === config.current_jornada &&
                                                isCurrentUser &&
                                                styles.userPickBadge,
                                              !entry.is_alive && styles.teamBadgeDead,
                                              isAuto && styles.teamBadgeAuto,
                                            ]}
                                          >
                                            <Text
                                              style={[
                                                styles.teamPickText,
                                                j === config.current_jornada &&
                                                  isCurrentUser &&
                                                  styles.userPickText,
                                                !entry.is_alive && styles.teamPickTextDead,
                                                isAuto && styles.teamPickTextAuto,
                                              ]}
                                              numberOfLines={1}
                                            >
                                              {isEuroDouble ? `${flag} ` : ''}
                                              {sel.team_name || 'Pick'}
                                              {isAuto ? ' ⚠️' : ''}
                                            </Text>
                                          </View>
                                        );
                                      })}
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
          </>
        )}

        <View style={styles.legendRow}>
          <Text style={styles.legendText}>
            🟨 <Text style={{ fontWeight: '800', color: '#FBBF24' }}>Tarjetas Amarillas:</Text> Cada empate suma +1 pto y 1 amarilla. Al acumular 2 amarillas la vida recibe Roja (eliminada).
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <CreateLeagueModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
      />
    </SafeAreaView>
  );
}

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
    maxWidth: 740,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 25,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  modeSwitchRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: 4,
    marginBottom: 10,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: COLORS.primary,
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  modeBtnTextActive: {
    color: COLORS.textInverse,
  },
  roundsBar: {
    marginBottom: 8,
  },
  roundChip: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  roundChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryMuted,
  },
  roundChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  roundChipTextActive: {
    color: COLORS.primary,
  },
  seasonCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
    marginTop: 6,
  },
  seasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    height: HEADER_HEIGHT,
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  seasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  rankNum: {
    width: 34,
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.textSecondary,
  },
  seasonMeta: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  matrixCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
    marginTop: 6,
  },
  tableFlexRow: {
    flexDirection: 'row',
  },
  fixedSideContainer: {
    backgroundColor: COLORS.surface,
    borderRightWidth: 1.5,
    borderRightColor: COLORS.surfaceBorder,
    zIndex: 10,
    elevation: 4,
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
    paddingHorizontal: 8,
  },
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
    width: 66,
  },
  thPts: {
    width: 42,
    textAlign: 'center',
  },
  thGf: {
    width: 38,
    textAlign: 'center',
  },
  thYellow: {
    width: 34,
    textAlign: 'center',
  },
  thJornada: {
    width: 156,
    minWidth: 156,
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
    opacity: 0.85,
  },
  tdTextBold: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '800',
    textAlign: 'center',
  },
  yellowCountText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textMuted,
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
    minWidth: 136,
    alignItems: 'center',
  },
  teamBadgeCompact: {
    paddingVertical: 3,
    borderRadius: 6,
  },
  teamBadgeDead: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  teamPickText: {
    color: COLORS.textPrimary,
    fontSize: 10.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  teamPickTextDead: {
    color: '#F87171',
    textDecorationLine: 'line-through',
  },
  userPickBadge: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  userPickText: {
    color: COLORS.primary,
  },
  secretBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
  },
  secretText: {
    color: '#9CA3AF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    marginTop: 6,
    marginBottom: 8,
  },
  privacyBannerOpen: {
    backgroundColor: COLORS.primarySubtle,
    borderColor: COLORS.primaryBorder,
  },
  privacyBannerIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  privacyBannerTitle: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  privacyBannerSub: {
    color: '#9CA3AF',
    fontSize: 11,
    lineHeight: 15,
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
    fontSize: 13,
    textAlign: 'center',
  },
  teamBadgeAuto: {
    borderColor: 'rgba(245, 158, 11, 0.5)',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  teamPickTextAuto: {
    color: '#FBBF24',
    fontWeight: '800',
  },
  legendRow: {
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.28)',
    padding: 10,
    marginTop: 12,
  },
  legendText: {
    color: '#D1D5DB',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
});
