import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { AudioClip } from '../../core/models/clip';
import { secondsToMicros, microsToSeconds } from '../../core/models/timeline';

export interface AudioModalProps {
  visible: boolean;
  clip: AudioClip | null;
  onUpdate: (updates: { volume?: number; fadeInUs?: number; fadeOutUs?: number }) => void;
  onClose: () => void;
}

export const AudioModal: React.FC<AudioModalProps> = ({
  visible,
  clip,
  onUpdate,
  onClose,
}) => {
  if (!clip) return null;

  const volumePct = Math.round((clip.volume ?? 1) * 100);
  const fadeInSec = Math.round(microsToSeconds(clip.fadeInDurationUs || 0) * 10) / 10;
  const fadeOutSec = Math.round(microsToSeconds(clip.fadeOutDurationUs || 0) * 10) / 10;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Audio & Mixing</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Volume Control */}
          <View style={styles.controlRow}>
            <Text style={styles.label}>Volume: {volumePct}%</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => onUpdate({ volume: Math.max(0, clip.volume - 0.1) })}
              >
                <Text style={styles.stepText}>−</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => onUpdate({ volume: Math.min(2.0, clip.volume + 0.1) })}
              >
                <Text style={styles.stepText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Fade In Ramp */}
          <View style={styles.controlRow}>
            <Text style={styles.label}>Fade In: {fadeInSec}s</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() =>
                  onUpdate({
                    fadeInUs: Math.max(0, clip.fadeInDurationUs - secondsToMicros(0.5)),
                  })
                }
              >
                <Text style={styles.stepText}>−</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() =>
                  onUpdate({
                    fadeInUs: Math.min(secondsToMicros(5), clip.fadeInDurationUs + secondsToMicros(0.5)),
                  })
                }
              >
                <Text style={styles.stepText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Fade Out Ramp */}
          <View style={styles.controlRow}>
            <Text style={styles.label}>Fade Out: {fadeOutSec}s</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() =>
                  onUpdate({
                    fadeOutUs: Math.max(0, clip.fadeOutDurationUs - secondsToMicros(0.5)),
                  })
                }
              >
                <Text style={styles.stepText}>−</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() =>
                  onUpdate({
                    fadeOutUs: Math.min(secondsToMicros(5), clip.fadeOutDurationUs + secondsToMicros(0.5)),
                  })
                }
              >
                <Text style={styles.stepText}>+</Text>
              </TouchableOpacity>
            </View>
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
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});
