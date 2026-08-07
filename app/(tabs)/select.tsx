import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Trophy, Clock, Lock, BookOpen, Check } from 'lucide-react-native';
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

      Alert.alert('¡Éxito!', `Selección guardada para la Jornada ${config.current_jornada}.`);
      setCurrentSelection(selectedTeam);
      fetchEntrySelections(selectedEntry, config.current_jornada);
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
          matches.map(match => (
            <View key={match.id} style={styles.matchCard}>
              <View style={styles.teamsRow}>
                
                {/* Home Team */}
                <TouchableOpacity 
                  onPress={() => canSelect && setSelectedTeam(match.home_team.id)}
                  disabled={!canSelect || usedTeams.includes(match.home_team.id)}
                  style={[
                    styles.teamButton,
                    selectedTeam === match.home_team.id && styles.teamButtonSelected,
                    (usedTeams.includes(match.home_team.id) || !canSelect) && styles.teamButtonDisabled
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.teamName, selectedTeam === match.home_team.id && styles.teamNameSelected]}>
                    {match.home_team.name}
                  </Text>
                  {usedTeams.includes(match.home_team.id) && (
                    <Text style={styles.usedBadge}>USADO</Text>
                  )}
                  {currentSelection === match.home_team.id && (
                    <Text style={styles.selectedBadge}>✓ SELECCIONADO</Text>
                  )}
                </TouchableOpacity>

                <Text style={styles.vsText}>VS</Text>

                {/* Away Team */}
                <TouchableOpacity 
                  onPress={() => canSelect && setSelectedTeam(match.away_team.id)}
                  disabled={!canSelect || usedTeams.includes(match.away_team.id)}
                  style={[
                    styles.teamButton,
                    selectedTeam === match.away_team.id && styles.teamButtonSelected,
                    (usedTeams.includes(match.away_team.id) || !canSelect) && styles.teamButtonDisabled
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.teamName, selectedTeam === match.away_team.id && styles.teamNameSelected]}>
                    {match.away_team.name}
                  </Text>
                  {usedTeams.includes(match.away_team.id) && (
                    <Text style={styles.usedBadge}>USADO</Text>
                  )}
                  {currentSelection === match.away_team.id && (
                    <Text style={styles.selectedBadge}>✓ SELECCIONADO</Text>
                  )}
                </TouchableOpacity>

              </View>
            </View>
          ))
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
});
