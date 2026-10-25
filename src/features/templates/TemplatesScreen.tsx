import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import {
  VIRAL_TEMPLATES,
  TemplateDefinition,
  TemplateCategory,
  UserSelectedMediaSlot,
  compileProjectFromTemplate,
  calculateBeatDropMarkers,
} from '../../core/templates/templateEngine';
import { defaultProjectStorage } from '../../core/persistence/storage';
import { formatTimecode } from '../../core/models/timeline';
import { useGuaranteedInsets } from '../../navigation/safeArea';
import { pickVideoFromStorage } from '../../services/mediaImport';

export interface TemplatesScreenProps {
  onBack: () => void;
  onOpenProject: (projectId: string) => void;
  onOpenSearch?: () => void;
}

const CATEGORIES: ('All' | TemplateCategory)[] = [
  'All',
  'TikTok Trending',
  'Beat Sync',
  'Phonk & Drift',
  'Travel Vlog',
  'Glitch & Velocity',
  'Fashion & OOTD',
  'Aesthetic',
];

export const TemplatesScreen: React.FC<TemplatesScreenProps> = ({
  onBack,
  onOpenProject,
  onOpenSearch,
}) => {
  const insets = useGuaranteedInsets();
  const [selectedCategory, setSelectedCategory] = useState<'All' | TemplateCategory>('All');
  const [activeTemplate, setActiveTemplate] = useState<TemplateDefinition | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<UserSelectedMediaSlot[]>([]);
  const [isCompiling, setIsCompiling] = useState(false);

  const filteredTemplates = useMemo(() => {
    if (selectedCategory === 'All') return VIRAL_TEMPLATES;
    return VIRAL_TEMPLATES.filter((t) => t.category === selectedCategory);
  }, [selectedCategory]);

  const handleOpenTemplate = (tpl: TemplateDefinition) => {
    setActiveTemplate(tpl);
    // Pre-populate with default demo slots so user can immediately test
    const initialSlots: UserSelectedMediaSlot[] = tpl.slots.map((s, idx) => ({
      slotIndex: idx,
      uri: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
      title: `${s.label}`,
      type: 'image',
    }));
    setSelectedSlots(initialSlots);
  };

  const beatMarkers = useMemo(() => {
    if (!activeTemplate) return [];
    const totalDurationUs = activeTemplate.slots.reduce((sum, s) => sum + s.durationUs, 0);
    return calculateBeatDropMarkers(activeTemplate.bpm, totalDurationUs);
  }, [activeTemplate]);

  const handleSwapSlot = async (index: number) => {
    const slot = activeTemplate?.slots[index];
    if (!slot) return;
    try {
      const preferred = slot.requiredType === 'image' ? 'image' : 'all';
      const picked = await pickVideoFromStorage('temp_track', 0, preferred);
      if (picked) {
        setSelectedSlots((prev) =>
          prev.map((s) =>
            s.slotIndex === index
              ? {
                  slotIndex: index,
                  uri: picked.asset.uri,
                  title: picked.asset.name,
                  type: picked.asset.type === 'image' ? 'image' : 'video',
                }
              : s
          )
        );
      }
    } catch (e: any) {
      Alert.alert('Gallery Selection', e.message || 'Could not pick media for slot');
    }
  };

  const handleCreateProject = async () => {
    if (!activeTemplate) return;
    setIsCompiling(true);

    try {
      const project = compileProjectFromTemplate(activeTemplate, selectedSlots);
      await defaultProjectStorage.saveProject(project);

      setIsCompiling(false);
      setActiveTemplate(null);
      onOpenProject(project.metadata.id);
    } catch (e: any) {
      setIsCompiling(false);
      Alert.alert('Compilation Failed', e.message || 'Could not compile template.');
    }
  };

  const renderTemplateCard = ({ item }: { item: TemplateDefinition }) => {
    const totalDurationUs = item.slots.reduce((sum, s) => sum + s.durationUs, 0);

    return (
      <TouchableOpacity
        style={styles.templateCard}
        activeOpacity={0.8}
        onPress={() => handleOpenTemplate(item)}
      >
        {/* Card Visual Hero with Gradient Simulation */}
        <View style={[styles.cardHero, { backgroundColor: item.previewGradient[0] }]}>
          <Text style={styles.cardEmoji}>{item.previewThumbnail}</Text>
          <View style={styles.cardBadgeRow}>
            <View style={styles.slotsPill}>
              <Text style={styles.slotsPillText}>{item.slots.length} Clips</Text>
            </View>
            <View style={styles.durationPill}>
              <Text style={styles.durationPillText}>{formatTimecode(totalDurationUs)}</Text>
            </View>
          </View>
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.cardSound} numberOfLines={1}>
            🎵 {item.soundTitle}
          </Text>
          <View style={styles.tagRow}>
            {item.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} label={tag} variant="muted" />
            ))}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-background w-full items-center">
      <View className="w-full max-w-4xl flex-1">
        <Header
        title="Viral Templates"
        onBack={onBack}
        rightAction={
          onOpenSearch && (
            <TouchableOpacity onPress={onOpenSearch} style={styles.headerSearchBtn}>
              <Text style={styles.headerSearchIcon}>🔍</Text>
            </TouchableOpacity>
          )
        }
      />

      {/* Category Pills Header */}
      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryPill, selectedCategory === cat && styles.categoryPillActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Templates Grid List */}
      <FlatList
        data={filteredTemplates}
        keyExtractor={(item) => item.id}
        renderItem={renderTemplateCard}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={[styles.listContainer, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      />

      {/* Template Detail & CutSame Multi-Slot Modal */}
      {activeTemplate && (
        <Modal
          visible={true}
          transparent
          animationType="slide"
          onRequestClose={() => setActiveTemplate(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              {/* Sheet Header */}
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>{activeTemplate.title}</Text>
                  <Text style={styles.sheetSubtitle}>By {activeTemplate.author} • {activeTemplate.bpm} BPM</Text>
                </View>
                <TouchableOpacity style={styles.closeSheetBtn} onPress={() => setActiveTemplate(null)}>
                  <Text style={styles.closeSheetIcon}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Template Audio & Beat Info Bar */}
              <View style={styles.musicBar}>
                <Text style={styles.musicBarIcon}>🎵</Text>
                <Text style={styles.musicBarTitle} numberOfLines={1}>{activeTemplate.soundTitle}</Text>
                <Badge label="Beat Sync ⚡" variant="primary" />
              </View>

              {/* Beat Tracking Rhythm Visualizer */}
              <View style={styles.beatRibbonContainer}>
                <View style={styles.beatRibbonHeader}>
                  <Text style={styles.beatRibbonTitle}>⚡ Audio Beat Drops ({activeTemplate.bpm} BPM)</Text>
                  <Text style={styles.beatCountBadge}>{beatMarkers.length} Drops Synced</Text>
                </View>
                <View style={styles.beatRibbonTrack}>
                  {Array.from({ length: 28 }).map((_, i) => {
                    const isDrop = i % 4 === 0 || i % 7 === 0;
                    return (
                      <View
                        key={i}
                        style={[
                          styles.beatBar,
                          { height: isDrop ? 22 : 6 + (i % 4) * 3 },
                          isDrop && styles.beatBarHighlight,
                        ]}
                      />
                    );
                  })}
                </View>
              </View>

              {/* Slots Selection Overview */}
              <Text style={styles.slotsHeader}>
                Required Media Slots ({selectedSlots.length}/{activeTemplate.slots.length} Ready)
              </Text>

              <ScrollView style={styles.slotsScroll} showsVerticalScrollIndicator={false}>
                {activeTemplate.slots.map((slot, index) => {
                  const assigned = selectedSlots.find((s) => s.slotIndex === index);
                  return (
                    <View key={slot.id} style={styles.slotItemCard}>
                      <View style={styles.slotBadgeNumber}>
                        <Text style={styles.slotNumberText}>#{index + 1}</Text>
                      </View>
                      <View style={styles.slotMainInfo}>
                        <View style={styles.slotLabelRow}>
                          <Text style={styles.slotLabelTitle}>{slot.label}</Text>
                          {slot.isBeatDrop && <Badge label="Beat Drop" variant="primary" />}
                        </View>
                        <Text style={styles.slotDurationDesc}>
                          Duration: {formatTimecode(slot.durationUs)} • {slot.requiredType.toUpperCase()}
                        </Text>
                        <Text style={styles.slotAssignedUri} numberOfLines={1}>
                          ✓ Ready: {assigned?.title || 'Clip Selected'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.slotSwapBtn}
                        onPress={() => handleSwapSlot(index)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.slotSwapText}>Swap</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>

              {/* Action Buttons */}
              <View style={[styles.sheetActions, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setActiveTemplate(null)}
                  style={styles.sheetBtn}
                />
                <Button
                  title={isCompiling ? 'Creating Video...' : 'Use Template 🚀'}
                  variant="primary"
                  onPress={handleCreateProject}
                  style={styles.sheetBtn}
                  disabled={isCompiling}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerSearchBtn: {
    padding: spacing.xs,
  },
  headerSearchIcon: {
    fontSize: 18,
  },
  categoryContainer: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  categoryPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.timelineBg,
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
  },
  categoryText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  listContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  templateCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHero: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cardEmoji: {
    fontSize: 48,
  },
  cardBadgeRow: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  slotsPill: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  slotsPillText: {
    color: colors.textPrimary,
    fontSize: 9,
    fontWeight: '700',
  },
  durationPill: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  durationPillText: {
    color: colors.textPrimary,
    fontSize: 9,
    fontWeight: '600',
  },
  cardInfo: {
    padding: spacing.sm,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardSound: {
    color: colors.textMuted,
    fontSize: 10,
    marginBottom: spacing.xs,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  sheetSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  closeSheetBtn: {
    backgroundColor: colors.timelineBg,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeSheetIcon: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  musicBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.timelineBg,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  musicBarIcon: {
    fontSize: 16,
  },
  musicBarTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  slotsHeader: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  slotsScroll: {
    maxHeight: 280,
    marginBottom: spacing.md,
  },
  slotItemCard: {
    flexDirection: 'row',
    backgroundColor: colors.timelineBg,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs + 2,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotBadgeNumber: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotNumberText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 14,
  },
  slotMainInfo: {
    flex: 1,
  },
  slotLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  slotLabelTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  slotDurationDesc: {
    color: colors.textMuted,
    fontSize: 11,
  },
  slotAssignedUri: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  slotSwapBtn: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  slotSwapText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  beatRibbonContainer: {
    backgroundColor: colors.timelineBg,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  beatRibbonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  beatRibbonTitle: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  beatCountBadge: {
    color: colors.accentGold,
    fontSize: 10,
    fontWeight: 'bold',
  },
  beatRibbonTrack: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 24,
    gap: 3,
    paddingTop: 2,
  },
  beatBar: {
    flex: 1,
    backgroundColor: colors.borderLight,
    borderRadius: 1,
  },
  beatBarHighlight: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  sheetBtn: {
    flex: 1,
  },
});
