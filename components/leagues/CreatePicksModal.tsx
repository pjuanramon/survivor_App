import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { COLORS } from '../../constants/colors';
import { ShieldCheck } from 'lucide-react-native';
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
  const [officialLives, setOfficialLives] = useState(1);
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { triggerRefresh } = useAppStore();

  useEffect(() => {
    if (!visible || !leagueId) return;
    supabase
      .from('sur_rounds')
      .select('id, max_lives_per_player')
      .eq('league_id', leagueId)
      .order('round_number', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setActiveRoundId(data.id);
          setOfficialLives(data.max_lives_per_player || 1);
        } else {
          setActiveRoundId(null);
          setOfficialLives(1);
        }
      });
  }, [visible, leagueId]);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const newEntries = Array.from({ length: officialLives }).map((_, i) => ({
        player_id: user.id,
        entry_name: `Vida ${i + 1}`,
        league_id: leagueId,
        ...(activeRoundId ? { round_id: activeRoundId, yellow_cards: 0 } : {}),
        is_alive: true,
        total_points: 0,
        total_gf: 0,
      }));

      const { error } = await supabase.from('sur_entries').insert(newEntries);
      if (error && activeRoundId) {
        const fallbackEntries = Array.from({ length: officialLives }).map((_, i) => ({
          player_id: user.id,
          entry_name: `Vida ${i + 1}`,
          league_id: leagueId,
          is_alive: true,
          total_points: 0,
          total_gf: 0,
        }));
        const { error: fbErr } = await supabase.from('sur_entries').insert(fallbackEntries);
        if (fbErr) throw fbErr;
      } else if (error) {
        throw error;
      }

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
      console.error('Error activating official lives:', err);
      Alert.alert('Error', err.message || 'No se pudieron activar tus vidas en la ronda');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Inscripción en Ronda">
      <View style={styles.content}>
        <View style={styles.badgeContainer}>
          <ShieldCheck size={30} color={COLORS.primary} />
        </View>

        <Text style={styles.leagueLabel} numberOfLines={1}>
          {leagueName}
        </Text>
        <Text style={styles.subtext}>
          En esta partida todos los participantes compiten en igualdad de condiciones con{' '}
          <Text style={styles.boldVolt}>
            {officialLives} {officialLives === 1 ? 'Vida Oficial' : 'Vidas Oficiales'}
          </Text>.
        </Text>

        <View style={styles.previewBox}>
          {Array.from({ length: officialLives }).map((_, i) => (
            <View key={i} style={styles.previewTag}>
              <Text style={styles.previewTagText}>⚡ Vida {i + 1}</Text>
            </View>
          ))}
        </View>

        <Button
          title={`Activar ${officialLives === 1 ? 'Mi Vida' : `Mis ${officialLives} Vidas`}`}
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
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: COLORS.primaryMuted,
    borderWidth: 1.5,
    borderColor: COLORS.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
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
    marginTop: 6,
    marginBottom: 18,
    lineHeight: 19,
  },
  boldVolt: {
    color: COLORS.primary,
    fontWeight: '900',
  },
  previewBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 18,
    width: '100%',
  },
  previewTag: {
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  previewTagText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.primary,
  },
});
