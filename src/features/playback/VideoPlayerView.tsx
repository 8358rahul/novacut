import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Image, Animated, Easing } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors, borderRadius, spacing } from '../../theme';
import { Transform } from '../../core/models/clip';

export interface VideoPlayerViewProps {
  videoUri?: string;
  cutoutOverlayUri?: string;
  isPlaying: boolean;
  seekTimeMs: number;
  tintColor?: string;
  visualEffect?: string;
  transform?: Transform;
  activeSubtitle?: string;
  onPlaybackTimeUpdate?: (currentMs: number) => void;
  onImportPress?: () => void;
  onAddSamplePress?: () => void;
}

export const isImageUri = (uri?: string): boolean => {
  if (!uri) return false;
  const clean = uri.toLowerCase().split('?')[0];
  return (
    clean.endsWith('.jpg') ||
    clean.endsWith('.jpeg') ||
    clean.endsWith('.png') ||
    clean.endsWith('.webp') ||
    clean.endsWith('.gif') ||
    clean.includes('image') ||
    clean.includes('unsplash')
  );
};

export const VideoPlayerView: React.FC<VideoPlayerViewProps> = ({
  videoUri,
  cutoutOverlayUri,
  isPlaying,
  seekTimeMs,
  tintColor,
  visualEffect = 'none',
  transform,
  activeSubtitle,
  onPlaybackTimeUpdate,
  onImportPress,
  onAddSamplePress,
}) => {
  const player = useVideoPlayer(videoUri || null, (p) => {
    p.loop = false;
    p.muted = false;
    p.volume = 1.0;
  });

  const lastSeekRef = useRef<number>(-1);
  const vfxAnim = useRef(new Animated.Value(0)).current;

  // Animate dynamic VFX loops when playing
  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (isPlaying && visualEffect && visualEffect !== 'none') {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(vfxAnim, {
            toValue: 1,
            duration: 700,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(vfxAnim, {
            toValue: 0,
            duration: 700,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
    } else {
      vfxAnim.setValue(0);
    }
    return () => {
      if (anim) anim.stop();
    };
  }, [isPlaying, visualEffect, vfxAnim]);

  // Ensure volume and unmuted status
  useEffect(() => {
    if (!player) return;
    try {
      player.muted = false;
      player.volume = 1.0;
    } catch {}
  }, [player, videoUri]);

  // Synchronize play / pause with player
  useEffect(() => {
    if (!player) return;
    if (isPlaying) {
      player.play();
    } else {
      player.pause();
    }
  }, [isPlaying, player]);

  // Synchronize timeline seek with video player ONLY when paused or manually scrubbing
  useEffect(() => {
    if (!player || seekTimeMs < 0 || isPlaying) return;
    const targetSec = seekTimeMs / 1000;
    if (Math.abs(targetSec - player.currentTime) > 0.08) {
      lastSeekRef.current = seekTimeMs;
      player.currentTime = targetSec;
    }
  }, [seekTimeMs, player, isPlaying]);

  // Listen to native hardware player status updates and forward to timeline
  useEffect(() => {
    if (!player || !onPlaybackTimeUpdate) return;
    const subscription = player.addListener('timeUpdate', (event) => {
      onPlaybackTimeUpdate(Math.round(event.currentTime * 1000));
    });
    return () => {
      subscription.remove();
    };
  }, [player, onPlaybackTimeUpdate]);

  if (!videoUri) {
    return (
      <View style={styles.placeholderContainer}>
        <Text style={styles.placeholderIcon}>🎬</Text>
        <Text style={styles.placeholderTitle}>No Media Loaded</Text>
        <Text style={styles.placeholderSubtitle}>
          Import videos from your iPhone gallery or load a sample scene to explore editing tools.
        </Text>
        <View style={styles.placeholderBtnRow}>
          {onImportPress && (
            <TouchableOpacity
              style={styles.importBtn}
              onPress={onImportPress}
              activeOpacity={0.8}
            >
              <Text style={styles.importBtnText}>🖼️ Choose Video</Text>
            </TouchableOpacity>
          )}
          {onAddSamplePress && (
            <TouchableOpacity
              style={styles.sampleBtn}
              onPress={onAddSamplePress}
              activeOpacity={0.8}
            >
              <Text style={styles.sampleBtnText}>✨ Sample Scene</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  const effectiveScale = transform?.scale ?? 1.0;
  const effectiveRotation = transform?.rotationDeg ?? 0;
  const effectiveOpacity = transform?.opacity ?? 1.0;
  const effectiveTranslateX = transform?.translateX ?? 0;
  const effectiveTranslateY = transform?.translateY ?? 0;
  const isImage = isImageUri(videoUri);

  const shakeTranslateX =
    visualEffect === 'camera_shake'
      ? vfxAnim.interpolate({
          inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
          outputRange: [0, -6, 5, -4, 4, 0],
        })
      : 0;

  const shakeTranslateY =
    visualEffect === 'camera_shake'
      ? vfxAnim.interpolate({
          inputRange: [0, 0.25, 0.5, 0.75, 1],
          outputRange: [0, 5, -4, 3, 0],
        })
      : 0;

  const vhsScanlineY = vfxAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 240],
  });

  const strobeOpacity = vfxAnim.interpolate({
    inputRange: [0, 0.3, 0.6, 1],
    outputRange: [0, 0.6, 0.1, 0],
  });

  const burnOpacity = vfxAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.15, 0.55, 0.2],
  });

  return (
    <View style={styles.container}>
      {/* Video Surface with Keyframe / Transform matrix & Kinetic Shake */}
      <Animated.View
        style={[
          styles.videoWrapper,
          {
            opacity: effectiveOpacity,
            transform: [
              { scale: effectiveScale },
              { rotate: `${effectiveRotation}deg` },
              { translateX: typeof shakeTranslateX === 'number' ? effectiveTranslateX : Animated.add(effectiveTranslateX, shakeTranslateX) },
              { translateY: typeof shakeTranslateY === 'number' ? effectiveTranslateY : Animated.add(effectiveTranslateY, shakeTranslateY) },
            ],
          },
        ]}
      >
        {isImage ? (
          <Image
            source={{ uri: videoUri }}
            style={styles.videoView}
            resizeMode="contain"
          />
        ) : (
          <VideoView
            player={player}
            style={styles.videoView}
            contentFit="contain"
            nativeControls={false}
          />
        )}

        {/* Composited AI Cutout / Transparent PNG Overlay */}
        {cutoutOverlayUri && (
          <Image
            source={{ uri: cutoutOverlayUri }}
            style={[styles.videoView, StyleSheet.absoluteFill]}
            resizeMode="contain"
            pointerEvents="none"
          />
        )}

        {/* 1. LUT Color Grading Tint Overlay */}
        {tintColor && tintColor !== 'transparent' && (
          <View style={[styles.effectOverlay, { backgroundColor: tintColor }]} pointerEvents="none" />
        )}

        {/* 2. Visual Shader Effects Overlays */}
        {visualEffect === 'glitch' && (
          <View style={styles.glitchOverlay} pointerEvents="none">
            <View style={styles.glitchLine1} />
            <View style={styles.glitchLine2} />
            <Text style={styles.effectIndicatorBadge}>⚡ GLITCH FX</Text>
          </View>
        )}

        {visualEffect === 'film_grain' && (
          <View style={styles.grainOverlay} pointerEvents="none">
            <Text style={styles.effectIndicatorBadge}>🎞️ 35mm GRAIN</Text>
          </View>
        )}

        {visualEffect === 'retro_vhs' && (
          <View style={styles.vhsOverlay} pointerEvents="none">
            <Text style={styles.vhsTimecode}>PLAY  00:00:12  SP</Text>
            <Animated.View
              style={[
                styles.vhsScanline,
                {
                  transform: [{ translateY: vhsScanlineY }],
                },
              ]}
            />
          </View>
        )}

        {visualEffect === 'zoom_blur' && (
          <View style={styles.zoomBlurOverlay} pointerEvents="none">
            <Text style={styles.effectIndicatorBadge}>💫 ZOOM BLUR</Text>
          </View>
        )}

        {visualEffect === 'sparkle_glow' && (
          <View style={styles.sparkleOverlay} pointerEvents="none">
            <Text style={styles.sparkleStar1}>✨</Text>
            <Text style={styles.sparkleStar2}>🌟</Text>
          </View>
        )}

        {visualEffect === 'camera_shake' && (
          <View style={styles.shakeOverlay} pointerEvents="none">
            <Text style={styles.effectIndicatorBadge}>💥 IMPACT SHAKE</Text>
          </View>
        )}

        {visualEffect === 'chromatic_flash' && (
          <Animated.View style={[styles.chromaFlashOverlay, { opacity: strobeOpacity }]} pointerEvents="none">
            <View style={styles.glitchLine1} />
            <Text style={styles.effectIndicatorBadge}>⚡ CHROMATIC FLASH</Text>
          </Animated.View>
        )}

        {visualEffect === 'strobe_flash' && (
          <Animated.View style={[styles.strobeOverlay, { opacity: strobeOpacity }]} pointerEvents="none">
            <Text style={styles.effectIndicatorBadge}>💡 WHITE STROBE</Text>
          </Animated.View>
        )}

        {visualEffect === 'film_burn' && (
          <Animated.View style={[styles.filmBurnOverlay, { opacity: burnOpacity }]} pointerEvents="none">
            <Text style={styles.effectIndicatorBadge}>🔥 FILM BURN</Text>
          </Animated.View>
        )}

        {visualEffect === 'neon_edge' && (
          <View style={styles.neonEdgeOverlay} pointerEvents="none">
            <Text style={styles.effectIndicatorBadge}>🌈 NEON EDGE</Text>
          </View>
        )}

        {/* 3. Live Subtitles / Text Overlay */}
        {activeSubtitle && (
          <View style={styles.subtitleContainer} pointerEvents="none">
            <Text style={styles.subtitleText}>{activeSubtitle}</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  videoWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoView: {
    width: '100%',
    height: '100%',
  },
  effectOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  glitchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  glitchLine1: {
    height: 4,
    backgroundColor: 'rgba(236, 72, 153, 0.45)',
    marginTop: 40,
  },
  glitchLine2: {
    height: 6,
    backgroundColor: 'rgba(6, 182, 212, 0.45)',
    marginBottom: 60,
  },
  grainOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  vhsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 12,
  },
  vhsTimecode: {
    color: '#22C55E',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  vhsScanline: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  zoomBlurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 8,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  sparkleOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sparkleStar1: {
    position: 'absolute',
    top: 24,
    right: 32,
    fontSize: 24,
  },
  sparkleStar2: {
    position: 'absolute',
    bottom: 36,
    left: 28,
    fontSize: 20,
  },
  shakeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  chromaFlashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 4,
    borderColor: 'rgba(6, 182, 212, 0.4)',
    backgroundColor: 'rgba(236, 72, 153, 0.08)',
  },
  diamondZoomOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 6,
    borderColor: 'rgba(168, 85, 247, 0.35)',
  },
  haloBloomOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 10,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  strobeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  cyberScanlinesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: 'rgba(0, 229, 255, 0.5)',
  },
  filmBurnOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 8,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  neonEdgeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 4,
    borderColor: '#00E5FF',
    borderRadius: 8,
  },
  effectIndicatorBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  subtitleContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  subtitleText: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    textAlign: 'center',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  placeholderIcon: {
    fontSize: 36,
    marginBottom: spacing.xs,
  },
  placeholderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  placeholderSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: spacing.sm,
    maxWidth: 240,
  },
  placeholderBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  importBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.sm,
  },
  importBtnText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '700',
  },
  sampleBtn: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.sm,
  },
  sampleBtnText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
});
