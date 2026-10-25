import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { Clip } from '../../core/models/clip';
import { colors, borderRadius, spacing } from '../../theme';
import {
  microsToSeconds,
} from '../../core/models/timeline';
import {
  timeUsToPixels,
  pixelsToTimeUs,
} from '../../core/timeline/calculator';

export interface TimelineClipProps {
  clip: Clip;
  isSelected: boolean;
  pixelsPerSec: number;
  onSelect: (clipId: string) => void;
  onTrimStart: (clipId: string, newStartUs: number) => void;
  onTrimEnd: (clipId: string, newEndUs: number) => void;
  onMove: (clipId: string, newStartUs: number) => void;
  onDragStateChange: (isDragging: boolean) => void;
  onSeek: (timeUs: number) => void;
  renderTransitionButton?: React.ReactNode;
}

const WAVEFORM_PREVIEW_HEIGHTS = [8, 16, 24, 12, 28, 18, 10, 22, 14, 26, 12, 20];

export const TimelineClip: React.FC<TimelineClipProps> = ({
  clip,
  isSelected,
  pixelsPerSec,
  onSelect,
  onTrimStart,
  onTrimEnd,
  onMove,
  onDragStateChange,
  onSeek,
  renderTransitionButton,
}) => {
  const [liveStartUs, setLiveStartUs] = useState<number | null>(null);
  const [liveDurationUs, setLiveDurationUs] = useState<number | null>(null);
  const [activeGesture, setActiveGesture] = useState<'trimLeft' | 'trimRight' | 'move' | null>(null);

  const initialStartUsRef = useRef(clip.timelineRange.startUs);
  const initialDurationUsRef = useRef(clip.timelineRange.durationUs);
  const candidateStartUsRef = useRef(clip.timelineRange.startUs);
  const candidateEndUsRef = useRef(clip.timelineRange.startUs + clip.timelineRange.durationUs);
  const isDraggingRef = useRef(false);

  // PanResponder for Left Trim Handle (Trims start, adjusts duration)
  const panResponderLeft = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          initialStartUsRef.current = clip.timelineRange.startUs;
          initialDurationUsRef.current = clip.timelineRange.durationUs;
          candidateStartUsRef.current = clip.timelineRange.startUs;
          isDraggingRef.current = true;
          setActiveGesture('trimLeft');
          onDragStateChange(true);
        },
        onPanResponderMove: (_: GestureResponderEvent, gestureState: PanResponderGestureState) => {
          const deltaUs = pixelsToTimeUs(gestureState.dx, pixelsPerSec);
          const minDurationUs = 200_000; // 0.2s minimum
          const maxStartUs = initialStartUsRef.current + initialDurationUsRef.current - minDurationUs;
          const candidateStartUs = Math.max(0, Math.min(maxStartUs, initialStartUsRef.current + deltaUs));
          const candidateDurationUs = (initialStartUsRef.current + initialDurationUsRef.current) - candidateStartUs;

          candidateStartUsRef.current = candidateStartUs;
          setLiveStartUs(candidateStartUs);
          setLiveDurationUs(candidateDurationUs);
          onSeek(candidateStartUs);
        },
        onPanResponderRelease: () => {
          if (isDraggingRef.current) {
            onTrimStart(clip.id, candidateStartUsRef.current);
          }
          isDraggingRef.current = false;
          setActiveGesture(null);
          setLiveStartUs(null);
          setLiveDurationUs(null);
          onDragStateChange(false);
        },
        onPanResponderTerminate: () => {
          isDraggingRef.current = false;
          setActiveGesture(null);
          setLiveStartUs(null);
          setLiveDurationUs(null);
          onDragStateChange(false);
        },
      }),
    [clip.id, clip.timelineRange, pixelsPerSec, onTrimStart, onDragStateChange, onSeek]
  );

  // PanResponder for Right Trim Handle (Trims end, adjusts duration)
  const panResponderRight = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          initialStartUsRef.current = clip.timelineRange.startUs;
          initialDurationUsRef.current = clip.timelineRange.durationUs;
          candidateEndUsRef.current = clip.timelineRange.startUs + clip.timelineRange.durationUs;
          isDraggingRef.current = true;
          setActiveGesture('trimRight');
          onDragStateChange(true);
        },
        onPanResponderMove: (_: GestureResponderEvent, gestureState: PanResponderGestureState) => {
          const deltaUs = pixelsToTimeUs(gestureState.dx, pixelsPerSec);
          const minDurationUs = 200_000;
          const candidateEndUs = Math.max(
            initialStartUsRef.current + minDurationUs,
            initialStartUsRef.current + initialDurationUsRef.current + deltaUs
          );
          const candidateDurationUs = candidateEndUs - initialStartUsRef.current;

          candidateEndUsRef.current = candidateEndUs;
          setLiveDurationUs(candidateDurationUs);
          onSeek(candidateEndUs);
        },
        onPanResponderRelease: () => {
          if (isDraggingRef.current) {
            onTrimEnd(clip.id, candidateEndUsRef.current);
          }
          isDraggingRef.current = false;
          setActiveGesture(null);
          setLiveDurationUs(null);
          onDragStateChange(false);
        },
        onPanResponderTerminate: () => {
          isDraggingRef.current = false;
          setActiveGesture(null);
          setLiveDurationUs(null);
          onDragStateChange(false);
        },
      }),
    [clip.id, clip.timelineRange, pixelsPerSec, onTrimEnd, onDragStateChange, onSeek]
  );

  // PanResponder for Clip Body (Moves clip along timeline or taps to select)
  const panResponderBody = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_: GestureResponderEvent, gestureState: PanResponderGestureState) => {
          return Math.abs(gestureState.dx) > 5;
        },
        onPanResponderGrant: () => {
          initialStartUsRef.current = clip.timelineRange.startUs;
          candidateStartUsRef.current = clip.timelineRange.startUs;
          isDraggingRef.current = false;
        },
        onPanResponderMove: (_: GestureResponderEvent, gestureState: PanResponderGestureState) => {
          if (Math.abs(gestureState.dx) > 5) {
            if (!isDraggingRef.current) {
              isDraggingRef.current = true;
              setActiveGesture('move');
              onDragStateChange(true);
            }
            const deltaUs = pixelsToTimeUs(gestureState.dx, pixelsPerSec);
            const candidateStartUs = Math.max(0, initialStartUsRef.current + deltaUs);
            candidateStartUsRef.current = candidateStartUs;
            setLiveStartUs(candidateStartUs);
            onSeek(candidateStartUs);
          }
        },
        onPanResponderRelease: () => {
          if (isDraggingRef.current) {
            onMove(clip.id, candidateStartUsRef.current);
            onDragStateChange(false);
          } else {
            onSelect(clip.id);
          }
          isDraggingRef.current = false;
          setActiveGesture(null);
          setLiveStartUs(null);
        },
        onPanResponderTerminate: () => {
          isDraggingRef.current = false;
          setActiveGesture(null);
          setLiveStartUs(null);
          onDragStateChange(false);
        },
      }),
    [clip.id, clip.timelineRange, pixelsPerSec, onMove, onSelect, onDragStateChange, onSeek]
  );

  const effectiveStartUs = liveStartUs ?? clip.timelineRange.startUs;
  const effectiveDurationUs = liveDurationUs ?? clip.timelineRange.durationUs;
  const left = timeUsToPixels(effectiveStartUs, pixelsPerSec);
  const width = Math.max(36, timeUsToPixels(effectiveDurationUs, pixelsPerSec));

  return (
    <View
      style={[
        styles.clipBlock,
        clip.type === 'video' && styles.videoClip,
        clip.type === 'audio' && styles.audioClip,
        clip.type === 'text' && styles.textClip,
        isSelected && styles.clipSelected,
        { left, width },
      ]}
      {...panResponderBody.panHandlers}
    >
      {/* Live Duration Feedback Pill during trimming / moving */}
      {activeGesture && (
        <View style={styles.feedbackPill}>
          <Text style={styles.feedbackPillText}>
            {microsToSeconds(effectiveDurationUs).toFixed(2)}s
          </Text>
        </View>
      )}

      {/* Left Trim Handle (when selected) */}
      {isSelected && (
        <View
          style={[styles.trimHandle, styles.trimLeft]}
          {...panResponderLeft.panHandlers}
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 10 }}
        >
          <View style={styles.trimGripBar} />
          <View style={styles.trimGripBar} />
        </View>
      )}

      {/* Clip Content & Label */}
      <View style={styles.clipInnerContent} pointerEvents="none">
        <Text style={styles.clipText} numberOfLines={1}>
          {clip.name}
        </Text>
        {clip.type === 'audio' && (
          <View style={styles.waveformContainer}>
            {WAVEFORM_PREVIEW_HEIGHTS.map((barHeight, barIdx) => (
              <View
                key={barIdx}
                style={[styles.waveformBar, { height: barHeight }]}
              />
            ))}
          </View>
        )}
      </View>

      {/* Right Trim Handle (when selected) */}
      {isSelected && (
        <View
          style={[styles.trimHandle, styles.trimRight]}
          {...panResponderRight.panHandlers}
          hitSlop={{ top: 12, bottom: 12, left: 10, right: 16 }}
        >
          <View style={styles.trimGripBar} />
          <View style={styles.trimGripBar} />
        </View>
      )}

      {renderTransitionButton}
    </View>
  );
};

const styles = StyleSheet.create({
  clipBlock: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: borderRadius.xs,
    justifyContent: 'center',
    overflow: 'visible',
    borderWidth: 1.5,
    borderColor: 'transparent',
    zIndex: 1,
  },
  videoClip: {
    backgroundColor: colors.trackVideo,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  audioClip: {
    backgroundColor: colors.trackAudio,
    borderLeftWidth: 3,
    borderLeftColor: colors.accentGreen,
  },
  textClip: {
    backgroundColor: colors.trackText,
    borderLeftWidth: 3,
    borderLeftColor: colors.accentPink,
  },
  clipSelected: {
    borderColor: '#FFFFFF',
    borderWidth: 2,
    zIndex: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 6,
  },
  clipInnerContent: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  clipText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  waveformBar: {
    width: 2,
    backgroundColor: colors.accentGreen,
    borderRadius: 1,
  },
  trimHandle: {
    position: 'absolute',
    top: -2,
    bottom: -2,
    width: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
    zIndex: 20,
  },
  trimLeft: {
    left: -2,
    borderTopLeftRadius: borderRadius.xs,
    borderBottomLeftRadius: borderRadius.xs,
  },
  trimRight: {
    right: -2,
    borderTopRightRadius: borderRadius.xs,
    borderBottomRightRadius: borderRadius.xs,
  },
  trimGripBar: {
    width: 2,
    height: 14,
    backgroundColor: '#1E1E24',
    borderRadius: 1,
  },
  feedbackPill: {
    position: 'absolute',
    top: -22,
    alignSelf: 'center',
    backgroundColor: '#00F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 30,
  },
  feedbackPillText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '800',
  },
});
