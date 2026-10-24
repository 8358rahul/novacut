import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking } from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { useGuaranteedInsets } from '../../navigation/safeArea';

export interface SettingsScreenProps {
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const insets = useGuaranteedInsets();
  return (
    <View style={styles.container}>
      <Header title="Settings" subtitle="Preferences & About" onBack={onBack} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
      >
        {/* App Info Card */}
        <Card style={styles.card}>
          <View style={styles.brandRow}>
            <Text style={styles.brandTitle}>NovaCut</Text>
            <Badge label="v1.0.0" variant="primary" />
          </View>
          <Text style={styles.brandDesc}>
            Original Full-Featured Mobile Video Editor built with React Native and Expo.
          </Text>
        </Card>

        {/* Clean-Room Policy & Architectural Statement */}
        <Text style={styles.sectionTitle}>Compliance & Integrity</Text>
        <Card style={styles.card}>
          <Text style={styles.policyTitle}>Clean-Room Implementation</Text>
          <Text style={styles.policyText}>
            NovaCut is an independent, original application engineered from the ground up.
            It does not contain, distribute, or port any proprietary assets, shaders,
            templates, or code from commercial editors.
          </Text>
        </Card>

        {/* Media Pipeline Specs */}
        <Text style={styles.sectionTitle}>Media Architecture</Text>
        <Card style={styles.card}>
          <View style={styles.specRow}>
            <Text style={styles.specKey}>Internal Timebase:</Text>
            <Text style={styles.specVal}>Microseconds (1 µs = 10⁻⁶ s)</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specKey}>Preview Engine:</Text>
            <Text style={styles.specVal}>Android Media3 / ExoPlayer</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specKey}>Rendering Pipeline:</Text>
            <Text style={styles.specVal}>Hardware Accelerated (H.264 / AAC)</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specKey}>Target Architecture:</Text>
            <Text style={styles.specVal}>Android arm64-v8a / armeabi-v7a</Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  card: {
    marginBottom: spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  brandDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  policyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  policyText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  specKey: {
    fontSize: 13,
    color: colors.textMuted,
  },
  specVal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
