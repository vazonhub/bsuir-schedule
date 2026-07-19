import type { PlannerItem, SubjectProgress } from '@stores/diary.store';

/**
 * Cloud snapshot schema version. When the shape of `DiaryCloudSnapshot`
 * changes, increment it and add a migration at the read site — otherwise a
 * blob of another version is indistinguishable from garbage.
 */
export const SNAPSHOT_VERSION = 1;

/**
 * Diary snapshot for cloud sync (iCloud KVS / Google Drive).
 * One JSON blob under the `diary:state` key; merge between devices is LWW
 * by `updatedAt` (the fresher record wins wholesale).
 */
export interface DiaryCloudSnapshot {
  /** Schema version — see `SNAPSHOT_VERSION`. */
  v: number;
  /** ms epoch of the last local change — the LWW key. */
  updatedAt: number;
  /** Progress: group → subject → { taskCount, completed }. */
  progress: Record<string, Record<string, SubjectProgress>>;
  /** Hidden (muted) subjects, per group. */
  hidden: Record<string, string[]>;
  /** Planner: ordered items per group. */
  planner: Record<string, PlannerItem[]>;
  /** Muted lessons (`preferences.blockedLessons`), per entityKey. */
  blockedLessons: Record<string, string[]>;
  /** "Diary tutorial shown" flag. */
  diaryOnboardingSeen: boolean;
}

/** A plain record, but not an array (typeof [] === 'object' — exclude explicitly). */
const isPlainRecord = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x != null && !Array.isArray(x);

const isStringArrayRecord = (x: unknown): x is Record<string, string[]> =>
  isPlainRecord(x) &&
  Object.values(x).every((v) => Array.isArray(v) && v.every((item) => typeof item === 'string'));

const isSubjectProgress = (x: unknown): x is SubjectProgress => {
  if (!isPlainRecord(x)) return false;
  return (
    (x.taskCount === null || (typeof x.taskCount === 'number' && Number.isInteger(x.taskCount))) &&
    Array.isArray(x.completed) &&
    x.completed.every((i) => Number.isInteger(i))
  );
};

const isProgressMap = (x: unknown): x is Record<string, Record<string, SubjectProgress>> =>
  isPlainRecord(x) &&
  Object.values(x).every(
    (group) => isPlainRecord(group) && Object.values(group).every(isSubjectProgress),
  );

const isPlannerItem = (x: unknown): x is PlannerItem =>
  isPlainRecord(x) &&
  typeof x.id === 'string' &&
  typeof x.subject === 'string' &&
  Number.isInteger(x.taskIndex);

const isPlannerMap = (x: unknown): x is Record<string, PlannerItem[]> =>
  isPlainRecord(x) && Object.values(x).every((v) => Array.isArray(v) && v.every(isPlannerItem));

/** Check that JSON parsed from the cloud looks like a `DiaryCloudSnapshot`. */
export const isDiaryCloudSnapshot = (x: unknown): x is DiaryCloudSnapshot => {
  if (!isPlainRecord(x)) return false;
  return (
    x.v === SNAPSHOT_VERSION &&
    typeof x.updatedAt === 'number' &&
    Number.isFinite(x.updatedAt) &&
    x.updatedAt >= 0 &&
    typeof x.diaryOnboardingSeen === 'boolean' &&
    isProgressMap(x.progress) &&
    isStringArrayRecord(x.hidden) &&
    isPlannerMap(x.planner) &&
    isStringArrayRecord(x.blockedLessons)
  );
};

/** Diary fields applied from the cloud into `useDiaryStore`. */
export interface DiaryRemoteFields {
  progress: Record<string, Record<string, SubjectProgress>>;
  hidden: Record<string, string[]>;
  planner: Record<string, PlannerItem[]>;
  updatedAt: number;
}

/** Mirrors the clamp from `setTaskCount` (0..99). */
const clampCount = (n: number): number => Math.max(0, Math.min(99, Math.floor(n)));

/**
 * Coerce cloud fields to the store invariants normally maintained by its
 * actions (clamp counts, prune indices, dedupe the planner). The type guard
 * only catches the data shape; here we cut off semantically impossible
 * values from a corrupt/foreign blob so they never reach persist or the UI.
 */
export const sanitizeDiaryFields = (fields: DiaryRemoteFields): DiaryRemoteFields => {
  const progress: DiaryRemoteFields['progress'] = {};
  for (const [group, subjects] of Object.entries(fields.progress)) {
    const clean: Record<string, SubjectProgress> = {};
    for (const [subject, entry] of Object.entries(subjects)) {
      const taskCount = entry.taskCount == null ? null : clampCount(entry.taskCount);
      const completed =
        taskCount == null
          ? []
          : [...new Set(entry.completed)].filter((i) => i >= 1 && i <= taskCount);
      clean[subject] = { taskCount, completed };
    }
    progress[group] = clean;
  }

  const hidden: DiaryRemoteFields['hidden'] = {};
  for (const [group, list] of Object.entries(fields.hidden)) {
    hidden[group] = [...new Set(list)];
  }

  const planner: DiaryRemoteFields['planner'] = {};
  for (const [group, items] of Object.entries(fields.planner)) {
    const seenSlots = new Set<string>();
    const seenIds = new Set<string>();
    planner[group] = items.filter((it) => {
      const entry = progress[group]?.[it.subject];
      // An item must not point past the configured task count or at an
      // already completed task (the prunePlanner/toggleTask invariant).
      if (entry?.taskCount == null || it.taskIndex < 1 || it.taskIndex > entry.taskCount) {
        return false;
      }
      if (entry.completed.includes(it.taskIndex)) return false;
      const slot = `${it.subject}#${it.taskIndex}`;
      if (seenSlots.has(slot) || seenIds.has(it.id)) return false;
      seenSlots.add(slot);
      seenIds.add(it.id);
      return true;
    });
  }

  return { progress, hidden, planner, updatedAt: fields.updatedAt };
};
