/**
 * NovaCut Audio & Beat Visualizer Animation
 * Renders kinetic equalizer bars using React Native Reanimated.
 * Provides fallback Lottie/SVG animation compatible across Web, Android, and iOS.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../../theme';

export interface LottieAudioVisualizerProps {
  isPlaying: boolean;
  barCount?: number;
  color?: string;
  maxHeight?: number;
}

const AnimatedBar: React.FC<{
  isPlaying: boolean;
  color: string;
  maxHeight: number;
  delayMs: number;
  targetScale: number;
}> = ({ isPlaying, color, maxHeight, delayMs, targetScale }) => {
  const scaleY = useSharedValue(0.25);

  useEffect(() => {
    if (isPlaying) {
      const duration = 220 + delayMs * 25;
      scaleY.value = withRepeat(
        withSequence(
          withTiming(targetScale, { duration, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.2, { duration: duration * 0.9, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      );
    } else {
      scaleY.value = withTiming(0.25, { duration: 200 });
    }
  }, [isPlaying, targetScale, delayMs]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: scaleY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          height: maxHeight,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
};

export const LottieAudioVisualizer: React.FC<LottieAudioVisualizerProps> = ({
  isPlaying,
  barCount = 7,
  color = colors.accentGreen,
  maxHeight = 18,
}) => {
  const scales = [0.95, 0.6, 1.0, 0.45, 0.85, 0.5, 0.9, 0.7, 1.0];

  return (
    <View style={[styles.container, { height: maxHeight }]}>
      {Array.from({ length: barCount }, (_, i) => (
        <AnimatedBar
          key={i}
          isPlaying={isPlaying}
          color={color}
          maxHeight={maxHeight}
          delayMs={i * 30}
          targetScale={scales[i % scales.length]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
    paddingHorizontal: 2,
  },
  bar: {
    width: 2.5,
    borderRadius: 1.5,
  },
});
