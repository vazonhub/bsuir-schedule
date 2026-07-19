import type { DayNameRu, SubgroupNumber, WeekNumber } from './common.dto';

/**
 * One occupancy slot for an auditory, aggregated across all groups.
 * Mirrors `AuditorySlot` in `services/auditory-api/src/types.ts`.
 */
export interface AuditorySlotDto {
  /** "HH:mm" — start time. */
  startTime: string;
  /** "HH:mm" — end time. */
  endTime: string;
  /** Weeks (1..4) when this slot occurs. Empty array = every week. */
  weekNumber: WeekNumber[];
  /** Short subject code, e.g. "МСиСвИТ". */
  subject: string;
  /** Lesson type abbrev (ЛК/ЛР/ПЗ/...) or null. */
  lessonTypeAbbrev: string | null;
  /** Groups occupying this slot (there can be several — flow lecture). */
  groups: string[];
  /** 0 = whole group; 1 or 2 = subgroup marker. */
  numSubgroup: SubgroupNumber;
  /** ISO date for one-off lessons (exams/announcements); null for regular slots. */
  dateLesson: string | null;
}

export type AuditoryWeekSchedule = Partial<Record<DayNameRu, AuditorySlotDto[]>>;

/**
 * Full index returned by `GET /index` from the auditory-api Worker.
 * Downloaded whole (~200 KB gzipped) and cached for 24 h.
 */
export interface AuditoryIndexDto {
  updatedAt: string;
  currentWeek: WeekNumber;
  auditories: Record<string, AuditoryWeekSchedule>;
}
