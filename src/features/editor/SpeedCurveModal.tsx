import { AppModal as Modal } from '../../components/AppModal';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { SpeedCurve, SpeedCurvePreset } from '../../core/models/clip';
import { createSpeedCurveFromPreset } from '../../core/timeline/speedCurves';

export interface SpeedCurveModalProps {
  visible: boolean;
  currentCurve?: SpeedCurve;
  onSelect: (curve: SpeedCurve | undefined) => void;
  onClose: () => void;
}

const PRESET_OPTIONS: { id: SpeedCurvePreset; title: string; desc: string; icon: string }[] = [
  { id: 'standard', title: 'Normal (1.0x)', desc: 'Constant linear playback speed', icon: '⏱️' },
  { id: 'montage', title: 'Montage (2.5x → 0.3x → 2x)', desc: 'Dynamic impact curve for beats', icon: '⚡' },
  { id: 'hero', title: 'Hero (1.2x → 0.2x → 1.2x)', desc: 'Dramatic slow-motion focus', icon: '🦸' },
  { id: 'bullet', title: 'Bullet Time (5x → 0.2x → 4x)', desc: 'High-speed action and matrix pause', icon: '🎯' },
  { id: 'jumpCut', title: 'Jump Cut (3x / 0.5x)', desc: 'Rhythmic alternating speed cuts', icon: '✂️' },
  { id: 'flashIn', title: 'Flash In (5x → 1x)', desc: 'Fast deceleration entry into scene', icon: '🚀' },
  { id: 'flashOut', title: 'Flash Out (1x → 5x)', desc: 'Speed acceleration transition exit', icon: '💨' },
];

export const SpeedCurveModal: React.FC<SpeedCurveModalProps> = ({
  visible,
  currentCurve,
  onSelect,
  onClose,
}) => {
  const activePreset = currentCurve?.preset || 'standard';

  const handleChoose = (preset: SpeedCurvePreset) => {
    if (preset === 'standard') {
      onSelect(undefined);
    } else {
      onSelect(createSpeedCurveFromPreset(preset));
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Curve Speed (CapCut Style)</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" style={styles.list} showsVerticalScrollIndicator={false}>
            {PRESET_OPTIONS.map((item) => {
              const isSelected = activePreset === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                  onPress={() => handleChoose(item.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.icon}>{item.icon}</Text>
                  <View style={styles.itemTextContainer}>
                    <Text style={[styles.itemTitle, isSelected && styles.itemTitleSelected]}>
                      {item.title}
                    </Text>
                    <Text style={styles.itemDesc}>{item.desc}</Text>
                  </View>
                  {isSelected && <Text style={styles.checkMark}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceLight,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.md,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderColor: colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  closeIcon: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '600',
  },
  list: {
    marginBottom: spacing.sm,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  itemCardSelected: {
    borderColor: colors.accentGold,
    backgroundColor: colors.surfaceLight,
  },
  icon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  itemTitleSelected: {
    color: colors.accentGold,
  },
  itemDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  checkMark: {
    fontSize: 18,
    color: colors.accentGold,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
});
