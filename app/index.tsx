import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { Trophy, Shield, AlertCircle, CheckCircle2 } from 'lucide-react-native';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit() {
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage('Por favor ingresa tu correo electrónico y contraseña.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
        });

        if (error) {
          if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already exists')) {
            setErrorMessage('Este correo ya está registrado. Haz clic en "INICIAR SESIÓN" arriba.');
          } else {
            setErrorMessage(error.message);
          }
        } else if (data?.user && data?.session) {
          setSuccessMessage('¡Cuenta creada con éxito! Entrando a la liga...');
        } else if (data?.user) {
          setSuccessMessage('📩 ¡Cuenta creada! Si tu Supabase solicita confirmación, revisa tu correo (o carpeta de spam) para activarla.');
          setIsSignUp(false);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

        if (error) {
          if (error.message.toLowerCase().includes('email not confirmed')) {
            setErrorMessage('⚠️ Tu cuenta aún no ha sido confirmada por correo. Revisa tu bandeja de entrada o spam para hacer clic en el enlace.');
          } else if (error.message.toLowerCase().includes('invalid login credentials')) {
            setErrorMessage('Correo o contraseña incorrectos. Verifica que la contraseña sea la misma con la que te registraste.');
          } else {
            setErrorMessage(error.message);
          }
        } else if (data?.session) {
          setSuccessMessage('¡Bienvenido de nuevo! Entrando...');
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Ocurrió un error inesperado al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
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
            <Text style={styles.title}>FUTVIVOR</Text>
            <Text style={styles.subtitle}>LaLiga & Liga MX — ¿Quién será el último en pie?</Text>
          </View>

          {/* Form Box */}
          <View style={styles.card}>
            <View style={styles.modeRow}>
              <TouchableOpacity 
                onPress={() => { setIsSignUp(false); setErrorMessage(null); setSuccessMessage(null); }}
                style={[styles.tabToggle, !isSignUp && styles.tabToggleActive]}
              >
                <Text style={[styles.tabToggleText, !isSignUp && styles.tabToggleTextActive]}>INICIAR SESIÓN</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => { setIsSignUp(true); setErrorMessage(null); setSuccessMessage(null); }}
                style={[styles.tabToggle, isSignUp && styles.tabToggleActive]}
              >
                <Text style={[styles.tabToggleText, isSignUp && styles.tabToggleTextActive]}>REGISTRARME</Text>
              </TouchableOpacity>
            </View>

            {/* Error Banner */}
            {errorMessage && (
              <View style={styles.errorBox}>
                <AlertCircle size={18} color="#EF4444" style={{ marginRight: 8 }} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Success Banner */}
            {successMessage && (
              <View style={styles.successBox}>
                <CheckCircle2 size={18} color="#00FF9D" style={{ marginRight: 8 }} />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            )}

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
                {loading ? 'PROCESANDO...' : (isSignUp ? 'CREAR MI CUENTA' : 'ENTRAR A LA LIGA')}
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
    marginBottom: 28,
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
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    color: '#888888',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#161616',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#262626',
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: '#0F0F0F',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#222222',
  },
  tabToggle: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabToggleActive: {
    backgroundColor: '#00FF9D',
  },
  tabToggleText: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tabToggleTextActive: {
    color: '#000000',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  errorText: {
    color: '#F87171',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
    fontWeight: '600',
  },
  successBox: {
    backgroundColor: 'rgba(0, 255, 157, 0.12)',
    borderColor: 'rgba(0, 255, 157, 0.3)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  successText: {
    color: '#00FF9D',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 13,
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
    fontSize: 15,
  },
  button: {
    backgroundColor: '#00FF9D',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#666666',
    fontSize: 12,
    fontWeight: '500',
  },
});
