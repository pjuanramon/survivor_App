import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { COLORS } from '../../constants/colors';
import { Heart, Minus, Plus } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../lib/store';

interface CreatePicksModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  leagueId: string;
  leagueName: string;
}

export const CreatePicksModal: React.FC<CreatePicksModalProps> = ({
  visible,
  onClose,
  onSuccess,
  leagueId,
  leagueName,
}) => {
  const [pickCount, setPickCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const { triggerRefresh } = useAppStore();

  const handleConfirm = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Create picks specifically for this league
      const newEntries = Array.from({ length: pickCount }).map((_, i) => ({
        player_id: user.id,
        entry_name: `Pick ${i + 1}`,
        league_id: leagueId,
        is_alive: true,
        total_points: 0,
        total_gf: 0,
      }));

      const { error } = await supabase.from('sur_entries').insert(newEntries);
      if (error) throw error;

      // Ensure user is in league_members
      await supabase
        .from('sur_league_members')
        .insert({
          league_id: leagueId,
          user_id: user.id,
          role: 'player',
        })
        .maybeSingle();

      triggerRefresh();
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating picks:', err);
      Alert.alert('Error', err.message || 'No se pudieron crear los picks');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Configurar Vidas">
      <View style={styles.content}>
        <View style={styles.badgeContainer}>
          <Heart size={32} color={COLORS.primary} />
        </View>

        <Text style={styles.leagueLabel} numberOfLines={1}>
          {leagueName}
        </Text>
        <Text style={styles.subtext}>
          Elige con cuántas vidas independientes quieres competir en esta liga (1 a 5).
        </Text>

        {/* Counter */}
        <View style={styles.counterRow}>
          <TouchableOpacity
            onPress={() => setPickCount(Math.max(1, pickCount - 1))}
            style={[styles.counterBtn, pickCount <= 1 && styles.counterBtnDisabled]}
            disabled={pickCount <= 1}
          >
            <Minus size={20} color={pickCount <= 1 ? COLORS.textMuted : COLORS.textPrimary} />
          </TouchableOpacity>

          <View style={styles.counterDisplay}>
            <Text style={styles.counterNumber}>{pickCount}</Text>
            <Text style={styles.counterSub}>
              {pickCount === 1 ? 'VIDA' : 'VIDAS'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setPickCount(Math.min(5, pickCount + 1))}
            style={[styles.counterBtn, pickCount >= 5 && styles.counterBtnDisabled]}
            disabled={pickCount >= 5}
          >
            <Plus size={20} color={pickCount >= 5 ? COLORS.textMuted : COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Pick list preview */}
        <View style={styles.previewBox}>
          {Array.from({ length: pickCount }).map((_, i) => (
            <View key={i} style={styles.previewTag}>
              <Text style={styles.previewTagText}>⚽ Pick {i + 1}</Text>
            </View>
          ))}
        </View>

        {/* Action Button */}
        <Button
          title={`Confirmar ${pickCount} ${pickCount === 1 ? 'Pick' : 'Picks'}`}
          onPress={handleConfirm}
          loading={loading}
          variant="primary"
          style={{ width: '100%', marginTop: 8 }}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
  },
  badgeContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryMuted,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 255, 157, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  leagueLabel: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: 8,
    marginBottom: 20,
  },
  counterBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnDisabled: {
    opacity: 0.3,
  },
  counterDisplay: {
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  counterNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.primary,
  },
  counterSub: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
  previewBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 20,
    width: '100%',
  },
  previewTag: {
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  previewTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});
