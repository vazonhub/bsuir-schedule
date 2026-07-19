import type { BsuirDateString, DayNameRu } from './common.dto';
import type { EmployeeDto } from './employee.dto';
import type { LessonDto } from './lesson.dto';
import type { StudentGroupDto } from './student-group.dto';

/**
 * Schedule response returned by:
 *   GET /api/v1/schedule?studentGroup={name}
 *   GET /api/v1/employees/schedule/{urlId}
 *
 * One of `studentGroupDto` / `employeeDto` is populated, the other is null.
 * `schedules` is an object keyed by Russian day names, and each value is an
 * array of lessons that occur on that day across the 4-week cycle.
 */
export interface ScheduleDto {
  startDate: BsuirDateString | null;
  endDate: BsuirDateString | null;
  startExamsDate: BsuirDateString | null;
  endExamsDate: BsuirDateString | null;

  studentGroupDto: StudentGroupDto | null;
  employeeDto: EmployeeDto | null;

  schedules: Partial<Record<DayNameRu, LessonDto[]>> | null;
  /** Schedule for the next term, when API has it pre-loaded. */
  nextSchedules: Partial<Record<DayNameRu, LessonDto[]>> | null;

  /** Term identifiers (rare, may be null). */
  currentTerm: number | null;
  nextTerm: number | null;

  /** Exam sessions, flat list. */
  exams: LessonDto[];

  /** "Весенний" / "Осенний" — current academic period. */
  currentPeriod: string | null;
  isZaochOrDist: boolean;
}

/**
 * Raw integer returned by `GET /api/v1/schedule/current-week`. Always 1..4.
 */
export type CurrentWeekNumber = 1 | 2 | 3 | 4;
