import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePalette } from '@hooks/usePalette';
import { Radius, Spacing } from '@theme';
import { FALLBACK_LESSON_COLOR } from '@theme/colors';

type PaletteType = ReturnType<typeof usePalette>;

/** Height of GlassButton used in FloatingTopBar. */
const TOP_BAR_BUTTON_SIZE = 38;

// ─── Base bone ───────────────────────────────────────────────

interface BoneProps {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
}

const Bone = ({ width, height, borderRadius = Radius.sm }: BoneProps) => {
  const Palette = usePalette();
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: Palette.separator },
        animStyle,
      ]}
    />
  );
};

// ─── Group row skeleton ──────────────────────────────────────

export const SkeletonGroupRow = () => {
  const Palette = usePalette();
  return (
    <View
      style={[
        styles.groupCard,
        { backgroundColor: Palette.card },
      ]}
    >
      <View style={styles.groupMain}>
        <Bone width={120} height={18} />
        <Bone width={180} height={14} />
      </View>
    </View>
  );
};

// ─── Employee row skeleton ───────────────────────────────────

export const SkeletonEmployeeRow = () => {
  const Palette = usePalette();
  return (
    <View
      style={[
        styles.employeeCard,
        { backgroundColor: Palette.card },
      ]}
    >
      <Bone width={44} height={44} borderRadius={22} />
      <View style={styles.employeeMain}>
        <Bone width={160} height={18} />
        <Bone width={120} height={14} />
      </View>
    </View>
  );
};

// ─── Lesson card skeleton ────────────────────────────────────

export const SkeletonLessonCard = () => {
  const Palette = usePalette();
  return (
    <View
      style={[
        styles.lessonCard,
        { backgroundColor: Palette.card },
      ]}
    >
      <View style={[styles.stripe, { backgroundColor: FALLBACK_LESSON_COLOR }]} />
      <View style={styles.lessonBody}>
        <Bone width={80} height={14} />
        <Bone width={180} height={18} />
        <Bone width={140} height={14} />
      </View>
      <View style={styles.lessonRight}>
        <Bone width={48} height={48} borderRadius={24} />
      </View>
    </View>
  );
};

// ─── Section header skeleton ─────────────────────────────────

const SkeletonSectionHeader = () => (
  <View style={styles.sectionHeader}>
    <Bone width={130} height={14} />
  </View>
);

// ─── Day header skeleton ─────────────────────────────────────

const SkeletonDayHeader = () => (
  <View style={styles.dayHeader}>
    <Bone width={200} height={14} />
  </View>
);

// ─── Composite skeletons for screens ─────────────────────────

export const SkeletonGroupsList = () => (
  <View style={styles.list}>
    <SkeletonSectionHeader />
    <SkeletonGroupRow />
    <SkeletonGroupRow />
    <SkeletonGroupRow />
    <SkeletonGroupRow />
    <SkeletonGroupRow />
    <SkeletonSectionHeader />
    <SkeletonGroupRow />
    <SkeletonGroupRow />
    <SkeletonGroupRow />
    <SkeletonGroupRow />
    <SkeletonGroupRow />
    <SkeletonSectionHeader />
    <SkeletonGroupRow />
    <SkeletonGroupRow />
    <SkeletonGroupRow />
  </View>
);

export const SkeletonEmployeesList = () => (
  <View style={styles.list}>
    <SkeletonSectionHeader />
    <SkeletonEmployeeRow />
    <SkeletonEmployeeRow />
    <SkeletonEmployeeRow />
    <SkeletonEmployeeRow />
    <SkeletonEmployeeRow />
    <SkeletonEmployeeRow />
    <SkeletonEmployeeRow />
    <SkeletonEmployeeRow />
    <SkeletonEmployeeRow />
  </View>
);

export const SkeletonSchedule = () => {
  const insets = useSafeAreaInsets();
  const topInset = insets.top + TOP_BAR_BUTTON_SIZE + Spacing.lg;

  return (
    <View style={styles.scheduleContainer}>
      {/* Floating top bar placeholder */}
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <Bone width={TOP_BAR_BUTTON_SIZE} height={TOP_BAR_BUTTON_SIZE} borderRadius={TOP_BAR_BUTTON_SIZE / 2} />
        <View style={styles.topBarRight}>
          <Bone width={TOP_BAR_BUTTON_SIZE} height={TOP_BAR_BUTTON_SIZE} borderRadius={TOP_BAR_BUTTON_SIZE / 2} />
          <Bone width={100} height={TOP_BAR_BUTTON_SIZE} borderRadius={TOP_BAR_BUTTON_SIZE / 2} />
        </View>
      </View>

      {/* Content with matching top padding */}
      <View style={[styles.list, { paddingTop: topInset }]}>
        <SkeletonDayHeader />
        <SkeletonLessonCard />
        <SkeletonLessonCard />
        <SkeletonLessonCard />
        <SkeletonDayHeader />
        <SkeletonLessonCard />
        <SkeletonLessonCard />
        <SkeletonLessonCard />
        <SkeletonDayHeader />
        <SkeletonLessonCard />
        <SkeletonLessonCard />
      </View>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  scheduleContainer: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    zIndex: 10,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  list: {
    paddingTop: Spacing.md,
  },
  // Group row
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.cardGap,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  groupMain: {
    flex: 1,
    gap: 6,
  },
  // Employee row
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.cardGap,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.lg,
  },
  employeeMain: {
    flex: 1,
    gap: 6,
  },
  // Lesson card
  lessonCard: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.cardGap,
    overflow: 'hidden',
  },
  stripe: {
    width: 5,
  },
  lessonBody: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: 6,
  },
  lessonRight: {
    justifyContent: 'center',
    paddingRight: Spacing.lg,
  },
  // Section header
  sectionHeader: {
    paddingHorizontal: Spacing.cardPaddingX + Spacing.screenPadding - 8,
    paddingTop: Spacing.sectionTop,
    paddingBottom: Spacing.sectionBottom,
  },
  // Day header
  dayHeader: {
    paddingHorizontal: Spacing.cardPaddingX + Spacing.screenPadding - 8,
    paddingTop: Spacing.sectionTop,
    paddingBottom: Spacing.sectionBottom,
  },
});
