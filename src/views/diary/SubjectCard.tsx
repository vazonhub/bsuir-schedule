import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { useTutorialTarget } from '@components/onboarding/useTutorialTarget';
import { FireController } from '@controllers/fire.controller';
import { useReduceMotion } from '@hooks/useAccessibility';
import { usePalette } from '@hooks/usePalette';
import { useDiaryStore, selectSubjectProgress, DIARY_TASK_TYPES } from '@stores/diary.store';
import type { DiaryTaskType } from '@stores/diary.store';
import type { SubgroupChoice } from '@stores/preferences.store';
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
  /** Selected subgroup (0 = all). Enables the "shared vs subgroup" split line. */
  subgroup: SubgroupChoice;
  onRequestEnterCount(
    subject: string,
    subjectFullName: string,
    type: DiaryTaskType,
    initial: number | null,
  ): void;
  /** Open the markdown note for a specific task (long-press on a grid cell). */
  onRequestNote(subject: string, subjectFullName: string, type: DiaryTaskType, index: number): void;
  /** Register this card as a tutorial target (first visible card only). */
  isTutorialTarget?: boolean;
}

export const SubjectCard = ({
  subject,
  groupName,
  subgroup,
  onRequestEnterCount,
  onRequestNote,
  isTutorialTarget = false,
}: Props) => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  const reduceMotion = useReduceMotion();
  const progress = useDiaryStore(selectSubjectProgress(groupName, subject.subject));
  const toggleTask = useDiaryStore((s) => s.toggleTask);
  const resetSubject = useDiaryStore((s) => s.resetSubject);
  const toggleHidden = useDiaryStore((s) => s.toggleHidden);

  // Task types worth showing for this subject: those that occur in the schedule
  // or already have a count entered by the user.
  const taskTypes = useMemo(
    () => DIARY_TASK_TYPES.filter((tp) => subject.total[tp] > 0 || progress[tp].taskCount != null),
    [subject.total, progress],
  );
  const hasCount = taskTypes.some((tp) => {
    const c = progress[tp].taskCount;
    return c != null && c > 0;
  });

  // Shared vs subgroup breakdown of remaining lessons — only shown when a
  // subgroup is selected and the subject has subgroup-specific lessons (labs,
  // sometimes practicals). One compact line per type, so the card stays light.
  const splitLines = useMemo(() => {
    if (subgroup === 0) return [];
    return DIARY_LESSON_TYPES.filter((tp) => subject.remainingSubgroup[tp] > 0).map((tp) => ({
      type: tp,
      shared: subject.remainingShared[tp],
      sub: subject.remainingSubgroup[tp],
    }));
  }, [subgroup, subject.remainingShared, subject.remainingSubgroup]);

  // ── Tutorial targets (first visible card only) ──
  const cardTutorialRef = useTutorialTarget('subjectCard', isTutorialTarget);
  const enterTutorialRef = useTutorialTarget('enterCount', isTutorialTarget && !hasCount);
  const completeTutorialRef = useTutorialTarget('completeTask', isTutorialTarget && hasCount);

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
    backgroundColor: bg.value > 0.5 ? Palette.cardPressed : Palette.card,
  }));

  /* eslint-disable react-hooks/immutability -- Reanimated shared values are mutated via .value by API design */
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
  /* eslint-enable react-hooks/immutability */

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

    // Per-type count entry/edit now lives inline on each grid; the long-press
    // menu keeps the whole-subject actions (reset / hide).
    const actions = [];
    if (hasCount) {
      actions.push({
        text: t('diary.actionReset'),
        style: 'destructive' as const,
        onPress: () => {
          void hapticLight();
          resetSubject(groupName, subject.subject);
        },
      });
    }
    actions.push(hideAction, cancelAction);
    Alert.alert(t('diary.actionsTitle'), subject.subjectFullName, actions);
  };

  return (
    <Animated.View style={[styles.cardWrap, animStyle]}>
      <Pressable
        ref={cardTutorialRef}
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
            {splitLines.length > 0 && (
              <View style={styles.splitBlock}>
                {splitLines.map(({ type, shared, sub }) => (
                  <Text key={type} {...textProps('footnote')} style={styles.splitLine}>
                    <Text style={[styles.splitType, { color: LESSON_TYPE_COLORS[type] }]}>
                      {type}
                    </Text>{' '}
                    {t('diary.subgroupSplit', { shared, sub })}
                  </Text>
                ))}
              </View>
            )}
          </View>

          {taskTypes.length > 0 && <View style={styles.separator} />}

          {/* ── Bottom: one enter-count button OR grid per task type (ЛР / ПЗ) ── */}
          <View ref={hasCount ? completeTutorialRef : enterTutorialRef} style={styles.typeSections}>
            {taskTypes.map((type) => {
              const tprog = progress[type];
              const count = tprog.taskCount;
              const typeHasCount = count != null && count > 0;
              const color = LESSON_TYPE_COLORS[type];
              return (
                <View key={type} style={styles.typeSection}>
                  <View style={styles.typeHeaderRow}>
                    <View style={[styles.typeTag, { backgroundColor: color + '1F' }]}>
                      <View style={[styles.typeDot, { backgroundColor: color }]} />
                      <Text {...textProps('subhead')} style={[styles.typeTagLabel, { color }]}>
                        {type}
                      </Text>
                    </View>
                    {typeHasCount && (
                      <Text {...textProps('footnote')} style={styles.typeProgress}>
                        {tprog.completed.length}/{count}
                      </Text>
                    )}
                    <View style={styles.typeHeaderSpacer} />
                    {typeHasCount && (
                      <Pressable
                        hitSlop={8}
                        onPress={() =>
                          onRequestEnterCount(subject.subject, subject.subjectFullName, type, count)
                        }
                        accessibilityRole="button"
                        accessibilityLabel={t('diary.actionEdit')}
                      >
                        <Ionicons name="pencil" size={15} color={Palette.textTertiary} />
                      </Pressable>
                    )}
                  </View>
                  {typeHasCount ? (
                    <TaskGrid
                      count={count}
                      completed={tprog.completed}
                      noted={
                        tprog.notes ? new Set(Object.keys(tprog.notes).map(Number)) : undefined
                      }
                      onLongPress={(idx) =>
                        onRequestNote(subject.subject, subject.subjectFullName, type, idx)
                      }
                      onToggle={(idx) => {
                        const wasDone = tprog.completed.includes(idx);
                        toggleTask(groupName, subject.subject, type, idx);
                        // Marking a task as done = activity for the fire streak.
                        if (!wasDone) FireController.registerHomework();
                      }}
                    />
                  ) : (
                    <Pressable
                      onPress={() =>
                        onRequestEnterCount(subject.subject, subject.subjectFullName, type, null)
                      }
                      style={({ pressed }) => [styles.enterBtn, pressed && styles.enterBtnPressed]}
                    >
                      <Text {...textProps('body')} style={styles.enterBtnLabel}>
                        {t('diary.enterTaskCount')}
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
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
    splitBlock: {
      marginTop: 2,
      gap: 1,
    },
    splitLine: {
      color: Palette.textTertiary,
    },
    splitType: {
      fontWeight: '700',
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
    typeSections: {
      gap: Spacing.lg,
    },
    typeSection: {
      gap: Spacing.sm,
    },
    typeHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    typeTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.md,
      paddingVertical: 3,
      borderRadius: Radius.pill,
    },
    typeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    typeTagLabel: {
      fontSize: 13,
      fontWeight: '700',
    },
    typeProgress: {
      color: Palette.textSecondary,
      fontWeight: '600',
    },
    typeHeaderSpacer: {
      flex: 1,
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
