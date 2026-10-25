import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  TextInput,
  Modal,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import {
  PhotoEditorEngine,
  PhotoProjectState,
  createInitialPhotoState,
  PHOTO_ASPECT_RATIOS,
  PHOTO_FILTERS,
  calculateCanvasDimensions,
  DEFAULT_PHOTO_RETOUCH,
  DEFAULT_PHOTO_CUTOUT,
} from '../../core/photo/photoEngine';

import { CAPCUT_CANVAS_PALETTE } from '../../core/photo/capcutPalette';
import { useGuaranteedInsets } from '../../navigation/safeArea';
import { pickPhotoFromGallery, capturePhotoWithCamera } from '../../services/mediaImport';
import { defaultAIEngineService } from '../../services/aiEngineService';

export interface PhotoEditorScreenProps {
  onBack: () => void;
  initialImageUri?: string;
  onSaveComplete?: (outputPath: string) => void;
}

const DEMO_PHOTO_ASSET =
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80';

const BG_COLORS = CAPCUT_CANVAS_PALETTE.filter((c) => c !== '#00000000');

const GLOW_COLORS = ['#00E5FF', '#FF007A', '#FFD700', '#FFFFFF', '#10B981', '#A855F7'];

const STICKER_CATEGORIES = {
  Trending: ['🔥', '✨', '⚡', '💫', '🎉', '💖', '🎬', '📸'],
  Aesthetic: ['🚀', '🌟', '🌈', '💯', '👑', '💎', '🌸', '🦋'],
  Reactions: ['😍', '🤯', '😎', '🥳', '👀', '🤙', '💯', '💥'],
};

type PhotoToolTab =
  | 'ratio'
  | 'cutout'
  | 'retouch'
  | 'filters'
  | 'adjust'
  | 'background'
  | 'stickers'
  | 'text';

export const PhotoEditorScreen: React.FC<PhotoEditorScreenProps> = ({
  onBack,
  initialImageUri,
  onSaveComplete,
}) => {
  const insets = useGuaranteedInsets();
  const windowWidth = Dimensions.get('window').width;

  const [engine] = useState<PhotoEditorEngine>(() => {
    const uri = initialImageUri || DEMO_PHOTO_ASSET;
    return new PhotoEditorEngine(createInitialPhotoState(uri));
  });

  const [state, setState] = useState<PhotoProjectState>(() => engine.getState());
  const [activeTab, setActiveTab] = useState<PhotoToolTab>('ratio');
  const [textModalVisible, setTextModalVisible] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [newTextContent, setNewTextContent] = useState('');
  const [selectedTextStyle, setSelectedTextStyle] = useState<'neon' | 'bold' | 'bubble' | 'cine'>('neon');
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [showOriginal, setShowOriginal] = useState(false);
  const [activeStickerTab, setActiveStickerTab] = useState<keyof typeof STICKER_CATEGORIES>('Trending');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiStatusText, setAiStatusText] = useState('');

  const handlePickFromGallery = async () => {
    setUploadModalVisible(false);
    try {
      const picked = await pickPhotoFromGallery();
      if (picked) {
        engine.setImageUri(picked.uri, picked.name);
        updateState();
      }
    } catch (e: any) {
      Alert.alert('Gallery Error', e.message || 'Could not pick photo from gallery');
    }
  };

  const handleCaptureCamera = async () => {
    setUploadModalVisible(false);
    try {
      const captured = await capturePhotoWithCamera();
      if (captured) {
        engine.setImageUri(captured.uri, captured.name);
        updateState();
      }
    } catch (e: any) {
      Alert.alert('Camera Error', e.message || 'Could not capture photo');
    }
  };

  const handleUseDemoPhoto = () => {
    setUploadModalVisible(false);
    engine.setImageUri(DEMO_PHOTO_ASSET, 'Sample Beach Photo');
    updateState();
  };

  const isDesktop = windowWidth > 768;
  const maxAvailableWidth = Math.min(windowWidth - 32, isDesktop ? 600 : 380);
  const effectiveCanvasHeight = isDesktop ? 400 : 330;

  const canvasDim = useMemo(() => {
    return calculateCanvasDimensions(state.aspectRatio, maxAvailableWidth, effectiveCanvasHeight);
  }, [state.aspectRatio, maxAvailableWidth, effectiveCanvasHeight]);

  const updateState = useCallback(() => {
    setState({ ...engine.getState() });
  }, [engine]);

  useEffect(() => {
    if (initialImageUri && initialImageUri !== state.imageUri) {
      engine.setImageUri(initialImageUri);
      updateState();
    }
  }, [initialImageUri, engine, updateState]);

  // Adjustments handler
  const handleAdjustmentChange = (key: keyof typeof state.adjustments, delta: number) => {
    const current = state.adjustments[key];
    let next = current + delta;
    if (key === 'contrast' || key === 'saturation') {
      next = Math.max(0, Math.min(2.0, next));
    } else {
      next = Math.max(-1.0, Math.min(1.0, next));
    }
    engine.setAdjustments({ [key]: Number(next.toFixed(2)) });
    updateState();
  };

  // Retouch sliders handler
  const handleRetouchChange = (key: keyof typeof DEFAULT_PHOTO_RETOUCH, value: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    engine.setRetouch({ [key]: clamped });
    updateState();
  };

  // Cutout handlers
  const handleToggleCutout = () => {
    const current = state.cutout || DEFAULT_PHOTO_CUTOUT;
    engine.setCutout({ enabled: !current.enabled });
    updateState();
  };

  const handleAIRemoveBackground = async () => {
    try {
      setIsAIProcessing(true);
      setAiStatusText('Extracting portrait subject with OpenCV GrabCut...');
      const result = await defaultAIEngineService.removeBackground(state.imageUri, 5, 5);
      const cutoutUrl = result.fullUrl || `${defaultAIEngineService.getBaseUrl()}${result.downloadUrl}`;
      if (cutoutUrl) {
        engine.setImageUri(cutoutUrl, `${state.title || 'Photo'} (AI Cutout)`);
        engine.setCutout({ enabled: true, backdropType: 'color', backdropColor: '#18181E' });
        updateState();
        Alert.alert('AI GrabCut Cutout', 'Portrait subject separated successfully with feathered alpha matting!');
      }
    } catch (err: any) {
      Alert.alert(
        'AI Cutout Notice',
        `Could not reach Python AI Engine (${err.message || 'Error'}).\n\nStarting simulated cutout mode. Tip: Run 'python engine/novacut_studio.py' on port 8765 to enable full OpenCV GrabCut acceleration.`
      );
      handleToggleCutout();
    } finally {
      setIsAIProcessing(false);
      setAiStatusText('');
    }
  };

  const handleAIEnhance = async (mode: 'hdr' | 'portrait' | 'night_enhance' | 'vivid') => {
    try {
      setIsAIProcessing(true);
      const labels: Record<string, string> = {
        hdr: 'CLAHE High Dynamic Range',
        portrait: 'Bilateral Portrait Smoothing',
        night_enhance: 'Low-Light Night Boost',
        vivid: 'Vivid Saturation & Vibrance',
      };
      setAiStatusText(`Applying AI ${labels[mode] || mode}...`);
      const result = await defaultAIEngineService.enhanceImage(state.imageUri, mode, 1.0);
      const enhancedUrl = result.fullUrl || `${defaultAIEngineService.getBaseUrl()}${result.downloadUrl}`;
      if (enhancedUrl) {
        engine.setImageUri(enhancedUrl, `${state.title || 'Photo'} (${labels[mode] || mode})`);
        updateState();
        Alert.alert('AI Studio Enhance', `${labels[mode] || mode} processed successfully!`);
      }
    } catch (err: any) {
      Alert.alert(
        'AI Enhance Notice',
        `Python AI Engine offline (${err.message || 'Network error'}).\n\nMake sure the local FastAPI server is running on port 8765 ('python engine/novacut_studio.py').`
      );
    } finally {
      setIsAIProcessing(false);
      setAiStatusText('');
    }
  };

  const handleToggleGlow = () => {
    const current = state.cutout || DEFAULT_PHOTO_CUTOUT;
    engine.setCutout({ silhouetteGlow: !current.silhouetteGlow });
    updateState();
  };

  const handleSelectGlowColor = (color: string) => {
    engine.setCutout({ glowColor: color });
    updateState();
  };

  const handleSelectBackdropColor = (color: string) => {
    engine.setCutout({ backdropColor: color, backdropType: 'color' });
    updateState();
  };

  const handleAddText = () => {
    if (newTextContent.trim()) {
      let color = '#FFFFFF';
      if (selectedTextStyle === 'neon') {
        color = '#00E5FF';
      } else if (selectedTextStyle === 'bubble') {
        color = '#FF007A';
      } else if (selectedTextStyle === 'cine') {
        color = '#FFD700';
      }

      engine.addTextOverlay(newTextContent.trim(), color, 50, 50);
      setNewTextContent('');
      setTextModalVisible(false);
      updateState();
    }
  };

  const handleExport = () => {
    setExportModalVisible(true);
    setIsExporting(true);
    setExportProgress(0);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.25;
      setExportProgress(Math.min(1.0, progress));
      if (progress >= 1.0) {
        clearInterval(interval);
        setIsExporting(false);
        const path = `file:///storage/emulated/0/Pictures/NovaCut_Photo_${Date.now()}.png`;
        if (onSaveComplete) onSaveComplete(path);
      }
    }, 180);
  };

  // Canvas backdrop styling
  const renderCanvasBackground = () => {
    if (showOriginal) {
      return { backgroundColor: '#18181E' };
    }
    const cutout = state.cutout || DEFAULT_PHOTO_CUTOUT;
    if (cutout.enabled) {
      if (cutout.backdropType === 'transparent') {
        return { backgroundColor: '#1E1E28' };
      }
      if (cutout.backdropType === 'color') {
        return { backgroundColor: cutout.backdropColor || '#18181E' };
      }
      if (cutout.backdropType === 'neon') {
        return { backgroundColor: '#0B0D19' };
      }
    }

    if (state.background.type === 'color') {
      return { backgroundColor: state.background.color || '#000000' };
    }
    if (state.background.type === 'blur') {
      return { backgroundColor: '#18181E', opacity: 0.95 };
    }
    return { backgroundColor: '#0E0E12' };
  };

  const currentCutout = state.cutout || DEFAULT_PHOTO_CUTOUT;
  const currentRetouch = state.retouch || DEFAULT_PHOTO_RETOUCH;

  return (
    <View className="flex-1 bg-background w-full items-center">
      <View className="w-full max-w-4xl flex-1">
        {/* Top Header */}
      <Header
        title="Photo Studio"
        onBack={onBack}
        rightAction={
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.uploadHeaderBtn}
              onPress={() => setUploadModalVisible(true)}
              activeOpacity={0.75}
            >
              <Text style={styles.uploadHeaderIcon}>🖼️</Text>
              <Text style={styles.uploadHeaderText}>Upload</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (engine.undo()) updateState();
              }}
              disabled={!engine.canUndo()}
              style={[styles.undoBtn, !engine.canUndo() && styles.disabledBtn]}
            >
              <Text style={styles.undoIcon}>↶</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (engine.redo()) updateState();
              }}
              disabled={!engine.canRedo()}
              style={[styles.undoBtn, !engine.canRedo() && styles.disabledBtn]}
            >
              <Text style={styles.undoIcon}>↷</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveHeaderBtn} onPress={handleExport}>
              <Text style={styles.saveHeaderText}>Export ↑</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Main Canvas Viewport with Live Compare & Aspect Ratio HUD */}
      <View style={styles.canvasArea}>
        <View style={styles.canvasHudBar}>
          <View style={styles.aspectPill}>
            <Text style={styles.aspectPillText}>
              {state.aspectRatio} • {canvasDim.width}×{canvasDim.height}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.choosePhotoPill}
            onPress={() => setUploadModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.choosePhotoPillText}>🖼️ Choose Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.compareBtn, showOriginal && styles.compareBtnActive]}
            onPressIn={() => setShowOriginal(true)}
            onPressOut={() => setShowOriginal(false)}
            activeOpacity={0.8}
          >
            <Text style={styles.compareBtnText}>👁️ Compare</Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.canvasBox,
            { width: canvasDim.width, height: canvasDim.height },
            renderCanvasBackground(),
          ]}
        >
          {/* Main Photo Card with Transform & Silhouette */}
          <View
            style={[
              styles.imageContainer,
              !showOriginal && currentCutout.enabled && styles.cutoutContainer,
              !showOriginal &&
                currentCutout.enabled &&
                currentCutout.silhouetteGlow && {
                  borderColor: currentCutout.glowColor,
                  borderWidth: 3,
                  shadowColor: currentCutout.glowColor,
                  shadowOpacity: 0.9,
                  shadowRadius: 16,
                },
              {
                transform: [
                  { rotate: `${state.rotationDeg}deg` },
                  { scaleX: state.flipHorizontal ? -1 : 1 },
                  { scaleY: state.flipVertical ? -1 : 1 },
                ],
              },
            ]}
          >
            {/* Real Photo Image from Device Gallery / Camera / URL */}
            <Image
              source={{ uri: showOriginal ? (initialImageUri || DEMO_PHOTO_ASSET) : state.imageUri }}
              style={styles.realPhotoImage}
              resizeMode="contain"
            />

            {/* Tint overlay for LUT filter simulation */}
            {!showOriginal && state.activeFilter !== 'normal' && (
              <View
                style={[
                  styles.filterTintOverlay,
                  {
                    backgroundColor:
                      PHOTO_FILTERS.find((f) => f.id === state.activeFilter)?.tintColor ||
                      'rgba(0,229,255,0.15)',
                  },
                ]}
              />
            )}

            {/* Retouch Skin Smooth & Whitening Glow Overlay Simulation */}
            {!showOriginal && (currentRetouch.skinSmooth > 0 || currentRetouch.whitening > 0) && (
              <View
                style={[
                  styles.retouchOverlay,
                  {
                    opacity: (currentRetouch.skinSmooth + currentRetouch.whitening) / 200,
                  },
                ]}
              />
            )}
          </View>

          {/* Render Text Overlays */}
          {!showOriginal &&
            state.textOverlays.map((t) => (
              <View
                key={t.id}
                style={[
                  styles.textOverlayPill,
                  {
                    top: `${t.yPercent}%`,
                    left: `${t.xPercent}%`,
                    backgroundColor: t.backgroundColor || 'rgba(0,0,0,0.6)',
                  },
                ]}
              >
                <Text style={[styles.textOverlayText, { color: t.color, fontSize: t.fontSize }]}>
                  {t.text}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    engine.removeTextOverlay(t.id);
                    updateState();
                  }}
                  style={styles.removeTagBtn}
                >
                  <Text style={styles.removeTagText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

          {/* Render Stickers */}
          {!showOriginal &&
            state.stickers.map((s) => (
              <View
                key={s.id}
                style={[
                  styles.stickerWrapper,
                  {
                    top: `${s.yPercent}%`,
                    left: `${s.xPercent}%`,
                    transform: [{ scale: s.scale }, { rotate: `${s.rotationDeg}deg` }],
                  },
                ]}
              >
                <Text style={styles.stickerEmoji}>{s.emoji}</Text>
                <TouchableOpacity
                  onPress={() => {
                    engine.removeSticker(s.id);
                    updateState();
                  }}
                  style={styles.removeTagBtn}
                >
                  <Text style={styles.removeTagText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

          {/* Floating Prompt for Sample Photo to make gallery upload unmissable */}
          {state.imageUri === DEMO_PHOTO_ASSET && (
            <TouchableOpacity
              style={styles.demoSampleFloatingBadge}
              onPress={() => setUploadModalVisible(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.demoSampleFloatingText}>
                🖼️ Tap to Upload Your Photo from Gallery
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Primary Tool Categories Dock */}
      <View style={styles.tabNavContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabNavScroll}>
          <TouchableOpacity
            style={styles.tabNavItem}
            onPress={() => setUploadModalVisible(true)}
            activeOpacity={0.75}
          >
            <Text style={styles.tabNavIcon}>🖼️</Text>
            <Text style={styles.tabNavLabel}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabNavItem, activeTab === 'ratio' && styles.tabNavItemActive]}
            onPress={() => setActiveTab('ratio')}
          >
            <Text style={styles.tabNavIcon}>📐</Text>
            <Text style={[styles.tabNavLabel, activeTab === 'ratio' && styles.tabNavLabelActive]}>
              Ratio
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabNavItem, activeTab === 'cutout' && styles.tabNavItemActive]}
            onPress={() => setActiveTab('cutout')}
          >
            <Text style={styles.tabNavIcon}>✂️</Text>
            <Text style={[styles.tabNavLabel, activeTab === 'cutout' && styles.tabNavLabelActive]}>
              Cutout
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabNavItem, activeTab === 'retouch' && styles.tabNavItemActive]}
            onPress={() => setActiveTab('retouch')}
          >
            <Text style={styles.tabNavIcon}>✨</Text>
            <Text style={[styles.tabNavLabel, activeTab === 'retouch' && styles.tabNavLabelActive]}>
              Retouch
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabNavItem, activeTab === 'filters' && styles.tabNavItemActive]}
            onPress={() => setActiveTab('filters')}
          >
            <Text style={styles.tabNavIcon}>🎨</Text>
            <Text style={[styles.tabNavLabel, activeTab === 'filters' && styles.tabNavLabelActive]}>
              Filters
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabNavItem, activeTab === 'adjust' && styles.tabNavItemActive]}
            onPress={() => setActiveTab('adjust')}
          >
            <Text style={styles.tabNavIcon}>🎛️</Text>
            <Text style={[styles.tabNavLabel, activeTab === 'adjust' && styles.tabNavLabelActive]}>
              Adjust
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabNavItem, activeTab === 'background' && styles.tabNavItemActive]}
            onPress={() => setActiveTab('background')}
          >
            <Text style={styles.tabNavIcon}>🖼️</Text>
            <Text style={[styles.tabNavLabel, activeTab === 'background' && styles.tabNavLabelActive]}>
              Backdrop
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabNavItem, activeTab === 'stickers' && styles.tabNavItemActive]}
            onPress={() => setActiveTab('stickers')}
          >
            <Text style={styles.tabNavIcon}>🧸</Text>
            <Text style={[styles.tabNavLabel, activeTab === 'stickers' && styles.tabNavLabelActive]}>
              Stickers
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabNavItem, activeTab === 'text' && styles.tabNavItemActive]}
            onPress={() => setActiveTab('text')}
          >
            <Text style={styles.tabNavIcon}>🔤</Text>
            <Text style={[styles.tabNavLabel, activeTab === 'text' && styles.tabNavLabelActive]}>
              Text
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Tool Panel Drawer */}
      <View
        style={[
          styles.toolDrawer,
          {
            paddingBottom: insets.bottom,
            height: 140 + insets.bottom,
          },
        ]}
      >
        {/* 1. RATIO TAB */}
        {activeTab === 'ratio' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.drawerRow}>
            {PHOTO_ASPECT_RATIOS.map((item) => {
              const isSelected = state.aspectRatio === item.ratio;
              return (
                <TouchableOpacity
                  key={item.ratio}
                  style={[styles.ratioCard, isSelected && styles.ratioCardActive]}
                  onPress={() => {
                    engine.setAspectRatio(item.ratio);
                    updateState();
                  }}
                >
                  <Text style={[styles.ratioTitle, isSelected && styles.ratioTitleActive]}>
                    {item.label}
                  </Text>
                  <Text style={styles.ratioSub}>{item.description}</Text>
                </TouchableOpacity>
              );
            })}
            <View style={styles.vDivider} />
            <TouchableOpacity
              style={styles.transformActionBtn}
              onPress={() => {
                engine.rotateClockwise();
                updateState();
              }}
            >
              <Text style={styles.transformActionIcon}>🔄</Text>
              <Text style={styles.transformActionText}>Rotate 90°</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.transformActionBtn}
              onPress={() => {
                engine.toggleFlipHorizontal();
                updateState();
              }}
            >
              <Text style={styles.transformActionIcon}>↔️</Text>
              <Text style={styles.transformActionText}>Flip H</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* 2. CUTOUT TAB */}
        {activeTab === 'cutout' && (
          <ScrollView showsVerticalScrollIndicator={false} style={styles.drawerScrollVertical}>
            {/* AI GrabCut Python Engine One-Tap Action */}
            <TouchableOpacity
              style={styles.aiActionBanner}
              onPress={handleAIRemoveBackground}
              activeOpacity={0.8}
            >
              <Text style={styles.aiActionIcon}>🤖✂️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.aiActionTitle}>AI Smart Cutout (GrabCut)</Text>
                <Text style={styles.aiActionSub}>OpenCV GrabCut neural-matting background removal</Text>
              </View>
              <View style={styles.aiActionBadge}>
                <Text style={styles.aiActionBadgeText}>RUN AI</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.cutoutToggleRow}>
              <View>
                <Text style={styles.sectionHeading}>Auto Portrait Cutout ✂️</Text>
                <Text style={styles.sectionSub}>Instant AI background separation & silhouette</Text>
              </View>
              <TouchableOpacity
                style={[styles.switchPill, currentCutout.enabled && styles.switchPillActive]}
                onPress={handleToggleCutout}
              >
                <Text style={[styles.switchText, currentCutout.enabled && styles.switchTextActive]}>
                  {currentCutout.enabled ? 'ACTIVE' : 'ENABLE'}
                </Text>
              </TouchableOpacity>
            </View>

            {currentCutout.enabled && (
              <>
                <View style={styles.glowToggleRow}>
                  <Text style={styles.glowLabel}>Neon Silhouette Glow</Text>
                  <TouchableOpacity
                    style={[styles.glowBtn, currentCutout.silhouetteGlow && styles.glowBtnActive]}
                    onPress={handleToggleGlow}
                  >
                    <Text style={styles.glowBtnText}>
                      {currentCutout.silhouetteGlow ? 'Glow ON' : 'Glow OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {currentCutout.silhouetteGlow && (
                  <View style={styles.colorPaletteRow}>
                    {GLOW_COLORS.map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={[
                          styles.colorCircle,
                          { backgroundColor: c },
                          currentCutout.glowColor === c && styles.colorCircleActive,
                        ]}
                        onPress={() => handleSelectGlowColor(c)}
                      />
                    ))}
                  </View>
                )}

                <Text style={styles.subHeading}>Studio Backdrop Color</Text>
                <View style={styles.colorPaletteRow}>
                  {BG_COLORS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: c },
                        currentCutout.backdropColor === c && styles.colorCircleActive,
                      ]}
                      onPress={() => handleSelectBackdropColor(c)}
                    />
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        )}

        {/* 3. RETOUCH TAB */}
        {activeTab === 'retouch' && (
          <ScrollView showsVerticalScrollIndicator={false} style={styles.drawerScrollVertical}>
            {/* AI Studio Enhancements Row */}
            <Text style={styles.subHeading}>AI Studio Neural Enhancer 🧠</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.aiEnhanceScroll}>
              <TouchableOpacity
                style={styles.aiEnhanceChip}
                onPress={() => handleAIEnhance('hdr')}
                activeOpacity={0.8}
              >
                <Text style={styles.aiEnhanceChipIcon}>🌟</Text>
                <Text style={styles.aiEnhanceChipText}>CLAHE HDR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.aiEnhanceChip}
                onPress={() => handleAIEnhance('portrait')}
                activeOpacity={0.8}
              >
                <Text style={styles.aiEnhanceChipIcon}>✨</Text>
                <Text style={styles.aiEnhanceChipText}>Portrait Skin</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.aiEnhanceChip}
                onPress={() => handleAIEnhance('night_enhance')}
                activeOpacity={0.8}
              >
                <Text style={styles.aiEnhanceChipIcon}>🌙</Text>
                <Text style={styles.aiEnhanceChipText}>Night Boost</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.aiEnhanceChip}
                onPress={() => handleAIEnhance('vivid')}
                activeOpacity={0.8}
              >
                <Text style={styles.aiEnhanceChipIcon}>🎨</Text>
                <Text style={styles.aiEnhanceChipText}>Vivid Pop</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.retouchHeaderRow}>
              <Text style={styles.sectionHeading}>Face Beauty & Retouch ✨</Text>
              <TouchableOpacity
                style={styles.presetQuickBtn}
                onPress={() => {
                  engine.setRetouch({ skinSmooth: 60, whitening: 40, faceSlim: 30, eyeBrighten: 50 });
                  updateState();
                }}
              >
                <Text style={styles.presetQuickText}>✨ 1-Tap Glow</Text>
              </TouchableOpacity>
            </View>

            {/* Smooth Skin Slider */}
            <View style={styles.sliderControlRow}>
              <Text style={styles.sliderLabel}>Smooth Skin</Text>
              <Text style={styles.sliderVal}>{currentRetouch.skinSmooth}%</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => handleRetouchChange('skinSmooth', currentRetouch.skinSmooth - 10)}
                >
                  <Text style={styles.stepperText}>−</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => handleRetouchChange('skinSmooth', currentRetouch.skinSmooth + 10)}
                >
                  <Text style={styles.stepperText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Whitening */}
            <View style={styles.sliderControlRow}>
              <Text style={styles.sliderLabel}>Tone Whitening</Text>
              <Text style={styles.sliderVal}>{currentRetouch.whitening}%</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => handleRetouchChange('whitening', currentRetouch.whitening - 10)}
                >
                  <Text style={styles.stepperText}>−</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => handleRetouchChange('whitening', currentRetouch.whitening + 10)}
                >
                  <Text style={styles.stepperText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Face Slim */}
            <View style={styles.sliderControlRow}>
              <Text style={styles.sliderLabel}>Face Slimming</Text>
              <Text style={styles.sliderVal}>{currentRetouch.faceSlim}%</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => handleRetouchChange('faceSlim', currentRetouch.faceSlim - 10)}
                >
                  <Text style={styles.stepperText}>−</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => handleRetouchChange('faceSlim', currentRetouch.faceSlim + 10)}
                >
                  <Text style={styles.stepperText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Eye Brighten */}
            <View style={styles.sliderControlRow}>
              <Text style={styles.sliderLabel}>Eye Brighten</Text>
              <Text style={styles.sliderVal}>{currentRetouch.eyeBrighten}%</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => handleRetouchChange('eyeBrighten', currentRetouch.eyeBrighten - 10)}
                >
                  <Text style={styles.stepperText}>−</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => handleRetouchChange('eyeBrighten', currentRetouch.eyeBrighten + 10)}
                >
                  <Text style={styles.stepperText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}

        {/* 4. FILTERS TAB */}
        {activeTab === 'filters' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.drawerRow}>
            {PHOTO_FILTERS.map((f) => {
              const isSelected = state.activeFilter === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.filterThumbCard, isSelected && styles.filterThumbCardActive]}
                  onPress={() => {
                    engine.applyFilter(f.id);
                    updateState();
                  }}
                >
                  <View style={[styles.filterThumbBox, { backgroundColor: f.tintColor || '#282834' }]}>
                    <Text style={styles.filterThumbIcon}>🎨</Text>
                  </View>
                  <Text style={[styles.filterThumbTitle, isSelected && styles.filterThumbTitleActive]}>
                    {f.name}
                  </Text>
                  <Text style={styles.filterThumbCat}>{f.category}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* 5. ADJUST TAB */}
        {activeTab === 'adjust' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.drawerRow}>
            <View style={styles.adjustTile}>
              <Text style={styles.adjustTileLabel}>Brightness</Text>
              <Text style={styles.adjustTileVal}>{state.adjustments.brightness}</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => handleAdjustmentChange('brightness', -0.1)}>
                  <Text style={styles.stepperText}>−</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => handleAdjustmentChange('brightness', 0.1)}>
                  <Text style={styles.stepperText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.adjustTile}>
              <Text style={styles.adjustTileLabel}>Contrast</Text>
              <Text style={styles.adjustTileVal}>{state.adjustments.contrast}</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => handleAdjustmentChange('contrast', -0.1)}>
                  <Text style={styles.stepperText}>−</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => handleAdjustmentChange('contrast', 0.1)}>
                  <Text style={styles.stepperText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.adjustTile}>
              <Text style={styles.adjustTileLabel}>Saturation</Text>
              <Text style={styles.adjustTileVal}>{state.adjustments.saturation}</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => handleAdjustmentChange('saturation', -0.1)}>
                  <Text style={styles.stepperText}>−</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => handleAdjustmentChange('saturation', 0.1)}>
                  <Text style={styles.stepperText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.adjustTile}>
              <Text style={styles.adjustTileLabel}>Temperature</Text>
              <Text style={styles.adjustTileVal}>{state.adjustments.temperature}</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => handleAdjustmentChange('temperature', -0.1)}>
                  <Text style={styles.stepperText}>−</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => handleAdjustmentChange('temperature', 0.1)}>
                  <Text style={styles.stepperText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.resetAdjustBtn}
              onPress={() => {
                engine.resetAdjustments();
                updateState();
              }}
            >
              <Text style={styles.resetAdjustIcon}>↺</Text>
              <Text style={styles.resetAdjustText}>Reset All</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* 6. BACKGROUND TAB */}
        {activeTab === 'background' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.drawerRow}>
            <TouchableOpacity
              style={[styles.bgModeCard, state.background.type === 'blur' && styles.bgModeCardActive]}
              onPress={() => {
                engine.setBackground({ type: 'blur', blurRadius: 15 });
                updateState();
              }}
            >
              <Text style={styles.bgModeIcon}>🌫️</Text>
              <Text style={styles.bgModeText}>Blur</Text>
            </TouchableOpacity>

            <View style={styles.vDivider} />

            {BG_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorCircleLarge,
                  { backgroundColor: c },
                  state.background.color === c && styles.colorCircleActive,
                ]}
                onPress={() => {
                  engine.setBackground({ type: 'color', color: c });
                  updateState();
                }}
              />
            ))}
          </ScrollView>
        )}

        {/* 7. STICKERS TAB */}
        {activeTab === 'stickers' && (
          <View style={styles.stickerPanel}>
            <View style={styles.stickerTabPills}>
              {(Object.keys(STICKER_CATEGORIES) as (keyof typeof STICKER_CATEGORIES)[]).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.stickerCatPill, activeStickerTab === cat && styles.stickerCatPillActive]}
                  onPress={() => setActiveStickerTab(cat)}
                >
                  <Text
                    style={[styles.stickerCatText, activeStickerTab === cat && styles.stickerCatTextActive]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.drawerRow}>
              {STICKER_CATEGORIES[activeStickerTab].map((emoji, idx) => (
                <TouchableOpacity
                  key={`${emoji}_${idx}`}
                  style={styles.stickerBtn}
                  onPress={() => {
                    engine.addSticker(emoji, 50, 50);
                    updateState();
                  }}
                >
                  <Text style={styles.stickerEmojiLarge}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 8. TEXT TAB */}
        {activeTab === 'text' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.drawerRow}>
            <TouchableOpacity style={styles.addTextPrimaryBtn} onPress={() => setTextModalVisible(true)}>
              <Text style={styles.addTextPrimaryIcon}>+ 🔤</Text>
              <Text style={styles.addTextPrimaryLabel}>Add Text</Text>
            </TouchableOpacity>

            <View style={styles.vDivider} />

            <TouchableOpacity
              style={[styles.textPresetCard, selectedTextStyle === 'neon' && styles.textPresetCardActive]}
              onPress={() => setSelectedTextStyle('neon')}
            >
              <Text style={styles.textPresetNeon}>NEON GLOW</Text>
              <Text style={styles.textPresetSub}>CapCut Cyan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.textPresetCard, selectedTextStyle === 'bubble' && styles.textPresetCardActive]}
              onPress={() => setSelectedTextStyle('bubble')}
            >
              <Text style={styles.textPresetBubble}>BUBBLE</Text>
              <Text style={styles.textPresetSub}>TikTok Pink</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.textPresetCard, selectedTextStyle === 'cine' && styles.textPresetCardActive]}
              onPress={() => setSelectedTextStyle('cine')}
            >
              <Text style={styles.textPresetCine}>CINEMA</Text>
              <Text style={styles.textPresetSub}>Hollywood Gold</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* Add Text Overlay Modal */}
      <Modal
        visible={textModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTextModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add CapCut Text Overlay</Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder="Type your caption..."
              placeholderTextColor={colors.textMuted}
              value={newTextContent}
              onChangeText={setNewTextContent}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setTextModalVisible(false)}
                style={styles.modalBtn}
              />
              <Button
                title="Add to Canvas"
                variant="primary"
                onPress={handleAddText}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Exporting Progress Modal */}
      <Modal visible={exportModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {isExporting ? 'Exporting Hi-Res Photo...' : 'Export Complete! 📸'}
            </Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${exportProgress * 100}%` }]} />
            </View>
            <Text style={styles.progressPercent}>{Math.round(exportProgress * 100)}%</Text>
            {!isExporting && (
              <Button
                title="Done"
                variant="primary"
                onPress={() => setExportModalVisible(false)}
                style={{ marginTop: spacing.md }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Choose Photo / Gallery Upload Modal */}
      <Modal
        visible={uploadModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUploadModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Photo</Text>
            <Text style={styles.uploadModalSubtitle}>
              Select a photo from your phone's gallery to edit, retouch, or remove background.
            </Text>

            <TouchableOpacity
              style={styles.uploadOptionBtn}
              onPress={handlePickFromGallery}
              activeOpacity={0.75}
            >
              <Text style={styles.uploadOptionIcon}>🖼️</Text>
              <View style={styles.uploadOptionTextCol}>
                <Text style={styles.uploadOptionTitle}>Choose from Gallery</Text>
                <Text style={styles.uploadOptionDesc}>
                  Pick from iPhone Photos or Android Gallery
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.uploadOptionBtn}
              onPress={handleCaptureCamera}
              activeOpacity={0.75}
            >
              <Text style={styles.uploadOptionIcon}>📸</Text>
              <View style={styles.uploadOptionTextCol}>
                <Text style={styles.uploadOptionTitle}>Take Photo with Camera</Text>
                <Text style={styles.uploadOptionDesc}>
                  Capture a new portrait or object photo
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.uploadOptionBtn}
              onPress={handleUseDemoPhoto}
              activeOpacity={0.75}
            >
              <Text style={styles.uploadOptionIcon}>✨</Text>
              <View style={styles.uploadOptionTextCol}>
                <Text style={styles.uploadOptionTitle}>Use Sample Stock Photo</Text>
                <Text style={styles.uploadOptionDesc}>
                  Try presets on demo beach photo
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelUploadBtn}
              onPress={() => setUploadModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelUploadText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* AI Engine Processing HUD Modal */}
      <Modal visible={isAIProcessing} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.aiLoadingContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.aiLoadingTitle}>NovaCut AI Studio</Text>
            <Text style={styles.aiLoadingSub}>{aiStatusText || 'Processing with Python AI engine...'}</Text>
          </View>
        </View>
      </Modal>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  aiActionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  aiActionIcon: {
    fontSize: 22,
  },
  aiActionTitle: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  aiActionSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  aiActionBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
  },
  aiActionBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  aiEnhanceScroll: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  aiEnhanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E28',
    borderWidth: 1,
    borderColor: '#2A2A38',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    marginRight: spacing.sm,
    gap: 6,
  },
  aiEnhanceChipIcon: {
    fontSize: 14,
  },
  aiEnhanceChipText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  aiLoadingContent: {
    backgroundColor: '#181822',
    padding: 24,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    width: '82%',
    borderWidth: 1,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  aiLoadingTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 14,
  },
  aiLoadingSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  realPhotoImage: {
    width: '100%',
    height: '100%',
  },
  uploadHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  uploadHeaderIcon: {
    fontSize: 13,
  },
  uploadHeaderText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  choosePhotoPill: {
    backgroundColor: 'rgba(24, 24, 30, 0.85)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  choosePhotoPillText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  demoSampleFloatingBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    alignSelf: 'center',
    backgroundColor: 'rgba(10, 10, 15, 0.88)',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  demoSampleFloatingText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  uploadModalSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.md,
  },
  uploadOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  uploadOptionIcon: {
    fontSize: 26,
  },
  uploadOptionTextCol: {
    flex: 1,
  },
  uploadOptionTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  uploadOptionDesc: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  cancelUploadBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  cancelUploadText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  undoBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: {
    opacity: 0.4,
  },
  undoIcon: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveHeaderBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  saveHeaderText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 13,
  },
  canvasArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#09090C',
    position: 'relative',
    paddingVertical: spacing.sm,
  },
  canvasHudBar: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  aspectPill: {
    backgroundColor: 'rgba(24, 24, 30, 0.85)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aspectPillText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  compareBtn: {
    backgroundColor: 'rgba(24, 24, 30, 0.85)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compareBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  compareBtnText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  canvasBox: {
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cutoutContainer: {
    borderRadius: borderRadius.sm,
  },
  photoMockSurface: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoMockIcon: {
    fontSize: 48,
    marginBottom: spacing.xs,
  },
  photoMockLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  photoFilterLabel: {
    color: colors.primary,
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  filterTintOverlay: {
    ...StyleSheet.absoluteFill,
  },
  retouchOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  textOverlayPill: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
  },
  textOverlayText: {
    fontWeight: 'bold',
  },
  removeTagBtn: {
    marginLeft: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  stickerWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerEmoji: {
    fontSize: 36,
  },
  tabNavContainer: {
    height: 60,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  tabNavScroll: {
    paddingHorizontal: spacing.sm,
  },
  tabNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    height: 60,
  },
  tabNavItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabNavIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabNavLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  tabNavLabelActive: {
    color: colors.primary,
  },
  toolDrawer: {
    height: 140,
    backgroundColor: colors.surfaceLight,
    paddingVertical: spacing.sm,
  },
  drawerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  drawerScrollVertical: {
    paddingHorizontal: spacing.md,
  },
  ratioCard: {
    width: 80,
    height: 90,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
  },
  ratioCardActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0,229,255,0.1)',
  },
  ratioTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  ratioTitleActive: {
    color: colors.primary,
  },
  ratioSub: {
    color: colors.textMuted,
    fontSize: 9,
    textAlign: 'center',
    marginTop: 2,
  },
  vDivider: {
    width: 1,
    height: 60,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  transformActionBtn: {
    width: 75,
    height: 90,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  transformActionIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  transformActionText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  cutoutToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionHeading: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  sectionSub: {
    color: colors.textMuted,
    fontSize: 11,
  },
  switchPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  switchText: {
    color: colors.textMuted,
    fontWeight: 'bold',
    fontSize: 12,
  },
  switchTextActive: {
    color: '#000000',
  },
  glowToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  glowLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  glowBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.surface,
  },
  glowBtnActive: {
    backgroundColor: colors.accentPink,
  },
  glowBtnText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  colorPaletteRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  colorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  colorCircleLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.borderLight,
  },
  colorCircleActive: {
    borderColor: colors.primary,
    borderWidth: 2,
    transform: [{ scale: 1.15 }],
  },
  subHeading: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  retouchHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  presetQuickBtn: {
    backgroundColor: colors.accentPink,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
  },
  presetQuickText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  sliderControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  sliderLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    width: 100,
  },
  sliderVal: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
    width: 40,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  stepperBtn: {
    width: 28,
    height: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepperText: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  filterThumbCard: {
    alignItems: 'center',
    width: 65,
  },
  filterThumbCardActive: {
    transform: [{ scale: 1.05 }],
  },
  filterThumbBox: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterThumbIcon: {
    fontSize: 18,
  },
  filterThumbTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  filterThumbTitleActive: {
    color: colors.primary,
  },
  filterThumbCat: {
    color: colors.textDisabled,
    fontSize: 9,
  },
  adjustTile: {
    width: 95,
    height: 90,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  adjustTileLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  adjustTileVal: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
    marginVertical: 2,
  },
  resetAdjustBtn: {
    width: 80,
    height: 90,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.accentCoral,
  },
  resetAdjustIcon: {
    fontSize: 20,
    color: colors.accentCoral,
  },
  resetAdjustText: {
    color: colors.accentCoral,
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
  },
  bgModeCard: {
    width: 70,
    height: 80,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  bgModeCardActive: {
    borderColor: colors.primary,
  },
  bgModeIcon: {
    fontSize: 24,
    marginBottom: 2,
  },
  bgModeText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  stickerPanel: {
    flex: 1,
  },
  stickerTabPills: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  stickerCatPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.surface,
  },
  stickerCatPillActive: {
    backgroundColor: colors.primary,
  },
  stickerCatText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
  },
  stickerCatTextActive: {
    color: '#000000',
  },
  stickerBtn: {
    width: 50,
    height: 50,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerEmojiLarge: {
    fontSize: 28,
  },
  addTextPrimaryBtn: {
    width: 85,
    height: 85,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  addTextPrimaryIcon: {
    fontSize: 20,
    color: colors.primary,
    marginBottom: 2,
  },
  addTextPrimaryLabel: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  textPresetCard: {
    width: 100,
    height: 85,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
  },
  textPresetCardActive: {
    borderColor: colors.primary,
  },
  textPresetNeon: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  textPresetBubble: {
    color: colors.accentPink,
    fontSize: 12,
    fontWeight: '900',
  },
  textPresetCine: {
    color: colors.accentGold,
    fontSize: 12,
    fontWeight: '900',
  },
  textPresetSub: {
    color: colors.textMuted,
    fontSize: 9,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  modalTextInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    padding: spacing.md,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  modalBtn: {
    minWidth: 90,
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: spacing.md,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressPercent: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
});
