import type { Holiday } from '@models/holiday';
import type { EmployeeDto, LessonDto, ScheduleDto, WeekNumber } from '@models/dto';
import type { SubgroupChoice } from '@stores/preferences.store';
import { parseBsuirDate } from '@utils/date';
import { findHolidayName } from '@utils/holidays';
import { buildLessonBlockId, getLessonAccentColor } from '@utils/lesson';
import { flattenSchedule, flattenExams } from '@utils/scheduleNormalization';
import type { NormalizedLesson } from '@utils/scheduleNormalization';

export interface WidgetLesson {
  subject: string;
  typeAbbrev: string | null;
  typeColorHex: string;
  startTime: string;
  endTime: string;
  auditories: string[];
  teacher: string | null;
  teacherPhotoUrl: string | null;
  /** Photo URLs for all teachers (for multi-avatar display). */
  teacherPhotos: string[];
  /** 0 = общая, 1 | 2 = конкретная подгруппа. */
  numSubgroup: number;
  /** True if this lesson belongs to the user's selected subgroup (or is shared). */
  isMine: boolean;
  /** Optional note/annotation for this lesson. */
  note: string | null;
  /** Group names for this lesson (used in employee schedule widgets). */
  studentGroups: string[];
}

export interface WidgetDayBlock {
  /** ISO date string (yyyy-MM-dd) for this day. */
  dateISO: string;
  /** Day of week 0..6 (matches JS Date.getDay()). */
  dayOfWeek: number;
  /** Day of month. */
  dayOfMonth: number;
  /** Month 0..11. */
  month: number;
  lessons: WidgetLesson[];
  /** State holiday name, if this day is a public holiday. */
  holidayName: string | null;
}

export interface WidgetStrings {
  daysShort: string[];
  months: string[];
  weekLabel: string;
  noClasses: string;
  allDone: string;
  subgroupShort: string;
  description: string;
}

export interface WidgetSnapshot {
  groupName: string;
  generatedAt: string;
  currentWeek: WeekNumber;
  /** User's selected subgroup for this group (0 = all). */
  subgroup: SubgroupChoice;
  /** Today's lessons (may be empty if no lessons today). */
  today: WidgetDayBlock;
  /** Next day with lessons (null if today has remaining lessons or no future lessons). */
  nextDay: WidgetDayBlock | null;
  /** Localized strings for the widget UI. */
  strings: WidgetStrings;
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

const toWidgetLesson = (lesson: NormalizedLesson, subgroup: SubgroupChoice): WidgetLesson => {
  const numSub = lesson.raw.numSubgroup;
  const isMine =
    subgroup === 0 || numSub === 0 || numSub === subgroup;

  return {
    subject: lesson.raw.subject,
    typeAbbrev: lesson.raw.lessonTypeAbbrev,
    typeColorHex: getLessonAccentColor(lesson.raw.lessonTypeAbbrev),
    startTime: lesson.startTime,
    endTime: lesson.endTime,
    auditories: lesson.raw.auditories ?? [],
    teacher: buildTeacherShort(lesson.raw.employees ?? []),
    teacherPhotoUrl: lesson.raw.employees?.[0]?.photoLink ?? null,
    teacherPhotos: (lesson.raw.employees ?? []).map((e) => e.photoLink).filter(Boolean),
    numSubgroup: numSub,
    isMine,
    note: lesson.raw.note ?? null,
    studentGroups: (lesson.raw.studentGroups ?? []).map((g) => g.name),
  };
};

const toDateISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const toDayBlock = (date: Date, lessons: NormalizedLesson[], subgroup: SubgroupChoice, holidays: Holiday[]): WidgetDayBlock => ({
  dateISO: toDateISO(date),
  dayOfWeek: date.getDay(),
  dayOfMonth: date.getDate(),
  month: date.getMonth(),
  lessons: lessons.map((l) => toWidgetLesson(l, subgroup)),
  holidayName: findHolidayName(toDateISO(date), holidays),
});

/**
 * Build a compact snapshot for widgets.
 *
 * Includes today's lessons and, if today has no remaining lessons,
 * the next upcoming day with lessons (so the widget can show "next day").
 */
export const buildWidgetSnapshot = (
  schedule: ScheduleDto,
  currentWeek: WeekNumber,
  now: Date,
  groupName: string,
  subgroup: SubgroupChoice,
  strings: WidgetStrings,
  blockedIds?: Set<string>,
  holidays: Holiday[] = [],
): WidgetSnapshot => {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // During exam session (today >= startExamsDate), skip regular schedule
  // to avoid duplicates — exams already cover everything.
  const startExams = parseBsuirDate(schedule.startExamsDate);
  const isExamSession = !!startExams && todayStart.getTime() >= startExams.getTime();
  const regularLessons = isExamSession ? [] : flattenSchedule(schedule, currentWeek, now);
  const examLessons = flattenExams(schedule, currentWeek, now);
  const unblocked = [...regularLessons, ...examLessons].filter(
    (l) => !blockedIds || !blockedIds.has(buildLessonBlockId(l)),
  );
  const all = unblocked.sort(
    (a, b) => a.date.getTime() - b.date.getTime() || a.startTime.localeCompare(b.startTime),
  );

  // Today's lessons
  const todayLessons = all.filter((l) => l.date.getTime() === todayStart.getTime());

  // Find next day with lessons (first day after today that has lessons)
  let nextDayBlock: WidgetDayBlock | null = null;
  const futureLessons = all.filter((l) => l.date.getTime() > todayStart.getTime());
  if (futureLessons.length > 0) {
    const nextDate = futureLessons[0]!.date;
    const nextDayLessons = futureLessons.filter((l) => l.date.getTime() === nextDate.getTime());
    nextDayBlock = toDayBlock(nextDate, nextDayLessons, subgroup, holidays);
  }

  return {
    groupName,
    generatedAt: now.toISOString(),
    currentWeek,
    subgroup,
    today: toDayBlock(todayStart, todayLessons, subgroup, holidays),
    nextDay: nextDayBlock,
    strings,
  };
};
