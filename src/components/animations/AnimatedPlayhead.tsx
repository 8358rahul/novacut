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
    transform: [{ scale: diamondGlow.value }],
  }));

  return (
    <View
      style={[
        styles.playheadNeedle,
        { left: positionX },
      ]}
      pointerEvents="none"
    >
      <Animated.View style={[styles.playheadHead, animatedHeadStyle]}>
        <View style={styles.playheadHeadInner} />
      </Animated.View>
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
    width: 20,
    marginLeft: -10,
    zIndex: 100,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  playheadHead: {
    width: 14,
    height: 18,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.8,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 8,
  },
  playheadHeadInner: {
    width: 2,
    height: 8,
    backgroundColor: '#1E1E24',
    borderRadius: 1,
  },
  playheadLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.9,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
});
