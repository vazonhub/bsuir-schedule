export const ru = {
  // Tabs
  tabs: {
    my: 'Моё',
    groups: 'Группы',
    employees: 'Преподаватели',
    settings: 'Настройки',
  },

  // Common
  common: {
    back: 'Назад',
    retry: 'Повторить',
    search: 'Поиск',
    clear: 'Очистить',
    nothingFound: 'Ничего не найдено',
  },

  // My Schedule
  mySchedule: {
    title: 'Моё расписание',
    subtitle: 'Выберите группу или преподавателя, чтобы видеть расписание сразу при открытии приложения',
    selectGroup: 'Выбрать расписание',
  },

  // Schedule
  schedule: {
    notFound: 'Расписание не найдено',
    exams: 'Экзамены',
    goToExams: 'Перейти к экзаменам',
    goToSchedule: 'Перейти к расписанию',
    pin: 'Закрепить расписание',
    unpin: 'Открепить расписание',
    changeGroup: 'Сменить расписание',
    week: 'Неделя {{n}}',
  },

  // Groups
  groups: {
    searchPlaceholder: 'Поиск группы или факультета',
    pickerTitle: 'Выбрать расписание',
    pickerSearchPlaceholder: 'Поиск группы',
    pickerTabGroups: 'Группы',
    pickerTabEmployees: 'Преподаватели',
    favorites: 'Избранные',
    groupLabel: 'Группа {{name}}, {{speciality}}, {{course}} курс',
  },

  // Employees
  employees: {
    searchPlaceholder: 'Поиск по фамилии, кафедре или должности',
    allEmployees: 'Все преподаватели',
    teacherLabel: 'Преподаватель {{name}}',
  },

  // Subgroup
  subgroup: {
    all: 'Все',
    subgroup1: '1 подгруппа',
    subgroup2: '2 подгруппа',
    label: 'Подгруппа: {{value}}',
  },

  // Lesson details
  lesson: {
    subgroup: '{{n}} подгруппа',
    weekLabel: 'неделя',
    teacher: 'Преподаватель',
    teachers: 'Преподаватели',
    group: 'Группа',
    groups: 'Группы',
    notMySubgroup: 'не моя подгруппа',
  },

  // Lesson types
  lessonType: {
    ПЗ: 'Практическое занятие',
    ЛР: 'Лабораторная работа',
    ЛК: 'Лекция',
    Консультация: 'Консультация',
    Экзамен: 'Экзамен',
    fallback: 'Занятие',
  },

  // Date / time
  date: {
    today: 'Сегодня',
    tomorrow: 'Завтра',
    days: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
    daysShort: ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'],
    months: [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
    ],
  },

  // Widget
  widget: {
    weekLabel: 'Неделя',
    noClasses: 'Нет пар',
    allDone: 'На сегодня пар больше нет',
    subgroupShort: 'п/г',
    description: 'Расписание занятий',
  },

  // Settings
  settings: {
    title: 'Настройки',
    themeSection: 'Тема оформления',
    themeAuto: 'Системная',
    themeLight: 'Светлая',
    themeDark: 'Тёмная',
    languageSection: 'Язык',
  },
} as const;

/**
 * Recursively relaxes literal string types to `string` and
 * readonly string tuples to `string[]`, so that other locales can
 * provide translated values while keeping the same structural shape.
 */
type DeepStringify<T> = T extends readonly string[]
  ? string[]
  : T extends string
    ? string
    : T extends object
      ? { [K in keyof T]: DeepStringify<T[K]> }
      : T;

export type TranslationKeys = DeepStringify<typeof ru>;
