/**
 * Student group entry returned by `GET /api/v1/student-groups`.
 * Also embedded inside `LessonDto.studentGroups[]`.
 */
export interface StudentGroupDto {
  id: number;
  name: string;
  facultyId: number;
  facultyAbbrev: string;
  facultyName: string;
  specialityDepartmentEducationFormId: number;
  specialityName: string;
  specialityAbbrev: string;
  course: number;
  calendarId: string;
  educationDegree: number;
}

/**
 * Compact form embedded into a lesson — has no faculty or course info.
 */
export interface LessonStudentGroupDto {
  name: string;
  specialityName: string;
  specialityCode: string;
  numberOfStudents: number;
  educationDegree: number;
}
