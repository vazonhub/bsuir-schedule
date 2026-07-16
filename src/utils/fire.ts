import { addDays, startOfLocalDay } from './date';
import { flattenSchedule } from './scheduleNormalization';
import type { ScheduleDto, WeekNumber } from '@models/dto';
import { FIRE_COLORS, FIRE_TIERS } from '@theme/colors';

/**
 * Огонёк (fire streak) — чистое ядро логики.
 *
 * Все функции здесь — pure и работают на локальных ISO-датах `YYYY-MM-DD`
 * (лексикографическое сравнение = хронологическое). Никаких зависимостей от
 * стора/сети — редьюсеры принимают состояние и возвращают новое, чтобы их
 * можно было юнит-тестировать.
 *
 * Механика (см. FIRE_PLAN.md §1):
 * - Учебный день с активностью → +1.
 * - Учебный день без активности → −1 (не ниже 0); заморозка гасит −1.
 * - Не-учебный день → нейтрально.
 * - Заморозки: WEEKLY_FREEZES в неделю, пул обновляется в понедельник.
 * - Штраф применяется ретроактивно при следующем `evaluate`.
 */

/** Сколько заморозок выдаётся на неделю. */
export const WEEKLY_FREEZES = 2;

/** Вехи, на которых играет праздничная анимация. */
export const MILESTONES: readonly number[] = [7, 30, 100];

/** Сколько дней истории активности храним (для календаря). */
const HISTORY_LIMIT = 60;

/** Статус конкретного учебного дня для календаря активности. */
export type FireDayStatus = 'active' | 'missed' | 'frozen';

/** Персистентное ядро состояния огонька. */
export interface FireCore {
  /** Текущая серия, всегда >= 0. */
  current: number;
  /** Личный рекорд. */
  longest: number;
  /** ISO последнего дня, когда начислили +1. */
  lastActiveDate: string | null;
  /** ISO дня, до которого досчитаны штрафы (включительно). */
  lastEvalDate: string | null;
  /** Остаток заморозок в текущей неделе. */
  freezes: number;
  /** ISO понедельника недели, к которой относится пул заморозок. */
  freezeWeekStart: string | null;
  /** История статусов по учебным дням (для календаря). */
  history: Record<string, FireDayStatus>;
}

/** Что произошло при начислении активности — для celebration. */
export interface FireEvent {
  /** Изменение счётчика: +1 или 0. */
  delta: number;
  /** Побит ли личный рекорд (кроме самого первого дня). */
  recordBeaten: boolean;
  /** Достигнутая веха (7/30/100) или null. */
  milestone: number | null;
}

const NO_EVENT: FireEvent = { delta: 0, recordBeaten: false, milestone: null };

/** Пустое стартовое ядро. */
export const emptyFireCore = (): FireCore => ({
  current: 0,
  longest: 0,
  lastActiveDate: null,
  lastEvalDate: null,
  freezes: WEEKLY_FREEZES,
  freezeWeekStart: null,
  history: {},
});

// ─── Дата ↔ ISO ──────────────────────────────────────────────────────────────

/** Локальный календарный день как `YYYY-MM-DD` (без сдвига часового пояса). */
export const toLocalISO = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/** Разобрать локальный ISO-день в `Date` (полночь по локальному времени). */
export const parseLocalISO = (iso: string): Date => new Date(`${iso}T00:00:00`);

/** Следующий календарный день. */
export const nextDayISO = (iso: string): string => toLocalISO(addDays(parseLocalISO(iso), 1));

/** Предыдущий календарный день. */
export const prevDayISO = (iso: string): string => toLocalISO(addDays(parseLocalISO(iso), -1));

/** ISO понедельника той недели, в которую попадает дата. */
export const mondayOfISO = (iso: string): string => {
  const d = startOfLocalDay(parseLocalISO(iso));
  const dow = d.getDay() || 7; // Sun=0 → 7
  return toLocalISO(addDays(d, -(dow - 1)));
};

// ─── Внутренние помощники ────────────────────────────────────────────────────

/** Обновить пул заморозок, если `dateISO` попадает в новую неделю. */
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

/** Оставить в истории только последние HISTORY_LIMIT дней. */
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

// ─── Редьюсеры ───────────────────────────────────────────────────────────────

/**
 * Догнать прошлое: применить штрафы за пропущенные учебные дни строго до
 * `todayISO`. Сегодня остаётся «открытым» (не штрафуется — день не кончился).
 *
 * Инвариант: любой день между `lastEvalDate` и `todayISO` не имел активности,
 * поэтому отдельного хранилища активности по дням не нужно.
 */
export const evaluateCore = (
  core: FireCore,
  todayISO: string,
  isLessonDay: (iso: string) => boolean,
): FireCore => {
  const c: FireCore = { ...core, history: { ...core.history } };

  if (c.lastEvalDate == null) {
    // Первый запуск: ничего до сегодня не штрафуем.
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
 * Начислить активность за сегодня (вход / расписание / домашка).
 * Сначала догоняет прошлое через `evaluateCore`, затем даёт +1, если сегодня
 * учебный день и он ещё не засчитан.
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
    recordBeaten = c.longest > 0; // не празднуем самый первый день
    c.longest = c.current;
  }
  const milestone = MILESTONES.includes(c.current) ? c.current : null;

  c.lastActiveDate = todayISO;
  c.lastEvalDate = todayISO;
  c.history[todayISO] = 'active';
  c.history = pruneHistory(c.history);

  return { core: c, event: { delta: 1, recordBeaten, milestone } };
};

/** Огонёк «горит», если серия жива. */
export const isFireHot = (core: Pick<FireCore, 'current'>): boolean => core.current > 0;

/** Цвет пламени по длине серии (тир). Для 0 — «холодный» цвет. */
export const getFlameColor = (current: number): string => {
  for (const tier of FIRE_TIERS) {
    if (current >= tier.min) return tier.color;
  }
  return FIRE_COLORS.cold;
};

// ─── Учебные дни из расписания ────────────────────────────────────────────────

/**
 * Построить предикат «в этот день есть пары» по расписанию группы.
 * Разворачивает расписание один раз и кладёт даты с парами в `Set`.
 * Если расписание пустое/не загружено — все дни считаются не-учебными
 * (не штрафуем несправедливо).
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
