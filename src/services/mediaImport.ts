import * as ImagePicker from 'expo-image-picker';
import { MediaAsset } from '../core/models/asset';
import { VideoClip, ImageClip, DEFAULT_TRANSFORM, DEFAULT_COLOR_ADJUSTMENTS } from '../core/models/clip';
import { secondsToMicros } from '../core/models/timeline';

export interface PickMediaResult {
  asset: MediaAsset;
  clip: VideoClip | ImageClip;
}

export interface PickedPhotoResult {
  uri: string;
  name: string;
  width: number;
  height: number;
}

/**
 * Opens native phone photo gallery (Photos on iOS, Gallery/Google Photos on Android)
 * to pick an image for Photo Studio / Retouch.
 */
export async function pickPhotoFromGallery(): Promise<PickedPhotoResult | null> {
  try {
    try {
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    } catch (e) {
      console.warn('Media library permission check:', e);
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const picked = result.assets[0];
    return {
      uri: picked.uri,
      name: picked.fileName || `Photo_${Date.now()}.jpg`,
      width: picked.width || 1080,
      height: picked.height || 1080,
    };
  } catch (error) {
    console.error('Failed to pick photo from gallery:', error);
    throw error;
  }
}

/**
 * Captures a new photo using device camera for Photo Studio.
 */
export async function capturePhotoWithCamera(): Promise<PickedPhotoResult | null> {
  try {
    try {
      await ImagePicker.requestCameraPermissionsAsync();
    } catch (e) {
      console.warn('Camera permission check:', e);
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const picked = result.assets[0];
    return {
      uri: picked.uri,
      name: picked.fileName || `Camera_${Date.now()}.jpg`,
      width: picked.width || 1080,
      height: picked.height || 1080,
    };
  } catch (error) {
    console.error('Failed to capture photo with camera:', error);
    throw error;
  }
}

/**
 * Service to pick local video or photo from native mobile Gallery
 * (Apple Photos or Android Gallery) and wrap into NovaCut MediaAsset and Video/Image Clip.
 * Launches system photo & video picker directly, without ever redirecting to the OS file manager.
 */
export async function pickVideoFromStorage(
  trackId: string,
  startTimelineUs: number,
  preferredType: 'video' | 'image' | 'all' = 'all'
): Promise<PickMediaResult | null> {
  try {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        console.warn('Media library permission not granted:', perm.status);
      }
    } catch (e) {
      console.warn('Media library permission check:', e);
    }

    const mediaTypes: ImagePicker.MediaType[] =
      preferredType === 'image'
        ? ['images']
        : preferredType === 'video'
        ? ['videos']
        : ['images', 'videos'];

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      allowsEditing: false,
      quality: 1,
      videoExportPreset: ImagePicker.VideoExportPreset.Passthrough,
      shouldDownloadFromNetwork: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const picked = result.assets[0];
    const isImage = picked.type === 'image';
    const assetId = `asset_${Date.now()}`;
    const clipId = `clip_${isImage ? 'img' : 'vid'}_${Date.now()}`;

    // Compute duration: expo-image-picker returns duration in ms for videos
    let durationUs = secondsToMicros(isImage ? 4 : 5);
    if (picked.duration && picked.duration > 0) {
      const durationMs = picked.duration > 100_000 ? picked.duration / 1000 : picked.duration;
      durationUs = Math.max(1_000_000, Math.round(durationMs * 1000));
    }

    const asset: MediaAsset = {
      id: assetId,
      uri: picked.uri,
      name: picked.fileName || (isImage ? 'Imported Photo.jpg' : 'Imported Video.mp4'),
      type: isImage ? 'image' : 'video',
      metadata: {
        width: picked.width || (isImage ? 1080 : 1920),
        height: picked.height || (isImage ? 1080 : 1080),
        durationUs,
        fps: 30,
        mimeType: picked.mimeType || (isImage ? 'image/jpeg' : 'video/mp4'),
        fileSize: picked.fileSize || 0,
        hasAudio: !isImage,
      },
      createdAt: Date.now(),
    };

    const clip: VideoClip | ImageClip = {
      id: clipId,
      trackId,
      type: isImage ? 'image' : 'video',
      name: picked.fileName || (isImage ? 'Photo Clip' : 'Video Clip'),
      assetId: asset.id,
      timelineRange: {
        startUs: startTimelineUs,
        durationUs,
      },
      sourceRange: {
        startUs: 0,
        durationUs,
      },
      speed: 1.0,
      volume: 1.0,
      transform: DEFAULT_TRANSFORM,
      colorAdjustments: DEFAULT_COLOR_ADJUSTMENTS,
    } as VideoClip | ImageClip;

    return { asset, clip };
  } catch (error) {
    console.error('Failed to pick media from gallery:', error);
    throw error;
  }
}

/**
 * Capture video with native camera to append directly to the editor timeline.
 */
export async function captureVideoWithCamera(
  trackId: string,
  startTimelineUs: number
): Promise<PickMediaResult | null> {
  try {
    try {
      await ImagePicker.requestCameraPermissionsAsync();
    } catch (e) {
      console.warn('Camera permission check:', e);
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      quality: 1,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const picked = result.assets[0];
    const assetId = `asset_cam_${Date.now()}`;
    const clipId = `clip_vid_${Date.now()}`;

    let durationUs = secondsToMicros(5);
    if (picked.duration && picked.duration > 0) {
      const durationMs = picked.duration > 1000 ? picked.duration : picked.duration * 1000;
      durationUs = Math.round(durationMs * 1000);
    }

    const asset: MediaAsset = {
      id: assetId,
      uri: picked.uri,
      name: picked.fileName || `Camera_Recording_${Date.now()}.mp4`,
      type: 'video',
      metadata: {
        width: picked.width || 1920,
        height: picked.height || 1080,
        durationUs,
        fps: 30,
        mimeType: picked.mimeType || 'video/mp4',
        fileSize: picked.fileSize || 0,
        hasAudio: true,
      },
      createdAt: Date.now(),
    };

    const clip: VideoClip = {
      id: clipId,
      trackId,
      type: 'video',
      name: picked.fileName || 'Camera Clip',
      assetId: asset.id,
      timelineRange: {
        startUs: startTimelineUs,
        durationUs,
      },
      sourceRange: {
        startUs: 0,
        durationUs,
      },
      speed: 1.0,
      volume: 1.0,
      transform: DEFAULT_TRANSFORM,
      colorAdjustments: DEFAULT_COLOR_ADJUSTMENTS,
    };

    return { asset, clip };
  } catch (error) {
    console.error('Failed to capture video with camera:', error);
    throw error;
  }
}
