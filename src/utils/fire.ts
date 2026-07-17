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
export const parseLocalISO = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
};

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

// ─── Cloud merge ─────────────────────────────────────────────────────────────

/** Приоритет статусов при слиянии истории: active > frozen > missed. */
const STATUS_RANK: Record<FireDayStatus, number> = { active: 3, frozen: 2, missed: 1 };

/** Более поздняя из двух ISO-дат (null считается «раньше всех»). */
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
 * Слить локальное и облачное ядро огонька (для синка между устройствами).
 * Серия/рекорд — max; даты — самые свежие (чтобы не переоценивать заново уже
 * учтённые дни); заморозки — при совпадении недели min (потрачено на любом
 * устройстве), иначе пул более свежей недели; история — объединение по
 * приоритету статусов.
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

/** Проверка, что распарсенный из облака JSON похож на `FireCore`. */
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
