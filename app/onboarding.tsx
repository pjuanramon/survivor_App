import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import {
  Zap,
  KeyRound,
  Crown,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  AlertCircle,
  LogOut,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useLeagues } from '../hooks/useLeagues';
import { CreateLeagueModal } from '../components/leagues/CreateLeagueModal';

export default function OnboardingScreen() {
  const router = useRouter();
  const { joinQuickOpenRoom, joinLeagueByCode } = useLeagues();

  const [step, setStep] = useState<'briefing' | 'arena'>('briefing');
  const [username, setUsername] = useState<string>('');
  const [inviteCode, setInviteCode] = useState('');
  const [loadingAction, setLoadingAction] = useState<'quick' | 'code' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  useEffect(() => {
    checkUserAndEnrollment();
  }, []);

  async function checkUserAndEnrollment() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: profile }, { data: entries }, { data: memberships }] = await Promise.all([
      supabase.from('sur_profiles').select('username').eq('id', user.id).maybeSingle(),
      supabase.from('sur_entries').select('id').eq('player_id', user.id).limit(1),
      supabase.from('sur_league_members').select('league_id').eq('user_id', user.id).limit(1),
    ]);

    setUsername(profile?.username || user.email?.split('@')[0] || 'Superviviente');

    if ((entries && entries.length > 0) || (memberships && memberships.length > 0)) {
      router.replace('/(tabs)');
    }
  }

  async function handleJoinOpenArena() {
    setErrorMsg(null);
    setLoadingAction('quick');
    const res = await joinQuickOpenRoom();
    setLoadingAction(null);

    if (res.success) {
      router.replace('/(tabs)');
    } else {
      setErrorMsg(res.error || 'No se pudo entrar en la Sala Abierta.');
    }
  }

  async function handleJoinByCode() {
    if (!inviteCode.trim()) {
      setErrorMsg('Introduce el código de 6 caracteres que te compartió tu grupo.');
      return;
    }
    setErrorMsg(null);
    setLoadingAction('code');
    const res = await joinLeagueByCode(inviteCode);
    setLoadingAction(null);

    if (res.success) {
      router.replace('/(tabs)');
    } else {
      setErrorMsg(res.error || 'Código de partida no válido.');
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* Top Progress & User Bar */}
          <View style={styles.topBar}>
            <View style={styles.stepPill}>
              <View style={styles.stepDot} />
              <Text style={styles.stepPillText}>
                {step === 'briefing'
                  ? 'PASO 1 DE 2 • CÓMO FUNCIONA'
                  : 'PASO 2 DE 2 • ELIGE TU ARENA'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSignOut}
              style={styles.signOutBtn}
              activeOpacity={0.7}
            >
              <LogOut size={14} color={COLORS.textMuted} />
              <Text style={styles.signOutText}>Salir</Text>
            </TouchableOpacity>
          </View>

          {step === 'briefing' ? (
            /* ==================== PASO 1: EL PORQUÉ Y LAS REGLAS ==================== */
            <View>
              <Text style={styles.greeting}>HOLA, {username.toUpperCase()}</Text>
              <Text style={styles.heroTitle}>
                BIENVENIDO AL NUEVO{'\n'}
                <Text style={styles.heroTitleVolt}>EURO-SURVIVOR.</Text>
              </Text>
              <Text style={styles.heroSubtitle}>
                Hemos rediseñado el juego para que cada fin de semana sea pura adrenalina, sin empates aburridos ni ligas eternas estancadas:
              </Text>

              {/* Rule 01 */}
              <View style={[styles.ruleCard, styles.ruleCardVolt]}>
                <View style={styles.ruleHeader}>
                  <Text style={styles.ruleNumber}>01</Text>
                  <Text style={styles.ruleTitle}>DOBLE BALA EN LAS 4 GRANDES</Text>
                  <Text style={styles.ruleFlags}>🇪🇸 + 🌍</Text>
                </View>
                <Text style={styles.ruleBody}>
                  Cada jornada disparas <Text style={styles.boldChalk}>2 equipos obligatorios</Text>: uno de{' '}
                  <Text style={styles.boldVolt}>LaLiga</Text> y otro a elegir entre{' '}
                  <Text style={styles.boldVolt}>Premier League, Serie A o Bundesliga</Text>. Prohibido repetir club en toda la ronda.
                </Text>
              </View>

              {/* Rule 02 */}
              <View style={[styles.ruleCard, styles.ruleCardYellow]}>
                <View style={styles.ruleHeader}>
                  <Text style={[styles.ruleNumber, { color: COLORS.warning }]}>02</Text>
                  <Text style={styles.ruleTitle}>TARJETAS DEL ÁRBITRO</Text>
                  <Text style={styles.ruleFlags}>🟨 + 🟨 = 🟥</Text>
                </View>
                <Text style={styles.ruleBody}>
                  • <Text style={styles.boldVolt}>Victoria:</Text> pasas limpio y sumas +3 pts.{'\n'}
                  • <Text style={styles.boldAmber}>Empate (🟨):</Text> recibes 1 Tarjeta Amarilla. A la 2ª amarilla acumulada, expulsado.{'\n'}
                  • <Text style={styles.boldRed}>Derrota (🟥):</Text> si falla cualquiera de tus 2 balas, Roja Directa y fuera.
                </Text>
              </View>

              {/* Rule 03 */}
              <View style={[styles.ruleCard, styles.ruleCardRed]}>
                <View style={styles.ruleHeader}>
                  <Text style={[styles.ruleNumber, { color: COLORS.dead }]}>03</Text>
                  <Text style={styles.ruleTitle}>IGUALDAD Y RONDAS RÁPIDAS</Text>
                  <Text style={styles.ruleFlags}>🏆</Text>
                </View>
                <Text style={styles.ruleBody}>
                  Aquí nadie compra vidas extra: <Text style={styles.boldChalk}>todos jugáis con las mismas vidas</Text> que fije la sala. Cuando queda 1 campeón, se lleva la corona y <Text style={styles.boldChalk}>todos revivís</Text> en la siguiente Ronda.
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setStep('arena')}
                activeOpacity={0.85}
                style={styles.primaryCta}
              >
                <Text style={styles.primaryCtaText}>ENTENDIDO — ELEGIR ARENA</Text>
                <ArrowRight size={18} color={COLORS.textInverse} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/rules')}
                style={styles.rulesLink}
                activeOpacity={0.7}
              >
                <BookOpen size={15} color={COLORS.textSecondary} />
                <Text style={styles.rulesLinkText}>Leer reglamento detallado</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ==================== PASO 2: ELEGIR CÓMO ENTRAR ==================== */
            <View>
              <TouchableOpacity
                onPress={() => {
                  setErrorMsg(null);
                  setStep('briefing');
                }}
                style={styles.backStepBtn}
                activeOpacity={0.7}
              >
                <ArrowLeft size={15} color={COLORS.textSecondary} />
                <Text style={styles.backStepText}>Volver al resumen de reglas</Text>
              </TouchableOpacity>

              <Text style={styles.heroTitle}>
                ELIGE TU <Text style={styles.heroTitleVolt}>ARENA.</Text>
              </Text>
              <Text style={styles.heroSubtitle}>
                ¿Cómo quieres arrancar hoy? Más adelante podrás jugar en varias partidas a la vez desde el menú superior.
              </Text>

              {errorMsg && (
                <View style={styles.errorBanner}>
                  <AlertCircle size={17} color={COLORS.dead} style={{ marginRight: 8 }} />
                  <Text style={styles.errorBannerText}>{errorMsg}</Text>
                </View>
              )}

              {/* Option 1: Open Matchmaking Room */}
              <View style={[styles.arenaCard, styles.arenaCardHighlight]}>
                <View style={styles.arenaTopRow}>
                  <View style={styles.arenaIconVolt}>
                    <Zap size={20} color={COLORS.textInverse} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.tagRow}>
                      <Text style={styles.recommendedTag}>RECOMENDADO • 1 CLIC</Text>
                    </View>
                    <Text style={styles.arenaTitle}>Sala Abierta Oficial (30 jug.)</Text>
                  </View>
                </View>

                <Text style={styles.arenaDesc}>
                  Entra directo a la división pública activa de 30 supervivientes. Modo{' '}
                  <Text style={styles.boldChalk}>Euro-Survivor (4 Grandes Ligas)</Text> con{' '}
                  <Text style={styles.boldVolt}>1 Vida igual para todos</Text>.
                </Text>

                <TouchableOpacity
                  onPress={handleJoinOpenArena}
                  disabled={loadingAction !== null}
                  activeOpacity={0.85}
                  style={styles.arenaVoltBtn}
                >
                  {loadingAction === 'quick' ? (
                    <ActivityIndicator size="small" color={COLORS.textInverse} />
                  ) : (
                    <>
                      <Text style={styles.arenaVoltBtnText}>
                        ENTRAR A SALA ABIERTA AHORA
                      </Text>
                      <ArrowRight size={17} color={COLORS.textInverse} />
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Option 2: Join Friend Group by Code */}
              <View style={styles.arenaCard}>
                <View style={styles.arenaTopRow}>
                  <View style={styles.arenaIconDark}>
                    <KeyRound size={19} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.arenaKicker}>GRUPOS DE AMIGOS / WHATSAPP</Text>
                    <Text style={styles.arenaTitle}>Tengo un Código de Invitación</Text>
                  </View>
                </View>

                <Text style={styles.arenaDesc}>
                  Introduce el código de la partida de tus amigos. Se te asignarán automáticamente las mismas vidas que al resto del grupo.
                </Text>

                <View style={styles.codeInlineRow}>
                  <TextInput
                    style={styles.codeInput}
                    placeholder="CÓDIGO (EJ. ABC123)"
                    placeholderTextColor={COLORS.textMuted}
                    value={inviteCode}
                    onChangeText={(t) => setInviteCode(t.toUpperCase())}
                    autoCapitalize="characters"
                    maxLength={8}
                  />
                  <TouchableOpacity
                    onPress={handleJoinByCode}
                    disabled={loadingAction !== null}
                    activeOpacity={0.85}
                    style={[
                      styles.codeSubmitBtn,
                      !inviteCode.trim() && { opacity: 0.5 },
                    ]}
                  >
                    {loadingAction === 'code' ? (
                      <ActivityIndicator size="small" color={COLORS.textInverse} />
                    ) : (
                      <Text style={styles.codeSubmitText}>ENTRAR</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Option 3: Create Own League as Admin */}
              <View style={styles.arenaCard}>
                <View style={styles.arenaTopRow}>
                  <View style={[styles.arenaIconDark, { borderColor: COLORS.warningBorder }]}>
                    <Crown size={19} color={COLORS.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.arenaKicker, { color: COLORS.warning }]}>
                      ORGANIZADOR / ADMIN
                    </Text>
                    <Text style={styles.arenaTitle}>Crear mi Propia Partida</Text>
                  </View>
                </View>

                <Text style={styles.arenaDesc}>
                  Organiza un grupo privado para tus amigos (hasta 25) o una sala abierta. Tú eliges las reglas y generas el código para compartir por WhatsApp.
                </Text>

                <TouchableOpacity
                  onPress={() => setCreateModalVisible(true)}
                  disabled={loadingAction !== null}
                  activeOpacity={0.85}
                  style={styles.arenaSecondaryBtn}
                >
                  <Text style={styles.arenaSecondaryBtnText}>
                    + CONFIGURAR NUEVA PARTIDA
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <CreateLeagueModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={() => {
          setCreateModalVisible(false);
          router.replace('/(tabs)');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  container: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  stepDot: {
    width: 7,
    height: 7,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    marginRight: 8,
  },
  stepPillText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  signOutText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  greeting: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  heroTitle: {
    color: COLORS.textPrimary,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 34,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  heroTitleVolt: {
    color: COLORS.primary,
  },
  heroSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    fontWeight: '500',
  },
  ruleCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderLeftWidth: 4,
    padding: 15,
    marginBottom: 12,
  },
  ruleCardVolt: {
    borderLeftColor: COLORS.primary,
  },
  ruleCardYellow: {
    borderLeftColor: COLORS.warning,
  },
  ruleCardRed: {
    borderLeftColor: COLORS.dead,
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  ruleNumber: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  ruleTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 0.4,
  },
  ruleFlags: {
    fontSize: 13,
    fontWeight: '900',
  },
  ruleBody: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  boldChalk: {
    color: COLORS.textPrimary,
    fontWeight: '800',
  },
  boldVolt: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  boldAmber: {
    color: COLORS.warning,
    fontWeight: '800',
  },
  boldRed: {
    color: COLORS.dead,
    fontWeight: '800',
  },
  primaryCta: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  primaryCtaText: {
    color: COLORS.textInverse,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  rulesLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  rulesLinkText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  backStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  backStepText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: COLORS.deadBg,
    borderWidth: 1,
    borderColor: COLORS.deadBorder,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  errorBannerText: {
    color: COLORS.dead,
    fontSize: 12.5,
    fontWeight: '700',
    flex: 1,
  },
  arenaCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    padding: 16,
    marginBottom: 14,
  },
  arenaCardHighlight: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  arenaTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  arenaIconVolt: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arenaIconDark: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  recommendedTag: {
    fontSize: 9.5,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.8,
  },
  arenaKicker: {
    fontSize: 9.5,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  arenaTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  arenaDesc: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  arenaVoltBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  arenaVoltBtnText: {
    color: COLORS.textInverse,
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  codeInlineRow: {
    flexDirection: 'row',
    gap: 8,
  },
  codeInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  codeSubmitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeSubmitText: {
    color: COLORS.textInverse,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  arenaSecondaryBtn: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorderHighlight,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arenaSecondaryBtnText: {
    color: COLORS.textPrimary,
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
});
