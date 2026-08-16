import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../../constants/colors';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'highlight' | 'outlined';
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  style,
}) => {
  const getStyle = (): ViewStyle => {
    const base: ViewStyle = {
      borderRadius: 16,
      padding: 16,
    };

    switch (variant) {
      case 'elevated':
        return {
          ...base,
          backgroundColor: COLORS.surfaceElevated,
          borderWidth: 1,
          borderColor: COLORS.surfaceBorder,
        };
      case 'highlight':
        return {
          ...base,
          backgroundColor: COLORS.surface,
          borderWidth: 1,
          borderColor: COLORS.primaryGlow,
        };
      case 'outlined':
        return {
          ...base,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: COLORS.surfaceBorder,
        };
      case 'default':
      default:
        return {
          ...base,
          backgroundColor: COLORS.surface,
          borderWidth: 1,
          borderColor: COLORS.surfaceBorder,
        };
    }
  };

  return <View style={[getStyle(), style]}>{children}</View>;
};
