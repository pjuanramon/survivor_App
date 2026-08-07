import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledInput = styled(TextInput);
const StyledTouch = styled(TouchableOpacity);

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) Alert.alert(error.message);
    setLoading(false);
  }

  async function signUpWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) Alert.alert('Revisa tu email para confirmar la cuenta');
    setLoading(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-center px-6"
      >
        <StyledView className="items-center mb-10">
          <StyledText className="text-primary text-5xl font-bold mb-2">SURVIVOR</StyledText>
          <StyledText className="text-muted text-lg">¿Quién será el último en pie?</StyledText>
        </StyledView>

        <StyledView className="space-y-4">
          <StyledView>
            <StyledText className="text-white mb-2 ml-1">Email</StyledText>
            <StyledInput
              className="bg-surface text-white p-4 rounded-2xl border border-gray-800"
              placeholder="tu@email.com"
              placeholderTextColor="#555"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />
          </StyledView>

          <StyledView>
            <StyledText className="text-white mb-2 ml-1">Contraseña</StyledText>
            <StyledInput
              className="bg-surface text-white p-4 rounded-2xl border border-gray-800"
              placeholder="••••••••"
              placeholderTextColor="#555"
              secureTextEntry={true}
              value={password}
              onChangeText={setPassword}
            />
          </StyledView>

          <StyledTouch 
            onPress={signInWithEmail}
            disabled={loading}
            className="bg-primary p-5 rounded-2xl items-center mt-4 shadow-lg shadow-primary/20"
          >
            <StyledText className="text-black font-bold text-lg">
              {loading ? 'Cargando...' : 'Entrar'}
            </StyledText>
          </StyledTouch>

          <StyledTouch 
            onPress={signUpWithEmail}
            disabled={loading}
            className="p-4 items-center"
          >
            <StyledText className="text-muted">¿No tienes cuenta? Regístrate</StyledText>
          </StyledTouch>
        </StyledView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
