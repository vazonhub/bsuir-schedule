import {
  addDays as fnsAddDays,
  format,
  isSameDay as fnsIsSameDay,
  parse,
  startOfDay,
} from 'date-fns';

import i18n from '@i18n';
import type { BsuirDateString, DayNameRu } from '@models/dto';

const BSUIR_DATE_FMT = 'dd.MM.yyyy';

export const parseBsuirDate = (input: BsuirDateString | null | undefined): Date | null => {
  if (!input) return null;
  const d = parse(input, BSUIR_DATE_FMT, new Date());
  return Number.isNaN(d.getTime()) ? null : d;
};

export const formatBsuirDate = (d: Date): BsuirDateString => format(d, BSUIR_DATE_FMT);

export const addDays = (d: Date, n: number): Date => fnsAddDays(d, n);
export const isSameDay = (a: Date, b: Date): boolean => fnsIsSameDay(a, b);
export const startOfLocalDay = (d: Date): Date => startOfDay(d);

/**
 * Russian day-of-week names ordered to match `Date.getDay()` (Sun=0..Sat=6).
 */
export const DAY_NAMES_RU: readonly DayNameRu[] = [
  'Воскресенье',
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
];

/** Inverse mapping: `DAY_NAME_TO_DOW['Понедельник']` → 1. */
export const DAY_NAME_TO_DOW: Readonly<Record<DayNameRu, number>> = {
  Воскресенье: 0,
  Понедельник: 1,
  Вторник: 2,
  Среда: 3,
  Четверг: 4,
  Пятница: 5,
  Суббота: 6,
};

/** Get localized day names (Sun=0..Sat=6) from i18n. */
export const getDayNames = (): string[] => i18n.t('date.days', { returnObjects: true }) as string[];

/** Get localized month names from i18n. */
const getMonthNames = (): string[] => i18n.t('date.months', { returnObjects: true }) as string[];

/** Get localized short day names from i18n. */
const getDayNamesShort = (): string[] =>
  i18n.t('date.daysShort', { returnObjects: true }) as string[];

/** "Понедельник" — только название дня недели (для двухстрочного заголовка). */
export const formatDayName = (date: Date): string => {
  const days = getDayNames();
  return days[date.getDay()] ?? '';
};

/** "14 апреля" — день месяца + месяц (без дня недели и номера недели). */
export const formatDayDate = (date: Date): string => {
  const months = getMonthNames();
  return `${date.getDate()} ${months[date.getMonth()] ?? ''}`;
};

/** "Сегодня" / "Завтра" / "Понедельник, 14 апреля". Used for non-sticky labels. */
export const formatDayShort = (date: Date, today: Date): string => {
  if (isSameDay(date, today)) return i18n.t('date.today');
  if (isSameDay(date, addDays(today, 1))) return i18n.t('date.tomorrow');
  const days = getDayNames();
  const months = getMonthNames();
  const dayName = days[date.getDay()];
  const dom = date.getDate();
  const month = months[date.getMonth()];
  return `${dayName}, ${dom} ${month}`;
};

/** Compact variant for the floating header: "Сегодня" / "Завтра" / "ПН, 14 апреля". */
export const formatDayShortCompact = (date: Date, today: Date): string => {
  if (isSameDay(date, today)) return i18n.t('date.today');
  if (isSameDay(date, addDays(today, 1))) return i18n.t('date.tomorrow');
  const shorts = getDayNamesShort();
  const months = getMonthNames();
  const abbrev = shorts[date.getDay()];
  const dom = date.getDate();
  const month = months[date.getMonth()];
  return `${abbrev}, ${dom} ${month}`;
};
