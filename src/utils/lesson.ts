import { FALLBACK_LESSON_COLOR, LESSON_TYPE_COLORS } from '@theme/colors';
import type { KnownLessonType } from '@theme/colors';
import type { LessonTypeAbbrev } from '@models/dto';
import type { NormalizedLesson } from '@utils/scheduleNormalization';

export const getLessonAccentColor = (type: LessonTypeAbbrev | null | undefined): string => {
  if (!type) return FALLBACK_LESSON_COLOR;
  return (
    LESSON_TYPE_COLORS[type as KnownLessonType] ??
    FALLBACK_LESSON_COLOR
  );
};

const FULL_LESSON_TYPE_NAME: Record<string, string> = {
  ПЗ: 'Практическое занятие',
  ЛР: 'Лабораторная работа',
  ЛК: 'Лекция',
  Консультация: 'Консультация',
  Экзамен: 'Экзамен',
};

export const getLessonTypeFullName = (type: LessonTypeAbbrev | null | undefined): string => {
  if (!type) return 'Занятие';
  return FULL_LESSON_TYPE_NAME[type] ?? type;
};

export type LessonTimeStatus =
  | { kind: 'past' }
  | { kind: 'future' }
  | { kind: 'ongoing'; progress: number };

const parseHm = (hm: string): { h: number; m: number } | null => {
  const [hStr, mStr] = hm.split(':');
  if (hStr === undefined || mStr === undefined) return null;
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { h, m };
};

const buildAt = (date: Date, hm: string): Date | null => {
  const parsed = parseHm(hm);
  if (!parsed) return null;
  const out = new Date(date);
  out.setHours(parsed.h, parsed.m, 0, 0);
  return out;
};

/**
 * Compute past / ongoing / future status of a lesson relative to `now`.
 * Returns `null` if start/end can't be parsed (defensive — API contract
 * guarantees `HH:mm`, but `noUncheckedIndexedAccess` makes this explicit).
 */
export const getLessonTimeStatus = (
  lesson: NormalizedLesson,
  now: Date,
): LessonTimeStatus | null => {
  const start = buildAt(lesson.date, lesson.startTime);
  const end = buildAt(lesson.date, lesson.endTime);
  if (!start || !end) return null;
  const t = now.getTime();
  if (t >= end.getTime()) return { kind: 'past' };
  if (t < start.getTime()) return { kind: 'future' };
  const total = end.getTime() - start.getTime();
  if (total <= 0) return { kind: 'ongoing', progress: 1 };
  const progress = Math.min(1, Math.max(0, (t - start.getTime()) / total));
  return { kind: 'ongoing', progress };
};

/**
 * 5-минутный «межблоковый» перерыв в середине пары (40 + 5 + 40 для
 * стандартных 85-минутных пар; для нестандартных длительностей берём
 * центральные 5 минут).
 *
 * Возвращает позицию (от 0 до 1) и ширину блока относительно полной
 * длительности пары, а также подпись `startsAt` ("HH:mm") — момент,
 * когда перерыв начнётся. `null`, если время не парсится или пара
 * короче перерыва.
 */
export const getLessonBreakRange = (
  lesson: NormalizedLesson,
): {
  startFraction: number;
  widthFraction: number;
  startsAt: string;
} | null => {
  const start = buildAt(lesson.date, lesson.startTime);
  const end = buildAt(lesson.date, lesson.endTime);
  if (!start || !end) return null;
  const totalMin = (end.getTime() - start.getTime()) / 60_000;
  const breakMin = 5;
  if (totalMin <= breakMin) return null;
  const breakStartMin = (totalMin - breakMin) / 2;
  const breakStartDate = new Date(start.getTime() + breakStartMin * 60_000);
  const hh = String(breakStartDate.getHours()).padStart(2, '0');
  const mm = String(breakStartDate.getMinutes()).padStart(2, '0');
  return {
    startFraction: breakStartMin / totalMin,
    widthFraction: breakMin / totalMin,
    startsAt: `${hh}:${mm}`,
  };
};
