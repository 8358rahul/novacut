import { AppModal as Modal } from '../../components/AppModal';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { TransitionType, Transition } from '../../core/models/clip';
import { secondsToMicros } from '../../core/models/timeline';

export interface TransitionModalProps {
  visible: boolean;
  currentTransition?: Transition;
  onSelect: (transition: Transition | undefined) => void;
  onClose: () => void;
}

const TRANSITIONS: { type: TransitionType; label: string; icon: string }[] = [
  { type: 'none', label: 'None (Hard Cut)', icon: '✂️' },
  { type: 'dissolve', label: 'Cross Dissolve', icon: '✨' },
  { type: 'fade', label: 'Fade to Black', icon: '🌑' },
  { type: 'slideLeft', label: 'Slide Left', icon: '⬅️' },
  { type: 'slideRight', label: 'Slide Right', icon: '➡️' },
  { type: 'zoomIn', label: 'Zoom In', icon: '🔍' },
];

export const TransitionModal: React.FC<TransitionModalProps> = ({
  visible,
  currentTransition,
  onSelect,
  onClose,
}) => {
  const selectedType = currentTransition?.type || 'none';

  const handleChoose = (type: TransitionType) => {
    if (type === 'none') {
      onSelect(undefined);
    } else {
      onSelect({
        type,
        durationUs: secondsToMicros(0.8), // 0.8s transition default
      });
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Transition</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.grid}>
            {TRANSITIONS.map((item) => {
              const isSelected = selectedType === item.type;
              return (
                <TouchableOpacity
                  key={item.type}
                  style={[styles.card, isSelected && styles.cardSelected]}
                  onPress={() => handleChoose(item.type)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.icon}>{item.icon}</Text>
                  <Text style={[styles.label, isSelected && styles.labelSelected]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.lg,
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
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  closeIcon: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  card: {
    width: '48%',
    backgroundColor: colors.timelineBg,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  icon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  labelSelected: {
    color: colors.textPrimary,
  },
});
