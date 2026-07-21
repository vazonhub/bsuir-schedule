import {
  PINNED_SECTION_KEY as EMP_PINNED_KEY,
  buildAllEmployeesSection,
  buildAlphabetSections,
  buildPinnedEmployeeSection,
} from '@utils/employeeGrouping';
import { PINNED_SECTION_KEY, buildPinnedSection, groupByFaculty } from '@utils/groupGrouping';
import type { EmployeeDto, StudentGroupDto } from '@models/dto';

const group = (over: Partial<StudentGroupDto>): StudentGroupDto => ({
  id: 1,
  name: '410101',
  facultyId: 1,
  facultyAbbrev: 'ФКСиС',
  facultyName: 'Факультет',
  specialityDepartmentEducationFormId: 1,
  specialityName: 'spec',
  specialityAbbrev: 'sp',
  course: 1,
  calendarId: 'c',
  educationDegree: 1,
  ...over,
});

const employee = (over: Partial<EmployeeDto>): EmployeeDto => ({
  id: 1,
  firstName: 'Иван',
  middleName: 'Иванович',
  lastName: 'Иванов',
  photoLink: '',
  degree: '',
  rank: null,
  urlId: 'ivanov',
  calendarId: 'c',
  ...over,
});

describe('groupByFaculty', () => {
  it('returns [] for an empty input', () => {
    expect(groupByFaculty([])).toEqual([]);
  });

  it('buckets groups by faculty and sorts sections by abbrev (ru)', () => {
    const sections = groupByFaculty([
      group({ facultyId: 2, facultyAbbrev: 'ФКП', name: '250101' }),
      group({ facultyId: 1, facultyAbbrev: 'ФКСиС', name: '410101' }),
    ]);
    expect(sections.map((s) => s.facultyAbbrev)).toEqual(['ФКП', 'ФКСиС']);
    expect(sections.map((s) => s.key)).toEqual(['2', '1']);
  });

  it('orders groups within a section by course then name', () => {
    const [section] = groupByFaculty([
      group({ course: 2, name: '420101' }),
      group({ course: 1, name: '410102' }),
      group({ course: 1, name: '410101' }),
    ]);
    expect(section?.data.map((g) => g.name)).toEqual(['410101', '410102', '420101']);
  });
});

describe('buildPinnedSection (groups)', () => {
  const groups = [group({ name: 'A' }), group({ name: 'B' }), group({ name: 'C' })];

  it('returns null when nothing is pinned', () => {
    expect(buildPinnedSection(groups, [])).toBeNull();
  });

  it('returns null when pinned names match no groups', () => {
    expect(buildPinnedSection(groups, ['Z'])).toBeNull();
  });

  it('keeps the pinning order, not alphabetical', () => {
    const section = buildPinnedSection(groups, ['C', 'A']);
    expect(section?.key).toBe(PINNED_SECTION_KEY);
    expect(section?.data.map((g) => g.name)).toEqual(['C', 'A']);
  });
});

describe('employee sections', () => {
  const employees = [
    employee({ urlId: 'ivanov', lastName: 'Иванов' }),
    employee({ urlId: 'petrov', lastName: 'Петров' }),
    employee({ urlId: 'abramov', lastName: 'Абрамов' }),
  ];

  it('buildPinnedEmployeeSection keeps pin order and returns null when empty', () => {
    expect(buildPinnedEmployeeSection(employees, [])).toBeNull();
    const section = buildPinnedEmployeeSection(employees, ['petrov', 'ivanov']);
    expect(section?.key).toBe(EMP_PINNED_KEY);
    expect(section?.data.map((e) => e.urlId)).toEqual(['petrov', 'ivanov']);
  });

  it('buildAllEmployeesSection excludes pinned employees', () => {
    const section = buildAllEmployeesSection(employees, ['ivanov']);
    expect(section.key).toBe('all');
    expect(section.data.map((e) => e.urlId)).toEqual(['petrov', 'abramov']);
  });

  it('buildAlphabetSections groups by first letter, sorted, excluding pinned', () => {
    const sections = buildAlphabetSections(employees, ['petrov']);
    expect(sections.map((s) => s.title)).toEqual(['А', 'И']);
    expect(sections[0]?.data.map((e) => e.lastName)).toEqual(['Абрамов']);
  });

  it('buildAlphabetSections falls back to "?" for an empty last name', () => {
    const sections = buildAlphabetSections([employee({ urlId: 'x', lastName: '' })], []);
    expect(sections[0]?.title).toBe('?');
  });
});
