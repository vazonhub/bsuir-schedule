import { addDays, formatBsuirDate, startOfLocalDay } from '@utils/date';
import type { LessonDto, ScheduleDto } from '@models/dto';

/**
 * Demo schedule fixture — used to seed the diary while the live BSUIR API is
 * unavailable. Dates are computed relative to the day of seeding so most
 * lessons land in the future, giving the diary a meaningful "remaining" count.
 *
 * NOT intended for shipping — this is a manual dev tool exposed through
 * Settings. Real schedules always come from `iis.bsuir.by`.
 */

const DEMO_GROUP_NAME = 'DEMO-101';

interface LessonTemplate {
  subject: string;
  subjectFullName: string;
  startTime: string;
  endTime: string;
  type: 'ЛК' | 'ПЗ' | 'ЛР';
  auditory: string;
  weekNumber?: (1 | 2 | 3 | 4)[];
  numSubgroup?: 0 | 1 | 2;
}

/** One template row per (day, time) — generator expands into concrete lessons. */
const DEMO: Record<'Понедельник' | 'Вторник' | 'Среда' | 'Четверг' | 'Пятница', LessonTemplate[]> =
  {
    Понедельник: [
      {
        subject: 'МСиСвИТ',
        subjectFullName: 'Метрология, стандартизация и сертификация в ИТ',
        startTime: '09:00',
        endTime: '10:35',
        type: 'ЛК',
        auditory: '512-4',
      },
      {
        subject: 'МСиСвИТ',
        subjectFullName: 'Метрология, стандартизация и сертификация в ИТ',
        startTime: '10:50',
        endTime: '12:25',
        type: 'ПЗ',
        auditory: '414-4',
      },
      {
        subject: 'ООП',
        subjectFullName: 'Объектно-ориентированное программирование',
        startTime: '13:00',
        endTime: '14:35',
        type: 'ЛК',
        auditory: '203-4',
      },
      {
        subject: 'ООП',
        subjectFullName: 'Объектно-ориентированное программирование',
        startTime: '14:50',
        endTime: '16:25',
        type: 'ЛР',
        auditory: '607-4',
        numSubgroup: 1,
      },
      {
        subject: 'ООП',
        subjectFullName: 'Объектно-ориентированное программирование',
        startTime: '14:50',
        endTime: '16:25',
        type: 'ЛР',
        auditory: '608-4',
        numSubgroup: 2,
      },
    ],
    Вторник: [
      {
        subject: 'БД',
        subjectFullName: 'Базы данных',
        startTime: '09:00',
        endTime: '10:35',
        type: 'ЛК',
        auditory: '505-4',
      },
      {
        subject: 'БД',
        subjectFullName: 'Базы данных',
        startTime: '10:50',
        endTime: '12:25',
        type: 'ЛР',
        auditory: '610-4',
      },
      {
        subject: 'ТиМП',
        subjectFullName: 'Теория и методология программирования',
        startTime: '13:00',
        endTime: '14:35',
        type: 'ПЗ',
        auditory: '408-4',
        weekNumber: [1, 3],
      },
      {
        subject: 'ТиМП',
        subjectFullName: 'Теория и методология программирования',
        startTime: '13:00',
        endTime: '14:35',
        type: 'ПЗ',
        auditory: '408-4',
        weekNumber: [2, 4],
      },
    ],
    Среда: [
      {
        subject: 'ВМ',
        subjectFullName: 'Высшая математика',
        startTime: '09:00',
        endTime: '10:35',
        type: 'ЛК',
        auditory: '312-1',
      },
      {
        subject: 'ВМ',
        subjectFullName: 'Высшая математика',
        startTime: '10:50',
        endTime: '12:25',
        type: 'ПЗ',
        auditory: '218-1',
      },
      {
        subject: 'ФИЛ',
        subjectFullName: 'Философия',
        startTime: '13:00',
        endTime: '14:35',
        type: 'ЛК',
        auditory: '101-3',
      },
    ],
    Четверг: [
      {
        subject: 'ООП',
        subjectFullName: 'Объектно-ориентированное программирование',
        startTime: '09:00',
        endTime: '10:35',
        type: 'ПЗ',
        auditory: '414-4',
      },
      {
        subject: 'МСиСвИТ',
        subjectFullName: 'Метрология, стандартизация и сертификация в ИТ',
        startTime: '10:50',
        endTime: '12:25',
        type: 'ЛР',
        auditory: '605-4',
      },
      {
        subject: 'БД',
        subjectFullName: 'Базы данных',
        startTime: '13:00',
        endTime: '14:35',
        type: 'ПЗ',
        auditory: '505-4',
      },
    ],
    Пятница: [
      {
        subject: 'ВМ',
        subjectFullName: 'Высшая математика',
        startTime: '09:00',
        endTime: '10:35',
        type: 'ЛР',
        auditory: '218-1',
      },
      {
        subject: 'ТиМП',
        subjectFullName: 'Теория и методология программирования',
        startTime: '10:50',
        endTime: '12:25',
        type: 'ЛК',
        auditory: '203-4',
      },
    ],
  };

const toLesson = (tpl: LessonTemplate, startDate: Date, endDate: Date): LessonDto => ({
  auditories: [tpl.auditory],
  startLessonTime: tpl.startTime,
  endLessonTime: tpl.endTime,
  lessonTypeAbbrev: tpl.type,
  note: null,
  numSubgroup: tpl.numSubgroup ?? 0,
  studentGroups: [
    {
      name: DEMO_GROUP_NAME,
      specialityName: 'Информационные системы и технологии',
      specialityCode: '1-40 05 01',
      numberOfStudents: 25,
      educationDegree: 1,
    },
  ],
  subject: tpl.subject,
  subjectFullName: tpl.subjectFullName,
  weekNumber: tpl.weekNumber ?? [],
  employees: [],
  dateLesson: null,
  startLessonDate: formatBsuirDate(startDate),
  endLessonDate: formatBsuirDate(endDate),
  announcement: false,
  split: false,
});

/**
 * Build a full demo `ScheduleDto` spanning `today` → `today + 4 months`.
 * Regenerated on every seed so counts stay meaningful regardless of when
 * the user runs it.
 */
export const buildDemoSchedule = (now = new Date()): ScheduleDto => {
  const start = startOfLocalDay(addDays(now, -14));
  const end = addDays(start, 30 * 4);

  const schedules: ScheduleDto['schedules'] = {};
  for (const [day, list] of Object.entries(DEMO)) {
    schedules[day as keyof typeof DEMO] = list.map((t) => toLesson(t, start, end));
  }

  return {
    startDate: formatBsuirDate(start),
    endDate: formatBsuirDate(end),
    startExamsDate: null,
    endExamsDate: null,
    studentGroupDto: {
      id: 1,
      name: DEMO_GROUP_NAME,
      facultyId: 1,
      facultyAbbrev: 'ФКСиС',
      facultyName: 'Факультет компьютерных систем и сетей',
      specialityDepartmentEducationFormId: 1,
      specialityName: 'Информационные системы и технологии',
      specialityAbbrev: 'ИСиТ',
      course: 3,
      calendarId: '',
      educationDegree: 1,
    },
    employeeDto: null,
    schedules,
    nextSchedules: null,
    currentTerm: 6,
    nextTerm: null,
    exams: [],
    currentPeriod: 'Весенний',
    isZaochOrDist: false,
  };
};

export const DEMO_SCHEDULE_GROUP_NAME = DEMO_GROUP_NAME;
