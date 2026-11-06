import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Clock, AlertTriangle } from 'lucide-react-native';
import { COLORS } from '../../constants/colors';

interface CountdownTimerProps {
  deadline: string | Date | null | undefined;
  onExpire?: () => void;
  style?: ViewStyle;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  deadline,
  onExpire,
  style,
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false });

  useEffect(() => {
    if (!deadline) return;

    function calculateTime() {
      const target = new Date(deadline!).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        if (onExpire) onExpire();
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    }

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (!deadline) return null;

  const isUrgent = !timeLeft.isExpired && timeLeft.days === 0 && timeLeft.hours < 3;

  return (
    <View
      style={[
        styles.container,
        isUrgent && styles.containerUrgent,
        timeLeft.isExpired && styles.containerExpired,
        style,
      ]}
    >
      {isUrgent ? (
        <AlertTriangle size={16} color={COLORS.warning} style={styles.icon} />
      ) : (
        <Clock
          size={16}
          color={timeLeft.isExpired ? COLORS.dead : COLORS.primary}
          style={styles.icon}
        />
      )}

      {timeLeft.isExpired ? (
        <Text style={[styles.text, styles.textExpired]}>Picks Cerrados</Text>
      ) : (
        <View style={styles.timeRow}>
          <Text style={[styles.label, isUrgent && styles.textUrgent]}>
            Cierre en:{' '}
          </Text>
          {timeLeft.days > 0 && (
            <Text style={[styles.digits, isUrgent && styles.textUrgent]}>
              {timeLeft.days}d{' '}
            </Text>
          )}
          <Text style={[styles.digits, isUrgent && styles.textUrgent]}>
            {String(timeLeft.hours).padStart(2, '0')}h{' '}
          </Text>
          <Text style={[styles.digits, isUrgent && styles.textUrgent]}>
            {String(timeLeft.minutes).padStart(2, '0')}m{' '}
          </Text>
          <Text style={[styles.digits, isUrgent && styles.textUrgent]}>
            {String(timeLeft.seconds).padStart(2, '0')}s
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  containerUrgent: {
    backgroundColor: COLORS.warningBg,
    borderColor: COLORS.warningBorder,
    borderLeftColor: COLORS.warning,
  },
  containerExpired: {
    backgroundColor: COLORS.deadBg,
    borderColor: COLORS.deadBorder,
    borderLeftColor: COLORS.dead,
  },
  icon: {
    marginRight: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  digits: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
  },
  textUrgent: {
    color: COLORS.warning,
  },
  textExpired: {
    color: COLORS.dead,
  },
});
