import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { styled } from 'nativewind';
import { supabase } from '../../lib/supabase';
import { Trophy, Skull, Medal } from 'lucide-react-native';

const StyledView = styled(View);
const StyledText = styled(Text);

interface Entry {
  id: string;
  entry_name: string;
  is_alive: boolean;
  total_points: number;
  total_gf: number;
  profiles: { username: string };
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
    <StyledView className="flex-1 bg-background justify-center items-center">
      <ActivityIndicator color="#00FF9D" size="large" />
    </StyledView>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView 
        className="p-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00FF9D" />}
      >
        <StyledText className="text-white text-3xl font-black mb-6 mt-4">Clasificación</StyledText>
        
        {leaderboard.map((entry, index) => (
          <StyledView 
            key={entry.id} 
            className={`bg-surface rounded-3xl p-5 mb-4 border ${entry.is_alive ? 'border-gray-800' : 'border-red-900/30 opacity-60'}`}
          >
            <StyledView className="flex-row justify-between items-center">
              <StyledView className="flex-row items-center">
                <StyledView className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${entry.is_alive ? 'bg-primary/20' : 'bg-red-500/20'}`}>
                  {entry.is_alive ? (
                    <Trophy size={20} color="#00FF9D" />
                  ) : (
                    <Skull size={20} color="#EF4444" />
                  )}
                </StyledView>
                <StyledView>
                  <StyledText className="text-white font-bold text-lg">{entry.profiles.username}</StyledText>
                  <StyledText className="text-muted text-xs">{entry.entry_name}</StyledText>
                </StyledView>
              </StyledView>
              
              <StyledView className="items-end">
                <StyledText className={`font-black text-2xl ${entry.is_alive ? 'text-primary' : 'text-red-500'}`}>
                  {entry.is_alive ? 'VIVO' : 'RIP'}
                </StyledText>
                <StyledText className="text-white text-xs">#{index + 1}</StyledText>
              </StyledView>
            </StyledView>

            {/* Stats Bento Row */}
            <StyledView className="flex-row mt-4 space-x-2">
              <StyledView className="flex-1 bg-gray-900/50 p-3 rounded-2xl items-center border border-gray-800/50">
                <StyledText className="text-muted text-[10px] mb-1">PUNTOS</StyledText>
                <StyledText className="text-white font-black text-lg">{entry.total_points}</StyledText>
              </StyledView>
              <StyledView className="flex-1 bg-gray-900/50 p-3 rounded-2xl items-center border border-gray-800/50">
                <StyledText className="text-muted text-[10px] mb-1">GOLES</StyledText>
                <StyledText className="text-white font-black text-lg">{entry.total_gf}</StyledText>
              </StyledView>
            </StyledView>
          </StyledView>
        ))}

        <StyledView className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
