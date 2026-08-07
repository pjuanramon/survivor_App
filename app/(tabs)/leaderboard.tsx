import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Trophy, Skull } from 'lucide-react-native';

interface Entry {
  id: string;
  entry_name: string;
  is_alive: boolean;
  total_points: number;
  total_gf: number;
  profiles: { username: string } | null;
}

export default function LeaderboardScreen() {
  const [leaderboard, setLeaderboard] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  async function fetchLeaderboard() {
    const { data, error } = await supabase
      .from('sur_entries')
      .select(`
        id,
        entry_name,
        is_alive,
        total_points,
        total_gf,
        profiles:sur_profiles(username)
      `)
      .order('is_alive', { ascending: false })
      .order('total_points', { ascending: false })
      .order('total_gf', { ascending: false });

    if (!error && data) {
      setLeaderboard(data as any);
    }
    setLoading(false);
    setRefreshing(false);
  }

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard();
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
        <View style={styles.header}>
          <Text style={styles.title}>Clasificación General</Text>
          <Text style={styles.subtitle}>Ranking de Supervivientes La Liga 26/27</Text>
        </View>

        {leaderboard.length === 0 ? (
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
    marginBottom: 24,
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
});
