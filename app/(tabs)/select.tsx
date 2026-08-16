import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Modal,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import {
  Trophy,
  Lock,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  X,
  Sparkles,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { CountdownTimer } from '../../components/shared/CountdownTimer';
import { LeagueSelector } from '../../components/leagues/LeagueSelector';
import { useAppStore } from '../../lib/store';
import { useMatchday } from '../../hooks/useMatchday';

interface Match {
  id: string;
  home_team: { id: string; name: string };
  away_team: { id: string; name: string };
  is_postponed?: boolean;
}

interface Entry {
  id: string;
  entry_name: string;
  is_alive: boolean;
  league_id?: string;
}

interface SummaryItem {
  entryId: string;
  entryName: string;
  teamName: string;
  matchVs?: string;
}

export default function SelectScreen() {
  const router = useRouter();
  const { activeLeague } = useAppStore();
  const { config } = useMatchday(activeLeague?.competition_id);

  const [matches, setMatches] = useState<Match[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [currentSelection, setCurrentSelection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [usedTeams, setUsedTeams] = useState<string[]>([]);

  // Celebration & Summary Modal State
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [picksSummary, setPicksSummary] = useState<SummaryItem[]>([]);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const activeJornada = config.current_jornada || 1;

      // Fetch alive entries (filtered by active league if present)
      let entriesQuery = supabase
        .from('sur_entries')
        .select('*')
        .eq('player_id', user.id)
        .eq('is_alive', true);

      if (activeLeague?.id) {
        entriesQuery = entriesQuery.or(`league_id.eq.${activeLeague.id},league_id.is.null`);
      }

      const { data: entriesData } = await entriesQuery;

      setEntries(entriesData || []);
      if (entriesData && entriesData.length > 0) {
        setSelectedEntry(entriesData[0].id);
      }

      // Fetch matches for active jornada
      let matchesQuery = supabase
        .from('sur_matches')
        .select(`
          id,
          home_team:sur_teams!home_team_id(id, name),
          away_team:sur_teams!away_team_id(id, name)
        `)
        .eq('jornada', activeJornada);

      if (activeLeague?.competition_id) {
        matchesQuery = matchesQuery.or(
          `competition_id.eq.${activeLeague.competition_id},competition_id.is.null`
        );
      }

      const { data: matchesData } = await matchesQuery;
      setMatches((matchesData as any) || []);
    } catch (error) {
      console.error('Error fetching selection data:', error);
    } finally {
      setLoading(false);
    }
  }, [activeLeague, config.current_jornada]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (selectedEntry && config.current_jornada) {
      fetchEntrySelections(selectedEntry, config.current_jornada);
    }
  }, [selectedEntry, config.current_jornada]);

  async function fetchEntrySelections(entryId: string, jornada: number) {
    const { data: allSelections } = await supabase
      .from('sur_selections')
      .select('team_id, jornada')
      .eq('entry_id', entryId);

    if (allSelections) {
      const pastUsed = allSelections
        .filter((s) => s.jornada < jornada)
        .map((s) => s.team_id);
      setUsedTeams(pastUsed);

      const thisJornadaSel = allSelections.find((s) => s.jornada === jornada);
      if (thisJornadaSel) {
        setCurrentSelection(thisJornadaSel.team_id);
        setSelectedTeam(thisJornadaSel.team_id);
      } else {
        setCurrentSelection(null);
        setSelectedTeam(null);
      }
    }
  }

  function getMatchPostponedInfo(match: Match, jornada: number) {
    if (jornada === 1) {
      const home = match.home_team?.name || '';
      const away = match.away_team?.name || '';
      const postponedTeams = [
        'Real Madrid',
        'Real Sociedad',
        'FC Barcelona',
        'Athletic',
        'Valencia',
        'Betis',
        'Celta',
        'Osasuna',
      ];
      if (postponedTeams.some((t) => home.includes(t) || away.includes(t))) {
        return {
          isPostponed: true,
          reason:
            '⚠️ PARTIDO APLAZADO (Se juega tras el inicio de la J2). No elegible en el pick de la J1.',
        };
      }
    }
    return { isPostponed: false, reason: null };
  }

  async function buildSummary() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const summaryList: SummaryItem[] = await Promise.all(
      entries.map(async (entry) => {
        const { data: selData } = await supabase
          .from('sur_selections')
          .select(`
            team_id,
            team:sur_teams!team_id(name)
          `)
          .eq('entry_id', entry.id)
          .eq('jornada', config.current_jornada)
          .maybeSingle();

        const teamName = (selData as any)?.team?.name || 'Sin selección';
        let matchVs = '';

        if ((selData as any)?.team_id) {
          const tId = (selData as any).team_id;
          const matchData = matches.find(
            (m) => m.home_team?.id === tId || m.away_team?.id === tId
          );
          if (matchData) {
            const isHome = matchData.home_team.id === tId;
            const opp = isHome
              ? matchData.away_team.name
              : matchData.home_team.name;
            matchVs = isHome ? `vs ${opp} (Local)` : `@ ${opp} (Visitante)`;
          }
        }

        return {
          entryId: entry.id,
          entryName: entry.entry_name,
          teamName: teamName,
          matchVs: matchVs,
        };
      })
    );

    setPicksSummary(summaryList);
  }

  async function handleConfirm() {
    if (!selectedEntry || !selectedTeam) return;

    if (!config.picks_open) {
      Alert.alert('Plazo Cerrado', 'Los picks para esta jornada están cerrados.');
      return;
    }

    if (usedTeams.includes(selectedTeam)) {
      Alert.alert(
        'Equipo no disponible',
        '¡Ya usaste este equipo en una jornada anterior con este pick!'
      );
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('sur_selections').upsert(
        {
          entry_id: selectedEntry,
          team_id: selectedTeam,
          jornada: config.current_jornada,
        },
        { onConflict: 'entry_id,jornada' }
      );

      if (error) throw error;

      setCurrentSelection(selectedTeam);
      await buildSummary();
      setSummaryModalVisible(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo guardar la selección');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <AlertTriangle size={48} color={COLORS.warning} />
          <Text style={styles.emptyTitle}>No tienes vidas activas</Text>
          <Text style={styles.emptyText}>
            Todos tus picks han sido eliminados o no tienes entradas en esta liga.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            style={styles.backBtn}
          >
            <Text style={styles.backBtnText}>Volver al Inicio</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const selectedTeamDetails = matches
    .flatMap((m) => [m.home_team, m.away_team])
    .find((t) => t?.id === selectedTeam);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Elegir Equipo</Text>
            <Text style={styles.headerSubtitle}>
              Jornada {config.current_jornada} • Selecciona 1 ganador
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
        <LeagueSelector />

        {/* Countdown */}
        {config.picks_deadline && (
          <CountdownTimer
            deadline={config.picks_deadline}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Pick Selector Tabs */}
        <Text style={styles.sectionTitle}>Tus Vidas Activas</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
        >
          {entries.map((entry) => {
            const isSelected = selectedEntry === entry.id;
            return (
              <TouchableOpacity
                key={entry.id}
                onPress={() => {
                  setSelectedEntry(entry.id);
                  setSelectedTeam(null);
                }}
                style={[styles.tab, isSelected && styles.tabSelected]}
                activeOpacity={0.8}
              >
                <Trophy
                  size={16}
                  color={isSelected ? COLORS.textInverse : COLORS.primary}
                />
                <Text
                  style={[styles.tabText, isSelected && styles.tabTextSelected]}
                >
                  {entry.entry_name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Notice */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            📌 Elige al equipo que crees que GANARÁ. No podrás volver a elegirlo en
            toda la temporada para esta vida.
          </Text>
        </View>

        {/* Matches List */}
        <Text style={styles.sectionTitle}>
          Partidos Jornada {config.current_jornada}
        </Text>
        {matches.map((match) => {
          const postponedInfo = getMatchPostponedInfo(
            match,
            config.current_jornada
          );
          const isPostponed = postponedInfo.isPostponed;

          const isHomeUsed = usedTeams.includes(match.home_team?.id);
          const isAwayUsed = usedTeams.includes(match.away_team?.id);

          const isHomeSelected = selectedTeam === match.home_team?.id;
          const isAwaySelected = selectedTeam === match.away_team?.id;

          const isHomeCurrent = currentSelection === match.home_team?.id;
          const isAwayCurrent = currentSelection === match.away_team?.id;

          return (
            <View
              key={match.id}
              style={[
                styles.matchCard,
                isPostponed && styles.matchCardPostponed,
              ]}
            >
              {isPostponed && (
                <View style={styles.postponedBanner}>
                  <AlertTriangle
                    size={14}
                    color={COLORS.warning}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.postponedBannerText}>
                    {postponedInfo.reason}
                  </Text>
                </View>
              )}

              <View style={styles.matchTeamsRow}>
                {/* Home Team */}
                <TouchableOpacity
                  onPress={() =>
                    !isHomeUsed &&
                    !isPostponed &&
                    setSelectedTeam(match.home_team?.id)
                  }
                  disabled={isHomeUsed || isPostponed}
                  style={[
                    styles.teamButton,
                    isHomeSelected && styles.teamButtonSelected,
                    (isHomeUsed || isPostponed) && styles.teamButtonDisabled,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.teamButtonText,
                      isHomeSelected && styles.teamButtonTextSelected,
                      (isHomeUsed || isPostponed) &&
                        styles.teamButtonTextDisabled,
                    ]}
                    numberOfLines={1}
                  >
                    {match.home_team?.name}
                  </Text>
                  <Text style={styles.venueLabel}>Local</Text>
                  {isHomeUsed && (
                    <Text style={styles.usedBadge}>USADO</Text>
                  )}
                  {isHomeCurrent && (
                    <Text style={styles.currentBadge}>ELEGIDO</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.vsBadge}>
                  <Text style={styles.vsText}>VS</Text>
                </View>

                {/* Away Team */}
                <TouchableOpacity
                  onPress={() =>
                    !isAwayUsed &&
                    !isPostponed &&
                    setSelectedTeam(match.away_team?.id)
                  }
                  disabled={isAwayUsed || isPostponed}
                  style={[
                    styles.teamButton,
                    isAwaySelected && styles.teamButtonSelected,
                    (isAwayUsed || isPostponed) && styles.teamButtonDisabled,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.teamButtonText,
                      isAwaySelected && styles.teamButtonTextSelected,
                      (isAwayUsed || isPostponed) &&
                        styles.teamButtonTextDisabled,
                    ]}
                    numberOfLines={1}
                  >
                    {match.away_team?.name}
                  </Text>
                  <Text style={styles.venueLabel}>Visitante</Text>
                  {isAwayUsed && (
                    <Text style={styles.usedBadge}>USADO</Text>
                  )}
                  {isAwayCurrent && (
                    <Text style={styles.currentBadge}>ELEGIDO</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Confirmation Bar */}
      {selectedTeam && (
        <View style={styles.floatingBar}>
          <View style={styles.floatingInfo}>
            <Text style={styles.floatingLabel}>Tu Selección:</Text>
            <Text style={styles.floatingTeam} numberOfLines={1}>
              {selectedTeamDetails?.name}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleConfirm}
            disabled={submitting}
            style={styles.confirmBtn}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.textInverse} size="small" />
            ) : (
              <>
                <Text style={styles.confirmBtnText}>Confirmar</Text>
                <ArrowRight size={16} color={COLORS.textInverse} />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Success Celebration Modal */}
      <Modal
        visible={summaryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSummaryModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.celebrationHeader}>
              <Sparkles size={36} color={COLORS.primary} />
              <Text style={styles.modalTitle}>¡Selección Guardada! 🎉</Text>
              <Text style={styles.modalSubtitle}>
                Tus selecciones para la Jornada {config.current_jornada}
              </Text>
            </View>

            <ScrollView style={styles.summaryList}>
              {picksSummary.map((item) => (
                <View key={item.entryId} style={styles.summaryItem}>
                  <View style={styles.summaryLeft}>
                    <Text style={styles.summaryEntryName}>{item.entryName}</Text>
                    <Text style={styles.summaryMatchVs}>{item.matchVs}</Text>
                  </View>
                  <View style={styles.summaryRight}>
                    <Text style={styles.summaryTeam}>{item.teamName}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              onPress={() => {
                setSummaryModalVisible(false);
                router.replace('/(tabs)');
              }}
              style={styles.modalDoneBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.modalDoneBtnText}>Ir al Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginBottom: 10,
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabsScroll: {
    marginBottom: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  tabSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 8,
  },
  tabTextSelected: {
    color: COLORS.textInverse,
  },
  infoBox: {
    backgroundColor: COLORS.surfaceElevated,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  matchCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  matchCardPostponed: {
    borderColor: 'rgba(255, 184, 0, 0.3)',
    backgroundColor: 'rgba(255, 184, 0, 0.02)',
  },
  postponedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  postponedBannerText: {
    color: COLORS.warning,
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  matchTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceElevated,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
  },
  teamButtonSelected: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  teamButtonDisabled: {
    opacity: 0.4,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  teamButtonText: {
    color: COLORS.textPrimary,
    fontWeight: '800',
    fontSize: 14,
    textAlign: 'center',
  },
  teamButtonTextSelected: {
    color: COLORS.primary,
  },
  teamButtonTextDisabled: {
    color: COLORS.textMuted,
  },
  venueLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  usedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.dead,
    backgroundColor: COLORS.deadBg,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  currentBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.primary,
    backgroundColor: COLORS.primaryMuted,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  vsBadge: {
    paddingHorizontal: 10,
  },
  vsText: {
    color: COLORS.textMuted,
    fontWeight: '900',
    fontSize: 12,
  },
  floatingBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    maxWidth: 560,
    alignSelf: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 18,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  floatingInfo: {
    flex: 1,
    marginRight: 10,
  },
  floatingLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  floatingTeam: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  confirmBtnText: {
    color: COLORS.textInverse,
    fontWeight: '800',
    fontSize: 14,
    marginRight: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  backBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  backBtnText: {
    color: COLORS.textInverse,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    width: '100%',
    maxWidth: 480,
    padding: 24,
  },
  celebrationHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 10,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  summaryList: {
    maxHeight: 240,
    marginBottom: 20,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  summaryLeft: {
    flex: 1,
  },
  summaryEntryName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  summaryMatchVs: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  summaryRight: {
    marginLeft: 10,
  },
  summaryTeam: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  modalDoneBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalDoneBtnText: {
    color: COLORS.textInverse,
    fontWeight: '800',
    fontSize: 15,
  },
});
