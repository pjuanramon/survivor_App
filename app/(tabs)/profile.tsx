import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { styled } from 'nativewind';
import { supabase } from '../../lib/supabase';
import { LogOut, BookOpen, User as UserIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouch = styled(TouchableOpacity);

export default function ProfileScreen() {
  const router = useRouter();

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Error', error.message);
  }

  return (
    <SafeAreaView className="flex-1 bg-background p-6">
      <StyledView className="items-center mt-10">
        <StyledView className="w-24 h-24 bg-surface rounded-full items-center justify-center border-2 border-primary mb-4">
          <UserIcon size={40} color="#00FF9D" />
        </StyledView>
        <StyledText className="text-white text-2xl font-black">Mi Perfil</StyledText>
      </StyledView>

      <StyledView className="mt-10 space-y-4">
        <StyledTouch 
          onPress={() => router.push('/rules')}
          className="bg-surface p-5 rounded-3xl flex-row items-center border border-gray-800 mb-4"
        >
          <BookOpen size={20} color="#00FF9D" />
          <StyledText className="text-white font-bold ml-4 text-lg">Reglamento Oficial</StyledText>
        </StyledTouch>

        <StyledTouch 
          onPress={handleSignOut}
          className="bg-red-900/20 p-5 rounded-3xl flex-row items-center border border-red-900/30 mt-6"
        >
          <LogOut size={20} color="#EF4444" />
          <StyledText className="text-red-500 font-bold ml-4 text-lg">Cerrar Sesión</StyledText>
        </StyledTouch>
      </StyledView>
    </SafeAreaView>
  );
}
