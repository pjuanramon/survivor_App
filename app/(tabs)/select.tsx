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
  ArrowRight,
  Sparkles,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { LeagueSelector } from '../../components/leagues/LeagueSelector';
import { useAppStore } from '../../lib/store';
import { useMatchday } from '../../hooks/useMatchday';

interface Match {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score?: number | null;
  away_score?: number | null;
  status?: string | null;
  home_team: { id: string; name: string };
  away_team: { id: string; name: string };
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
  const { config, loading: configLoading } = useMatchday(activeLeague?.competition_id);

  const [matches, setMatches] = useState<Match[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [currentSelection, setCurrentSelection] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [usedTeams, setUsedTeams] = useState<string[]>([]);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [picksSummary, setPicksSummary] = useState<SummaryItem[]>([]);

  // CRITICAL: Only compute these AFTER config has fully loaded from Supabase
  // Do not derive from default state (picks_open: true is the initial default, not actual data)
  const isCurrentJornadaClosed = configLoading ? null : !config.picks_open;
  const targetJornada = configLoading
    ? null
    : isCurrentJornadaClosed
    ? config.current_jornada + 1
    : config.current_jornada;

  // Fetch entries (only once, not dependent on jornada)
  const fetchEntries = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || (await supabase.auth.getUser()).data?.user;
      if (!user) return;

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
    } catch (error) {
      console.error('Error fetching entries:', error);
    }
  }, [activeLeague?.id]);

  // Fetch matches — only called AFTER config is loaded and targetJornada is definitive
  const fetchMatches = useCallback(async (jornada: number) => {
    try {
      setDataLoading(true);
      let query = supabase
        .from('sur_matches')
        .select(`
          id,
          home_team_id,
          away_team_id,
          home_score,
          away_score,
          status,
          home_team:sur_teams!home_team_id(id, name),
          away_team:sur_teams!away_team_id(id, name)
        `)
        .eq('jornada', jornada);

      if (activeLeague?.competition_id) {
        query = query.eq('competition_id', activeLeague.competition_id);
      }

      const { data: matchesData } = await query;
      setMatches((matchesData as any) || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setDataLoading(false);
    }
  }, [activeLeague?.competition_id]);

  // Fetch entries on mount / league change
  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Fetch matches only AFTER config is done loading and targetJornada is known
  useEffect(() => {
    if (!configLoading && targetJornada !== null) {
      fetchMatches(targetJornada);
    }
  }, [configLoading, targetJornada, fetchMatches]);

  // Fetch entry selections for selectedEntry + targetJornada
  useEffect(() => {
    if (selectedEntry && targetJornada !== null) {
      fetchEntrySelections(selectedEntry, targetJornada);
    }
  }, [selectedEntry, targetJornada]);

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

  async function buildSummary(jornada: number) {
    const summaryList: SummaryItem[] = await Promise.all(
      entries.map(async (entry) => {
        const { data: selData } = await supabase
          .from('sur_selections')
          .select('team_id, team:sur_teams!team_id(name)')
          .eq('entry_id', entry.id)
          .eq('jornada', jornada)
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
            matchVs = isHome
              ? `vs ${matchData.away_team.name} (Local)`
              : `@ ${matchData.home_team.name} (Visitante)`;
          }
        }
        return { entryId: entry.id, entryName: entry.entry_name, teamName, matchVs };
      })
    );
    setPicksSummary(summaryList);
  }

  async function handleConfirm() {
    if (!selectedEntry || !selectedTeam || targetJornada === null) return;

    if (usedTeams.includes(selectedTeam)) {
      Alert.alert('Equipo no disponible', '¡Ya usaste este equipo en una jornada anterior!');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('sur_selections').upsert(
        { entry_id: selectedEntry, team_id: selectedTeam, jornada: targetJornada },
        { onConflict: 'entry_id,jornada' }
      );
      if (error) throw error;
      setCurrentSelection(selectedTeam);
      await buildSummary(targetJornada);
      setSummaryModalVisible(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo guardar la selección');
    } finally {
      setSubmitting(false);
    }
  }

  // Show spinner while config or data is loading
  const isLoading = configLoading || (dataLoading && matches.length === 0);

  if (isLoading) {
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
          <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.backBtn}>
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
              Jornada {targetJornada} • Selecciona 1 ganador
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/rules')} style={styles.rulesPill} activeOpacity={0.7}>
            <BookOpen size={16} color={COLORS.primary} />
            <Text style={styles.rulesPillText}>Reglas</Text>
          </TouchableOpacity>
        </View>

        {/* League Selector */}
        <LeagueSelector />

        {/* Closed Picks Notice */}
        {isCurrentJornadaClosed && (
          <View style={styles.closedPicksBanner}>
            <Lock size={18} color={COLORS.warning} style={{ marginRight: 10, marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.closedPicksTitle}>
                Picks de la jornada en juego cerrados.
              </Text>
              <Text style={styles.closedPicksSub}>
                La Jornada {config.current_jornada} ya comenzó. Elige tu pick para la{' '}
                <Text style={{ color: COLORS.primary, fontWeight: '800' }}>
                  Jornada {targetJornada}
                </Text>.
              </Text>
            </View>
          </View>
        )}

        {/* Pick Selector Tabs */}
        <Text style={styles.sectionTitle}>Tus Vidas Activas</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          {entries.map((entry) => {
            const isSelected = selectedEntry === entry.id;
            return (
              <TouchableOpacity
                key={entry.id}
                onPress={() => { setSelectedEntry(entry.id); setSelectedTeam(null); }}
                style={[styles.tab, isSelected && styles.tabSelected]}
                activeOpacity={0.8}
              >
                <Trophy size={16} color={isSelected ? COLORS.textInverse : COLORS.primary} />
                <Text style={[styles.tabText, isSelected && styles.tabTextSelected]}>
                  {entry.entry_name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            📌 Elige el equipo que crees que{' '}
            <Text style={{ fontWeight: '800' }}>GANARÁ</Text> en la{' '}
            <Text style={{ fontWeight: '800', color: COLORS.primary }}>
              Jornada {targetJornada}
            </Text>
            . Equipos en{' '}
            <Text style={{ color: '#EF4444', fontWeight: '800' }}>rojo</Text>{' '}
            ya fueron usados y no pueden repetirse.
          </Text>
        </View>

        {/* Matches */}
        <Text style={styles.sectionTitle}>Partidos Jornada {targetJornada}</Text>

        {matches.length === 0 ? (
          <View style={styles.noMatchesBox}>
            <Text style={styles.noMatchesText}>
              ⏳ No hay partidos cargados para la Jornada {targetJornada} aún.
            </Text>
          </View>
        ) : (
          matches.map((match) => {
            const isHomeUsed = usedTeams.includes(match.home_team?.id);
            const isAwayUsed = usedTeams.includes(match.away_team?.id);
            const isHomeSelected = selectedTeam === match.home_team?.id;
            const isAwaySelected = selectedTeam === match.away_team?.id;
            const isHomeCurrent = currentSelection === match.home_team?.id;
            const isAwayCurrent = currentSelection === match.away_team?.id;

            return (
              <View key={match.id} style={styles.matchCard}>
                <View style={styles.matchTeamsRow}>
                  {/* Home Team */}
                  <TouchableOpacity
                    onPress={() => !isHomeUsed && setSelectedTeam(match.home_team?.id)}
                    disabled={isHomeUsed}
                    style={[
                      styles.teamButton,
                      isHomeSelected && styles.teamButtonSelected,
                      isHomeUsed && styles.teamButtonUsed,
                      isHomeCurrent && !isHomeUsed && styles.teamButtonCurrent,
                    ]}
                    activeOpacity={0.7}
                  >
                    {isHomeCurrent && (
                      <View style={styles.currentBadgeBox}>
                        <Text style={styles.currentBadgeText}>✅ TU PICK</Text>
                      </View>
                    )}
                    <Text
                      style={[
                        styles.teamButtonText,
                        isHomeSelected && styles.teamButtonTextSelected,
                        isHomeUsed && styles.teamButtonTextUsed,
                        isHomeCurrent && !isHomeUsed && styles.teamButtonTextCurrent,
                      ]}
                      numberOfLines={2}
                    >
                      {match.home_team?.name}
                    </Text>
                    <Text style={[styles.venueLabel, isHomeUsed && styles.venueLabelUsed]}>
                      Local
                    </Text>
                    {isHomeUsed && (
                      <View style={styles.usedBadgeBox}>
                        <Text style={styles.usedBadgeText}>❌ YA USADO</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={styles.vsBadge}>
                    <Text style={styles.vsText}>VS</Text>
                  </View>

                  {/* Away Team */}
                  <TouchableOpacity
                    onPress={() => !isAwayUsed && setSelectedTeam(match.away_team?.id)}
                    disabled={isAwayUsed}
                    style={[
                      styles.teamButton,
                      isAwaySelected && styles.teamButtonSelected,
                      isAwayUsed && styles.teamButtonUsed,
                      isAwayCurrent && !isAwayUsed && styles.teamButtonCurrent,
                    ]}
                    activeOpacity={0.7}
                  >
                    {isAwayCurrent && (
                      <View style={styles.currentBadgeBox}>
                        <Text style={styles.currentBadgeText}>✅ TU PICK</Text>
                      </View>
                    )}
                    <Text
                      style={[
                        styles.teamButtonText,
                        isAwaySelected && styles.teamButtonTextSelected,
                        isAwayUsed && styles.teamButtonTextUsed,
                        isAwayCurrent && !isAwayUsed && styles.teamButtonTextCurrent,
                      ]}
                      numberOfLines={2}
                    >
                      {match.away_team?.name}
                    </Text>
                    <Text style={[styles.venueLabel, isAwayUsed && styles.venueLabelUsed]}>
                      Visitante
                    </Text>
                    {isAwayUsed && (
                      <View style={styles.usedBadgeBox}>
                        <Text style={styles.usedBadgeText}>❌ YA USADO</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Confirmation Bar */}
      {selectedTeam && (
        <View style={styles.floatingBar}>
          <View style={styles.floatingInfo}>
            <Text style={styles.floatingLabel}>Tu Selección para J{targetJornada}:</Text>
            <Text style={styles.floatingTeam} numberOfLines={1}>
              {selectedTeamDetails?.name}
            </Text>
          </View>
          <TouchableOpacity onPress={handleConfirm} disabled={submitting} style={styles.confirmBtn} activeOpacity={0.8}>
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

      {/* Success Modal */}
      <Modal visible={summaryModalVisible} transparent animationType="fade" onRequestClose={() => setSummaryModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.celebrationHeader}>
              <Sparkles size={36} color={COLORS.primary} />
              <Text style={styles.modalTitle}>¡Selección Guardada! 🎉</Text>
              <Text style={styles.modalSubtitle}>Tus selecciones para la Jornada {targetJornada}</Text>
              <Text style={styles.modalHint}>Toca cualquier pick para cambiarlo directamente</Text>
            </View>
            <ScrollView style={styles.summaryList}>
              {picksSummary.map((item) => (
                <TouchableOpacity
                  key={item.entryId}
                  style={[
                    styles.summaryItem,
                    selectedEntry === item.entryId && styles.summaryItemSelected,
                  ]}
                  onPress={() => {
                    setSummaryModalVisible(false);
                    setSelectedEntry(item.entryId);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.summaryLeft}>
                    <Text style={styles.summaryEntryName}>{item.entryName}</Text>
                    <Text style={styles.summaryMatchVs}>{item.matchVs || 'Sin partido'}</Text>
                  </View>
                  <View style={styles.summaryRight}>
                    <View style={styles.summaryTeamBadge}>
                      <Text style={styles.summaryTeam}>{item.teamName}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => { setSummaryModalVisible(false); router.replace('/(tabs)'); }}
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
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20, maxWidth: 600, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: COLORS.textPrimary },
  headerSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  rulesPill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryMuted,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(0, 255, 157, 0.3)',
  },
  rulesPillText: { color: COLORS.primary, fontWeight: '700', fontSize: 13, marginLeft: 6 },
  closedPicksBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 184, 0, 0.1)', borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.35)', borderRadius: 14, padding: 14, marginBottom: 16,
  },
  closedPicksTitle: { fontSize: 14, fontWeight: '800', color: COLORS.warning, marginBottom: 4 },
  closedPicksSub: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  sectionTitle: {
    fontSize: 14, fontWeight: '800', color: COLORS.textSecondary,
    marginBottom: 10, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  tabsScroll: { marginBottom: 16 },
  tab: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, marginRight: 10,
    borderWidth: 1, borderColor: COLORS.surfaceBorder,
  },
  tabSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 14, marginLeft: 8 },
  tabTextSelected: { color: COLORS.textInverse },
  infoBox: {
    backgroundColor: COLORS.surfaceElevated, padding: 12, borderRadius: 12,
    marginBottom: 16, borderWidth: 1, borderColor: COLORS.surfaceBorder,
  },
  infoText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  noMatchesBox: {
    backgroundColor: COLORS.surfaceElevated, padding: 20, borderRadius: 14,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.surfaceBorder,
  },
  noMatchesText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  matchCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: COLORS.surfaceBorder,
  },
  matchTeamsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  teamButton: {
    flex: 1, backgroundColor: COLORS.surfaceElevated, paddingVertical: 16,
    paddingHorizontal: 10, borderRadius: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.surfaceBorder, minHeight: 80,
    justifyContent: 'center',
  },
  teamButtonSelected: { backgroundColor: COLORS.primaryMuted, borderColor: COLORS.primary },
  teamButtonUsed: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.4)', opacity: 0.8 },
  teamButtonCurrent: { borderColor: COLORS.primary, backgroundColor: 'rgba(0,255,157,0.1)' },
  teamButtonText: { color: COLORS.textPrimary, fontWeight: '800', fontSize: 13, textAlign: 'center' },
  teamButtonTextSelected: { color: COLORS.primary },
  teamButtonTextUsed: { color: '#EF4444', textDecorationLine: 'line-through' },
  teamButtonTextCurrent: { color: COLORS.primary, fontWeight: '900' },
  venueLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 3, textTransform: 'uppercase', fontWeight: '600' },
  venueLabelUsed: { color: '#F87171' },
  usedBadgeBox: {
    marginTop: 6, backgroundColor: 'rgba(239,68,68,0.18)', paddingHorizontal: 6,
    paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)',
  },
  usedBadgeText: { fontSize: 8, fontWeight: '900', color: '#EF4444' },
  currentBadgeBox: {
    position: 'absolute', top: -8, backgroundColor: COLORS.primary,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
    shadowColor: COLORS.primary, shadowOpacity: 0.5, shadowRadius: 4, elevation: 3,
  },
  currentBadgeText: { fontSize: 9, fontWeight: '900', color: COLORS.textInverse },
  vsBadge: { paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  vsText: { color: COLORS.textMuted, fontWeight: '900', fontSize: 12 },
  floatingBar: {
    position: 'absolute', bottom: 20, left: 20, right: 20, maxWidth: 560, alignSelf: 'center',
    backgroundColor: COLORS.surfaceElevated, borderRadius: 18, borderWidth: 1.5,
    borderColor: COLORS.primary, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 18,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 8,
  },
  floatingInfo: { flex: 1, marginRight: 10 },
  floatingLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  floatingTeam: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary,
    paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12,
  },
  confirmBtnText: { color: COLORS.textInverse, fontWeight: '800', fontSize: 14, marginRight: 6 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20 },
  backBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  backBtnText: { color: COLORS.textInverse, fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: {
    backgroundColor: COLORS.surface, borderRadius: 20, borderWidth: 1,
    borderColor: COLORS.surfaceBorder, width: '100%', maxWidth: 480, padding: 24,
  },
  celebrationHeader: { alignItems: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginTop: 10, marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: COLORS.textSecondary },
  modalHint: { fontSize: 11, color: COLORS.primary, marginTop: 6, fontWeight: '700' },
  summaryList: { maxHeight: 260, marginBottom: 20 },
  summaryItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: COLORS.surfaceBorder,
  },
  summaryItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0, 255, 157, 0.08)',
  },
  summaryLeft: { flex: 1 },
  summaryEntryName: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  summaryMatchVs: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  summaryRight: { marginLeft: 10 },
  summaryTeamBadge: {
    backgroundColor: 'rgba(0, 255, 157, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 157, 0.3)',
  },
  summaryTeam: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  modalDoneBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalDoneBtnText: { color: COLORS.textInverse, fontWeight: '800', fontSize: 15 },
});
