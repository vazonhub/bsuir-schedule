import type { BsuirDateString, BsuirTimeString, SubgroupNumber, WeekNumber } from './common.dto';
import type { EmployeeDto } from './employee.dto';
import type { LessonStudentGroupDto } from './student-group.dto';

/**
 * Raw lesson type abbreviation as returned by API.
 * Three regular types (ПЗ, ЛР, ЛК) plus consultation and exam markers.
 */
export type LessonTypeAbbrev =
  | 'ПЗ' // Practical class
  | 'ЛР' // Laboratory work
  | 'ЛК' // Lecture
  | 'Консультация'
  | 'Экзамен'
  | string; // fallback for unknown values

/**
 * Single lesson entry. Appears inside `ScheduleDto.schedules[dayName][]`
 * or inside `ScheduleDto.exams[]`.
 */
export interface LessonDto {
  auditories: string[];
  startLessonTime: BsuirTimeString;
  endLessonTime: BsuirTimeString;
  lessonTypeAbbrev: LessonTypeAbbrev | null;
  note: string | null;
  numSubgroup: SubgroupNumber;
  studentGroups: LessonStudentGroupDto[];
  /** Short subject code, e.g. "МСиСвИТ" */
  subject: string;
  /** Full subject name, e.g. "Метрология, стандартизация и сертификация…" */
  subjectFullName: string;
  /** Weeks (1..4) when this lesson takes place. Empty array means "every week". */
  weekNumber: WeekNumber[];
  employees: EmployeeDto[];
  /** Single date for one-off lessons (used in exams and announcements). */
  dateLesson: BsuirDateString | null;
  /** Range start for periodic lessons. */
  startLessonDate: BsuirDateString | null;
  /** Range end for periodic lessons. */
  endLessonDate: BsuirDateString | null;
  announcement: boolean;
  split: boolean;
}
