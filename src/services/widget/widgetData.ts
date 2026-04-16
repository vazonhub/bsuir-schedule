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
}

export interface WidgetSnapshot {
  groupName: string;
  generatedAt: string;
  currentWeek: WeekNumber;
  todayLessons: WidgetLesson[];
  upcomingLessons: WidgetLesson[];
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

  // Today's lessons
  const todayLessons = all
    .filter((l) => l.date.getTime() === todayStart.getTime())
    .map(toWidgetLesson);

  // Upcoming: lessons after "now" (same day included), max 3
  const upcomingLessons: WidgetLesson[] = [];
  for (const l of all) {
    if (upcomingLessons.length >= 3) break;
    // Build Date for lesson start
    const [hStr, mStr] = l.startTime.split(':');
    const lessonStart = new Date(l.date);
    lessonStart.setHours(Number(hStr), Number(mStr), 0, 0);
    if (lessonStart.getTime() > now.getTime()) {
      upcomingLessons.push(toWidgetLesson(l));
    }
  }

  return {
    groupName,
    generatedAt: now.toISOString(),
    currentWeek,
    todayLessons,
    upcomingLessons,
  };
};
