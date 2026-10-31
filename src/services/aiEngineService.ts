/**
 * NovaCut AI Studio Engine Client
 * Bridges the React Native mobile app to the local Python AI server (novacut_studio.py).
 * Provides AI Cutout, Smart Reframe, CLAHE HDR Enhancement, and Audio Beat Detection.
 */

// Safely resolve default endpoint for Physical iOS Device, Android Emulator, or Localhost
export function getDefaultEngineUrl(): string {
  if (process.env.EXPO_PUBLIC_ENGINE_URL) return process.env.EXPO_PUBLIC_ENGINE_URL.replace(/\/$/, '');
  try {
    // Dynamically check Expo hostUri so real physical iOS/Android devices connect to dev machine IP
    const Constants = require('expo-constants')?.default;
    const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest2?.extra?.expoClient?.hostUri;
    if (hostUri) {
      const hostIp = hostUri.split(':')[0];
      if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
        return `http://${hostIp}:8765`;
      }
    }
  } catch {}

  try {
    // Dynamically check React Native platform if available
    const RN = require('react-native');
    if (RN?.Platform?.OS === 'android') {
      return 'http://10.0.2.2:8765';
    }
  } catch {
    // Fallback in Node.js test environment or Web
  }
  return 'http://localhost:8765';
}

const DEFAULT_ENGINE_URL = getDefaultEngineUrl();

export interface AICutoutResult {
  status: string;
  outputPath: string;
  downloadUrl?: string;
  fullUrl?: string;
  dimensions: { width: number; height: number };
  foregroundBoundingBox: { x: number; y: number; width: number; height: number };
  foregroundCoverageRatio: number;
}

export interface AIReframeKeyframe {
  timeUs: number;
  timeSec: number;
  translateX: number;
  translateY: number;
  scale: number;
  focalCenter: { x: number; y: number };
}

export interface AIReframeResult {
  status: string;
  originalDimensions: { width: number; height: number; aspectRatio: number };
  targetAspectRatio: string;
  durationSec: number;
  requiredScale: number;
  keyframes: AIReframeKeyframe[];
}

export interface AIEnhanceResult {
  status: string;
  outputPath: string;
  downloadUrl?: string;
  fullUrl?: string;
  mode: 'hdr' | 'portrait' | 'night_enhance' | 'vivid';
  intensity: number;
  dimensions: { width: number; height: number };
}

export interface AIBeatDrop {
  timeUs: number;
  timeSec: number;
  intensity: number;
}

export interface AIAudioBeatResult {
  status: string;
  durationUs?: number;
  durationSec: number;
  bpm: number;
  beatCount: number;
  beatDrops: AIBeatDrop[];
  waveform?: number[];
}

export class AIEngineService {
  private baseUrl: string;

  constructor(baseUrl: string = DEFAULT_ENGINE_URL) {
    this.baseUrl = baseUrl;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  /**
   * Automatically uploads local media files from physical mobile devices (iPhone/Android)
   * to the Python AI server host so OpenCV and FFmpeg can process them.
   */
  public async uploadIfLocalMedia(uri: string): Promise<string> {
    if (!uri) return uri;
    // Remote URLs, base64 strings, or already-cached assets don't need upload
    if (
      uri.startsWith('http://') ||
      uri.startsWith('https://') ||
      uri.startsWith('/cache/') ||
      uri.startsWith('data:image/')
    ) {
      return uri;
    }

    try {
      // Local device file URI (file:///var/mobile/..., ph://, content://, blob:..., etc.)
      const formData = new FormData();
      const ext = uri.split(/[?#]/)[0].match(/\.([a-zA-Z0-9]+)$/)?.[1].toLowerCase() || 'bin';
      const mime = ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
        mp4: 'video/mp4', mov: 'video/quicktime', m4a: 'audio/mp4',
        mp3: 'audio/mpeg', wav: 'audio/wav', webm: 'video/webm' } as Record<string, string>)[ext] || 'application/octet-stream';

      if (uri.startsWith('blob:') && typeof fetch !== 'undefined') {
        const blobRes = await fetch(uri);
        const blob = await blobRes.blob();
        formData.append('file', blob, `web_upload_${Date.now()}.${ext}`);
      } else {
        formData.append('file', {
          uri,
          name: `upload_${Date.now()}.${ext}`,
          type: mime,
        } as any);
      }

      const res = await fetch(`${this.baseUrl}/ai/upload`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(300_000),
      });

      if (res.ok) {
        const data = await res.json();
        if (typeof data.downloadUrl !== 'string' || !data.downloadUrl.startsWith('/cache/')) {
          throw new Error('Server returned an invalid upload reference');
        }
        return data.downloadUrl;
      }
      throw new Error(`Media upload failed (${res.status})`);
    } catch (err) {
      throw new Error(`Cannot upload media: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Health check to determine if Python AI Engine is running
   */
  public async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * AI Smart Cutout & Background Removal (OpenCV GrabCut)
   */
  public async removeBackground(
    imagePath: string,
    iterations: number = 5,
    featherRadius: number = 5
  ): Promise<AICutoutResult> {
    const targetPath = await this.uploadIfLocalMedia(imagePath);
    const res = await fetch(`${this.baseUrl}/ai/remove-bg`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imagePath: targetPath, iterations, featherRadius }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`AI Cutout failed: ${err}`);
    }

    const data: AICutoutResult = await res.json();
    if (data.downloadUrl) {
      data.fullUrl = `${this.baseUrl}${data.downloadUrl}`;
    }
    return data;
  }

  /**
   * AI Auto-Reframe (16:9 to 9:16 focal tracking keyframe generation)
   */
  public async autoReframe(
    mediaPath: string,
    targetAspect: string = '9:16'
  ): Promise<AIReframeResult> {
    const targetPath = await this.uploadIfLocalMedia(mediaPath);
    const res = await fetch(`${this.baseUrl}/ai/auto-reframe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaPath: targetPath, targetAspect }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`AI Auto-Reframe failed: ${err}`);
    }

    return res.json();
  }

  /**
   * AI Visual Enhancement (HDR, Portrait Smoothing, Night Boost, Vivid)
   */
  public async enhanceImage(
    imagePath: string,
    mode: 'hdr' | 'portrait' | 'night_enhance' | 'vivid' = 'hdr',
    intensity: number = 1.0
  ): Promise<AIEnhanceResult> {
    const targetPath = await this.uploadIfLocalMedia(imagePath);
    const res = await fetch(`${this.baseUrl}/ai/enhance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imagePath: targetPath, mode, intensity }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`AI Enhance failed: ${err}`);
    }

    const data: AIEnhanceResult = await res.json();
    if (data.downloadUrl) {
      data.fullUrl = `${this.baseUrl}${data.downloadUrl}`;
    }
    return data;
  }

  /**
   * AI Audio Transient & Beat Drop Energy Detection
   */
  public async detectAudioBeats(
    mediaPath?: string,
    bpm?: number,
    durationSec?: number
  ): Promise<AIAudioBeatResult> {
    let targetPath = mediaPath;
    if (mediaPath) {
      targetPath = await this.uploadIfLocalMedia(mediaPath);
    }
    const res = await fetch(`${this.baseUrl}/ai/detect-beats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaPath: targetPath, bpm, durationSec }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`AI Beat Detection failed: ${err}`);
    }

    return res.json();
  }
}

export const defaultAIEngineService = new AIEngineService();
