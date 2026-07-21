import {
  buildLessonBlockId,
  getLessonAccentColor,
  getLessonBreakRange,
  getLessonTimeStatus,
  getLessonTypeFullName,
} from '@utils/lesson';
import { usePreferencesStore } from '@stores/preferences.store';
import { FALLBACK_LESSON_COLOR, LESSON_TYPE_COLORS } from '@theme/colors';
import type { LessonDto } from '@models/dto';
import type { NormalizedLesson } from '@utils/scheduleNormalization';

const makeRaw = (over: Partial<LessonDto> = {}): LessonDto => ({
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

const makeNorm = (over: Partial<NormalizedLesson> = {}): NormalizedLesson => ({
  key: 'k',
  date: new Date(2025, 8, 1),
  startTime: '09:00',
  endTime: '10:00',
  week: 1,
  dayName: 'Понедельник',
  isCurrentWeek: true,
  isPast: false,
  raw: makeRaw(),
  ...over,
});

describe('getLessonAccentColor', () => {
  afterEach(() => {
    usePreferencesStore.setState({ lessonColorOverrides: {} });
  });

  it('returns the fallback color for a null/unknown type', () => {
    expect(getLessonAccentColor(null)).toBe(FALLBACK_LESSON_COLOR);
    expect(getLessonAccentColor('НЕЧТО')).toBe(FALLBACK_LESSON_COLOR);
  });

  it('returns the canonical color for a known type', () => {
    expect(getLessonAccentColor('ЛК')).toBe(LESSON_TYPE_COLORS['ЛК']);
    expect(getLessonAccentColor('ПЗ')).toBe(LESSON_TYPE_COLORS['ПЗ']);
  });

  it('prefers a user override when present', () => {
    usePreferencesStore.setState({ lessonColorOverrides: { ПЗ: '#123456' } });
    expect(getLessonAccentColor('ПЗ')).toBe('#123456');
  });
});

describe('getLessonTypeFullName', () => {
  it('returns the localized name for a null type', () => {
    expect(getLessonTypeFullName(null)).toBe('Занятие');
  });

  it('returns the localized name for a known type', () => {
    expect(getLessonTypeFullName('ЛК')).toBe('Лекция');
  });

  it('returns the raw value for an unknown type', () => {
    expect(getLessonTypeFullName('Зачёт')).toBe('Зачёт');
  });
});

describe('getLessonTimeStatus', () => {
  const lesson = makeNorm({ startTime: '09:00', endTime: '10:00' });

  it('is "future" before the lesson starts', () => {
    expect(getLessonTimeStatus(lesson, new Date(2025, 8, 1, 8, 0))).toEqual({ kind: 'future' });
  });

  it('is "past" after the lesson ends', () => {
    expect(getLessonTimeStatus(lesson, new Date(2025, 8, 1, 11, 0))).toEqual({ kind: 'past' });
  });

  it('is "ongoing" with progress in the middle', () => {
    const status = getLessonTimeStatus(lesson, new Date(2025, 8, 1, 9, 30));
    expect(status?.kind).toBe('ongoing');
    if (status?.kind === 'ongoing') expect(status.progress).toBeCloseTo(0.5);
  });

  it('returns null when the times cannot be parsed', () => {
    expect(getLessonTimeStatus(makeNorm({ startTime: '', endTime: '' }), new Date())).toBeNull();
  });
});

describe('buildLessonBlockId', () => {
  it('builds a periodic id from day/time/subject/subgroup', () => {
    const lesson = makeNorm({
      dayName: 'Понедельник',
      raw: makeRaw({ startLessonTime: '09:00', subject: 'МАТ', numSubgroup: 1 }),
    });
    expect(buildLessonBlockId(lesson)).toBe('Понедельник:09:00:МАТ:1');
  });

  it('builds an exam id (prefixed) for one-off dated lessons', () => {
    const lesson = makeNorm({
      raw: makeRaw({ dateLesson: '15.09.2025', startLessonTime: '09:00', subject: 'МАТ' }),
    });
    expect(buildLessonBlockId(lesson)).toBe('exam:15.09.2025:09:00:МАТ:0');
  });
});

describe('getLessonBreakRange', () => {
  it('returns null for lesson types that have no break', () => {
    expect(
      getLessonBreakRange(makeNorm({ raw: makeRaw({ lessonTypeAbbrev: 'Экзамен' }) })),
    ).toBeNull();
  });

  it('returns null for a lesson shorter than the break', () => {
    const lesson = makeNorm({ startTime: '09:00', endTime: '09:03' });
    expect(getLessonBreakRange(lesson)).toBeNull();
  });

  it('places a centered 5-minute break for a standard lesson', () => {
    const lesson = makeNorm({
      startTime: '09:00',
      endTime: '10:35',
      raw: makeRaw({ lessonTypeAbbrev: 'ЛК' }),
    });
    const range = getLessonBreakRange(lesson);
    expect(range?.startsAt).toBe('09:45'); // (95 - 5) / 2 = 45 min in
    expect(range?.startFraction).toBeCloseTo(45 / 95);
    expect(range?.widthFraction).toBeCloseTo(5 / 95);
  });
});
