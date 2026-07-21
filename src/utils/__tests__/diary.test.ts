import { extractDiarySubjects, extractUpcomingSubmissions, formatDiaryWhen } from '@utils/diary';
import { buildLessonBlockId } from '@utils/lesson';
import { flattenSchedule } from '@utils/scheduleNormalization';
import type { LessonDto, ScheduleDto } from '@models/dto';

const makeLesson = (over: Partial<LessonDto> = {}): LessonDto => ({
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
  ...over,
});

const makeSchedule = (schedules: ScheduleDto['schedules']): ScheduleDto => ({
  startDate: '01.09.2025',
  endDate: '30.09.2025',
  startExamsDate: null,
  endExamsDate: null,
  studentGroupDto: null,
  employeeDto: null,
  schedules,
  nextSchedules: null,
  currentTerm: null,
  nextTerm: null,
  exams: [],
  currentPeriod: null,
  isZaochOrDist: false,
});

// Sept 15 2025, noon — Mon 1 & 8 are past; today's morning lesson is finished.
const NOW = new Date(2025, 8, 15, 12, 0);
const noBlocks = { blockedIds: new Set<string>() };

describe('extractDiarySubjects', () => {
  it('counts total occurrences and remaining (unfinished) per lesson type', () => {
    const schedule = makeSchedule({ Понедельник: [makeLesson({ lessonTypeAbbrev: 'ЛК' })] });
    const [subject] = extractDiarySubjects(schedule, 3, NOW, { subgroup: 0, ...noBlocks });
    // Mondays: 1, 8, 15, 22, 29 → total 5; remaining = future only (22, 29).
    expect(subject?.total.ЛК).toBe(5);
    expect(subject?.remaining.ЛК).toBe(2);
  });

  it('ignores lesson types the diary does not track (e.g. Экзамен/Консультация)', () => {
    const schedule = makeSchedule({
      Понедельник: [makeLesson({ lessonTypeAbbrev: 'Консультация' })],
    });
    expect(extractDiarySubjects(schedule, 3, NOW, { subgroup: 0, ...noBlocks })).toEqual([]);
  });

  it('applies the subgroup filter (0 counts all; 1 excludes subgroup 2)', () => {
    const schedule = makeSchedule({
      Вторник: [
        makeLesson({ lessonTypeAbbrev: 'ЛР', numSubgroup: 1 }),
        makeLesson({ lessonTypeAbbrev: 'ЛР', numSubgroup: 2 }),
        makeLesson({ lessonTypeAbbrev: 'ЛР', numSubgroup: 0 }),
      ],
    });
    const forAll = extractDiarySubjects(schedule, 1, NOW, { subgroup: 0, ...noBlocks });
    const forSub1 = extractDiarySubjects(schedule, 1, NOW, { subgroup: 1, ...noBlocks });
    // 5 Tuesdays each; subgroup 0 counts all 3 streams, subgroup 1 drops the sg2 one.
    expect(forAll[0]?.total.ЛР).toBe(15);
    expect(forSub1[0]?.total.ЛР).toBe(10);
  });

  it('excludes blocked lessons from remaining but keeps them in total', () => {
    const schedule = makeSchedule({ Понедельник: [makeLesson({ lessonTypeAbbrev: 'ЛК' })] });
    const [aLesson] = flattenSchedule(schedule, 3, NOW, { showAll: true });
    const blockedIds = new Set([buildLessonBlockId(aLesson!)]);
    const [subject] = extractDiarySubjects(schedule, 3, NOW, { subgroup: 0, blockedIds });
    expect(subject?.total.ЛК).toBe(5);
    expect(subject?.remaining.ЛК).toBe(0);
  });

  it('sorts subjects by code', () => {
    const schedule = makeSchedule({
      Понедельник: [makeLesson({ subject: 'Физика', lessonTypeAbbrev: 'ЛК' })],
      Вторник: [makeLesson({ subject: 'Алгебра', lessonTypeAbbrev: 'ЛК' })],
    });
    const subjects = extractDiarySubjects(schedule, 3, NOW, { subgroup: 0, ...noBlocks });
    expect(subjects.map((s) => s.subject)).toEqual(['Алгебра', 'Физика']);
  });
});

describe('extractUpcomingSubmissions', () => {
  it('returns only future ЛР/ПЗ, excluding lectures and finished lessons', () => {
    const schedule = makeSchedule({
      Понедельник: [
        makeLesson({ lessonTypeAbbrev: 'ЛК' }), // excluded (lecture)
        makeLesson({ lessonTypeAbbrev: 'ЛР' }), // included
      ],
    });
    const upcoming = extractUpcomingSubmissions(schedule, 3, NOW, { subgroup: 0, ...noBlocks });
    expect(upcoming.length).toBeGreaterThan(0);
    expect(upcoming.every((l) => l.raw.lessonTypeAbbrev === 'ЛР')).toBe(true);
    expect(upcoming.every((l) => !l.isPast)).toBe(true);
  });

  it('respects the limit', () => {
    const schedule = makeSchedule({ Понедельник: [makeLesson({ lessonTypeAbbrev: 'ПЗ' })] });
    const upcoming = extractUpcomingSubmissions(schedule, 3, NOW, {
      subgroup: 0,
      blockedIds: new Set<string>(),
      limit: 1,
    });
    expect(upcoming).toHaveLength(1);
  });
});

describe('formatDiaryWhen', () => {
  const now = new Date(2025, 8, 15, 10, 0); // Mon 15 Sep

  it('labels today and tomorrow specially', () => {
    expect(formatDiaryWhen(new Date(2025, 8, 15), '12:25', now)).toBe('Сегодня 12:25');
    expect(formatDiaryWhen(new Date(2025, 8, 16), '12:25', now)).toBe('Завтра 12:25');
  });

  it('uses a short weekday + dd.MM for further-out dates', () => {
    // Wed 17 Sep 2025.
    expect(formatDiaryWhen(new Date(2025, 8, 17), '12:25', now)).toBe('Ср 17.09 12:25');
  });
});
