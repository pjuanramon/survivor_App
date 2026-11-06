import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { COLORS } from '../../constants/colors';
import { GameMode, League } from '../../types/database';
import { useRounds } from '../../hooks/useRounds';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../lib/store';
import { RefreshCw, Globe, Lock, Heart, ShieldAlert } from 'lucide-react-native';

interface AdminRoundModalProps {
  visible: boolean;
  onClose: () => void;
  league: League;
  nextJornada: number;
  onUpdated?: () => void;
}

export const AdminRoundModal: React.FC<AdminRoundModalProps> = ({
  visible,
  onClose,
  league,
  nextJornada,
  onUpdated,
}) => {
  const { activeRound, launchNewRound, schemaReady } = useRounds(league);
  const { triggerRefresh, setActiveLeague } = useAppStore();

  const [gameMode, setGameMode] = useState<GameMode>('euro_double');
  const [livesCount, setLivesCount] = useState<1 | 2>(1);
  const [isPublic, setIsPublic] = useState<boolean>(!!league.is_public);
  const [maxPlayers, setMaxPlayers] = useState<number>(league.max_players || 25);
  const [savingSettings, setSavingSettings] = useState(false);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsPublic(!!league.is_public);
      setMaxPlayers(league.max_players || 25);
      setGameMode(activeRound?.game_mode || 'euro_double');
      setLivesCount((activeRound?.max_lives_per_player === 2 ? 2 : 1) as 1 | 2);
    }
  }, [visible, league, activeRound]);

  async function handleSaveSettings() {
    setSavingSettings(true);
    try {
      const { data, error } = await supabase
        .from('sur_leagues')
        .update({
          is_public: isPublic,
          max_players: maxPlayers,
        })
        .eq('id', league.id)
        .select(`
          *,
          competition:sur_competitions(*)
        `)
        .single();

      if (error) throw error;
      if (data) {
        setActiveLeague(data as any);
      }
      triggerRefresh();
      onUpdated?.();
      Alert.alert('Ajustes guardados', 'La visibilidad y el cupo de tu sala se han actualizado.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudieron actualizar los ajustes');
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleLaunchRound() {
    setLaunching(true);
    const res = await launchNewRound({
      gameMode,
      maxLivesPerPlayer: livesCount,
      startJornada: nextJornada,
      autoRestart: true,
    });
    setLaunching(false);

    if (res.success) {
      onUpdated?.();
      onClose();
      Alert.alert(
        '🚀 ¡Nueva Ronda Lanzada!',
        `Todos los miembros del grupo han revivido con ${livesCount} ${livesCount === 1 ? 'vida' : 'vidas'} y 0 tarjetas amarillas para la Jornada ${nextJornada}.`
      );
    } else {
      Alert.alert('Aviso', res.error || 'No se pudo iniciar la nueva ronda');
    }
  }

  return (
    <Modal visible={visible} onClose={onClose} title="⚙️ Panel de Organizador">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Bloque 1: Visibilidad y Cupo */}
        <Text style={styles.sectionTitle}>1. Acceso y Cupo de Jugadores</Text>
        <View style={styles.row}>
          <TouchableOpacity
            onPress={() => {
              setIsPublic(false);
              if (maxPlayers === 30) setMaxPlayers(25);
            }}
            style={[styles.toggleCard, !isPublic && styles.toggleCardActive]}
          >
            <Lock size={16} color={!isPublic ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.toggleTitle, !isPublic && { color: COLORS.primary }]}>
              Privada (Código)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setIsPublic(true);
              if (maxPlayers < 30) setMaxPlayers(30);
            }}
            style={[styles.toggleCard, isPublic && styles.toggleCardActive]}
          >
            <Globe size={16} color={isPublic ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.toggleTitle, isPublic && { color: COLORS.primary }]}>
              Partida Abierta
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.capRow}>
          {[25, 30, 100].map((cap) => (
            <TouchableOpacity
              key={cap}
              onPress={() => setMaxPlayers(cap)}
              style={[styles.capChip, maxPlayers === cap && styles.capChipActive]}
            >
              <Text style={[styles.capChipText, maxPlayers === cap && { color: COLORS.primary }]}>
                Máx. {cap} jug.
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          title="Guardar Ajustes de Sala"
          onPress={handleSaveSettings}
          loading={savingSettings}
          variant="secondary"
          style={{ marginTop: 10, marginBottom: 18 }}
        />

        {/* Bloque 2: Lanzar Siguiente Ronda */}
        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>2. Lanzar Nueva Ronda (Revivir a Todos)</Text>
        <Text style={styles.helperText}>
          Finaliza la ronda actual, guarda los puntos en el Ranking General del grupo e inicia una ronda limpia en la Jornada {nextJornada}.
        </Text>

        {!schemaReady && (
          <View style={styles.sqlNotice}>
            <ShieldAlert size={16} color="#FBBF24" style={{ marginRight: 8 }} />
            <Text style={styles.sqlNoticeText}>
              Ejecuta el archivo SQL de migración V5 en Supabase para activar múltiples rondas por liga.
            </Text>
          </View>
        )}

        <View style={styles.row}>
          <TouchableOpacity
            onPress={() => setGameMode('euro_double')}
            style={[styles.toggleCard, gameMode === 'euro_double' && styles.toggleCardActive]}
          >
            <Text style={[styles.toggleTitle, gameMode === 'euro_double' && { color: COLORS.primary }]}>
              🌍 Euro-Survivor (2 Balas + 🟨)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setGameMode('single_league')}
            style={[styles.toggleCard, gameMode === 'single_league' && styles.toggleCardActive]}
          >
            <Text style={[styles.toggleTitle, gameMode === 'single_league' && { color: COLORS.primary }]}>
              ⚽ Clásico (1 Pick)
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.row, { marginTop: 8 }]}>
          {[1, 2].map((lv) => (
            <TouchableOpacity
              key={lv}
              onPress={() => setLivesCount(lv as 1 | 2)}
              style={[styles.toggleCard, livesCount === lv && styles.toggleCardActive]}
            >
              <Heart size={14} color={livesCount === lv ? COLORS.primary : COLORS.textMuted} />
              <Text style={[styles.toggleTitle, livesCount === lv && { color: COLORS.primary }]}>
                {lv} {lv === 1 ? 'Vida' : 'Vidas'} por jugador
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          title={`🚀 Iniciar Nueva Ronda (J${nextJornada})`}
          onPress={handleLaunchRound}
          loading={launching}
          variant="primary"
          icon={<RefreshCw size={16} color="#000000" />}
          style={{ marginTop: 14, marginBottom: 6 }}
        />
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    paddingVertical: 11,
    paddingHorizontal: 8,
  },
  toggleCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySubtle,
  },
  toggleTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  capRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  capChip: {
    flex: 1,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    paddingVertical: 8,
    alignItems: 'center',
  },
  capChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySubtle,
  },
  capChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.surfaceBorder,
    marginBottom: 16,
  },
  sqlNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    padding: 10,
    marginBottom: 10,
  },
  sqlNoticeText: {
    fontSize: 11,
    color: '#FBBF24',
    flex: 1,
  },
});
