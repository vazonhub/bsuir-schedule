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
    nothingFound: 'Няма вынікаў пошуку',
    done: 'Гатова',
    cancel: 'Адмена',
  },

  mySchedule: {
    title: 'Маё расклад',
    subtitle: 'Абярыце групу або выкладчыка, каб бачыць расклад адразу пры адкрыцці праграмы',
    selectGroup: 'Выбраць расклад',
  },

  schedule: {
    notFound: 'Няма вынікаў пошуку',
    exams: 'Экзамены',
    goToToday: 'Перайсці да сёння',
    goToExams: 'Перайсці да экзаменаў',
    goToSchedule: 'Перайсці да раскладу',
    pin: 'Замацаваць расклад',
    unpin: 'Адмацаваць расклад',
    changeGroup: 'Змяніць расклад',
    week: 'Тыдзень {{n}}',
  },

  groups: {
    searchPlaceholder: 'Пошук групы або факультэта',
    pickerTitle: 'Выбраць расклад',
    pickerSearchPlaceholder: 'Пошук групы',
    pickerTabGroups: 'Групы',
    pickerTabEmployees: 'Выкладчыкі',
    favorites: 'Выбраныя',
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

  widget: {
    weekLabel: 'Тыдзень',
    noClasses: 'Няма заняткаў',
    allDone: 'На сёння заняткаў больш няма',
    subgroupShort: 'п/г',
    description: 'Расклад заняткаў',
  },

  settings: {
    title: 'Налады',
    themeSection: 'Тэма афармлення',
    themeAuto: 'Сістэмная',
    themeLight: 'Светлая',
    themeDark: 'Цёмная',
    languageSection: 'Мова',
    scheduleSection: 'Расклад',
    hidePastLessons: 'Хаваць мінулыя заняткі',
    networkSection: 'Сетка & Даныя',
    availabilityLabel: 'Даступнасць',
    sourceBsuirApi: 'iis.bsuir.by',
    sourceICloud: 'apple.com',
    availabilityHint: 'Выберыце, адкуль праграма будзе атрымліваць даныя раскладу. iis.bsuir.by — афіцыйны API БДУІР. apple.com — рэзервовая копія ў iCloud, сінхранізуецца паміж вашымі прыладамі і працуе як fallback, калі API недаступны.',
    dataLabel: 'Даныя',
    clearCache: 'Ачысціць кэш',
    clearCacheConfirm: 'Кэш раскладаў будзе выдалены. Даныя загрузяцца нанова пры наступным адкрыцці.',
    clearCacheDone: 'Кэш ачышчаны',
    refreshWidget: 'Абнавіць віджэт',
    refreshWidgetDone: 'Віджэт абноўлены',
  },
};
