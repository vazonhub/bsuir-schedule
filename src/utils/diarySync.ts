import type {
  DiaryTaskType,
  PlannerItem,
  SubjectProgress,
  TypeProgress,
} from '@stores/diary.store';
import { DIARY_TASK_TYPES } from '@stores/diary.store';

/**
 * Cloud snapshot schema version. When the shape of `DiaryCloudSnapshot`
 * changes, increment it and add a migration at the read site — otherwise a
 * blob of another version is indistinguishable from garbage.
 *
 * v2: `SubjectProgress` split into per-type (`ЛР`/`ПЗ`) progress and
 * `PlannerItem` gained a `type` field. v1 blobs are still accepted on read and
 * upgraded by `sanitizeDiaryFields`.
 */
export const SNAPSHOT_VERSION = 2;

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
  /** Progress: group → subject → per-type progress. */
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

/** Legacy (v1) per-subject progress shape. */
const isLegacyTypeProgress = (x: unknown): boolean =>
  isPlainRecord(x) &&
  (x.taskCount === null || (typeof x.taskCount === 'number' && Number.isInteger(x.taskCount))) &&
  Array.isArray(x.completed) &&
  x.completed.every((i) => Number.isInteger(i));

const isTypeProgress = (x: unknown): boolean => isLegacyTypeProgress(x);

/** Accept both the v1 flat shape and the v2 per-type shape. */
const isSubjectProgress = (x: unknown): boolean => {
  if (!isPlainRecord(x)) return false;
  if ('taskCount' in x) return isLegacyTypeProgress(x); // v1
  return DIARY_TASK_TYPES.every((t) => !(t in x) || isTypeProgress(x[t])); // v2 (partial ok)
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
  Number.isInteger(x.taskIndex) &&
  // `type` was added in v2; v1 items lack it and default to ЛР on sanitize.
  (x.type === undefined || x.type === 'ЛР' || x.type === 'ПЗ');

const isPlannerMap = (x: unknown): x is Record<string, PlannerItem[]> =>
  isPlainRecord(x) && Object.values(x).every((v) => Array.isArray(v) && v.every(isPlannerItem));

/** Check that JSON parsed from the cloud looks like a `DiaryCloudSnapshot`. */
export const isDiaryCloudSnapshot = (x: unknown): x is DiaryCloudSnapshot => {
  if (!isPlainRecord(x)) return false;
  return (
    // Accept the current version and the previous one (upgraded on read).
    (x.v === SNAPSHOT_VERSION || x.v === 1) &&
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

/** Coerce a single type's progress (from v1 flat or v2 per-type) to invariants. */
const sanitizeTypeProgress = (raw: unknown): TypeProgress => {
  if (!isPlainRecord(raw)) return { taskCount: null, completed: [] };
  const taskCount = raw.taskCount == null ? null : clampCount(raw.taskCount as number);
  const completedRaw = Array.isArray(raw.completed) ? (raw.completed as number[]) : [];
  const completed =
    taskCount == null ? [] : [...new Set(completedRaw)].filter((i) => i >= 1 && i <= taskCount);
  let notes: Record<number, string> | undefined;
  if (isPlainRecord(raw.notes) && taskCount != null) {
    const clean: Record<number, string> = {};
    for (const [k, v] of Object.entries(raw.notes)) {
      const idx = Number(k);
      if (Number.isInteger(idx) && idx >= 1 && idx <= taskCount && typeof v === 'string') {
        clean[idx] = v;
      }
    }
    if (Object.keys(clean).length > 0) notes = clean;
  }
  return notes ? { taskCount, completed, notes } : { taskCount, completed };
};

/** Normalize one subject entry (v1 flat or v2 per-type) into `SubjectProgress`. */
const normalizeSubjectProgress = (entry: unknown): SubjectProgress => {
  if (isPlainRecord(entry) && 'taskCount' in entry) {
    // v1: the flat entry was a lab count.
    return { ЛР: sanitizeTypeProgress(entry), ПЗ: { taskCount: null, completed: [] } };
  }
  const rec = isPlainRecord(entry) ? entry : {};
  return {
    ЛР: sanitizeTypeProgress(rec.ЛР),
    ПЗ: sanitizeTypeProgress(rec.ПЗ),
  };
};

/**
 * Coerce cloud fields to the store invariants normally maintained by its
 * actions (clamp counts, prune indices, dedupe the planner). The type guard
 * only catches the data shape; here we cut off semantically impossible
 * values from a corrupt/foreign blob so they never reach persist or the UI.
 * Also upgrades v1 (flat) progress/planner into the v2 per-type shape.
 */
export const sanitizeDiaryFields = (fields: DiaryRemoteFields): DiaryRemoteFields => {
  const progress: DiaryRemoteFields['progress'] = {};
  for (const [group, subjects] of Object.entries(fields.progress)) {
    const clean: Record<string, SubjectProgress> = {};
    for (const [subject, entry] of Object.entries(subjects)) {
      clean[subject] = normalizeSubjectProgress(entry);
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
    planner[group] = items
      .map((it) => ({ ...it, type: (it.type ?? 'ЛР') as DiaryTaskType }))
      .filter((it) => {
        const typeEntry = progress[group]?.[it.subject]?.[it.type];
        // An item must not point past the configured task count or at an
        // already completed task (the prunePlanner/toggleTask invariant).
        if (
          typeEntry?.taskCount == null ||
          it.taskIndex < 1 ||
          it.taskIndex > typeEntry.taskCount
        ) {
          return false;
        }
        if (typeEntry.completed.includes(it.taskIndex)) return false;
        const slot = `${it.subject}#${it.type}#${it.taskIndex}`;
        if (seenSlots.has(slot) || seenIds.has(it.id)) return false;
        seenSlots.add(slot);
        seenIds.add(it.id);
        return true;
      });
  }

  return { progress, hidden, planner, updatedAt: fields.updatedAt };
};

/**
 * Persist-layer migration for `useDiaryStore` (AsyncStorage `diary-v1`).
 * Upgrades the pre-v2 flat `{ taskCount, completed }` per-subject shape into
 * the per-type `{ ЛР, ПЗ }` shape (old counts were labs) and tags planner
 * items with `type: 'ЛР'`. Idempotent for already-migrated state.
 */
export const migrateDiaryPersisted = (persisted: unknown, version: number): unknown => {
  if (!isPlainRecord(persisted)) return persisted;
  if (version >= SNAPSHOT_VERSION) return persisted;

  const progressRaw = isPlainRecord(persisted.progress) ? persisted.progress : {};
  const progress: Record<string, Record<string, SubjectProgress>> = {};
  for (const [group, subjects] of Object.entries(progressRaw)) {
    const clean: Record<string, SubjectProgress> = {};
    if (isPlainRecord(subjects)) {
      for (const [subject, entry] of Object.entries(subjects)) {
        clean[subject] = normalizeSubjectProgress(entry);
      }
    }
    progress[group] = clean;
  }

  const plannerRaw = isPlainRecord(persisted.planner) ? persisted.planner : {};
  const planner: Record<string, PlannerItem[]> = {};
  for (const [group, items] of Object.entries(plannerRaw)) {
    if (!Array.isArray(items)) {
      planner[group] = [];
      continue;
    }
    planner[group] = items.filter(isPlainRecord).map((it) => ({
      id: String(it.id),
      subject: String(it.subject),
      type: (it.type === 'ПЗ' ? 'ПЗ' : 'ЛР') as DiaryTaskType,
      taskIndex: Number(it.taskIndex),
    }));
  }

  return { ...persisted, progress, planner };
};
