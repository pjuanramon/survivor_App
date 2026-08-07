import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { styled } from 'nativewind';
import { supabase } from '../../lib/supabase';
import { Trophy, Skull, ShieldAlert, ArrowRight, BookOpen, Clock } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouch = styled(TouchableOpacity);

interface Config {
  current_jornada: number;
  picks_open: boolean;
  picks_deadline?: string;
}

interface PickDetail {
  id: string;
  entry_name: string;
  is_alive: boolean;
  total_points: number;
  total_gf: number;
  current_team_name?: string | null;
  current_match_vs?: string | null;
}

export default function DashboardScreen() {
  const router = useRouter();
  const [config, setConfig] = useState<Config>({ current_jornada: 1, picks_open: true });
  const [picks, setPicks] = useState<PickDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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

      // 2. Fetch User Entries
      const { data: entriesData } = await supabase
        .from('sur_entries')
        .select('id, entry_name, is_alive, total_points, total_gf')
        .eq('player_id', user.id);

      if (!entriesData || entriesData.length === 0) {
        setPicks([]);
        return;
      }

      // 3. For each entry, fetch selection for current_jornada
      const picksWithDetails: PickDetail[] = await Promise.all(
        entriesData.map(async (entry) => {
          const { data: selData } = await supabase
            .from('sur_selections')
            .select(`
              team_id,
              team:sur_teams!team_id(name)
            `)
            .eq('entry_id', entry.id)
            .eq('jornada', activeJornada)
            .maybeSingle();

          let teamName = (selData as any)?.team?.name || null;
          let matchVs = null;

          if (teamName) {
            // Find match opponent for current jornada
            const { data: matchData } = await supabase
              .from('sur_matches')
              .select(`
                home_team:sur_teams!home_team_id(id, name),
                away_team:sur_teams!away_team_id(id, name)
              `)
              .eq('jornada', activeJornada)
              .or(`home_team_id.eq.${(selData as any).team_id},away_team_id.eq.${(selData as any).team_id}`)
              .maybeSingle();

            if (matchData) {
              const home = (matchData as any).home_team.name;
              const away = (matchData as any).away_team.name;
              matchVs = home === teamName ? `vs ${away} (Local)` : `@ ${home} (Visitante)`;
            }
          }

          return {
            ...entry,
            current_team_name: teamName,
            current_match_vs: matchVs,
          };
        })
      );

      setPicks(picksWithDetails);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) return (
    <StyledView className="flex-1 bg-background justify-center items-center">
      <ActivityIndicator color="#00FF9D" size="large" />
    </StyledView>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView 
        className="p-5"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00FF9D" />}
      >
        {/* Top Header */}
        <StyledView className="flex-row justify-between items-center mt-2 mb-6">
          <StyledView>
            <StyledText className="text-white text-3xl font-black">Mis Picks</StyledText>
            <StyledText className="text-primary font-bold text-sm">Jornada {config.current_jornada} Activa</StyledText>
          </StyledView>

          <StyledTouch 
            onPress={() => router.push('/rules')}
            className="flex-row items-center bg-surface px-3 py-2 rounded-full border border-gray-800"
          >
            <BookOpen size={16} color="#00FF9D" />
            <StyledText className="text-white text-xs font-bold ml-1.5">Reglas</StyledText>
          </StyledTouch>
        </StyledView>

        {/* Deadline Notice */}
        {config.picks_deadline && (
          <StyledView className="bg-surface p-4 rounded-2xl mb-6 border border-gray-800 flex-row items-center">
            <Clock size={18} color="#00FF9D" />
            <StyledText className="text-muted text-xs ml-2 font-medium">
              Cierre de selección J{config.current_jornada}:{' '}
              <StyledText className="text-white font-bold">
                {new Date(config.picks_deadline).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </StyledText>
            </StyledText>
          </StyledView>
        )}

        {/* Picks Cards */}
        {picks.length === 0 ? (
          <StyledView className="bg-surface p-8 rounded-3xl border border-gray-800 items-center">
            <ShieldAlert size={40} color="#F59E0B" />
            <StyledText className="text-white text-xl font-bold mt-4 text-center">Sin vidas creadas</StyledText>
            <StyledText className="text-muted text-center mt-2 mb-6">
              Aún no tienes picks configurados para esta temporada.
            </StyledText>
            <StyledTouch 
              onPress={() => router.replace('/onboarding')}
              className="bg-primary px-6 py-4 rounded-2xl"
            >
              <StyledText className="text-black font-extrabold text-base">Crear Picks</StyledText>
            </StyledTouch>
          </StyledView>
        ) : (
          picks.map((pick) => (
            <StyledView 
              key={pick.id} 
              className={`bg-surface p-6 rounded-3xl border mb-5 ${pick.is_alive ? 'border-gray-800' : 'border-red-900/40 opacity-70'}`}
            >
              {/* Card Header */}
              <StyledView className="flex-row justify-between items-center mb-4">
                <StyledView className="flex-row items-center">
                  <StyledView className={`w-8 h-8 rounded-full items-center justify-center mr-2.5 ${pick.is_alive ? 'bg-primary/20' : 'bg-red-500/20'}`}>
                    {pick.is_alive ? <Trophy size={16} color="#00FF9D" /> : <Skull size={16} color="#EF4444" />}
                  </StyledView>
                  <StyledText className="text-white text-lg font-black">{pick.entry_name}</StyledText>
                </StyledView>

                <StyledView className={`px-3 py-1 rounded-full ${pick.is_alive ? 'bg-emerald-950 border border-emerald-800/50' : 'bg-red-950 border border-red-800/50'}`}>
                  <StyledText className={`text-xs font-black ${pick.is_alive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {pick.is_alive ? 'VIVO' : 'ELIMINADO'}
                  </StyledText>
                </StyledView>
              </StyledView>

              {/* Selection info for active jornada */}
              <StyledView className="bg-gray-900/60 p-4 rounded-2xl border border-gray-800/60 mb-4">
                <StyledText className="text-muted text-[10px] font-bold uppercase tracking-wider mb-1">
                  Selección Jornada {config.current_jornada}
                </StyledText>
                {pick.current_team_name ? (
                  <StyledView>
                    <StyledText className="text-white text-2xl font-black">{pick.current_team_name}</StyledText>
                    {pick.current_match_vs && (
                      <StyledText className="text-primary text-xs font-bold mt-0.5">{pick.current_match_vs}</StyledText>
                    )}
                  </StyledView>
                ) : (
                  <StyledView className="flex-row justify-between items-center mt-1">
                    <StyledText className="text-amber-400 text-sm font-bold">⚠️ Pendiente de seleccionar</StyledText>
                    {pick.is_alive && (
                      <StyledTouch 
                        onPress={() => router.push('/(tabs)/select')}
                        className="bg-primary/20 border border-primary/40 px-3 py-1.5 rounded-xl flex-row items-center"
                      >
                        <StyledText className="text-primary text-xs font-bold mr-1">Elegir</StyledText>
                        <ArrowRight size={12} color="#00FF9D" />
                      </StyledTouch>
                    )}
                  </StyledView>
                )}
              </StyledView>

              {/* Bento Stats */}
              <StyledView className="flex-row space-x-2">
                <StyledView className="flex-1 bg-gray-900/40 p-3 rounded-2xl items-center border border-gray-800/40">
                  <StyledText className="text-muted text-[10px] font-bold mb-0.5">PUNTOS</StyledText>
                  <StyledText className="text-white font-black text-lg">{pick.total_points}</StyledText>
                </StyledView>
                <StyledView className="flex-1 bg-gray-900/40 p-3 rounded-2xl items-center border border-gray-800/40">
                  <StyledText className="text-muted text-[10px] font-bold mb-0.5">GOLES A FAVOR</StyledText>
                  <StyledText className="text-white font-black text-lg">{pick.total_gf}</StyledText>
                </StyledView>
              </StyledView>
            </StyledView>
          ))
        )}

        <StyledView className="h-16" />
      </ScrollView>
    </SafeAreaView>
  );
}
