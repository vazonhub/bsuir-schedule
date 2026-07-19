/**
 * Employee (teacher) entry returned by `GET /api/v1/employees/all`
 * and embedded into `LessonDto.employees[]`.
 */
export interface EmployeeDto {
  id: number;
  firstName: string;
  /**
   * Patronymic. Missing for some teachers (e.g. foreigners) and comes back
   * as `null`. Observed on ≈6/810 records.
   */
  middleName: string | null;
  lastName: string;
  /** Cyrillic short FIO, e.g. "Абакунчик Н. А." */
  fio?: string;
  photoLink: string;
  /** Academic degree, full form, e.g. "доктор технических наук" */
  degree: string;
  /** Short form, e.g. "д.т.н." */
  degreeAbbrev?: string;
  /** Job rank, e.g. "профессор" */
  rank: string | null;
  email?: string | null;
  /** Used as `:urlId` path param for employee schedule endpoint. */
  urlId: string;
  calendarId: string;
  /** List of department abbreviations, e.g. ["Каф.ИРТ"] */
  academicDepartment?: string[];
  jobPositions?: string[] | null;
  chief?: boolean;
}
