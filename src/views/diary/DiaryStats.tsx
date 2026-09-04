import { Ionicons } from '@expo/vector-icons';
import { useMemo, useRef } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTutorialTarget } from '@components/onboarding/useTutorialTarget';
import { FireController } from '@controllers/fire.controller';
import { usePalette } from '@hooks/usePalette';
import {
  useDiaryStore,
  selectPlanner,
  selectSubjectProgress,
  DIARY_TASK_TYPES,
} from '@stores/diary.store';
import type { DiaryTaskType, PlannerItem } from '@stores/diary.store';
import { Radius, Spacing } from '@theme';
import { LESSON_TYPE_COLORS } from '@theme/colors';
import { textProps } from '@theme/typography';
import type { DiarySubject } from '@utils/diary';
import { hapticLight } from '@utils/haptics';

import { AddPlannerSheet } from './AddPlannerSheet';
import type { AddPlannerSheetRef } from './AddPlannerSheet';
import { DraggablePlannerList } from './DraggablePlannerList';

type PaletteType = ReturnType<typeof usePalette>;

const PLANNER_ITEM_HEIGHT = 52;
const PLANNER_GAP = 6;

interface Props {
  groupName: string;
  subjects: DiarySubject[];
}

/** One checked-off task shown in the "Completed" column. */
interface CompletedTask {
  subject: string;
  type: DiaryTaskType;
  index: number;
}

export const DiaryStats = ({ groupName, subjects }: Props) => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  const addSheetRef = useRef<AddPlannerSheetRef>(null);
  const plannerRef = useTutorialTarget('planner');

  const planner = useDiaryStore(selectPlanner(groupName));
  const progress = useDiaryStore((s) => s.progress[groupName]);
  const reorderPlanner = useDiaryStore((s) => s.reorderPlanner);
  const removePlannerItem = useDiaryStore((s) => s.removePlannerItem);
  const toggleTask = useDiaryStore((s) => s.toggleTask);

  // Flattened list of every completed task across the group's subjects, sorted
  // by subject → type → index, for the right "Completed" column.
  const completed = useMemo<CompletedTask[]>(() => {
    if (!progress) return [];
    const out: CompletedTask[] = [];
    for (const [subject, entry] of Object.entries(progress)) {
      for (const type of DIARY_TASK_TYPES) {
        for (const index of entry[type]?.completed ?? []) {
          out.push({ subject, type, index });
        }
      }
    }
    out.sort(
      (a, b) =>
        a.subject.localeCompare(b.subject, 'ru', { sensitivity: 'base' }) ||
        a.type.localeCompare(b.type) ||
        a.index - b.index,
    );
    return out;
  }, [progress]);

  const handleReorder = (next: PlannerItem[]) => {
    void hapticLight();
    reorderPlanner(groupName, next);
  };

  const handleAdd = () => {
    addSheetRef.current?.present();
  };

  const handleEditItem = (item: PlannerItem) => {
    addSheetRef.current?.present({
      editingId: item.id,
      editingSubject: item.subject,
      editingType: item.type,
      editingTaskIndex: item.taskIndex,
    });
  };

  const handleLongPressAction = (item: PlannerItem) => {
    Alert.alert(t('diary.actionsTitle'), `${item.subject} ${item.type} №${item.taskIndex}`, [
      {
        text: t('diary.plannerRemove'),
        style: 'destructive',
        onPress: () => removePlannerItem(groupName, item.id),
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.columns}>
        {/* ── Left: Planner ── */}
        <View ref={plannerRef} style={styles.column}>
          <Text {...textProps('footnote')} style={styles.columnTitle}>
            {t('diary.plannerTitle')}
          </Text>
          {planner.length > 0 ? (
            <DraggablePlannerList
              items={planner}
              itemHeight={PLANNER_ITEM_HEIGHT}
              gap={PLANNER_GAP}
              onReorder={handleReorder}
              renderItem={(item) => (
                <PlannerCard
                  item={item}
                  groupName={groupName}
                  onEdit={() => handleEditItem(item)}
                  onLongPressAction={() => handleLongPressAction(item)}
                  onToggleTask={() =>
                    toggleTask(groupName, item.subject, item.type, item.taskIndex)
                  }
                />
              )}
            />
          ) : (
            <View style={styles.plannerEmpty}>
              <Text {...textProps('footnote')} style={styles.plannerEmptyText}>
                {t('diary.plannerEmpty')}
              </Text>
            </View>
          )}
          <Pressable
            onPress={handleAdd}
            style={({ pressed }) => [
              styles.addBtn,
              { height: PLANNER_ITEM_HEIGHT },
              pressed && styles.addBtnPressed,
            ]}
          >
            <Ionicons name="add" size={18} color={Palette.accent} />
            <Text {...textProps('footnote')} style={styles.addBtnLabel} numberOfLines={1}>
              {t('diary.plannerAdd')}
            </Text>
          </Pressable>
        </View>

        {/* ── Right: Completed ── */}
        <View style={styles.column}>
          <Text {...textProps('footnote')} style={styles.columnTitle}>
            {t('diary.completedTitle')}
          </Text>
          {completed.length === 0 ? (
            <View style={styles.plannerEmpty}>
              <Text {...textProps('footnote')} style={styles.plannerEmptyText}>
                {t('diary.completedEmpty')}
              </Text>
            </View>
          ) : (
            <View style={styles.completedList}>
              {completed.map((task) => (
                <CompletedCard
                  key={`${task.subject}#${task.type}#${task.index}`}
                  task={task}
                  onPress={() => {
                    void hapticLight();
                    // Tapping un-completes the task (moves it back out of here).
                    toggleTask(groupName, task.subject, task.type, task.index);
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.divider} />

      <AddPlannerSheet ref={addSheetRef} groupName={groupName} subjects={subjects} />
    </View>
  );
};

// ─────────────────────────────────────────────────────────────

const PlannerCard = ({
  item,
  groupName,
  onEdit,
  onLongPressAction,
  onToggleTask,
}: {
  item: PlannerItem;
  groupName: string;
  onEdit(): void;
  onLongPressAction(): void;
  onToggleTask(): void;
}) => {
  const Palette = usePalette();
  const styles = useMemo(() => makeMiniCardStyles(Palette), [Palette]);
  const progress = useDiaryStore(selectSubjectProgress(groupName, item.subject));
  const done = progress[item.type].completed.includes(item.taskIndex);
  const typeColor = LESSON_TYPE_COLORS[item.type];

  return (
    <Pressable
      onPress={onEdit}
      onLongPress={onLongPressAction}
      delayLongPress={500}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.plannerRow}>
        <View style={styles.plannerInfo}>
          <Text {...textProps('body')} style={styles.subject} numberOfLines={1}>
            {item.subject}
          </Text>
          <Text {...textProps('footnote')} style={[styles.itemType, { color: typeColor }]}>
            {item.type}
          </Text>
        </View>
        <TaskCell
          number={item.taskIndex}
          done={done}
          onPress={() => {
            onToggleTask();
            // Marking a task as done = activity for the fire streak (unchecking is not).
            if (!done) FireController.registerHomework();
          }}
        />
      </View>
    </Pressable>
  );
};

const CompletedCard = ({ task, onPress }: { task: CompletedTask; onPress(): void }) => {
  const Palette = usePalette();
  const styles = useMemo(() => makeMiniCardStyles(Palette), [Palette]);
  const typeColor = LESSON_TYPE_COLORS[task.type];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { height: PLANNER_ITEM_HEIGHT },
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ checked: true }}
      accessibilityLabel={`${task.subject} ${task.type} №${task.index}`}
    >
      <View style={styles.plannerRow}>
        <View style={styles.plannerInfo}>
          <Text {...textProps('body')} style={styles.subject} numberOfLines={1}>
            {task.subject}
          </Text>
          <Text {...textProps('footnote')} style={[styles.itemType, { color: typeColor }]}>
            {task.type} №{task.index}
          </Text>
        </View>
        <Ionicons name="checkmark-circle" size={22} color={DONE_ACCENT} />
      </View>
    </Pressable>
  );
};

// Small tappable cell mirroring TaskGrid — sits inside a planner card.
const TASK_CELL_HEIGHT = 30;
const TASK_CELL_MIN_WIDTH = 40;

const TaskCell = ({
  number,
  done,
  onPress,
}: {
  number: number;
  done: boolean;
  onPress(): void;
}) => {
  const Palette = usePalette();
  const isDark = Palette.background === '#000000';
  const styles = useMemo(() => makeTaskCellStyles(Palette, isDark), [Palette, isDark]);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cell,
        done ? styles.cellDone : styles.cellIdle,
        pressed && !done && styles.cellPressed,
        pressed && done && styles.cellDonePressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ checked: done }}
      accessibilityLabel={`Задание ${number}${done ? ', выполнено' : ''}`}
    >
      <Text {...textProps('subhead')} style={[styles.cellText, done && styles.cellTextDone]}>
        {number}
      </Text>
    </Pressable>
  );
};

// ─────────────────────────────────────────────────────────────

const DONE_ACCENT = '#3FB36F';

const makeMiniCardStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    card: {
      backgroundColor: Palette.card,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      gap: 2,
      justifyContent: 'center',
      flex: 1,
    },
    cardPressed: { backgroundColor: Palette.cardPressed },
    plannerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    plannerInfo: {
      flex: 1,
      gap: 1,
    },
    subject: {
      fontSize: 14,
      fontWeight: '700',
      color: Palette.textPrimary,
    },
    itemType: {
      fontSize: 11,
      fontWeight: '700',
    },
  });

const DONE_BG_LIGHT = 'rgba(63, 179, 111, 0.18)';
const DONE_BG_DARK = 'rgba(63, 179, 111, 0.28)';
const DONE_BG_PRESSED_LIGHT = 'rgba(63, 179, 111, 0.30)';
const DONE_BG_PRESSED_DARK = 'rgba(63, 179, 111, 0.40)';
const DONE_TEXT_LIGHT = '#1F7A45';
const DONE_TEXT_DARK = '#7FD79E';

const makeTaskCellStyles = (Palette: PaletteType, isDark: boolean) =>
  StyleSheet.create({
    cell: {
      height: TASK_CELL_HEIGHT,
      minWidth: TASK_CELL_MIN_WIDTH,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cellIdle: {
      backgroundColor: Palette.background,
    },
    cellPressed: {
      backgroundColor: Palette.cardPressed,
    },
    cellDone: {
      backgroundColor: isDark ? DONE_BG_DARK : DONE_BG_LIGHT,
    },
    cellDonePressed: {
      backgroundColor: isDark ? DONE_BG_PRESSED_DARK : DONE_BG_PRESSED_LIGHT,
    },
    cellText: {
      fontSize: 13,
      fontWeight: '700',
      color: Palette.textPrimary,
    },
    cellTextDone: {
      color: isDark ? DONE_TEXT_DARK : DONE_TEXT_LIGHT,
    },
  });

const makeStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    wrap: {
      paddingBottom: Spacing.md,
    },
    columns: {
      flexDirection: 'row',
      gap: Spacing.cardGap,
      alignItems: 'flex-start',
    },
    column: {
      flex: 1,
      gap: PLANNER_GAP,
    },
    columnTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: Palette.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      paddingHorizontal: Spacing.xs,
      paddingBottom: 2,
    },
    plannerEmpty: {
      backgroundColor: Palette.card,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    plannerEmptyText: {
      color: Palette.textTertiary,
      textAlign: 'center',
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      backgroundColor: Palette.card,
      borderRadius: Radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: Palette.separator,
      borderStyle: 'dashed',
    },
    addBtnPressed: { backgroundColor: Palette.cardPressed },
    addBtnLabel: {
      color: Palette.accent,
      fontSize: 13,
      fontWeight: '600',
    },
    completedList: {
      gap: PLANNER_GAP,
    },
    divider: {
      height: 1,
      backgroundColor: Palette.separator,
      marginTop: Spacing.lg,
      marginHorizontal: Spacing.xs,
    },
  });
