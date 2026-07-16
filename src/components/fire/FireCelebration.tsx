import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@hooks/useAccessibility';
import { usePalette } from '@hooks/usePalette';
import { useFireStore } from '@stores/fire.store';
import { Radius, Spacing } from '@theme';
import { textProps } from '@theme/typography';
import { getFlameColor } from '@utils/fire';
import { hapticSuccess } from '@utils/haptics';

type PaletteType = ReturnType<typeof usePalette>;

/** Углы разлёта частиц (градусы). */
const PARTICLE_ANGLES: readonly number[] = [0, 60, 120, 180, 240, 300];
const HOLD_MS = 1500;
const HOLD_MS_REDUCED = 1100;

/**
 * Полноэкранный оверлей-празднование. Рендерится, пока в fire-сторе есть
 * `pendingCelebration` (новый рекорд или веха 7/30/100), и сам гасит событие
 * (`consumeCelebration`) в конце exit-анимации. Монтируется один раз в
 * корневом layout. `pointerEvents="none"` — не перехватывает жесты.
 */
export const FireCelebration = () => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const reduceMotion = useReduceMotion();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);

  const pending = useFireStore((s) => s.pendingCelebration);
  const consume = useFireStore((s) => s.consumeCelebration);

  const scrim = useSharedValue(0);
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);

  // Ключ события — чтобы анимация перезапускалась на каждое новое празднование.
  const key = pending ? `${pending.kind}:${pending.value}` : null;

  useEffect(() => {
    if (!pending) return;
    void hapticSuccess();

    scrim.value = 0;
    opacity.value = 0;
    scale.value = 0.6;
    scrim.value = withTiming(1, { duration: reduceMotion ? 150 : 200 });
    opacity.value = withTiming(1, { duration: reduceMotion ? 150 : 250 });
    scale.value = reduceMotion
      ? withTiming(1, { duration: 150 })
      : withSpring(1, { damping: 9, stiffness: 140 });

    const timer = setTimeout(
      () => {
        const dur = 250;
        scrim.value = withTiming(0, { duration: dur });
        opacity.value = withTiming(0, { duration: dur });
        scale.value = withTiming(0.7, { duration: dur }, (fin) => {
          if (fin) runOnJS(consume)();
        });
      },
      reduceMotion ? HOLD_MS_REDUCED : HOLD_MS,
    );
    return () => clearTimeout(timer);
    // `key` перезапускает эффект на каждое новое событие.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reduceMotion]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!pending) return null;

  const value = pending.value;
  const color = getFlameColor(value);
  const message =
    pending.kind === 'record' ? t('fire.newRecord') : t('fire.milestoneReached', { n: value });

  return (
    <Animated.View style={[styles.overlay, scrimStyle]} pointerEvents="none">
      <Animated.View style={[styles.card, contentStyle]}>
        <View style={styles.flameWrap}>
          {!reduceMotion &&
            PARTICLE_ANGLES.map((angle) => <Particle key={angle} angle={angle} color={color} />)}
          <Ionicons name="flame" size={72} color={color} />
        </View>
        <Text {...textProps('title')} style={[styles.number, { color }]}>
          {value}
        </Text>
        <Text {...textProps('headline')} style={styles.message}>
          {message}
        </Text>
      </Animated.View>
    </Animated.View>
  );
};

/** Одна частица пламени, разлетающаяся от центра. */
const Particle = ({ angle, color }: { angle: number; color: string }) => {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) });
  }, [p]);

  const style = useAnimatedStyle(() => {
    const dist = 70 * p.value;
    const rad = (angle * Math.PI) / 180;
    return {
      opacity: 1 - p.value,
      transform: [
        { translateX: Math.cos(rad) * dist },
        { translateY: Math.sin(rad) * dist },
        { scale: 0.4 + p.value * 0.6 },
      ],
    };
  });

  return (
    <Animated.View style={[particleStyles.particle, style]}>
      <Ionicons name="flame" size={20} color={color} />
    </Animated.View>
  );
};

const particleStyles = StyleSheet.create({
  particle: {
    position: 'absolute',
  },
});

const makeStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#00000066',
    },
    card: {
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.xxxl,
      paddingVertical: Spacing.xxl,
      borderRadius: Radius.lg,
      backgroundColor: Palette.card,
    },
    flameWrap: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    number: {
      fontSize: 40,
      fontWeight: '800',
    },
    message: {
      color: Palette.textPrimary,
      fontWeight: '600',
    },
  });
