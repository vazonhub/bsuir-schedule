import {
  DAY_NAME_TO_DOW,
  DAY_NAMES_RU,
  addDays,
  isSameDay,
  parseBsuirDate,
  startOfLocalDay,
} from './date';
import type { DayNameRu, LessonDto, ScheduleDto, WeekNumber } from '@models/dto';

/**
 * Single concrete occurrence of a lesson. The raw `LessonDto` carries
 * abstract scheduling info (day name, week list, date range); after
 * normalisation we get one entry per actual calendar date.
 */
export interface NormalizedLesson {
  /** Stable list key. `lesson_<date>_<startTime>_<subject>_<subgroup>`. */
  key: string;
  /** Concrete calendar date (00:00 local) when the lesson takes place. */
  date: Date;
  startTime: string; // "HH:mm"
  endTime: string;
  /** 4-week-cycle index this date falls into. */
  week: WeekNumber;
  /** Russian day name, matches API key. */
  dayName: DayNameRu;
  /** True if `week === currentWeek`. */
  isCurrentWeek: boolean;
  /** True if the lesson's date is strictly before today. */
  isPast: boolean;
  /** Original lesson payload — for full-info modal etc. */
  raw: LessonDto;
}

/** One day-section for a SectionList. */
export interface ScheduleSection {
  date: Date;
  week: WeekNumber;
  data: NormalizedLesson[];
  /** True for sections that belong to the exam session. */
  isExam?: boolean;
}

const ALL_WEEKS: readonly WeekNumber[] = [1, 2, 3, 4];

const getStartOfMondayWeek = (date: Date): Date => {
  const d = startOfLocalDay(date);
  const dow = d.getDay() || 7; // Sun=0 → 7
  return addDays(d, -(dow - 1));
};

/**
 * Compute the 4-week-cycle index for an arbitrary date, given that `today`
 * is in `currentWeek`. Works for past and future dates.
 *
 * Uses day-count arithmetic instead of millisecond division to avoid
 * DST transitions (±1 h) producing off-by-one week errors.
 */
export const computeWeekForDate = (
  date: Date,
  today: Date,
  currentWeek: WeekNumber,
): WeekNumber => {
  const todayMon = getStartOfMondayWeek(today);
  const dateMon = getStartOfMondayWeek(date);
  // Count whole days between the two Mondays, then convert to weeks.
  // Using UTC noon avoids any residual DST ambiguity in the division.
  const daysDiff = Math.round(
    (Date.UTC(dateMon.getFullYear(), dateMon.getMonth(), dateMon.getDate()) -
      Date.UTC(todayMon.getFullYear(), todayMon.getMonth(), todayMon.getDate())) /
      86_400_000,
  );
  const weeksDiff = daysDiff / 7;
  // ((currentWeek - 1) + weeksDiff) mod 4 → 0..3, then +1 → 1..4
  const idx = (((currentWeek - 1 + weeksDiff) % 4) + 4) % 4;
  return (idx + 1) as WeekNumber;
};

const compareLessonsAsc = (a: NormalizedLesson, b: NormalizedLesson): number => {
  const t = a.date.getTime() - b.date.getTime();
  if (t !== 0) return t;
  return a.startTime.localeCompare(b.startTime);
};

interface FlattenOptions {
  /**
   * How many days back from `today` to include past occurrences. Default: 0
   * — то есть показываем только сегодняшние и будущие пары.
   * Если когда-нибудь пригодится «вчерашний» контекст — увеличить.
   */
  daysInPast?: number;
  /** Show all lessons from semester start, ignoring `daysInPast`. */
  showAll?: boolean;
}

/**
 * Стабильный уникальный ключ конкретного «вхождения» пары в день.
 *
 * `dayIndex` — позиция исходной `LessonDto` в массиве `schedules[<день>]`.
 * Этого хватает, чтобы развести коллизии, когда у группы в одно и то же
 * время идут два разных занятия (например, лабораторная разбита на потоки
 * с одинаковым `numSubgroup` и `subject`, но разными преподавателями /
 * аудиториями), а также когда API отдаёт две идентичные записи.
 */
const buildKey = (lesson: LessonDto, date: Date, dayIndex: number): string => {
  const ts = date.getTime();
  const auditory = (lesson.auditories ?? []).join('-');
  return `${ts}_${dayIndex}_${lesson.startLessonTime}_${lesson.numSubgroup}_${auditory}_${lesson.subject}`;
};

/**
 * Expand a `ScheduleDto` into a flat, chronologically-sorted list of concrete
 * lesson occurrences between `today - daysInPast` and `schedule.endDate`.
 *
 * Rules:
 * - For one-off events with `dateLesson` we add a single occurrence.
 * - For periodic lessons, we walk every matching weekday between
 *   `lesson.startLessonDate` (or schedule.startDate) and `lesson.endLessonDate`
 *   (or schedule.endDate), keeping only those whose computed cycle-week is in
 *   `lesson.weekNumber` (empty list = every week).
 */
export const flattenSchedule = (
  schedule: ScheduleDto,
  currentWeek: WeekNumber,
  today: Date,
  options: FlattenOptions = {},
): NormalizedLesson[] => {
  if (!schedule.schedules) return [];

  const startDate = parseBsuirDate(schedule.startDate);
  const endDate = parseBsuirDate(schedule.endDate);
  if (!startDate || !endDate) return [];

  const todayStart = startOfLocalDay(today);
  const earliest = options.showAll ? startDate : addDays(todayStart, -(options.daysInPast ?? 0));

  const out: NormalizedLesson[] = [];

  for (const [dayNameStr, dayLessons] of Object.entries(schedule.schedules)) {
    if (!dayLessons || dayLessons.length === 0) continue;
    const dayName = dayNameStr as DayNameRu;
    const targetDow = DAY_NAME_TO_DOW[dayName];
    if (targetDow === undefined) continue;

    for (let dayIndex = 0; dayIndex < dayLessons.length; dayIndex++) {
      const lesson = dayLessons[dayIndex];
      if (!lesson) continue;
      // Single-date occurrence (announcement / one-off).
      if (lesson.dateLesson) {
        const date = parseBsuirDate(lesson.dateLesson);
        if (!date || date < earliest) continue;
        const week = computeWeekForDate(date, todayStart, currentWeek);
        out.push(buildNormalized(lesson, date, week, dayName, dayIndex, todayStart, currentWeek));
        continue;
      }

      const lessonStart = parseBsuirDate(lesson.startLessonDate) ?? startDate;
      const lessonEnd = parseBsuirDate(lesson.endLessonDate) ?? endDate;

      const lessonWeeks = lesson.weekNumber ?? [];
      const weeks = lessonWeeks.length === 0 ? ALL_WEEKS : lessonWeeks;

      // Step day-by-day from lessonStart to first matching weekday.
      let cursor = startOfLocalDay(lessonStart);
      const cursorDow = cursor.getDay();
      const offset = (targetDow - cursorDow + 7) % 7;
      cursor = addDays(cursor, offset);

      while (cursor.getTime() <= lessonEnd.getTime()) {
        if (cursor.getTime() >= earliest.getTime()) {
          const week = computeWeekForDate(cursor, todayStart, currentWeek);
          if (weeks.includes(week)) {
            out.push(
              buildNormalized(lesson, cursor, week, dayName, dayIndex, todayStart, currentWeek),
            );
          }
        }
        cursor = addDays(cursor, 7);
      }
    }
  }

  out.sort(compareLessonsAsc);
  return out;
};

/**
 * Flatten exams into a sorted list of concrete occurrences.
 * Exams always have `dateLesson` — one occurrence each.
 */
export const flattenExams = (
  schedule: ScheduleDto,
  currentWeek: WeekNumber,
  today: Date,
): NormalizedLesson[] => {
  if (!schedule.exams || schedule.exams.length === 0) return [];

  const todayStart = startOfLocalDay(today);
  const out: NormalizedLesson[] = [];

  for (let i = 0; i < schedule.exams.length; i++) {
    const exam = schedule.exams[i];
    if (!exam) continue;
    const date = parseBsuirDate(exam.dateLesson);
    if (!date) continue;
    const dayName = DAY_NAMES_RU[date.getDay()] as DayNameRu;
    const week = computeWeekForDate(date, todayStart, currentWeek);
    out.push(buildNormalized(exam, date, week, dayName, i, todayStart, currentWeek));
  }

  out.sort(compareLessonsAsc);
  return out;
};

/**
 * Group exam lessons by day and mark sections as exam sections.
 */
export const groupExamsByDay = (lessons: NormalizedLesson[]): ScheduleSection[] => {
  const sections = groupLessonsByDay(lessons);
  for (const s of sections) s.isExam = true;
  return sections;
};

const buildNormalized = (
  lesson: LessonDto,
  date: Date,
  week: WeekNumber,
  dayName: DayNameRu,
  dayIndex: number,
  todayStart: Date,
  currentWeek: WeekNumber,
): NormalizedLesson => ({
  key: buildKey(lesson, date, dayIndex),
  date,
  startTime: lesson.startLessonTime,
  endTime: lesson.endLessonTime,
  week,
  dayName,
  isCurrentWeek: week === currentWeek,
  isPast: date.getTime() < todayStart.getTime(),
  raw: lesson,
});

/** Group flat lessons into `[{ date, week, data }]` sections by calendar day. */
export const groupLessonsByDay = (lessons: NormalizedLesson[]): ScheduleSection[] => {
  const sections: ScheduleSection[] = [];
  for (const lesson of lessons) {
    const last = sections[sections.length - 1];
    if (last && isSameDay(last.date, lesson.date)) {
      last.data.push(lesson);
    } else {
      sections.push({ date: lesson.date, week: lesson.week, data: [lesson] });
    }
  }
  return sections;
};

/**
 * Index of the first section whose date is today or in the future. Used by
 * `ScheduleView` to auto-scroll on first render. Returns -1 if all sections
 * are in the past.
 */
export const findUpcomingSectionIndex = (sections: ScheduleSection[], now: Date): number => {
  const todayStart = startOfLocalDay(now);
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    if (!s) continue;
    if (s.date.getTime() >= todayStart.getTime()) return i;
  }
  return -1;
};

/**
 * A single row in the flattened schedule list consumed by `FlashList`.
 *
 * `FlashList` works with a flat `data` array (no native section concept), so we
 * expand `ScheduleSection[]` into a typed row stream: a day `header`, its
 * `lesson` rows, an optional Unity `banner` after the section, and a one-off
 * `examsSeparator` before the first exam section. `getItemType` recycles views
 * per `type`; `key` is a stable list key.
 */
export type ScheduleRow =
  | { type: 'examsSeparator'; key: string }
  | { type: 'header'; key: string; section: ScheduleSection }
  | { type: 'lesson'; key: string; lesson: NormalizedLesson }
  | { type: 'banner'; key: string; sectionIndex: number };

interface BuildRowsOptions {
  /**
   * Combined-array index of the section before which the "exams" separator is
   * inserted. `undefined` — no separator (no exams, or no regular sections
   * preceding them).
   */
  examsSeparatorBeforeIndex?: number;
  /** Combined-array section indices after which a Unity banner row is appended. */
  bannerSectionIndices?: ReadonlySet<number>;
}

/** Stable list key for a section header (date + regular/exam discriminator). */
export const headerRowKey = (section: ScheduleSection): string =>
  `header:${section.isExam ? 'e' : 'r'}:${section.date.getTime()}`;

/**
 * Expand day sections into a flat, typed row stream for `FlashList`.
 * Order per section: `[examsSeparator?]` → `header` → `lesson…` → `[banner?]`.
 */
export const buildScheduleRows = (
  sections: ScheduleSection[],
  options: BuildRowsOptions = {},
): ScheduleRow[] => {
  const { examsSeparatorBeforeIndex, bannerSectionIndices } = options;
  const rows: ScheduleRow[] = [];
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (!section) continue;
    if (examsSeparatorBeforeIndex === i) {
      rows.push({ type: 'examsSeparator', key: 'exams-separator' });
    }
    rows.push({ type: 'header', key: headerRowKey(section), section });
    for (const lesson of section.data) {
      rows.push({ type: 'lesson', key: `lesson:${lesson.key}`, lesson });
    }
    if (bannerSectionIndices?.has(i)) {
      rows.push({ type: 'banner', key: `banner:${i}`, sectionIndex: i });
    }
  }
  return rows;
};
