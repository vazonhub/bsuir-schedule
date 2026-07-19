import { addDays, startOfLocalDay } from './date';
import { flattenSchedule } from './scheduleNormalization';
import type { ScheduleDto, WeekNumber } from '@models/dto';
import { FIRE_COLORS, FIRE_TIERS } from '@theme/colors';

/**
 * Fire streak — pure logic core.
 *
 * All functions here are pure and operate on local ISO dates `YYYY-MM-DD`
 * (lexicographic comparison = chronological). No dependencies on the
 * store/network — the reducers take state and return new state so they can
 * be unit-tested.
 *
 * Mechanics (see FIRE_PLAN.md §1):
 * - Lesson day with activity → +1.
 * - Lesson day without activity → −1 (not below 0); a freeze absorbs the −1.
 * - Non-lesson day → neutral.
 * - Freezes: WEEKLY_FREEZES per week, the pool refills on Monday.
 * - The penalty is applied retroactively on the next `evaluate`.
 */

/** How many freezes are granted per week. */
export const WEEKLY_FREEZES = 2;

/** Milestones at which the celebration animation plays. */
export const MILESTONES: readonly number[] = [7, 30, 100];

/** How many days of activity history we keep (for the calendar). */
const HISTORY_LIMIT = 60;

/** Status of a specific lesson day for the activity calendar. */
export type FireDayStatus = 'active' | 'missed' | 'frozen';

/** Persistent core of the fire state. */
export interface FireCore {
  /** Current streak, always >= 0. */
  current: number;
  /** Personal record. */
  longest: number;
  /** ISO of the last day a +1 was credited. */
  lastActiveDate: string | null;
  /** ISO of the day up to which penalties are settled (inclusive). */
  lastEvalDate: string | null;
  /** Freezes remaining in the current week. */
  freezes: number;
  /** ISO of the Monday of the week the freeze pool belongs to. */
  freezeWeekStart: string | null;
  /** Status history per lesson day (for the calendar). */
  history: Record<string, FireDayStatus>;
}

/** What happened when activity was credited — for the celebration. */
export interface FireEvent {
  /** Counter change: +1 or 0. */
  delta: number;
  /** Whether the personal record was beaten (except the very first day). */
  recordBeaten: boolean;
  /** Milestone reached (7/30/100) or null. */
  milestone: number | null;
}

const NO_EVENT: FireEvent = { delta: 0, recordBeaten: false, milestone: null };

/** Empty initial core. */
export const emptyFireCore = (): FireCore => ({
  current: 0,
  longest: 0,
  lastActiveDate: null,
  lastEvalDate: null,
  freezes: WEEKLY_FREEZES,
  freezeWeekStart: null,
  history: {},
});

// ─── Date ↔ ISO ──────────────────────────────────────────────────────────────

/** Local calendar day as `YYYY-MM-DD` (no timezone shift). */
export const toLocalISO = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/** Parse a local ISO day into a `Date` (midnight local time). */
export const parseLocalISO = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
};

/** Next calendar day. */
export const nextDayISO = (iso: string): string => toLocalISO(addDays(parseLocalISO(iso), 1));

/** Previous calendar day. */
export const prevDayISO = (iso: string): string => toLocalISO(addDays(parseLocalISO(iso), -1));

/** ISO of the Monday of the week the date falls into. */
export const mondayOfISO = (iso: string): string => {
  const d = startOfLocalDay(parseLocalISO(iso));
  const dow = d.getDay() || 7; // Sun=0 → 7
  return toLocalISO(addDays(d, -(dow - 1)));
};

// ─── Internal helpers ────────────────────────────────────────────────────────

/** Refill the freeze pool if `dateISO` falls into a new week. */
const refilledFreezes = (
  core: Pick<FireCore, 'freezes' | 'freezeWeekStart'>,
  dateISO: string,
): { freezes: number; freezeWeekStart: string } => {
  const wk = mondayOfISO(dateISO);
  if (core.freezeWeekStart !== wk) {
    return { freezes: WEEKLY_FREEZES, freezeWeekStart: wk };
  }
  return { freezes: core.freezes, freezeWeekStart: wk };
};

/** Keep only the last HISTORY_LIMIT days in the history. */
const pruneHistory = (history: Record<string, FireDayStatus>): Record<string, FireDayStatus> => {
  const keys = Object.keys(history);
  if (keys.length <= HISTORY_LIMIT) return history;
  const kept = keys.sort().slice(keys.length - HISTORY_LIMIT);
  const next: Record<string, FireDayStatus> = {};
  for (const k of kept) {
    const v = history[k];
    if (v !== undefined) next[k] = v;
  }
  return next;
};

// ─── Reducers ────────────────────────────────────────────────────────────────

/**
 * Catch up on the past: apply penalties for missed lesson days strictly
 * before `todayISO`. Today stays "open" (not penalized — the day isn't over).
 *
 * Invariant: any day between `lastEvalDate` and `todayISO` had no activity,
 * so no separate per-day activity storage is needed.
 */
export const evaluateCore = (
  core: FireCore,
  todayISO: string,
  isLessonDay: (iso: string) => boolean,
): FireCore => {
  const c: FireCore = { ...core, history: { ...core.history } };

  if (c.lastEvalDate == null) {
    // First launch: nothing before today is penalized.
    c.lastEvalDate = prevDayISO(todayISO);
    const r = refilledFreezes(c, todayISO);
    c.freezes = r.freezes;
    c.freezeWeekStart = r.freezeWeekStart;
    return c;
  }

  let cursor = nextDayISO(c.lastEvalDate);
  while (cursor < todayISO) {
    const r = refilledFreezes(c, cursor);
    c.freezes = r.freezes;
    c.freezeWeekStart = r.freezeWeekStart;

    if (isLessonDay(cursor)) {
      if (c.freezes > 0) {
        c.freezes -= 1;
        c.history[cursor] = 'frozen';
      } else {
        c.current = Math.max(0, c.current - 1);
        c.history[cursor] = 'missed';
      }
    }
    cursor = nextDayISO(cursor);
  }

  c.lastEvalDate = prevDayISO(todayISO);
  const r = refilledFreezes(c, todayISO);
  c.freezes = r.freezes;
  c.freezeWeekStart = r.freezeWeekStart;
  c.history = pruneHistory(c.history);
  return c;
};

/**
 * Credit today's activity (app open / schedule / homework).
 * First catches up on the past via `evaluateCore`, then gives +1 if today
 * is a lesson day and hasn't been counted yet.
 */
export const markActivityCore = (
  core: FireCore,
  todayISO: string,
  isLessonDay: (iso: string) => boolean,
): { core: FireCore; event: FireEvent } => {
  let c = evaluateCore(core, todayISO, isLessonDay);

  if (!isLessonDay(todayISO) || c.lastActiveDate === todayISO) {
    return { core: c, event: NO_EVENT };
  }

  c = { ...c, history: { ...c.history } };
  c.current += 1;

  let recordBeaten = false;
  if (c.current > c.longest) {
    recordBeaten = c.longest > 0; // don't celebrate the very first day
    c.longest = c.current;
  }
  const milestone = MILESTONES.includes(c.current) ? c.current : null;

  c.lastActiveDate = todayISO;
  c.lastEvalDate = todayISO;
  c.history[todayISO] = 'active';
  c.history = pruneHistory(c.history);

  return { core: c, event: { delta: 1, recordBeaten, milestone } };
};

/** The fire is "burning" if the streak is alive. */
export const isFireHot = (core: Pick<FireCore, 'current'>): boolean => core.current > 0;

/** Flame colour by streak length (tier). For 0 — the "cold" colour. */
export const getFlameColor = (current: number): string => {
  for (const tier of FIRE_TIERS) {
    if (current >= tier.min) return tier.color;
  }
  return FIRE_COLORS.cold;
};

// ─── Cloud merge ─────────────────────────────────────────────────────────────

/** Status priority when merging history: active > frozen > missed. */
const STATUS_RANK: Record<FireDayStatus, number> = { active: 3, frozen: 2, missed: 1 };

/** The later of two ISO dates (null counts as "earliest of all"). */
const maxISO = (a: string | null, b: string | null): string | null => {
  if (a == null) return b;
  if (b == null) return a;
  return a >= b ? a : b;
};

const mergeHistory = (
  a: Record<string, FireDayStatus>,
  b: Record<string, FireDayStatus>,
): Record<string, FireDayStatus> => {
  const out: Record<string, FireDayStatus> = { ...b };
  for (const [k, v] of Object.entries(a)) {
    const existing = out[k];
    if (!existing || STATUS_RANK[v] > STATUS_RANK[existing]) out[k] = v;
  }
  return pruneHistory(out);
};

/**
 * Merge the local and cloud fire cores (for cross-device sync).
 * Streak/record — max; dates — the freshest (so already accounted days are
 * not re-evaluated); freezes — min when the week matches (spent on either
 * device), otherwise the pool of the more recent week; history — union by
 * status priority.
 */
export const mergeFireCores = (local: FireCore, remote: FireCore): FireCore => {
  let freezes: number;
  let freezeWeekStart: string | null;
  if (local.freezeWeekStart && remote.freezeWeekStart) {
    if (local.freezeWeekStart === remote.freezeWeekStart) {
      freezeWeekStart = local.freezeWeekStart;
      freezes = Math.min(local.freezes, remote.freezes);
    } else if (local.freezeWeekStart > remote.freezeWeekStart) {
      freezeWeekStart = local.freezeWeekStart;
      freezes = local.freezes;
    } else {
      freezeWeekStart = remote.freezeWeekStart;
      freezes = remote.freezes;
    }
  } else {
    freezeWeekStart = local.freezeWeekStart ?? remote.freezeWeekStart;
    freezes = local.freezeWeekStart ? local.freezes : remote.freezes;
  }

  return {
    current: Math.max(local.current, remote.current),
    longest: Math.max(local.longest, remote.longest),
    lastActiveDate: maxISO(local.lastActiveDate, remote.lastActiveDate),
    lastEvalDate: maxISO(local.lastEvalDate, remote.lastEvalDate),
    freezes,
    freezeWeekStart,
    history: mergeHistory(local.history, remote.history),
  };
};

/** Check that JSON parsed from the cloud looks like a `FireCore`. */
export const isFireCore = (x: unknown): x is FireCore => {
  if (typeof x !== 'object' || x == null) return false;
  const c = x as Record<string, unknown>;
  return (
    typeof c.current === 'number' &&
    typeof c.longest === 'number' &&
    (c.lastActiveDate === null || typeof c.lastActiveDate === 'string') &&
    (c.lastEvalDate === null || typeof c.lastEvalDate === 'string') &&
    typeof c.freezes === 'number' &&
    (c.freezeWeekStart === null || typeof c.freezeWeekStart === 'string') &&
    typeof c.history === 'object' &&
    c.history != null
  );
};

// ─── Lesson days from the schedule ───────────────────────────────────────────

/**
 * Build a "this day has lessons" predicate from a group's schedule.
 * Flattens the schedule once and puts dates with lessons into a `Set`.
 * If the schedule is empty/not loaded — all days count as non-lesson days
 * (no unfair penalties).
 */
export const buildLessonDayChecker = (
  schedule: ScheduleDto | null | undefined,
  currentWeek: WeekNumber,
  today: Date,
): ((iso: string) => boolean) => {
  if (!schedule) return () => false;
  const days = flattenSchedule(schedule, currentWeek, today, { showAll: true });
  const set = new Set<string>();
  for (const l of days) set.add(toLocalISO(l.date));
  return (iso: string) => set.has(iso);
};
