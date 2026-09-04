import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useIsDark, usePalette } from '@hooks/usePalette';
import { useDiaryStore, DIARY_TASK_TYPES } from '@stores/diary.store';
import type { DiaryTaskType } from '@stores/diary.store';
import { Radius, Spacing } from '@theme';
import { LESSON_TYPE_COLORS } from '@theme/colors';
import { textProps } from '@theme/typography';
import type { DiarySubject } from '@utils/diary';
import { hapticSuccess } from '@utils/haptics';

type PaletteType = ReturnType<typeof usePalette>;

interface PresentPayload {
  /** If provided, sheet opens in edit mode with this item pre-selected. */
  editingId?: string;
  editingSubject?: string;
  editingType?: DiaryTaskType;
  editingTaskIndex?: number;
}

export interface AddPlannerSheetRef {
  present(payload?: PresentPayload): void;
  dismiss(): void;
}

interface Props {
  groupName: string;
  subjects: DiarySubject[];
  onAdded?: () => void;
}

/**
 * Bottom sheet — pick a subject (only those with `taskCount > 0`) and a task
 * number that isn't already in the planner. Grid state is shown for context
 * (green = already done), but done tasks are still selectable — the store
 * dedupes on add.
 */
export const AddPlannerSheet = forwardRef<AddPlannerSheetRef, Props>(
  ({ groupName, subjects, onAdded }, ref) => {
    const { t } = useTranslation();
    const Palette = usePalette();
    const isDark = useIsDark();
    const styles = useMemo(() => makeStyles(Palette, isDark), [Palette, isDark]);
    const sheetRef = useRef<BottomSheetModal>(null);
    const [step, setStep] = useState<'subject' | 'index'>('subject');
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const snapPoints = useMemo(() => ['65%'], []);

    const addPlannerItem = useDiaryStore((s) => s.addPlannerItem);
    const replacePlannerItem = useDiaryStore((s) => s.replacePlannerItem);
    const progress = useDiaryStore((s) => s.progress[groupName]);
    const planner = useDiaryStore((s) => s.planner[groupName]);

    useImperativeHandle(ref, () => ({
      present: (payload) => {
        if (payload?.editingId) {
          setEditingId(payload.editingId);
          setSelectedSubject(payload.editingSubject ?? null);
          setStep(payload.editingSubject ? 'index' : 'subject');
        } else {
          setEditingId(null);
          setSelectedSubject(null);
          setStep('subject');
        }
        sheetRef.current?.present();
      },
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    // Subjects that have a taskCount set for at least one type (planner needs
    // indices to point to).
    const eligibleSubjects = useMemo(
      () =>
        subjects.filter((s) => {
          const p = progress?.[s.subject];
          return (
            p && DIARY_TASK_TYPES.some((tp) => p[tp]?.taskCount != null && p[tp].taskCount > 0)
          );
        }),
      [subjects, progress],
    );

    const subjectProgress = selectedSubject ? progress?.[selectedSubject] : undefined;
    // Task types available for the selected subject (those with a count set).
    const availableTypes = useMemo(
      () =>
        DIARY_TASK_TYPES.filter((tp) => {
          const c = subjectProgress?.[tp]?.taskCount;
          return c != null && c > 0;
        }),
      [subjectProgress],
    );

    // "already in planner" set keyed by `${type}#${index}`.
    const inPlannerSet = useMemo(() => {
      const set = new Set<string>();
      for (const it of planner ?? []) {
        // In edit mode, don't count our OWN slot as "already in planner".
        if (editingId && it.id === editingId) continue;
        if (it.subject === selectedSubject) set.add(`${it.type}#${it.taskIndex}`);
      }
      return set;
    }, [planner, selectedSubject, editingId]);

    const handleSubjectPick = (subject: string) => {
      setSelectedSubject(subject);
      setStep('index');
    };

    const handleIndexPick = (type: DiaryTaskType, index: number) => {
      if (!selectedSubject) return;
      if (inPlannerSet.has(`${type}#${index}`)) return;
      void hapticSuccess();
      if (editingId) {
        replacePlannerItem(groupName, editingId, selectedSubject, type, index);
      } else {
        addPlannerItem(groupName, selectedSubject, type, index);
      }
      sheetRef.current?.dismiss();
      onAdded?.();
    };

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        backgroundStyle={{ backgroundColor: Palette.card }}
        handleIndicatorStyle={{ backgroundColor: Palette.textTertiary }}
      >
        <View style={styles.header}>
          {step === 'index' && (
            <Pressable
              onPress={() => {
                setStep('subject');
                setSelectedSubject(null);
              }}
              hitSlop={8}
              style={styles.back}
            >
              <Ionicons name="chevron-back" size={22} color={Palette.textPrimary} />
            </Pressable>
          )}
          <Text {...textProps('title')} style={styles.title}>
            {editingId
              ? t('diary.plannerEditTitle')
              : step === 'subject'
                ? t('diary.plannerPickSubject')
                : t('diary.plannerPickTask')}
          </Text>
        </View>

        {step === 'subject' ? (
          <BottomSheetScrollView contentContainerStyle={styles.content}>
            {eligibleSubjects.length === 0 ? (
              <View style={styles.empty}>
                <Text {...textProps('callout')} style={styles.emptyText}>
                  {t('diary.plannerNoEligible')}
                </Text>
              </View>
            ) : (
              eligibleSubjects.map((subject) => (
                <Pressable
                  key={subject.subject}
                  onPress={() => handleSubjectPick(subject.subject)}
                  style={({ pressed }) => [styles.subjectRow, pressed && styles.subjectRowPressed]}
                >
                  <Text {...textProps('body')} style={styles.subjectCode}>
                    {subject.subject}
                  </Text>
                  <Text {...textProps('footnote')} style={styles.subjectFull} numberOfLines={1}>
                    {subject.subjectFullName}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={Palette.textTertiary} />
                </Pressable>
              ))
            )}
          </BottomSheetScrollView>
        ) : (
          <BottomSheetScrollView contentContainerStyle={styles.content}>
            {availableTypes.map((type) => {
              const typeProgress = subjectProgress?.[type];
              const taskCount = typeProgress?.taskCount ?? 0;
              const completedSet = new Set(typeProgress?.completed ?? []);
              const color = LESSON_TYPE_COLORS[type];
              return (
                <View key={type} style={styles.typeBlock}>
                  <View style={[styles.typeTag, { backgroundColor: color + '1F' }]}>
                    <View style={[styles.typeDot, { backgroundColor: color }]} />
                    <Text {...textProps('subhead')} style={[styles.typeTagLabel, { color }]}>
                      {type}
                    </Text>
                  </View>
                  <View style={styles.indexGrid}>
                    {Array.from({ length: taskCount }, (_, i) => i + 1).map((idx) => {
                      const done = completedSet.has(idx);
                      const inPlanner = inPlannerSet.has(`${type}#${idx}`);
                      return (
                        <Pressable
                          key={idx}
                          onPress={() => handleIndexPick(type, idx)}
                          disabled={inPlanner}
                          style={({ pressed }) => [
                            styles.indexCell,
                            done && styles.indexCellDone,
                            inPlanner && styles.indexCellInPlanner,
                            pressed && !inPlanner && styles.indexCellPressed,
                          ]}
                        >
                          <Text
                            {...textProps('body')}
                            style={[
                              styles.indexText,
                              done && styles.indexTextDone,
                              inPlanner && styles.indexTextInPlanner,
                            ]}
                          >
                            {idx}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </BottomSheetScrollView>
        )}
      </BottomSheetModal>
    );
  },
);
AddPlannerSheet.displayName = 'AddPlannerSheet';

const GREEN = LESSON_TYPE_COLORS['ЛК']; // reuse "done" green
const DONE_CELL_BG_DARK = 'rgba(63,179,111,0.28)';
const DONE_CELL_BG_LIGHT = 'rgba(63,179,111,0.18)';
const DONE_TEXT_DARK = '#7FD79E';
const DONE_TEXT_LIGHT = '#1F7A45';

const makeStyles = (Palette: PaletteType, isDark: boolean) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingHorizontal: Spacing.xxl,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.md,
    },
    back: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      flex: 1,
      fontSize: 18,
      fontWeight: '700',
      color: Palette.textPrimary,
    },
    content: {
      paddingHorizontal: Spacing.xxl,
      paddingBottom: Spacing.xxxl,
      gap: Spacing.cardGap,
    },
    empty: {
      alignItems: 'center',
      paddingVertical: Spacing.xxxl,
    },
    emptyText: {
      color: Palette.textSecondary,
      textAlign: 'center',
    },
    subjectRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: Palette.background,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    subjectRowPressed: { backgroundColor: Palette.cardPressed },
    subjectCode: {
      fontSize: 15,
      fontWeight: '700',
      color: Palette.textPrimary,
    },
    subjectFull: {
      flex: 1,
      color: Palette.textSecondary,
    },
    typeBlock: {
      gap: Spacing.md,
      marginBottom: Spacing.md,
    },
    typeTag: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
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
    indexGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    indexCell: {
      width: 44,
      height: 44,
      borderRadius: Radius.md,
      backgroundColor: Palette.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    indexCellPressed: { backgroundColor: Palette.cardPressed },
    indexCellDone: {
      backgroundColor: isDark ? DONE_CELL_BG_DARK : DONE_CELL_BG_LIGHT,
    },
    indexCellInPlanner: {
      opacity: 0.45,
    },
    indexText: {
      fontSize: 15,
      fontWeight: '600',
      color: Palette.textPrimary,
    },
    indexTextDone: {
      color: isDark ? DONE_TEXT_DARK : DONE_TEXT_LIGHT,
    },
    indexTextInPlanner: {
      color: Palette.textTertiary,
    },
    // GREEN preserved for potential future accents (e.g. "in planner" badge).
    _reserved: { backgroundColor: GREEN },
  });
