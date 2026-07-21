import type { Holiday } from '@models/holiday';
import type { EmployeeDto, ScheduleDto, WeekNumber } from '@models/dto';
import type { ResolvedScheme, SubgroupChoice, LanguageChoice } from '@stores/preferences.store';
import { addDays, parseBsuirDate, startOfLocalDay } from '@utils/date';
import { findHolidayName } from '@utils/holidays';
import { buildLessonBlockId, getLessonAccentColor } from '@utils/lesson';
import { computeWeekForDate, flattenExams, flattenSchedule } from '@utils/scheduleNormalization';
import type { NormalizedLesson } from '@utils/scheduleNormalization';

/** How many days ahead of today the snapshot covers (one full 4-week cycle). */
export const WATCH_WINDOW_DAYS = 28;

export interface WatchLesson {
  /** Stable id for SwiftUI list identity / deep-linking (matches buildLessonBlockId). */
  id: string;
  subject: string;
  typeAbbrev: string | null;
  typeColorHex: string;
  startTime: string;
  endTime: string;
  auditories: string[];
  teacher: string | null;
  /** 0 = shared, 1 | 2 = a specific subgroup. */
  numSubgroup: number;
  /** True if this lesson belongs to the user's selected subgroup (or is shared). */
  isMine: boolean;
  note: string | null;
}

export interface WatchDayBlock {
  /** ISO date string (yyyy-MM-dd). */
  dateISO: string;
  /** Day of week 0..6 (matches JS Date.getDay()). */
  dayOfWeek: number;
  dayOfMonth: number;
  /** Month 0..11. */
  month: number;
  /** 1..4 cycle week this day falls into. */
  weekNumber: WeekNumber;
  lessons: WatchLesson[];
  /** State holiday name, if this day is a public holiday. */
  holidayName: string | null;
}

export interface WatchStrings {
  daysShort: string[];
  daysLong: string[];
  months: string[];
  weekLabel: string;
  noClasses: string;
  today: string;
  tomorrow: string;
  subgroupShort: string;
}

export interface WatchSnapshot {
  version: 1;
  groupName: string;
  generatedAt: string;
  currentWeek: WeekNumber;
  /** Resolved app color scheme so the watch matches the app theme. */
  theme: ResolvedScheme;
  /** User's selected subgroup for this group (0 = all). */
  subgroup: SubgroupChoice;
  locale: LanguageChoice;
  strings: WatchStrings;
  /** Every day in the window [today .. today + WATCH_WINDOW_DAYS), empty days included. */
  days: WatchDayBlock[];
}

const buildEmployeeShort = (emp: EmployeeDto): string => {
  if (emp.fio) return emp.fio;
  const initials = [emp.firstName?.[0], emp.middleName?.[0]]
    .filter(Boolean)
    .map((c) => `${c}.`)
    .join(' ');
  return `${emp.lastName ?? ''} ${initials}`.trim() || '?';
};

const buildTeacherShort = (employees: EmployeeDto[]): string | null => {
  if (employees.length === 0) return null;
  return employees.map(buildEmployeeShort).join(', ');
};

const toWatchLesson = (lesson: NormalizedLesson, subgroup: SubgroupChoice): WatchLesson => {
  const numSub = lesson.raw.numSubgroup;
  const isMine = subgroup === 0 || numSub === 0 || numSub === subgroup;

  return {
    id: buildLessonBlockId(lesson),
    subject: lesson.raw.subject,
    typeAbbrev: lesson.raw.lessonTypeAbbrev,
    typeColorHex: getLessonAccentColor(lesson.raw.lessonTypeAbbrev),
    startTime: lesson.startTime,
    endTime: lesson.endTime,
    auditories: lesson.raw.auditories ?? [],
    teacher: buildTeacherShort(lesson.raw.employees ?? []),
    numSubgroup: numSub,
    isMine,
    note: lesson.raw.note ?? null,
  };
};

const toDateISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Build a full-window snapshot for the watch app.
 *
 * Unlike the widget snapshot (today + next day only), this covers the whole
 * 4-week window ahead so the watch can page through days and weeks offline.
 * Days without lessons are still emitted (so paging is continuous).
 *
 * Normalization mirrors `buildWidgetSnapshot` 1:1 (exam-session handling,
 * blocked lessons, subgroup `isMine`) so behaviour matches the phone.
 */
export const buildWatchSnapshot = (
  schedule: ScheduleDto,
  currentWeek: WeekNumber,
  now: Date,
  groupName: string,
  subgroup: SubgroupChoice,
  theme: ResolvedScheme,
  locale: LanguageChoice,
  strings: WatchStrings,
  blockedIds?: Set<string>,
  holidays: Holiday[] = [],
): WatchSnapshot => {
  const todayStart = startOfLocalDay(now);

  // During exam session (today >= startExamsDate), skip the regular schedule
  // to avoid duplicates — exams already cover everything.
  const startExams = parseBsuirDate(schedule.startExamsDate);
  const isExamSession = !!startExams && todayStart.getTime() >= startExams.getTime();
  const regularLessons = isExamSession ? [] : flattenSchedule(schedule, currentWeek, now);
  const examLessons = flattenExams(schedule, currentWeek, now);
  const unblocked = [...regularLessons, ...examLessons].filter(
    (l) => !blockedIds || !blockedIds.has(buildLessonBlockId(l)),
  );

  // Bucket lessons by ISO date for O(1) lookup while emitting the window.
  const byDate = new Map<string, NormalizedLesson[]>();
  for (const lesson of unblocked) {
    const iso = toDateISO(lesson.date);
    const bucket = byDate.get(iso);
    if (bucket) bucket.push(lesson);
    else byDate.set(iso, [lesson]);
  }

  const days: WatchDayBlock[] = [];
  for (let i = 0; i < WATCH_WINDOW_DAYS; i++) {
    const date = addDays(todayStart, i);
    const iso = toDateISO(date);
    const dayLessons = (byDate.get(iso) ?? [])
      .slice()
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    days.push({
      dateISO: iso,
      dayOfWeek: date.getDay(),
      dayOfMonth: date.getDate(),
      month: date.getMonth(),
      weekNumber: computeWeekForDate(date, todayStart, currentWeek),
      lessons: dayLessons.map((l) => toWatchLesson(l, subgroup)),
      holidayName: findHolidayName(iso, holidays),
    });
  }

  return {
    version: 1,
    groupName,
    generatedAt: now.toISOString(),
    currentWeek,
    theme,
    subgroup,
    locale,
    strings,
    days,
  };
};
