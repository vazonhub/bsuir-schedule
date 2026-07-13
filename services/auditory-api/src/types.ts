/**
 * Public shape returned by `GET /index`.
 * Kept minimal because this JSON is downloaded whole by every mobile client
 * once per day. ~200 KB gzipped for full BSUIR (500+ auditories).
 */
export interface AuditoryIndex {
  /** ISO timestamp of the last successful crawl. */
  updatedAt: string;
  /** Current 4-week-cycle number at the moment of crawl (1..4). */
  currentWeek: 1 | 2 | 3 | 4;
  /** Map: normalized auditory name → weekly schedule keyed by Russian day name. */
  auditories: Record<string, AuditoryDaySchedule>;
}

export type DayNameRu =
  | 'Понедельник'
  | 'Вторник'
  | 'Среда'
  | 'Четверг'
  | 'Пятница'
  | 'Суббота'
  | 'Воскресенье';

export type AuditoryDaySchedule = Partial<Record<DayNameRu, AuditorySlot[]>>;

export interface AuditorySlot {
  /** "HH:MM" — start time. */
  startTime: string;
  /** "HH:MM" — end time. */
  endTime: string;
  /** Weeks (1..4) when this slot occurs. Empty array = every week. */
  weekNumber: number[];
  /** Short subject code, e.g. "МСиСвИТ". */
  subject: string;
  /** Lesson type abbrev (ЛК/ЛР/ПЗ/...) or null. */
  lessonTypeAbbrev: string | null;
  /** Groups occupying this slot (there can be multiple — flow lecture). */
  groups: string[];
  /** 0 = whole group; 1 or 2 = subgroup marker. */
  numSubgroup: 0 | 1 | 2;
  /** ISO date for one-off lessons (exams/announcements); null for regular slots. */
  dateLesson: string | null;
}

/** Metadata about the current index (light response, no schedule data). */
export interface AuditoryIndexMeta {
  updatedAt: string;
  currentWeek: 1 | 2 | 3 | 4;
  auditoryCount: number;
  groupCount: number;
  bytes: number;
}
