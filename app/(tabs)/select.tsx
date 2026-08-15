import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Trophy, Clock, Lock, BookOpen, AlertTriangle, CheckCircle2, ShieldCheck, ArrowRight, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface Match {
  id: string;
  home_team: { id: string; name: string };
  away_team: { id: string; name: string };
}

interface Entry {
  id: string;
  entry_name: string;
  is_alive: boolean;
}

interface Config {
  current_jornada: number;
  picks_open: boolean;
  picks_deadline?: string;
}

interface SummaryItem {
  entryId: string;
  entryName: string;
  teamName: string;
  matchVs?: string;
}

export default function SelectScreen() {
  const router = useRouter();
  const [config, setConfig] = useState<Config>({ current_jornada: 1, picks_open: true });
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

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: configData } = await supabase
        .from('sur_config')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      const activeJornada = configData?.current_jornada || 1;
      const isPicksOpen = configData ? configData.picks_open : true;
      const defaultDeadline = '2026-08-15T17:30:00.000Z';

      setConfig({
        current_jornada: activeJornada,
        picks_open: isPicksOpen,
        picks_deadline: configData?.picks_deadline || defaultDeadline,
      });

      const { data: entriesData } = await supabase
        .from('sur_entries')
        .select('*')
        .eq('player_id', user.id)
        .eq('is_alive', true);
      
      setEntries(entriesData || []);
      if (entriesData?.length) setSelectedEntry(entriesData[0].id);

      const { data: matchesData } = await supabase
        .from('sur_matches')
        .select(`
          id,
          home_team:sur_teams!home_team_id(id, name),
          away_team:sur_teams!away_team_id(id, name)
        `)
        .eq('jornada', activeJornada);
      
      setMatches(matchesData as any || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

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
        .filter(s => s.jornada < jornada)
        .map(s => s.team_id);
      setUsedTeams(pastUsed);

      const thisJornadaSel = allSelections.find(s => s.jornada === jornada);
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
      const postponedTeams = ['Real Madrid', 'Real Sociedad', 'FC Barcelona', 'Athletic', 'Valencia', 'Betis', 'Celta', 'Osasuna'];
      if (postponedTeams.some(t => home.includes(t) || away.includes(t))) {
        return {
          isPostponed: true,
          reason: '⚠️ PARTIDO APLAZADO (Se juega tras el inicio de la J2). No elegible en el pick de la J1.'
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
          const matchData = matches.find(m => m.home_team.id === tId || m.away_team.id === tId);
          if (matchData) {
            const isHome = matchData.home_team.id === tId;
            const opp = isHome ? matchData.away_team.name : matchData.home_team.name;
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
      Alert.alert('Equipo no disponible', '¡Ya usaste este equipo en una jornada anterior con este pick!');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('sur_selections').upsert({
        entry_id: selectedEntry,
        team_id: selectedTeam,
        jornada: config.current_jornada,
      }, { onConflict: 'entry_id,jornada' });

      if (error) throw error;

      setCurrentSelection(selectedTeam);
      await fetchEntrySelections(selectedEntry, config.current_jornada);
      await buildSummary();
      setSummaryModalVisible(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo guardar la selección.');
    } finally {
      setSubmitting(false);
    }
  }

  const isDeadlinePassed = config.picks_deadline ? new Date() > new Date(config.picks_deadline) : false;
  const canSelect = config.picks_open && !isDeadlinePassed;

  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator color="#00FF9D" size="large" />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Elige tu equipo</Text>
            <Text style={styles.headerSubtitle}>Jornada {config.current_jornada}</Text>
          </View>

          <TouchableOpacity 
            onPress={() => router.push('/rules')}
            style={styles.rulesPill}
            activeOpacity={0.7}
          >
            <BookOpen size={16} color="#00FF9D" />
            <Text style={styles.rulesPillText}>Reglas</Text>
          </TouchableOpacity>
        </View>

        {/* Banner Deadline */}
        <View style={[styles.statusBanner, !canSelect && styles.bannerClosed]}>
          {canSelect ? (
            <Clock size={20} color="#00FF9D" style={{ marginRight: 10 }} />
          ) : (
            <Lock size={20} color="#EF4444" style={{ marginRight: 10 }} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, !canSelect && { color: '#F87171' }]}>
              {canSelect ? 'Plazo de selección abierto' : 'Picks Cerrados para esta jornada'}
            </Text>
            {config.picks_deadline && (
              <Text style={styles.bannerSubtitle}>
                Cierre: {new Date(config.picks_deadline).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
        </View>
        
        {/* Selector Pick */}
        <Text style={styles.sectionLabel}>SELECCIONA TU PICK:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          {entries.map(entry => (
            <TouchableOpacity 
              key={entry.id}
              onPress={() => setSelectedEntry(entry.id)}
              style={[styles.pickChip, selectedEntry === entry.id && styles.pickChipActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.pickChipText, selectedEntry === entry.id && styles.pickChipTextActive]}>
                {entry.entry_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Lista de Partidos */}
        <Text style={styles.sectionLabel}>PARTIDOS JORNADA {config.current_jornada}:</Text>
        {matches.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No hay partidos cargados para la Jornada {config.current_jornada}.</Text>
          </View>
        ) : (
          matches.map(match => {
            const { isPostponed, reason } = getMatchPostponedInfo(match, config.current_jornada);
            const isHomeDisabled = isPostponed || !canSelect || usedTeams.includes(match.home_team.id);
            const isAwayDisabled = isPostponed || !canSelect || usedTeams.includes(match.away_team.id);

            return (
              <View key={match.id} style={[styles.matchCard, isPostponed && styles.matchCardPostponed]}>
                {isPostponed && (
                  <View style={styles.postponedNoticeBox}>
                    <AlertTriangle size={14} color="#FBBF24" style={{ marginRight: 6 }} />
                    <Text style={styles.postponedNoticeText}>{reason}</Text>
                  </View>
                )}

                <View style={styles.teamsRow}>
                  {/* Home Team */}
                  <TouchableOpacity 
                    onPress={() => {
                      if (isPostponed) {
                        Alert.alert('Partido Aplazado', 'Este partido se juega tras el arranque de la Jornada 2, por lo que no se puede seleccionar en el pick de la J1.');
                      } else if (canSelect) {
                        setSelectedTeam(match.home_team.id);
                      }
                    }}
                    disabled={isHomeDisabled}
                    style={[
                      styles.teamButton,
                      selectedTeam === match.home_team.id && styles.teamButtonSelected,
                      isHomeDisabled && styles.teamButtonDisabled
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.teamName, selectedTeam === match.home_team.id && styles.teamNameSelected]}>
                      {match.home_team.name}
                    </Text>
                    {isPostponed ? (
                      <Text style={styles.postponedBadge}>NO ELEGIBLE</Text>
                    ) : usedTeams.includes(match.home_team.id) ? (
                      <Text style={styles.usedBadge}>USADO</Text>
                    ) : currentSelection === match.home_team.id ? (
                      <Text style={styles.selectedBadge}>✓ SELECCIONADO</Text>
                    ) : null}
                  </TouchableOpacity>

                  <Text style={styles.vsText}>VS</Text>

                  {/* Away Team */}
                  <TouchableOpacity 
                    onPress={() => {
                      if (isPostponed) {
                        Alert.alert('Partido Aplazado', 'Este partido se juega tras el arranque de la Jornada 2, por lo que no se puede seleccionar en el pick de la J1.');
                      } else if (canSelect) {
                        setSelectedTeam(match.away_team.id);
                      }
                    }}
                    disabled={isAwayDisabled}
                    style={[
                      styles.teamButton,
                      selectedTeam === match.away_team.id && styles.teamButtonSelected,
                      isAwayDisabled && styles.teamButtonDisabled
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.teamName, selectedTeam === match.away_team.id && styles.teamNameSelected]}>
                      {match.away_team.name}
                    </Text>
                    {isPostponed ? (
                      <Text style={styles.postponedBadge}>NO ELEGIBLE</Text>
                    ) : usedTeams.includes(match.away_team.id) ? (
                      <Text style={styles.usedBadge}>USADO</Text>
                    ) : currentSelection === match.away_team.id ? (
                      <Text style={styles.selectedBadge}>✓ SELECCIONADO</Text>
                    ) : null}
                  </TouchableOpacity>

                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Botón de Confirmación Flotante */}
      {selectedTeam && canSelect && (
        <View style={styles.floatingContainer}>
          <TouchableOpacity 
            onPress={handleConfirm}
            disabled={submitting}
            style={[styles.floatingBtn, submitting && styles.btnDisabled]}
            activeOpacity={0.8}
          >
            <Trophy size={20} color="#000000" />
            <Text style={styles.floatingBtnText}>
              {submitting ? 'GUARDANDO...' : 'CONFIRMAR SELECCIÓN'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Pop-up Celebration & Summary Modal */}
      <Modal
        visible={summaryModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSummaryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity 
              onPress={() => setSummaryModalVisible(false)} 
              style={styles.modalCloseBtn}
            >
              <X size={20} color="#888888" />
            </TouchableOpacity>

            <View style={styles.modalHeader}>
              <View style={styles.modalIconBadge}>
                <Trophy size={36} color="#00FF9D" />
              </View>
              <Text style={styles.modalTitle}>¡SELECCIÓN GUARDADA!</Text>
              <Text style={styles.modalSubtitle}>Resumen de tus Picks — Jornada {config.current_jornada}</Text>
            </View>

            <View style={styles.modalSummaryList}>
              {picksSummary.map((item) => (
                <View key={item.entryId} style={styles.modalSummaryItem}>
                  <View style={styles.modalItemHeader}>
                    <CheckCircle2 size={16} color="#00FF9D" style={{ marginRight: 6 }} />
                    <Text style={styles.modalItemEntryName}>{item.entryName}</Text>
                  </View>
                  <Text style={styles.modalItemTeamName}>{item.teamName}</Text>
                  {item.matchVs ? (
                    <Text style={styles.modalItemVs}>{item.matchVs}</Text>
                  ) : null}
                </View>
              ))}
            </View>

            <View style={styles.modalNoticeBox}>
              <ShieldCheck size={16} color="#00FF9D" style={{ marginRight: 8 }} />
              <Text style={styles.modalNoticeText}>
                💡 <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>Puedes modificar tu elección</Text> las veces que quieras hasta el cierre de la jornada (15 de agosto 19:30 h).
              </Text>
            </View>

            <TouchableOpacity 
              onPress={() => {
                setSummaryModalVisible(false);
                router.replace('/(tabs)');
              }}
              style={styles.modalPrimaryBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.modalPrimaryBtnText}>IR A MI CLASIFICACIÓN / DASHBOARD</Text>
              <ArrowRight size={18} color="#000000" style={{ marginLeft: 6 }} />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setSummaryModalVisible(false)}
              style={styles.modalSecondaryBtn}
            >
              <Text style={styles.modalSecondaryBtnText}>Seguir ajustando mis picks</Text>
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
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: '#00FF9D',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  rulesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262626',
  },
  rulesPillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  statusBanner: {
    backgroundColor: '#161616',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#262626',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  bannerClosed: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  bannerSubtitle: {
    color: '#888888',
    fontSize: 12,
    marginTop: 2,
  },
  sectionLabel: {
    color: '#888888',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  pickChip: {
    marginRight: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#161616',
  },
  pickChipActive: {
    backgroundColor: '#00FF9D',
    borderColor: '#00FF9D',
  },
  pickChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  pickChipTextActive: {
    color: '#000000',
    fontWeight: '900',
  },
  emptyBox: {
    backgroundColor: '#161616',
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
  },
  emptyText: {
    color: '#888888',
    textAlign: 'center',
  },
  matchCard: {
    backgroundColor: '#161616',
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#262626',
  },
  matchCardPostponed: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: '#14120D',
  },
  postponedNoticeBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  postponedNoticeText: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
    lineHeight: 16,
  },
  teamsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamButton: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222222',
  },
  teamButtonSelected: {
    backgroundColor: '#00FF9D',
    borderColor: '#00FF9D',
  },
  teamButtonDisabled: {
    opacity: 0.35,
  },
  teamName: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 15,
  },
  teamNameSelected: {
    color: '#000000',
    fontWeight: '900',
  },
  usedBadge: {
    color: '#F87171',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 4,
  },
  postponedBadge: {
    color: '#FBBF24',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 4,
  },
  selectedBadge: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 4,
  },
  vsText: {
    color: '#666666',
    fontWeight: '900',
    fontSize: 12,
    marginHorizontal: 10,
  },
  floatingContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  floatingBtn: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: '#00FF9D',
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00FF9D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  floatingBtnText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 17,
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#161616',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333333',
    position: 'relative',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 255, 157, 0.15)',
    borderWidth: 1.5,
    borderColor: '#00FF9D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    color: '#00FF9D',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: '#888888',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  modalSummaryList: {
    gap: 10,
    marginBottom: 20,
  },
  modalSummaryItem: {
    backgroundColor: '#0F0F0F',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  modalItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalItemEntryName: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '800',
  },
  modalItemTeamName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  modalItemVs: {
    color: '#00FF9D',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  modalNoticeBox: {
    backgroundColor: 'rgba(0, 255, 157, 0.08)',
    borderColor: 'rgba(0, 255, 157, 0.25)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalNoticeText: {
    color: '#CCCCCC',
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  modalPrimaryBtn: {
    backgroundColor: '#00FF9D',
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalPrimaryBtnText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  modalSecondaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSecondaryBtnText: {
    color: '#888888',
    fontSize: 13,
    fontWeight: '600',
  },
});
