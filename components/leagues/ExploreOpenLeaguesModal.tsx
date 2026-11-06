import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Modal } from '../ui/Modal';
import { COLORS } from '../../constants/colors';
import { useLeagues } from '../../hooks/useLeagues';
import { League } from '../../types/database';
import { Globe, Zap, Users, ArrowRight, Check } from 'lucide-react-native';
import { LEAGUE_CAPACITY_LIMITS } from '../../constants/competitions';

interface ExploreOpenLeaguesModalProps {
  visible: boolean;
  onClose: () => void;
  onJoined?: () => void;
}

export const ExploreOpenLeaguesModal: React.FC<ExploreOpenLeaguesModalProps> = ({
  visible,
  onClose,
  onJoined,
}) => {
  const { leagues, fetchPublicLeagues, joinPublicLeague, joinQuickOpenRoom } = useLeagues();
  const [openRooms, setOpenRooms] = useState<League[]>([]);
  const [loading, setLoading] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [quickJoining, setQuickJoining] = useState(false);

  useEffect(() => {
    if (visible) {
      loadRooms();
    }
  }, [visible]);

  async function loadRooms() {
    setLoading(true);
    const data = await fetchPublicLeagues();
    setOpenRooms(data);
    setLoading(false);
  }

  async function handleQuickMatchmaking() {
    setQuickJoining(true);
    const res = await joinQuickOpenRoom();
    setQuickJoining(false);

    if (res.success) {
      onJoined?.();
      onClose();
    } else {
      Alert.alert('Aviso', res.error || 'No se pudo entrar a la sala rápida');
    }
  }

  async function handleJoinRoom(room: League) {
    setJoiningId(room.id);
    const res = await joinPublicLeague(room);
    setJoiningId(null);

    if (res.success) {
      onJoined?.();
      onClose();
    } else {
      Alert.alert('Sala no disponible', res.error || 'No se pudo entrar a esta partida');
    }
  }

  const userLeagueIds = new Set(leagues.map((l) => l.id));

  return (
    <Modal visible={visible} onClose={onClose} title="🌍 Partidas Abiertas">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Matchmaking Rápido 1-Clic */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.zapCircle}>
              <Zap size={20} color="#000000" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Matchmaking Rápido (Salas de 30)</Text>
              <Text style={styles.heroSub}>
                Te asignamos automáticamente a la próxima sala oficial Euro-Survivor con hueco disponible.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleQuickMatchmaking}
            disabled={quickJoining}
            style={styles.quickBtn}
            activeOpacity={0.85}
          >
            {quickJoining ? (
              <ActivityIndicator color="#000000" size="small" />
            ) : (
              <>
                <Text style={styles.quickBtnText}>⚡ Jugar Partida Abierta Ahora</Text>
                <ArrowRight size={16} color="#000000" />
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.listHeader}>Salas Públicas Disponibles</Text>

        {loading ? (
          <View style={{ paddingVertical: 30, alignItems: 'center' }}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : openRooms.length === 0 ? (
          <View style={styles.emptyBox}>
            <Globe size={32} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>
              Aún no hay salas públicas listadas. Usa el botón de Matchmaking Rápido arriba para inaugurar la primera sala de 30 jugadores.
            </Text>
          </View>
        ) : (
          openRooms.map((room) => {
            const count = room.members_count || 0;
            const cap = room.max_players || LEAGUE_CAPACITY_LIMITS.OPEN_MATCHMAKING_ROOM;
            const isFull = count >= cap;
            const alreadyIn = userLeagueIds.has(room.id);
            const pct = Math.min(100, Math.round((count / cap) * 100));
            const isEuro = room.competition?.short_name === 'euro_survivor';

            return (
              <View key={room.id} style={styles.roomCard}>
                <View style={styles.roomTop}>
                  <Text style={styles.roomEmoji}>{room.avatar_emoji || '🌍'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.roomName} numberOfLines={1}>
                      {room.name}
                    </Text>
                    <Text style={styles.roomFormat}>
                      {isEuro ? '🌍 Euro-Survivor (1 LaLiga + 1 Europa) • 🟨' : `⚽ ${room.competition?.name || 'Clásico'}`}
                    </Text>
                  </View>

                  {alreadyIn ? (
                    <View style={styles.joinedPill}>
                      <Check size={12} color={COLORS.primary} />
                      <Text style={styles.joinedText}>Dentro</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      disabled={isFull || joiningId === room.id}
                      onPress={() => handleJoinRoom(room)}
                      style={[styles.joinBtn, isFull && styles.joinBtnFull]}
                      activeOpacity={0.8}
                    >
                      {joiningId === room.id ? (
                        <ActivityIndicator size="small" color="#000" />
                      ) : (
                        <Text style={[styles.joinBtnText, isFull && { color: COLORS.textMuted }]}>
                          {isFull ? 'Llena' : 'Unirme'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {/* Barra de ocupación */}
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${pct}%` }, isFull && { backgroundColor: '#EF4444' }]} />
                </View>
                <View style={styles.roomMetaRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Users size={12} color={COLORS.textSecondary} />
                    <Text style={styles.metaText}>
                      {count}/{cap} jugadores inscritos
                    </Text>
                  </View>
                  <Text style={styles.metaCode}>Cód: {room.invite_code}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: COLORS.primarySubtle,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primaryBorder,
    padding: 16,
    marginBottom: 18,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  zapCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  heroSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  quickBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  quickBtnText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 14,
  },
  listHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 18,
  },
  roomCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: 14,
    marginBottom: 10,
  },
  roomTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  roomEmoji: {
    fontSize: 24,
  },
  roomName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  roomFormat: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  joinBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  joinBtnFull: {
    backgroundColor: COLORS.surfaceBorder,
  },
  joinBtnText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 12,
  },
  joinedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  joinedText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  roomMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  metaCode: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
});
