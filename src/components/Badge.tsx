import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, spacing } from '../theme';

export interface BadgeProps {
  label: string;
  variant?: 'primary' | 'accent' | 'muted';
  className?: string;
  style?: any;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'muted', className, style }) => {
  const getColors = () => {
    switch (variant) {
      case 'primary':
        return { bg: colors.primaryDark, text: colors.primaryLight };
      case 'accent':
        return { bg: '#2D2817', text: colors.accentGold };
      case 'muted':
        return { bg: colors.surfaceLight, text: colors.textSecondary };
    }
  };

  const c = getColors();

  return (
    <View className={className} style={[styles.badge, { backgroundColor: c.bg }, style]}>
      <Text style={[styles.text, { color: c.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
