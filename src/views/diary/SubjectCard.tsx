import { useCallback, useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { useReduceMotion } from '@hooks/useAccessibility';
import { usePalette } from '@hooks/usePalette';
import { useDiaryStore, selectSubjectProgress } from '@stores/diary.store';
import { Radius, Spacing } from '@theme';
import { LESSON_TYPE_COLORS } from '@theme/colors';
import { textProps } from '@theme/typography';
import { DIARY_LESSON_TYPES } from '@utils/diary';
import type { DiarySubject, DiaryLessonType } from '@utils/diary';
import { hapticLight, hapticMedium } from '@utils/haptics';

import { TaskGrid } from './TaskGrid';

type PaletteType = ReturnType<typeof usePalette>;

interface Props {
  subject: DiarySubject;
  groupName: string;
  onRequestEnterCount(subject: string, subjectFullName: string, initial: number | null): void;
}

export const SubjectCard = ({ subject, groupName, onRequestEnterCount }: Props) => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  const reduceMotion = useReduceMotion();
  const progress = useDiaryStore(selectSubjectProgress(groupName, subject.subject));
  const toggleTask = useDiaryStore((s) => s.toggleTask);
  const resetSubject = useDiaryStore((s) => s.resetSubject);
  const toggleHidden = useDiaryStore((s) => s.toggleHidden);

  const hasCount = progress.taskCount != null && progress.taskCount > 0;

  // ── Press-and-hold animation ──
  // Immediate light "press" (scale 0.99 + bg swap) at touch-down, then a
  // slower shrink toward long-press threshold so the user can feel that
  // holding does something.
  const scale = useSharedValue(1);
  const bg = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor:
      bg.value > 0.5 ? Palette.cardPressed : Palette.card,
  }));

  const handlePressIn = useCallback(() => {
    if (reduceMotion) {
      bg.value = 1;
      return;
    }
    bg.value = withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) });
    scale.value = withTiming(0.985, { duration: 120, easing: Easing.out(Easing.quad) });
    // Slow secondary shrink that hints "keep holding".
    scale.value = withTiming(0.96, { duration: 350, easing: Easing.inOut(Easing.quad) });
  }, [reduceMotion, bg, scale]);

  const handlePressOut = useCallback(() => {
    if (reduceMotion) {
      bg.value = 0;
      scale.value = 1;
      return;
    }
    bg.value = withTiming(0, { duration: 160, easing: Easing.out(Easing.quad) });
    scale.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
  }, [reduceMotion, bg, scale]);

  const handleLongPress = () => {
    void hapticMedium();
    const hideAction = {
      text: t('diary.actionHide'),
      onPress: () => {
        void hapticLight();
        toggleHidden(groupName, subject.subject);
      },
    } as const;
    const cancelAction = { text: t('common.cancel'), style: 'cancel' as const };

    if (!hasCount) {
      Alert.alert(t('diary.actionsTitle'), subject.subjectFullName, [
        {
          text: t('diary.actionEnter'),
          onPress: () =>
            onRequestEnterCount(subject.subject, subject.subjectFullName, null),
        },
        hideAction,
        cancelAction,
      ]);
      return;
    }
    Alert.alert(t('diary.actionsTitle'), subject.subjectFullName, [
      {
        text: t('diary.actionEdit'),
        onPress: () =>
          onRequestEnterCount(
            subject.subject,
            subject.subjectFullName,
            progress.taskCount,
          ),
      },
      {
        text: t('diary.actionReset'),
        style: 'destructive',
        onPress: () => {
          void hapticLight();
          resetSubject(groupName, subject.subject);
        },
      },
      hideAction,
      cancelAction,
    ]);
  };

  return (
    <Animated.View style={[styles.cardWrap, animStyle]}>
      <Pressable
        onLongPress={handleLongPress}
        delayLongPress={350}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        // Delay before the press-in visual so a plain tap on a grid cell
        // doesn't briefly shrink the entire card.
        unstable_pressDelay={80}
      >
        <Animated.View style={[styles.card, bgStyle]}>
      {/* ── Top: subject code (left) + counters (right), full name below ── */}
      <View style={styles.topBlock}>
        <View style={styles.headerRow}>
          <Text {...textProps('title')} style={styles.subjectCode} numberOfLines={1}>
            {subject.subject}
          </Text>
          <View style={styles.countersBlock}>
            {DIARY_LESSON_TYPES.map((type) => {
              const remaining = subject.remaining[type];
              const total = subject.total[type];
              if (total === 0) return null;
              return <CounterPill key={type} type={type} value={remaining} />;
            })}
          </View>
        </View>
        <Text {...textProps('footnote')} style={styles.subjectFull} numberOfLines={2}>
          {subject.subjectFullName}
        </Text>
      </View>

      <View style={styles.separator} />

      {/* ── Bottom: enter-count button OR grid ── */}
      {!hasCount ? (
        <Pressable
          onPress={() =>
            onRequestEnterCount(subject.subject, subject.subjectFullName, null)
          }
          style={({ pressed }) => [
            styles.enterBtn,
            pressed && styles.enterBtnPressed,
          ]}
        >
          <Text {...textProps('body')} style={styles.enterBtnLabel}>
            {t('diary.enterTaskCount')}
          </Text>
        </Pressable>
      ) : (
        <TaskGrid
          count={progress.taskCount as number}
          completed={progress.completed}
          onToggle={(idx) => toggleTask(groupName, subject.subject, idx)}
        />
      )}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────

const CounterPill = ({ type, value }: { type: DiaryLessonType; value: number }) => {
  const Palette = usePalette();
  const color = LESSON_TYPE_COLORS[type];
  const styles = useMemo(() => makePillStyles(Palette), [Palette]);
  return (
    <View style={[styles.pill, { backgroundColor: color + '1F' }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text {...textProps('subhead')} style={[styles.label, { color }]}>
        {type} {value}
      </Text>
    </View>
  );
};

const makePillStyles = (_Palette: PaletteType) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.md,
      paddingVertical: 4,
      borderRadius: Radius.pill,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    label: {
      fontSize: 13,
      fontWeight: '700',
    },
  });

const makeStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    cardWrap: {
      borderRadius: Radius.lg,
      // Own the round-corner clip so the animated background never leaks past.
      overflow: 'hidden',
    },
    card: {
      backgroundColor: Palette.card,
      borderRadius: Radius.lg,
      paddingHorizontal: Spacing.cardPaddingX,
      paddingVertical: Spacing.cardPaddingY,
      gap: Spacing.lg,
    },
    topBlock: {
      gap: 4,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    subjectCode: {
      flexShrink: 0,
      fontSize: 20,
      fontWeight: '700',
      color: Palette.textPrimary,
    },
    subjectFull: {
      color: Palette.textSecondary,
    },
    countersBlock: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      flexWrap: 'wrap',
      gap: Spacing.xs,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: Palette.separator,
    },
    enterBtn: {
      backgroundColor: Palette.background,
      borderRadius: Radius.md,
      paddingVertical: Spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    enterBtnPressed: {
      backgroundColor: Palette.cardPressed,
    },
    enterBtnLabel: {
      color: Palette.accent,
      fontSize: 15,
      fontWeight: '600',
    },
  });
