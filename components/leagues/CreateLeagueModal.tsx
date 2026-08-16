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
import { Share2, Check, Sparkles, Clock, AlertCircle } from 'lucide-react-native';

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
  const [compConfigs, setCompConfigs] = useState<Record<string, { current_jornada: number; picks_open: boolean }>>({});
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

      const { data: configs } = await supabase
        .from('sur_competition_config')
        .select('*');

      const configMap: Record<string, { current_jornada: number; picks_open: boolean }> = {};
      (configs || []).forEach((c) => {
        configMap[c.competition_id] = {
          current_jornada: c.current_jornada,
          picks_open: c.picks_open,
        };
      });
      setCompConfigs(configMap);

      if (data && data.length > 0) {
        setCompetitions(data);
        setSelectedCompId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching competitions:', err);
    }
  }

  const getStartingJornada = (compId: string) => {
    const cfg = compConfigs[compId];
    if (!cfg) return 1;
    return cfg.picks_open ? cfg.current_jornada : cfg.current_jornada + 1;
  };

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
    try {
      const startJornada = getStartingJornada(selectedCompId);

      const result = await createLeague({
        name: leagueName.trim(),
        competitionId: selectedCompId,
        avatarEmoji: selectedEmoji,
      });

      if (!result.success || !result.league) {
        Alert.alert('Error al crear', result.error || 'No se pudo crear la liga. Intenta de nuevo.');
        return;
      }

      // Automatically create initial Pick 1 for the creator
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || (await supabase.auth.getUser()).data?.user;

      if (user) {
        // Check entry doesn't already exist (idempotent)
        const { data: existingEntry } = await supabase
          .from('sur_entries')
          .select('id')
          .eq('player_id', user.id)
          .eq('league_id', result.league.id)
          .maybeSingle();

        if (!existingEntry) {
          const { error: entryError } = await supabase.from('sur_entries').insert({
            player_id: user.id,
            entry_name: 'Pick 1',
            league_id: result.league.id,
            is_alive: true,
            total_points: 0,
            total_gf: 0,
          });
          if (entryError) {
            console.error('Entry creation error:', entryError);
            // Non-fatal: league was created, entry failed — still show success
          }
        }
      }

      setCreatedLeague({
        ...result.league,
        start_jornada: startJornada,
      });
      setActiveLeague({
        ...result.league,
        start_jornada: startJornada,
      } as any);
    } catch (err: any) {
      console.error('handleCreate error:', err);
      Alert.alert('Error inesperado', err?.message || 'Algo salió mal. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!createdLeague) return;
    try {
      await Share.share({
        message: `🏆 ¡Únete a mi liga "${createdLeague.name}" en Futvivor! Empezamos en la Jornada ${createdLeague.start_jornada || 1}. Usa el código: ${createdLeague.invite_code}\n\nDescarga la app y sobrevive jornada a jornada. ⚽💀`,
      });
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const currentStartJornada = selectedCompId ? getStartingJornada(selectedCompId) : 1;

  return (
    <Modal visible={visible} onClose={onClose} title={createdLeague ? '¡Liga Creada! 🎉' : 'Crear Nueva Liga'}>
      {createdLeague ? (
        <View style={styles.successContainer}>
          <Text style={styles.successEmoji}>{createdLeague.avatar_emoji}</Text>
          <Text style={styles.successTitle}>{createdLeague.name}</Text>
          <Text style={styles.successSub}>
            Tu liga comenzará a jugarse en la <Text style={{ color: COLORS.primary, fontWeight: '800' }}>Jornada {createdLeague.start_jornada || 1}</Text>. Comparte este código con tus amigos:
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
              const startJ = getStartingJornada(comp.id);

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
                  <View style={styles.startBadge}>
                    <Text style={styles.startBadgeText}>Inicia J{startJ}</Text>
                  </View>
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Check size={12} color={COLORS.textInverse} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Clock size={16} color={COLORS.primary} style={{ marginRight: 8, marginTop: 2 }} />
            <Text style={styles.infoBannerText}>
              Esta liga comenzará en la <Text style={{ color: COLORS.primary, fontWeight: '800' }}>Jornada {currentStartJornada}</Text> (próxima jornada completa disponible).
            </Text>
          </View>

          {/* League Name Input */}
          <Text style={styles.sectionLabel}>2. Nombre de la Liga</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. Los Reyes del Fútbol, Compas FC..."
            placeholderTextColor={COLORS.textMuted}
            value={leagueName}
            onChangeText={setLeagueName}
            maxLength={35}
          />

          {/* Emoji Avatar Selector */}
          <Text style={styles.sectionLabel}>3. Emblema de la Liga</Text>
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

          {/* Submit Button */}
          <Button
            title="Crear Liga"
            onPress={handleCreate}
            loading={loading}
            variant="primary"
            style={{ marginTop: 24, marginBottom: 8 }}
          />
        </ScrollView>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 12,
  },
  compGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  compCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    position: 'relative',
  },
  compCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0, 255, 157, 0.06)',
  },
  compFlag: {
    fontSize: 28,
    marginBottom: 6,
  },
  compName: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  compNameSelected: {
    color: COLORS.textPrimary,
  },
  startBadge: {
    marginTop: 6,
    backgroundColor: 'rgba(0, 255, 157, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  startBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 255, 157, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 157, 0.25)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  infoBannerText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    flex: 1,
    lineHeight: 16,
  },
  input: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: 14,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiBtnSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryMuted,
  },
  emojiText: {
    fontSize: 22,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  successEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  successSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
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
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 4,
    textAlign: 'center',
  },
});
