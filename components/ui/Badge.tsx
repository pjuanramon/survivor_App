import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { COLORS } from '../../constants/colors';

interface BadgeProps {
  label: string;
  variant?: 'alive' | 'dead' | 'warning' | 'info' | 'primary' | 'muted';
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  size = 'md',
  style,
}) => {
  const getContainerStyle = (): ViewStyle => {
    const base: ViewStyle = {
      alignSelf: 'flex-start',
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    };

    if (size === 'sm') {
      base.paddingHorizontal = 8;
      base.paddingVertical = 3;
    } else {
      base.paddingHorizontal = 12;
      base.paddingVertical = 5;
    }

    switch (variant) {
      case 'alive':
        return { ...base, backgroundColor: COLORS.aliveBg };
      case 'dead':
        return { ...base, backgroundColor: COLORS.deadBg };
      case 'warning':
        return { ...base, backgroundColor: COLORS.warningBg };
      case 'info':
        return { ...base, backgroundColor: COLORS.infoBg };
      case 'muted':
        return { ...base, backgroundColor: COLORS.surfaceBorder };
      case 'primary':
      default:
        return { ...base, backgroundColor: COLORS.primaryMuted };
    }
  };

  const getTextStyle = (): TextStyle => {
    const base: TextStyle = {
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    };

    if (size === 'sm') base.fontSize = 10;
    else base.fontSize = 11;

    switch (variant) {
      case 'alive':
        return { ...base, color: COLORS.alive };
      case 'dead':
        return { ...base, color: COLORS.dead };
      case 'warning':
        return { ...base, color: COLORS.warning };
      case 'info':
        return { ...base, color: COLORS.info };
      case 'muted':
        return { ...base, color: COLORS.textSecondary };
      case 'primary':
      default:
        return { ...base, color: COLORS.primary };
    }
  };

  return (
    <View style={[getContainerStyle(), style]}>
      <Text style={getTextStyle()}>{label}</Text>
    </View>
  );
};
