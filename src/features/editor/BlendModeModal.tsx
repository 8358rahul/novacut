import { AppModal as Modal } from '../../components/AppModal';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { BlendMode } from '../../core/models/clip';

export interface BlendModeModalProps {
  visible: boolean;
  currentMode?: BlendMode;
  onSelect: (mode: BlendMode) => void;
  onClose: () => void;
}

const BLEND_MODES: { id: BlendMode; title: string; desc: string; icon: string }[] = [
  { id: 'normal', title: 'Normal', desc: 'Standard solid overlay', icon: '◻️' },
  { id: 'screen', title: 'Screen', desc: 'Blend light; remove black backgrounds (sparks, light leaks)', icon: '✨' },
  { id: 'multiply', title: 'Multiply', desc: 'Blend shadows; remove white backgrounds (paper, ink)', icon: '🌑' },
  { id: 'overlay', title: 'Overlay', desc: 'Boost contrast combining Screen & Multiply', icon: '🎭' },
  { id: 'softLight', title: 'Soft Light', desc: 'Gentle diffused lighting tint', icon: '💡' },
  { id: 'hardLight', title: 'Hard Light', desc: 'Vibrant punchy spotlight effect', icon: '🔦' },
  { id: 'darken', title: 'Darken', desc: 'Retains darker pixels between layers', icon: '🔻' },
  { id: 'lighten', title: 'Lighten', desc: 'Retains lighter pixels between layers', icon: '🔺' },
];

export const BlendModeModal: React.FC<BlendModeModalProps> = ({
  visible,
  currentMode = 'normal',
  onSelect,
  onClose,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Blend Modes (PIP / Overlay)</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" style={styles.list} showsVerticalScrollIndicator={false}>
            {BLEND_MODES.map((item) => {
              const isSelected = currentMode === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                  onPress={() => {
                    onSelect(item.id);
                    onClose();
                  }}
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
