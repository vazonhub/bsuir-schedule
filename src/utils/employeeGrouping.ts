import i18n from '@i18n';
import type { EmployeeDto } from '@models/dto';

export interface EmployeeSection {
  key: string;
  title: string;
  data: EmployeeDto[];
}

export const PINNED_SECTION_KEY = 'pinned';

/**
 * Build a virtual «Закреплённые» section out of the user's pinned employee urlIds.
 * Returns `null` if nothing is pinned (callers should skip).
 */
export const buildPinnedEmployeeSection = (
  employees: EmployeeDto[],
  pinnedUrlIds: string[],
): EmployeeSection | null => {
  if (pinnedUrlIds.length === 0) return null;
  const pinnedSet = new Set(pinnedUrlIds);
  const data = employees.filter((e) => pinnedSet.has(e.urlId));
  if (data.length === 0) return null;
  // Сохраняем порядок закрепления (как в pinnedUrlIds), а не алфавит.
  data.sort((a, b) => pinnedUrlIds.indexOf(a.urlId) - pinnedUrlIds.indexOf(b.urlId));
  return {
    key: PINNED_SECTION_KEY,
    title: i18n.t('groups.favorites'),
    data,
  };
};

/**
 * Wrap all (non-pinned) employees into a single «Все преподаватели» section.
 */
export const buildAllEmployeesSection = (
  employees: EmployeeDto[],
  pinnedUrlIds: string[],
): EmployeeSection => {
  const pinnedSet = new Set(pinnedUrlIds);
  const data = employees.filter((e) => !pinnedSet.has(e.urlId));
  return {
    key: 'all',
    title: i18n.t('employees.allEmployees'),
    data,
  };
};
