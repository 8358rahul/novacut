import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { Button } from '../../components/Button';
import { SubtitleCue, parseSrtContent } from '../../core/timeline/subtitles';
import { secondsToMicros, formatTimecode } from '../../core/models/timeline';

export interface SubtitleModalProps {
  visible: boolean;
  playheadUs: number;
  onImportCues: (cues: SubtitleCue[]) => void;
  onClose: () => void;
}

const SAMPLE_SRT = `1
00:00:00,500 --> 00:00:02,500
Welcome to NovaCut Video Editor!

2
00:00:02,800 --> 00:00:05,200
Multitrack timeline with CapCut-grade precision.

3
00:00:05,500 --> 00:00:08,000
Color grading, transitions, and audio mixing!`;

export const SubtitleModal: React.FC<SubtitleModalProps> = ({
  visible,
  playheadUs,
  onImportCues,
  onClose,
}) => {
  const [srtInput, setSrtInput] = useState(SAMPLE_SRT);
  const [singleText, setSingleText] = useState('');

  const handleApplySrt = () => {
    const cues = parseSrtContent(srtInput);
    if (cues.length > 0) {
      onImportCues(cues);
      onClose();
    }
  };

  const handleAddSingleCue = () => {
    if (!singleText.trim()) return;
    const cue: SubtitleCue = {
      index: 1,
      startUs: playheadUs,
      endUs: playheadUs + secondsToMicros(2.5),
      text: singleText.trim(),
    };
    onImportCues([cue]);
    setSingleText('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Subtitles & Auto-Captions</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Quick Caption at Playhead */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Add Caption at Playhead ({formatTimecode(playheadUs)})</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter subtitle text..."
                placeholderTextColor={colors.textMuted}
                value={singleText}
                onChangeText={setSingleText}
              />
              <Button
                title="Add Caption"
                size="sm"
                onPress={handleAddSingleCue}
                disabled={!singleText.trim()}
              />
            </View>

            <View style={styles.divider} />

            {/* SRT Import / AI Subtitles */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Import SRT / Auto-Generated Cues</Text>
              <Text style={styles.helpText}>
                Paste subtitle SRT cues below or use the AI transcript template:
              </Text>
              <TextInput
                style={[styles.textInput, styles.srtArea]}
                multiline
                numberOfLines={8}
                value={srtInput}
                onChangeText={setSrtInput}
                placeholder="Paste SRT format here..."
                placeholderTextColor={colors.textMuted}
              />
              <Button
                title="Generate & Apply Subtitles"
                variant="primary"
                onPress={handleApplySrt}
              />
            </View>
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
    maxHeight: '85%',
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
  body: {
    maxHeight: 480,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accentGold,
    marginBottom: spacing.xs,
  },
  helpText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    color: colors.textPrimary,
    padding: spacing.sm,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  srtArea: {
    minHeight: 120,
    textAlignVertical: 'top',
    fontFamily: 'monospace',
    fontSize: 11,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
});
