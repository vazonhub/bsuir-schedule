import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReduceMotion } from '@hooks/useAccessibility';
import { usePalette } from '@hooks/usePalette';
import { Radius, Spacing } from '@theme';
import { textProps } from '@theme/typography';
import { hapticLight } from '@utils/haptics';

import { useTutorial } from './TutorialContext';
import type { TargetRect } from './TutorialContext';
import type { TutorialStep } from './steps';

type PaletteType = ReturnType<typeof usePalette>;

/** Отступ подсветки вокруг элемента (pt). */
const SPOTLIGHT_PAD = 6;
/** Зазор между подсветкой и подсказкой (pt). */
const TOOLTIP_GAP = Spacing.lg;
/** Грубая оценка высоты тултипа для выбора «сверху/снизу». */
const TOOLTIP_ESTIMATE = 180;
const SCRIM_COLOR = '#000000B3';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Оверлей пошаговой обучалки. Затемняет экран четырьмя прямоугольниками
 * вокруг цели (без нативной SVG-маски), рисует анимированное кольцо-подсветку
 * и карточку-подсказку. Управляется через {@link useTutorial}.
 *
 * Должен монтироваться так, чтобы его absoluteFill совпадал с координатами
 * окна (координаты целей приходят из `measureInWindow`).
 */
export const SpotlightOverlay = () => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);

  const { active, stepIndex, steps, currentStep, next, skip, getTarget, getScroller } =
    useTutorial();

  const win = Dimensions.get('window');

  // Разрешённый прямоугольник цели (уже с паддингом). null = шаг по центру.
  // Во время повторного замера держим предыдущий rect — кольцо плавно
  // перетекает со старой цели на новую, без мигания центрированного тултипа.
  const [rect, setRect] = useState<TargetRect | null>(null);

  // Shared values подсветки — для плавного перехода кольца/затемнения.
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);
  const sw = useSharedValue(0);
  const sh = useSharedValue(0);
  const pulse = useSharedValue(0);
  const firstApplied = useRef(false);

  const isOffscreen = useCallback(
    (r: TargetRect) =>
      r.y < insets.top + Spacing.md || r.y + r.height > win.height - insets.bottom - Spacing.md,
    [insets.top, insets.bottom, win.height],
  );

  const measureKey = useCallback(
    async (step: TutorialStep): Promise<TargetRect | null> => {
      const tryKey = async (key: TutorialStep['target']) => {
        if (!key) return null;
        const handle = getTarget(key);
        return handle ? handle.measure() : null;
      };
      let r = await tryKey(step.target);
      if (!r && step.fallbackTarget) r = await tryKey(step.fallbackTarget);
      return r;
    },
    [getTarget],
  );

  // Разрешение цели текущего шага: measure → (при необходимости) scroll → re-measure.
  useEffect(() => {
    if (!active || !currentStep) {
      setRect(null);
      firstApplied.current = false;
      return;
    }
    let cancelled = false;

    const run = async () => {
      if (!currentStep.target) {
        if (!cancelled) setRect(null);
        return;
      }
      let r = await measureKey(currentStep);
      const scroller = getScroller();
      if (r && scroller && isOffscreen(r)) {
        await scroller(r);
        await delay(reduceMotion ? 60 : 260);
        if (cancelled) return;
        const r2 = await measureKey(currentStep);
        if (r2) r = r2;
      }
      if (cancelled) return;
      const padded = r
        ? {
            x: r.x - SPOTLIGHT_PAD,
            y: r.y - SPOTLIGHT_PAD,
            width: r.width + SPOTLIGHT_PAD * 2,
            height: r.height + SPOTLIGHT_PAD * 2,
          }
        : null;
      setRect(padded);
    };

    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIndex]);

  // Прокидываем разрешённый rect в shared values (первый раз — мгновенно).
  useEffect(() => {
    if (!rect) return;
    const dur = reduceMotion ? 0 : 220;
    if (!firstApplied.current) {
      sx.value = rect.x;
      sy.value = rect.y;
      sw.value = rect.width;
      sh.value = rect.height;
      firstApplied.current = true;
    } else {
      sx.value = withTiming(rect.x, { duration: dur });
      sy.value = withTiming(rect.y, { duration: dur });
      sw.value = withTiming(rect.width, { duration: dur });
      sh.value = withTiming(rect.height, { duration: dur });
    }
  }, [rect, reduceMotion, sx, sy, sw, sh]);

  // Пульсация кольца.
  useEffect(() => {
    if (!active || reduceMotion || !rect) {
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 700 }), withTiming(0, { duration: 700 })),
      -1,
      false,
    );
  }, [active, reduceMotion, rect, pulse]);

  // Хаптика на смене шага.
  useEffect(() => {
    if (active) void hapticLight();
  }, [active, stepIndex]);

  const dimTopStyle = useAnimatedStyle(() => ({ height: Math.max(0, sy.value) }));
  const dimBottomStyle = useAnimatedStyle(() => ({ top: sy.value + sh.value }));
  const dimLeftStyle = useAnimatedStyle(() => ({
    top: sy.value,
    height: sh.value,
    width: Math.max(0, sx.value),
  }));
  const dimRightStyle = useAnimatedStyle(() => ({
    top: sy.value,
    height: sh.value,
    left: sx.value + sw.value,
  }));
  const ringStyle = useAnimatedStyle(() => ({
    left: sx.value,
    top: sy.value,
    width: sw.value,
    height: sh.value,
    borderColor: Palette.accent,
    opacity: 0.6 + pulse.value * 0.4,
    transform: [{ scale: 1 + pulse.value * 0.02 }],
  }));

  if (!active || !currentStep) return null;

  const isLast = stepIndex >= steps.length - 1;
  const hasTarget = rect !== null;

  const tooltipPos = getTooltipPosition(rect, win.height, insets);

  const tooltip = (
    <View style={[styles.tooltip, tooltipPos]}>
      <Pressable
        onPress={skip}
        hitSlop={8}
        style={styles.close}
        accessibilityRole="button"
        accessibilityLabel={t('onboarding.skip')}
      >
        <Ionicons name="close" size={20} color={Palette.textTertiary} />
      </Pressable>
      <Text {...textProps('headline')} style={styles.title}>
        {t(currentStep.titleKey)}
      </Text>
      <Text {...textProps('callout')} style={styles.body}>
        {t(currentStep.bodyKey)}
      </Text>
      <View style={styles.dots}>
        {steps.map((s, i) => (
          <View key={s.key} style={[styles.dot, i === stepIndex ? styles.dotActive : null]} />
        ))}
      </View>
      <View style={styles.actions}>
        <Pressable onPress={skip} hitSlop={8} accessibilityRole="button">
          <Text {...textProps('callout')} style={styles.skip}>
            {t('onboarding.skip')}
          </Text>
        </Pressable>
        <Pressable
          onPress={next}
          style={({ pressed }) => [styles.nextBtn, pressed && styles.nextBtnPressed]}
          accessibilityRole="button"
        >
          <Text {...textProps('body')} style={styles.nextLabel}>
            {isLast ? t('onboarding.done') : t('onboarding.next')}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {hasTarget ? (
        <>
          <Animated.View style={[styles.dimTop, dimTopStyle]} />
          <Animated.View style={[styles.dimBottom, dimBottomStyle]} />
          <Animated.View style={[styles.dimLeft, dimLeftStyle]} />
          <Animated.View style={[styles.dimRight, dimRightStyle]} />
          {/* Тап по подсвеченному элементу тоже ведёт дальше. */}
          <Animated.View style={[styles.ringWrap, ringStyle]} pointerEvents="box-none">
            <Pressable style={StyleSheet.absoluteFill} onPress={next} />
          </Animated.View>
        </>
      ) : (
        <View style={styles.scrimFull} />
      )}
      {tooltip}
    </View>
  );
};

/** Позиционирование тултипа: под целью, если снизу есть место, иначе над ней. */
const getTooltipPosition = (
  rect: TargetRect | null,
  winHeight: number,
  insets: { top: number; bottom: number },
) => {
  if (!rect) {
    return { top: winHeight / 2 - TOOLTIP_ESTIMATE / 2, alignSelf: 'center' as const };
  }
  const below = rect.y + rect.height + TOOLTIP_GAP;
  const roomBelow = winHeight - insets.bottom - below;
  if (roomBelow >= TOOLTIP_ESTIMATE) {
    return { top: below };
  }
  return { bottom: winHeight - rect.y + TOOLTIP_GAP };
};

const makeStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    dimTop: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      backgroundColor: SCRIM_COLOR,
    },
    dimBottom: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: SCRIM_COLOR,
    },
    dimLeft: {
      position: 'absolute',
      left: 0,
      backgroundColor: SCRIM_COLOR,
    },
    dimRight: {
      position: 'absolute',
      right: 0,
      backgroundColor: SCRIM_COLOR,
    },
    scrimFull: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: SCRIM_COLOR,
    },
    ringWrap: {
      position: 'absolute',
      borderWidth: 2,
      borderRadius: Radius.lg,
    },
    tooltip: {
      position: 'absolute',
      left: Spacing.screenPadding,
      right: Spacing.screenPadding,
      backgroundColor: Palette.card,
      borderRadius: Radius.lg,
      paddingHorizontal: Spacing.cardPaddingX,
      paddingVertical: Spacing.xl,
      gap: Spacing.md,
    },
    close: {
      position: 'absolute',
      top: Spacing.md,
      right: Spacing.md,
      padding: Spacing.xs,
      zIndex: 1,
    },
    title: {
      color: Palette.textPrimary,
      fontWeight: '700',
      paddingRight: Spacing.xxl,
    },
    body: {
      color: Palette.textSecondary,
      lineHeight: 20,
    },
    dots: {
      flexDirection: 'row',
      gap: Spacing.xs,
      paddingVertical: Spacing.xs,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: Radius.pill,
      backgroundColor: Palette.textTertiary,
      opacity: 0.4,
    },
    dotActive: {
      opacity: 1,
      backgroundColor: Palette.accent,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: Spacing.xs,
    },
    skip: {
      color: Palette.textSecondary,
      fontWeight: '600',
    },
    nextBtn: {
      paddingHorizontal: Spacing.xxl,
      paddingVertical: Spacing.md,
      borderRadius: Radius.md,
      backgroundColor: Palette.accent,
    },
    nextBtnPressed: {
      opacity: 0.7,
    },
    nextLabel: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
  });
