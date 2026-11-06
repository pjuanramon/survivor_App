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
  Users,
  CheckCircle2,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/colors';
import {
  COMPETITIONS,
  COUNTRY_FLAGS,
  EURO_POOL_SHORT_NAMES,
  isEuroSurvivorLeague,
} from '../../constants/competitions';
import { LeagueSelector } from '../../components/leagues/LeagueSelector';
import { CountdownTimer } from '../../components/shared/CountdownTimer';
import { useAppStore } from '../../lib/store';
import { useMatchday } from '../../hooks/useMatchday';
import { useRounds, isVirtualRoundId } from '../../hooks/useRounds';
import { PickSlot } from '../../types/database';

interface MatchRow {
  id: string;
  competition_id: string;
  home_team_id: string;
  away_team_id: string;
  home_score?: number | null;
  away_score?: number | null;
  status?: string | null;
  home_team: { id: string; name: string };
  away_team: { id: string; name: string };
  compShortName?: string;
  compName?: string;
  countryFlag?: string;
}

interface EntryRow {
  id: string;
  entry_name: string;
  is_alive: boolean;
  yellow_cards?: number;
  league_id?: string;
  round_id?: string | null;
}

interface SummaryItem {
  entryId: string;
  entryName: string;
  homeTeamName: string;
  euroTeamName?: string;
}

export default function SelectScreen() {
  const router = useRouter();
  const { activeLeague } = useAppStore();
  const { config, loading: configLoading } = useMatchday(activeLeague?.competition_id);
  const { activeRound } = useRounds(activeLeague);

  const isEuroDouble = isEuroSurvivorLeague(activeLeague, activeRound?.game_mode);

  const [homeMatches, setHomeMatches] = useState<MatchRow[]>([]);
  const [euroMatches, setEuroMatches] = useState<MatchRow[]>([]);
  const [activeSlot, setActiveSlot] = useState<PickSlot>('home');
  const [euroFilter, setEuroFilter] = useState<string>('all');

  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);

  const [selectedHomeTeam, setSelectedHomeTeam] = useState<string | null>(null);
  const [selectedEuroTeam, setSelectedEuroTeam] = useState<string | null>(null);
  const [savedHomeTeam, setSavedHomeTeam] = useState<string | null>(null);
  const [savedEuroTeam, setSavedEuroTeam] = useState<string | null>(null);

  const [dataLoading, setDataLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [usedTeams, setUsedTeams] = useState<string[]>([]);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [picksSummary, setPicksSummary] = useState<SummaryItem[]>([]);

  const isDeadlinePassed = config.picks_deadline ? new Date() >= new Date(config.picks_deadline) : false;
  const isCurrentJornadaClosed = configLoading ? null : (!config.picks_open || isDeadlinePassed);
  const targetJornada = configLoading ? null : config.current_jornada;

  // 1. Cargar vidas vivas del usuario en la liga/ronda activa
  const fetchEntries = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || (await supabase.auth.getUser()).data?.user;
      if (!user || !activeLeague?.id) {
        setEntries([]);
        return;
      }

      let entriesQuery = supabase
        .from('sur_entries')
        .select('*')
        .eq('player_id', user.id)
        .eq('league_id', activeLeague.id)
        .eq('is_alive', true);

      if (activeRound?.id && !isVirtualRoundId(activeRound.id)) {
        entriesQuery = entriesQuery.or(`round_id.eq.${activeRound.id},round_id.is.null`);
      }

      const { data: entriesData } = await entriesQuery;
      setEntries((entriesData as EntryRow[]) || []);
      if (entriesData && entriesData.length > 0) {
        setSelectedEntry(entriesData[0].id);
      } else {
        setSelectedEntry(null);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
    }
  }, [activeLeague?.id, activeRound?.id]);

  // 2. Cargar partidos: si es Euro-Survivor carga LaLiga (home) + Big 4 Europeas (euro)
  const fetchMatches = useCallback(async (jornada: number) => {
    try {
      setDataLoading(true);
      setActiveSlot('home');

      if (isEuroDouble) {
        const { data: comps } = await supabase
          .from('sur_competitions')
          .select('id, name, short_name, country')
          .in('short_name', ['laliga', ...EURO_POOL_SHORT_NAMES]);

        const compById = new Map<string, any>();
        let laligaId: string | null = null;
        const euroCompIds: string[] = [];

        (comps || []).forEach((c) => {
          compById.set(c.id, c);
          if (c.short_name === 'laliga') laligaId = c.id;
          else euroCompIds.push(c.id);
        });

        const allTargetIds = [laligaId, ...euroCompIds].filter(Boolean) as string[];
        const { data: rawMatches } = await supabase
          .from('sur_matches')
          .select(`
            id,
            competition_id,
            home_team_id,
            away_team_id,
            home_score,
            away_score,
            status,
            home_team:sur_teams!home_team_id(id, name),
            away_team:sur_teams!away_team_id(id, name)
          `)
          .eq('jornada', jornada)
          .in('competition_id', allTargetIds);

        const enrich = (m: any): MatchRow => {
          const comp = compById.get(m.competition_id);
          return {
            ...m,
            compShortName: comp?.short_name || 'laliga',
            compName: COMPETITIONS[comp?.short_name]?.displayName || comp?.name || 'Liga',
            countryFlag: COUNTRY_FLAGS[comp?.country || 'ES'] || '⚽',
          };
        };

        const enriched = (rawMatches || []).map(enrich);
        setHomeMatches(enriched.filter((m) => m.compShortName === 'laliga'));
        setEuroMatches(enriched.filter((m) => m.compShortName !== 'laliga'));
      } else {
        let query = supabase
          .from('sur_matches')
          .select(`
            id,
            competition_id,
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
        setHomeMatches((matchesData as any) || []);
        setEuroMatches([]);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setDataLoading(false);
    }
  }, [activeLeague?.competition_id, isEuroDouble]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    if (!configLoading && targetJornada !== null) {
      fetchMatches(targetJornada);
    }
  }, [configLoading, targetJornada, fetchMatches]);

  // 3. Cargar equipos ya usados en esta ronda y selección actual de ambos slots
  const fetchEntrySelections = useCallback(async (entryId: string, jornada: number) => {
    const { data: allSelections } = await supabase
      .from('sur_selections')
      .select('*')
      .eq('entry_id', entryId);

    if (allSelections) {
      const roundStartJ = activeRound?.start_jornada || 1;
      const pastUsed = allSelections
        .filter((s: any) => s.jornada >= roundStartJ && s.jornada < jornada)
        .map((s: any) => s.team_id);
      setUsedTeams(pastUsed);

      const currentJornadaSels = allSelections.filter((s: any) => s.jornada === jornada);
      const hSel =
        currentJornadaSels.find((s: any) => (s.slot || 'home') === 'home') ||
        (!isEuroDouble ? currentJornadaSels[0] : null);
      const eSel = currentJornadaSels.find((s: any) => s.slot === 'euro');

      setSavedHomeTeam(hSel?.team_id || null);
      setSelectedHomeTeam(hSel?.team_id || null);
      setSavedEuroTeam(eSel?.team_id || null);
      setSelectedEuroTeam(eSel?.team_id || null);
    }
  }, [activeRound?.start_jornada, isEuroDouble]);

  useEffect(() => {
    if (selectedEntry && targetJornada !== null) {
      fetchEntrySelections(selectedEntry, targetJornada);
    }
  }, [selectedEntry, targetJornada, fetchEntrySelections]);

  function handleTapTeam(teamId: string) {
    if (usedTeams.includes(teamId)) return;

    if (!isEuroDouble || activeSlot === 'home') {
      setSelectedHomeTeam(teamId);
      // Salto fluido automático a la Bala 2 (Europa) si aún no tiene equipo europeo elegido
      if (isEuroDouble && !selectedEuroTeam) {
        setTimeout(() => setActiveSlot('euro'), 180);
      }
    } else {
      setSelectedEuroTeam(teamId);
    }
  }

  async function buildSummary(jornada: number) {
    const entryIds = entries.map((e) => e.id);
    const { data: selRows } = await supabase
      .from('sur_selections')
      .select('entry_id, slot, team:sur_teams!team_id(name)')
      .in('entry_id', entryIds)
      .eq('jornada', jornada);

    const summaryList: SummaryItem[] = entries.map((entry) => {
      const eSels = (selRows || []).filter((r: any) => r.entry_id === entry.id);
      const hName =
        (eSels.find((r: any) => (r.slot || 'home') === 'home') as any)?.team?.name ||
        (!isEuroDouble ? (eSels[0] as any)?.team?.name : null) ||
        'Pendiente';
      const euName = (eSels.find((r: any) => r.slot === 'euro') as any)?.team?.name || 'Pendiente';

      return {
        entryId: entry.id,
        entryName: entry.entry_name,
        homeTeamName: hName,
        euroTeamName: isEuroDouble ? euName : undefined,
      };
    });

    setPicksSummary(summaryList);
  }

  async function handleConfirm() {
    if (!selectedEntry || targetJornada === null) return;

    if (isCurrentJornadaClosed && targetJornada === config.current_jornada) {
      Alert.alert(
        'Plazo Finalizado',
        `El plazo para la Jornada ${config.current_jornada} ha concluido. Conforme al reglamento, las vidas sin selección reciben automáticamente el colista disponible.`
      );
      return;
    }

    if (!selectedHomeTeam) {
      Alert.alert('Falta Bala 1', 'Selecciona tu equipo de LaLiga primero.');
      setActiveSlot('home');
      return;
    }

    if (isEuroDouble && !selectedEuroTeam) {
      Alert.alert('Falta Bala 2 (Europa)', 'Elige tu equipo europeo (Premier League, Serie A o Bundesliga) para completar tu Ticket Doble.');
      setActiveSlot('euro');
      return;
    }

    if (
      usedTeams.includes(selectedHomeTeam) ||
      (selectedEuroTeam && usedTeams.includes(selectedEuroTeam))
    ) {
      Alert.alert('Equipo repetido', 'Uno de los equipos seleccionados ya fue usado en una jornada anterior de esta ronda.');
      return;
    }

    setSubmitting(true);
    try {
      const roundIdPayload =
        activeRound?.id && !isVirtualRoundId(activeRound.id) ? activeRound.id : undefined;

      if (isEuroDouble) {
        const rows = [
          {
            entry_id: selectedEntry,
            team_id: selectedHomeTeam,
            jornada: targetJornada,
            slot: 'home',
            ...(roundIdPayload ? { round_id: roundIdPayload } : {}),
          },
          {
            entry_id: selectedEntry,
            team_id: selectedEuroTeam!,
            jornada: targetJornada,
            slot: 'euro',
            ...(roundIdPayload ? { round_id: roundIdPayload } : {}),
          },
        ];

        const { error } = await supabase
          .from('sur_selections')
          .upsert(rows, { onConflict: 'entry_id,jornada,slot' });

        if (error) {
          if (error.message.includes('slot') || error.message.includes('ON CONFLICT')) {
            throw new Error(
              'Falta aplicar el script SQL de Migración V5 en Supabase para guardar el Ticket Doble (slot home + euro).'
            );
          }
          throw error;
        }

        setSavedHomeTeam(selectedHomeTeam);
        setSavedEuroTeam(selectedEuroTeam);
      } else {
        // Modo clásico (1 pick por jornada, compatible antes y después de migración V5)
        const v5Attempt = await supabase.from('sur_selections').upsert(
          {
            entry_id: selectedEntry,
            team_id: selectedHomeTeam,
            jornada: targetJornada,
            slot: 'home',
            ...(roundIdPayload ? { round_id: roundIdPayload } : {}),
          },
          { onConflict: 'entry_id,jornada,slot' }
        );

        if (v5Attempt.error) {
          const legacyAttempt = await supabase.from('sur_selections').upsert(
            {
              entry_id: selectedEntry,
              team_id: selectedHomeTeam,
              jornada: targetJornada,
            },
            { onConflict: 'entry_id,jornada' }
          );
          if (legacyAttempt.error) throw legacyAttempt.error;
        }
        setSavedHomeTeam(selectedHomeTeam);
      }

      await buildSummary(targetJornada);
      setSummaryModalVisible(true);
    } catch (error: any) {
      Alert.alert('Aviso', error.message || 'No se pudo guardar la selección');
    } finally {
      setSubmitting(false);
    }
  }

  const isLoading = configLoading || (dataLoading && homeMatches.length === 0 && euroMatches.length === 0);

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
            Tus vidas en esta ronda han sido eliminadas o aún no te has unido a una partida. ¡Puedes entrar a una Sala Abierta desde Inicio!
          </Text>
          <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Ir a Mis Partidas</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const allLoadedTeams = [...homeMatches, ...euroMatches].flatMap((m) => [
    m.home_team,
    m.away_team,
  ]);
  const homeTeamObj = allLoadedTeams.find((t) => t?.id === selectedHomeTeam);
  const euroTeamObj = allLoadedTeams.find((t) => t?.id === selectedEuroTeam);

  const visibleMatches =
    !isEuroDouble || activeSlot === 'home'
      ? homeMatches
      : euroFilter === 'all'
      ? euroMatches
      : euroMatches.filter((m) => m.compShortName === euroFilter);

  const selectedEntryObj = entries.find((e) => e.id === selectedEntry);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>
              {isEuroDouble ? 'Ticket Doble' : 'Elegir Equipo'}
            </Text>
            <Text style={styles.headerSubtitle}>
              Jornada {targetJornada} •{' '}
              {isEuroDouble ? 'Elige 1 LaLiga + 1 Europa' : 'Selecciona 1 ganador'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/rules')} style={styles.rulesPill} activeOpacity={0.7}>
            <BookOpen size={16} color={COLORS.primary} />
            <Text style={styles.rulesPillText}>Reglas</Text>
          </TouchableOpacity>
        </View>

        {/* League Selector */}
        <LeagueSelector />

        {/* Countdown */}
        {config.picks_open && config.picks_deadline && (
          <CountdownTimer
            deadline={config.picks_deadline}
            style={{ marginBottom: 14 }}
          />
        )}

        {/* Closed Picks Notice */}
        {isCurrentJornadaClosed && (
          <View style={styles.closedPicksBanner}>
            <Lock size={18} color={COLORS.warning} style={{ marginRight: 10, marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.closedPicksTitle}>
                ¡Plazo de Jornada {config.current_jornada} cerrado!
              </Text>
              <Text style={styles.closedPicksSub}>
                Los picks de todos los jugadores ya están desbloqueados en la Clasificación.
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/leaderboard')}
                style={styles.viewRivalsBtn}
                activeOpacity={0.8}
              >
                <Users size={14} color="#000000" style={{ marginRight: 6 }} />
                <Text style={styles.viewRivalsBtnText}>Ver Picks de Rivales</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Active Lives Selector */}
        <Text style={styles.sectionTitle}>Tus Vidas Activas</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          {entries.map((entry) => {
            const isSelected = selectedEntry === entry.id;
            const hasYellow = (entry.yellow_cards || 0) > 0;
            return (
              <TouchableOpacity
                key={entry.id}
                onPress={() => setSelectedEntry(entry.id)}
                style={[styles.tab, isSelected && styles.tabSelected]}
                activeOpacity={0.8}
              >
                <Trophy size={15} color={isSelected ? COLORS.textInverse : COLORS.primary} />
                <Text style={[styles.tabText, isSelected && styles.tabTextSelected]}>
                  {entry.entry_name}
                  {hasYellow ? ' 🟨' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {(selectedEntryObj?.yellow_cards || 0) > 0 && (
          <View style={styles.yellowWarningStrip}>
            <Text style={styles.yellowWarningText}>
              🟨 Esta vida tiene 1 Tarjeta Amarilla acumulada: ¡si cualquiera de tus equipos empata hoy recibes la 2ª amarilla y quedas eliminado!
            </Text>
          </View>
        )}

        {/* EURO-SURVIVOR DUAL SLOT STEPPER */}
        {isEuroDouble && (
          <View style={styles.dualStepperContainer}>
            <TouchableOpacity
              onPress={() => setActiveSlot('home')}
              style={[
                styles.slotStepCard,
                activeSlot === 'home' && styles.slotStepCardActive,
              ]}
              activeOpacity={0.85}
            >
              <View style={styles.slotStepHeader}>
                <Text style={styles.slotStepBadge}>1️⃣ BALA CASA</Text>
                {selectedHomeTeam && <CheckCircle2 size={14} color={COLORS.primary} />}
              </View>
              <Text style={styles.slotStepLeague}>🇪🇸 LaLiga</Text>
              <Text
                style={[
                  styles.slotStepPick,
                  selectedHomeTeam && { color: COLORS.primary },
                ]}
                numberOfLines={1}
              >
                {homeTeamObj?.name || 'Toca para elegir...'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveSlot('euro')}
              style={[
                styles.slotStepCard,
                activeSlot === 'euro' && styles.slotStepCardEuroActive,
              ]}
              activeOpacity={0.85}
            >
              <View style={styles.slotStepHeader}>
                <Text style={[styles.slotStepBadge, { color: '#60A5FA' }]}>2️⃣ BALA EUROPA</Text>
                {selectedEuroTeam && <CheckCircle2 size={14} color="#60A5FA" />}
              </View>
              <Text style={styles.slotStepLeague}>🌍 Grandes Ligas</Text>
              <Text
                style={[
                  styles.slotStepPick,
                  selectedEuroTeam && { color: '#60A5FA' },
                ]}
                numberOfLines={1}
              >
                {euroTeamObj?.name || 'Toca para elegir...'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Filtro rápido por país cuando estamos en Bala 2 (Europa) */}
        {isEuroDouble && activeSlot === 'euro' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.euroFilterScroll}>
            {[
              { key: 'all', label: '🌍 Todas (3)' },
              { key: 'premier', label: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier' },
              { key: 'seriea', label: '🇮🇹 Serie A' },
              { key: 'bundesliga', label: '🇩🇪 Bundesliga' },
            ].map((f) => {
              const active = euroFilter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setEuroFilter(f.key)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Matches List */}
        <Text style={styles.sectionTitle}>
          {!isEuroDouble
            ? `Partidos Jornada ${targetJornada}`
            : activeSlot === 'home'
            ? `🇪🇸 Partidos LaLiga (Jornada ${targetJornada})`
            : `🌍 Cartelera Europea (Jornada ${targetJornada})`}
        </Text>

        {visibleMatches.length === 0 ? (
          <View style={styles.noMatchesBox}>
            <Text style={styles.noMatchesText}>
              ⏳ No hay partidos cargados en esta categoría para la Jornada {targetJornada}.
            </Text>
          </View>
        ) : (
          visibleMatches.map((match) => {
            const isHomeUsed = usedTeams.includes(match.home_team?.id);
            const isAwayUsed = usedTeams.includes(match.away_team?.id);

            const currentSlotSelected =
              !isEuroDouble || activeSlot === 'home' ? selectedHomeTeam : selectedEuroTeam;
            const currentSlotSaved =
              !isEuroDouble || activeSlot === 'home' ? savedHomeTeam : savedEuroTeam;

            const isHomeSelected = currentSlotSelected === match.home_team?.id;
            const isAwaySelected = currentSlotSelected === match.away_team?.id;
            const isHomeCurrent = currentSlotSaved === match.home_team?.id;
            const isAwayCurrent = currentSlotSaved === match.away_team?.id;

            return (
              <View key={match.id} style={styles.matchCard}>
                {isEuroDouble && activeSlot === 'euro' && match.compName && (
                  <Text style={styles.matchLeagueTag}>{match.compName}</Text>
                )}

                <View style={styles.matchTeamsRow}>
                  {/* Home Team */}
                  <TouchableOpacity
                    onPress={() => handleTapTeam(match.home_team?.id)}
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
                        <Text style={styles.currentBadgeText}>✅ GUARDADO</Text>
                      </View>
                    )}
                    <Text
                      style={[
                        styles.teamButtonText,
                        isHomeSelected && styles.teamButtonTextSelected,
                        isHomeUsed && styles.teamButtonTextUsed,
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
                    onPress={() => handleTapTeam(match.away_team?.id)}
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
                        <Text style={styles.currentBadgeText}>✅ GUARDADO</Text>
                      </View>
                    )}
                    <Text
                      style={[
                        styles.teamButtonText,
                        isAwaySelected && styles.teamButtonTextSelected,
                        isAwayUsed && styles.teamButtonTextUsed,
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

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Ticket Confirmation Bar */}
      {(selectedHomeTeam || selectedEuroTeam) && (
        <View style={styles.floatingBar}>
          <View style={styles.floatingInfo}>
            <Text style={styles.floatingLabel}>
              {isEuroDouble ? `Ticket Doble J${targetJornada}:` : `Tu Selección J${targetJornada}:`}
            </Text>
            {isEuroDouble ? (
              <Text style={styles.floatingTeam} numberOfLines={1}>
                🇪🇸 {homeTeamObj?.name || '...'}  +  🌍 {euroTeamObj?.name || '...'}
              </Text>
            ) : (
              <Text style={styles.floatingTeam} numberOfLines={1}>
                {homeTeamObj?.name}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={submitting}
            style={[
              styles.confirmBtn,
              isEuroDouble && (!selectedHomeTeam || !selectedEuroTeam) && { opacity: 0.6 },
            ]}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.textInverse} size="small" />
            ) : (
              <>
                <Text style={styles.confirmBtnText}>
                  {isEuroDouble && (!selectedHomeTeam || !selectedEuroTeam) ? 'Siguiente' : 'Confirmar'}
                </Text>
                <ArrowRight size={15} color={COLORS.textInverse} />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Success Summary Modal */}
      <Modal visible={summaryModalVisible} transparent animationType="fade" onRequestClose={() => setSummaryModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.celebrationHeader}>
              <Sparkles size={36} color={COLORS.primary} />
              <Text style={styles.modalTitle}>¡Ticket Sellado! 🔥</Text>
              <Text style={styles.modalSubtitle}>Jornada {targetJornada} • {activeRound?.name || 'Ronda 1'}</Text>
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
                  <Text style={styles.summaryEntryName}>{item.entryName}</Text>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={styles.summaryTeamBadge}>
                      <Text style={styles.summaryTeam}>🇪🇸 {item.homeTeamName}</Text>
                    </View>
                    {item.euroTeamName && (
                      <View style={[styles.summaryTeamBadge, { borderColor: 'rgba(96,165,250,0.4)', backgroundColor: 'rgba(96,165,250,0.12)' }]}>
                        <Text style={[styles.summaryTeam, { color: '#60A5FA' }]}>🌍 {item.euroTeamName}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => { setSummaryModalVisible(false); router.replace('/(tabs)'); }}
              style={styles.modalDoneBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.modalDoneBtnText}>Ver Mis Partidas</Text>
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
  scrollContent: { padding: 20, maxWidth: 620, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headerTitle: { fontSize: 25, fontWeight: '900', color: COLORS.textPrimary },
  headerSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, fontWeight: '600' },
  rulesPill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.surfaceBorder,
  },
  rulesPillText: { color: COLORS.textPrimary, fontWeight: '800', fontSize: 11, marginLeft: 5, textTransform: 'uppercase' },
  closedPicksBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 184, 0, 0.1)', borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.35)', borderRadius: 14, padding: 14, marginBottom: 16,
  },
  closedPicksTitle: { fontSize: 14, fontWeight: '800', color: COLORS.warning, marginBottom: 4 },
  closedPicksSub: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  sectionTitle: {
    fontSize: 13, fontWeight: '800', color: COLORS.textSecondary,
    marginBottom: 10, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  tabsScroll: { marginBottom: 12 },
  tab: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 15, paddingVertical: 9, borderRadius: 14, marginRight: 10,
    borderWidth: 1, borderColor: COLORS.surfaceBorder,
  },
  tabSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { color: COLORS.textPrimary, fontWeight: '800', fontSize: 13, marginLeft: 7 },
  tabTextSelected: { color: COLORS.textInverse },
  yellowWarningStrip: {
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  yellowWarningText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FBBF24',
    lineHeight: 16,
  },
  dualStepperContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  slotStepCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
  },
  slotStepCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySubtle,
  },
  slotStepCardEuroActive: {
    borderColor: '#60A5FA',
    backgroundColor: 'rgba(96, 165, 250, 0.09)',
  },
  slotStepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  slotStepBadge: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.4,
  },
  slotStepLeague: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  slotStepPick: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 4,
  },
  euroFilterScroll: {
    marginBottom: 14,
  },
  filterChip: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 7,
    marginRight: 8,
  },
  filterChipActive: {
    borderColor: '#60A5FA',
    backgroundColor: 'rgba(96, 165, 250, 0.16)',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: '#93C5FD',
    fontWeight: '800',
  },
  noMatchesBox: {
    backgroundColor: COLORS.surfaceElevated, padding: 20, borderRadius: 14,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.surfaceBorder,
  },
  noMatchesText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  matchCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: COLORS.surfaceBorder,
  },
  matchLeagueTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#93C5FD',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  matchTeamsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  teamButton: {
    flex: 1, backgroundColor: COLORS.surfaceElevated, paddingVertical: 15,
    paddingHorizontal: 10, borderRadius: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.surfaceBorder, minHeight: 78,
    justifyContent: 'center',
  },
  teamButtonSelected: { backgroundColor: COLORS.primaryMuted, borderColor: COLORS.primary },
  teamButtonUsed: { backgroundColor: COLORS.deadBg, borderColor: COLORS.deadBorder, opacity: 0.8 },
  teamButtonCurrent: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySubtle },
  teamButtonText: { color: COLORS.textPrimary, fontWeight: '800', fontSize: 13, textAlign: 'center' },
  teamButtonTextSelected: { color: COLORS.primary },
  teamButtonTextUsed: { color: '#EF4444', textDecorationLine: 'line-through' },
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
  },
  currentBadgeText: { fontSize: 8, fontWeight: '900', color: COLORS.textInverse },
  vsBadge: { paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  vsText: { color: COLORS.textMuted, fontWeight: '900', fontSize: 11 },
  floatingBar: {
    position: 'absolute', bottom: 18, left: 16, right: 16, maxWidth: 580, alignSelf: 'center',
    backgroundColor: COLORS.surfaceElevated, borderRadius: 18, borderWidth: 1.5,
    borderColor: COLORS.primary, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 8,
  },
  floatingInfo: { flex: 1, marginRight: 10 },
  floatingLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700' },
  floatingTeam: { fontSize: 13, fontWeight: '800', color: COLORS.primary, marginTop: 2 },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary,
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12,
  },
  confirmBtnText: { color: COLORS.textInverse, fontWeight: '900', fontSize: 13, marginRight: 5 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 19 },
  backBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  backBtnText: { color: COLORS.textInverse, fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: {
    backgroundColor: COLORS.surface, borderRadius: 20, borderWidth: 1,
    borderColor: COLORS.surfaceBorder, width: '100%', maxWidth: 480, padding: 24,
  },
  celebrationHeader: { alignItems: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: COLORS.textPrimary, marginTop: 10, marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: COLORS.textSecondary },
  summaryList: { maxHeight: 260, marginBottom: 20 },
  summaryItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: COLORS.surfaceBorder,
  },
  summaryItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySubtle,
  },
  summaryEntryName: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  summaryTeamBadge: {
    backgroundColor: COLORS.primaryMuted,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  summaryTeam: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  modalDoneBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalDoneBtnText: { color: COLORS.textInverse, fontWeight: '900', fontSize: 15 },
  viewRivalsBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary,
    borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14, marginTop: 10, alignSelf: 'flex-start',
  },
  viewRivalsBtnText: { color: COLORS.textInverse, fontWeight: '800', fontSize: 12 },
});
