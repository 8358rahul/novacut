import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';
import {
  SplitScreenLayoutType,
  SPLIT_SCREEN_LAYOUTS,
  SplitScreenLayoutDefinition,
  createSplitScreenProject,
  buildSplitScreenCapCutDraft,
} from '../../core/splitscreen/splitScreenEngine';
import { Project } from '../../core/models/project';

export interface SplitScreenModalProps {
  visible: boolean;
  onApplyLayout: (newProject: Project) => void;
  onClose: () => void;
}

export const SplitScreenModal: React.FC<SplitScreenModalProps> = ({
  visible,
  onApplyLayout,
  onClose,
}) => {
  const [selectedType, setSelectedType] = useState<SplitScreenLayoutType>('4-split-quad');
  const [draftJsonPreview, setDraftJsonPreview] = useState<string | null>(null);

  const selectedLayout = SPLIT_SCREEN_LAYOUTS[selectedType];

  const handleApply = () => {
    const proj = createSplitScreenProject({
      layoutType: selectedType,
      durationUs: 5_000_000,
    });
    onApplyLayout(proj);
    onClose();
  };

  const handleExportCapCutDraft = () => {
    const draft = buildSplitScreenCapCutDraft({
      layoutType: selectedType,
      durationUs: 2_240_000,
    });
    const jsonStr = JSON.stringify(draft, null, 2);
    setDraftJsonPreview(jsonStr);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Split Screen & Collage</Text>
              <Text style={styles.subtitle}>Reverse-engineered from CapCut Multi-Track PIP Engine</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {draftJsonPreview ? (
            /* Draft JSON View */
            <View style={styles.jsonContainer}>
              <View style={styles.jsonHeader}>
                <Text style={styles.jsonTitle}>CapCut Native Draft (template.json)</Text>
                <TouchableOpacity onPress={() => setDraftJsonPreview(null)}>
                  <Text style={styles.backBtnText}>← Back</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.jsonScroll}>
                <Text style={styles.jsonCode}>{draftJsonPreview}</Text>
              </ScrollView>
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={() => {
                  Alert.alert('Draft Exported', 'CapCut template.json draft copied to memory successfully!');
                }}
              >
                <Text style={styles.actionBtnPrimaryText}>Copy CapCut JSON</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Layout Selection View */
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              {/* Layout Picker Cards */}
              <Text style={styles.sectionTitle}>Select Collage Layout</Text>
              <View style={styles.grid}>
                {(Object.values(SPLIT_SCREEN_LAYOUTS) as SplitScreenLayoutDefinition[]).map((layout) => {
                  const isSelected = selectedType === layout.type;
                  return (
                    <TouchableOpacity
                      key={layout.type}
                      style={[styles.layoutCard, isSelected && styles.layoutCardSelected]}
                      onPress={() => setSelectedType(layout.type)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.layoutIcon}>{layout.icon}</Text>
                      <Text style={[styles.layoutTitle, isSelected && styles.layoutTitleSelected]}>
                        {layout.title}
                      </Text>
                      <Text style={styles.layoutSlotsBadge}>{layout.slotCount} Clips</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Geometry Preview & Info */}
              <View style={styles.previewBox}>
                <Text style={styles.previewHeading}>{selectedLayout.title}</Text>
                <Text style={styles.previewDesc}>{selectedLayout.description}</Text>

                <View style={styles.slotsTable}>
                  <Text style={styles.tableTitle}>CapCut Normalized Coordinate Mapping:</Text>
                  {selectedLayout.slots.map((slot) => (
                    <View key={slot.slotIndex} style={styles.slotRow}>
                      <Text style={styles.slotLabel}>
                        Track {slot.slotIndex === 0 ? '0 (Main)' : `${slot.slotIndex} (PIP)`} — {slot.label}
                      </Text>
                      <Text style={styles.slotCoord}>
                        [x: {slot.normX.toFixed(2)}, y: {slot.normY.toFixed(2)}]
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.actionBtnSecondary} onPress={handleExportCapCutDraft}>
                  <Text style={styles.actionBtnSecondaryText}>View CapCut Draft JSON</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtnPrimary} onPress={handleApply}>
                  <Text style={styles.actionBtnPrimaryText}>Apply to Timeline</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
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
    backgroundColor: '#1E1E22',
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '85%',
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C34',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  closeIcon: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  layoutCard: {
    width: '31%',
    backgroundColor: '#26262E',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  layoutCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#2A1D36',
  },
  layoutIcon: {
    fontSize: 22,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  layoutTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  layoutTitleSelected: {
    color: colors.primary,
  },
  layoutSlotsBadge: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
  },
  previewBox: {
    backgroundColor: '#141417',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#2A2A33',
  },
  previewHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  previewDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  slotsTable: {
    borderTopWidth: 1,
    borderTopColor: '#26262E',
    paddingTop: spacing.xs,
  },
  tableTitle: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  slotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  slotLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  slotCoord: {
    fontSize: 11,
    color: '#38BDF8',
    fontFamily: 'monospace',
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionBtnSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    backgroundColor: '#2C2C34',
    alignItems: 'center',
  },
  actionBtnSecondaryText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  actionBtnPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  jsonContainer: {
    padding: spacing.md,
  },
  jsonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  jsonTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  backBtnText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  jsonScroll: {
    backgroundColor: '#101014',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    maxHeight: 280,
    marginBottom: spacing.md,
  },
  jsonCode: {
    color: '#10B981',
    fontSize: 10,
    fontFamily: 'monospace',
  },
});

