import type { PlannerItem, SubjectProgress } from '@stores/diary.store';

/**
 * Снапшот дневника для облачной синхронизации (iCloud KVS / Google Drive).
 * Один JSON-блоб под ключом `diary:state`; merge между устройствами — LWW
 * по `updatedAt` (более свежая запись побеждает целиком).
 */
export interface DiaryCloudSnapshot {
  /** ms epoch последнего локального изменения — ключ LWW. */
  updatedAt: number;
  /** Прогресс: группа → предмет → { taskCount, completed }. */
  progress: Record<string, Record<string, SubjectProgress>>;
  /** Скрытые (замьюченные) предметы, по группам. */
  hidden: Record<string, string[]>;
  /** Планер: упорядоченные элементы по группам. */
  planner: Record<string, PlannerItem[]>;
  /** Замьюченные пары (`preferences.blockedLessons`), по entityKey. */
  blockedLessons: Record<string, string[]>;
  /** Флаг «туториал дневника показан». */
  diaryOnboardingSeen: boolean;
}

const isStringArrayRecord = (x: unknown): x is Record<string, string[]> => {
  if (typeof x !== 'object' || x == null) return false;
  return Object.values(x).every(
    (v) => Array.isArray(v) && v.every((item) => typeof item === 'string'),
  );
};

const isSubjectProgress = (x: unknown): x is SubjectProgress => {
  if (typeof x !== 'object' || x == null) return false;
  const p = x as Record<string, unknown>;
  return (
    (p.taskCount === null || typeof p.taskCount === 'number') &&
    Array.isArray(p.completed) &&
    p.completed.every((i) => typeof i === 'number')
  );
};

const isProgressMap = (x: unknown): x is Record<string, Record<string, SubjectProgress>> => {
  if (typeof x !== 'object' || x == null) return false;
  return Object.values(x).every((group) => {
    if (typeof group !== 'object' || group == null) return false;
    return Object.values(group).every(isSubjectProgress);
  });
};

const isPlannerItem = (x: unknown): x is PlannerItem => {
  if (typeof x !== 'object' || x == null) return false;
  const it = x as Record<string, unknown>;
  return (
    typeof it.id === 'string' && typeof it.subject === 'string' && typeof it.taskIndex === 'number'
  );
};

const isPlannerMap = (x: unknown): x is Record<string, PlannerItem[]> => {
  if (typeof x !== 'object' || x == null) return false;
  return Object.values(x).every((v) => Array.isArray(v) && v.every(isPlannerItem));
};

/** Проверка, что распарсенный из облака JSON похож на `DiaryCloudSnapshot`. */
export const isDiaryCloudSnapshot = (x: unknown): x is DiaryCloudSnapshot => {
  if (typeof x !== 'object' || x == null) return false;
  const s = x as Record<string, unknown>;
  return (
    typeof s.updatedAt === 'number' &&
    typeof s.diaryOnboardingSeen === 'boolean' &&
    isProgressMap(s.progress) &&
    isStringArrayRecord(s.hidden) &&
    isPlannerMap(s.planner) &&
    isStringArrayRecord(s.blockedLessons)
  );
};
