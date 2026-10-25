/**
 * Wondershare Filmora (.wfp / .wesproj) Native Project Data Model
 * Clean-room reverse-engineered from Wondershare Filmora architecture and .wfp archive specifications.
 *
 * Microsecond integer timebase: 1 second = 1,000,000 µs (matching NovaCut core engine).
 * Tracks: trackType 1 = Video, trackType 2 = Audio, trackType 3 = Text/Overlay.
 */

export interface FilmoraFrameRate {
  num: number;
  den: number;
}

export interface FilmoraProjectInfo {
  project_file_name: string;
  timeline_mediaId: string;
  project_timeline_duration: number; // in microseconds (µs)
  project_sample_rate: number;
  version?: string;
  creator?: string;
}

export interface FilmoraResource {
  sourceUuid: string;
  filename: string; // file:/ URI or absolute path
  videoStreamCount: number;
  audioStreamCount: number;
  width?: number;
  height?: number;
  duration?: number; // in microseconds (µs)
  fileSize?: number;
}

export interface FilmoraFxParam {
  unValue: string | number | boolean;
  type?: string;
}

export interface FilmoraEffectParam {
  name: string;
  fxParam: FilmoraFxParam;
}

export interface FilmoraEffect {
  id: string; // e.g. "video/effect/transform", "audio/effect/volume", "video/effect/crop-pan-zoom"
  name?: string;
  paramList: FilmoraEffectParam[];
}

export interface FilmoraEffectChain {
  effectList: FilmoraEffect[];
}

export interface FilmoraSpeedKeyframe {
  _time: number;
  _value: number;
}

export interface FilmoraSpeedParam {
  keyframeSets?: FilmoraSpeedKeyframe[];
  curveType?: string;
}

export interface FilmoraSpeed {
  reverse?: boolean;
  speedRatio?: number;
  speedParam?: FilmoraSpeedParam | string;
}

export interface FilmoraKeyframeItem {
  timeUs: number;
  value: number;
}

export interface FilmoraAudioDuckingFrame {
  enabled: boolean;
  duckingThresholdDb: number; // e.g. -12 dB
  attackDurationUs: number;   // e.g. 200,000 µs (0.2s)
  releaseDurationUs: number;  // e.g. 350,000 µs (0.35s)
  duckingRatio: number;       // 0.0 to 1.0 (default 0.5 = -6dB, 0.25 = -12dB)
  targetTrackUuids?: string[];
}

export interface FilmoraClip {
  thisUId: string;
  sourceUuid: string;
  filename: string;
  type: number; // 0 = Video, 1 = Image, 2 = Audio, 3 = Title/Text
  streamId: number;
  tlBegin: number; // Timeline start offset in microseconds (µs)
  tlEnd: number;   // Timeline end offset in microseconds (µs)
  inPoint: number; // Source start trim point in microseconds (µs)
  outPoint: number;// Source end trim point in microseconds (µs)
  effectChainList?: FilmoraEffectChain[];
  speed?: FilmoraSpeed;
  volumeKeyframe?: FilmoraKeyframeItem[];
  audioDuckingframe?: FilmoraAudioDuckingFrame;
  stabilization?: {
    status: number;
  };
  userData?: Array<{
    key: string;
    value: string;
  }>;
}

export interface FilmoraTrack {
  uuid: string;
  trackType: number; // 1 = Video, 2 = Audio, 3 = Overlay/Text
  trackTag?: number;
  name?: string;
  isMuted?: boolean;
  isLocked?: boolean;
  clipList: FilmoraClip[];
}

export interface FilmoraTimelineInfo {
  resolutionWidth: number;
  resolutionHeight: number;
  frameRate: FilmoraFrameRate;
  sampleRate: number;
  resources: FilmoraResource[];
  trackInfos: FilmoraTrack[];
}

export interface FilmoraTimelineRoot {
  timelineInfos: FilmoraTimelineInfo[];
}

export interface FilmoraProjectPackage {
  projectInfo: FilmoraProjectInfo;
  timelineRoot: FilmoraTimelineRoot;
}

