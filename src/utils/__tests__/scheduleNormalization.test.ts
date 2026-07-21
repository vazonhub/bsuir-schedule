import {
  buildScheduleRows,
  computeWeekForDate,
  flattenExams,
  flattenSchedule,
  findUpcomingSectionIndex,
  groupExamsByDay,
  groupLessonsByDay,
  headerRowKey,
  type NormalizedLesson,
  type ScheduleSection,
} from '@utils/scheduleNormalization';
import type { LessonDto, ScheduleDto, WeekNumber } from '@models/dto';

const makeLesson = (over: Partial<LessonDto> = {}): LessonDto => ({
  auditories: ['101-1'],
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
  ...over,
});

const makeSchedule = (over: Partial<ScheduleDto> = {}): ScheduleDto => ({
  startDate: '01.09.2025',
  endDate: '30.09.2025',
  startExamsDate: null,
  endExamsDate: null,
  studentGroupDto: null,
  employeeDto: null,
  schedules: {},
  nextSchedules: null,
  currentTerm: null,
  nextTerm: null,
  exams: [],
  currentPeriod: null,
  isZaochOrDist: false,
  ...over,
});

// Monday, 1 Sep 2025 — start of the observation window.
const MONDAY = new Date(2025, 8, 1);

describe('computeWeekForDate', () => {
  it('returns currentWeek for a date in the same cycle-week', () => {
    expect(computeWeekForDate(MONDAY, MONDAY, 1)).toBe(1);
    expect(computeWeekForDate(new Date(2025, 8, 5), MONDAY, 1)).toBe(1); // Fri, same week
  });

  it('advances by one week per 7 days', () => {
    expect(computeWeekForDate(new Date(2025, 8, 8), MONDAY, 1)).toBe(2);
    expect(computeWeekForDate(new Date(2025, 8, 15), MONDAY, 1)).toBe(3);
    expect(computeWeekForDate(new Date(2025, 8, 22), MONDAY, 1)).toBe(4);
  });

  it('wraps around the 4-week cycle', () => {
    expect(computeWeekForDate(new Date(2025, 8, 29), MONDAY, 1)).toBe(1); // +4 weeks
  });

  it('handles past dates (previous week)', () => {
    expect(computeWeekForDate(new Date(2025, 7, 25), MONDAY, 1)).toBe(4); // -1 week
  });

  it('respects a non-1 currentWeek', () => {
    expect(computeWeekForDate(MONDAY, MONDAY, 3)).toBe(3);
    expect(computeWeekForDate(new Date(2025, 8, 8), MONDAY, 3)).toBe(4);
    expect(computeWeekForDate(new Date(2025, 8, 15), MONDAY, 3)).toBe(1); // wraps
  });
});

describe('flattenSchedule', () => {
  it('returns [] when schedules is null', () => {
    expect(flattenSchedule(makeSchedule({ schedules: null }), 1, MONDAY)).toEqual([]);
  });

  it('returns [] when startDate/endDate are missing', () => {
    const s = makeSchedule({ startDate: null, schedules: { Понедельник: [makeLesson()] } });
    expect(flattenSchedule(s, 1, MONDAY)).toEqual([]);
  });

  it('expands an every-week lesson into one occurrence per matching weekday', () => {
    const s = makeSchedule({ schedules: { Понедельник: [makeLesson()] } });
    const result = flattenSchedule(s, 1, MONDAY);
    // Mondays in Sep 2025: 1, 8, 15, 22, 29 → all >= today (Sep 1).
    expect(result).toHaveLength(5);
    expect(result.map((l) => l.date.getDate())).toEqual([1, 8, 15, 22, 29]);
    expect(result.map((l) => l.week)).toEqual([1, 2, 3, 4, 1]);
  });

  it('filters by weekNumber', () => {
    const s = makeSchedule({ schedules: { Вторник: [makeLesson({ weekNumber: [1] })] } });
    const result = flattenSchedule(s, 1, MONDAY);
    // Tuesdays: 2(w1), 9(w2), 16(w3), 23(w4), 30(w1) → only week 1 kept.
    expect(result.map((l) => l.date.getDate())).toEqual([2, 30]);
  });

  it('adds a single occurrence for a one-off dateLesson', () => {
    const s = makeSchedule({
      schedules: { Понедельник: [makeLesson({ dateLesson: '15.09.2025', weekNumber: [] })] },
    });
    const result = flattenSchedule(s, 1, MONDAY);
    expect(result).toHaveLength(1);
    expect(result[0]?.date.getDate()).toBe(15);
  });

  it('excludes past occurrences by default but includes them with showAll', () => {
    const today = new Date(2025, 8, 15);
    const s = makeSchedule({ schedules: { Понедельник: [makeLesson()] } });

    const future = flattenSchedule(s, 3, today);
    expect(future.map((l) => l.date.getDate())).toEqual([15, 22, 29]);

    const all = flattenSchedule(s, 3, today, { showAll: true });
    expect(all.map((l) => l.date.getDate())).toEqual([1, 8, 15, 22, 29]);
    expect(all.filter((l) => l.isPast).map((l) => l.date.getDate())).toEqual([1, 8]);
  });

  it('marks isCurrentWeek relative to currentWeek', () => {
    const s = makeSchedule({ schedules: { Понедельник: [makeLesson()] } });
    const result = flattenSchedule(s, 1, MONDAY);
    expect(result.filter((l) => l.isCurrentWeek).map((l) => l.week)).toEqual([1, 1]);
  });

  it('produces stable, unique keys', () => {
    const s = makeSchedule({ schedules: { Понедельник: [makeLesson()] } });
    const keys = flattenSchedule(s, 1, MONDAY).map((l) => l.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('flattenExams', () => {
  it('returns [] when there are no exams', () => {
    expect(flattenExams(makeSchedule(), 1, MONDAY)).toEqual([]);
  });

  it('expands exams (each has a dateLesson) sorted chronologically', () => {
    const s = makeSchedule({
      exams: [
        makeLesson({ dateLesson: '20.09.2025', subject: 'B' }),
        makeLesson({ dateLesson: '10.09.2025', subject: 'A' }),
      ],
    });
    const result = flattenExams(s, 1, MONDAY);
    expect(result.map((l) => l.date.getDate())).toEqual([10, 20]);
    expect(result[0]?.raw.subject).toBe('A');
  });
});

describe('groupLessonsByDay / groupExamsByDay', () => {
  const mkNorm = (date: Date, key: string): NormalizedLesson => ({
    key,
    date,
    startTime: '09:00',
    endTime: '10:35',
    week: 1 as WeekNumber,
    dayName: 'Понедельник',
    isCurrentWeek: true,
    isPast: false,
    raw: makeLesson(),
  });

  it('groups consecutive same-day lessons into one section', () => {
    const lessons = [
      mkNorm(new Date(2025, 8, 1), 'a'),
      mkNorm(new Date(2025, 8, 1), 'b'),
      mkNorm(new Date(2025, 8, 2), 'c'),
    ];
    const sections = groupLessonsByDay(lessons);
    expect(sections).toHaveLength(2);
    expect(sections[0]?.data).toHaveLength(2);
    expect(sections[1]?.data).toHaveLength(1);
  });

  it('groupExamsByDay marks every section as an exam section', () => {
    const sections = groupExamsByDay([mkNorm(new Date(2025, 8, 1), 'a')]);
    expect(sections[0]?.isExam).toBe(true);
  });
});

describe('findUpcomingSectionIndex', () => {
  const sections: ScheduleSection[] = [
    { date: new Date(2025, 8, 1), week: 1, data: [] },
    { date: new Date(2025, 8, 10), week: 2, data: [] },
    { date: new Date(2025, 8, 20), week: 3, data: [] },
  ];

  it('returns the first section on or after today', () => {
    expect(findUpcomingSectionIndex(sections, new Date(2025, 8, 10, 12))).toBe(1);
  });

  it('returns 0 when all sections are in the future', () => {
    expect(findUpcomingSectionIndex(sections, new Date(2025, 7, 1))).toBe(0);
  });

  it('returns -1 when all sections are in the past', () => {
    expect(findUpcomingSectionIndex(sections, new Date(2025, 9, 1))).toBe(-1);
  });
});

describe('headerRowKey / buildScheduleRows', () => {
  const section = (date: Date, isExam = false): ScheduleSection => ({
    date,
    week: 1,
    isExam,
    data: [
      {
        key: `k-${date.getTime()}`,
        date,
        startTime: '09:00',
        endTime: '10:35',
        week: 1,
        dayName: 'Понедельник',
        isCurrentWeek: true,
        isPast: false,
        raw: makeLesson(),
      },
    ],
  });

  it('headerRowKey distinguishes regular vs exam sections', () => {
    const d = new Date(2025, 8, 1);
    expect(headerRowKey(section(d))).toBe(`header:r:${d.getTime()}`);
    expect(headerRowKey(section(d, true))).toBe(`header:e:${d.getTime()}`);
  });

  it('emits header then lesson rows per section', () => {
    const rows = buildScheduleRows([section(new Date(2025, 8, 1))]);
    expect(rows.map((r) => r.type)).toEqual(['header', 'lesson']);
  });

  it('inserts an exams separator before the given index', () => {
    const rows = buildScheduleRows([section(new Date(2025, 8, 1)), section(new Date(2025, 8, 2))], {
      examsSeparatorBeforeIndex: 1,
    });
    expect(rows.map((r) => r.type)).toEqual([
      'header',
      'lesson',
      'examsSeparator',
      'header',
      'lesson',
    ]);
  });

  it('appends a banner row after the flagged section index', () => {
    const rows = buildScheduleRows([section(new Date(2025, 8, 1))], {
      bannerSectionIndices: new Set([0]),
    });
    expect(rows.map((r) => r.type)).toEqual(['header', 'lesson', 'banner']);
  });
});
