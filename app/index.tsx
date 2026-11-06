import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Shield, AlertCircle, CheckCircle2, ArrowRight, Flame } from 'lucide-react-native';
import { COLORS } from '../constants/colors';

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
      setErrorMessage('Ingresa tu correo electrónico y contraseña.');
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
          if (
            error.message.toLowerCase().includes('already registered') ||
            error.message.toLowerCase().includes('already exists')
          ) {
            setErrorMessage('Este correo ya está registrado. Cambia a "ENTRAR" arriba.');
          } else {
            setErrorMessage(error.message);
          }
        } else if (data?.user && data?.session) {
          setSuccessMessage('Cuenta activada. Entrando a la arena...');
        } else if (data?.user) {
          setSuccessMessage(
            '📩 Cuenta creada. Revisa tu bandeja de entrada o spam para confirmar el enlace.'
          );
          setIsSignUp(false);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

        if (error) {
          if (error.message.toLowerCase().includes('email not confirmed')) {
            setErrorMessage(
              '⚠️ Tu cuenta aún no ha sido confirmada por correo. Revisa tu bandeja de entrada o spam.'
            );
          } else if (error.message.toLowerCase().includes('invalid login credentials')) {
            setErrorMessage('Correo o contraseña incorrectos.');
          } else {
            setErrorMessage(error.message);
          }
        } else if (data?.session) {
          setSuccessMessage('Acceso concedido. Cargando arena...');
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error inesperado al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.contentContainer}>
            {/* Editorial Top Kicker */}
            <View style={styles.kickerRow}>
              <View style={styles.kickerAccentDot} />
              <Text style={styles.kickerText}>
                TEMPORADA 26/27 • LAS 4 GRANDES LIGAS
              </Text>
            </View>

            {/* Defiant Wordmark & Pitch */}
            <View style={styles.heroBlock}>
              <View style={styles.wordmarkRow}>
                <Text style={styles.wordmarkMain}>FUT</Text>
                <View style={styles.wordmarkVoltBox}>
                  <Text style={styles.wordmarkVoltText}>VIVOR</Text>
                </View>
              </View>

              <Text style={styles.tagline}>
                2 balas por jornada. 2 amarillas y estás fuera.{'\n'}
                <Text style={styles.taglineStrong}>¿Cuánto aguantas en pie?</Text>
              </Text>

              {/* Micro Rules Strip */}
              <View style={styles.pillarsRow}>
                <View style={styles.pillarBadge}>
                  <Text style={styles.pillarCode}>🇪🇸+🌍</Text>
                  <Text style={styles.pillarLabel}>DOBLE BALA</Text>
                </View>
                <View style={[styles.pillarBadge, styles.pillarBadgeWarn]}>
                  <Text style={styles.pillarCode}>🟨+🟨</Text>
                  <Text style={[styles.pillarLabel, { color: COLORS.warning }]}>
                    DOBLE AMARILLA
                  </Text>
                </View>
                <View style={[styles.pillarBadge, styles.pillarBadgeDanger]}>
                  <Text style={styles.pillarCode}>🟥</Text>
                  <Text style={[styles.pillarLabel, { color: COLORS.dead }]}>
                    FALLAS Y MUERES
                  </Text>
                </View>
              </View>
            </View>

            {/* Auth Card */}
            <View style={styles.card}>
              <View style={styles.modeRow}>
                <TouchableOpacity
                  onPress={() => {
                    setIsSignUp(false);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  style={[styles.tabToggle, !isSignUp && styles.tabToggleActive]}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.tabToggleText,
                      !isSignUp && styles.tabToggleTextActive,
                    ]}
                  >
                    ENTRAR
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setIsSignUp(true);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  style={[styles.tabToggle, isSignUp && styles.tabToggleActive]}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.tabToggleText,
                      isSignUp && styles.tabToggleTextActive,
                    ]}
                  >
                    CREAR CUENTA
                  </Text>
                </TouchableOpacity>
              </View>

              {errorMessage && (
                <View style={styles.errorBox}>
                  <AlertCircle
                    size={17}
                    color={COLORS.dead}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {successMessage && (
                <View style={styles.successBox}>
                  <CheckCircle2
                    size={17}
                    color={COLORS.primary}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.successText}>{successMessage}</Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>CORREO ELECTRÓNICO</Text>
                <TextInput
                  style={styles.input}
                  placeholder="jugador@club.com"
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>CONTRASEÑA</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={true}
                  value={password}
                  onChangeText={setPassword}
                  onSubmitEditing={handleSubmit}
                />
              </View>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.85}
                style={[styles.button, loading && styles.buttonDisabled]}
              >
                <Text style={styles.buttonText}>
                  {loading
                    ? 'CONECTANDO...'
                    : isSignUp
                    ? 'SALTÁR AL CAMPO'
                    : 'ENTRAR A LA ARENA'}
                </Text>
                {!loading && <ArrowRight size={18} color={COLORS.textInverse} />}
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Shield size={13} color={COLORS.textMuted} />
              <Text style={styles.footerText}>
                LALIGA • PREMIER LEAGUE • SERIE A • BUNDESLIGA
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 36,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'stretch',
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 16,
  },
  kickerAccentDot: {
    width: 7,
    height: 7,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    marginRight: 8,
  },
  kickerText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  heroBlock: {
    marginBottom: 24,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  wordmarkMain: {
    color: COLORS.textPrimary,
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -1,
  },
  wordmarkVoltBox: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  wordmarkVoltText: {
    color: COLORS.textInverse,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1,
  },
  tagline: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 16,
  },
  taglineStrong: {
    color: COLORS.textPrimary,
    fontWeight: '900',
  },
  pillarsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pillarBadge: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  pillarBadgeWarn: {
    borderLeftColor: COLORS.warning,
  },
  pillarBadgeDanger: {
    borderLeftColor: COLORS.dead,
  },
  pillarCode: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  pillarLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 22,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  tabToggle: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 7,
  },
  tabToggleActive: {
    backgroundColor: COLORS.primary,
  },
  tabToggleText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  tabToggleTextActive: {
    color: COLORS.textInverse,
  },
  errorBox: {
    backgroundColor: COLORS.deadBg,
    borderColor: COLORS.deadBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.dead,
    fontSize: 12.5,
    flex: 1,
    lineHeight: 18,
    fontWeight: '700',
  },
  successBox: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primaryBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  successText: {
    color: COLORS.primary,
    fontSize: 12.5,
    flex: 1,
    lineHeight: 18,
    fontWeight: '800',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.9,
    marginBottom: 7,
  },
  input: {
    backgroundColor: COLORS.background,
    color: COLORS.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    fontSize: 15,
    fontWeight: '600',
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: COLORS.textInverse,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 22,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
});
