import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, ActivityIndicator, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Trophy, Skull, ShieldAlert, ArrowRight, BookOpen, Clock } from 'lucide-react-native';
import { useRouter } from 'expo-router';

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

      const { data: entriesData } = await supabase
        .from('sur_entries')
        .select('id, entry_name, is_alive, total_points, total_gf')
        .eq('player_id', user.id);

      if (!entriesData || entriesData.length === 0) {
        setPicks([]);
        return;
      }

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
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Mis Picks</Text>
            <Text style={styles.headerSubtitle}>Jornada {config.current_jornada} Activa</Text>
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

        {/* Deadline Notice */}
        {config.picks_deadline && (
          <View style={styles.noticeBanner}>
            <Clock size={18} color="#00FF9D" style={{ marginRight: 8 }} />
            <Text style={styles.noticeText}>
              Cierre J{config.current_jornada}:{' '}
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
                {new Date(config.picks_deadline).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </Text>
          </View>
        )}

        {/* Picks Cards */}
        {picks.length === 0 ? (
          <View style={styles.emptyCard}>
            <ShieldAlert size={48} color="#F59E0B" />
            <Text style={styles.emptyTitle}>Sin vidas creadas</Text>
            <Text style={styles.emptySubtitle}>Aún no tienes picks configurados para esta temporada.</Text>
            <TouchableOpacity 
              onPress={() => router.replace('/onboarding')}
              style={styles.actionBtn}
            >
              <Text style={styles.actionBtnText}>Crear Picks</Text>
            </TouchableOpacity>
          </View>
        ) : (
          picks.map((pick) => (
            <View 
              key={pick.id} 
              style={[styles.pickCard, !pick.is_alive && styles.pickCardDead]}
            >
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.pickBadgeRow}>
                  <View style={[styles.statusIconCircle, pick.is_alive ? styles.statusCircleAlive : styles.statusCircleDead]}>
                    {pick.is_alive ? <Trophy size={16} color="#00FF9D" /> : <Skull size={16} color="#EF4444" />}
                  </View>
                  <Text style={styles.pickName}>{pick.entry_name}</Text>
                </View>

                <View style={[styles.statusTag, pick.is_alive ? styles.tagAlive : styles.tagDead]}>
                  <Text style={[styles.tagText, pick.is_alive ? styles.tagTextAlive : styles.tagTextDead]}>
                    {pick.is_alive ? 'VIVO' : 'ELIMINADO'}
                  </Text>
                </View>
              </View>

              {/* Selection Section */}
              <View style={styles.selectionBox}>
                <Text style={styles.selectionLabel}>
                  SELECCIÓN JORNADA {config.current_jornada}
                </Text>
                {pick.current_team_name ? (
                  <View>
                    <Text style={styles.teamName}>{pick.current_team_name}</Text>
                    {pick.current_match_vs && (
                      <Text style={styles.matchVs}>{pick.current_match_vs}</Text>
                    )}
                  </View>
                ) : (
                  <View style={styles.pendingRow}>
                    <Text style={styles.pendingText}>⚠️ Pendiente de seleccionar</Text>
                    {pick.is_alive && (
                      <TouchableOpacity 
                        onPress={() => router.push('/(tabs)/select')}
                        style={styles.selectBtn}
                      >
                        <Text style={styles.selectBtnText}>Elegir</Text>
                        <ArrowRight size={14} color="#00FF9D" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              {/* Stats Row */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>PUNTOS</Text>
                  <Text style={styles.statValue}>{pick.total_points}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>GOLES A FAVOR</Text>
                  <Text style={styles.statValue}>{pick.total_gf}</Text>
                </View>
              </View>
            </View>
          ))
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
  noticeBanner: {
    backgroundColor: '#161616',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  noticeText: {
    color: '#888888',
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: '#161616',
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#888888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  actionBtn: {
    backgroundColor: '#00FF9D',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionBtnText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 15,
  },
  pickCard: {
    backgroundColor: '#161616',
    padding: 22,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#262626',
    marginBottom: 20,
  },
  pickCardDead: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pickBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  statusCircleAlive: {
    backgroundColor: 'rgba(0, 255, 157, 0.15)',
  },
  statusCircleDead: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  pickName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  statusTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  tagAlive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  tagDead: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '900',
  },
  tagTextAlive: {
    color: '#34D399',
  },
  tagTextDead: {
    color: '#F87171',
  },
  selectionBox: {
    backgroundColor: '#0F0F0F',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222222',
    marginBottom: 16,
  },
  selectionLabel: {
    color: '#888888',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  teamName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  matchVs: {
    color: '#00FF9D',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  pendingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingText: {
    color: '#FBBF24',
    fontSize: 14,
    fontWeight: '700',
  },
  selectBtn: {
    backgroundColor: 'rgba(0, 255, 157, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 157, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectBtnText: {
    color: '#00FF9D',
    fontSize: 12,
    fontWeight: '800',
    marginRight: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statItem: {
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
});
