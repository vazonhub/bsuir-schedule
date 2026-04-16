import type { TranslationKeys } from './ru';

export const en: TranslationKeys = {
  tabs: {
    my: 'My',
    groups: 'Groups',
    employees: 'Teachers',
    settings: 'Settings',
  },

  common: {
    back: 'Back',
    retry: 'Retry',
    search: 'Search',
    clear: 'Clear',
    nothingFound: 'Nothing found',
  },

  mySchedule: {
    title: 'My Schedule',
    subtitle: 'Select a group to see its schedule right when you open the app',
    selectGroup: 'Select group',
  },

  schedule: {
    notFound: 'Schedule not found',
    exams: 'Exams',
    goToExams: 'Go to exams',
    pin: 'Pin schedule',
    unpin: 'Unpin schedule',
    changeGroup: 'Change group',
    week: 'Week {{n}}',
  },

  groups: {
    searchPlaceholder: 'Search group or faculty',
    pickerTitle: 'Select group',
    pickerSearchPlaceholder: 'Search group',
    favorites: 'Favorites',
    groupLabel: 'Group {{name}}, {{speciality}}, year {{course}}',
  },

  employees: {
    searchPlaceholder: 'Search by name, department or position',
    allEmployees: 'All teachers',
    teacherLabel: 'Teacher {{name}}',
  },

  subgroup: {
    all: 'All',
    subgroup1: 'Subgroup 1',
    subgroup2: 'Subgroup 2',
    label: 'Subgroup: {{value}}',
  },

  lesson: {
    subgroup: 'Subgroup {{n}}',
    weekLabel: 'week',
    teacher: 'Teacher',
    teachers: 'Teachers',
    group: 'Group',
    groups: 'Groups',
    notMySubgroup: 'not my subgroup',
  },

  lessonType: {
    ПЗ: 'Practical',
    ЛР: 'Lab',
    ЛК: 'Lecture',
    Консультация: 'Consultation',
    Экзамен: 'Exam',
    fallback: 'Class',
  },

  date: {
    today: 'Today',
    tomorrow: 'Tomorrow',
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    daysShort: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
    months: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ],
  },

  settings: {
    title: 'Settings',
    themeSection: 'Theme',
    themeAuto: 'System',
    themeLight: 'Light',
    themeDark: 'Dark',
    languageSection: 'Language',
  },
};
