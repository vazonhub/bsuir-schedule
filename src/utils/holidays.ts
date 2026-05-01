import type { Holiday } from '@models/holiday';

/**
 * Hardcoded Belarusian state holidays — fallback when the API is unavailable.
 * These are fixed-date holidays that rarely change.
 */
const FIXED_HOLIDAYS: ReadonlyArray<{ month: number; day: number; name: string }> = [
  { month: 1, day: 1, name: 'Новый год' },
  { month: 1, day: 7, name: 'Рождество (православное)' },
  { month: 3, day: 8, name: 'День женщин' },
  { month: 5, day: 1, name: 'День труда' },
  { month: 5, day: 9, name: 'День Победы' },
  { month: 7, day: 3, name: 'День Независимости' },
  { month: 11, day: 7, name: 'День Октябрьской революции' },
  { month: 12, day: 25, name: 'Рождество (католическое)' },
];

/** Generate fallback holiday list for a given year. */
export const getFallbackHolidays = (year: number): Holiday[] =>
  FIXED_HOLIDAYS.map(({ month, day, name }) => ({
    date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    name,
  }));

/**
 * Look up holidays by date in a list.
 * @param dateISO — ISO date string "yyyy-MM-dd"
 * @param holidays — list of holidays for the year
 * @returns combined holiday name(s) or null
 */
export const findHolidayName = (dateISO: string, holidays: Holiday[]): string | null => {
  const matches = holidays.filter((h) => h.date === dateISO);
  if (matches.length === 0) return null;
  return matches.map((h) => h.name).join(' · ');
};

/** Format a Date to "yyyy-MM-dd" for lookup. */
export const toDateISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
