import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncStorageAdapter } from '@services/cache/asyncStorage';

export interface SubjectProgress {
  /** Total task count for this subject. `null` means the user hasn't entered one yet. */
  taskCount: number | null;
  /** 1-based indices of tasks marked as done. */
  completed: number[];
}

export interface PlannerItem {
  /** Stable id survives reordering. */
  id: string;
  subject: string;
  /** 1-based task index within `progress[group][subject].taskCount`. */
  taskIndex: number;
}

export interface StreakState {
  /** Current run length in working days. */
  current: number;
  /** All-time record for this group. */
  longest: number;
  /** ISO date "YYYY-MM-DD" of the last day that counted, or null if never. */
  lastActiveDate: string | null;
}

const EMPTY_STREAK: StreakState = { current: 0, longest: 0, lastActiveDate: null };

/** ISO-format local calendar day (avoids timezone drift from `toISOString()`). */
const toLocalISO = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const isWeekday = (iso: string): boolean => {
  const d = new Date(iso + 'T00:00:00');
  const dow = d.getDay();
  return dow !== 0 && dow !== 6;
};

/** Returns the next Mon-Fri after the given ISO date. */
const nextWorkingDayAfter = (iso: string): string => {
  const d = new Date(iso + 'T00:00:00');
  do {
    d.setDate(d.getDate() + 1);
  } while (d.getDay() === 0 || d.getDay() === 6);
  return toLocalISO(d);
};

interface DiaryState {
  /** Progress keyed by group name → subject code → per-subject state. */
  progress: Record<string, Record<string, SubjectProgress>>;
  /** Subject codes the user has hidden, per group. */
  hidden: Record<string, string[]>;
  /** Ordered planner items per group (top = highest priority). */
  planner: Record<string, PlannerItem[]>;
  /** "Streak" (огонёк) counter keyed by group. */
  streak: Record<string, StreakState>;

  setTaskCount(groupName: string, subject: string, count: number): void;
  toggleTask(groupName: string, subject: string, index: number): void;
  resetSubject(groupName: string, subject: string): void;
  toggleHidden(groupName: string, subject: string): void;

  addPlannerItem(groupName: string, subject: string, taskIndex: number): void;
  removePlannerItem(groupName: string, id: string): void;
  reorderPlanner(groupName: string, newOrder: PlannerItem[]): void;
  /** Rewrite an existing planner slot's subject/taskIndex, preserving order. */
  replacePlannerItem(groupName: string, id: string, subject: string, taskIndex: number): void;
}

const getEntry = (state: DiaryState, group: string, subject: string): SubjectProgress =>
  state.progress[group]?.[subject] ?? { taskCount: null, completed: [] };

const genId = (): string =>
  `p_${Math.random().toString(36).slice(2, 9)}_${Math.random().toString(36).slice(2, 6)}`;

/** Prune planner items so they never point at a non-existent task index. */
const prunePlanner = (
  planner: PlannerItem[],
  predicate: (item: PlannerItem) => boolean,
): PlannerItem[] => planner.filter(predicate);

export const useDiaryStore = create<DiaryState>()(
  persist(
    (set) => ({
      progress: {},
      hidden: {},
      planner: {},
      streak: {},

      toggleHidden: (groupName, subject) => {
        set((s) => {
          const current = s.hidden[groupName] ?? [];
          const next = current.includes(subject)
            ? current.filter((v) => v !== subject)
            : [...current, subject];
          return { hidden: { ...s.hidden, [groupName]: next } };
        });
      },

      setTaskCount: (groupName, subject, count) => {
        const clamped = Math.max(0, Math.min(99, Math.floor(count)));
        set((s) => {
          const prev = getEntry(s, groupName, subject);
          const nextCompleted = prev.completed.filter((i) => i >= 1 && i <= clamped);
          const groupPlanner = s.planner[groupName] ?? [];
          const nextPlanner = prunePlanner(
            groupPlanner,
            (it) => it.subject !== subject || it.taskIndex <= clamped,
          );
          return {
            progress: {
              ...s.progress,
              [groupName]: {
                ...(s.progress[groupName] ?? {}),
                [subject]: { taskCount: clamped, completed: nextCompleted },
              },
            },
            planner: nextPlanner === groupPlanner
              ? s.planner
              : { ...s.planner, [groupName]: nextPlanner },
          };
        });
      },

      toggleTask: (groupName, subject, index) => {
        set((s) => {
          const prev = getEntry(s, groupName, subject);
          if (prev.taskCount == null || index < 1 || index > prev.taskCount) return s;
          const has = prev.completed.includes(index);
          const nextCompleted = has
            ? prev.completed.filter((i) => i !== index)
            : [...prev.completed, index];

          // If we just marked (subject, index) as done, drop any planner
          // entry pointing to it. Do NOT re-add on un-check — the planner
          // is a manual backlog, not a mirror of the grid.
          let nextPlanner = s.planner;
          if (!has) {
            const groupPlanner = s.planner[groupName] ?? [];
            const filtered = prunePlanner(
              groupPlanner,
              (it) => !(it.subject === subject && it.taskIndex === index),
            );
            if (filtered.length !== groupPlanner.length) {
              nextPlanner = { ...s.planner, [groupName]: filtered };
            }
          }

          // Streak bookkeeping — only on unchecked → checked, only on weekdays.
          let nextStreakMap = s.streak;
          if (!has) {
            const today = toLocalISO(new Date());
            if (isWeekday(today)) {
              const prevStreak = s.streak[groupName] ?? EMPTY_STREAK;
              if (prevStreak.lastActiveDate !== today) {
                const consecutive =
                  prevStreak.lastActiveDate !== null &&
                  nextWorkingDayAfter(prevStreak.lastActiveDate) === today;
                const newCurrent = consecutive ? prevStreak.current + 1 : 1;
                const newLongest = Math.max(prevStreak.longest, newCurrent);
                nextStreakMap = {
                  ...s.streak,
                  [groupName]: {
                    current: newCurrent,
                    longest: newLongest,
                    lastActiveDate: today,
                  },
                };
              }
            }
          }

          return {
            progress: {
              ...s.progress,
              [groupName]: {
                ...(s.progress[groupName] ?? {}),
                [subject]: { ...prev, completed: nextCompleted },
              },
            },
            planner: nextPlanner,
            streak: nextStreakMap,
          };
        });
      },

      resetSubject: (groupName, subject) => {
        set((s) => {
          const group = s.progress[groupName];
          const groupPlanner = s.planner[groupName] ?? [];
          const filteredPlanner = prunePlanner(groupPlanner, (it) => it.subject !== subject);

          const patch: Partial<DiaryState> = {};
          if (group && subject in group) {
            const { [subject]: _removed, ...rest } = group;
            patch.progress = { ...s.progress, [groupName]: rest };
          }
          if (filteredPlanner.length !== groupPlanner.length) {
            patch.planner = { ...s.planner, [groupName]: filteredPlanner };
          }
          return patch;
        });
      },

      addPlannerItem: (groupName, subject, taskIndex) => {
        set((s) => {
          const groupPlanner = s.planner[groupName] ?? [];
          // Ignore duplicates (same subject + index).
          if (groupPlanner.some((it) => it.subject === subject && it.taskIndex === taskIndex)) {
            return s;
          }
          const next: PlannerItem = { id: genId(), subject, taskIndex };
          return {
            planner: { ...s.planner, [groupName]: [...groupPlanner, next] },
          };
        });
      },

      removePlannerItem: (groupName, id) => {
        set((s) => {
          const groupPlanner = s.planner[groupName] ?? [];
          const filtered = groupPlanner.filter((it) => it.id !== id);
          if (filtered.length === groupPlanner.length) return s;
          return { planner: { ...s.planner, [groupName]: filtered } };
        });
      },

      reorderPlanner: (groupName, newOrder) => {
        set((s) => ({ planner: { ...s.planner, [groupName]: newOrder } }));
      },

      replacePlannerItem: (groupName, id, subject, taskIndex) => {
        set((s) => {
          const groupPlanner = s.planner[groupName] ?? [];
          const idx = groupPlanner.findIndex((it) => it.id === id);
          if (idx < 0) return s;
          // If the new (subject, taskIndex) matches a DIFFERENT existing slot,
          // drop this one to avoid duplicates.
          const collision = groupPlanner.findIndex(
            (it) => it.id !== id && it.subject === subject && it.taskIndex === taskIndex,
          );
          if (collision >= 0) {
            return {
              planner: {
                ...s.planner,
                [groupName]: groupPlanner.filter((it) => it.id !== id),
              },
            };
          }
          const next = [...groupPlanner];
          next[idx] = { id, subject, taskIndex };
          return { planner: { ...s.planner, [groupName]: next } };
        });
      },
    }),
    {
      name: 'diary-v1',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (state) => ({
        progress: state.progress,
        hidden: state.hidden,
        planner: state.planner,
        streak: state.streak,
      }),
    },
  ),
);

const EMPTY: SubjectProgress = { taskCount: null, completed: [] };

/** Selector helper: progress for a specific (group, subject). */
export const selectSubjectProgress =
  (groupName: string, subject: string) =>
  (s: DiaryState): SubjectProgress =>
    s.progress[groupName]?.[subject] ?? EMPTY;

const EMPTY_HIDDEN: string[] = [];

/** Selector helper: hidden subject codes for a group. */
export const selectHidden =
  (groupName: string) =>
  (s: DiaryState): string[] =>
    s.hidden[groupName] ?? EMPTY_HIDDEN;

const EMPTY_PLANNER: PlannerItem[] = [];

/** Selector helper: ordered planner list for a group. */
export const selectPlanner =
  (groupName: string) =>
  (s: DiaryState): PlannerItem[] =>
    s.planner[groupName] ?? EMPTY_PLANNER;

/** Selector helper: streak state for a group. */
export const selectStreak =
  (groupName: string) =>
  (s: DiaryState): StreakState =>
    s.streak[groupName] ?? EMPTY_STREAK;

/**
 * Compute whether a streak is "hot" — the user hasn't yet missed their next
 * chance. Hot when `today <= nextWorkingDayAfter(lastActiveDate)`.
 * Cold means at least one working day has been missed; `current` is still
 * stored but the badge should render muted.
 */
export const isStreakHot = (streak: StreakState, now: Date = new Date()): boolean => {
  if (streak.lastActiveDate == null || streak.current === 0) return false;
  const todayIso = toLocalISO(now);
  if (streak.lastActiveDate === todayIso) return true;
  const nextChance = nextWorkingDayAfter(streak.lastActiveDate);
  return todayIso <= nextChance;
};
