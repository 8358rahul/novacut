import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors, borderRadius, spacing } from '../theme';

export interface IconButtonProps {
  label?: string;
  iconText: string;
  onPress: () => void;
  size?: number;
  active?: boolean;
  disabled?: boolean;
  color?: string;
  backgroundColor?: string;
  style?: ViewStyle;
}

export const IconButton: React.FC<IconButtonProps> = ({
  label,
  iconText,
  onPress,
  size = 40,
  active = false,
  disabled = false,
  color,
  backgroundColor,
  style,
}) => {
  const iconColor = disabled
    ? colors.textDisabled
    : active
    ? colors.accentGold
    : color || colors.textPrimary;

  const bg = backgroundColor || (active ? colors.surfaceLight : 'transparent');

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          backgroundColor: bg,
        },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.iconText, { color: iconColor }]}>{iconText}</Text>
      {label ? (
        <Text style={[styles.label, { color: iconColor }]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
    padding: spacing.xxs,
  },
  iconText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  disabled: {
    opacity: 0.4,
  },
});
