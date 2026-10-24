/**
 * NovaCut Photo Editing Engine
 * Inspired by CapCut's Photo Editor & Canvas System (com.xt.retouch & com.lemon.cutsame.photo).
 * Clean-room, independent implementation of non-destructive image adjustments, canvas aspect ratios,
 * background blur/gradients, LUT filters, text overlays, and stickers.
 */

export type PhotoAspectRatio =
  | '1:1'     // Instagram Square
  | '9:16'    // TikTok, Reels, Stories
  | '16:9'    // YouTube, Landscape
  | '4:5'     // Instagram Feed Portrait
  | '3:4'     // Standard Photo Portrait
  | '2:1'     // Panoramic
  | '2.35:1'; // Cinemascope Anamorphic

export interface AspectRatioSpec {
  ratio: PhotoAspectRatio;
  label: string;
  widthRatio: number;
  heightRatio: number;
  description: string;
}

export const PHOTO_ASPECT_RATIOS: AspectRatioSpec[] = [
  { ratio: '1:1', label: '1:1', widthRatio: 1, heightRatio: 1, description: 'Square (Instagram)' },
  { ratio: '9:16', label: '9:16', widthRatio: 9, heightRatio: 16, description: 'Stories / TikTok' },
  { ratio: '16:9', label: '16:9', widthRatio: 16, heightRatio: 9, description: 'Landscape' },
  { ratio: '4:5', label: '4:5', widthRatio: 4, heightRatio: 5, description: 'Feed Portrait' },
  { ratio: '3:4', label: '3:4', widthRatio: 3, heightRatio: 4, description: 'Classic Photo' },
  { ratio: '2:1', label: '2:1', widthRatio: 2, heightRatio: 1, description: 'Wide Banner' },
  { ratio: '2.35:1', label: '2.35:1', widthRatio: 2.35, heightRatio: 1, description: 'Cinemascope' },
];

export type CanvasBackgroundType = 'color' | 'gradient' | 'blur';

export interface CanvasBackground {
  type: CanvasBackgroundType;
  color?: string;
  gradientColors?: [string, string];
  blurRadius?: number; // 0 to 20px
}

export interface PhotoAdjustments {
  brightness: number; // -1.0 to 1.0 (default 0)
  contrast: number;   // 0.2 to 2.0 (default 1.0)
  saturation: number; // 0.0 to 2.0 (default 1.0)
  temperature: number;// -1.0 (cool) to 1.0 (warm) (default 0)
  vignette: number;   // 0.0 to 1.0 (default 0)
  sharpen: number;    // 0.0 to 1.0 (default 0)
  exposure: number;   // -1.0 to 1.0 (default 0)
}

export const DEFAULT_PHOTO_ADJUSTMENTS: PhotoAdjustments = {
  brightness: 0,
  contrast: 1.0,
  saturation: 1.0,
  temperature: 0,
  vignette: 0,
  sharpen: 0,
  exposure: 0,
};

export type PhotoFilterPresetId =
  | 'normal'
  | 'teal_orange'
  | 'vintage_70s'
  | 'cyberpunk'
  | 'moody_dark'
  | 'vivid_warm'
  | 'monochrome'
  | 'fresh_pastel';

export interface PhotoFilterPreset {
  id: PhotoFilterPresetId;
  name: string;
  category: 'Cinematic' | 'Retro' | 'Modern' | 'B&W';
  adjustments: Partial<PhotoAdjustments>;
  tintColor?: string;
}

export const PHOTO_FILTERS: PhotoFilterPreset[] = [
  { id: 'normal', name: 'Original', category: 'Modern', adjustments: {} },
  {
    id: 'teal_orange',
    name: 'Teal & Orange',
    category: 'Cinematic',
    adjustments: { contrast: 1.25, saturation: 1.2, temperature: 0.25 },
    tintColor: 'rgba(0, 180, 216, 0.15)',
  },
  {
    id: 'vintage_70s',
    name: 'Vintage 70s',
    category: 'Retro',
    adjustments: { contrast: 0.9, saturation: 0.85, temperature: 0.4, vignette: 0.35 },
    tintColor: 'rgba(238, 155, 0, 0.2)',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    category: 'Modern',
    adjustments: { contrast: 1.4, saturation: 1.35, brightness: 0.05 },
    tintColor: 'rgba(247, 37, 133, 0.2)',
  },
  {
    id: 'moody_dark',
    name: 'Moody Dark',
    category: 'Cinematic',
    adjustments: { contrast: 1.3, brightness: -0.15, saturation: 0.75, vignette: 0.45 },
    tintColor: 'rgba(15, 23, 42, 0.25)',
  },
  {
    id: 'vivid_warm',
    name: 'Vivid Warm',
    category: 'Modern',
    adjustments: { contrast: 1.15, saturation: 1.3, temperature: 0.3 },
    tintColor: 'rgba(255, 183, 3, 0.15)',
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    category: 'B&W',
    adjustments: { saturation: 0.0, contrast: 1.35, vignette: 0.2 },
  },
  {
    id: 'fresh_pastel',
    name: 'Fresh Pastel',
    category: 'Modern',
    adjustments: { brightness: 0.1, contrast: 0.95, saturation: 1.15, temperature: -0.1 },
    tintColor: 'rgba(162, 210, 255, 0.15)',
  },
];

export interface PhotoSticker {
  id: string;
  emoji: string;
  xPercent: number; // 0 - 100
  yPercent: number; // 0 - 100
  scale: number;    // 0.5 - 3.0
  rotationDeg: number;
}

export interface PhotoTextOverlay {
  id: string;
  text: string;
  color: string;
  fontSize: number;
  backgroundColor?: string;
  xPercent: number;
  yPercent: number;
  rotationDeg: number;
}

export interface PhotoRetouch {
  skinSmooth: number;  // 0 - 100
  whitening: number;   // 0 - 100
  faceSlim: number;    // 0 - 100
  eyeBrighten: number; // 0 - 100
}

export const DEFAULT_PHOTO_RETOUCH: PhotoRetouch = {
  skinSmooth: 0,
  whitening: 0,
  faceSlim: 0,
  eyeBrighten: 0,
};

export interface PhotoCutout {
  enabled: boolean;
  silhouetteGlow: boolean;
  glowColor: string; // e.g. '#00E5FF', '#FF007A', '#FFD700', '#FFFFFF'
  backdropType: 'transparent' | 'color' | 'blur' | 'gradient' | 'neon';
  backdropColor?: string;
}

export const DEFAULT_PHOTO_CUTOUT: PhotoCutout = {
  enabled: false,
  silhouetteGlow: false,
  glowColor: '#00E5FF',
  backdropType: 'blur',
  backdropColor: '#18181E',
};

export interface PhotoProjectState {
  id: string;
  title: string;
  imageUri: string;
  aspectRatio: PhotoAspectRatio;
  background: CanvasBackground;
  adjustments: PhotoAdjustments;
  activeFilter: PhotoFilterPresetId;
  stickers: PhotoSticker[];
  textOverlays: PhotoTextOverlay[];
  rotationDeg: number; // 0, 90, 180, 270
  flipHorizontal: boolean;
  flipVertical: boolean;
  retouch?: PhotoRetouch;
  cutout?: PhotoCutout;
}

export function createInitialPhotoState(imageUri: string, title?: string): PhotoProjectState {
  return {
    id: `photo_${Date.now()}`,
    title: title || 'Untitled Photo Edit',
    imageUri,
    aspectRatio: '1:1',
    background: {
      type: 'blur',
      blurRadius: 12,
    },
    adjustments: { ...DEFAULT_PHOTO_ADJUSTMENTS },
    activeFilter: 'normal',
    stickers: [],
    textOverlays: [],
    rotationDeg: 0,
    flipHorizontal: false,
    flipVertical: false,
    retouch: { ...DEFAULT_PHOTO_RETOUCH },
    cutout: { ...DEFAULT_PHOTO_CUTOUT },
  };
}

/**
 * Calculates canvas box dimensions bounded within container width and height.
 */
export function calculateCanvasDimensions(
  aspectRatio: PhotoAspectRatio,
  containerWidth: number,
  containerHeight: number
): { width: number; height: number } {
  const spec = PHOTO_ASPECT_RATIOS.find((r) => r.ratio === aspectRatio) || PHOTO_ASPECT_RATIOS[0];
  const targetRatio = spec.widthRatio / spec.heightRatio;
  const containerRatio = containerWidth / containerHeight;

  if (targetRatio > containerRatio) {
    // Width-constrained
    const width = containerWidth;
    const height = Math.round(width / targetRatio);
    return { width, height };
  } else {
    // Height-constrained
    const height = containerHeight;
    const width = Math.round(height * targetRatio);
    return { width, height };
  }
}

/**
 * Manages photo edit history for robust Undo / Redo operations.
 */
export class PhotoEditorEngine {
  private state: PhotoProjectState;
  private undoStack: PhotoProjectState[] = [];
  private redoStack: PhotoProjectState[] = [];

  constructor(initialState: PhotoProjectState) {
    this.state = { ...initialState };
  }

  public getState(): PhotoProjectState {
    return this.state;
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  private pushHistory() {
    this.undoStack.push(JSON.parse(JSON.stringify(this.state)));
    if (this.undoStack.length > 30) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  public undo(): boolean {
    if (!this.canUndo()) return false;
    const previous = this.undoStack.pop()!;
    this.redoStack.push(JSON.parse(JSON.stringify(this.state)));
    this.state = previous;
    return true;
  }

  public redo(): boolean {
    if (!this.canRedo()) return false;
    const next = this.redoStack.pop()!;
    this.undoStack.push(JSON.parse(JSON.stringify(this.state)));
    this.state = next;
    return true;
  }

  public setAspectRatio(ratio: PhotoAspectRatio) {
    this.pushHistory();
    this.state = { ...this.state, aspectRatio: ratio };
  }

  public setBackground(bg: CanvasBackground) {
    this.pushHistory();
    this.state = { ...this.state, background: { ...bg } };
  }

  public setAdjustments(adj: Partial<PhotoAdjustments>) {
    this.pushHistory();
    this.state = {
      ...this.state,
      adjustments: { ...this.state.adjustments, ...adj },
    };
  }

  public resetAdjustments() {
    this.pushHistory();
    this.state = {
      ...this.state,
      adjustments: { ...DEFAULT_PHOTO_ADJUSTMENTS },
      activeFilter: 'normal',
    };
  }

  public applyFilter(filterId: PhotoFilterPresetId) {
    this.pushHistory();
    const filter = PHOTO_FILTERS.find((f) => f.id === filterId);
    if (!filter) return;

    this.state = {
      ...this.state,
      activeFilter: filterId,
      adjustments: {
        ...DEFAULT_PHOTO_ADJUSTMENTS,
        ...filter.adjustments,
      },
    };
  }

  public addSticker(emoji: string, xPercent = 50, yPercent = 50) {
    this.pushHistory();
    const newSticker: PhotoSticker = {
      id: `sticker_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      emoji,
      xPercent,
      yPercent,
      scale: 1.0,
      rotationDeg: 0,
    };
    this.state = {
      ...this.state,
      stickers: [...this.state.stickers, newSticker],
    };
  }

  public updateSticker(id: string, updates: Partial<PhotoSticker>) {
    this.pushHistory();
    this.state = {
      ...this.state,
      stickers: this.state.stickers.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    };
  }

  public removeSticker(id: string) {
    this.pushHistory();
    this.state = {
      ...this.state,
      stickers: this.state.stickers.filter((s) => s.id !== id),
    };
  }

  public addTextOverlay(text: string, color = '#FFFFFF', xPercent = 50, yPercent = 50) {
    this.pushHistory();
    const newOverlay: PhotoTextOverlay = {
      id: `text_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      text,
      color,
      fontSize: 24,
      backgroundColor: 'rgba(0,0,0,0.5)',
      xPercent,
      yPercent,
      rotationDeg: 0,
    };
    this.state = {
      ...this.state,
      textOverlays: [...this.state.textOverlays, newOverlay],
    };
  }

  public updateTextOverlay(id: string, updates: Partial<PhotoTextOverlay>) {
    this.pushHistory();
    this.state = {
      ...this.state,
      textOverlays: this.state.textOverlays.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    };
  }

  public removeTextOverlay(id: string) {
    this.pushHistory();
    this.state = {
      ...this.state,
      textOverlays: this.state.textOverlays.filter((t) => t.id !== id),
    };
  }

  public rotateClockwise() {
    this.pushHistory();
    const nextRot = (this.state.rotationDeg + 90) % 360;
    this.state = { ...this.state, rotationDeg: nextRot };
  }

  public toggleFlipHorizontal() {
    this.pushHistory();
    this.state = { ...this.state, flipHorizontal: !this.state.flipHorizontal };
  }

  public toggleFlipVertical() {
    this.pushHistory();
    this.state = { ...this.state, flipVertical: !this.state.flipVertical };
  }

  public setRetouch(retouch: Partial<PhotoRetouch>) {
    this.pushHistory();
    this.state = {
      ...this.state,
      retouch: {
        ...(this.state.retouch || DEFAULT_PHOTO_RETOUCH),
        ...retouch,
      },
    };
  }

  public setCutout(cutout: Partial<PhotoCutout>) {
    this.pushHistory();
    this.state = {
      ...this.state,
      cutout: {
        ...(this.state.cutout || DEFAULT_PHOTO_CUTOUT),
        ...cutout,
      },
    };
  }

  public setImageUri(imageUri: string, title?: string) {
    this.pushHistory();
    this.state = {
      ...this.state,
      imageUri,
      title: title || this.state.title,
    };
  }
}
