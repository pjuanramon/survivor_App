import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal as RNModal,
  ScrollView,
  TextInput,
  Share,
  Alert,
} from 'react-native';
import { ChevronDown, Plus, Users, Copy, Share2, Check, Trophy } from 'lucide-react-native';
import { COLORS } from '../../constants/colors';
import { useLeagues } from '../../hooks/useLeagues';
import { League } from '../../types/database';
import { COMPETITIONS } from '../../constants/competitions';
import { supabase } from '../../lib/supabase';

interface LeagueSelectorProps {
  onCreateOrJoinPress?: () => void;
}

export const LeagueSelector: React.FC<LeagueSelectorProps> = ({
  onCreateOrJoinPress,
}) => {
  const { leagues, activeLeague, setActiveLeague, joinLeagueByCode } = useLeagues();
  const [modalVisible, setModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [inviteInput, setInviteInput] = useState('');
  const [joining, setJoining] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const handleSelectLeague = (league: League) => {
    setActiveLeague(league);
    setModalVisible(false);
  };

  const handleShareLeague = async (league: League) => {
    try {
      await Share.share({
        message: `🏆 ¡Únete a mi liga de Survivor en Futvivor! Usa el código: ${league.invite_code}\n\nDescarga la app y sobrevive jornada a jornada. ⚽💀`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleJoinSubmit = async () => {
    if (!inviteInput.trim()) return;
    setJoining(true);
    const result = await joinLeagueByCode(inviteInput);
    setJoining(false);

    if (result.success) {
      setJoinModalVisible(false);
      setInviteInput('');
      setModalVisible(false);
    } else {
      Alert.alert('Error', result.error || 'Código de invitación inválido');
    }
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setModalVisible(true)}
        style={styles.selectorBar}
      >
        <View style={styles.selectorLeft}>
          <Text style={styles.leagueEmoji}>
            {activeLeague?.avatar_emoji || '🏆'}
          </Text>
          <View style={styles.leagueTextContainer}>
            <Text style={styles.leagueName} numberOfLines={1}>
              {activeLeague?.name || 'Crear o Unirse a una Liga'}
            </Text>
            <Text style={styles.competitionSub}>
              {activeLeague?.competition?.name || 'Toca para empezar'}
            </Text>
          </View>
        </View>

        <View style={styles.selectorRight}>
          <ChevronDown size={18} color={COLORS.textSecondary} />
        </View>
      </TouchableOpacity>

      {/* Main Leagues Modal */}
      <RNModal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tus Ligas</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>Cerrar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.leaguesList}>
              {leagues.map((league) => {
                const isSelected = activeLeague?.id === league.id;
                return (
                  <TouchableOpacity
                    key={league.id}
                    activeOpacity={0.7}
                    onPress={() => handleSelectLeague(league)}
                    style={[
                      styles.leagueItem,
                      isSelected && styles.leagueItemSelected,
                    ]}
                  >
                    <Text style={styles.leagueItemEmoji}>
                      {league.avatar_emoji || '⚽'}
                    </Text>
                    <View style={styles.leagueItemInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text
                          style={[
                            styles.leagueItemName,
                            isSelected && styles.leagueItemNameSelected,
                          ]}
                        >
                          {league.name}
                        </Text>
                        {league.creator_id === currentUserId && (
                          <View style={styles.ownerBadge}>
                            <Text style={styles.ownerBadgeText}>👑 Tu Liga</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.leagueItemSub}>
                        Código: {league.invite_code} • {league.competition?.name || 'LaLiga'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleShareLeague(league)}
                      style={styles.shareIconBtn}
                      activeOpacity={0.7}
                    >
                      <Share2 size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setModalVisible(false);
                  setJoinModalVisible(true);
                }}
                style={styles.actionBtnSecondary}
              >
                <Text style={styles.actionBtnSecondaryText}>Unirse con Código</Text>
              </TouchableOpacity>

              {onCreateOrJoinPress && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setModalVisible(false);
                    onCreateOrJoinPress();
                  }}
                  style={styles.actionBtnPrimary}
                >
                  <Plus size={16} color={COLORS.textInverse} style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnPrimaryText}>Crear Liga</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </RNModal>

      {/* Join League by Code Modal */}
      <RNModal
        visible={joinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Unirse a una Liga</Text>
            <Text style={styles.modalSubtitle}>
              Pídele el código de 6 letras/números al creador de la liga.
            </Text>

            <TextInput
              style={styles.codeInput}
              placeholder="Ej. ABC123"
              placeholderTextColor={COLORS.textMuted}
              value={inviteInput}
              onChangeText={(text) => setInviteInput(text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={8}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setJoinModalVisible(false)}
                style={styles.actionBtnSecondary}
              >
                <Text style={styles.actionBtnSecondaryText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleJoinSubmit}
                disabled={joining || !inviteInput.trim()}
                style={[
                  styles.actionBtnPrimary,
                  (!inviteInput.trim() || joining) && { opacity: 0.5 },
                ]}
              >
                <Text style={styles.actionBtnPrimaryText}>
                  {joining ? 'Buscando...' : 'Unirme'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </RNModal>
    </>
  );
};

const styles = StyleSheet.create({
  selectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  selectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  leagueEmoji: {
    fontSize: 22,
    marginRight: 10,
  },
  leagueTextContainer: {
    flex: 1,
  },
  leagueName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  competitionSub: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 1,
  },
  selectorRight: {
    padding: 4,
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
    maxWidth: 480,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  leaguesList: {
    maxHeight: 280,
    marginBottom: 16,
  },
  leagueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: 8,
  },
  leagueItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0, 255, 157, 0.06)',
  },
  leagueItemEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  leagueItemInfo: {
    flex: 1,
  },
  leagueItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  leagueItemNameSelected: {
    color: COLORS.primary,
  },
  leagueItemSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  shareIconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceBorder,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionBtnSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnSecondaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textInverse,
  },
  codeInput: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    letterSpacing: 3,
    marginBottom: 20,
  },
  ownerBadge: {
    backgroundColor: 'rgba(0, 255, 157, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 157, 0.3)',
  },
  ownerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
  },
});
