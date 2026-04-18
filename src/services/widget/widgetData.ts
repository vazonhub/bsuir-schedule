import type { EmployeeDto, LessonDto, ScheduleDto, WeekNumber } from '@models/dto';
import type { SubgroupChoice } from '@stores/preferences.store';
import { getLessonAccentColor } from '@utils/lesson';
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
  /** 0 = общая, 1 | 2 = конкретная подгруппа. */
  numSubgroup: number;
  /** True if this lesson belongs to the user's selected subgroup (or is shared). */
  isMine: boolean;
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
}

const buildTeacherShort = (employees: EmployeeDto[]): string | null => {
  const first = employees[0];
  if (!first) return null;
  if (first.fio) return first.fio;
  const initials = [first.firstName?.[0], first.middleName?.[0]]
    .filter(Boolean)
    .map((c) => `${c}.`)
    .join(' ');
  return `${first.lastName ?? ''} ${initials}`.trim() || null;
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
    numSubgroup: numSub,
    isMine,
  };
};

const toDateISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const toDayBlock = (date: Date, lessons: NormalizedLesson[], subgroup: SubgroupChoice): WidgetDayBlock => ({
  dateISO: toDateISO(date),
  dayOfWeek: date.getDay(),
  dayOfMonth: date.getDate(),
  month: date.getMonth(),
  lessons: lessons.map((l) => toWidgetLesson(l, subgroup)),
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
): WidgetSnapshot => {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // Flatten regular + exams together
  const regularLessons = flattenSchedule(schedule, currentWeek, now);
  const examLessons = flattenExams(schedule, currentWeek, now);
  const all = [...regularLessons, ...examLessons].sort(
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
    nextDayBlock = toDayBlock(nextDate, nextDayLessons, subgroup);
  }

  return {
    groupName,
    generatedAt: now.toISOString(),
    currentWeek,
    subgroup,
    today: toDayBlock(todayStart, todayLessons, subgroup),
    nextDay: nextDayBlock,
  };
};
