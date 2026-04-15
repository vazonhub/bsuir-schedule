/**
 * Lesson type → accent colour map. The colour is used as the `border-left`
 * stripe on lesson cards and as the chip background in lesson details.
 */
export const LESSON_TYPE_COLORS = {
  /** Практическое занятие */
  ПЗ: '#8E5CD9', // фиолетовый
  /** Лабораторная работа */
  ЛР: '#F08A24', // оранжевый
  /** Лекция */
  ЛК: '#3FB36F', // зелёный
  /** Консультация */
  Консультация: '#8B5A2B', // коричневый
  /** Экзамен */
  Экзамен: '#7A3FB6', // фиолетовый (более насыщенный)
} as const;

export type KnownLessonType = keyof typeof LESSON_TYPE_COLORS;

export const FALLBACK_LESSON_COLOR = '#9A9A9E';

/**
 * Light theme palette. Mirrors iOS system grouped style.
 *
 * - `background` is the screen-level fill that holds cards.
 * - `card` is the elevated tile (`border-radius: Radius.lg`).
 * - `cardPressed` is what we swap to on press for tactile feedback.
 *
 * Section headers use `background` so that, when sticky, they hide cards
 * passing behind them while looking like plain text on the screen background.
 */
export const Palette = {
  background: '#F2F2F7',
  card: '#FFFFFF',
  cardPressed: '#F0F0F4',
  separator: '#E5E5EA',
  textPrimary: '#1C1C1E',
  textSecondary: '#6E6E73',
  textTertiary: '#A0A0A8',
  accent: '#0A84FF',
  destructive: '#FF453A',
  searchPlaceholder: '#A0A0A8',
} as const;

export const PaletteDark = {
  background: '#000000',
  card: '#1C1C1E',
  cardPressed: '#2A2A2C',
  separator: '#38383A',
  textPrimary: '#FFFFFF',
  textSecondary: '#AEAEB2',
  textTertiary: '#7C7C82',
  accent: '#0A84FF',
  destructive: '#FF453A',
  searchPlaceholder: '#7C7C82',
} as const;
