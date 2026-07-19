/**
 * Lesson type → accent colour map. The colour is used as the `border-left`
 * stripe on lesson cards and as the chip background in lesson details.
 */
export const LESSON_TYPE_COLORS = {
  /** Practical class */
  ПЗ: '#8E5CD9', // purple
  /** Laboratory work */
  ЛР: '#F08A24', // orange
  /** Lecture */
  ЛК: '#3FB36F', // green
  /** Consultation */
  Консультация: '#32ADE6', // light blue
  /** Exam */
  Экзамен: '#FF3B30', // red
  /** Supervised practical work */
  УПз: '#8E5CD9', // purple (same as ПЗ)
  /** Supervised lecture */
  УЛк: '#3FB36F', // green (same as ЛК)
} as const;

export type KnownLessonType = keyof typeof LESSON_TYPE_COLORS;

export const FALLBACK_LESSON_COLOR = '#9A9A9E';

/** Accent colour for announcement cards. */
export const ANNOUNCEMENT_COLOR = '#32ADE6'; // light blue

/**
 * Fire streak. The flame colour grows with the streak length ("tiers"), plus
 * day-status colours for the activity calendar. See FIRE_PLAN.md §8.
 * Colour selection logic — `getFlameColor` in `@utils/fire`.
 */
export const FIRE_COLORS = {
  /** Flame is out (streak 0). */
  cold: '#9A9A9E',
  /** Freeze (day saved). */
  frozen: '#32ADE6', // light blue
  /** Missed lesson day. */
  missed: '#C7C7CC', // grey
} as const;

/** Streak threshold → flame colour (scanned top to bottom, first match wins). */
export const FIRE_TIERS: readonly { readonly min: number; readonly color: string }[] = [
  { min: 100, color: '#3FA9FF' }, // blue flame
  { min: 30, color: '#FF4D00' }, // red-orange
  { min: 7, color: '#FF7A00' }, // deep orange
  { min: 1, color: '#F08A24' }, // orange
];

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

/**
 * High-contrast light palette — activated when iOS "Increase Contrast"
 * (Darken Colors) is enabled.
 *
 * Principle: backgrounds whiter, text darker, separators more visible.
 * Every text/bg pair targets WCAG AA (4.5:1) or better.
 */
export const PaletteHighContrast = {
  background: '#EFEFF4', // slightly cooler than default, more separation from card
  card: '#FFFFFF',
  cardPressed: '#E8E8ED', // more visible press state
  separator: '#C7C7CC', // much more visible (was #E5E5EA)
  textPrimary: '#000000', // pure black (was #1C1C1E)
  textSecondary: '#3C3C43', // 9.5:1 on white (was #6E6E73 = 4.6:1)
  textTertiary: '#636366', // 5.7:1 on white (was #A0A0A8 = 2.6:1)
  accent: '#0040DD', // 7.3:1 on white (was #0A84FF = 3.5:1)
  destructive: '#D70015', // 6.5:1 on white (was #FF453A = 3.9:1)
  searchPlaceholder: '#636366',
} as const;

/**
 * High-contrast dark palette.
 *
 * Principle: backgrounds blacker, text whiter, separators more visible.
 */
export const PaletteDarkHighContrast = {
  background: '#000000',
  card: '#1C1C1E',
  cardPressed: '#3A3A3C', // more visible press state (was #2A2A2C)
  separator: '#545456', // much more visible (was #38383A)
  textPrimary: '#FFFFFF',
  textSecondary: '#D1D1D6', // brighter (was #AEAEB2) — 10.8:1 on #1C1C1E
  textTertiary: '#98989D', // 5.3:1 on #1C1C1E (was #7C7C82 = 3.5:1)
  accent: '#409CFF', // brighter blue — 6.2:1 on #1C1C1E (was #0A84FF = 4.6:1)
  destructive: '#FF6961', // brighter red — 5.5:1 on #1C1C1E (was #FF453A = 4.8:1)
  searchPlaceholder: '#98989D',
} as const;
