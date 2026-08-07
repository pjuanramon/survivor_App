import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { styled } from 'nativewind';
import { supabase } from '../../lib/supabase';
import { Trophy, Clock, Lock, BookOpen } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouch = styled(TouchableOpacity);

interface Match {
  id: string;
  home_team: { id: string; name: string };
  away_team: { id: string; name: string };
  match_date?: string;
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

      // 1. Cargar Configuración de la Liga
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

      // 2. Cargar Picks (entries) del usuario
      const { data: entriesData } = await supabase
        .from('sur_entries')
        .select('*')
        .eq('player_id', user.id)
        .eq('is_alive', true);
      
      setEntries(entriesData || []);
      if (entriesData?.length) setSelectedEntry(entriesData[0].id);

      // 3. Cargar Partidos de la Jornada activa
      const { data: matchesData } = await supabase
        .from('sur_matches')
        .select(`
          id,
          match_date,
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

  // Cargar equipos ya usados y la selección actual cuando cambia el Pick seleccionado
  useEffect(() => {
    if (selectedEntry && config.current_jornada) {
      fetchEntrySelections(selectedEntry, config.current_jornada);
    }
  }, [selectedEntry, config.current_jornada]);

  async function fetchEntrySelections(entryId: string, jornada: number) {
    // Equipos usados en jornadas anteriores
    const { data: allSelections } = await supabase
      .from('sur_selections')
      .select('team_id, jornada')
      .eq('entry_id', entryId);
    
    if (allSelections) {
      // Equipos usados en jornadas pasadas (< jornada actual)
      const pastUsed = allSelections
        .filter(s => s.jornada < jornada)
        .map(s => s.team_id);
      setUsedTeams(pastUsed);

      // Selección hecha para esta jornada activa
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
      // Si ya existía selección para esta jornada, actualizarla (upsert)
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
    <StyledView className="flex-1 bg-background justify-center items-center">
      <ActivityIndicator color="#00FF9D" size="large" />
    </StyledView>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="p-4">
        {/* Header */}
        <StyledView className="flex-row justify-between items-center mt-2 mb-4">
          <StyledView>
            <StyledText className="text-white text-3xl font-black">Elige tu equipo</StyledText>
            <StyledText className="text-primary font-bold text-base">Jornada {config.current_jornada}</StyledText>
          </StyledView>

          <StyledTouch 
            onPress={() => router.push('/rules')}
            className="flex-row items-center bg-surface px-3 py-2 rounded-full border border-gray-800"
          >
            <BookOpen size={16} color="#00FF9D" />
            <StyledText className="text-white text-xs font-bold ml-1.5">Reglas</StyledText>
          </StyledTouch>
        </StyledView>

        {/* Status / Deadline Banner */}
        <StyledView className={`p-4 rounded-2xl mb-6 flex-row items-center border ${canSelect ? 'bg-surface border-gray-800' : 'bg-red-950/40 border-red-800/40'}`}>
          {canSelect ? (
            <Clock size={20} color="#00FF9D" />
          ) : (
            <Lock size={20} color="#EF4444" />
          )}
          <StyledView className="ml-3 flex-1">
            <StyledText className={`font-bold text-sm ${canSelect ? 'text-white' : 'text-red-400'}`}>
              {canSelect ? 'Plazo de selección abierto' : 'Picks Cerrados para esta jornada'}
            </StyledText>
            {config.picks_deadline && (
              <StyledText className="text-muted text-xs mt-0.5">
                Cierre: {new Date(config.picks_deadline).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </StyledText>
            )}
          </StyledView>
        </StyledView>
        
        {/* Selector de Pick / Vida */}
        <StyledText className="text-muted text-xs font-bold uppercase mb-2">Selecciona tu Pick:</StyledText>
        <StyledView className="flex-row mb-6">
          {entries.map(entry => (
            <StyledTouch 
              key={entry.id}
              onPress={() => setSelectedEntry(entry.id)}
              className={`mr-2 px-4 py-2 rounded-full border ${selectedEntry === entry.id ? 'bg-primary border-primary' : 'border-gray-700 bg-surface'}`}
            >
              <StyledText className={`font-bold ${selectedEntry === entry.id ? 'text-black' : 'text-white'}`}>
                {entry.entry_name}
              </StyledText>
            </StyledTouch>
          ))}
        </StyledView>

        {/* Lista de Partidos */}
        <StyledText className="text-muted text-xs font-bold uppercase mb-3">Partidos Jornada {config.current_jornada}:</StyledText>
        {matches.length === 0 ? (
          <StyledView className="bg-surface rounded-2xl p-6 items-center border border-gray-800">
            <StyledText className="text-muted text-center">No hay partidos cargados para la Jornada {config.current_jornada}.</StyledText>
          </StyledView>
        ) : (
          matches.map(match => (
            <StyledView key={match.id} className="bg-surface rounded-3xl p-4 mb-4 border border-gray-800">
              <StyledView className="flex-row justify-between items-center">
                
                {/* Home Team */}
                <StyledTouch 
                  onPress={() => canSelect && setSelectedTeam(match.home_team.id)}
                  disabled={!canSelect || usedTeams.includes(match.home_team.id)}
                  className={`flex-1 p-4 rounded-2xl items-center ${selectedTeam === match.home_team.id ? 'bg-primary' : 'bg-gray-900'} ${usedTeams.includes(match.home_team.id) || !canSelect ? 'opacity-40' : ''}`}
                >
                  <StyledText className={`font-bold text-center ${selectedTeam === match.home_team.id ? 'text-black' : 'text-white'}`}>
                    {match.home_team.name}
                  </StyledText>
                  {usedTeams.includes(match.home_team.id) && <StyledText className="text-[10px] text-red-500 font-bold mt-1">USADO</StyledText>}
                  {currentSelection === match.home_team.id && <StyledText className="text-[10px] text-black font-extrabold mt-1">SELECCIONADO</StyledText>}
                </StyledTouch>

                <StyledText className="text-muted mx-3 font-black text-xs">VS</StyledText>

                {/* Away Team */}
                <StyledTouch 
                  onPress={() => canSelect && setSelectedTeam(match.away_team.id)}
                  disabled={!canSelect || usedTeams.includes(match.away_team.id)}
                  className={`flex-1 p-4 rounded-2xl items-center ${selectedTeam === match.away_team.id ? 'bg-primary' : 'bg-gray-900'} ${usedTeams.includes(match.away_team.id) || !canSelect ? 'opacity-40' : ''}`}
                >
                  <StyledText className={`font-bold text-center ${selectedTeam === match.away_team.id ? 'text-black' : 'text-white'}`}>
                    {match.away_team.name}
                  </StyledText>
                  {usedTeams.includes(match.away_team.id) && <StyledText className="text-[10px] text-red-500 font-bold mt-1">USADO</StyledText>}
                  {currentSelection === match.away_team.id && <StyledText className="text-[10px] text-black font-extrabold mt-1">SELECCIONADO</StyledText>}
                </StyledTouch>

              </StyledView>
            </StyledView>
          ))
        )}

        <StyledView className="h-28" />
      </ScrollView>

      {/* Botón de Confirmación Flotante */}
      {selectedTeam && canSelect && (
        <StyledView className="absolute bottom-6 left-4 right-4">
          <StyledTouch 
            onPress={handleConfirm}
            disabled={submitting}
            className="bg-primary p-5 rounded-2xl flex-row justify-center items-center shadow-2xl shadow-primary/40"
          >
            <Trophy size={20} color="black" />
            <StyledText className="text-black font-black text-lg ml-2">
              {submitting ? 'GUARDANDO...' : 'CONFIRMAR SELECCIÓN'}
            </StyledText>
          </StyledTouch>
        </StyledView>
      )}
    </SafeAreaView>
  );
}
