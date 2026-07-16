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
  /** Текущая длина серии — определяет цвет и залитость пламени. */
  current: number;
  size?: number;
  /** Переопределить цвет (для celebration-анимаций). */
  color?: string;
  /** Мягкий повторяющийся пульс, когда огонёк горит (учитывает reduce-motion). */
  animated?: boolean;
}

/**
 * Иконка пламени огонька. При серии 0 — контурное «холодное» пламя,
 * иначе залитое, с цветом по тиру (`getFlameColor`). С `animated` — лёгкий
 * пульс, пока серия жива.
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
