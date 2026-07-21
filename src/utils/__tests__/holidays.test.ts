import { findHolidayName, getFallbackHolidays, toDateISO } from '@utils/holidays';
import type { Holiday } from '@models/holiday';

describe('getFallbackHolidays', () => {
  it('returns the 8 fixed Belarusian holidays for the given year', () => {
    const holidays = getFallbackHolidays(2025);
    expect(holidays).toHaveLength(8);
  });

  it('formats each date as yyyy-MM-dd with zero-padding', () => {
    const holidays = getFallbackHolidays(2025);
    expect(holidays).toContainEqual({ date: '2025-01-01', name: 'Новый год' });
    expect(holidays).toContainEqual({ date: '2025-03-08', name: 'День женщин' });
    expect(holidays).toContainEqual({ date: '2025-05-09', name: 'День Победы' });
  });

  it('respects the requested year', () => {
    expect(getFallbackHolidays(2030).every((h) => h.date.startsWith('2030-'))).toBe(true);
  });
});

describe('findHolidayName', () => {
  const holidays: Holiday[] = [
    { date: '2025-01-01', name: 'Новый год' },
    { date: '2025-05-09', name: 'День Победы' },
  ];

  it('returns the holiday name for a matching date', () => {
    expect(findHolidayName('2025-01-01', holidays)).toBe('Новый год');
  });

  it('returns null when no holiday matches', () => {
    expect(findHolidayName('2025-02-02', holidays)).toBeNull();
  });

  it('returns null for an empty list', () => {
    expect(findHolidayName('2025-01-01', [])).toBeNull();
  });

  it('joins multiple holidays on the same date with " · "', () => {
    const overlapping: Holiday[] = [
      { date: '2025-01-07', name: 'Рождество' },
      { date: '2025-01-07', name: 'Выходной' },
    ];
    expect(findHolidayName('2025-01-07', overlapping)).toBe('Рождество · Выходной');
  });
});

describe('toDateISO', () => {
  it('formats a Date as yyyy-MM-dd with zero-padding', () => {
    expect(toDateISO(new Date(2025, 0, 5))).toBe('2025-01-05');
    expect(toDateISO(new Date(2025, 11, 31))).toBe('2025-12-31');
  });

  it('round-trips against getFallbackHolidays dates', () => {
    const iso = toDateISO(new Date(2025, 4, 9));
    expect(findHolidayName(iso, getFallbackHolidays(2025))).toBe('День Победы');
  });
});
