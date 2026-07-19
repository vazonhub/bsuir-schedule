import i18n from '@i18n';
import type { ScheduleDto } from '@models/dto';
import type { SubgroupChoice } from '@stores/preferences.store';
import { addDays, DAY_NAMES_RU, isSameDay, startOfLocalDay } from '@utils/date';
import { buildLessonBlockId } from '@utils/lesson';
import { flattenSchedule } from '@utils/scheduleNormalization';
import type { NormalizedLesson } from '@utils/scheduleNormalization';
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

/** "HH:mm" → minutes since midnight, or null if unparseable. */
const parseHmToMinutes = (hm: string): number | null => {
  const parts = hm.split(':');
  const hh = Number(parts[0]);
  const mm = Number(parts[1]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
};

/**
 * True if the lesson is over relative to `now`: on a past day, or dated today
 * but its end time has already passed. Time-of-day granularity so the diary
 * counts and the "upcoming" list agree.
 */
const isLessonFinished = (lesson: NormalizedLesson, now: Date): boolean => {
  if (lesson.isPast) return true;
  if (isSameDay(lesson.date, now)) {
    const end = parseHmToMinutes(lesson.endTime);
    if (end !== null && end <= now.getHours() * 60 + now.getMinutes()) return true;
  }
  return false;
};

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
    {
      subject: string;
      subjectFullName: string;
      remaining: LessonTypeCounts;
      total: LessonTypeCounts;
    }
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

    if (!isLessonFinished(lesson, today) && !blockedIds.has(buildLessonBlockId(lesson))) {
      entry.remaining[type] += 1;
    }
  }

  const list = Array.from(bySubject.values());
  list.sort((a, b) => a.subject.localeCompare(b.subject, 'ru', { sensitivity: 'base' }));
  return list;
};

// ─── Upcoming submissions (right column of DiaryStats) ────────

/** Lesson types shown as "submission" pairs. Lectures are excluded. */
const SUBMISSION_TYPES: ReadonlySet<string> = new Set(['ЛР', 'ПЗ']);

interface UpcomingOptions {
  subgroup: SubgroupChoice;
  blockedIds: ReadonlySet<string>;
  limit?: number;
}

/**
 * Nearest future ЛР/ПЗ occurrences for the diary's "upcoming submissions"
 * panel. Applies the same subgroup / blocked filters as the diary counts.
 */
export const extractUpcomingSubmissions = (
  schedule: ScheduleDto,
  currentWeek: CurrentWeekNumber,
  today: Date,
  { subgroup, blockedIds, limit = 5 }: UpcomingOptions,
): NormalizedLesson[] => {
  const all = flattenSchedule(schedule, currentWeek, today, { showAll: true });
  const out: NormalizedLesson[] = [];
  for (const lesson of all) {
    // Skip past days and today's lessons that have already finished.
    if (isLessonFinished(lesson, today)) continue;
    const type = lesson.raw.lessonTypeAbbrev;
    if (!type || !SUBMISSION_TYPES.has(type)) continue;
    if (subgroup !== 0 && lesson.raw.numSubgroup !== 0 && lesson.raw.numSubgroup !== subgroup) {
      continue;
    }
    if (blockedIds.has(buildLessonBlockId(lesson))) continue;
    out.push(lesson);
    if (out.length >= limit) break;
  }
  return out;
};

// ─── "When" formatter ─────────────────────────────────────────

/**
 * Compact date label for upcoming lessons.
 *   today       → "Сегодня 12:25"
 *   tomorrow    → "Завтра 12:25"
 *   further out → "Пн 15.07 12:25"
 * Localized day names come from i18n so ru/be/en are handled uniformly.
 */
export const formatDiaryWhen = (date: Date, startTime: string, now: Date): string => {
  const t = i18n.t.bind(i18n);
  const todayStart = startOfLocalDay(now);
  const tomorrow = addDays(todayStart, 1);
  if (isSameDay(date, todayStart)) return `${t('diary.whenToday')} ${startTime}`;
  if (isSameDay(date, tomorrow)) return `${t('diary.whenTomorrow')} ${startTime}`;
  const shortDays = t('diary.shortDayNames', { returnObjects: true }) as string[];
  const dayLabel = shortDays[date.getDay()] ?? DAY_NAMES_RU[date.getDay()] ?? '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dayLabel} ${dd}.${mm} ${startTime}`;
};
