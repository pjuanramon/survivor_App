import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { COMPETITIONS } from '../../constants/competitions';
import { useLeagues } from '../../hooks/useLeagues';
import { supabase } from '../../lib/supabase';
import { Competition } from '../../types/database';
import { Share2, Check, Sparkles } from 'lucide-react-native';

interface CreateLeagueModalProps {
  visible: boolean;
  onClose: () => void;
}

const EMOJI_OPTIONS = ['⚽', '🏆', '💀', '🔥', '👑', '🦁', '🦅', '⚡', '🎯', '🥇'];

export const CreateLeagueModal: React.FC<CreateLeagueModalProps> = ({
  visible,
  onClose,
}) => {
  const { createLeague, setActiveLeague } = useLeagues();

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>('');
  const [leagueName, setLeagueName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('⚽');
  const [loading, setLoading] = useState(false);
  const [createdLeague, setCreatedLeague] = useState<any | null>(null);

  useEffect(() => {
    if (visible) {
      fetchCompetitions();
      setCreatedLeague(null);
      setLeagueName('');
    }
  }, [visible]);

  async function fetchCompetitions() {
    try {
      const { data } = await supabase
        .from('sur_competitions')
        .select('*')
        .eq('is_active', true);

      if (data && data.length > 0) {
        setCompetitions(data);
        setSelectedCompId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching competitions:', err);
    }
  }

  const handleCreate = async () => {
    if (!leagueName.trim()) {
      Alert.alert('Nombre requerido', 'Introduce un nombre para tu liga');
      return;
    }
    if (!selectedCompId) {
      Alert.alert('Competición requerida', 'Selecciona una competición');
      return;
    }

    setLoading(true);
    const result = await createLeague({
      name: leagueName.trim(),
      competitionId: selectedCompId,
      avatarEmoji: selectedEmoji,
    });
    setLoading(false);

    if (result.success && result.league) {
      setCreatedLeague(result.league);
      setActiveLeague(result.league);
    } else {
      Alert.alert('Error', result.error || 'No se pudo crear la liga');
    }
  };

  const handleShare = async () => {
    if (!createdLeague) return;
    try {
      await Share.share({
        message: `🏆 ¡Únete a mi liga "${createdLeague.name}" en Futvivor! Usa el código: ${createdLeague.invite_code}\n\nDescarga la app y sobrevive jornada a jornada. ⚽💀`,
      });
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title={createdLeague ? '¡Liga Creada! 🎉' : 'Crear Nueva Liga'}>
      {createdLeague ? (
        <View style={styles.successContainer}>
          <Text style={styles.successEmoji}>{createdLeague.avatar_emoji}</Text>
          <Text style={styles.successTitle}>{createdLeague.name}</Text>
          <Text style={styles.successSub}>
            Comparte este código de invitación con tus amigos para que se unan:
          </Text>

          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{createdLeague.invite_code}</Text>
          </View>

          <Button
            title="Compartir por WhatsApp / Redes"
            onPress={handleShare}
            variant="primary"
            icon={<Share2 size={18} color={COLORS.textInverse} />}
            style={{ marginBottom: 12 }}
          />

          <Button
            title="Ir a mi Liga"
            onPress={onClose}
            variant="secondary"
          />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Competition Selector */}
          <Text style={styles.sectionLabel}>1. Elige Competición</Text>
          <View style={styles.compGrid}>
            {competitions.map((comp) => {
              const isSelected = selectedCompId === comp.id;
              const meta = COMPETITIONS[comp.short_name];
              return (
                <TouchableOpacity
                  key={comp.id}
                  activeOpacity={0.7}
                  onPress={() => setSelectedCompId(comp.id)}
                  style={[
                    styles.compCard,
                    isSelected && styles.compCardSelected,
                  ]}
                >
                  <Text style={styles.compFlag}>{meta?.countryFlag || '⚽'}</Text>
                  <Text
                    style={[
                      styles.compName,
                      isSelected && styles.compNameSelected,
                    ]}
                  >
                    {comp.name}
                  </Text>
                  <Text style={styles.compSeason}>{comp.season}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* League Name Input */}
          <Text style={styles.sectionLabel}>2. Nombre de la Liga</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. Los Reyes del Survivor"
            placeholderTextColor={COLORS.textMuted}
            value={leagueName}
            onChangeText={setLeagueName}
            maxLength={32}
          />

          {/* Emoji Avatar Selector */}
          <Text style={styles.sectionLabel}>3. Elige un Icono</Text>
          <View style={styles.emojiRow}>
            {EMOJI_OPTIONS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => setSelectedEmoji(emoji)}
                style={[
                  styles.emojiBtn,
                  selectedEmoji === emoji && styles.emojiBtnSelected,
                ]}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button
            title="Crear Liga"
            onPress={handleCreate}
            loading={loading}
            disabled={!leagueName.trim()}
            style={{ marginTop: 20 }}
          />
        </ScrollView>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  compCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
  },
  compCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0, 255, 157, 0.08)',
  },
  compFlag: {
    fontSize: 24,
    marginBottom: 4,
  },
  compName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  compNameSelected: {
    color: COLORS.primary,
  },
  compSeason: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  input: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiBtnSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryMuted,
  },
  emojiText: {
    fontSize: 20,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  successEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  successSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  codeBox: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginBottom: 20,
  },
  codeText: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 6,
  },
});
