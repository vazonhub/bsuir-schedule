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

/**
 * Group non-pinned employees by the first letter of their last name.
 * Returns an array of sections sorted alphabetically.
 */
export const buildAlphabetSections = (
  employees: EmployeeDto[],
  pinnedUrlIds: string[],
): EmployeeSection[] => {
  const pinnedSet = new Set(pinnedUrlIds);
  const map = new Map<string, EmployeeDto[]>();
  for (const e of employees) {
    if (pinnedSet.has(e.urlId)) continue;
    const letter = (e.lastName[0] ?? '?').toUpperCase();
    const arr = map.get(letter);
    if (arr) arr.push(e);
    else map.set(letter, [e]);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'ru'))
    .map(([letter, data]) => ({
      key: letter,
      title: letter,
      // Внутри буквы сортируем по алфавиту (фамилия, затем имя),
      // иначе прыжок по алфавитному индексу ведёт в случайное место буквы.
      data: [...data].sort(
        (a, b) =>
          a.lastName.localeCompare(b.lastName, 'ru') ||
          a.firstName.localeCompare(b.firstName, 'ru'),
      ),
    }));
};
