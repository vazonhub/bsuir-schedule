import {
  MAX_FREEZES,
  MILESTONES,
  WEEKLY_FREEZES,
  buildLessonDayChecker,
  emptyFireCore,
  evaluateCore,
  getFlameColor,
  grantFreezeCore,
  isFireCore,
  isFireHot,
  markActivityCore,
  mergeFireCores,
  mondayOfISO,
  nextDayISO,
  parseLocalISO,
  prevDayISO,
  toLocalISO,
  type FireCore,
} from '@utils/fire';
import { FIRE_COLORS } from '@theme/colors';
import type { ScheduleDto } from '@models/dto';

const alwaysLesson = () => true;
const neverLesson = () => false;

describe('date ↔ ISO helpers', () => {
  it('toLocalISO / parseLocalISO round-trip a local day', () => {
    const iso = '2025-09-04';
    expect(toLocalISO(parseLocalISO(iso))).toBe(iso);
  });

  it('toLocalISO zero-pads month and day', () => {
    expect(toLocalISO(new Date(2025, 0, 5))).toBe('2025-01-05');
  });

  it('nextDayISO / prevDayISO cross month boundaries', () => {
    expect(nextDayISO('2025-09-30')).toBe('2025-10-01');
    expect(prevDayISO('2025-10-01')).toBe('2025-09-30');
  });

  it('mondayOfISO returns the Monday of that week (Sunday belongs to the prior Monday)', () => {
    expect(mondayOfISO('2025-09-03')).toBe('2025-09-01'); // Wed → Mon
    expect(mondayOfISO('2025-09-01')).toBe('2025-09-01'); // Mon → itself
    expect(mondayOfISO('2025-09-07')).toBe('2025-09-01'); // Sun → prior Mon
  });
});

describe('emptyFireCore', () => {
  it('starts cold with a full freeze pool', () => {
    const c = emptyFireCore();
    expect(c.current).toBe(0);
    expect(c.longest).toBe(0);
    expect(c.freezes).toBe(WEEKLY_FREEZES);
    expect(c.lastActiveDate).toBeNull();
    expect(c.history).toEqual({});
  });
});

describe('evaluateCore', () => {
  it('on first launch only settles up to yesterday without penalties', () => {
    const c = evaluateCore(emptyFireCore(), '2025-09-04', alwaysLesson);
    expect(c.current).toBe(0);
    expect(c.lastEvalDate).toBe('2025-09-03');
    expect(c.freezeWeekStart).toBe('2025-09-01');
    expect(c.history).toEqual({});
  });

  const settled = (over: Partial<FireCore>): FireCore => ({
    ...emptyFireCore(),
    freezeWeekStart: '2025-09-01',
    lastEvalDate: '2025-09-01',
    ...over,
  });

  it('penalizes missed lesson days once freezes run out', () => {
    const c = evaluateCore(settled({ current: 5, freezes: 0 }), '2025-09-04', alwaysLesson);
    expect(c.current).toBe(3); // -1 for Sep 2 and Sep 3
    expect(c.history['2025-09-02']).toBe('missed');
    expect(c.history['2025-09-03']).toBe('missed');
  });

  it('absorbs missed days with freezes instead of penalizing', () => {
    const c = evaluateCore(settled({ current: 5, freezes: 2 }), '2025-09-04', alwaysLesson);
    expect(c.current).toBe(5); // untouched
    expect(c.freezes).toBe(0); // both spent
    expect(c.history['2025-09-02']).toBe('frozen');
    expect(c.history['2025-09-03']).toBe('frozen');
  });

  it('leaves the streak alone on non-lesson days', () => {
    const c = evaluateCore(settled({ current: 5, freezes: 0 }), '2025-09-04', neverLesson);
    expect(c.current).toBe(5);
    expect(c.history).toEqual({});
  });

  it('credits opened lesson days retroactively instead of burning freezes', () => {
    const c = evaluateCore(
      settled({ current: 5, freezes: 2, openDays: ['2025-09-02', '2025-09-03'] }),
      '2025-09-04',
      alwaysLesson,
    );
    expect(c.current).toBe(7); // both days were opened → +1 each
    expect(c.freezes).toBe(2); // no freeze spent
    expect(c.history['2025-09-02']).toBe('active');
    expect(c.history['2025-09-03']).toBe('active');
  });

  it('only penalizes lesson days the app was NOT opened', () => {
    const c = evaluateCore(
      settled({ current: 5, freezes: 0, openDays: ['2025-09-02'] }),
      '2025-09-04',
      alwaysLesson,
    );
    expect(c.history['2025-09-02']).toBe('active'); // opened → credited
    expect(c.history['2025-09-03']).toBe('missed'); // not opened → miss
    expect(c.current).toBe(5); // +1 then -1
  });

  it('never drops the streak below zero', () => {
    const c = evaluateCore(settled({ current: 1, freezes: 0 }), '2025-09-04', alwaysLesson);
    expect(c.current).toBe(0);
  });

  it('does not penalize today (the day is still open)', () => {
    const c = evaluateCore(settled({ current: 5, freezes: 0 }), '2025-09-02', alwaysLesson);
    expect(c.current).toBe(5); // nothing strictly between Sep 1 and Sep 2
    expect(c.lastEvalDate).toBe('2025-09-01');
  });
});

describe('markActivityCore', () => {
  it('credits +1 on a lesson day and records the activity', () => {
    const { core, event } = markActivityCore(emptyFireCore(), '2025-09-01', alwaysLesson);
    expect(core.current).toBe(1);
    expect(core.longest).toBe(1);
    expect(core.lastActiveDate).toBe('2025-09-01');
    expect(core.history['2025-09-01']).toBe('active');
    expect(event).toEqual({ delta: 1, recordBeaten: false, milestone: null });
  });

  it('does not celebrate the very first day as a record', () => {
    const { event } = markActivityCore(emptyFireCore(), '2025-09-01', alwaysLesson);
    expect(event.recordBeaten).toBe(false);
  });

  it('does nothing on a non-lesson day', () => {
    const { core, event } = markActivityCore(emptyFireCore(), '2025-09-01', neverLesson);
    expect(core.current).toBe(0);
    expect(event.delta).toBe(0);
  });

  it('records the open day even when nothing is credited', () => {
    const { core } = markActivityCore(emptyFireCore(), '2025-09-01', neverLesson);
    expect(core.openDays).toContain('2025-09-01');
  });

  it('does not double-count the same day', () => {
    const first = markActivityCore(emptyFireCore(), '2025-09-01', alwaysLesson);
    const second = markActivityCore(first.core, '2025-09-01', alwaysLesson);
    expect(second.core.current).toBe(1);
    expect(second.event.delta).toBe(0);
  });

  const primed = (over: Partial<FireCore>): FireCore => ({
    ...emptyFireCore(),
    freezeWeekStart: '2025-09-01',
    lastActiveDate: '2025-08-31',
    lastEvalDate: '2025-08-31',
    ...over,
  });

  it('marks recordBeaten when passing a non-zero record', () => {
    const { core, event } = markActivityCore(
      primed({ current: 5, longest: 5 }),
      '2025-09-01',
      alwaysLesson,
    );
    expect(core.current).toBe(6);
    expect(core.longest).toBe(6);
    expect(event.recordBeaten).toBe(true);
  });

  it('reports a milestone when the streak reaches 7/30/100', () => {
    const { core, event } = markActivityCore(
      primed({ current: 6, longest: 10 }),
      '2025-09-01',
      alwaysLesson,
    );
    expect(core.current).toBe(7);
    expect(event.milestone).toBe(7);
    expect(MILESTONES).toContain(event.milestone);
  });
});

describe('grantFreezeCore', () => {
  const base = (over: Partial<FireCore>): FireCore => ({ ...emptyFireCore(), ...over });

  it('adds one freeze', () => {
    const c = grantFreezeCore(base({ freezes: 1, freezeWeekStart: '2025-09-01' }), '2025-09-03');
    expect(c.freezes).toBe(2);
  });

  it('caps the pool at MAX_FREEZES and returns the same reference (no-op)', () => {
    const input = base({ freezes: MAX_FREEZES, freezeWeekStart: '2025-09-01' });
    const c = grantFreezeCore(input, '2025-09-03');
    expect(c).toBe(input);
    expect(c.freezes).toBe(MAX_FREEZES);
  });

  it('anchors the freeze week when the pool has none, without touching an existing one', () => {
    const fresh = grantFreezeCore(base({ freezes: 0, freezeWeekStart: null }), '2025-09-03');
    expect(fresh.freezeWeekStart).toBe('2025-09-01'); // Monday of that week

    const kept = grantFreezeCore(base({ freezes: 1, freezeWeekStart: '2025-09-01' }), '2025-09-10');
    expect(kept.freezeWeekStart).toBe('2025-09-01'); // unchanged
  });
});

describe('isFireHot / getFlameColor', () => {
  it('isFireHot is true only for a positive streak', () => {
    expect(isFireHot({ current: 0 })).toBe(false);
    expect(isFireHot({ current: 1 })).toBe(true);
  });

  it('getFlameColor picks the tier by streak length', () => {
    expect(getFlameColor(0)).toBe(FIRE_COLORS.cold);
    expect(getFlameColor(1)).toBe('#F08A24');
    expect(getFlameColor(7)).toBe('#FF7A00');
    expect(getFlameColor(30)).toBe('#FF4D00');
    expect(getFlameColor(100)).toBe('#3FA9FF');
    expect(getFlameColor(999)).toBe('#3FA9FF');
  });
});

describe('mergeFireCores', () => {
  const base = (over: Partial<FireCore>): FireCore => ({ ...emptyFireCore(), ...over });

  it('takes the max streak/record and the freshest dates', () => {
    const local = base({ current: 3, longest: 10, lastActiveDate: '2025-09-01' });
    const remote = base({ current: 5, longest: 7, lastActiveDate: '2025-09-03' });
    const merged = mergeFireCores(local, remote);
    expect(merged.current).toBe(5);
    expect(merged.longest).toBe(10);
    expect(merged.lastActiveDate).toBe('2025-09-03');
  });

  it('takes the min freezes when both are in the same week', () => {
    const local = base({ freezes: 2, freezeWeekStart: '2025-09-01' });
    const remote = base({ freezes: 1, freezeWeekStart: '2025-09-01' });
    expect(mergeFireCores(local, remote).freezes).toBe(1);
  });

  it('takes the more recent week pool when weeks differ', () => {
    const local = base({ freezes: 2, freezeWeekStart: '2025-09-08' });
    const remote = base({ freezes: 0, freezeWeekStart: '2025-09-01' });
    const merged = mergeFireCores(local, remote);
    expect(merged.freezeWeekStart).toBe('2025-09-08');
    expect(merged.freezes).toBe(2);
  });

  it('falls back to whichever side has a freeze week set', () => {
    const local = base({ freezes: 2, freezeWeekStart: null });
    const remote = base({ freezes: 0, freezeWeekStart: '2025-09-01' });
    const merged = mergeFireCores(local, remote);
    expect(merged.freezeWeekStart).toBe('2025-09-01');
    expect(merged.freezes).toBe(0);
  });

  it('unions history by status priority (active > frozen > missed)', () => {
    const local = base({ history: { '2025-09-01': 'missed', '2025-09-02': 'active' } });
    const remote = base({ history: { '2025-09-01': 'active', '2025-09-03': 'frozen' } });
    const merged = mergeFireCores(local, remote);
    expect(merged.history['2025-09-01']).toBe('active');
    expect(merged.history['2025-09-02']).toBe('active');
    expect(merged.history['2025-09-03']).toBe('frozen');
  });
});

describe('isFireCore', () => {
  it('accepts a well-formed core', () => {
    expect(isFireCore(emptyFireCore())).toBe(true);
  });

  it('rejects non-objects and null', () => {
    expect(isFireCore(null)).toBe(false);
    expect(isFireCore('nope')).toBe(false);
  });

  it('rejects objects with missing/typed-wrong fields', () => {
    const { current: _omit, ...rest } = emptyFireCore();
    expect(isFireCore(rest)).toBe(false);
    expect(isFireCore({ ...emptyFireCore(), history: null })).toBe(false);
  });
});

describe('buildLessonDayChecker', () => {
  it('returns a predicate that is always false when there is no schedule', () => {
    const check = buildLessonDayChecker(null, 1, new Date(2025, 8, 1));
    expect(check('2025-09-01')).toBe(false);
  });

  it('flags days that have lessons in the flattened schedule', () => {
    const schedule: ScheduleDto = {
      startDate: '01.09.2025',
      endDate: '30.09.2025',
      startExamsDate: null,
      endExamsDate: null,
      studentGroupDto: null,
      employeeDto: null,
      schedules: {
        Понедельник: [
          {
            auditories: [],
            startLessonTime: '09:00',
            endLessonTime: '10:35',
            lessonTypeAbbrev: 'ЛК',
            note: null,
            numSubgroup: 0,
            studentGroups: [],
            subject: 'МАТ',
            subjectFullName: 'Математика',
            weekNumber: [],
            employees: [],
            dateLesson: null,
            startLessonDate: null,
            endLessonDate: null,
            announcement: false,
            split: false,
          },
        ],
      },
      nextSchedules: null,
      currentTerm: null,
      nextTerm: null,
      exams: [],
      currentPeriod: null,
      isZaochOrDist: false,
    };
    const check = buildLessonDayChecker(schedule, 1, new Date(2025, 8, 1));
    expect(check('2025-09-01')).toBe(true); // Monday with a lesson
    expect(check('2025-09-02')).toBe(false); // Tuesday — no lessons
  });
});
