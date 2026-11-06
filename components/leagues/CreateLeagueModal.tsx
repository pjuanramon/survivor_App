import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Share,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { COMPETITIONS, LEAGUE_CAPACITY_LIMITS } from '../../constants/competitions';
import { useLeagues } from '../../hooks/useLeagues';
import { supabase } from '../../lib/supabase';
import { Competition, LeagueType } from '../../types/database';
import { Share2, Check, Clock, AlertCircle, Globe, Lock, Crown, Heart } from 'lucide-react-native';

interface CreateLeagueModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const EMOJI_OPTIONS = ['🌍', '⚽', '🏆', '💀', '🔥', '👑', '🦁', '⚡', '🎯', '🥇'];

export const CreateLeagueModal: React.FC<CreateLeagueModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { createLeague, setActiveLeague } = useLeagues();

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [compConfigs, setCompConfigs] = useState<Record<string, { current_jornada: number; picks_open: boolean }>>({});
  const [selectedCompId, setSelectedCompId] = useState<string>('');
  const [leagueName, setLeagueName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🌍');
  const [roomPreset, setRoomPreset] = useState<'private_friends' | 'public_open' | 'community_pro'>('private_friends');
  const [livesPerPlayer, setLivesPerPlayer] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdLeague, setCreatedLeague] = useState<any | null>(null);

  useEffect(() => {
    if (visible) {
      fetchCompetitions();
      setCreatedLeague(null);
      setLeagueName('');
      setRoomPreset('private_friends');
      setLivesPerPlayer(1);
      setErrorMessage(null);
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
        const orderPriority: Record<string, number> = {
          euro_survivor: 0,
          laliga: 1,
          premier: 2,
          seriea: 3,
          bundesliga: 4,
        };
        const sorted = [...data].sort(
          (a, b) => (orderPriority[a.short_name] ?? 99) - (orderPriority[b.short_name] ?? 99)
        );
        // Mostrar Euro-Survivor (formato principal 4 Grandes Ligas) y opción LaLiga individual
        const selectable = sorted.filter((c) =>
          ['euro_survivor', 'laliga'].includes(c.short_name)
        );
        const finalComps = selectable.length > 0 ? selectable : sorted;
        setCompetitions(finalComps);
        setSelectedCompId(finalComps[0].id);
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

  const getCapacityAndType = (): { isPublic: boolean; maxPlayers: number; leagueType: LeagueType } => {
    if (roomPreset === 'public_open') {
      return {
        isPublic: true,
        maxPlayers: LEAGUE_CAPACITY_LIMITS.OPEN_MATCHMAKING_ROOM,
        leagueType: 'private',
      };
    }
    if (roomPreset === 'community_pro') {
      return {
        isPublic: false,
        maxPlayers: 100,
        leagueType: 'community',
      };
    }
    return {
      isPublic: false,
      maxPlayers: LEAGUE_CAPACITY_LIMITS.FREE_PRIVATE_MAX,
      leagueType: 'private',
    };
  };

  const handleCreate = async () => {
    setErrorMessage(null);

    if (!leagueName.trim()) {
      setErrorMessage('Introduce un nombre para tu partida o grupo');
      return;
    }
    if (!selectedCompId) {
      setErrorMessage('Selecciona un formato de competición');
      return;
    }

    setLoading(true);
    try {
      const startJornada = getStartingJornada(selectedCompId);
      const selectedComp = competitions.find((c) => c.id === selectedCompId);
      const isEuro = selectedComp?.short_name === 'euro_survivor';
      const { isPublic, maxPlayers, leagueType } = getCapacityAndType();

      const result = await createLeague({
        name: leagueName.trim(),
        competitionId: selectedCompId,
        avatarEmoji: selectedEmoji,
        isPublic,
        maxPlayers,
        leagueType,
        gameMode: isEuro ? 'euro_double' : 'single_league',
        maxLivesPerPlayer: livesPerPlayer,
        startJornada,
        autoRestart: true,
      });

      if (!result.success || !result.league) {
        setErrorMessage(result.error || 'No se pudo crear la liga. Intenta de nuevo.');
        return;
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
      setErrorMessage(err?.message || 'Algo salió mal. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!createdLeague) return;
    try {
      await Share.share({
        message: `🌍⚽ ¡Únete a mi partida "${createdLeague.name}" en Futvivor! Formato Doble Bala + Tarjetas Amarillas 🟨. Empezamos en la Jornada ${createdLeague.start_jornada || 1}.\n\nCódigo de acceso: ${createdLeague.invite_code}`,
      });
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const currentStartJornada = selectedCompId ? getStartingJornada(selectedCompId) : 1;

  return (
    <Modal visible={visible} onClose={onClose} title={createdLeague ? '¡Partida Lista! 🎉' : 'Organizar Partida'}>
      {createdLeague ? (
        <View style={styles.successContainer}>
          <Text style={styles.successEmoji}>{createdLeague.avatar_emoji}</Text>
          <Text style={styles.successTitle}>{createdLeague.name}</Text>
          <Text style={styles.successSub}>
            Cupo máximo: <Text style={{ color: COLORS.primary, fontWeight: '800' }}>{createdLeague.max_players} jugadores</Text> • Arranca en{' '}
            <Text style={{ color: COLORS.primary, fontWeight: '800' }}>J{createdLeague.start_jornada || 1}</Text>.
            {createdLeague.is_public ? ' ¡También visible en el Lobby de Partidas Abiertas!' : ' Comparte este código con tu grupo:'}
          </Text>

          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{createdLeague.invite_code}</Text>
          </View>

          <Button
            title="Invitar por WhatsApp / Redes"
            onPress={handleShare}
            variant="primary"
            icon={<Share2 size={18} color={COLORS.textInverse} />}
            style={{ marginBottom: 12 }}
          />

          <Button
            title="Entrar a mi Partida"
            onPress={() => {
              if (onSuccess) onSuccess();
              else onClose();
            }}
            variant="secondary"
          />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* 1. Formato de Juego */}
          <Text style={styles.sectionLabel}>1. Formato de Juego</Text>
          <View style={styles.compStack}>
            {competitions.map((comp) => {
              const isSelected = selectedCompId === comp.id;
              const meta = COMPETITIONS[comp.short_name];
              const isEuro = comp.short_name === 'euro_survivor';
              const startJ = getStartingJornada(comp.id);

              return (
                <TouchableOpacity
                  key={comp.id}
                  activeOpacity={0.75}
                  onPress={() => {
                    setSelectedCompId(comp.id);
                    if (isEuro) setSelectedEmoji('🌍');
                    setErrorMessage(null);
                  }}
                  style={[
                    styles.compRowCard,
                    isSelected && styles.compCardSelected,
                  ]}
                >
                  <Text style={styles.compFlag}>{meta?.countryFlag || '⚽'}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.compName, isSelected && styles.compNameSelected]}>
                        {isEuro ? 'Euro-Survivor (1 LaLiga + 1 Europa)' : comp.name}
                      </Text>
                      {isEuro && (
                        <View style={styles.hotPill}>
                          <Text style={styles.hotPillText}>⭐ NUEVO</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.compDesc}>
                      {isEuro
                        ? 'Doble bala cada finde (LaLiga + Premier/Serie A/Bundesliga) y 🟨'
                        : `1 equipo por jornada • Inicia J${startJ}`}
                    </Text>
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

          {/* 2. Nombre */}
          <Text style={styles.sectionLabel}>2. Nombre del Grupo / Partida</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. Peña Los Inmortales, Liga Oficina..."
            placeholderTextColor={COLORS.textMuted}
            value={leagueName}
            onChangeText={(t) => {
              setLeagueName(t);
              setErrorMessage(null);
            }}
            maxLength={35}
          />

          {/* 3. Visibilidad y Tamaño de Sala */}
          <Text style={styles.sectionLabel}>3. Tipo de Sala y Límite de Jugadores</Text>
          <View style={styles.tierRow}>
            <TouchableOpacity
              onPress={() => setRoomPreset('private_friends')}
              style={[styles.tierCard, roomPreset === 'private_friends' && styles.tierCardSelected]}
              activeOpacity={0.8}
            >
              <Lock size={16} color={roomPreset === 'private_friends' ? COLORS.primary : COLORS.textSecondary} />
              <Text style={[styles.tierTitle, roomPreset === 'private_friends' && styles.tierTitleSelected]}>
                Amigos
              </Text>
              <Text style={styles.tierCap}>Máx. 25 • Privada</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setRoomPreset('public_open')}
              style={[styles.tierCard, roomPreset === 'public_open' && styles.tierCardSelected]}
              activeOpacity={0.8}
            >
              <Globe size={16} color={roomPreset === 'public_open' ? COLORS.primary : COLORS.textSecondary} />
              <Text style={[styles.tierTitle, roomPreset === 'public_open' && styles.tierTitleSelected]}>
                Abierta
              </Text>
              <Text style={styles.tierCap}>Máx. 30 • Pública</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setRoomPreset('community_pro')}
              style={[styles.tierCard, roomPreset === 'community_pro' && styles.tierCardSelected]}
              activeOpacity={0.8}
            >
              <Crown size={16} color={roomPreset === 'community_pro' ? '#FBBF24' : COLORS.textSecondary} />
              <Text style={[styles.tierTitle, roomPreset === 'community_pro' && { color: '#FBBF24' }]}>
                Comunidad
              </Text>
              <Text style={styles.tierCap}>Máx. 100 • VIP</Text>
            </TouchableOpacity>
          </View>

          {/* 4. Vidas por Jugador */}
          <Text style={styles.sectionLabel}>4. Vidas por Jugador en la Ronda</Text>
          <View style={styles.livesRow}>
            {[1, 2].map((count) => {
              const active = livesPerPlayer === count;
              return (
                <TouchableOpacity
                  key={count}
                  onPress={() => setLivesPerPlayer(count as 1 | 2)}
                  style={[styles.lifeOption, active && styles.lifeOptionSelected]}
                  activeOpacity={0.8}
                >
                  <Heart size={15} color={active ? COLORS.primary : COLORS.textMuted} />
                  <Text style={[styles.lifeOptionText, active && { color: COLORS.primary }]}>
                    {count === 1 ? '1 Vida (Ronda Rápida)' : '2 Vidas por Jugador'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 5. Emblema */}
          <Text style={styles.sectionLabel}>5. Emblema</Text>
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

          <View style={styles.infoBanner}>
            <Clock size={15} color={COLORS.primary} style={{ marginRight: 8, marginTop: 2 }} />
            <Text style={styles.infoBannerText}>
              Arranca en <Text style={{ color: COLORS.primary, fontWeight: '800' }}>Jornada {currentStartJornada}</Text> • Empate suma <Text style={{ color: '#FBBF24', fontWeight: '800' }}>Tarjeta Amarilla 🟨</Text> (2 amarillas = Eliminado 🟥).
            </Text>
          </View>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <AlertCircle size={16} color="#EF4444" style={{ marginRight: 8, marginTop: 1 }} />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

          <Button
            title="Crear Partida"
            onPress={handleCreate}
            loading={loading}
            variant="primary"
            style={{ marginTop: 14, marginBottom: 8 }}
          />
        </ScrollView>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 10,
  },
  compStack: {
    gap: 8,
    marginBottom: 6,
  },
  compRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    gap: 10,
  },
  compCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySubtle,
  },
  compFlag: {
    fontSize: 26,
  },
  compName: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  compNameSelected: {
    color: COLORS.textPrimary,
  },
  compDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  hotPill: {
    backgroundColor: COLORS.primaryMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hotPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.primary,
  },
  checkBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  tierCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  tierCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySubtle,
  },
  tierTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  tierTitleSelected: {
    color: COLORS.primary,
  },
  tierCap: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  livesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  lifeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  lifeOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySubtle,
  },
  lifeOptionText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primarySubtle,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  infoBannerText: {
    fontSize: 11,
    color: COLORS.textPrimary,
    flex: 1,
    lineHeight: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  errorBannerText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '700',
    flex: 1,
  },
  input: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: 13,
    color: COLORS.textPrimary,
    fontSize: 14,
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
    justifyContent: 'center',
    alignItems: 'center',
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
