import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncStorageAdapter } from '@services/cache/asyncStorage';
import { migrateDiaryPersisted, sanitizeDiaryFields } from '@utils/diarySync';
import type { DiaryRemoteFields } from '@utils/diarySync';

/** Submission lesson types that can carry tasks in the diary (ЛР — labs, ПЗ — practicals). */
export const DIARY_TASK_TYPES = ['ЛР', 'ПЗ'] as const;
export type DiaryTaskType = (typeof DIARY_TASK_TYPES)[number];

/** Progress for a single task type of a subject. */
export interface TypeProgress {
  /** Total task count for this type. `null` means the user hasn't entered one yet. */
  taskCount: number | null;
  /** 1-based indices of tasks marked as done. */
  completed: number[];
  /** Markdown note per 1-based task index (added in the notes feature). */
  notes?: Record<number, string>;
}

/** Per-subject progress, split by task type (ЛР / ПЗ). */
export type SubjectProgress = Record<DiaryTaskType, TypeProgress>;

export interface PlannerItem {
  /** Stable id survives reordering. */
  id: string;
  subject: string;
  /** Which task type this slot points at (ЛР / ПЗ). */
  type: DiaryTaskType;
  /** 1-based task index within `progress[group][subject][type].taskCount`. */
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

  setTaskCount(groupName: string, subject: string, type: DiaryTaskType, count: number): void;
  toggleTask(groupName: string, subject: string, type: DiaryTaskType, index: number): void;
  setTaskNote(
    groupName: string,
    subject: string,
    type: DiaryTaskType,
    index: number,
    note: string,
  ): void;
  resetSubject(groupName: string, subject: string): void;
  toggleHidden(groupName: string, subject: string): void;

  addPlannerItem(groupName: string, subject: string, type: DiaryTaskType, taskIndex: number): void;
  removePlannerItem(groupName: string, id: string): void;
  reorderPlanner(groupName: string, newOrder: PlannerItem[]): void;
  /** Rewrite an existing planner slot's subject/type/taskIndex, preserving order. */
  replacePlannerItem(
    groupName: string,
    id: string,
    subject: string,
    type: DiaryTaskType,
    taskIndex: number,
  ): void;

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

/** Fresh empty progress for one task type. */
export const emptyTypeProgress = (): TypeProgress => ({ taskCount: null, completed: [] });

/** Fresh empty progress for a subject (both task types). */
export const emptySubjectProgress = (): SubjectProgress => ({
  ЛР: emptyTypeProgress(),
  ПЗ: emptyTypeProgress(),
});

const getEntry = (state: DiaryState, group: string, subject: string): SubjectProgress =>
  state.progress[group]?.[subject] ?? emptySubjectProgress();

const genId = (): string =>
  `p_${Math.random().toString(36).slice(2, 9)}_${Math.random().toString(36).slice(2, 6)}`;

/** Prune planner items so they never point at a non-existent task index. */
const prunePlanner = (
  planner: PlannerItem[],
  predicate: (item: PlannerItem) => boolean,
): PlannerItem[] => planner.filter(predicate);

/** Persist schema version — bump when the persisted shape changes. */
const DIARY_PERSIST_VERSION = 2;

export const useDiaryStore = create<DiaryState>()(
  persist(
    (set) => {
      /**
       * set + LWW stamp: every local mutation of diary data advances
       * `updatedAt` in the same set call (one persist cycle, one subscriber
       * notification). The Lamport bump (`max(now, prev + 1)`) guarantees the
       * stamp strictly grows even with a lagging clock after applying a
       * foreign snapshot. No-op mutations (updater returned state or an empty
       * patch) are not stamped.
       */
      const setStamped = (updater: (s: DiaryState) => Partial<DiaryState> | DiaryState): void => {
        set((s) => {
          const patch = updater(s);
          if (patch === s || Object.keys(patch).length === 0) return patch;
          return { ...patch, updatedAt: Math.max(Date.now(), s.updatedAt + 1) };
        });
      };

      /** Write one subject's SubjectProgress back into the progress map. */
      const withSubject = (
        s: DiaryState,
        groupName: string,
        subject: string,
        next: SubjectProgress,
      ): DiaryState['progress'] => ({
        ...s.progress,
        [groupName]: { ...(s.progress[groupName] ?? {}), [subject]: next },
      });

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

        setTaskCount: (groupName, subject, type, count) => {
          const clamped = Math.max(0, Math.min(99, Math.floor(count)));
          setStamped((s) => {
            const entry = getEntry(s, groupName, subject);
            const prevType = entry[type];
            const nextNotes = prevType.notes
              ? Object.fromEntries(
                  Object.entries(prevType.notes).filter(
                    ([k]) => Number(k) >= 1 && Number(k) <= clamped,
                  ),
                )
              : undefined;
            const nextType: TypeProgress = {
              taskCount: clamped,
              completed: prevType.completed.filter((i) => i >= 1 && i <= clamped),
              ...(nextNotes && Object.keys(nextNotes).length > 0 ? { notes: nextNotes } : {}),
            };
            const groupPlanner = s.planner[groupName] ?? [];
            const nextPlanner = prunePlanner(
              groupPlanner,
              (it) => it.subject !== subject || it.type !== type || it.taskIndex <= clamped,
            );
            return {
              progress: withSubject(s, groupName, subject, { ...entry, [type]: nextType }),
              planner:
                nextPlanner === groupPlanner
                  ? s.planner
                  : { ...s.planner, [groupName]: nextPlanner },
            };
          });
        },

        toggleTask: (groupName, subject, type, index) => {
          setStamped((s) => {
            const entry = getEntry(s, groupName, subject);
            const prevType = entry[type];
            if (prevType.taskCount == null || index < 1 || index > prevType.taskCount) return s;
            const has = prevType.completed.includes(index);
            const nextCompleted = has
              ? prevType.completed.filter((i) => i !== index)
              : [...prevType.completed, index];

            // If we just marked (subject, type, index) as done, drop any planner
            // entry pointing to it. Do NOT re-add on un-check — the planner
            // is a manual backlog, not a mirror of the grid.
            let nextPlanner = s.planner;
            if (!has) {
              const groupPlanner = s.planner[groupName] ?? [];
              const filtered = prunePlanner(
                groupPlanner,
                (it) => !(it.subject === subject && it.type === type && it.taskIndex === index),
              );
              if (filtered.length !== groupPlanner.length) {
                nextPlanner = { ...s.planner, [groupName]: filtered };
              }
            }

            return {
              progress: withSubject(s, groupName, subject, {
                ...entry,
                [type]: { ...prevType, completed: nextCompleted },
              }),
              planner: nextPlanner,
            };
          });
        },

        setTaskNote: (groupName, subject, type, index, note) => {
          setStamped((s) => {
            const entry = getEntry(s, groupName, subject);
            const prevType = entry[type];
            if (prevType.taskCount == null || index < 1 || index > prevType.taskCount) return s;
            const notes = { ...(prevType.notes ?? {}) };
            const trimmed = note.trim();
            if (trimmed.length === 0) {
              delete notes[index];
            } else {
              notes[index] = note;
            }
            const nextType: TypeProgress = {
              taskCount: prevType.taskCount,
              completed: prevType.completed,
              ...(Object.keys(notes).length > 0 ? { notes } : {}),
            };
            return {
              progress: withSubject(s, groupName, subject, { ...entry, [type]: nextType }),
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

        addPlannerItem: (groupName, subject, type, taskIndex) => {
          setStamped((s) => {
            const groupPlanner = s.planner[groupName] ?? [];
            // Ignore duplicates (same subject + type + index).
            if (
              groupPlanner.some(
                (it) => it.subject === subject && it.type === type && it.taskIndex === taskIndex,
              )
            ) {
              return s;
            }
            const next: PlannerItem = { id: genId(), subject, type, taskIndex };
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

        replacePlannerItem: (groupName, id, subject, type, taskIndex) => {
          setStamped((s) => {
            const groupPlanner = s.planner[groupName] ?? [];
            const idx = groupPlanner.findIndex((it) => it.id === id);
            if (idx < 0) return s;
            // If the new (subject, type, taskIndex) matches a DIFFERENT existing slot,
            // drop this one to avoid duplicates.
            const collision = groupPlanner.findIndex(
              (it) =>
                it.id !== id &&
                it.subject === subject &&
                it.type === type &&
                it.taskIndex === taskIndex,
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
            next[idx] = { id, subject, type, taskIndex };
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
      version: DIARY_PERSIST_VERSION,
      storage: createJSONStorage(() => asyncStorageAdapter),
      // Upgrade the pre-v2 flat `{ taskCount, completed }` shape into the
      // per-type `{ ЛР, ПЗ }` shape (old counts were labs) and tag planner items.
      migrate: (persisted, version) => migrateDiaryPersisted(persisted, version) as DiaryState,
      partialize: (state) => ({
        progress: state.progress,
        hidden: state.hidden,
        planner: state.planner,
        updatedAt: state.updatedAt,
      }),
    },
  ),
);

const EMPTY: SubjectProgress = emptySubjectProgress();

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
