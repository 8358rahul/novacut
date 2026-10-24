import { TextOverlay, DEFAULT_TRANSFORM } from '../models/clip';
import {
  formatTimecode,
  MICROS_PER_SECOND,
  secondsToMicros,
} from '../models/timeline';

export interface SubtitleCue {
  index: number;
  startUs: number;
  endUs: number;
  text: string;
}

/**
 * Parses timestamp string "HH:MM:SS,mmm" or "HH:MM:SS.mmm" into microseconds.
 */
export function parseSrtTimestampToMicros(timestamp: string): number {
  const normalized = timestamp.trim().replace(',', '.');
  const parts = normalized.split(':');
  if (parts.length < 3) return 0;

  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  const seconds = parseFloat(parts[2]) || 0;

  return Math.round((hours * 3600 + minutes * 60 + seconds) * MICROS_PER_SECOND);
}

/**
 * Formats microseconds to SRT timestamp standard "HH:MM:SS,mmm".
 */
export function formatMicrosToSrtTimestamp(micros: number): string {
  const totalMillis = Math.max(0, Math.round(micros / 1000));
  const hours = Math.floor(totalMillis / 3600000);
  const minutes = Math.floor((totalMillis % 3600000) / 60000);
  const seconds = Math.floor((totalMillis % 60000) / 1000);
  const milliseconds = totalMillis % 1000;

  const pad = (n: number, z: number = 2) => n.toString().padStart(z, '0');
  const padMs = (n: number) => n.toString().padStart(3, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${padMs(milliseconds)}`;
}

/**
 * Parses full SRT text into structured subtitle cues.
 */
export function parseSrtContent(srtText: string): SubtitleCue[] {
  const normalized = srtText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.trim().split('\n\n');
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    // Line 0 is cue index or timestamp if index omitted
    let timeLineIdx = 1;
    let index = parseInt(lines[0], 10);
    if (isNaN(index)) {
      timeLineIdx = 0;
      index = cues.length + 1;
    }

    const timeLine = lines[timeLineIdx];
    if (!timeLine || !timeLine.includes('-->')) continue;

    const [startStr, endStr] = timeLine.split('-->').map((s) => s.trim());
    const startUs = parseSrtTimestampToMicros(startStr);
    const endUs = parseSrtTimestampToMicros(endStr);
    const text = lines.slice(timeLineIdx + 1).join('\n').trim();

    if (endUs > startUs && text.length > 0) {
      cues.push({
        index,
        startUs,
        endUs,
        text,
      });
    }
  }

  return cues;
}

/**
 * Converts SubtitleCues into NovaCut TextOverlay clips for a text track.
 */
export function cuesToTextOverlays(cues: SubtitleCue[], trackId: string): TextOverlay[] {
  return cues.map((cue, i) => ({
    id: `txt_cue_${Date.now()}_${i}`,
    trackId,
    type: 'text',
    name: `Subtitle ${cue.index}`,
    text: cue.text,
    fontSize: 22,
    textColor: '#FFFFFF',
    outlineColor: '#000000',
    outlineWidth: 2,
    alignment: 'center',
    timelineRange: {
      startUs: cue.startUs,
      durationUs: cue.endUs - cue.startUs,
    },
    transform: {
      ...DEFAULT_TRANSFORM,
      translateY: 260, // position near bottom of canvas
    },
  }));
}

/**
 * Exports TextOverlay clips into standard SubRip (.srt) subtitle file content.
 */
export function textOverlaysToSrt(textClips: TextOverlay[]): string {
  const sorted = [...textClips].sort(
    (a, b) => a.timelineRange.startUs - b.timelineRange.startUs
  );

  return sorted
    .map((clip, idx) => {
      const cueIndex = idx + 1;
      const start = formatMicrosToSrtTimestamp(clip.timelineRange.startUs);
      const end = formatMicrosToSrtTimestamp(
        clip.timelineRange.startUs + clip.timelineRange.durationUs
      );
      return `${cueIndex}\n${start} --> ${end}\n${clip.text}\n`;
    })
    .join('\n');
}
