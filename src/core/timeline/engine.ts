import { Project } from '../models/project';
import {
  Clip,
  ColorAdjustments,
  Transition,
  TextOverlay,
  Transform,
  BlendMode,
  KeyframeTrack,
  SpeedCurve,
  Keyframe,
  VideoClip,
  ImageClip,
} from '../models/clip';
import { addOrUpdateKeyframe, removeKeyframe as removeClipKeyframe } from './keyframes';
import { TimelineTrack } from '../models/timeline';
import { EditOperation } from '../models/operation';
import {
  trimClipStart,
  trimClipEnd,
  splitClip,
  deleteClip,
  duplicateClip,
  reorderClips,
  moveClip,
} from './operations';
import {
  updateClipColorAdjustments,
  setClipTransition,
  updateClipTransform,
} from './effects';
import { SubtitleCue, cuesToTextOverlays } from './subtitles';
import { calculateProjectDurationUs } from './calculator';

export interface TimelineState {
  project: Project;
  clips: Record<string, Clip>;
  playheadUs: number;
  selectedTrackId: string | null;
  selectedClipId: string | null;
  undoStack: EditOperation[];
  redoStack: EditOperation[];
  isDirty: boolean;
}

export function createInitialTimelineState(project: Project): TimelineState {
  return {
    project,
    clips: project.clips ? { ...project.clips } : {},
    playheadUs: 0,
    selectedTrackId: project.tracks[0]?.id || null,
    selectedClipId: null,
    undoStack: [],
    redoStack: [],
    isDirty: false,
  };
}

/**
 * Timeline Engine managing editing operations, history (Undo/Redo), and project state updates.
 */
export class TimelineEngine {
  private state: TimelineState;
  private maxHistorySize: number;

  constructor(initialState: TimelineState, maxHistorySize: number = 50) {
    this.state = initialState;
    this.maxHistorySize = maxHistorySize;
  }

  public getState(): TimelineState {
    return this.state;
  }

  public setPlayhead(timeUs: number): void {
    const duration = calculateProjectDurationUs(this.state.clips);
    this.state = {
      ...this.state,
      playheadUs: Math.max(0, Math.min(timeUs, duration)),
    };
  }

  public selectClip(clipId: string | null): void {
    const trackId = clipId ? this.state.clips[clipId]?.trackId || null : null;
    this.state = {
      ...this.state,
      selectedClipId: clipId,
      selectedTrackId: trackId || this.state.selectedTrackId,
    };
  }

  public addClip(trackId: string, clip: Clip): void {
    const track = this.state.project.tracks.find((t) => t.id === trackId);
    if (!track) throw new Error(`Track ${trackId} not found`);

    const updatedTrack: TimelineTrack = {
      ...track,
      clips: [...track.clips, clip.id],
    };

    const updatedTracks = this.state.project.tracks.map((t) =>
      t.id === trackId ? updatedTrack : t
    );

    const updatedClips = {
      ...this.state.clips,
      [clip.id]: clip,
    };

    const newDuration = calculateProjectDurationUs(updatedClips);

    const op: EditOperation = {
      id: `op_${Date.now()}`,
      type: 'ADD_CLIP',
      description: `Add clip ${clip.name}`,
      timestamp: Date.now(),
      payload: { clip, trackId },
      inversePayload: { clipId: clip.id, trackId },
    };

    this.pushOperation(op, {
      ...this.state,
      project: {
        ...this.state.project,
        metadata: {
          ...this.state.project.metadata,
          durationUs: newDuration,
          updatedAt: Date.now(),
        },
        tracks: updatedTracks,
      },
      clips: updatedClips,
      selectedClipId: clip.id,
      selectedTrackId: trackId,
      isDirty: true,
    });
  }

  public trimStart(clipId: string, newStartUs: number): void {
    const clip = this.state.clips[clipId];
    if (!clip) return;
    const track = this.state.project.tracks.find((t) => t.id === clip.trackId);
    if (!track) return;

    const previousClip = { ...clip };
    const res = trimClipStart(track, this.state.clips, clipId, newStartUs);

    const op: EditOperation = {
      id: `op_${Date.now()}`,
      type: 'TRIM_CLIP_START',
      description: `Trim start of ${clip.name}`,
      timestamp: Date.now(),
      payload: { clipId, newStartUs },
      inversePayload: { clipId, previousClip },
    };

    this.pushOperation(op, {
      ...this.state,
      clips: res.updatedClips,
      isDirty: true,
    });
  }

  public trimEnd(clipId: string, newEndUs: number): void {
    const clip = this.state.clips[clipId];
    if (!clip) return;
    const track = this.state.project.tracks.find((t) => t.id === clip.trackId);
    if (!track) return;

    const previousClip = { ...clip };
    const res = trimClipEnd(track, this.state.clips, clipId, newEndUs);

    const op: EditOperation = {
      id: `op_${Date.now()}`,
      type: 'TRIM_CLIP_END',
      description: `Trim end of ${clip.name}`,
      timestamp: Date.now(),
      payload: { clipId, newEndUs },
      inversePayload: { clipId, previousClip },
    };

    this.pushOperation(op, {
      ...this.state,
      clips: res.updatedClips,
      isDirty: true,
    });
  }

  public split(clipId: string, splitTimeUs: number): string | undefined {
    const clip = this.state.clips[clipId];
    if (!clip) return undefined;
    const track = this.state.project.tracks.find((t) => t.id === clip.trackId);
    if (!track) return undefined;

    const originalClip = { ...clip };
    const originalTrack = { ...track };
    const res = splitClip(track, this.state.clips, clipId, splitTimeUs);

    const updatedTracks = this.state.project.tracks.map((t) =>
      t.id === track.id ? res.updatedTrack : t
    );

    const op: EditOperation = {
      id: `op_${Date.now()}`,
      type: 'SPLIT_CLIP',
      description: `Split clip ${clip.name}`,
      timestamp: Date.now(),
      payload: { clipId, splitTimeUs, newClipId: res.newClipId },
      inversePayload: { originalClip, originalTrack, newClipId: res.newClipId },
    };

    this.pushOperation(op, {
      ...this.state,
      project: {
        ...this.state.project,
        tracks: updatedTracks,
      },
      clips: res.updatedClips,
      selectedClipId: res.newClipId || clipId,
      isDirty: true,
    });

    return res.newClipId;
  }

  public delete(clipId: string): void {
    const clip = this.state.clips[clipId];
    if (!clip) return;
    const track = this.state.project.tracks.find((t) => t.id === clip.trackId);
    if (!track) return;

    const originalClip = { ...clip };
    const originalTrack = { ...track };
    const res = deleteClip(track, this.state.clips, clipId);

    const updatedTracks = this.state.project.tracks.map((t) =>
      t.id === track.id ? res.updatedTrack : t
    );

    const op: EditOperation = {
      id: `op_${Date.now()}`,
      type: 'DELETE_CLIP',
      description: `Delete clip ${clip.name}`,
      timestamp: Date.now(),
      payload: { clipId },
      inversePayload: { originalClip, originalTrack },
    };

    this.pushOperation(op, {
      ...this.state,
      project: {
        ...this.state.project,
        tracks: updatedTracks,
      },
      clips: res.updatedClips,
      selectedClipId: null,
      isDirty: true,
    });
  }

  public duplicate(clipId: string): string | undefined {
    const clip = this.state.clips[clipId];
    if (!clip) return undefined;
    const track = this.state.project.tracks.find((t) => t.id === clip.trackId);
    if (!track) return undefined;

    const res = duplicateClip(track, this.state.clips, clipId);

    const updatedTracks = this.state.project.tracks.map((t) =>
      t.id === track.id ? res.updatedTrack : t
    );

    const op: EditOperation = {
      id: `op_${Date.now()}`,
      type: 'DUPLICATE_CLIP',
      description: `Duplicate clip ${clip.name}`,
      timestamp: Date.now(),
      payload: { clipId, newClipId: res.newClipId },
      inversePayload: { newClipId: res.newClipId, trackId: track.id },
    };

    this.pushOperation(op, {
      ...this.state,
      project: {
        ...this.state.project,
        tracks: updatedTracks,
      },
      clips: res.updatedClips,
      selectedClipId: res.newClipId || null,
      isDirty: true,
    });

    return res.newClipId;
  }

  public reorderClip(clipId: string, targetIndex: number): void {
    const clip = this.state.clips[clipId];
    if (!clip) return;
    const track = this.state.project.tracks.find((t) => t.id === clip.trackId);
    if (!track) return;

    const originalTrack = { ...track };
    const originalClips = { ...this.state.clips };

    const res = reorderClips(track, this.state.clips, clipId, targetIndex);
    const updatedTracks = this.state.project.tracks.map((t) =>
      t.id === track.id ? res.updatedTrack : t
    );

    const op: EditOperation = {
      id: `op_${Date.now()}`,
      type: 'REORDER_CLIPS',
      description: `Reorder clip ${clip.name}`,
      timestamp: Date.now(),
      payload: { clipId, targetIndex },
      inversePayload: { originalTrack, originalClips },
    };

    this.pushOperation(op, {
      ...this.state,
      project: {
        ...this.state.project,
        tracks: updatedTracks,
      },
      clips: res.updatedClips,
      isDirty: true,
    });
  }

  public moveClip(clipId: string, newStartUs: number): void {
    const clip = this.state.clips[clipId];
    if (!clip) return;
    const previousClip = { ...clip };
    const updatedClips = moveClip(this.state.clips, clipId, newStartUs);

    const op: EditOperation = {
      id: `op_${Date.now()}`,
      type: 'UPDATE_CLIP_TRANSFORM',
      description: `Move clip ${clip.name}`,
      timestamp: Date.now(),
      payload: { clipId, newStartUs },
      inversePayload: { clipId, previousClip },
    };

    this.pushOperation(op, {
      ...this.state,
      clips: updatedClips,
      isDirty: true,
    });
  }

  public updateColorAdjustments(
    clipId: string,
    adjustments: Partial<ColorAdjustments>
  ): void {
    const clip = this.state.clips[clipId];
    if (!clip) return;
    const previousClip = { ...clip };
    const updatedClips = updateClipColorAdjustments(this.state.clips, clipId, adjustments);

    const op: EditOperation = {
      id: `op_${Date.now()}`,
      type: 'UPDATE_CLIP_COLOR',
      description: `Update color adjustments on ${clip.name}`,
      timestamp: Date.now(),
      payload: { clipId, adjustments },
      inversePayload: { clipId, previousClip },
    };

    this.pushOperation(op, {
      ...this.state,
      clips: updatedClips,
      isDirty: true,
    });
  }

  public setTransition(
    clipId: string,
    position: 'in' | 'out',
    transition: Transition | undefined
  ): void {
    const clip = this.state.clips[clipId];
    if (!clip) return;
    const previousClip = { ...clip };
    const updatedClips = setClipTransition(this.state.clips, clipId, position, transition);

    const op: EditOperation = {
      id: `op_${Date.now()}`,
      type: 'UPDATE_CLIP_TRANSITION',
      description: `Set transition on ${clip.name}`,
      timestamp: Date.now(),
      payload: { clipId, position, transition },
      inversePayload: { clipId, previousClip },
    };

    this.pushOperation(op, {
      ...this.state,
      clips: updatedClips,
      isDirty: true,
    });
  }

  public updateAudioProperties(
    clipId: string,
    updates: { volume?: number; fadeInUs?: number; fadeOutUs?: number }
  ): void {
    const clip = this.state.clips[clipId];
    if (!clip) return;
    const previousClip = { ...clip };

    const updatedClip = { ...clip } as any;
    if (updates.volume !== undefined && 'volume' in updatedClip) {
      updatedClip.volume = Math.max(0, Math.min(2.0, updates.volume));
    }
    if (updates.fadeInUs !== undefined && 'fadeInDurationUs' in updatedClip) {
      updatedClip.fadeInDurationUs = Math.max(0, updates.fadeInUs);
    }
    if (updates.fadeOutUs !== undefined && 'fadeOutDurationUs' in updatedClip) {
      updatedClip.fadeOutDurationUs = Math.max(0, updates.fadeOutUs);
    }

    const updatedClips = {
      ...this.state.clips,
      [clipId]: updatedClip as Clip,
    };

    const op: EditOperation = {
      id: `op_${Date.now()}`,
      type: 'UPDATE_CLIP_AUDIO',
      description: `Update audio properties on ${clip.name}`,
      timestamp: Date.now(),
      payload: { clipId, updates },
      inversePayload: { clipId, previousClip },
    };

    this.pushOperation(op, {
      ...this.state,
      clips: updatedClips,
      isDirty: true,
    });
  }

  public updateTransform(clipId: string, transform: Partial<Transform>): void {
    const clip = this.state.clips[clipId];
    if (!clip) return;
    const previousClip = { ...clip };
    const updatedClips = updateClipTransform(this.state.clips, clipId, transform);

    const op: EditOperation = {
      id: `op_${Date.now()}`,
      type: 'UPDATE_CLIP_TRANSFORM',
      description: `Update transform on ${clip.name}`,
      timestamp: Date.now(),
      payload: { clipId, transform },
      inversePayload: { clipId, previousClip },
    };

    this.pushOperation(op, {
      ...this.state,
      clips: updatedClips,
      isDirty: true,
    });
  }

  public setLutFilter(clipId: string, lutFilterId: string, lutIntensity = 1.0): void {
    const clip = this.state.clips[clipId];
    if (!clip || (clip.type !== 'video' && clip.type !== 'image')) return;
    const previousClip = { ...clip };
    const updatedClip = {
      ...clip,
      lutFilterId,
      lutIntensity,
    };
    const updatedClips = {
      ...this.state.clips,
      [clipId]: updatedClip as Clip,
    };
    const op: EditOperation = {
      id: `op_${Date.now()}`,
      type: 'SET_LUT_FILTER',
      description: `Set LUT filter on ${clip.name}`,
      timestamp: Date.now(),
      payload: { clipId, lutFilterId, lutIntensity },
      inversePayload: { clipId, previousClip },
    };
    this.pushOperation(op, {
      ...this.state,
      clips: updatedClips,
      isDirty: true,
    });
  }

  public setVisualEffect(clipId: string, visualEffect: string, visualEffectIntensity = 0.7): void {
    const clip = this.state.clips[clipId];
    if (!clip || (clip.type !== 'video' && clip.type !== 'image')) return;
    const previousClip = { ...clip };
    const updatedClip = {
      ...clip,
      visualEffect,
      visualEffectIntensity,
    };
    const updatedClips = {
      ...this.state.clips,
      [clipId]: updatedClip as Clip,
    };
    const op: EditOperation = {
      id: `op_${Date.now()}`,
      type: 'SET_VISUAL_EFFECT',
      description: `Set visual effect on ${clip.name}`,
      timestamp: Date.now(),
      payload: { clipId, visualEffect, visualEffectIntensity },
      inversePayload: { clipId, previousClip },
    };
    this.pushOperation(op, {
      ...this.state,
      clips: updatedClips,
      isDirty: true,
    });
  }

  public importSubtitles(cues: SubtitleCue[], trackId: string): TextOverlay[] {
    const track = this.state.project.tracks.find((t) => t.id === trackId);
    if (!track) return [];

    const newClips = cuesToTextOverlays(cues, trackId);
    if (newClips.length === 0) return [];

    const updatedTrack: TimelineTrack = {
      ...track,
      clips: [...track.clips, ...newClips.map((c) => c.id)],
    };

    const updatedTracks = this.state.project.tracks.map((t) =>
      t.id === trackId ? updatedTrack : t
    );

    const updatedClips = { ...this.state.clips };
    for (const c of newClips) {
      updatedClips[c.id] = c;
    }

    const newDuration = calculateProjectDurationUs(updatedClips);

    const op: EditOperation = {
      id: `op_${Date.now()}`,
      type: 'IMPORT_SUBTITLES',
      description: `Import ${newClips.length} subtitle cues`,
      timestamp: Date.now(),
      payload: { newClips, trackId },
      inversePayload: { addedClipIds: newClips.map((c) => c.id), trackId },
    };

    this.pushOperation(op, {
      ...this.state,
      project: {
        ...this.state.project,
        metadata: {
          ...this.state.project.metadata,
          durationUs: newDuration,
          updatedAt: Date.now(),
        },
        tracks: updatedTracks,
      },
      clips: updatedClips,
      isDirty: true,
    });

    return newClips;
  }

  public addKeyframe(
    clipId: string,
    property: keyof KeyframeTrack,
    timeUs: number,
    value: number,
    easing: Keyframe['easing'] = 'easeInOut'
  ): void {
    const clip = this.state.clips[clipId];
    if (!clip || (clip.type !== 'video' && clip.type !== 'image')) return;
    const previousClip = { ...clip };

    const mediaClip = clip as VideoClip | ImageClip;
    const updatedKeyframes = addOrUpdateKeyframe(mediaClip.keyframes, property, timeUs, value, easing);

    const updatedClips = {
      ...this.state.clips,
      [clipId]: {
        ...mediaClip,
        keyframes: updatedKeyframes,
      } as Clip,
    };

    const op: EditOperation = {
      id: `op_${Date.now()}`,
      type: 'UPDATE_CLIP_KEYFRAME',
      description: `Add keyframe to ${clip.name}`,
      timestamp: Date.now(),
      payload: { clipId, property, timeUs, value, easing },
      inversePayload: { clipId, previousClip },
    };

    this.pushOperation(op, {
      ...this.state,
      clips: updatedClips,
      isDirty: true,
    });
  }

  public removeKeyframe(
    clipId: string,
    property: keyof KeyframeTrack,
    timeUs: number
  ): void {
    const clip = this.state.clips[clipId];
    if (!clip || (clip.type !== 'video' && clip.type !== 'image')) return;
    const previousClip = { ...clip };

    const mediaClip = clip as VideoClip | ImageClip;
    const updatedKeyframes = removeClipKeyframe(mediaClip.keyframes, property, timeUs);

    const updatedClips = {
      ...this.state.clips,
      [clipId]: {
        ...mediaClip,
        keyframes: updatedKeyframes,
      } as Clip,
    };

    const op: EditOperation = {
      id: `op_${Date.now()}`,
      type: 'UPDATE_CLIP_KEYFRAME',
      description: `Remove keyframe from ${clip.name}`,
      timestamp: Date.now(),
      payload: { clipId, property, timeUs, isDelete: true },
      inversePayload: { clipId, previousClip },
    };

    this.pushOperation(op, {
      ...this.state,
      clips: updatedClips,
      isDirty: true,
    });
  }

  public setKeyframeTracks(clipId: string, tracks: KeyframeTrack): void {
    const clip = this.state.clips[clipId];
    if (!clip || (clip.type !== 'video' && clip.type !== 'image')) return;
    const previousClip = { ...clip };

    const mediaClip = clip as VideoClip | ImageClip;
    const updatedKeyframes: KeyframeTrack = {
      ...(mediaClip.keyframes || {}),
      ...tracks,
    };

    const updatedClips = {
      ...this.state.clips,
      [clipId]: {
        ...mediaClip,
        keyframes: updatedKeyframes,
      } as Clip,
    };

    const op: EditOperation = {
      id: `op_${Date.now()}`,
      type: 'UPDATE_CLIP_KEYFRAME',
      description: `Set keyframe tracks on ${clip.name}`,
      timestamp: Date.now(),
      payload: { clipId, tracks },
      inversePayload: { clipId, previousClip },
    };

    this.pushOperation(op, {
      ...this.state,
      clips: updatedClips,
      isDirty: true,
    });
  }

  public setSpeedCurve(clipId: string, curve: SpeedCurve | undefined): void {
    const clip = this.state.clips[clipId];
    if (!clip || clip.type !== 'video') return;
    const previousClip = { ...clip };

    const updatedClips = {
      ...this.state.clips,
      [clipId]: {
        ...clip,
        speedCurve: curve,
      } as Clip,
    };

    const op: EditOperation = {
      id: `op_${Date.now()}`,
      type: 'UPDATE_SPEED_CURVE',
      description: `Set speed curve on ${clip.name}`,
      timestamp: Date.now(),
      payload: { clipId, curve },
      inversePayload: { clipId, previousClip },
    };

    this.pushOperation(op, {
      ...this.state,
      clips: updatedClips,
      isDirty: true,
    });
  }

  public setBlendMode(clipId: string, blendMode: BlendMode): void {
    const clip = this.state.clips[clipId];
    if (!clip || (clip.type !== 'video' && clip.type !== 'image')) return;
    const previousClip = { ...clip };

    const updatedClips = {
      ...this.state.clips,
      [clipId]: {
        ...clip,
        blendMode,
      } as Clip,
    };

    const op: EditOperation = {
      id: `op_${Date.now()}`,
      type: 'UPDATE_BLEND_MODE',
      description: `Set blend mode to ${blendMode} on ${clip.name}`,
      timestamp: Date.now(),
      payload: { clipId, blendMode },
      inversePayload: { clipId, previousClip },
    };

    this.pushOperation(op, {
      ...this.state,
      clips: updatedClips,
      isDirty: true,
    });
  }

  public canUndo(): boolean {
    return this.state.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.state.redoStack.length > 0;
  }

  public undo(): void {
    if (!this.canUndo()) return;
    const op = this.state.undoStack[this.state.undoStack.length - 1];
    const newUndoStack = this.state.undoStack.slice(0, -1);

    // Apply inverse payload
    let nextClips = { ...this.state.clips };
    let nextTracks = [...this.state.project.tracks];

    switch (op.type) {
      case 'ADD_CLIP': {
        const { clipId, trackId } = op.inversePayload;
        delete nextClips[clipId];
        nextTracks = nextTracks.map((t) =>
          t.id === trackId ? { ...t, clips: t.clips.filter((id) => id !== clipId) } : t
        );
        break;
      }
      case 'TRIM_CLIP_START':
      case 'TRIM_CLIP_END': {
        const { clipId, previousClip } = op.inversePayload;
        nextClips[clipId] = previousClip;
        break;
      }
      case 'SPLIT_CLIP': {
        const { originalClip, originalTrack, newClipId } = op.inversePayload;
        delete nextClips[newClipId];
        nextClips[originalClip.id] = originalClip;
        nextTracks = nextTracks.map((t) => (t.id === originalTrack.id ? originalTrack : t));
        break;
      }
      case 'DELETE_CLIP': {
        const { originalClip, originalTrack } = op.inversePayload;
        nextClips[originalClip.id] = originalClip;
        nextTracks = nextTracks.map((t) => (t.id === originalTrack.id ? originalTrack : t));
        break;
      }
      case 'DUPLICATE_CLIP': {
        const { newClipId, trackId } = op.inversePayload;
        delete nextClips[newClipId];
        nextTracks = nextTracks.map((t) =>
          t.id === trackId ? { ...t, clips: t.clips.filter((id) => id !== newClipId) } : t
        );
        break;
      }
      case 'REORDER_CLIPS': {
        const { originalTrack, originalClips } = op.inversePayload;
        nextClips = originalClips;
        nextTracks = nextTracks.map((t) => (t.id === originalTrack.id ? originalTrack : t));
        break;
      }
      case 'UPDATE_CLIP_COLOR':
      case 'UPDATE_CLIP_TRANSITION':
      case 'UPDATE_CLIP_AUDIO':
      case 'UPDATE_CLIP_TRANSFORM':
      case 'UPDATE_CLIP_KEYFRAME':
      case 'UPDATE_SPEED_CURVE':
      case 'UPDATE_BLEND_MODE':
      case 'SET_LUT_FILTER':
      case 'SET_VISUAL_EFFECT': {
        const { clipId, previousClip } = op.inversePayload;
        nextClips[clipId] = previousClip;
        break;
      }
      case 'IMPORT_SUBTITLES': {
        const { addedClipIds, trackId } = op.inversePayload;
        for (const cid of addedClipIds) {
          delete nextClips[cid];
        }
        nextTracks = nextTracks.map((t) =>
          t.id === trackId
            ? { ...t, clips: t.clips.filter((id) => !addedClipIds.includes(id)) }
            : t
        );
        break;
      }
    }

    this.state = {
      ...this.state,
      project: {
        ...this.state.project,
        tracks: nextTracks,
      },
      clips: nextClips,
      undoStack: newUndoStack,
      redoStack: [...this.state.redoStack, op],
      isDirty: true,
    };
  }

  public redo(): void {
    if (!this.canRedo()) return;
    const op = this.state.redoStack[this.state.redoStack.length - 1];
    const newRedoStack = this.state.redoStack.slice(0, -1);

    // Re-apply operation payload
    let nextClips = { ...this.state.clips };
    let nextTracks = [...this.state.project.tracks];

    switch (op.type) {
      case 'ADD_CLIP': {
        const { clip, trackId } = op.payload;
        nextClips[clip.id] = clip;
        nextTracks = nextTracks.map((t) =>
          t.id === trackId ? { ...t, clips: [...t.clips, clip.id] } : t
        );
        break;
      }
      case 'TRIM_CLIP_START': {
        const { clipId, newStartUs } = op.payload;
        const track = nextTracks.find((t) => t.id === nextClips[clipId]?.trackId);
        if (track) {
          const res = trimClipStart(track, nextClips, clipId, newStartUs);
          nextClips = res.updatedClips;
        }
        break;
      }
      case 'TRIM_CLIP_END': {
        const { clipId, newEndUs } = op.payload;
        const track = nextTracks.find((t) => t.id === nextClips[clipId]?.trackId);
        if (track) {
          const res = trimClipEnd(track, nextClips, clipId, newEndUs);
          nextClips = res.updatedClips;
        }
        break;
      }
      case 'SPLIT_CLIP': {
        const { clipId, splitTimeUs } = op.payload;
        const track = nextTracks.find((t) => t.id === nextClips[clipId]?.trackId);
        if (track) {
          const res = splitClip(track, nextClips, clipId, splitTimeUs);
          nextClips = res.updatedClips;
          nextTracks = nextTracks.map((t) => (t.id === track.id ? res.updatedTrack : t));
        }
        break;
      }
      case 'DELETE_CLIP': {
        const { clipId } = op.payload;
        const track = nextTracks.find((t) => t.id === nextClips[clipId]?.trackId);
        if (track) {
          const res = deleteClip(track, nextClips, clipId);
          nextClips = res.updatedClips;
          nextTracks = nextTracks.map((t) => (t.id === track.id ? res.updatedTrack : t));
        }
        break;
      }
      case 'DUPLICATE_CLIP': {
        const { clipId } = op.payload;
        const track = nextTracks.find((t) => t.id === nextClips[clipId]?.trackId);
        if (track) {
          const res = duplicateClip(track, nextClips, clipId);
          nextClips = res.updatedClips;
          nextTracks = nextTracks.map((t) => (t.id === track.id ? res.updatedTrack : t));
        }
        break;
      }
      case 'REORDER_CLIPS': {
        const { clipId, targetIndex } = op.payload;
        const track = nextTracks.find((t) => t.id === nextClips[clipId]?.trackId);
        if (track) {
          const res = reorderClips(track, nextClips, clipId, targetIndex);
          nextClips = res.updatedClips;
          nextTracks = nextTracks.map((t) => (t.id === track.id ? res.updatedTrack : t));
        }
        break;
      }
      case 'UPDATE_CLIP_TRANSFORM': {
        const { clipId, newStartUs, transform } = op.payload;
        if (newStartUs !== undefined) {
          nextClips = moveClip(nextClips, clipId, newStartUs);
        } else if (transform) {
          nextClips = updateClipTransform(nextClips, clipId, transform);
        }
        break;
      }
      case 'UPDATE_CLIP_COLOR': {
        const { clipId, adjustments } = op.payload;
        nextClips = updateClipColorAdjustments(nextClips, clipId, adjustments);
        break;
      }
      case 'UPDATE_CLIP_TRANSITION': {
        const { clipId, position, transition } = op.payload;
        nextClips = setClipTransition(nextClips, clipId, position, transition);
        break;
      }
      case 'UPDATE_CLIP_AUDIO': {
        const { clipId, updates } = op.payload;
        if (nextClips[clipId]) {
          const clip = { ...nextClips[clipId] } as any;
          if (updates.volume !== undefined && 'volume' in clip) clip.volume = updates.volume;
          if (updates.fadeInUs !== undefined && 'fadeInDurationUs' in clip) clip.fadeInDurationUs = updates.fadeInUs;
          if (updates.fadeOutUs !== undefined && 'fadeOutDurationUs' in clip) clip.fadeOutDurationUs = updates.fadeOutUs;
          nextClips[clipId] = clip;
        }
        break;
      }
      case 'IMPORT_SUBTITLES': {
        const { newClips, trackId } = op.payload;
        for (const c of newClips) {
          nextClips[c.id] = c;
        }
        nextTracks = nextTracks.map((t) =>
          t.id === trackId
            ? { ...t, clips: [...t.clips, ...newClips.map((nc: any) => nc.id)] }
            : t
        );
        break;
      }
      case 'UPDATE_CLIP_KEYFRAME': {
        const { clipId, property, timeUs, value, easing, isDelete, tracks } = op.payload;
        const clip = nextClips[clipId] as VideoClip | ImageClip;
        if (clip) {
          if (tracks) {
            nextClips[clipId] = {
              ...clip,
              keyframes: { ...(clip.keyframes || {}), ...tracks },
            } as Clip;
          } else {
            const kf = isDelete
              ? removeClipKeyframe(clip.keyframes, property, timeUs)
              : addOrUpdateKeyframe(clip.keyframes, property, timeUs, value, easing);
            nextClips[clipId] = { ...clip, keyframes: kf } as Clip;
          }
        }
        break;
      }
      case 'UPDATE_SPEED_CURVE': {
        const { clipId, curve } = op.payload;
        const clip = nextClips[clipId] as VideoClip;
        if (clip) {
          nextClips[clipId] = { ...clip, speedCurve: curve } as Clip;
        }
        break;
      }
      case 'UPDATE_BLEND_MODE': {
        const { clipId, blendMode } = op.payload;
        const clip = nextClips[clipId] as VideoClip | ImageClip;
        if (clip) {
          nextClips[clipId] = { ...clip, blendMode } as Clip;
        }
        break;
      }
      case 'SET_LUT_FILTER': {
        const { clipId, lutFilterId, lutIntensity } = op.payload;
        const clip = nextClips[clipId] as VideoClip | ImageClip;
        if (clip) {
          nextClips[clipId] = { ...clip, lutFilterId, lutIntensity } as Clip;
        }
        break;
      }
      case 'SET_VISUAL_EFFECT': {
        const { clipId, visualEffect, visualEffectIntensity } = op.payload;
        const clip = nextClips[clipId] as VideoClip | ImageClip;
        if (clip) {
          nextClips[clipId] = { ...clip, visualEffect, visualEffectIntensity } as Clip;
        }
        break;
      }
    }

    this.state = {
      ...this.state,
      project: {
        ...this.state.project,
        tracks: nextTracks,
      },
      clips: nextClips,
      undoStack: [...this.state.undoStack, op],
      redoStack: newRedoStack,
      isDirty: true,
    };
  }

  private pushOperation(op: EditOperation, nextState: TimelineState): void {
    const updatedUndo = [...nextState.undoStack, op].slice(-this.maxHistorySize);
    this.state = {
      ...nextState,
      undoStack: updatedUndo,
      redoStack: [], // clear redo stack on new action
    };
  }
}
