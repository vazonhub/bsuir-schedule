import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@hooks/useAccessibility';
import { usePalette } from '@hooks/usePalette';
import { getFlameColor } from '@utils/fire';

interface Props {
  /** Current streak length — determines the flame's color and fill. */
  current: number;
  size?: number;
  /** Override the color (for celebration animations). */
  color?: string;
  /** Soft repeating pulse while the streak is alive (respects reduce-motion). */
  animated?: boolean;
}

/**
 * Streak flame icon. At streak 0 — an outlined "cold" flame,
 * otherwise filled, colored by tier (`getFlameColor`). With `animated` — a light
 * pulse while the streak is alive.
 */
export const FlameIcon = ({ current, size = 14, color, animated = false }: Props) => {
  const Palette = usePalette();
  const reduceMotion = useReduceMotion();
  const hot = current > 0;
  const resolved = color ?? (hot ? getFlameColor(current) : Palette.textTertiary);

  const scale = useSharedValue(1);
  useEffect(() => {
    if (animated && hot && !reduceMotion) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(scale);
      scale.value = 1;
    }
    return () => cancelAnimation(scale);
  }, [animated, hot, reduceMotion, scale]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animated ? animStyle : undefined}>
      <Ionicons name={hot ? 'flame' : 'flame-outline'} size={size} color={resolved} />
    </Animated.View>
  );
};
