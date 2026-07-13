import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncStorageAdapter } from '@services/cache/asyncStorage';

export interface SubjectProgress {
  /** Total task count for this subject. `null` means the user hasn't entered one yet. */
  taskCount: number | null;
  /** 1-based indices of tasks marked as done. */
  completed: number[];
}

interface DiaryState {
  /** Progress keyed by group name → subject code → per-subject state. */
  progress: Record<string, Record<string, SubjectProgress>>;
  /** Subject codes the user has hidden, per group. */
  hidden: Record<string, string[]>;

  setTaskCount(groupName: string, subject: string, count: number): void;
  toggleTask(groupName: string, subject: string, index: number): void;
  resetSubject(groupName: string, subject: string): void;
  toggleHidden(groupName: string, subject: string): void;
}

const getEntry = (state: DiaryState, group: string, subject: string): SubjectProgress =>
  state.progress[group]?.[subject] ?? { taskCount: null, completed: [] };

export const useDiaryStore = create<DiaryState>()(
  persist(
    (set, get) => ({
      progress: {},
      hidden: {},

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
          return {
            progress: {
              ...s.progress,
              [groupName]: {
                ...(s.progress[groupName] ?? {}),
                [subject]: { taskCount: clamped, completed: nextCompleted },
              },
            },
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
          return {
            progress: {
              ...s.progress,
              [groupName]: {
                ...(s.progress[groupName] ?? {}),
                [subject]: { ...prev, completed: nextCompleted },
              },
            },
          };
        });
      },

      resetSubject: (groupName, subject) => {
        set((s) => {
          const group = s.progress[groupName];
          if (!group || !(subject in group)) return s;
          const { [subject]: _removed, ...rest } = group;
          return {
            progress: {
              ...s.progress,
              [groupName]: rest,
            },
          };
        });
        // Trigger `get` so ESLint doesn't complain about unused set-only signature.
        void get;
      },
    }),
    {
      name: 'diary-v1',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (state) => ({ progress: state.progress, hidden: state.hidden }),
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
