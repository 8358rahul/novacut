import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius, spacing } from '../theme';

export interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, style, className }) => {
  return <View className={className} style={[styles.card, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
});
