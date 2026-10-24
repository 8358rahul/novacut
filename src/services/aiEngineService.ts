/**
 * NovaCut AI Studio Engine Client
 * Bridges the React Native mobile app to the local Python AI server (novacut_studio.py).
 * Provides AI Cutout, Smart Reframe, CLAHE HDR Enhancement, and Audio Beat Detection.
 */

// Safely resolve default endpoint for Android Emulator vs iOS / Localhost
export function getDefaultEngineUrl(): string {
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
    const res = await fetch(`${this.baseUrl}/ai/remove-bg`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imagePath, iterations, featherRadius }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`AI Cutout failed: ${err}`);
    }

    const data: AICutoutResult = await res.json();
    if (data.downloadUrl && !data.fullUrl) {
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
    const res = await fetch(`${this.baseUrl}/ai/auto-reframe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaPath, targetAspect }),
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
    const res = await fetch(`${this.baseUrl}/ai/enhance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imagePath, mode, intensity }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`AI Enhance failed: ${err}`);
    }

    const data: AIEnhanceResult = await res.json();
    if (data.downloadUrl && !data.fullUrl) {
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
    const res = await fetch(`${this.baseUrl}/ai/detect-beats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaPath, bpm, durationSec }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`AI Beat Detection failed: ${err}`);
    }

    return res.json();
  }
}

export const defaultAIEngineService = new AIEngineService();
