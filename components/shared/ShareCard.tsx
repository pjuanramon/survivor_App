import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  Modal,
  Platform,
} from 'react-native';
import { Share2, Trophy, Skull, Flame, Sparkles, X, Check, Copy } from 'lucide-react-native';
import { COLORS } from '../../constants/colors';
import { Button } from '../ui/Button';

export interface ShareCardProps {
  type: 'invite' | 'pick' | 'leaderboard' | 'elimination';
  leagueName?: string;
  inviteCode?: string;
  competitionName?: string;
  userName?: string;
  pickTeam?: string;
  pickVs?: string;
  jornada?: number;
  rank?: number;
  totalPlayers?: number;
}

export const ShareCardModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  data: ShareCardProps;
}> = ({ visible, onClose, data }) => {
  const [copied, setCopied] = useState(false);

  const getShareMessage = () => {
    switch (data.type) {
      case 'invite':
        return `🏆 ¡Únete a mi liga "${data.leagueName || 'Futvivor'}" en Futvivor! ⚽💀\n\n🔑 Código de acceso: *${data.inviteCode}*\nCompetición: ${data.competitionName || 'LaLiga'}\n\n👉 Elige 1 ganador cada jornada sin repetir equipo. ¿Quién será el último en pie?\nDescarga la app o entra en https://survivor-app.vercel.app`;
      case 'pick':
        return `🔥 Mi pick para la Jornada ${data.jornada || 1} en Futvivor:\n\n⚽ *${data.pickTeam}* ${data.pickVs ? `(${data.pickVs})` : ''}\n\n¿Crees que sobrevivo esta jornada? Juégatela conmigo en https://survivor-app.vercel.app`;
      case 'leaderboard':
        return `📊 ¡Así voy en Futvivor (${data.leagueName})!\n\n🏅 Puesto: *#${data.rank || 1}* de ${data.totalPlayers || 10} jugadores\nEstado: 🟢 VIVO\n\n¿Puedes superarme? Entra con el código *${data.inviteCode}* en https://survivor-app.vercel.app`;
      case 'elimination':
        return `💀 ¡He caído en la Jornada ${data.jornada || 1} de Futvivor!\n\n¿Cuánto aguantarías tú? Crea tu liga gratis en https://survivor-app.vercel.app`;
      default:
        return `⚽ ¡Juega a Futvivor conmigo! El survivor definitivo de fútbol. https://survivor-app.vercel.app`;
    }
  };

  const handleNativeShare = async () => {
    try {
      await Share.share({
        message: getShareMessage(),
        title: 'Futvivor — Survivor Fútbol',
      });
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          {/* Close Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Compartir en Redes</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Card Preview Preview (Visual Graphic) */}
          <View style={styles.previewContainer}>
            <View style={styles.cardHeaderBanner}>
              <Text style={styles.brandTitle}>FUTVIVOR</Text>
              <Text style={styles.brandSub}>SURVIVOR FÚTBOL</Text>
            </View>

            {data.type === 'invite' && (
              <View style={styles.cardBody}>
                <Text style={styles.inviteEmoji}>🏆</Text>
                <Text style={styles.cardMainText} numberOfLines={1}>
                  {data.leagueName || 'Liga de Amigos'}
                </Text>
                <Text style={styles.cardCompText}>
                  {data.competitionName || 'LaLiga 26/27'}
                </Text>

                <View style={styles.codeBadge}>
                  <Text style={styles.codeLabel}>CÓDIGO DE INVITACIÓN</Text>
                  <Text style={styles.codeString}>{data.inviteCode}</Text>
                </View>
              </View>
            )}

            {data.type === 'pick' && (
              <View style={styles.cardBody}>
                <Text style={styles.inviteEmoji}>⚽</Text>
                <Text style={styles.cardSubHeader}>
                  MI PICK • JORNADA {data.jornada || 1}
                </Text>
                <Text style={styles.pickTeamHighlight}>
                  {data.pickTeam}
                </Text>
                {data.pickVs && (
                  <Text style={styles.pickVsText}>{data.pickVs}</Text>
                )}
                <View style={styles.statusAliveBadge}>
                  <Text style={styles.statusAliveText}>🟢 VIVO EN LA LIGA</Text>
                </View>
              </View>
            )}

            {data.type === 'leaderboard' && (
              <View style={styles.cardBody}>
                <Text style={styles.inviteEmoji}>👑</Text>
                <Text style={styles.cardSubHeader}>CLASIFICACIÓN</Text>
                <Text style={styles.rankHighlight}>
                  #{data.rank || 1}
                </Text>
                <Text style={styles.cardMainText} numberOfLines={1}>
                  {data.userName || 'Superviviente'}
                </Text>
                <Text style={styles.cardCompText}>
                  {data.leagueName} • {data.totalPlayers || 1} jugadores
                </Text>
              </View>
            )}

            <View style={styles.cardFooter}>
              <Text style={styles.footerUrl}>futvivor.app</Text>
              <Text style={styles.footerCta}>¿Quién será el último en pie?</Text>
            </View>
          </View>

          {/* Share Actions */}
          <Button
            title="Compartir por WhatsApp / Stories"
            onPress={handleNativeShare}
            variant="primary"
            icon={<Share2 size={18} color={COLORS.textInverse} />}
            style={{ marginBottom: 10, marginTop: 16 }}
          />

          <Button
            title="Cerrar"
            onPress={onClose}
            variant="secondary"
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    width: '100%',
    maxWidth: 440,
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
  closeBtn: {
    padding: 4,
  },
  previewContainer: {
    backgroundColor: '#080808',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  cardHeaderBanner: {
    backgroundColor: 'rgba(0, 255, 157, 0.1)',
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 157, 0.2)',
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 2,
  },
  brandSub: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
    marginTop: 1,
  },
  cardBody: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  inviteEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  cardMainText: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  cardSubHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardCompText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  codeBadge: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 16,
  },
  codeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: 2,
  },
  codeString: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 5,
  },
  pickTeamHighlight: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.primary,
    textAlign: 'center',
    marginVertical: 4,
  },
  pickVsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  statusAliveBadge: {
    backgroundColor: COLORS.aliveBg,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  statusAliveText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.alive,
  },
  rankHighlight: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.primary,
    lineHeight: 52,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
  },
  footerUrl: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  footerCta: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
});
