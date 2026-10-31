import { AppModal as Modal } from '../../components/AppModal';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Alert,
  ActivityIndicator,
  Platform,
  PanResponder,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { Project, AspectRatio, DEFAULT_PROJECT_SETTINGS } from '../../core/models/project';
import { Clip, VideoClip, AudioClip, TextOverlay, ImageClip, KeyframeTrack } from '../../core/models/clip';
import { defaultProjectStorage } from '../../core/persistence/storage';
import {
  TimelineEngine,
  TimelineState,
  createInitialTimelineState,
} from '../../core/timeline/engine';
import {
  formatTimecode,
  MICROS_PER_SECOND,
  secondsToMicros,
} from '../../core/models/timeline';
import {
  timeUsToPixels,
  pixelsToTimeUs,
  calculateProjectDurationUs,
  findActiveClipAtTime,
} from '../../core/timeline/calculator';
import { getInterpolatedTransform } from '../../core/timeline/keyframes';
import { defaultAIEngineService } from '../../services/aiEngineService';
import { VideoPlayerView, isImageUri } from '../playback/VideoPlayerView';
import { pickVideoFromStorage } from '../../services/mediaImport';
import { FilterModal } from '../effects/FilterModal';
import { TransitionModal } from '../transitions/TransitionModal';
import { AudioModal } from '../audio/AudioModal';
import { SubtitleModal } from './SubtitleModal';
import { SpeedCurveModal } from './SpeedCurveModal';
import { BlendModeModal } from './BlendModeModal';
import { TimelineClip } from './TimelineClip';
import { SplitScreenModal } from './SplitScreenModal';
import { LUT_FILTERS_CATALOG } from '../../core/effects/effectRegistry';
import { VIRAL_TEMPLATES, compileProjectFromTemplate } from '../../core/templates/templateEngine';
import { useGuaranteedInsets } from '../../navigation/safeArea';
import { AnimatedPlayhead, LottieAudioVisualizer } from '../../components/animations';
import { FilmoraStudioModal } from '../filmora/FilmoraStudioModal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface EditorScreenProps {
  projectId: string;
  onBack: () => void;
  onExport: (projectId: string) => void;
}

const TRACK_HEADER_WIDTH = 64;
const PIXELS_PER_SEC_DEFAULT = 60; // 60px per second on default zoom

const RATIO_OPTIONS: { ratio: AspectRatio; label: string; desc: string }[] = [
  { ratio: '9:16', label: '9:16', desc: 'TikTok, Reels, Shorts' },
  { ratio: '16:9', label: '16:9', desc: 'YouTube, Landscape' },
  { ratio: '1:1', label: '1:1', desc: 'Instagram Square' },
  { ratio: '4:5', label: '4:5', desc: 'Feed Portrait' },
];

export const EditorScreen: React.FC<EditorScreenProps> = ({
  projectId,
  onBack,
  onExport,
}) => {
  const insets = useGuaranteedInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [project, setProject] = useState<Project | null>(null);
  const [engine, setEngine] = useState<TimelineEngine | null>(null);
  const [state, setState] = useState<TimelineState | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pixelsPerSec, setPixelsPerSec] = useState(PIXELS_PER_SEC_DEFAULT);
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false);

  const toggleTimelineModal = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsTimelineCollapsed((prev) => !prev);
  }, []);

  const timelineModalPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 12,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 25 || gestureState.vy > 0.3) {
            // Dragged down -> collapse timeline to show full video preview
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setIsTimelineCollapsed(true);
          } else if (gestureState.dy < -25 || gestureState.vy < -0.3) {
            // Dragged up -> expand timeline for editing
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setIsTimelineCollapsed(false);
          }
        },
      }),
    []
  );

  // Modals
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [transitionModalVisible, setTransitionModalVisible] = useState(false);
  const [audioModalVisible, setAudioModalVisible] = useState(false);
  const [subtitleModalVisible, setSubtitleModalVisible] = useState(false);
  const [speedCurveModalVisible, setSpeedCurveModalVisible] = useState(false);
  const [blendModeModalVisible, setBlendModeModalVisible] = useState(false);
  const [splitScreenModalVisible, setSplitScreenModalVisible] = useState(false);
  const [ratioModalVisible, setRatioModalVisible] = useState(false);
  const [filmoraModalVisible, setFilmoraModalVisible] = useState(false);
  const [assetUriMap, setAssetUriMap] = useState<Record<string, string>>({});
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);

  const timelineScrollRef = useRef<any>(null);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load project on mount and restore asset URIs
  useEffect(() => {
    async function load() {
      let p = await defaultProjectStorage.loadProject(projectId);
      if (!p) {
        // Fallback: If project not found in storage or opening directly, synthesize template project
        const matchedTpl =
          VIRAL_TEMPLATES.find(
            (t) => t.id === projectId || projectId.includes(t.id) || projectId.toLowerCase().includes('tiktok')
          ) || VIRAL_TEMPLATES[0];

        if (matchedTpl) {
          p = compileProjectFromTemplate(matchedTpl, []);
          p.metadata.id = projectId;
          await defaultProjectStorage.saveProject(p);
        } else {
          p = defaultProjectStorage.createProject('NovaCut Project');
          p.metadata.id = projectId;
          await defaultProjectStorage.saveProject(p);
        }
      }

      if (p) {
        setProject(p);
        const initial = createInitialTimelineState(p);
        const eng = new TimelineEngine(initial);
        setEngine(eng);
        setState(eng.getState());

        if (p.assets) {
          const uriMap: Record<string, string> = {};
          Object.values(p.assets).forEach((asset) => {
            if (asset && asset.id && asset.uri) {
              uriMap[asset.id] = asset.uri;
            }
          });
          setAssetUriMap((prev) => ({ ...prev, ...uriMap }));
        }
      }
    }
    load();
  }, [projectId]);

  const durationUs = useMemo(
    () => (state ? calculateProjectDurationUs(state.clips) : 0),
    [state?.clips]
  );

  const selectedClip = useMemo(
    () => (state?.selectedClipId ? state.clips[state.selectedClipId] : null),
    [state]
  );

  const activeMediaClip = useMemo(() => {
    if (!state) return null;
    const videoTrack = state.project.tracks.find((t) => t.type === 'video');
    if (!videoTrack) return null;
    return findActiveClipAtTime(
      videoTrack.clips.map((id) => state.clips[id]).filter(Boolean),
      state.playheadUs
    ) as VideoClip | ImageClip | null;
  }, [state?.project.tracks, state?.clips, state?.playheadUs]);

  const activeVideoUri = useMemo(() => {
    if (!activeMediaClip) return undefined;
    return assetUriMap[activeMediaClip.assetId];
  }, [activeMediaClip, assetUriMap]);

  const activeSubtitleText = useMemo(() => {
    if (!state) return undefined;
    const textTrack = state.project.tracks.find((t) => t.type === 'text');
    if (!textTrack) return undefined;
    const activeText = findActiveClipAtTime(
      textTrack.clips.map((id) => state.clips[id]).filter(Boolean),
      state.playheadUs
    ) as TextOverlay | null;
    return activeText?.text;
  }, [state?.project.tracks, state?.clips, state?.playheadUs]);

  const activeAudioClip = useMemo(() => {
    if (!state) return null;
    const audioTrack = state.project.tracks.find((t) => t.type === 'audio');
    if (!audioTrack) return null;
    return findActiveClipAtTime(
      audioTrack.clips.map((id) => state.clips[id]).filter(Boolean),
      state.playheadUs
    ) as AudioClip | null;
  }, [state?.project.tracks, state?.clips, state?.playheadUs]);

  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiStatusMessage, setAiStatusMessage] = useState('');

  // Compute exact local seek time inside current active clip (prevents seeking past EOF)
  const clipLocalSeekTimeMs = useMemo(() => {
    if (!state || !activeMediaClip) return 0;
    const offsetUs = state.playheadUs - activeMediaClip.timelineRange.startUs;
    const sourceUs = ((activeMediaClip as any).sourceRange?.startUs || 0) + Math.max(0, offsetUs) * (activeMediaClip.type === 'video' ? activeMediaClip.speed : 1);
    return Math.round(sourceUs / 1000);
  }, [state?.playheadUs, activeMediaClip]);

  // Native player timeUpdate listener to seamlessly advance playhead in sync with audio
  const handlePlaybackTimeUpdate = useCallback(
    (currentLocalMs: number) => {
      if (!engine || !state || !isPlaying) return;
      if (!activeMediaClip || activeMediaClip.type !== 'video') return;

      const currentLocalUs = currentLocalMs * 1000;
      const timelineOffsetUs = currentLocalUs - ((activeMediaClip as any).sourceRange?.startUs || 0);
      const newPlayheadUs = activeMediaClip.timelineRange.startUs + Math.max(0, timelineOffsetUs) / activeMediaClip.speed;

      const clipEndUs = activeMediaClip.timelineRange.startUs + activeMediaClip.timelineRange.durationUs;
      if (newPlayheadUs >= clipEndUs) {
        if (clipEndUs >= durationUs) {
          setIsPlaying(false);
          engine.setPlayhead(0);
        } else {
          engine.setPlayhead(clipEndUs);
        }
        setState({ ...engine.getState() });
      } else {
        engine.setPlayhead(newPlayheadUs);
        setState({ ...engine.getState() });
      }
    },
    [engine, state, isPlaying, activeMediaClip, durationUs]
  );

  // Handle Unified Playback Engine (Delta clock for photos, templates, audio, web, and gaps)
  useEffect(() => {
    if (!isPlaying || !engine) {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
      return;
    }

    const isActualHardwareVideo =
      Platform.OS !== 'web' &&
      activeMediaClip?.type === 'video' &&
      Boolean(activeVideoUri) &&
      !isImageUri(activeVideoUri);

    if (isActualHardwareVideo) {
      // Hardware video player on native mobile drives smooth playback via handlePlaybackTimeUpdate
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
      return;
    }

    let lastTime = Date.now();
    playTimerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsedMs = Math.min(now - lastTime, 100);
      lastTime = now;

      const currentState = engine.getState();
      const totalDuration = calculateProjectDurationUs(currentState.clips);
      if (totalDuration === 0) {
        setIsPlaying(false);
        return;
      }

      const advanceUs = Math.round(elapsedMs * 1000);
      const nextPlayhead = currentState.playheadUs + advanceUs;

      if (nextPlayhead >= totalDuration) {
        engine.setPlayhead(0);
        setState({ ...engine.getState() });
        setIsPlaying(false);
      } else {
        engine.setPlayhead(nextPlayhead);
        setState({ ...engine.getState() });
      }
    }, 33);

    return () => {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    };
  }, [isPlaying, engine, activeMediaClip?.type, activeVideoUri]);

  const rulerMarks = useMemo(() => {
    const count = Math.ceil(durationUs / MICROS_PER_SECOND) + 8;
    return Array.from({ length: count }, (_, i) => {
      const minutes = Math.floor(i / 60);
      const seconds = i % 60;
      const timecode = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      return {
        index: i,
        timecode,
        left: timeUsToPixels(secondsToMicros(i), pixelsPerSec),
      };
    });
  }, [durationUs, pixelsPerSec]);

  // Actions
  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      if (!prev && engine) {
        const currentUs = engine.getState().playheadUs;
        if (durationUs > 0 && currentUs >= durationUs) {
          engine.setPlayhead(0);
          setState({ ...engine.getState() });
        }
      }
      return !prev;
    });
  }, [engine, durationUs]);

  const handleSeek = useCallback(
    (timeUs: number) => {
      if (!engine) return;
      const clamped = Math.max(0, Math.min(durationUs, timeUs));
      engine.setPlayhead(clamped);
      setState({ ...engine.getState() });
    },
    [engine, durationUs]
  );

  const rulerPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          setIsDraggingTimeline(true);
          const touchX = evt.nativeEvent.locationX;
          const targetUs = pixelsToTimeUs(Math.max(0, touchX - TRACK_HEADER_WIDTH), pixelsPerSec);
          handleSeek(targetUs);
        },
        onPanResponderMove: (evt) => {
          const touchX = evt.nativeEvent.locationX;
          const targetUs = pixelsToTimeUs(Math.max(0, touchX - TRACK_HEADER_WIDTH), pixelsPerSec);
          handleSeek(targetUs);
        },
        onPanResponderRelease: () => {
          setIsDraggingTimeline(false);
        },
        onPanResponderTerminate: () => {
          setIsDraggingTimeline(false);
        },
      }),
    [pixelsPerSec, handleSeek]
  );

  const handleTrimStartExplicit = useCallback(
    (clipId: string, newStartUs: number) => {
      if (!engine) return;
      try {
        engine.trimStart(clipId, newStartUs);
        setState({ ...engine.getState() });
      } catch (e: any) {
        console.warn('Trim start error:', e.message);
      }
    },
    [engine]
  );

  const handleTrimEndExplicit = useCallback(
    (clipId: string, newEndUs: number) => {
      if (!engine) return;
      try {
        engine.trimEnd(clipId, newEndUs);
        setState({ ...engine.getState() });
      } catch (e: any) {
        console.warn('Trim end error:', e.message);
      }
    },
    [engine]
  );

  const handleMoveClipExplicit = useCallback(
    (clipId: string, newStartUs: number) => {
      if (!engine) return;
      try {
        engine.moveClip(clipId, newStartUs);
        setState({ ...engine.getState() });
      } catch (e: any) {
        console.warn('Move clip error:', e.message);
      }
    },
    [engine]
  );

  const handleStepFrame = useCallback(
    (direction: -1 | 1) => {
      if (!engine || !state) return;
      const frameDurationUs = 33_333; // ~30 fps
      const target = Math.max(0, Math.min(durationUs, state.playheadUs + direction * frameDurationUs));
      engine.setPlayhead(target);
      setState({ ...engine.getState() });
    },
    [engine, state, durationUs]
  );

  const handleSelectClip = useCallback(
    (clipId: string | null) => {
      if (!engine) return;
      engine.selectClip(clipId);
      setState({ ...engine.getState() });
    },
    [engine]
  );

  const handleSplit = useCallback(() => {
    if (!engine || !state) return;
    if (!state.selectedClipId) {
      // If no clip selected, auto-select active media clip at playhead
      if (activeMediaClip) {
        try {
          engine.split(activeMediaClip.id, state.playheadUs);
          setState({ ...engine.getState() });
          return;
        } catch (e: any) {
          Alert.alert('Cannot Split', e.message);
          return;
        }
      }
      Alert.alert('Split Clip', 'Select a clip or move playhead over a clip to split.');
      return;
    }
    try {
      engine.split(state.selectedClipId, state.playheadUs);
      setState({ ...engine.getState() });
    } catch (e: any) {
      Alert.alert('Cannot Split', e.message);
    }
  }, [engine, state, activeMediaClip]);

  const handleTrimStart = useCallback(() => {
    if (!engine || !state || !state.selectedClipId) return;
    try {
      engine.trimStart(state.selectedClipId, state.playheadUs);
      setState({ ...engine.getState() });
    } catch (e: any) {
      Alert.alert('Cannot Trim', e.message);
    }
  }, [engine, state?.selectedClipId, state?.playheadUs]);

  const handleTrimEnd = useCallback(() => {
    if (!engine || !state || !state.selectedClipId) return;
    try {
      engine.trimEnd(state.selectedClipId, state.playheadUs);
      setState({ ...engine.getState() });
    } catch (e: any) {
      Alert.alert('Cannot Trim', e.message);
    }
  }, [engine, state?.selectedClipId, state?.playheadUs]);

  const handleDelete = useCallback(() => {
    if (!engine || !state || !state.selectedClipId) return;
    engine.delete(state.selectedClipId);
    setState({ ...engine.getState() });
  }, [engine, state?.selectedClipId]);

  const handleDuplicate = useCallback(() => {
    if (!engine || !state || !state.selectedClipId) return;
    engine.duplicate(state.selectedClipId);
    setState({ ...engine.getState() });
  }, [engine, state?.selectedClipId]);

  const handleExtractAudio = useCallback(() => {
    if (!engine || !state || !selectedClip || selectedClip.type !== 'video') {
      Alert.alert('Extract Audio', 'Select a video clip to extract its audio.');
      return;
    }

    const audioTrack = state.project.tracks.find((t) => t.type === 'audio');
    if (!audioTrack) {
      Alert.alert('No Audio Track', 'Audio track not found in this project.');
      return;
    }

    const audioClipId = `clip_aud_ext_${Date.now()}`;
    const cleanName = selectedClip.name.replace(/\.[^/.]+$/, '');
    const newAudioClip: AudioClip = {
      id: audioClipId,
      trackId: audioTrack.id,
      type: 'audio',
      name: `🎵 ${cleanName} (Audio)`,
      assetId: selectedClip.assetId,
      timelineRange: { ...selectedClip.timelineRange },
      sourceRange: { ...selectedClip.sourceRange },
      volume: selectedClip.volume ?? 1.0,
      fadeInDurationUs: 0,
      fadeOutDurationUs: 0,
      speed: selectedClip.speed ?? 1.0,
    };

    // Mute video clip volume so it does not double-play with the extracted track
    engine.updateAudioProperties(selectedClip.id, { volume: 0 });
    engine.addClip(audioTrack.id, newAudioClip);
    engine.selectClip(audioClipId);

    const updated = engine.getState();
    setState({ ...updated });
    defaultProjectStorage.saveProject({ ...updated.project, clips: updated.clips });

    Alert.alert('Audio Extracted! 🎵', `Extracted audio from "${selectedClip.name}" into the Audio track.`);
  }, [engine, state, selectedClip]);

  const handleToggleTrackMute = useCallback(
    (trackId: string) => {
      if (!engine) return;
      engine.toggleTrackMute(trackId);
      setState({ ...engine.getState() });
    },
    [engine]
  );

  const handleMoveLeft = useCallback(() => {
    if (!engine || !state || !state.selectedClipId) return;
    const clip = state.clips[state.selectedClipId];
    if (!clip) return;
    const track = state.project.tracks.find((t) => t.id === clip.trackId);
    if (!track) return;
    const idx = track.clips.indexOf(clip.id);
    if (idx > 0) {
      engine.reorderClip(clip.id, idx - 1);
      setState({ ...engine.getState() });
    }
  }, [engine, state?.clips, state?.selectedClipId, state?.project.tracks]);

  const handleMoveRight = useCallback(() => {
    if (!engine || !state || !state.selectedClipId) return;
    const clip = state.clips[state.selectedClipId];
    if (!clip) return;
    const track = state.project.tracks.find((t) => t.id === clip.trackId);
    if (!track) return;
    const idx = track.clips.indexOf(clip.id);
    if (idx < track.clips.length - 1) {
      engine.reorderClip(clip.id, idx + 1);
      setState({ ...engine.getState() });
    }
  }, [engine, state?.clips, state?.selectedClipId, state?.project.tracks]);

  const handleUndo = useCallback(() => {
    if (!engine) return;
    engine.undo();
    setState({ ...engine.getState() });
  }, [engine]);

  const handleRedo = useCallback(() => {
    if (!engine) return;
    engine.redo();
    setState({ ...engine.getState() });
  }, [engine]);

  const handleToggleKeyframe = useCallback(() => {
    if (!engine || !state) return;
    if (!selectedClip || (selectedClip.type !== 'video' && selectedClip.type !== 'image')) {
      Alert.alert('Keyframe', 'Select a video or image clip to add keyframe animation.');
      return;
    }
    const mediaClip = selectedClip as VideoClip | ImageClip;
    const hasKf = mediaClip.keyframes?.scale?.some(
      (k) => Math.abs(k.timeUs - state.playheadUs) < 50_000
    );

    if (hasKf) {
      engine.removeKeyframe(selectedClip.id, 'scale', state.playheadUs);
      engine.removeKeyframe(selectedClip.id, 'opacity', state.playheadUs);
      engine.removeKeyframe(selectedClip.id, 'rotationDeg', state.playheadUs);
    } else {
      const transform = mediaClip.transform || {
        scale: 1,
        rotationDeg: 0,
        translateX: 0,
        translateY: 0,
        opacity: 1,
      };
      engine.addKeyframe(selectedClip.id, 'scale', state.playheadUs, transform.scale);
      engine.addKeyframe(selectedClip.id, 'opacity', state.playheadUs, transform.opacity);
      engine.addKeyframe(selectedClip.id, 'rotationDeg', state.playheadUs, transform.rotationDeg);
    }
    setState({ ...engine.getState() });
  }, [engine, state, selectedClip]);

  const handleSave = useCallback(async () => {
    if (!state) return;
    const projectToSave: Project = {
      ...state.project,
      clips: state.clips,
      assets: state.project.assets || {},
    };
    await defaultProjectStorage.saveProject(projectToSave);
    Alert.alert('Saved ✨', 'Project saved successfully.');
  }, [state]);

  const handleImportVideo = useCallback(async () => {
    if (!engine || !state) return;
    const videoTrack = state.project.tracks.find((t) => t.type === 'video');
    if (!videoTrack) return;
    try {
      const res = await pickVideoFromStorage(videoTrack.id, durationUs, 'all');
      if (res) {
        setAssetUriMap((prev) => ({ ...prev, [res.asset.id]: res.asset.uri }));
        const updatedAssets = { ...(state.project.assets || {}), [res.asset.id]: res.asset };
        engine.updateAssets(updatedAssets);
        engine.addClip(videoTrack.id, res.clip);
        setState({ ...engine.getState() });
      }
    } catch (err: any) {
      Alert.alert('Gallery Import Failed', err.message || 'Could not import media from gallery');
    }
  }, [engine, state, durationUs]);

  const handleSelectAspectRatio = useCallback(
    (ratio: AspectRatio) => {
      if (!engine || !state) return;
      engine.updateSettings({ ...state.project.settings, ...DEFAULT_PROJECT_SETTINGS[ratio], aspectRatio: ratio });
      const updated = engine.getState();
      setState({ ...updated });
      setProject(updated.project);
      defaultProjectStorage.saveProject({ ...updated.project, clips: updated.clips });
      setRatioModalVisible(false);
    },
    [engine, state]
  );

  // Add Demo Media Clip to test editing capabilities
  const handleAddDemoClip = useCallback(
    (type: 'video' | 'audio' | 'text') => {
      if (!engine || !state) return;
      const clipIndex = Object.keys(state.clips).length + 1;
      const clipDurationUs = secondsToMicros(4); // 4 seconds duration
      const startUs = durationUs; // append at the end of the timeline

      if (type === 'video') {
        const videoTrack = state.project.tracks.find((t) => t.type === 'video')!;
        const sampleVideoUri = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
        const assetId = `asset_sample_${clipIndex}_${Date.now()}`;
        setAssetUriMap((prev) => ({ ...prev, [assetId]: sampleVideoUri }));

        const sampleAsset = {
          id: assetId,
          uri: sampleVideoUri,
          name: `Scene ${clipIndex}.mp4`,
          type: 'video' as const,
          metadata: {
            width: 1920,
            height: 1080,
            durationUs: clipDurationUs,
            fps: 30,
            mimeType: 'video/mp4',
            fileSize: 0,
            hasAudio: true,
          },
          createdAt: Date.now(),
        };
        engine.updateAssets({ ...(state.project.assets || {}), [assetId]: sampleAsset });

        const newClip: Clip = {
          id: `clip_vid_${Date.now()}`,
          trackId: videoTrack.id,
          type: 'video',
          name: `Scene ${clipIndex}.mp4`,
          assetId,
          timelineRange: { startUs, durationUs: clipDurationUs },
          sourceRange: { startUs: 0, durationUs: clipDurationUs },
          speed: 1.0,
          volume: 1.0,
          transform: {
            scale: 1,
            rotationDeg: 0,
            translateX: 0,
            translateY: 0,
            opacity: 1,
          },
          colorAdjustments: {
            brightness: 0,
            contrast: 1,
            saturation: 1,
            temperature: 0,
          },
        } as VideoClip;
        engine.addClip(videoTrack.id, newClip);
      } else if (type === 'audio') {
        const audioTrack = state.project.tracks.find((t) => t.type === 'audio')!;
        const newClip: Clip = {
          id: `clip_aud_${Date.now()}`,
          trackId: audioTrack.id,
          type: 'audio',
          name: `Music ${clipIndex}.mp3`,
          assetId: `asset_audio_${clipIndex}`,
          timelineRange: { startUs: 0, durationUs: clipDurationUs * 2 },
          sourceRange: { startUs: 0, durationUs: clipDurationUs * 2 },
          volume: 0.8,
          fadeInDurationUs: 500_000,
          fadeOutDurationUs: 500_000,
          speed: 1.0,
        } as AudioClip;
        engine.addClip(audioTrack.id, newClip);
      } else {
        const textTrack = state.project.tracks.find((t) => t.type === 'text')!;
        const newClip: Clip = {
          id: `clip_txt_${Date.now()}`,
          trackId: textTrack.id,
          type: 'text',
          name: `Title ${clipIndex}`,
          text: 'CapCut Vibe',
          fontSize: 24,
          textColor: '#FFFFFF',
          alignment: 'center',
          timelineRange: { startUs, durationUs: clipDurationUs },
          transform: {
            scale: 1,
            rotationDeg: 0,
            translateX: 0,
            translateY: 0,
            opacity: 1,
          },
        } as TextOverlay;
        engine.addClip(textTrack.id, newClip);
      }

      setState({ ...engine.getState() });
    },
    [engine, state, durationUs]
  );

  // Rendering aspect ratio styles
  const isDesktop = Platform.OS === 'web' && windowWidth > 768;
  const currentRatio = project?.settings.aspectRatio || '9:16';
  const playerViewportStyle = useMemo(() => {
    const [w, h] = currentRatio.split(':').map(Number);
    const ratio = w / h;
    const availableHeight = isTimelineCollapsed
      ? Math.max(180, windowHeight - insets.top - insets.bottom - 120)
      : Math.max(96, Math.min(360, (windowHeight - insets.top - insets.bottom) * 0.32));
    const width = Math.min(windowWidth - insets.left - insets.right - 24, availableHeight * ratio);
    return { width, height: width / ratio };
  }, [currentRatio, windowWidth, windowHeight, insets, isTimelineCollapsed]);

  // Timeline UI rendering
  const timelineWidth = useMemo(
    () =>
      Math.max(
        windowWidth,
        TRACK_HEADER_WIDTH + timeUsToPixels(durationUs + secondsToMicros(6), pixelsPerSec)
      ),
    [durationUs, pixelsPerSec, windowWidth]
  );

  const playheadPixelX = useMemo(
    () => timeUsToPixels(state?.playheadUs || 0, pixelsPerSec),
    [state?.playheadUs, pixelsPerSec]
  );

  // Auto-scroll timeline to follow playhead during playback
  useEffect(() => {
    if (!isPlaying || !timelineScrollRef.current) return;
    const absolutePlayheadX = TRACK_HEADER_WIDTH + playheadPixelX;
    if (absolutePlayheadX > windowWidth * 0.75) {
      timelineScrollRef.current.scrollTo({
        x: Math.max(0, absolutePlayheadX - windowWidth * 0.35),
        animated: false,
      });
    }
  }, [isPlaying, playheadPixelX, windowWidth]);

  // Scroll back to start when playhead resets to 0
  useEffect(() => {
    if (!timelineScrollRef.current) return;
    if (playheadPixelX === 0) {
      timelineScrollRef.current.scrollTo({ x: 0, animated: true });
    }
  }, [playheadPixelX]);

  // Desktop Web Keyboard Shortcuts: Space (Play/Pause), Left/Right (Frame Step), Home/End, S (Split), Del (Delete), Ctrl+Z (Undo), Ctrl+Y (Redo)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleStepFrame(-1);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleStepFrame(1);
      } else if (e.code === 'Home') {
        e.preventDefault();
        handleSeek(0);
      } else if (e.code === 'End') {
        e.preventDefault();
        handleSeek(durationUs);
      } else if (e.code === 'KeyS' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleSplit();
      } else if ((e.code === 'Delete' || e.code === 'Backspace') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleDelete();
      } else if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.code === 'KeyY' && (e.ctrlKey || e.metaKey)) || (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleTogglePlay, handleStepFrame, handleSeek, durationUs, handleSplit, handleDelete, handleUndo, handleRedo]);

  const isKeyframeAtPlayhead = useMemo(() => {
    if (!selectedClip || (selectedClip.type !== 'video' && selectedClip.type !== 'image')) return false;
    const mc = selectedClip as VideoClip | ImageClip;
    return mc.keyframes?.scale?.some((k) => Math.abs(k.timeUs - (state?.playheadUs ?? 0)) < 50_000) ?? false;
  }, [selectedClip, state?.playheadUs]);

  const handleAIAutoReframe = async () => {
    if (!engine) return;
    if (!selectedClip || (selectedClip.type !== 'video' && selectedClip.type !== 'image')) {
      Alert.alert('AI Auto-Reframe', 'Please select a video or photo clip on the timeline first.');
      return;
    }

    const clipUri = (selectedClip as any).assetUri || (selectedClip as any).uri || activeVideoUri;
    if (!clipUri) {
      Alert.alert('AI Auto-Reframe', 'Selected clip does not have a valid media file.');
      return;
    }

    try {
      setIsAIProcessing(true);
      setAiStatusMessage('Tracking focal attention centers across frames (OpenCV)...');
      const result = await defaultAIEngineService.autoReframe(clipUri, '9:16');
      if (result.keyframes && result.keyframes.length > 0) {
        const tracks: KeyframeTrack = {
          translateX: result.keyframes.map((k) => ({
            timeUs: k.timeUs,
            value: k.translateX,
            easing: 'easeInOut',
          })),
          translateY: result.keyframes.map((k) => ({
            timeUs: k.timeUs,
            value: k.translateY,
            easing: 'easeInOut',
          })),
          scale: result.keyframes.map((k) => ({
            timeUs: k.timeUs,
            value: k.scale,
            easing: 'easeInOut',
          })),
        };

        engine.setKeyframeTracks(selectedClip.id, tracks);
        if (project) {
          const updatedProject: Project = {
            ...project,
            settings: {
              ...project.settings,
              aspectRatio: '9:16',
            },
          };
          setProject(updatedProject);
          defaultProjectStorage.saveProject(updatedProject);
        }
        setState({ ...engine.getState() });
        Alert.alert(
          'AI Auto-Reframe 🤖',
          `Generated ${result.keyframes.length} focal tracking keyframes for 9:16 vertical reframe!`
        );
      }
    } catch (err: any) {
      Alert.alert(
        'AI Reframe Notice',
        `Could not reach Python AI Engine (${err.message || 'Error'}).\n\nTip: Start the local server by running 'python engine/novacut_studio.py' on port 8765.`
      );
    } finally {
      setIsAIProcessing(false);
      setAiStatusMessage('');
    }
  };

  const handleAIDetectBeats = async () => {
    try {
      setIsAIProcessing(true);
      setAiStatusMessage('Detecting rhythmic audio transients & beat drops (FFmpeg)...');
      const audioUri = activeAudioClip ? assetUriMap[activeAudioClip.assetId] : activeVideoUri;
      const result = await defaultAIEngineService.detectAudioBeats(audioUri, 120, 15.0);
      if (result.beatDrops && result.beatDrops.length > 0) {
        Alert.alert(
          'AI Smart Beats ⚡',
          `Detected ${result.beatDrops.length} rhythmic beat drops at ${result.bpm} BPM!\n\nAlign your cuts and animations to these beats for viral musical flow.`
        );
      }
    } catch (err: any) {
      Alert.alert(
        'AI Beats Notice',
        `Could not reach Python AI Engine (${err.message || 'Error'}).\n\nEnsure 'python engine/novacut_studio.py' is running.`
      );
    } finally {
      setIsAIProcessing(false);
      setAiStatusMessage('');
    }
  };

  if (!project || !engine || !state) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Editor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <Header
        title={project.metadata.title}
        subtitle={`${currentRatio} • 1080P`}
        onBack={onBack}
        rightAction={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.ratioPill}
              onPress={() => setRatioModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.ratioPillText}>{currentRatio}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.exportHeaderBtn}
              onPress={async () => {
                await defaultProjectStorage.saveProject({ ...state.project, clips: state.clips });
                onExport(project.metadata.id);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.exportHeaderBtnText}>Export ↑</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Video Player Canvas Viewport */}
      <View style={[styles.previewContainer, isTimelineCollapsed && styles.previewContainerExpanded]}>
        <View style={[styles.playerCanvas, playerViewportStyle, !activeVideoUri && { width: windowWidth - 24 }]}>
          <VideoPlayerView
            videoUri={activeVideoUri}
            mediaType={activeMediaClip?.type}
            isPlaying={isPlaying}
            seekTimeMs={clipLocalSeekTimeMs}
            tintColor={
              activeMediaClip && (activeMediaClip as any).lutFilterId
                ? LUT_FILTERS_CATALOG.find((l) => l.id === (activeMediaClip as any).lutFilterId)?.tintRgba
                : undefined
            }
            volume={
              state.project.tracks.find((t) => t.type === 'video')?.isMuted
                ? 0
                : activeMediaClip?.type === 'video'
                ? activeMediaClip.volume
                : 0
            }
            speed={activeMediaClip?.type === 'video' ? activeMediaClip.speed : 1}
            visualEffectIntensity={activeMediaClip?.visualEffectIntensity}
            visualEffect={activeMediaClip ? (activeMediaClip as any).visualEffect : undefined}
            transform={
              activeMediaClip
                ? getInterpolatedTransform(activeMediaClip as any, clipLocalSeekTimeMs * 1000)
                : undefined
            }
            activeSubtitle={activeSubtitleText}
            onPlaybackTimeUpdate={handlePlaybackTimeUpdate}
            onImportPress={handleImportVideo}
            onAddSamplePress={() => handleAddDemoClip('video')}
          />

          {/* Floating Canvas Timecode HUD (Shown when media is active, avoiding overlap on empty canvas) */}
          {durationUs > 0 && (
            <View style={styles.canvasTimecodePill}>
              <Text style={styles.canvasTimecodeText}>
                {formatTimecode(state.playheadUs)} / {formatTimecode(durationUs)}
              </Text>
            </View>
          )}

          {/* Fullscreen / Timeline Collapse Toggle Icon on Canvas */}
          <TouchableOpacity
            style={styles.canvasFullscreenToggleBtn}
            onPress={toggleTimelineModal}
            activeOpacity={0.8}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.canvasFullscreenToggleIcon}>
              {isTimelineCollapsed ? '⤡' : '⤢'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {isTimelineCollapsed ? (
        /* COLLAPSED TIMELINE: Mini Floating Playback HUD Bar */
        <View
          style={[
            styles.collapsedTimelineBar,
            { paddingBottom: Math.max(insets.bottom, spacing.xs) },
          ]}
        >
          {/* Slide Up Drag Handle */}
          <View
            style={styles.sheetHandleGripWrapper}
            {...timelineModalPanResponder.panHandlers}
          >
            <View style={styles.sheetHandleGripBar} />
            <Text style={styles.sheetHandleHintText}>▲ Slide up for timeline</Text>
          </View>

          <View style={styles.collapsedControlsRow}>
            {/* Left: Timecode */}
            <View style={styles.collapsedTimecodePill}>
              <Text style={styles.collapsedTimecodeText}>
                {formatTimecode(state?.playheadUs || 0)} / {formatTimecode(durationUs)}
              </Text>
            </View>

            {/* Center: Playback Controls */}
            <View style={styles.collapsedPlaybackGroup}>
              <TouchableOpacity
                style={styles.collapsedTransportBtn}
                onPress={() => handleStepFrame(-1)}
              >
                <Text style={styles.transportIcon}>|◀</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.collapsedPlayPauseBtn}
                onPress={handleTogglePlay}
              >
                <Text style={styles.playPauseIcon}>{isPlaying ? '⏸' : '▶'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.collapsedTransportBtn}
                onPress={() => handleStepFrame(1)}
              >
                <Text style={styles.transportIcon}>▶|</Text>
              </TouchableOpacity>

              <LottieAudioVisualizer isPlaying={isPlaying} maxHeight={16} barCount={5} />
            </View>

            {/* Right: Expand Timeline Button */}
            <TouchableOpacity
              style={styles.expandTimelineBtn}
              onPress={toggleTimelineModal}
              activeOpacity={0.8}
            >
              <Text style={styles.expandTimelineBtnIcon}>▲</Text>
              <Text style={styles.expandTimelineBtnText}>Timeline</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* EXPANDED TIMELINE: Full Timeline Console with Modal Drawer Handle */
        <View style={styles.expandedTimelineSection}>
          {/* Modal Handle Header (Slide Down to Preview) */}
          <View
            style={styles.sheetHandleHeader}
            {...timelineModalPanResponder.panHandlers}
          >
            <View style={styles.sheetHandleHeaderLeft}>
              <Text style={styles.sheetHandleHeaderIcon}>🎬</Text>
              <Text style={styles.sheetHandleHeaderTitle}>TIMELINE</Text>
            </View>

            {/* Central Grip Handle for Swiping Down */}
            <View style={styles.sheetHandleCenterGrip}>
              <View style={styles.sheetHandleGripBar} />
            </View>

            {/* Right: Full Preview Action Button */}
            <TouchableOpacity
              style={styles.collapseTimelineBtn}
              onPress={toggleTimelineModal}
              activeOpacity={0.8}
            >
              <Text style={styles.collapseTimelineBtnIcon}>▼</Text>
              <Text style={styles.collapseTimelineBtnText}>Full Preview</Text>
            </TouchableOpacity>
          </View>

          {/* Floating Transport Bar Above Timeline */}
          <View style={styles.transportBar}>
        {/* Undo / Redo */}
        <View style={styles.undoRedoGroup}>
          <TouchableOpacity
            style={[styles.transportBtn, !engine.canUndo() && styles.disabledTransportBtn]}
            onPress={handleUndo}
            disabled={!engine.canUndo()}
          >
            <Text style={styles.transportIcon}>↶</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.transportBtn, !engine.canRedo() && styles.disabledTransportBtn]}
            onPress={handleRedo}
            disabled={!engine.canRedo()}
          >
            <Text style={styles.transportIcon}>↷</Text>
          </TouchableOpacity>
        </View>

        {/* Playback Controls */}
        <View style={styles.playbackControlsGroup}>
          <TouchableOpacity style={styles.transportBtn} onPress={() => handleStepFrame(-1)}>
            <Text style={styles.transportIcon}>|◀</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.playPauseCircle} onPress={handleTogglePlay}>
            <Text style={styles.playPauseIcon}>{isPlaying ? '⏸' : '▶'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.transportBtn} onPress={() => handleStepFrame(1)}>
            <Text style={styles.transportIcon}>▶|</Text>
          </TouchableOpacity>

          <LottieAudioVisualizer isPlaying={isPlaying} maxHeight={18} barCount={6} />
        </View>

        {/* Desktop Web Keyboard Shortcuts Pill */}
        {isDesktop && (
          <View style={styles.desktopKeyboardPill}>
            <Text style={styles.desktopKeyboardText}>
              ⌨️ <Text style={styles.desktopKeyboardKey}>Space</Text> Play · <Text style={styles.desktopKeyboardKey}>S</Text> Split · <Text style={styles.desktopKeyboardKey}>Del</Text> Delete · <Text style={styles.desktopKeyboardKey}>◀/▶</Text> Frame
            </Text>
          </View>
        )}

        {/* Keyframe & Split Quick Actions */}
        <View style={styles.quickActionsGroup}>
          {/* CapCut Signature Diamond Keyframe Button */}
          <TouchableOpacity
            style={[
              styles.keyframeDiamondBtn,
              isKeyframeAtPlayhead && styles.keyframeDiamondBtnActive,
            ]}
            onPress={handleToggleKeyframe}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.keyframeDiamondIcon,
                isKeyframeAtPlayhead && styles.keyframeDiamondIconActive,
              ]}
            >
              {isKeyframeAtPlayhead ? '◆' : '◇'}
            </Text>
          </TouchableOpacity>

          {/* Quick Split at Playhead */}
          <TouchableOpacity
            style={styles.quickSplitBtn}
            onPress={handleSplit}
            activeOpacity={0.7}
          >
            <Text style={styles.quickSplitIcon}>✂️</Text>
          </TouchableOpacity>

          {/* Zoom Buttons */}
          <View style={styles.zoomPill}>
            <TouchableOpacity
              style={styles.zoomSubBtn}
              onPress={() => setPixelsPerSec(Math.max(20, pixelsPerSec - 15))}
            >
              <Text style={styles.zoomSubText}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.zoomSubBtn}
              onPress={() => setPixelsPerSec(Math.min(180, pixelsPerSec + 15))}
            >
              <Text style={styles.zoomSubText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Multitrack Timeline Section */}
      <ScrollView style={styles.timelineContainer} nestedScrollEnabled scrollEnabled={!isDraggingTimeline} contentContainerStyle={{ flexGrow: 1 }}>
        <ScrollView
          ref={timelineScrollRef}
          horizontal
          nestedScrollEnabled
          scrollEnabled={!isDraggingTimeline}
          showsHorizontalScrollIndicator
          style={styles.timelineScrollView}
          contentContainerStyle={[
            styles.timelineScrollContent,
            { width: timelineWidth },
          ]}
        >
          {/* Timeline Ruler with Drag Scrubbing */}
          <View
            style={styles.ruler}
            {...rulerPanResponder.panHandlers}
          >
            <View style={styles.rulerHeader}>
              <Text style={styles.rulerHeaderText}>⏱️ TIME</Text>
            </View>
            {rulerMarks.map((mark) => (
              <View
                key={mark.index}
                style={[
                  styles.rulerMark,
                  { left: TRACK_HEADER_WIDTH + mark.left },
                ]}
              >
                <Text style={styles.rulerText}>{mark.timecode}</Text>
                <View style={styles.rulerTick} />
                <View style={[styles.rulerSubTick, { left: 15 }]} />
                <View style={[styles.rulerSubTick, { left: 30 }]} />
                <View style={[styles.rulerSubTick, { left: 45 }]} />
              </View>
            ))}
          </View>

          {/* Tracks Area */}
          <View style={styles.tracksArea}>
            {state.project.tracks.map((track) => {
              const trackClips = track.clips
                .map((id) => state.clips[id])
                .filter(Boolean);

              const isVideoTrack = track.type === 'video';
              const isAudioTrack = track.type === 'audio';
              const isTextTrack = track.type === 'text';

              return (
                <View
                  key={track.id}
                  style={[
                    styles.trackRow,
                    isVideoTrack && styles.videoTrackRow,
                    isAudioTrack && styles.audioTrackRow,
                    isTextTrack && styles.textTrackRow,
                  ]}
                >
                  {/* CapCut Track Left Header */}
                  <View
                    style={[
                      styles.trackLabel,
                      isVideoTrack && styles.videoTrackLabel,
                    ]}
                  >
                    {isVideoTrack ? (
                      <View style={styles.videoTrackHeaderCol}>
                        <TouchableOpacity
                          style={styles.trackCoverBtn}
                          onPress={() => Alert.alert('Cover', 'Project cover photo set from current playhead frame.')}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.trackCoverIcon}>🖼️</Text>
                          <Text style={styles.trackCoverText}>Cover</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.trackMuteBtn,
                            track.isMuted && styles.trackMuteBtnActive,
                          ]}
                          onPress={() => handleToggleTrackMute(track.id)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.trackMuteIcon}>{track.isMuted ? '🔇' : '🔊'}</Text>
                          <Text
                            style={[
                              styles.trackMuteText,
                              track.isMuted && styles.trackMuteTextActive,
                            ]}
                          >
                            {track.isMuted ? 'Muted' : 'Mute'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : isAudioTrack ? (
                      <View style={styles.secondaryTrackHeaderCol}>
                        <Text style={styles.trackLabelIcon}>🎵</Text>
                        <Text style={styles.trackLabelText}>Audio</Text>
                      </View>
                    ) : isTextTrack ? (
                      <View style={styles.secondaryTrackHeaderCol}>
                        <Text style={styles.trackLabelIcon}>🔤</Text>
                        <Text style={styles.trackLabelText}>Text</Text>
                      </View>
                    ) : (
                      <View style={styles.secondaryTrackHeaderCol}>
                        <Text style={styles.trackLabelIcon}>🔲</Text>
                        <Text style={styles.trackLabelText}>Overlay</Text>
                      </View>
                    )}
                  </View>

                  {/* Track Content / Clips Area */}
                  <View style={styles.trackContent}>
                    {/* If Audio track is empty, render CapCut "+ Add audio" prompt pill */}
                    {isAudioTrack && trackClips.length === 0 && (
                      <TouchableOpacity
                        style={styles.emptyTrackAddPrompt}
                        onPress={() => setAudioModalVisible(true)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.emptyTrackPromptIcon}>🎵</Text>
                        <Text style={styles.emptyTrackPromptText}>+ Add audio</Text>
                      </TouchableOpacity>
                    )}

                    {/* If Text track is empty, render CapCut "+ Add text" prompt pill */}
                    {isTextTrack && trackClips.length === 0 && (
                      <TouchableOpacity
                        style={styles.emptyTrackAddPrompt}
                        onPress={() => setSubtitleModalVisible(true)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.emptyTrackPromptIcon}>🔤</Text>
                        <Text style={styles.emptyTrackPromptText}>+ Add text</Text>
                      </TouchableOpacity>
                    )}

                    {trackClips.map((clip, clipIndex) => {
                      const isSelected = state.selectedClipId === clip.id;

                      return (
                        <TimelineClip
                          key={clip.id}
                          clip={clip}
                          isSelected={isSelected}
                          pixelsPerSec={pixelsPerSec}
                          onSelect={handleSelectClip}
                          onTrimStart={handleTrimStartExplicit}
                          onTrimEnd={handleTrimEndExplicit}
                          onMove={handleMoveClipExplicit}
                          onDragStateChange={setIsDraggingTimeline}
                          onSeek={handleSeek}
                          renderTransitionButton={
                            clip.type === 'video' && clipIndex < trackClips.length - 1 ? (
                              <TouchableOpacity
                                style={[styles.transitionSquareBtn, { right: -11 }]}
                                onPress={() => {
                                  handleSelectClip(clip.id);
                                  setTransitionModalVisible(true);
                                }}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.transitionSquareIcon}>|</Text>
                              </TouchableOpacity>
                            ) : undefined
                          }
                        />
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Central Playhead Needle (Obsidian & Gold) Powered by Reanimated */}
          <AnimatedPlayhead
            positionX={TRACK_HEADER_WIDTH + playheadPixelX}
            isPlaying={isPlaying}
          />
        </ScrollView>
      </ScrollView>

      {/* CapCut Two-Level Bottom Editing Dock */}
      <View
        style={[
          styles.dockContainer,
          {
            paddingBottom: insets.bottom,
            minHeight: 72 + insets.bottom,
          },
        ]}
      >
        {selectedClip ? (
          /* LEVEL 2: CLIP EDITING SUB-DOCK (When a clip is selected) */
          <ScrollView keyboardShouldPersistTaps="handled" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dockScroll}>
            {/* Deselect Back Arrow */}
            <TouchableOpacity
              style={styles.dockActionBtnPrimary}
              onPress={() => handleSelectClip(null)}
            >
              <Text style={styles.dockActionIcon}>◀</Text>
              <Text style={styles.dockActionLabelActive}>Done</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dockActionBtn} onPress={handleSplit}>
              <Text style={styles.dockActionIcon}>✂️</Text>
              <Text style={styles.dockActionLabel}>Split</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dockActionBtn}
              onPress={() => {
                if (selectedClip.type === 'video') {
                  setSpeedCurveModalVisible(true);
                } else {
                  Alert.alert('Speed', 'Speed curves apply to video clips.');
                }
              }}
            >
              <Text style={styles.dockActionIcon}>⚡</Text>
              <Text style={styles.dockActionLabel}>Speed</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dockActionBtn}
              onPress={() => {
                if (selectedClip.type === 'video' || selectedClip.type === 'image') {
                  setTransitionModalVisible(true);
                }
              }}
            >
              <Text style={styles.dockActionIcon}>💫</Text>
              <Text style={styles.dockActionLabel}>Animation</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dockActionBtn}
              onPress={() => {
                if (selectedClip.type === 'audio' || selectedClip.type === 'video') {
                  setAudioModalVisible(true);
                }
              }}
            >
              <Text style={styles.dockActionIcon}>🔊</Text>
              <Text style={styles.dockActionLabel}>Volume</Text>
            </TouchableOpacity>

            {selectedClip.type === 'video' && (
              <TouchableOpacity
                style={styles.dockActionBtn}
                onPress={handleExtractAudio}
              >
                <Text style={styles.dockActionIcon}>🎵⬇️</Text>
                <Text style={styles.dockActionLabel}>Extract</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.dockActionBtn}
              onPress={() => setFilterModalVisible(true)}
            >
              <Text style={styles.dockActionIcon}>🎨</Text>
              <Text style={styles.dockActionLabel}>Filters</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dockActionBtn}
              onPress={() => setBlendModeModalVisible(true)}
            >
              <Text style={styles.dockActionIcon}>🎭</Text>
              <Text style={styles.dockActionLabel}>Blend PIP</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dockActionBtn}
              onPress={handleAIAutoReframe}
            >
              <Text style={styles.dockActionIcon}>🤖</Text>
              <Text style={styles.dockActionLabel}>AI Reframe</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dockActionBtn} onPress={handleTrimStart}>
              <Text style={styles.dockActionIcon}>◀|</Text>
              <Text style={styles.dockActionLabel}>Trim In</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dockActionBtn} onPress={handleTrimEnd}>
              <Text style={styles.dockActionIcon}>|▶</Text>
              <Text style={styles.dockActionLabel}>Trim Out</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dockActionBtn} onPress={handleMoveLeft}>
              <Text style={styles.dockActionIcon}>⬅️</Text>
              <Text style={styles.dockActionLabel}>Move L</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dockActionBtn} onPress={handleMoveRight}>
              <Text style={styles.dockActionIcon}>➡️</Text>
              <Text style={styles.dockActionLabel}>Move R</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dockActionBtn} onPress={handleDuplicate}>
              <Text style={styles.dockActionIcon}>📋</Text>
              <Text style={styles.dockActionLabel}>Duplicate</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dockActionBtn} onPress={handleDelete}>
              <Text style={[styles.dockActionIcon, { color: colors.accentCoral }]}>🗑️</Text>
              <Text style={[styles.dockActionLabel, { color: colors.accentCoral }]}>Delete</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          /* LEVEL 1: PROJECT LEVEL PRIMARY DOCK (No clip selected) */
          <ScrollView keyboardShouldPersistTaps="handled" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dockScroll}>
            <TouchableOpacity
              style={styles.dockActionBtn}
              onPress={() => {
                if (activeMediaClip) {
                  handleSelectClip(activeMediaClip.id);
                } else {
                  Alert.alert('Edit Clip', 'Move playhead over a clip to edit.');
                }
              }}
            >
              <Text style={styles.dockActionIcon}>✂️</Text>
              <Text style={styles.dockActionLabel}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dockActionBtn}
              onPress={() => handleAddDemoClip('audio')}
            >
              <Text style={styles.dockActionIcon}>🎵</Text>
              <Text style={styles.dockActionLabel}>Audio</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dockActionBtn}
              onPress={handleAIDetectBeats}
            >
              <Text style={styles.dockActionIcon}>⚡🎵</Text>
              <Text style={styles.dockActionLabel}>AI Beats</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dockActionBtn}
              onPress={() => setSubtitleModalVisible(true)}
            >
              <Text style={styles.dockActionIcon}>🔤</Text>
              <Text style={styles.dockActionLabel}>Text / SRT</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dockActionBtn}
              onPress={() => {
                if (activeMediaClip) {
                  handleSelectClip(activeMediaClip.id);
                  setBlendModeModalVisible(true);
                } else {
                  Alert.alert('Overlay PIP', 'Select a clip to configure picture-in-picture.');
                }
              }}
            >
              <Text style={styles.dockActionIcon}>🖼️</Text>
              <Text style={styles.dockActionLabel}>Overlay PIP</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dockActionBtn}
              onPress={() => setSplitScreenModalVisible(true)}
            >
              <Text style={styles.dockActionIcon}>🪟</Text>
              <Text style={styles.dockActionLabel}>Collage</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dockActionBtn}
              onPress={() => {
                if (activeMediaClip) {
                  handleSelectClip(activeMediaClip.id);
                  setFilterModalVisible(true);
                } else {
                  Alert.alert('Effects', 'Select a video clip to apply visual shaders.');
                }
              }}
            >
              <Text style={styles.dockActionIcon}>✨</Text>
              <Text style={styles.dockActionLabel}>Effects</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dockActionBtn}
              onPress={() => {
                if (activeMediaClip) {
                  handleSelectClip(activeMediaClip.id);
                  setFilterModalVisible(true);
                } else {
                  Alert.alert('Filters', 'Select a video clip to apply 3D LUTs.');
                }
              }}
            >
              <Text style={styles.dockActionIcon}>🎨</Text>
              <Text style={styles.dockActionLabel}>Filters</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dockActionBtn}
              onPress={() => setRatioModalVisible(true)}
            >
              <Text style={styles.dockActionIcon}>📐</Text>
              <Text style={styles.dockActionLabel}>Ratio</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dockActionBtn}
              onPress={() => setFilmoraModalVisible(true)}
            >
              <Text style={styles.dockActionIcon}>🎬✨</Text>
              <Text style={styles.dockActionLabel}>Filmora</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dockActionBtn} onPress={handleImportVideo}>
              <Text style={[styles.dockActionIcon, { color: colors.primary }]}>🖼️</Text>
              <Text style={[styles.dockActionLabel, { color: colors.primary }]}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dockActionBtn}
              onPress={() => handleAddDemoClip('video')}
            >
              <Text style={styles.dockActionIcon}>➕🎬</Text>
              <Text style={styles.dockActionLabel}>+ Scene</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dockActionBtn} onPress={handleSave}>
              <Text style={styles.dockActionIcon}>💾</Text>
              <Text style={styles.dockActionLabel}>Save</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </View>
  )}

      {/* Aspect Ratio Switcher Modal */}
      <Modal
        visible={ratioModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRatioModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Canvas Aspect Ratio 📐</Text>
            <View style={styles.ratioModalGrid}>
              {RATIO_OPTIONS.map((item) => (
                <TouchableOpacity
                  key={item.ratio}
                  style={[
                    styles.ratioModalCard,
                    currentRatio === item.ratio && styles.ratioModalCardActive,
                  ]}
                  onPress={() => handleSelectAspectRatio(item.ratio)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.ratioModalCardLabel,
                      currentRatio === item.ratio && styles.ratioModalCardLabelActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Text style={styles.ratioModalCardSub}>{item.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* AI Auto-Reframe 9:16 Action */}
            <TouchableOpacity
              style={styles.aiReframeRatioBtn}
              onPress={() => {
                setRatioModalVisible(false);
                handleAIAutoReframe();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.aiReframeRatioIcon}>🤖</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.aiReframeRatioTitle}>AI Smart Auto-Reframe (9:16)</Text>
                <Text style={styles.aiReframeRatioSub}>Auto-track subject center for TikTok / Reels</Text>
              </View>
              <View style={styles.aiReframeRatioBadge}>
                <Text style={styles.aiReframeRatioBadgeText}>AUTO</Text>
              </View>
            </TouchableOpacity>

            <Button
              title="Close"
              variant="secondary"
              onPress={() => setRatioModalVisible(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      {selectedClip && (selectedClip.type === 'video' || selectedClip.type === 'image') && (
        <FilterModal
          visible={filterModalVisible}
          colorAdjustments={
            (selectedClip as VideoClip).colorAdjustments || {
              brightness: 0,
              contrast: 1,
              saturation: 1,
              temperature: 0,
            }
          }
          lutFilterId={(selectedClip as any).lutFilterId}
          lutIntensity={(selectedClip as any).lutIntensity}
          visualEffect={(selectedClip as any).visualEffect}
          visualEffectIntensity={(selectedClip as any).visualEffectIntensity}
          onUpdateAdjustments={(adj) => {
            engine.updateColorAdjustments(selectedClip.id, adj);
            setState({ ...engine.getState() });
          }}
          onSelectLut={(lutId, intensity) => {
            engine.setLutFilter(selectedClip.id, lutId, intensity);
            setState({ ...engine.getState() });
          }}
          onSelectVisualEffect={(fxType, intensity) => {
            engine.setVisualEffect(selectedClip.id, fxType, intensity);
            setState({ ...engine.getState() });
          }}
          onClose={() => setFilterModalVisible(false)}
        />
      )}

      {/* Transition Modal */}
      {selectedClip && (selectedClip.type === 'video' || selectedClip.type === 'image') && (
        <TransitionModal
          visible={transitionModalVisible}
          currentTransition={(selectedClip as VideoClip).transitionOut}
          onSelect={(trans) => {
            engine.setTransition(selectedClip.id, 'out', trans);
            setState({ ...engine.getState() });
          }}
          onClose={() => setTransitionModalVisible(false)}
        />
      )}

      {/* Audio Modal */}
      {selectedClip && (selectedClip.type === 'audio' || selectedClip.type === 'video') && (
        <AudioModal
          visible={audioModalVisible}
          clip={selectedClip as AudioClip}
          onUpdate={(updates) => {
            engine.updateAudioProperties(selectedClip.id, updates);
            setState({ ...engine.getState() });
          }}
          onClose={() => setAudioModalVisible(false)}
        />
      )}

      {/* Filmora Studio Modal */}
      <FilmoraStudioModal
        visible={filmoraModalVisible}
        project={state.project}
        onApplyDucking={(duckingOpts) => {
          if (!engine) return;
          const clipList = Object.values(state.project.clips || {});
          for (const clip of clipList) {
            if (clip.type === 'audio') {
              const aClip = clip as AudioClip;
              if (aClip.name.toLowerCase().includes('bgm') || aClip.name.toLowerCase().includes('music')) {
                const duckRatio = duckingOpts.duckingRatio ?? Math.pow(10, (duckingOpts.duckingLevelDb ?? -12) / 20);
                engine.updateAudioProperties(aClip.id, { volume: Math.round(duckRatio * 100) / 100 });
              }
            }
          }
          setState({ ...engine.getState() });
        }}
        onClose={() => setFilmoraModalVisible(false)}
      />

      {/* Subtitles Modal */}
      <SubtitleModal
        visible={subtitleModalVisible}
        playheadUs={state.playheadUs}
        onImportCues={(cues) => {
          const textTrack =
            state.project.tracks.find((t) => t.type === 'text') ||
            state.project.tracks[0];
          if (textTrack) {
            engine.importSubtitles(cues, textTrack.id);
            setState({ ...engine.getState() });
          }
        }}
        onClose={() => setSubtitleModalVisible(false)}
      />

      {/* Speed Curve Modal */}
      {selectedClip && selectedClip.type === 'video' && (
        <SpeedCurveModal
          visible={speedCurveModalVisible}
          currentCurve={(selectedClip as VideoClip).speedCurve}
          onSelect={(curve) => {
            engine.setSpeedCurve(selectedClip.id, curve);
            setState({ ...engine.getState() });
          }}
          onClose={() => setSpeedCurveModalVisible(false)}
        />
      )}

      {/* Blend Mode Modal */}
      {selectedClip && (selectedClip.type === 'video' || selectedClip.type === 'image') && (
        <BlendModeModal
          visible={blendModeModalVisible}
          currentMode={(selectedClip as VideoClip | ImageClip).blendMode || 'normal'}
          onSelect={(mode) => {
            engine.setBlendMode(selectedClip.id, mode);
            setState({ ...engine.getState() });
          }}
          onClose={() => setBlendModeModalVisible(false)}
        />
      )}

      {/* CapCut Split Screen Collage Modal */}
      <SplitScreenModal
        visible={splitScreenModalVisible}
        onApplyLayout={(newProj) => {
          setProject(newProj);
          const initial = createInitialTimelineState(newProj);
          const eng = new TimelineEngine(initial);
          setEngine(eng);
          setState(eng.getState());
          defaultProjectStorage.saveProject(newProj);
        }}
        onClose={() => setSplitScreenModalVisible(false)}
      />

      {/* AI Engine Processing HUD Modal */}
      <Modal visible={isAIProcessing} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.aiLoadingContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.aiLoadingTitle}>NovaCut AI Studio</Text>
            <Text style={styles.aiLoadingSub}>{aiStatusMessage || 'Processing with Python AI engine...'}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textPrimary,
    fontSize: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ratioPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ratioPillText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  exportHeaderBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
  },
  exportHeaderBtnText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  previewContainer: {
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  previewContainerExpanded: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0,
  },
  playerCanvas: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.xs,
    position: 'relative',
    overflow: 'hidden',
  },
  canvasFullscreenToggleBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 10,
  },
  canvasFullscreenToggleIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  canvasTimecodePill: {
    position: 'absolute',
    bottom: 6,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  canvasTimecodeText: {
    color: colors.accentGold,
    fontSize: 11,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  expandedTimelineSection: {
    flex: 1,
  },
  sheetHandleHeader: {
    height: 32,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetHandleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sheetHandleHeaderIcon: {
    fontSize: 12,
  },
  sheetHandleHeaderTitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sheetHandleCenterGrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  sheetHandleGripBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  collapseTimelineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  collapseTimelineBtnIcon: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
  },
  collapseTimelineBtnText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '600',
  },
  collapsedTimelineBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: 6,
  },
  sheetHandleGripWrapper: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  sheetHandleHintText: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  collapsedControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    paddingBottom: 4,
  },
  collapsedTimecodePill: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  collapsedTimecodeText: {
    color: colors.accentGold,
    fontSize: 11,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  collapsedPlaybackGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  collapsedTransportBtn: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsedPlayPauseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandTimelineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  expandTimelineBtnIcon: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
  },
  expandTimelineBtnText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '700',
  },
  transportBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  desktopKeyboardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#18181B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  desktopKeyboardText: {
    fontSize: 11,
    color: '#A1A1AA',
    fontWeight: '500',
  },
  desktopKeyboardKey: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  undoRedoGroup: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  playbackControlsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quickActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  transportBtn: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledTransportBtn: {
    opacity: 0.35,
  },
  transportIcon: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  playPauseCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseIcon: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  keyframeDiamondBtn: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  keyframeDiamondBtnActive: {
    borderColor: colors.accentGold,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  keyframeDiamondIcon: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  keyframeDiamondIconActive: {
    color: colors.accentGold,
  },
  quickSplitBtn: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickSplitIcon: {
    fontSize: 14,
  },
  zoomPill: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  zoomSubBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  zoomSubText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  timelineContainer: {
    flex: 1,
    backgroundColor: colors.timelineBg,
    position: 'relative',
  },
  timelineScrollView: {
    flex: 1,
  },
  timelineScrollContent: {
    position: 'relative',
    minHeight: '100%',
    flexDirection: 'column',
  },
  ruler: {
    height: 26,
    backgroundColor: colors.timelineRuler,
    borderBottomWidth: 1,
    borderBottomColor: colors.timelineGrid,
    position: 'relative',
    flexDirection: 'row',
  },
  rulerHeader: {
    width: TRACK_HEADER_WIDTH,
    height: '100%',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
    zIndex: 3,
  },
  rulerHeaderText: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  rulerMark: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
  },
  rulerText: {
    color: '#8E8E93',
    fontSize: 9,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    position: 'absolute',
    top: 2,
    left: 4,
  },
  rulerTick: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 1,
    height: 9,
    backgroundColor: '#555555',
  },
  rulerSubTick: {
    position: 'absolute',
    bottom: 0,
    width: 1,
    height: 4,
    backgroundColor: '#333333',
  },
  tracksArea: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
  trackRow: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  videoTrackRow: {
    height: 66,
    marginBottom: 8,
  },
  audioTrackRow: {
    height: 48,
    marginBottom: 6,
  },
  textTrackRow: {
    height: 42,
    marginBottom: 6,
  },
  trackLabel: {
    width: TRACK_HEADER_WIDTH,
    height: '100%',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
    zIndex: 2,
    paddingHorizontal: 2,
    gap: 2,
  },
  videoTrackLabel: {
    paddingVertical: 2,
  },
  videoTrackHeaderCol: {
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 2,
  },
  trackCoverBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 4,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    width: 58,
    justifyContent: 'center',
  },
  trackCoverIcon: {
    fontSize: 9,
  },
  trackCoverText: {
    color: '#D1D5DB',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  trackMuteBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 4,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    width: 58,
    justifyContent: 'center',
  },
  trackMuteBtnActive: {
    backgroundColor: 'rgba(244, 63, 94, 0.25)',
    borderWidth: 1,
    borderColor: '#F43F5E',
  },
  trackMuteIcon: {
    fontSize: 9,
  },
  trackMuteText: {
    color: '#D1D5DB',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  trackMuteTextActive: {
    color: '#F43F5E',
  },
  secondaryTrackHeaderCol: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  emptyTrackAddPrompt: {
    position: 'absolute',
    top: 6,
    left: 8,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 1,
  },
  emptyTrackPromptIcon: {
    fontSize: 12,
  },
  emptyTrackPromptText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 11,
    fontWeight: '600',
  },
  trackLabelIcon: {
    fontSize: 14,
  },
  trackLabelText: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  trackContent: {
    flex: 1,
    height: '100%',
    position: 'relative',
  },
  clipBlock: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: borderRadius.xs,
    paddingHorizontal: spacing.xs,
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
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
    borderColor: colors.clipSelected,
    borderWidth: 2,
  },
  clipText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
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
    top: 0,
    bottom: 0,
    width: 12,
    backgroundColor: colors.clipSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trimLeft: {
    left: 0,
    borderTopLeftRadius: borderRadius.xs,
    borderBottomLeftRadius: borderRadius.xs,
  },
  trimRight: {
    right: 0,
    borderTopRightRadius: borderRadius.xs,
    borderBottomRightRadius: borderRadius.xs,
  },
  trimGripText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: 'bold',
  },
  transitionSquareBtn: {
    position: 'absolute',
    top: 20,
    width: 22,
    height: 22,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  transitionSquareIcon: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '900',
  },
  playheadNeedle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    height: '100%',
    width: 24,
    marginLeft: -12,
    zIndex: 100,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  playheadHead: {
    width: 14,
    height: 14,
    backgroundColor: colors.accentGold,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
    marginTop: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 6,
  },
  playheadLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.accentGold,
    shadowColor: '#000000',
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 4,
  },
  dockContainer: {
    height: 68,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dockScroll: {
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  dockActionBtn: {
    width: 58,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockActionBtnPrimary: {
    width: 58,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
    marginRight: spacing.xs,
  },
  dockActionIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  dockActionLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '500',
  },
  dockActionLabelActive: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
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
  ratioModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  ratioModalCard: {
    width: '47%',
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ratioModalCardActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0,229,255,0.1)',
  },
  ratioModalCardLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  ratioModalCardLabelActive: {
    color: colors.primary,
  },
  ratioModalCardSub: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  aiReframeRatioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  aiReframeRatioIcon: {
    fontSize: 22,
  },
  aiReframeRatioTitle: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  aiReframeRatioSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  aiReframeRatioBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
  },
  aiReframeRatioBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
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
});
