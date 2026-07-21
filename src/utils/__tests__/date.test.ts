import {
  DAY_NAMES_RU,
  DAY_NAME_TO_DOW,
  addDays,
  formatBsuirDate,
  formatDayDate,
  formatDayName,
  formatDayShort,
  formatDayShortCompact,
  getDayNames,
  isSameDay,
  parseBsuirDate,
  startOfLocalDay,
} from '@utils/date';

describe('parseBsuirDate', () => {
  it('parses a valid dd.MM.yyyy string', () => {
    const d = parseBsuirDate('14.04.2025');
    expect(d).not.toBeNull();
    expect(d?.getFullYear()).toBe(2025);
    expect(d?.getMonth()).toBe(3); // April (0-based)
    expect(d?.getDate()).toBe(14);
  });

  it('returns null for null / undefined / empty input', () => {
    expect(parseBsuirDate(null)).toBeNull();
    expect(parseBsuirDate(undefined)).toBeNull();
    expect(parseBsuirDate('')).toBeNull();
  });

  it('returns null for a non-date string', () => {
    expect(parseBsuirDate('not-a-date')).toBeNull();
  });
});

describe('formatBsuirDate', () => {
  it('formats a Date as dd.MM.yyyy', () => {
    expect(formatBsuirDate(new Date(2025, 3, 14))).toBe('14.04.2025');
  });

  it('round-trips with parseBsuirDate', () => {
    const parsed = parseBsuirDate('01.01.2026');
    expect(parsed).not.toBeNull();
    expect(formatBsuirDate(parsed as Date)).toBe('01.01.2026');
  });
});

describe('addDays / isSameDay / startOfLocalDay', () => {
  it('adds days, crossing a month boundary', () => {
    const result = addDays(new Date(2025, 3, 30), 2);
    expect(result.getMonth()).toBe(4); // May
    expect(result.getDate()).toBe(2);
  });

  it('subtracts days with a negative offset', () => {
    const result = addDays(new Date(2025, 3, 1), -1);
    expect(result.getMonth()).toBe(2); // March
    expect(result.getDate()).toBe(31);
  });

  it('isSameDay ignores the time-of-day', () => {
    expect(isSameDay(new Date(2025, 3, 14, 9, 0), new Date(2025, 3, 14, 23, 59))).toBe(true);
    expect(isSameDay(new Date(2025, 3, 14), new Date(2025, 3, 15))).toBe(false);
  });

  it('startOfLocalDay zeroes the time', () => {
    const d = startOfLocalDay(new Date(2025, 3, 14, 15, 30, 45));
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getDate()).toBe(14);
  });
});

describe('day-name tables', () => {
  it('DAY_NAMES_RU is ordered Sun..Sat to match Date.getDay()', () => {
    expect(DAY_NAMES_RU).toHaveLength(7);
    expect(DAY_NAMES_RU[0]).toBe('Воскресенье');
    expect(DAY_NAMES_RU[1]).toBe('Понедельник');
    expect(DAY_NAMES_RU[6]).toBe('Суббота');
  });

  it('DAY_NAME_TO_DOW is the inverse of DAY_NAMES_RU', () => {
    DAY_NAMES_RU.forEach((name, dow) => {
      expect(DAY_NAME_TO_DOW[name]).toBe(dow);
    });
  });
});

describe('localized formatters (ru)', () => {
  it('getDayNames returns 7 Russian day names', () => {
    const names = getDayNames();
    expect(names).toHaveLength(7);
    expect(names[1]).toBe('Понедельник');
  });

  it('formatDayName returns the weekday for a Monday', () => {
    expect(formatDayName(new Date(2025, 3, 14))).toBe('Понедельник');
  });

  it('formatDayDate returns "<day> <month>"', () => {
    expect(formatDayDate(new Date(2025, 3, 14))).toBe('14 апреля');
  });

  describe('formatDayShort', () => {
    const today = new Date(2025, 3, 14);

    it('says "Сегодня" for today', () => {
      expect(formatDayShort(today, today)).toBe('Сегодня');
    });

    it('says "Завтра" for tomorrow', () => {
      expect(formatDayShort(new Date(2025, 3, 15), today)).toBe('Завтра');
    });

    it('says "<weekday>, <day> <month>" otherwise', () => {
      expect(formatDayShort(new Date(2025, 3, 16), today)).toBe('Среда, 16 апреля');
    });
  });

  describe('formatDayShortCompact', () => {
    const today = new Date(2025, 3, 14);

    it('says "Сегодня" / "Завтра" like the long variant', () => {
      expect(formatDayShortCompact(today, today)).toBe('Сегодня');
      expect(formatDayShortCompact(new Date(2025, 3, 15), today)).toBe('Завтра');
    });

    it('uses the short weekday abbreviation otherwise', () => {
      expect(formatDayShortCompact(new Date(2025, 3, 16), today)).toBe('СР, 16 апреля');
    });
  });
});
