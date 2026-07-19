import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncStorageAdapter } from '@services/cache/asyncStorage';
import { sanitizeDiaryFields } from '@utils/diarySync';
import type { DiaryRemoteFields } from '@utils/diarySync';

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

interface DiaryState {
  /** Progress keyed by group name → subject code → per-subject state. */
  progress: Record<string, Record<string, SubjectProgress>>;
  /** Subject codes the user has hidden, per group. */
  hidden: Record<string, string[]>;
  /** Ordered planner items per group (top = highest priority). */
  planner: Record<string, PlannerItem[]>;
  /** ms epoch of the last local mutation — LWW key for cloud sync. */
  updatedAt: number;

  setTaskCount(groupName: string, subject: string, count: number): void;
  toggleTask(groupName: string, subject: string, index: number): void;
  resetSubject(groupName: string, subject: string): void;
  toggleHidden(groupName: string, subject: string): void;

  addPlannerItem(groupName: string, subject: string, taskIndex: number): void;
  removePlannerItem(groupName: string, id: string): void;
  reorderPlanner(groupName: string, newOrder: PlannerItem[]): void;
  /** Rewrite an existing planner slot's subject/taskIndex, preserving order. */
  replacePlannerItem(groupName: string, id: string, subject: string, taskIndex: number): void;

  /**
   * Stamp the LWW timestamp for a mutation made OUTSIDE this store
   * (synced preferences fields). Always strictly advances the stamp
   * (Lamport bump), even if the wall clock lags behind an applied
   * remote snapshot — otherwise the edit would tie and be dropped.
   */
  touchUpdatedAt(ts: number): void;
  /**
   * Overwrite diary fields with a newer cloud snapshot (LWW merge lost
   * locally). Fields are sanitized to the store's invariants first.
   */
  applyRemoteSnapshot(snapshot: DiaryRemoteFields): void;
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
    (set) => {
      /**
       * set + LWW-штамп: каждая локальная мутация данных дневника двигает
       * `updatedAt` в том же самом set (один persist-цикл, одно оповещение
       * подписчиков). Lamport-бамп (`max(now, prev + 1)`) гарантирует строгий
       * рост метки даже при отстающих часах после применения чужого снапшота.
       * No-op мутации (updater вернул state или пустой patch) не штампуются.
       */
      const setStamped = (updater: (s: DiaryState) => Partial<DiaryState> | DiaryState): void => {
        set((s) => {
          const patch = updater(s);
          if (patch === s || Object.keys(patch).length === 0) return patch;
          return { ...patch, updatedAt: Math.max(Date.now(), s.updatedAt + 1) };
        });
      };

      return {
        progress: {},
        hidden: {},
        planner: {},
        updatedAt: 0,

        toggleHidden: (groupName, subject) => {
          setStamped((s) => {
            const current = s.hidden[groupName] ?? [];
            const next = current.includes(subject)
              ? current.filter((v) => v !== subject)
              : [...current, subject];
            return { hidden: { ...s.hidden, [groupName]: next } };
          });
        },

        setTaskCount: (groupName, subject, count) => {
          const clamped = Math.max(0, Math.min(99, Math.floor(count)));
          setStamped((s) => {
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
              planner:
                nextPlanner === groupPlanner
                  ? s.planner
                  : { ...s.planner, [groupName]: nextPlanner },
            };
          });
        },

        toggleTask: (groupName, subject, index) => {
          setStamped((s) => {
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

            return {
              progress: {
                ...s.progress,
                [groupName]: {
                  ...(s.progress[groupName] ?? {}),
                  [subject]: { ...prev, completed: nextCompleted },
                },
              },
              planner: nextPlanner,
            };
          });
        },

        resetSubject: (groupName, subject) => {
          setStamped((s) => {
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
          setStamped((s) => {
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
          setStamped((s) => {
            const groupPlanner = s.planner[groupName] ?? [];
            const filtered = groupPlanner.filter((it) => it.id !== id);
            if (filtered.length === groupPlanner.length) return s;
            return { planner: { ...s.planner, [groupName]: filtered } };
          });
        },

        reorderPlanner: (groupName, newOrder) => {
          setStamped((s) => ({ planner: { ...s.planner, [groupName]: newOrder } }));
        },

        replacePlannerItem: (groupName, id, subject, taskIndex) => {
          setStamped((s) => {
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

        touchUpdatedAt: (ts) => {
          set((s) => ({ updatedAt: Math.max(ts, s.updatedAt + 1) }));
        },

        applyRemoteSnapshot: (snapshot) => {
          set(sanitizeDiaryFields(snapshot));
        },
      };
    },
    {
      name: 'diary-v1',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (state) => ({
        progress: state.progress,
        hidden: state.hidden,
        planner: state.planner,
        updatedAt: state.updatedAt,
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
