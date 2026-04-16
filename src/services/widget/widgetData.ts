import type { EmployeeDto, LessonDto, ScheduleDto, WeekNumber } from '@models/dto';
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
}

export interface WidgetSnapshot {
  groupName: string;
  generatedAt: string;
  currentWeek: WeekNumber;
  todayLessons: WidgetLesson[];
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

const toWidgetLesson = (lesson: NormalizedLesson): WidgetLesson => ({
  subject: lesson.raw.subject,
  typeAbbrev: lesson.raw.lessonTypeAbbrev,
  typeColorHex: getLessonAccentColor(lesson.raw.lessonTypeAbbrev),
  startTime: lesson.startTime,
  endTime: lesson.endTime,
  auditories: lesson.raw.auditories ?? [],
  teacher: buildTeacherShort(lesson.raw.employees ?? []),
  teacherPhotoUrl: lesson.raw.employees?.[0]?.photoLink ?? null,
});

/**
 * Build a compact snapshot for widgets: today's lessons + next 3 upcoming.
 */
export const buildWidgetSnapshot = (
  schedule: ScheduleDto,
  currentWeek: WeekNumber,
  now: Date,
  groupName: string,
): WidgetSnapshot => {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  // Flatten regular + exams together
  const regularLessons = flattenSchedule(schedule, currentWeek, now);
  const examLessons = flattenExams(schedule, currentWeek, now);
  const all = [...regularLessons, ...examLessons].sort(
    (a, b) => a.date.getTime() - b.date.getTime() || a.startTime.localeCompare(b.startTime),
  );

  // All of today's lessons (Swift side filters out past ones at render time)
  const todayLessons = all
    .filter((l) => l.date.getTime() === todayStart.getTime())
    .map(toWidgetLesson);

  return {
    groupName,
    generatedAt: now.toISOString(),
    currentWeek,
    todayLessons,
  };
};
