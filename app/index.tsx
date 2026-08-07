import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, SafeAreaView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { Trophy, Shield } from 'lucide-react-native';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  async function handleSubmit() {
    if (!email || !password) {
      Alert.alert('Atención', 'Por favor ingresa tu email y contraseña.');
      return;
    }

    setLoading(true);
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });
      if (error) Alert.alert('Error', error.message);
      else Alert.alert('¡Cuenta creada!', 'Revisa tu email o inicia sesión.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });
      if (error) Alert.alert('Error de inicio de sesión', error.message);
    }
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <View style={styles.contentContainer}>
          {/* Header Logo */}
          <View style={styles.header}>
            <View style={styles.iconBadge}>
              <Trophy size={38} color="#00FF9D" />
            </View>
            <Text style={styles.title}>SURVIVOR</Text>
            <Text style={styles.subtitle}>La Liga 26/27 — ¿Quién será el último en pie?</Text>
          </View>

          {/* Form Box */}
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo electrónico</Text>
              <TextInput
                style={styles.input}
                placeholder="tu@email.com"
                placeholderTextColor="#666666"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#666666"
                secureTextEntry={true}
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <TouchableOpacity 
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
              style={[styles.button, loading && styles.buttonDisabled]}
            >
              <Text style={styles.buttonText}>
                {loading ? 'PROCESANDO...' : (isSignUp ? 'REGISTRARME' : 'ENTRAR A LA LIGA')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setIsSignUp(!isSignUp)}
              style={styles.toggleButton}
            >
              <Text style={styles.toggleText}>
                {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate aquí'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer Badge */}
          <View style={styles.footer}>
            <Shield size={14} color="#888888" />
            <Text style={styles.footerText}> Edición Oficial 2026/2027</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
    backgroundColor: '#0A0A0A',
  },
  contentContainer: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'stretch',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0, 255, 157, 0.12)',
    borderWidth: 1.5,
    borderColor: '#00FF9D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#00FF9D',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    color: '#888888',
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#161616',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#262626',
    boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.5)',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0F0F0F',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#333333',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#00FF9D',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#00FF9D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  toggleButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  toggleText: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  footerText: {
    color: '#666666',
    fontSize: 12,
    fontWeight: '500',
  },
});
