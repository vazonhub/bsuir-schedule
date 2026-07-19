import type { AuditoryIndexDto, AuditorySlotDto, DayNameRu, WeekNumber } from '@models/dto';

import { DAY_NAMES_RU } from './date';

/**
 * Small tolerance (minutes) for merging back-to-back lessons into a single
 * busy block. Standard breaks at BSUIR are 5–10 min, so a break of ≤ this
 * value doesn't count as "the room becomes free".
 */
const CONTIGUOUS_TOLERANCE_MIN = 15;

export type AuditoryStatusKind = 'busy' | 'free';

export interface AuditoryStatus {
  kind: AuditoryStatusKind;
  /** For `busy` — HH:mm when the room becomes free. `null` = busy until day end. */
  busyUntil: string | null;
  /** For `free` — HH:mm of the next lesson today. `null` = free until day end. */
  freeUntil: string | null;
  /** For `busy` — the ongoing lesson. */
  currentSlot: AuditorySlotDto | null;
  /** For `free` — the next lesson today, if any. */
  nextSlot: AuditorySlotDto | null;
}

/** Convert "HH:mm" → minutes from midnight. Returns null if malformed. */
const toMinutes = (hhmm: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return h * 60 + min;
};

const parseIsoDayOfMonth = (iso: string): { y: number; m: number; d: number } | null => {
  // Accept both "YYYY-MM-DD" and "DD.MM.YYYY".
  let match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (match) return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
  match = /^(\d{2})\.(\d{2})\.(\d{4})/.exec(iso);
  if (match) return { y: Number(match[3]), m: Number(match[2]), d: Number(match[1]) };
  return null;
};

const sameCalendarDay = (iso: string, ref: Date): boolean => {
  const parsed = parseIsoDayOfMonth(iso);
  if (!parsed) return false;
  return (
    parsed.y === ref.getFullYear() && parsed.m === ref.getMonth() + 1 && parsed.d === ref.getDate()
  );
};

/** Slots that apply on `now`'s calendar day for the given `currentWeek`. */
const relevantSlots = (
  slots: readonly AuditorySlotDto[],
  now: Date,
  currentWeek: WeekNumber,
): AuditorySlotDto[] => {
  const out: AuditorySlotDto[] = [];
  for (const s of slots) {
    // One-off (exam / announcement) — include only if it lands on today.
    if (s.dateLesson) {
      if (sameCalendarDay(s.dateLesson, now)) out.push(s);
      continue;
    }
    // Periodic — empty weekNumber means "every week".
    if (s.weekNumber.length === 0 || s.weekNumber.includes(currentWeek)) {
      out.push(s);
    }
  }
  return out.sort((a, b) => a.startTime.localeCompare(b.startTime));
};

/**
 * Compute the room's status at `now`.
 *
 * Returns `null` when:
 * - the index has no entry for that auditory (unknown room),
 * - the entry has no slots today (interpreted as "we don't know" instead of
 *   claiming it's free — some faculties don't publish weekend schedules, and
 *   we don't want to promise "free all day" if the crawler simply missed it).
 */
export function computeAuditoryStatus(
  index: AuditoryIndexDto | null,
  normalizedAuditory: string,
  now: Date,
  currentWeek: WeekNumber,
): AuditoryStatus | null {
  if (!index || !normalizedAuditory) return null;
  const audEntry = index.auditories[normalizedAuditory];
  if (!audEntry) return null;

  const dayName: DayNameRu | undefined = DAY_NAMES_RU[now.getDay()];
  if (!dayName) return null;

  const raw = audEntry[dayName] ?? [];
  const slots = relevantSlots(raw, now, currentWeek);

  const nowMin = now.getHours() * 60 + now.getMinutes();

  // Find current slot (if any).
  let currentIdx = -1;
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i]!;
    const start = toMinutes(s.startTime);
    const end = toMinutes(s.endTime);
    if (start === null || end === null) continue;
    if (start <= nowMin && nowMin < end) {
      currentIdx = i;
      break;
    }
  }

  if (currentIdx !== -1) {
    // Busy — merge contiguous slots to find when it truly frees.
    let endMin = toMinutes(slots[currentIdx]!.endTime);
    let cursor = currentIdx;
    while (endMin !== null && cursor + 1 < slots.length) {
      const nextStart = toMinutes(slots[cursor + 1]!.startTime);
      if (nextStart === null) break;
      if (nextStart - endMin <= CONTIGUOUS_TOLERANCE_MIN) {
        cursor += 1;
        endMin = toMinutes(slots[cursor]!.endTime);
      } else {
        break;
      }
    }
    return {
      kind: 'busy',
      busyUntil: slots[cursor]?.endTime ?? null,
      freeUntil: null,
      currentSlot: slots[currentIdx] ?? null,
      nextSlot: null,
    };
  }

  // Free — look for the next slot today.
  let next: AuditorySlotDto | null = null;
  for (const s of slots) {
    const start = toMinutes(s.startTime);
    if (start === null) continue;
    if (start > nowMin) {
      next = s;
      break;
    }
  }
  return {
    kind: 'free',
    busyUntil: null,
    freeUntil: next ? next.startTime : null,
    currentSlot: null,
    nextSlot: next,
  };
}
