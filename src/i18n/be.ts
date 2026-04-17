import type { TranslationKeys } from './ru';

export const be: TranslationKeys = {
  tabs: {
    my: 'Маё',
    groups: 'Групы',
    employees: 'Выкладчыкі',
    settings: 'Налады',
  },

  common: {
    back: 'Назад',
    retry: 'Паўтарыць',
    search: 'Пошук',
    clear: 'Ачысціць',
    nothingFound: 'Нічога не знойдзена',
  },

  mySchedule: {
    title: 'Маё расклад',
    subtitle: 'Абярыце групу або выкладчыка, каб бачыць расклад адразу пры адкрыцці праграмы',
    selectGroup: 'Абраць расклад',
  },

  schedule: {
    notFound: 'Расклад не знойдзены',
    exams: 'Экзамены',
    goToExams: 'Перайсці да экзаменаў',
    pin: 'Замацаваць расклад',
    unpin: 'Адмацаваць расклад',
    changeGroup: 'Змяніць расклад',
    week: 'Тыдзень {{n}}',
  },

  groups: {
    searchPlaceholder: 'Пошук групы або факультэта',
    pickerTitle: 'Абраць расклад',
    pickerSearchPlaceholder: 'Пошук групы',
    pickerTabGroups: 'Групы',
    pickerTabEmployees: 'Выкладчыкі',
    favorites: 'Абраныя',
    groupLabel: 'Група {{name}}, {{speciality}}, {{course}} курс',
  },

  employees: {
    searchPlaceholder: 'Пошук па прозвішчы, кафедры або пасады',
    allEmployees: 'Усе выкладчыкі',
    teacherLabel: 'Выкладчык {{name}}',
  },

  subgroup: {
    all: 'Усе',
    subgroup1: '1 падгрупа',
    subgroup2: '2 падгрупа',
    label: 'Падгрупа: {{value}}',
  },

  lesson: {
    subgroup: '{{n}} падгрупа',
    weekLabel: 'тыдзень',
    teacher: 'Выкладчык',
    teachers: 'Выкладчыкі',
    group: 'Група',
    groups: 'Групы',
    notMySubgroup: 'не мая падгрупа',
  },

  lessonType: {
    ПЗ: 'Практычны занятак',
    ЛР: 'Лабараторная работа',
    ЛК: 'Лекцыя',
    Консультация: 'Кансультацыя',
    Экзамен: 'Экзамен',
    fallback: 'Занятак',
  },

  date: {
    today: 'Сёння',
    tomorrow: 'Заўтра',
    days: ['Нядзеля', 'Панядзелак', 'Аўторак', 'Серада', 'Чацвер', 'Пятніца', 'Субота'],
    daysShort: ['НД', 'ПН', 'АЎ', 'СР', 'ЧЦ', 'ПТ', 'СБ'],
    months: [
      'студзеня', 'лютага', 'сакавіка', 'красавіка', 'мая', 'чэрвеня',
      'ліпеня', 'жніўня', 'верасня', 'кастрычніка', 'лістапада', 'снежня',
    ],
  },

  settings: {
    title: 'Налады',
    themeSection: 'Тэма афармлення',
    themeAuto: 'Сістэмная',
    themeLight: 'Светлая',
    themeDark: 'Цёмная',
    languageSection: 'Мова',
  },
};
