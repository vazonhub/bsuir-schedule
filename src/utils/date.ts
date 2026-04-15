import { addDays as fnsAddDays, format, isSameDay as fnsIsSameDay, parse, startOfDay } from 'date-fns';

import type { BsuirDateString, DayNameRu, WeekNumber } from '@models/dto';

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

const MONTHS_GENITIVE_RU = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
] as const;

/** "Понедельник, 14 апреля · Неделя 2" */
export const formatDayHeader = (date: Date, week: WeekNumber): string => {
  const dayName = DAY_NAMES_RU[date.getDay()];
  const dom = date.getDate();
  const month = MONTHS_GENITIVE_RU[date.getMonth()];
  return `${dayName}, ${dom} ${month} · Неделя ${week}`;
};

/** "Сегодня" / "Завтра" / "Понедельник, 14 апреля". Used for non-sticky labels. */
export const formatDayShort = (date: Date, today: Date): string => {
  if (isSameDay(date, today)) return 'Сегодня';
  if (isSameDay(date, addDays(today, 1))) return 'Завтра';
  const dayName = DAY_NAMES_RU[date.getDay()];
  const dom = date.getDate();
  const month = MONTHS_GENITIVE_RU[date.getMonth()];
  return `${dayName}, ${dom} ${month}`;
};
