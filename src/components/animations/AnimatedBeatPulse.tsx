/**
 * NovaCut Animated Beat Pulse Component
 * Uses React Native Reanimated to produce kinetic pulsing waves at audio beat markers.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

export interface AnimatedBeatPulseProps {
  isPlaying: boolean;
  bpm?: number;
  color?: string;
  size?: number;
}

export const AnimatedBeatPulse: React.FC<AnimatedBeatPulseProps> = ({
  isPlaying,
  bpm = 120,
  color = '#00E5FF',
  size = 24,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  const beatPeriodMs = Math.max(250, Math.round(60_000 / bpm));

  useEffect(() => {
    if (isPlaying) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.4, { duration: Math.round(beatPeriodMs * 0.35), easing: Easing.out(Easing.cubic) }),
          withTiming(1.0, { duration: Math.round(beatPeriodMs * 0.65), easing: Easing.in(Easing.cubic) })
        ),
        -1,
        false
      );

      opacity.value = withRepeat(
        withSequence(
          withTiming(1.0, { duration: Math.round(beatPeriodMs * 0.35) }),
          withTiming(0.4, { duration: Math.round(beatPeriodMs * 0.65) })
        ),
        -1,
        false
      );
    } else {
      scale.value = withTiming(1, { duration: 200 });
      opacity.value = withTiming(0.5, { duration: 200 });
    }
  }, [isPlaying, bpm, beatPeriodMs]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.pulseRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: color,
          },
          animatedStyle,
        ]}
      />
      <View
        style={[
          styles.coreDot,
          {
            width: size * 0.4,
            height: size * 0.4,
            borderRadius: (size * 0.4) / 2,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  coreDot: {
    position: 'absolute',
  },
});
