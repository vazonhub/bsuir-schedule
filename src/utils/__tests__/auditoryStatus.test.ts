import { computeAuditoryStatus } from '@utils/auditoryStatus';
import type { AuditoryIndexDto, AuditorySlotDto, WeekNumber } from '@models/dto';

const slot = (over: Partial<AuditorySlotDto>): AuditorySlotDto => ({
  startTime: '09:00',
  endTime: '10:35',
  weekNumber: [],
  subject: 'МАТ',
  lessonTypeAbbrev: 'ЛК',
  groups: ['410101'],
  numSubgroup: 0,
  dateLesson: null,
  ...over,
});

// Monday 1 Sep 2025 — DAY_NAMES_RU[getDay()] === 'Понедельник'.
const at = (h: number, m: number) => new Date(2025, 8, 1, h, m);

const index = (slots: AuditorySlotDto[], week: WeekNumber = 1): AuditoryIndexDto => ({
  updatedAt: '2025-09-01',
  currentWeek: week,
  auditories: { '315-1': { Понедельник: slots } },
});

describe('computeAuditoryStatus', () => {
  it('returns null for a missing index', () => {
    expect(computeAuditoryStatus(null, '315-1', at(9, 30), 1)).toBeNull();
  });

  it('returns null for an unknown room', () => {
    expect(computeAuditoryStatus(index([slot({})]), '999-9', at(9, 30), 1)).toBeNull();
  });

  it('reports busy during a lesson, freeing at its end', () => {
    const status = computeAuditoryStatus(index([slot({})]), '315-1', at(9, 30), 1);
    expect(status?.kind).toBe('busy');
    expect(status?.busyUntil).toBe('10:35');
    expect(status?.currentSlot?.subject).toBe('МАТ');
  });

  it('merges back-to-back lessons within the tolerance into one busy block', () => {
    const status = computeAuditoryStatus(
      index([
        slot({ startTime: '09:00', endTime: '10:35' }),
        slot({ startTime: '10:45', endTime: '12:20' }),
      ]),
      '315-1',
      at(9, 30),
      1,
    );
    expect(status?.busyUntil).toBe('12:20'); // 10-min gap ≤ 15 min tolerance
  });

  it('does NOT merge across a gap larger than the tolerance', () => {
    const status = computeAuditoryStatus(
      index([
        slot({ startTime: '09:00', endTime: '10:35' }),
        slot({ startTime: '11:00', endTime: '12:20' }),
      ]),
      '315-1',
      at(9, 30),
      1,
    );
    expect(status?.busyUntil).toBe('10:35'); // 25-min gap breaks the block
  });

  it('reports free with the next lesson time when idle before a lesson', () => {
    const status = computeAuditoryStatus(index([slot({})]), '315-1', at(8, 0), 1);
    expect(status?.kind).toBe('free');
    expect(status?.freeUntil).toBe('09:00');
    expect(status?.nextSlot?.startTime).toBe('09:00');
  });

  it('reports free until day end when no lessons remain', () => {
    const status = computeAuditoryStatus(index([slot({})]), '315-1', at(20, 0), 1);
    expect(status?.kind).toBe('free');
    expect(status?.freeUntil).toBeNull();
  });

  it('ignores slots whose weekNumber excludes the current week', () => {
    const status = computeAuditoryStatus(index([slot({ weekNumber: [2] })]), '315-1', at(9, 30), 1);
    expect(status?.kind).toBe('free'); // slot only occurs on week 2
  });

  it('includes a one-off dateLesson only on its calendar day', () => {
    const onToday = index([slot({ dateLesson: '2025-09-01', weekNumber: [] })]);
    const onOther = index([slot({ dateLesson: '2025-09-08', weekNumber: [] })]);
    expect(computeAuditoryStatus(onToday, '315-1', at(9, 30), 1)?.kind).toBe('busy');
    expect(computeAuditoryStatus(onOther, '315-1', at(9, 30), 1)?.kind).toBe('free');
  });
});
