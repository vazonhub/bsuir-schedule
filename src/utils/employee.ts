import type { EmployeeDto } from '@models/dto';

/** Origin of the BSUIR IIS API (matches `http.ts` baseURL host). */
const API_ORIGIN = 'https://iis.bsuir.by';

/**
 * Resolve a usable absolute photo URL for an employee.
 *
 * The `/employees/all` endpoint returns an absolute `photoLink`
 * (`https://iis.bsuir.by/api/v1/employees/photo/<id>`), but the employees
 * embedded into a schedule's `LessonDto.employees[]` come back with a broken
 * link where the origin is serialized as the literal string `"null"`
 * (e.g. `"null/api/v1/employees/photo/500570"`). Such a URL never loads, so the
 * avatar falls back to a placeholder everywhere the schedule feeds the UI
 * (lesson cards, details sheet, widgets).
 *
 * We rebuild a valid URL from the numeric `id` (identical to what
 * `/employees/all` returns) and leave already-absolute or local-asset links
 * (e.g. hardcoded legend photos) untouched.
 */
export const resolveEmployeePhotoLink = (
  emp: Pick<EmployeeDto, 'id' | 'photoLink'>,
): string | null => {
  const link = emp.photoLink;
  // Already a usable absolute URL (from /employees/all) or a local asset
  // (legend photos via resolveAsset) — keep as-is.
  if (link && /^(https?:|file:|data:|content:|asset:)/i.test(link)) return link;
  // Broken/relative link from the schedule payload — rebuild from the id.
  if (emp.id != null) return `${API_ORIGIN}/api/v1/employees/photo/${emp.id}`;
  return link || null;
};
