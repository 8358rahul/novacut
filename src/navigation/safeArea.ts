import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Native insets already account for notches, navigation mode and orientation.
 * Zero is valid on devices without a home indicator; never invent extra padding.
 */
export function useGuaranteedInsets() {
  return useSafeAreaInsets();
}
