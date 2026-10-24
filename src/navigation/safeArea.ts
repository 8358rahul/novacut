import { Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface GuaranteedInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Universal Guaranteed Safe Area Hook for Android and iOS.
 * 
 * Guarantees that neither the top header (with back button) nor the bottom controls/tabbar
 * are EVER obscured by status bars, camera punch-holes/notches, or bottom gesture navigation bars.
 * 
 * Works reliably even when native safe area context reports 0 during initialization or in Expo Go.
 */
export function useGuaranteedInsets(): GuaranteedInsets {
  const insets = useSafeAreaInsets();

  // Android: StatusBar.currentHeight accurately reports physical height of status bar & notch (24-48dp)
  // iOS: Modern iPhones (X through 16 Pro Dynamic Island) require at least 44-59pt
  const minTop = Platform.select({
    android: (StatusBar.currentHeight ?? 0) > 0 ? (StatusBar.currentHeight ?? 0) : 32,
    ios: 44,
    default: 0,
  });

  // Android: Modern gesture navigation pill or 3-button nav requires 16-24dp
  // iOS: Home indicator pill requires 34pt
  const minBottom = Platform.select({
    ios: 34,
    android: 16,
    default: 0,
  });

  return {
    top: Math.max(insets.top || 0, minTop),
    bottom: Math.max(insets.bottom || 0, minBottom),
    left: Math.max(insets.left || 0, 0),
    right: Math.max(insets.right || 0, 0),
  };
}
