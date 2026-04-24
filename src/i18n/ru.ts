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
    done: 'Готово',
    cancel: 'Отмена',
  },

  error: {
    serverDown: 'Серверы iis.bsuir.by временно недоступны',
    serverHint: 'Попробуйте позже или откройте другое расписание, если оно уже загружено в кеш',
    networkDown: 'Нет подключения к интернету',
    networkHint: 'Проверьте соединение и попробуйте снова',
    generic: 'Не удалось загрузить расписание',
    genericHint: 'Попробуйте ещё раз',
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
    goToToday: 'Перейти к сегодня',
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
    blocked: 'Заблокировано',
    block: 'Заблокировать',
    unblock: 'Разблокировать',
  },

  // Lesson types
  lessonType: {
    ПЗ: 'Практическое занятие',
    ЛР: 'Лабораторная работа',
    ЛК: 'Лекция',
    Консультация: 'Консультация',
    Экзамен: 'Экзамен',
    УПз: 'УПз',
    УЛк: 'УЛк',
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
    scheduleSection: 'Расписание',
    appearanceSection: 'Внешний вид',
    previewTitle: 'Предпросмотр',
    lessonColors: 'Цвета',
    colorLR: 'Лабораторная работа',
    colorPZ: 'Практическое занятие',
    colorUPz: 'УПз',
    colorLK: 'Лекция',
    colorULk: 'УЛк',
    colorConsultation: 'Консультация',
    colorExam: 'Экзамен',
    icons: 'Иконки',
    iconExam: 'Экзамены',
    iconToday: 'Текущий день',
    iconSubgroup: 'Подгруппа',
    iconFavorites: 'Избранное',
    iconLocation: 'Локация',
    iconClock: 'Часы',
    iconBlock: 'Блокировка',
    appearanceApplyTitle: 'Применить изменения?',
    appearanceApplyMessage: 'Для применения нужно посмотреть короткое видео.',
    appearanceApplyButton: 'Смотреть и применить',
    unsavedTitle: 'Несохранённые изменения',
    unsavedMessageAd: 'Для сохранения нужно посмотреть короткое видео. Выйти без сохранения?',
    unsavedDiscard: 'Не сохранять',
    unsavedSaveAd: 'Смотреть и сохранить',
    customBadge: 'изменено',
    resetToDefault: 'Сбросить',
    appIconSection: 'Иконка приложения',
    appIconApplyTitle: 'Сменить иконку?',
    appIconApplyMessage: 'Для смены иконки необходимо посмотреть короткое видео.',
    appIconApplyButton: 'Смотреть и применить',
    iconSectionClassic: 'Классика',
    iconSectionLight: 'Светлые',
    iconSectionDark: 'Тёмные',
    iconSectionGradient: 'Градиенты',
    applyChanges: 'Применить',
    resetAppearance: 'Сбросить всё',
    resetAppearanceConfirm: 'Вернуть все цвета и иконки к стандартным?',
    hidePastLessons: 'Скрывать прошедшие пары',
    networkSection: 'Сеть & Данные',
    availabilityLabel: 'Доступность',
    sourceBsuirApi: 'iis.bsuir.by',
    sourceICloud: 'apple.com',
    availabilityHint: 'Выберите, откуда приложение будет получать данные расписания. iis.bsuir.by — официальный API БГУИР. apple.com — резервная копия в iCloud, синхронизируется между вашими устройствами и работает как fallback, если API недоступен.',
    dataLabel: 'Данные',
    clearCache: 'Очистить кэш',
    clearCacheConfirm: 'Кэш расписаний будет удалён. Данные загрузятся заново при следующем открытии.',
    clearCacheDone: 'Кэш очищен',
    refreshWidget: 'Обновить виджет',
    refreshWidgetDone: 'Виджет обновлён',
    tipJar: 'Поддержать автора',
    tipJarTitle: 'Поддержать автора',
    tipJarSubtitle: 'Если вам нравится приложение, вы можете поддержать разработку. Спасибо!',
    tipSmallName: 'Маленький донат',
    tipSmallDesc: 'Сказать спасибо разработчику',
    tipMediumName: 'Средний донат',
    tipMediumDesc: 'Поддержать развитие новых функций',
    tipLargeName: 'Большой донат',
    tipLargeDesc: 'Зарядить целую ночь кодинга',
    tipJarThanks: 'Спасибо за поддержку!',
    tipJarUnavailable: 'Покупки недоступны на этом устройстве',
    aboutSection: 'О приложении',
    aboutSocials: 'Соц. сети',
    aboutTelegramHint: 'В канале публикуются самые свежие обновления приложения. Также вы можете задать вопрос разработчику.',
    aboutDocuments: 'Документы',
    aboutPrivacyPolicy: 'Политика конфиденциальности',
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
