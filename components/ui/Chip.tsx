import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { COLORS } from '../../constants/colors';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  badge?: string | number;
  disabled?: boolean;
  style?: ViewStyle;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  badge,
  disabled = false,
  style,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.container,
        selected ? styles.selectedContainer : styles.unselectedContainer,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          selected ? styles.selectedText : styles.unselectedText,
        ]}
      >
        {label}
      </Text>
      {badge !== undefined && (
        <Text
          style={[
            styles.badge,
            selected ? styles.selectedBadge : styles.unselectedBadge,
          ]}
        >
          {badge}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  selectedContainer: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  unselectedContainer: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.surfaceBorder,
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
  },
  selectedText: {
    color: COLORS.primary,
  },
  unselectedText: {
    color: COLORS.textSecondary,
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  selectedBadge: {
    backgroundColor: COLORS.primary,
    color: COLORS.textInverse,
  },
  unselectedBadge: {
    backgroundColor: COLORS.surfaceBorder,
    color: COLORS.textSecondary,
  },
});
