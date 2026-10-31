import { Project } from '../core/models/project';
import { defaultAIEngineService } from './aiEngineService';

import { computeEffectiveColorAdjustments, RENDERABLE_EFFECTS } from '../core/effects/effectRegistry';

/** Validate the renderable subset before uploading large mobile assets. */
export function collectExportClips(project: Project) {
  return Object.values(project.clips ?? {}).filter(c => {
    const track = project.tracks.find(t => t.id === c.trackId);
    return track?.isVisible !== false;
  }).map(c => {
    if (c.type === 'text') throw new Error('Text rendering is not supported by this server yet. Remove text before exporting.');
    const track = project.tracks.find(t => t.id === c.trackId);
    if ('transform' in c) {
      const t = c.transform;
      if (t.scale !== 1 || t.rotationDeg !== 0 || t.translateX !== 0 || t.translateY !== 0 || t.opacity !== 1 || t.crop ||
          c.blendMode && c.blendMode !== 'normal' || c.keyframes && Object.keys(c.keyframes).length ||
          c.transitionIn && c.transitionIn.type !== 'none' || c.transitionOut && c.transitionOut.type !== 'none'
      ) {
        throw new Error('Transforms, transitions and keyframes are not supported in server export yet.');
      }
    }
    if (c.type === 'video' && c.speedCurve && c.speedCurve.preset !== 'standard') throw new Error('Speed ramps are not supported in server export yet.');
    if (c.type === 'audio' && (c.fadeInDurationUs || c.fadeOutDurationUs)) throw new Error('Audio fades are not supported in server export yet.');
    if ('visualEffect' in c && c.visualEffect && !RENDERABLE_EFFECTS.includes(c.visualEffect)) throw new Error('This effect is not available for export yet.');
    const adjustments = 'colorAdjustments' in c
      ? computeEffectiveColorAdjustments(c.colorAdjustments, c.lutFilterId, c.lutIntensity) : undefined;
    const colorAdjustments = adjustments ? {
      brightness: Math.max(-1, Math.min(1, adjustments.brightness)),
      contrast: Math.max(0, Math.min(4, adjustments.contrast)),
      saturation: Math.max(0, Math.min(4, adjustments.saturation)),
      temperature: Math.max(-1, Math.min(1, adjustments.temperature)),
    } : undefined;
    const uri = project.assets?.[c.assetId]?.uri;
    if (!uri) throw new Error(`Missing source media for ${c.name}`);
    return {
      id: c.id, trackId: c.trackId, type: c.type, uri, name: c.name,
      startUs: c.timelineRange.startUs, durationUs: c.timelineRange.durationUs,
      sourceStartUs: 'sourceRange' in c ? c.sourceRange.startUs : 0,
      speed: 'speed' in c ? c.speed : 1,
      volume: track?.isMuted ? 0 : 'volume' in c ? c.volume : 1,
      colorAdjustments,
      visualEffect: 'visualEffect' in c ? c.visualEffect ?? 'none' : 'none',
      visualEffectIntensity: 'visualEffectIntensity' in c ? c.visualEffectIntensity ?? 0.7 : 0,
      zIndex: track?.zIndex ?? 0,
    };
  });
}

export async function prepareExportClips(project: Project) {
  const clips = collectExportClips(project);
  if (!clips.length) throw new Error('Add visible media before exporting.');
  const uploaded = new Map<string, string>();
  for (const clip of clips) {
    if (!uploaded.has(clip.uri)) uploaded.set(clip.uri, await defaultAIEngineService.uploadIfLocalMedia(clip.uri));
    clip.uri = uploaded.get(clip.uri)!;
  }
  return clips;
}
