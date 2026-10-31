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

function generateWaveformBars(width: number, seed: number = 1): number[] {
  const barCount = Math.max(10, Math.min(120, Math.floor((width - 24) / 4)));
  const bars: number[] = [];
  for (let i = 0; i < barCount; i++) {
    const t = i / barCount;
    const raw =
      0.5 +
      0.35 * Math.sin(t * Math.PI * 2 * 3.7 + seed) +
      0.15 * Math.cos(t * Math.PI * 2 * 7.1 + seed * 2);
    bars.push(Math.max(2, Math.min(14, Math.round(raw * 14))));
  }
  return bars;
}

function getFilmstripTiles(width: number): number[] {
  const count = Math.max(1, Math.min(40, Math.floor(width / 52)));
  return Array.from({ length: count }, (_, i) => i);
}

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
      // PanResponder stores callbacks; ref reads happen only in native gesture events.
      // eslint-disable-next-line react-hooks/refs
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
      // PanResponder stores callbacks; ref reads happen only in native gesture events.
      // eslint-disable-next-line react-hooks/refs
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
      // PanResponder stores callbacks; ref reads happen only in native gesture events.
      // eslint-disable-next-line react-hooks/refs
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

  const waveformBars = useMemo(
    () => generateWaveformBars(width, clip.name.length),
    [width, clip.name]
  );

  const filmstripTiles = useMemo(
    () => getFilmstripTiles(width),
    [width]
  );

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
      {/* CapCut Filmstrip Frame Tiles (for Video Clips) */}
      {clip.type === 'video' && (
        <View style={styles.filmstripTrack} pointerEvents="none">
          {filmstripTiles.map((tileIdx) => (
            <View key={tileIdx} style={styles.filmstripFrame}>
              <View style={styles.filmstripFrameTopNotch} />
              <View style={styles.filmstripFrameCenter}>
                <Text style={styles.filmstripFrameClapper}>🎬</Text>
              </View>
              <View style={styles.filmstripFrameBottomNotch} />
            </View>
          ))}
        </View>
      )}

      {/* Live Duration Feedback Pill during trimming / moving */}
      {activeGesture && (
        <View style={styles.feedbackPill}>
          <Text style={styles.feedbackPillText}>
            {microsToSeconds(effectiveDurationUs).toFixed(2)}s
          </Text>
        </View>
      )}

      {/* CapCut White Left Trim Handle (when selected) */}
      {isSelected && (
        <View
          style={[styles.trimHandle, styles.trimLeft]}
          {...panResponderLeft.panHandlers}
          hitSlop={{ top: 14, bottom: 14, left: 18, right: 10 }}
        >
          <View style={styles.trimGripBar} />
          <View style={styles.trimGripBar} />
        </View>
      )}

      {/* Clip Content Overlay & Label */}
      <View style={styles.clipInnerContent} pointerEvents="none">
        <View style={styles.clipTitleRow}>
          <View style={styles.clipTitleBadge}>
            <Text style={styles.clipText} numberOfLines={1}>
              {clip.name}
            </Text>
          </View>
          {clip.type === 'video' && ((clip as any).volume ?? 1) > 0 && (
            <View style={styles.audioBadge}>
              <Text style={styles.audioBadgeText}>🔊</Text>
            </View>
          )}
        </View>

        {/* CapCut Continuous Emerald Waveform for Audio */}
        {clip.type === 'audio' && (
          <View style={styles.waveformContainer}>
            {waveformBars.map((barHeight, barIdx) => (
              <View
                key={barIdx}
                style={[styles.waveformBar, { height: Math.max(3, barHeight * 1.2) }]}
              />
            ))}
          </View>
        )}

        {/* CapCut Continuous Cyan Waveform along the bottom for Video with audio */}
        {clip.type === 'video' && ((clip as any).volume ?? 1) > 0 && (
          <View style={styles.videoWaveformContainer}>
            {waveformBars.map((barHeight, barIdx) => (
              <View
                key={barIdx}
                style={[
                  styles.videoWaveformBar,
                  { height: Math.max(2, Math.round(barHeight * 0.65)) },
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {/* CapCut White Right Trim Handle (when selected) */}
      {isSelected && (
        <View
          style={[styles.trimHandle, styles.trimRight]}
          {...panResponderRight.panHandlers}
          hitSlop={{ top: 14, bottom: 14, left: 10, right: 18 }}
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
    top: 3,
    bottom: 3,
    borderRadius: 6,
    justifyContent: 'center',
    overflow: 'visible',
    borderWidth: 1.5,
    borderColor: 'transparent',
    zIndex: 1,
  },
  videoClip: {
    backgroundColor: '#1C1C24',
    borderWidth: 1,
    borderColor: '#2D2D3A',
  },
  audioClip: {
    backgroundColor: '#0A2920',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  textClip: {
    backgroundColor: '#261C14',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  clipSelected: {
    borderColor: '#FFFFFF',
    borderWidth: 2.5,
    zIndex: 20,
    shadowColor: '#00F2FE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 5,
    elevation: 8,
  },
  filmstripTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 5,
  },
  filmstripFrame: {
    width: 48,
    height: '100%',
    backgroundColor: '#23232E',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  filmstripFrameTopNotch: {
    width: 8,
    height: 3,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  filmstripFrameCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.25,
  },
  filmstripFrameClapper: {
    fontSize: 14,
  },
  filmstripFrameBottomNotch: {
    width: 8,
    height: 3,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  clipInnerContent: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    paddingVertical: 4,
    zIndex: 2,
  },
  clipTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clipTitleBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: '85%',
  },
  audioBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  audioBadgeText: {
    fontSize: 9,
  },
  clipText: {
    color: '#FFFFFF',
    fontSize: 10,
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
    backgroundColor: '#10B981',
    borderRadius: 1,
  },
  videoWaveformContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    opacity: 0.85,
  },
  videoWaveformBar: {
    width: 2,
    backgroundColor: '#00F2FE',
    borderRadius: 1,
  },
  trimHandle: {
    position: 'absolute',
    top: -2.5,
    bottom: -2.5,
    width: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
    zIndex: 30,
    shadowColor: '#000000',
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 10,
  },
  trimLeft: {
    left: -2.5,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  trimRight: {
    right: -2.5,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  trimGripBar: {
    width: 1.5,
    height: 16,
    backgroundColor: '#18181B',
    borderRadius: 1,
  },
  feedbackPill: {
    position: 'absolute',
    top: -24,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    zIndex: 40,
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 8,
  },
  feedbackPillText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '800',
  },
});
