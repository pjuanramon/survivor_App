import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  StyleSheet,
  ScrollView,
  Share,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import {
  LogOut,
  BookOpen,
  User as UserIcon,
  Share2,
  Trash2,
  Crown,
  Gift,
  Shield,
  Check,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../hooks/useAuth';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [referralCode, setReferralCode] = useState<string>('');

  useEffect(() => {
    if (user?.id) {
      // Generate or retrieve referral code
      const code = user.id.slice(0, 6).toUpperCase();
      setReferralCode(code);
    }
  }, [user]);

  async function handleShareReferral() {
    try {
      await Share.share({
        message: `⚽ ¡Juega conmigo en Futvivor! La app definitiva de Survivor de fútbol (LaLiga + Liga MX). Usa mi código de invitado: ${referralCode}\n\n🏆 ¿Podrás sobrevivir todas las jornadas?`,
      });
    } catch (err) {
      console.error('Error sharing referral:', err);
    }
  }

  async function handleSignOut() {
    Alert.alert('Cerrar Sesión', '¿Estás seguro de que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar Sesión',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/');
        },
      },
    ]);
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      if (!user) return;

      // Delete user profile and entries
      await supabase.from('sur_selections').delete().match({ player_id: user.id });
      await supabase.from('sur_entries').delete().eq('player_id', user.id);
      await supabase.from('sur_league_members').delete().eq('user_id', user.id);
      await supabase.from('sur_profiles').delete().eq('id', user.id);

      await signOut();
      setDeleteModalVisible(false);
      Alert.alert(
        'Cuenta Eliminada',
        'Tu cuenta y todos tus datos han sido eliminados de Futvivor.'
      );
      router.replace('/');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo eliminar la cuenta');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <View style={styles.header}>
          <View style={styles.avatarBox}>
            <UserIcon size={44} color={COLORS.primary} />
          </View>
          <Text style={styles.username}>
            {profile?.username || user?.email?.split('@')[0] || 'Superviviente'}
          </Text>
          <Text style={styles.email}>{user?.email}</Text>

          <View style={styles.badgeRow}>
            {profile?.is_pro ? (
              <Badge label="👑 PRO" variant="primary" />
            ) : (
              <Badge label="GRATIS" variant="muted" />
            )}
          </View>
        </View>

        {/* Referral Card (Viral Growth) */}
        <Card variant="highlight" style={styles.referralCard}>
          <View style={styles.referralHeader}>
            <Gift size={22} color={COLORS.primary} />
            <Text style={styles.referralTitle}>Invita Amigos & Gana Vidas</Text>
          </View>
          <Text style={styles.referralSub}>
            Comparte tu código con amigos. Cuando se unan, ambos desbloquean
            insignias exclusivas y ventajas para la temporada.
          </Text>

          <View style={styles.referralCodeBox}>
            <Text style={styles.referralCodeText}>{referralCode}</Text>
          </View>

          <Button
            title="Compartir Código"
            onPress={handleShareReferral}
            variant="primary"
            icon={<Share2 size={16} color={COLORS.textInverse} />}
          />
        </Card>

        {/* Menu Items */}
        <View style={styles.menuGroup}>
          <TouchableOpacity
            onPress={() => router.push('/rules')}
            style={styles.menuItem}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircle}>
              <BookOpen size={18} color={COLORS.primary} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemText}>Reglamento Oficial</Text>
              <Text style={styles.menuItemSub}>
                15 reglas de supervivencia, desempates y puntuación
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/privacy')}
            style={styles.menuItem}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircle}>
              <Shield size={18} color={COLORS.primary} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemText}>Política de Privacidad</Text>
              <Text style={styles.menuItemSub}>
                Protección de datos conforme a RGPD
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/terms')}
            style={styles.menuItem}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircle}>
              <Check size={18} color={COLORS.primary} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemText}>Términos y Condiciones</Text>
              <Text style={styles.menuItemSub}>
                Reglas de juego y uso de la plataforma
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSignOut}
            style={styles.menuItem}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconCircle, styles.iconCircleSignOut]}>
              <LogOut size={18} color={COLORS.dead} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuItemText, { color: COLORS.dead }]}>
                Cerrar Sesión
              </Text>
            </View>
          </TouchableOpacity>

          {/* Account Deletion (App Store / Play Store Mandatory) */}
          <TouchableOpacity
            onPress={() => setDeleteModalVisible(true)}
            style={styles.deleteAccountBtn}
            activeOpacity={0.7}
          >
            <Trash2 size={14} color={COLORS.textMuted} style={{ marginRight: 6 }} />
            <Text style={styles.deleteAccountText}>Eliminar mi cuenta</Text>
          </TouchableOpacity>
        </View>

        {/* App Version Info */}
        <Text style={styles.versionText}>Futvivor v2.0 • Build 2026</Text>
      </ScrollView>

      {/* Account Deletion Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>¿Eliminar tu cuenta?</Text>
            <Text style={styles.modalSub}>
              Esta acción es irreversible. Se borrarán todas tus entradas, vidas,
              selecciones y participación en ligas de Futvivor.
            </Text>

            <View style={styles.modalActions}>
              <Button
                title="Cancelar"
                variant="secondary"
                onPress={() => setDeleteModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Eliminar Definitivamente"
                variant="danger"
                loading={deleting}
                onPress={handleDeleteAccount}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 20,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  avatarBox: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  username: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '900',
  },
  email: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  badgeRow: {
    marginTop: 8,
  },
  referralCard: {
    marginBottom: 24,
  },
  referralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  referralTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginLeft: 8,
  },
  referralSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  referralCodeBox: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1.5,
    borderColor: COLORS.primaryGlow,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 14,
  },
  referralCodeText: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 4,
  },
  menuGroup: {
    gap: 12,
    marginBottom: 30,
  },
  menuItem: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconCircleSignOut: {
    backgroundColor: COLORS.deadBg,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuItemText: {
    color: COLORS.textPrimary,
    fontWeight: '800',
    fontSize: 15,
  },
  menuItemSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 10,
  },
  deleteAccountText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    width: '100%',
    maxWidth: 440,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
});
