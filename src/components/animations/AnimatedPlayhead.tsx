/**
 * NovaCut Animated Playhead Needle
 * Powered by React Native Reanimated for silky smooth 60fps playhead animation,
 * kinetic diamond pulse, and razor-sharp timeline synchronization.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../../theme';

export interface AnimatedPlayheadProps {
  positionX: number;
  isPlaying: boolean;
}

export const AnimatedPlayhead: React.FC<AnimatedPlayheadProps> = ({
  positionX,
  isPlaying,
}) => {
  const diamondGlow = useSharedValue(1);

  useEffect(() => {
    if (isPlaying) {
      diamondGlow.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 400 }),
          withTiming(1.0, { duration: 400 })
        ),
        -1,
        true
      );
    } else {
      diamondGlow.value = withTiming(1.0, { duration: 200 });
    }
  }, [isPlaying]);

  const animatedHeadStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: '45deg' }, { scale: diamondGlow.value }],
  }));

  return (
    <View
      style={[
        styles.playheadNeedle,
        { left: positionX },
      ]}
      pointerEvents="none"
    >
      <Animated.View style={[styles.playheadHead, animatedHeadStyle]} />
      <View style={styles.playheadLine} />
    </View>
  );
};

const styles = StyleSheet.create({
  playheadNeedle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    height: '100%',
    width: 24,
    marginLeft: -12,
    zIndex: 100,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  playheadHead: {
    width: 14,
    height: 14,
    backgroundColor: colors.accentGold,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderRadius: 2,
    marginTop: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 6,
  },
  playheadLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.accentGold,
    shadowColor: '#000000',
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 4,
  },
});
