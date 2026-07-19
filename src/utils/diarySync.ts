import type { PlannerItem, SubjectProgress } from '@stores/diary.store';

/**
 * Версия схемы облачного снапшота. При изменении формы `DiaryCloudSnapshot`
 * инкрементировать и добавить миграцию в месте чтения — иначе блоб другой
 * версии неотличим от мусора.
 */
export const SNAPSHOT_VERSION = 1;

/**
 * Снапшот дневника для облачной синхронизации (iCloud KVS / Google Drive).
 * Один JSON-блоб под ключом `diary:state`; merge между устройствами — LWW
 * по `updatedAt` (более свежая запись побеждает целиком).
 */
export interface DiaryCloudSnapshot {
  /** Версия схемы — см. `SNAPSHOT_VERSION`. */
  v: number;
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

/** Объект-словарь, но не массив (typeof [] === 'object' — отсекаем явно). */
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

/** Проверка, что распарсенный из облака JSON похож на `DiaryCloudSnapshot`. */
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

/** Поля дневника, применяемые из облака в `useDiaryStore`. */
export interface DiaryRemoteFields {
  progress: Record<string, Record<string, SubjectProgress>>;
  hidden: Record<string, string[]>;
  planner: Record<string, PlannerItem[]>;
  updatedAt: number;
}

/** Зеркалит clamp из `setTaskCount` (0..99). */
const clampCount = (n: number): number => Math.max(0, Math.min(99, Math.floor(n)));

/**
 * Привести облачные поля к инвариантам стора, которые обычно поддерживают
 * его экшены (clamp количества, prune индексов, dedupe планера). Тип-guard
 * ловит только форму данных; здесь отсекаются семантически невозможные
 * значения из битого/чужого блоба, чтобы они не попали в persist и в UI.
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
      // Элемент не должен указывать мимо выставленного количества задач
      // и на уже выполненную задачу (инвариант prunePlanner/toggleTask).
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
