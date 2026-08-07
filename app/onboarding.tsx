import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { styled } from 'nativewind';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouch = styled(TouchableOpacity);

export default function OnboardingScreen() {
  const [pickCount, setPickCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  React.useEffect(() => {
    checkExistingEntries();
  }, []);

  async function checkExistingEntries() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: entries } = await supabase
        .from('sur_entries')
        .select('id')
        .eq('player_id', user.id);
      if (entries && entries.length > 0) {
        router.replace('/(tabs)');
      }
    }
  }

  async function handleConfirm() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    try {
      // 1. Check again to prevent duplicate creation
      const { data: existing } = await supabase
        .from('sur_entries')
        .select('id')
        .eq('player_id', user.id);

      if (existing && existing.length > 0) {
        router.replace('/(tabs)');
        return;
      }

      // 2. Crear el perfil si no existe
      await supabase.from('sur_profiles').upsert({ 
        id: user.id, 
        username: user.email?.split('@')[0] || 'User' 
      });

      // 3. Crear los picks
      const entries = Array.from({ length: pickCount }).map((_, i) => ({
        player_id: user.id,
        entry_name: `Pick ${i + 1}`,
      }));

      const { error } = await supabase.from('sur_entries').insert(entries);

      if (error) throw error;

      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background p-6">
      <StyledView className="flex-1 justify-center">
        <StyledText className="text-primary text-4xl font-black mb-4">¿CUÁNTAS VIDAS?</StyledText>
        <StyledText className="text-muted text-xl mb-10">
          Puedes comprar hasta 5 picks. Cada pick es una oportunidad independiente de sobrevivir.
        </StyledText>

        <StyledView className="flex-row justify-between items-center bg-surface p-8 rounded-3xl mb-10">
          <StyledTouch 
            onPress={() => setPickCount(Math.max(1, pickCount - 1))}
            className="w-16 h-16 bg-gray-800 rounded-full items-center justify-center"
          >
            <StyledText className="text-white text-3xl">-</StyledText>
          </StyledTouch>

          <StyledText className="text-white text-7xl font-black">{pickCount}</StyledText>

          <StyledTouch 
            onPress={() => setPickCount(Math.min(5, pickCount + 1))}
            className="w-16 h-16 bg-primary rounded-full items-center justify-center"
          >
            <StyledText className="text-black text-3xl">+</StyledText>
          </StyledTouch>
        </StyledView>

        <StyledTouch 
          onPress={handleConfirm}
          disabled={loading}
          className="bg-primary p-6 rounded-2xl items-center shadow-2xl shadow-primary/40 mb-4"
        >
          <StyledText className="text-black font-extrabold text-xl">
            {loading ? 'CREANDO...' : `CONFIRMAR ${pickCount} PICKS`}
          </StyledText>
        </StyledTouch>

        <StyledTouch 
          onPress={() => router.push('/rules')}
          className="p-3 items-center"
        >
          <StyledText className="text-muted text-sm underline">Consultar Reglamento Oficial</StyledText>
        </StyledTouch>
      </StyledView>
    </SafeAreaView>
  );
}
