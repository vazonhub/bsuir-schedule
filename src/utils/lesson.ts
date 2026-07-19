import i18n from '@i18n';
import { usePreferencesStore } from '@stores/preferences.store';
import { FALLBACK_LESSON_COLOR, LESSON_TYPE_COLORS } from '@theme/colors';
import type { KnownLessonType } from '@theme/colors';
import type { LessonTypeAbbrev } from '@models/dto';
import type { NormalizedLesson } from '@utils/scheduleNormalization';

/**
 * Non-hook version that reads overrides from store.getState().
 * Used in non-React contexts (widget data, etc.).
 */
export const getLessonAccentColor = (type: LessonTypeAbbrev | null | undefined): string => {
  if (!type) return FALLBACK_LESSON_COLOR;
  const overrides = usePreferencesStore.getState().lessonColorOverrides;
  const override = overrides[type as KnownLessonType];
  if (override) return override;
  return LESSON_TYPE_COLORS[type as KnownLessonType] ?? FALLBACK_LESSON_COLOR;
};

/** Known lesson type abbreviations that have translation keys. */
const KNOWN_LESSON_TYPES = ['ПЗ', 'ЛР', 'ЛК', 'Консультация', 'Экзамен'] as const;
type KnownLessonTypeAbbrev = (typeof KNOWN_LESSON_TYPES)[number];

const isKnownLessonType = (type: string): type is KnownLessonTypeAbbrev =>
  (KNOWN_LESSON_TYPES as readonly string[]).includes(type);

export const getLessonTypeFullName = (type: LessonTypeAbbrev | null | undefined): string => {
  if (!type) return i18n.t('lessonType.fallback');
  if (isKnownLessonType(type)) return i18n.t(`lessonType.${type}`);
  return type;
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
 * 5-minute "inter-block" break in the middle of a lesson (40 + 5 + 40 for
 * standard 85-minute lessons; for non-standard durations we take the
 * central 5 minutes).
 *
 * Returns the position (0 to 1) and the block width relative to the full
 * lesson duration, plus the `startsAt` label ("HH:mm") — the moment the
 * break begins. `null` if the time can't be parsed or the lesson is
 * shorter than the break.
 */
/**
 * Stable identifier of a lesson "template" for blocking.
 * Identical for all occurrences of the same lesson across weeks.
 */
export const buildLessonBlockId = (lesson: NormalizedLesson): string => {
  const raw = lesson.raw;
  if (raw.dateLesson) {
    return `exam:${raw.dateLesson}:${raw.startLessonTime}:${raw.subject}:${raw.numSubgroup}`;
  }
  return `${lesson.dayName}:${raw.startLessonTime}:${raw.subject}:${raw.numSubgroup}`;
};

/** Lesson types that have no mid-lesson break (exams, consultations, credits). */
const NO_BREAK_TYPES: ReadonlySet<string> = new Set(['Консультация', 'Экзамен', 'Зачёт']);

export const getLessonBreakRange = (
  lesson: NormalizedLesson,
): {
  startFraction: number;
  widthFraction: number;
  startsAt: string;
} | null => {
  if (lesson.raw.lessonTypeAbbrev && NO_BREAK_TYPES.has(lesson.raw.lessonTypeAbbrev)) {
    return null;
  }
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
