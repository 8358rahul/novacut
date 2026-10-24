import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { ColorAdjustments } from '../../core/models/clip';
import {
  LUT_FILTERS_CATALOG,
  VISUAL_EFFECTS_CATALOG,
  LutFilterConfig,
  VisualEffectConfig,
  VisualEffectType,
  VisualEffectCategory,
  LutFilterCategory,
} from '../../core/effects/effectRegistry';

export interface FilterModalProps {
  visible: boolean;
  colorAdjustments: ColorAdjustments;
  lutFilterId?: string;
  lutIntensity?: number;
  visualEffect?: string;
  visualEffectIntensity?: number;
  onUpdateAdjustments: (adjustments: Partial<ColorAdjustments>) => void;
  onSelectLut: (lutId: string, intensity: number) => void;
  onSelectVisualEffect: (effectType: VisualEffectType, intensity: number) => void;
  onClose: () => void;
}

const EFFECT_CATEGORIES: ('All' | VisualEffectCategory)[] = [
  'All',
  'Trending',
  'Glitch',
  'Retro',
  'Bling',
  'Motion',
  'Atmosphere',
];

const LUT_CATEGORIES: ('All' | LutFilterCategory)[] = [
  'All',
  'Cinematic',
  'TikTok',
  'Retro',
  'Travel',
  'Monochrome',
];

export const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  colorAdjustments,
  lutFilterId = 'lut_normal',
  lutIntensity = 1.0,
  visualEffect = 'none',
  visualEffectIntensity = 0.7,
  onUpdateAdjustments,
  onSelectLut,
  onSelectVisualEffect,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'effects' | 'luts' | 'manual'>('effects');
  const [selectedEffectCategory, setSelectedEffectCategory] = useState<'All' | VisualEffectCategory>('All');
  const [selectedLutCategory, setSelectedLutCategory] = useState<'All' | LutFilterCategory>('All');

  const filteredEffects = VISUAL_EFFECTS_CATALOG.filter((fx) => {
    if (selectedEffectCategory === 'All') return true;
    return fx.category === selectedEffectCategory;
  });

  const filteredLuts = LUT_FILTERS_CATALOG.filter((lut) => {
    if (selectedLutCategory === 'All') return true;
    return lut.category === selectedLutCategory;
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Effects & Color Grading ✨</Text>
              <Text style={styles.subtitle}>24+ Readymade video shaders & 18+ cinematic 3D LUTs</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Main Tab Bar */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'effects' && styles.tabBtnActive]}
              onPress={() => setActiveTab('effects')}
            >
              <Text style={[styles.tabText, activeTab === 'effects' && styles.tabTextActive]}>
                ⚡ Video Effects ({VISUAL_EFFECTS_CATALOG.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'luts' && styles.tabBtnActive]}
              onPress={() => setActiveTab('luts')}
            >
              <Text style={[styles.tabText, activeTab === 'luts' && styles.tabTextActive]}>
                🎨 Color LUTs ({LUT_FILTERS_CATALOG.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'manual' && styles.tabBtnActive]}
              onPress={() => setActiveTab('manual')}
            >
              <Text style={[styles.tabText, activeTab === 'manual' && styles.tabTextActive]}>
                🎛️ Adjust
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAB 1: VISUAL VIDEO EFFECTS */}
          {activeTab === 'effects' && (
            <View style={{ flex: 1 }}>
              {/* Category Filter Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.pillRow}
                contentContainerStyle={styles.pillContainer}
              >
                {EFFECT_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.pill, selectedEffectCategory === cat && styles.pillActive]}
                    onPress={() => setSelectedEffectCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        selectedEffectCategory === cat && styles.pillTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Intensity Control when effect is active */}
              {visualEffect !== 'none' && (
                <View style={styles.intensityBar}>
                  <Text style={styles.intensityLabel}>
                    Effect Intensity: {Math.round(visualEffectIntensity * 100)}%
                  </Text>
                  <View style={styles.intensityBtnRow}>
                    {[0.25, 0.5, 0.75, 1.0].map((level) => (
                      <TouchableOpacity
                        key={level}
                        style={[
                          styles.intensityPill,
                          Math.abs(visualEffectIntensity - level) < 0.1 && styles.intensityPillActive,
                        ]}
                        onPress={() => onSelectVisualEffect(visualEffect as VisualEffectType, level)}
                      >
                        <Text style={styles.intensityPillText}>{Math.round(level * 100)}%</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Grid of Readymade Effects */}
              <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.gridWrap}>
                  {filteredEffects.map((fx) => {
                    const isSelected = visualEffect === fx.type;
                    return (
                      <TouchableOpacity
                        key={fx.type}
                        style={[styles.cardItem, isSelected && styles.cardItemActive]}
                        onPress={() => onSelectVisualEffect(fx.type, fx.intensity)}
                        activeOpacity={0.7}
                      >
                        {fx.badge && (
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>{fx.badge}</Text>
                          </View>
                        )}
                        <View style={[styles.previewSample, isSelected && styles.previewSampleActive]}>
                          <Text style={styles.sampleEmoji}>{fx.icon}</Text>
                        </View>
                        <Text style={[styles.cardTitle, isSelected && styles.cardTitleActive]} numberOfLines={1}>
                          {fx.name}
                        </Text>
                        <Text style={styles.cardCategory}>{fx.category}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}

          {/* TAB 2: COLOR LUTS */}
          {activeTab === 'luts' && (
            <View style={{ flex: 1 }}>
              {/* Category Filter Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.pillRow}
                contentContainerStyle={styles.pillContainer}
              >
                {LUT_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.pill, selectedLutCategory === cat && styles.pillActive]}
                    onPress={() => setSelectedLutCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        selectedLutCategory === cat && styles.pillTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Intensity Control when LUT is active */}
              <View style={styles.intensityBar}>
                <Text style={styles.intensityLabel}>
                  LUT Strength: {Math.round(lutIntensity * 100)}%
                </Text>
                <View style={styles.intensityBtnRow}>
                  {[0.25, 0.5, 0.75, 1.0].map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.intensityPill,
                        Math.abs(lutIntensity - level) < 0.1 && styles.intensityPillActive,
                      ]}
                      onPress={() => onSelectLut(lutFilterId, level)}
                    >
                      <Text style={styles.intensityPillText}>{Math.round(level * 100)}%</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Grid of Readymade LUT Filters */}
              <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.gridWrap}>
                  {filteredLuts.map((lut) => {
                    const isSelected = lutFilterId === lut.id;
                    return (
                      <TouchableOpacity
                        key={lut.id}
                        style={[styles.cardItem, isSelected && styles.cardItemActive]}
                        onPress={() => onSelectLut(lut.id, lut.intensity)}
                        activeOpacity={0.7}
                      >
                        {lut.badge && (
                          <View style={styles.badgeLut}>
                            <Text style={styles.badgeText}>{lut.badge}</Text>
                          </View>
                        )}
                        <View
                          style={[
                            styles.previewSample,
                            {
                              backgroundColor:
                                lut.tintRgba !== 'transparent' ? lut.tintRgba : '#334155',
                            },
                            isSelected && styles.previewSampleActive,
                          ]}
                        >
                          <Text style={styles.sampleEmoji}>🎬</Text>
                        </View>
                        <Text style={[styles.cardTitle, isSelected && styles.cardTitleActive]} numberOfLines={1}>
                          {lut.name}
                        </Text>
                        <Text style={styles.cardCategory}>{lut.category}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}

          {/* TAB 3: MANUAL ADJUSTMENTS */}
          {activeTab === 'manual' && (
            <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionTitle}>Precision Color Parameters</Text>

              {[
                { key: 'brightness', label: 'Brightness', val: colorAdjustments.brightness, step: 0.1, fmt: (v: number) => `${Math.round(v * 100)}%` },
                { key: 'contrast', label: 'Contrast', val: colorAdjustments.contrast, step: 0.1, fmt: (v: number) => `${Math.round(v * 100)}%` },
                { key: 'saturation', label: 'Saturation', val: colorAdjustments.saturation, step: 0.1, fmt: (v: number) => `${Math.round(v * 100)}%` },
                { key: 'temperature', label: 'Warmth / Temp', val: colorAdjustments.temperature, step: 0.1, fmt: (v: number) => (v > 0 ? `+${Math.round(v * 100)} warm` : `${Math.round(v * 100)} cool`) },
              ].map((param) => (
                <View key={param.key} style={styles.sliderRow}>
                  <Text style={styles.paramLabel}>
                    {param.label}: <Text style={styles.paramValue}>{param.fmt(param.val)}</Text>
                  </Text>
                  <View style={styles.stepBtnGroup}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() =>
                        onUpdateAdjustments({
                          [param.key]: Number((param.val - param.step).toFixed(2)),
                        })
                      }
                    >
                      <Text style={styles.stepBtnText}>−</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() =>
                        onUpdateAdjustments({
                          [param.key]: Number((param.val + param.step).toFixed(2)),
                        })
                      }
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() =>
                  onUpdateAdjustments({
                    brightness: 0,
                    contrast: 1.0,
                    saturation: 1.0,
                    temperature: 0,
                  })
                }
              >
                <Text style={styles.resetBtnText}>↺ Reset Parameters to Default</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* Done Button */}
          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Apply & Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#18181C',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.md,
    height: '82%',
    borderWidth: 1,
    borderColor: '#2A2A32',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    backgroundColor: '#26262E',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#101014',
    borderRadius: borderRadius.md,
    padding: 3,
    marginBottom: spacing.sm,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabBtnActive: {
    backgroundColor: '#26262E',
  },
  tabText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#00E5FF',
    fontWeight: '700',
  },
  pillRow: {
    maxHeight: 38,
    marginBottom: spacing.xs,
  },
  pillContainer: {
    paddingHorizontal: 2,
    gap: 6,
    flexDirection: 'row',
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#22222A',
    borderWidth: 1,
    borderColor: '#32323E',
  },
  pillActive: {
    backgroundColor: '#00E5FF',
    borderColor: '#00E5FF',
  },
  pillText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#000000',
    fontWeight: '800',
  },
  intensityBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#202028',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    marginVertical: 4,
  },
  intensityLabel: {
    color: '#E5E7EB',
    fontSize: 11,
    fontWeight: '600',
  },
  intensityBtnRow: {
    flexDirection: 'row',
    gap: 4,
  },
  intensityPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#2C2C38',
  },
  intensityPillActive: {
    backgroundColor: '#FF007A',
  },
  intensityPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  contentScroll: {
    flex: 1,
    marginTop: 4,
  },
  sectionTitle: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: spacing.lg,
  },
  cardItem: {
    width: '31%',
    backgroundColor: '#1E1E26',
    borderRadius: borderRadius.md,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
    position: 'relative',
  },
  cardItemActive: {
    borderColor: '#00E5FF',
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF007A',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    zIndex: 2,
  },
  badgeLut: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#F59E0B',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    zIndex: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
  previewSample: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    backgroundColor: '#2C2C38',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  previewSampleActive: {
    borderWidth: 1.5,
    borderColor: '#00E5FF',
  },
  sampleEmoji: {
    fontSize: 22,
  },
  cardTitle: {
    color: '#E5E7EB',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  cardTitleActive: {
    color: '#00E5FF',
  },
  cardCategory: {
    color: '#6B7280',
    fontSize: 9,
    marginTop: 2,
  },
  sliderRow: {
    backgroundColor: '#202028',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paramLabel: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '600',
  },
  paramValue: {
    color: '#00E5FF',
    fontWeight: '700',
  },
  stepBtnGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  stepBtn: {
    backgroundColor: '#2C2C38',
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  resetBtn: {
    marginTop: 12,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#22222A',
  },
  resetBtnText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  doneBtn: {
    backgroundColor: '#00E5FF',
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  doneBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
});
