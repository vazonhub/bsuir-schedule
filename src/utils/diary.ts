import type { ScheduleDto } from '@models/dto';
import type { SubgroupChoice } from '@stores/preferences.store';
import { buildLessonBlockId } from '@utils/lesson';
import { flattenSchedule } from '@utils/scheduleNormalization';
import type { CurrentWeekNumber } from '@models/dto/schedule.dto';

/** Lesson types tracked by the diary. Other API values (Консультация, Экзамен) are ignored. */
export const DIARY_LESSON_TYPES = ['ЛК', 'ПЗ', 'ЛР'] as const;
export type DiaryLessonType = (typeof DIARY_LESSON_TYPES)[number];

const isDiaryLessonType = (v: string | null | undefined): v is DiaryLessonType =>
  v === 'ЛК' || v === 'ПЗ' || v === 'ЛР';

export type LessonTypeCounts = Record<DiaryLessonType, number>;

export interface DiarySubject {
  /** Short subject code, e.g. "МСиСвИТ" — stable identifier used as store key. */
  subject: string;
  subjectFullName: string;
  /** Lessons that are strictly in the future (not past) and not blocked. */
  remaining: LessonTypeCounts;
  /** Total occurrences over the semester (past + future). */
  total: LessonTypeCounts;
}

interface Options {
  subgroup: SubgroupChoice;
  /** Block IDs (from preferences.store) to exclude from `remaining`. */
  blockedIds: ReadonlySet<string>;
}

const emptyCounts = (): LessonTypeCounts => ({ ЛК: 0, ПЗ: 0, ЛР: 0 });

/**
 * Extract per-subject lesson counters from a group schedule. Filters by user's
 * chosen subgroup (0 = all, 1|2 = specific) and excludes blocked lessons from
 * the `remaining` count only — `total` remains the raw semester count.
 */
export const extractDiarySubjects = (
  schedule: ScheduleDto,
  currentWeek: CurrentWeekNumber,
  today: Date,
  { subgroup, blockedIds }: Options,
): DiarySubject[] => {
  const all = flattenSchedule(schedule, currentWeek, today, { showAll: true });

  const bySubject = new Map<
    string,
    { subject: string; subjectFullName: string; remaining: LessonTypeCounts; total: LessonTypeCounts }
  >();

  for (const lesson of all) {
    const raw = lesson.raw;
    const type = raw.lessonTypeAbbrev;
    if (!isDiaryLessonType(type)) continue;

    // Filter by chosen subgroup: 0 (all) counts everything; 1|2 counts only
    // lessons that are shared (numSubgroup=0) or match the choice.
    if (subgroup !== 0 && raw.numSubgroup !== 0 && raw.numSubgroup !== subgroup) {
      continue;
    }

    const key = raw.subject || raw.subjectFullName;
    let entry = bySubject.get(key);
    if (!entry) {
      entry = {
        subject: raw.subject,
        subjectFullName: raw.subjectFullName || raw.subject,
        remaining: emptyCounts(),
        total: emptyCounts(),
      };
      bySubject.set(key, entry);
    }

    entry.total[type] += 1;

    if (!lesson.isPast && !blockedIds.has(buildLessonBlockId(lesson))) {
      entry.remaining[type] += 1;
    }
  }

  const list = Array.from(bySubject.values());
  list.sort((a, b) => a.subject.localeCompare(b.subject, 'ru', { sensitivity: 'base' }));
  return list;
};
