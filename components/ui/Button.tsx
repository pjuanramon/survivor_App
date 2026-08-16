import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { COLORS } from '../../constants/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}) => {
  const getContainerStyle = (): ViewStyle => {
    const base: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      opacity: disabled || loading ? 0.5 : 1,
    };

    // Size
    if (size === 'sm') {
      base.paddingVertical = 8;
      base.paddingHorizontal = 14;
    } else if (size === 'lg') {
      base.paddingVertical = 16;
      base.paddingHorizontal = 24;
    } else {
      base.paddingVertical = 12;
      base.paddingHorizontal = 18;
    }

    // Variant
    switch (variant) {
      case 'primary':
        return {
          ...base,
          backgroundColor: COLORS.primary,
        };
      case 'secondary':
        return {
          ...base,
          backgroundColor: COLORS.surfaceElevated,
          borderWidth: 1,
          borderColor: COLORS.surfaceBorder,
        };
      case 'outline':
        return {
          ...base,
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: COLORS.primary,
        };
      case 'danger':
        return {
          ...base,
          backgroundColor: COLORS.dead,
        };
      case 'ghost':
        return {
          ...base,
          backgroundColor: 'transparent',
        };
      default:
        return base;
    }
  };

  const getTextStyle = (): TextStyle => {
    const base: TextStyle = {
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: 0.5,
    };

    if (size === 'sm') base.fontSize = 13;
    else if (size === 'lg') base.fontSize = 17;
    else base.fontSize = 15;

    switch (variant) {
      case 'primary':
        return { ...base, color: COLORS.textInverse };
      case 'secondary':
        return { ...base, color: COLORS.textPrimary };
      case 'outline':
        return { ...base, color: COLORS.primary };
      case 'danger':
        return { ...base, color: COLORS.textPrimary };
      case 'ghost':
        return { ...base, color: COLORS.textSecondary };
      default:
        return base;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[getContainerStyle(), style]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? COLORS.textInverse : COLORS.primary}
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text style={[getTextStyle(), icon ? { marginLeft: 8 } : undefined, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};
