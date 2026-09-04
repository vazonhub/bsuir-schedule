export const ru = {
  // Tabs
  tabs: {
    my: 'Моё',
    groups: 'Группы',
    employees: 'Преподаватели',
    schedule: 'Расписание',
    diary: 'Дневник',
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
    delete: 'Удалить',
    save: 'Сохранить',
  },

  // Diary
  diary: {
    emptyPickTitle: 'Дневник пуст',
    emptyPickSubtitle: 'Закрепите свою группу, чтобы видеть предметы и отмечать задания',
    employeeUnsupportedTitle: 'Дневник доступен только для группы',
    employeeUnsupportedSubtitle:
      'Сейчас на «Моё» закреплён преподаватель. Выберите свою группу, чтобы пользоваться дневником',
    emptySubjectsTitle: 'Нет предметов',
    emptySubjectsSubtitle: 'В расписании этой группы не нашлось лекций, ПЗ или ЛР',
    enterTaskCount: 'Ввести количество заданий',
    subgroupSplit: '{{shared}} общих · {{sub}} в подгруппе',
    enterTaskCountTitle: 'Сколько заданий?',
    enterTaskCountHint: 'От {{min}} до {{max}}',
    actionsTitle: 'Действия',
    actionEnter: 'Ввести количество заданий',
    actionEdit: 'Изменить количество',
    actionReset: 'Сбросить прогресс',
    actionHide: 'Скрыть предмет',
    actionShow: 'Показать снова',
    hiddenSectionTitle: 'Скрытые',
    plannerTitle: 'Планер',
    plannerEmpty: 'Пусто',
    plannerAdd: 'Добавить',
    plannerRemove: 'Удалить',
    plannerPickSubject: 'Выберите предмет',
    plannerPickTask: 'Выберите задание',
    plannerEditTitle: 'Редактировать задачу',
    plannerNoEligible: 'Задайте количество заданий у предмета, чтобы добавить его в планер',
    upcomingTitle: 'Ближайшие',
    upcomingEmpty: 'Нет',
    whenToday: 'Сегодня',
    whenTomorrow: 'Завтра',
    shortDayNames: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  },

  fire: {
    title: 'Огонёк',
    current: 'Текущая серия',
    longest: 'Рекорд',
    days: '{{n}} дн.',
    freezes: 'Заморозки',
    freezesLeft: 'осталось {{n}} из {{max}}',
    getFreeze: 'Заморозка за рекламу',
    freezeMaxed: 'Максимум заморозок',
    calendarTitle: 'Активность',
    legendActive: 'Горело',
    legendFrozen: 'Заморозка',
    legendMissed: 'Пропуск',
    rules:
      'Заходи в приложение в учебные дни — серия растёт на +1. Пропуск учебного дня снимает 1, но заморозки (2 в неделю) прикрывают. Выходные и дни без пар не в счёт.',
    empty: 'Пока пусто. Загляни в учебный день, чтобы разжечь огонёк.',
    a11y: 'Огонёк, серия {{n}} дней',
    newRecord: 'Новый рекорд!',
    milestoneReached: '{{n}} дней подряд!',
    reminderTitle: 'Не потеряй огонёк! 🔥',
    reminderBody: 'Загляни сегодня, чтобы серия {{n}} дн. не сгорела.',
  },

  // Diary onboarding (spotlight tutorial)
  onboarding: {
    welcomeTitle: 'Это твой дневник',
    welcomeBody:
      'Здесь ты ведёшь задания по предметам своей группы. Покажем за минуту, что тут можно делать.',
    streakTitle: 'Огонёк',
    streakBody:
      'Выполняй задания и заходи в учебные дни — серия растёт. Пропустишь — огонёк начнёт гаснуть.',
    plannerTitle: 'Планер',
    plannerBody: 'Добавляй задачи, перетаскивай их для порядка и отмечай выполненными.',
    upcomingTitle: 'Ближайшие сдачи',
    upcomingBody: 'Тут ближайшие пары и дедлайны. Нажми, чтобы открыть их в расписании.',
    subjectCardTitle: 'Предметы',
    subjectCardBody:
      'Каждая карточка — предмет из расписания. Счётчики показывают, сколько заданий осталось по типам пар.',
    enterCountTitle: 'Количество заданий',
    enterCountBody: 'Нажми на карточку, чтобы задать количество заданий по предмету.',
    completeTaskTitle: 'Отметить выполненным',
    completeTaskBody:
      'Тапай по клетке задания, когда сделал его. Выполненные задания растят огонёк.',
    hideSubjectTitle: 'Скрыть предмет',
    hideSubjectBody:
      'Удерживай карточку, чтобы скрыть предмет, сбросить прогресс или изменить количество.',
    next: 'Далее',
    skip: 'Пропустить',
    done: 'Готово',
    stepProgress: 'Шаг {{current}} из {{total}}',
    diarySection: 'Дневник',
    replay: 'Пройти обучение дневника',
  },

  error: {
    serverDown: 'Серверы iis.bsuir.by временно недоступны',
    serverHint: 'Попробуйте позже или откройте другое расписание, если оно уже загружено в кеш',
    networkDown: 'Нет подключения к интернету',
    networkHint: 'Проверьте соединение и попробуйте снова',
    generic: 'Не удалось загрузить расписание',
    genericHint: 'Попробуйте ещё раз',
    apiDisabled: 'Источник iis.bsuir.by отключён',
    apiDisabledHint:
      'Это расписание отсутствует в облачном хранилище. Включите iis.bsuir.by в разделе «Сеть и данные», чтобы загрузить его',
  },

  // My Schedule
  mySchedule: {
    title: 'Моё расписание',
    subtitle:
      'Выберите группу или преподавателя, чтобы видеть расписание сразу при открытии приложения',
    selectGroup: 'Выбрать расписание',
  },

  // Schedule
  schedule: {
    notFound: 'Расписание не найдено',
    notFoundHint: 'Потяните вниз, чтобы обновить',
    exams: 'Экзамены',
    goToToday: 'Перейти к сегодня',
    goToExams: 'Перейти к экзаменам',
    goToSchedule: 'Перейти к расписанию',
    pin: 'Закрепить расписание',
    unpin: 'Открепить расписание',
    changeGroup: 'Сменить расписание',
    week: 'Неделя {{n}}',
    showPast: 'Показать прошедшие',
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
    announcement: 'Объявление',
    auditoryFreeUntil: 'Свободна до {{time}}',
    auditoryFreeAllDay: 'Свободна сегодня',
    auditoryBusyUntil: 'Занята до {{time}}',
    auditoryBusyAllDay: 'Занята до конца дня',
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
      'января',
      'февраля',
      'марта',
      'апреля',
      'мая',
      'июня',
      'июля',
      'августа',
      'сентября',
      'октября',
      'ноября',
      'декабря',
    ],
  },

  // Widget
  widget: {
    weekLabel: 'Неделя',
    noClasses: 'Нет пар',
    allDone: 'На сегодня пар больше нет',
    subgroupShort: 'п/г',
    description: 'Расписание занятий',
    now: 'Сейчас',
    next: 'Далее',
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
    sourceGoogleDrive: 'google.com',
    signIn: 'Вход',
    availabilityHint:
      'Выберите, откуда приложение будет получать данные расписания. iis.bsuir.by — официальный API БГУИР. Облачная копия (iCloud на iOS, Google Drive на Android) синхронизируется между устройствами и работает как fallback, если API недоступен.',
    dataLabel: 'Данные',
    clearCache: 'Очистить кэш',
    clearCacheConfirm:
      'Кэш расписаний будет удалён. Данные загрузятся заново при следующем открытии.',
    clearCacheDone: 'Кэш очищен',
    refreshWidget: 'Обновить виджет',
    refreshWidgetDone: 'Виджет обновлён',
    tipJar: 'Поддержать автора',
    tipJarHint: 'Приложение полностью бесплатное — нам важна любая ваша поддержка',
    tipJarTitle: 'Поддержать автора',
    tipJarSubtitle: 'Если вам нравится приложение, вы можете поддержать его разработку. Спасибо!',
    tipSmallName: 'Маленький донат',
    tipSmallDesc: 'Сказать спасибо разработчику',
    tipMediumName: 'Средний донат',
    tipMediumDesc: 'Поддержать развитие новых функций',
    tipLargeName: 'Большой донат',
    tipLargeDesc: 'Зарядить целую ночь кодинга',
    tipJarThanks: 'Спасибо за поддержку!',
    tipJarUnavailable: 'Покупки недоступны на этом устройстве',
    holidaysSection: 'Гос. праздники',
    holidaysSource: 'Источник данных',
    holidaysSourceDesc:
      'Список государственных праздников Республики Беларусь загружается с открытого API Nager.Date. Если сервис недоступен, используется встроенный список.',
    holidaysListTitle: 'Праздники',
    holidaysUserAdded: 'добавлено',
    holidaysRemoved: 'скрыто',
    holidaysRestore: 'Восстановить',
    holidaysAdd: 'Добавить праздник',
    holidaysAddName: 'Название',
    holidaysAddNamePlaceholder: 'Например: День студента',
    holidaysAddDate: 'Дата',
    holidaysAddSave: 'Сохранить',
    holidaysAddCancel: 'Отмена',
    holidaysDeleteTitle: 'Удалить праздник?',
    holidaysReset: 'Сбросить изменения',
    holidaysResetConfirm: 'Вернуть список праздников к исходному?',
    aboutSection: 'О приложении',
    aboutSocials: 'Соц. сети',
    aboutTelegramHint:
      'В канале публикуются самые свежие обновления приложения. Также вы можете задать вопрос разработчику.',
    aboutDocuments: 'Документы',
    aboutPrivacyPolicy: 'Политика конфиденциальности',
    interfaceSection: 'Интерфейс',
    additionalSection: 'Расписание',
    otherSection: 'Другое',
    debugSection: 'Отладка',
    debugSeedDemo: 'Загрузить демо-данные',
    debugClearDemo: 'Очистить демо-данные',
    debugSeedDone: 'Демо-данные загружены',
    debugClearDone: 'Демо-данные очищены',
  },

  // Accessibility screen
  accessibility: {
    title: 'Доступность',
    subtitle:
      'Приложение автоматически адаптируется к системным настройкам доступности вашего устройства. Ниже показано текущее состояние.',
    voiceOver: 'VoiceOver',
    voiceOverDesc: 'Голосовое сопровождение элементов интерфейса',
    talkBack: 'TalkBack',
    talkBackDesc: 'Озвучивание элементов интерфейса',
    reduceMotion: 'Уменьшение движения',
    reduceMotionDesc: 'Упрощённые анимации и переходы',
    boldText: 'Жирный текст',
    boldTextDesc: 'Увеличенная жирность шрифтов',
    voiceControl: 'Управление голосом',
    voiceControlDesc: 'Навигация и взаимодействие с приложением голосовыми командами',
    supported: 'Да',
    largeText: 'Крупный текст',
    largeTextDesc: 'Увеличенный размер шрифтов (Dynamic Type)',
    differentiateWithoutColor: 'Дифференциация без цвета',
    differentiateWithoutColorDesc:
      'Информация передаётся не только цветом, но и текстом или значками',
    increaseContrast: 'Увеличение контраста',
    increaseContrastDesc: 'Повышенная контрастность текста и элементов',
    on: 'Вкл',
    off: 'Выкл',
    systemSection: 'Настройки устройства',
    appSection: 'Настройки приложения',
    openSettings: 'Открыть настройки устройства',
    footnote:
      'Эти параметры управляются в системных настройках устройства. Приложение поддерживает VoiceOver, управление голосом, Dynamic Type, уменьшение движения и высококонтрастный режим.',
    footnoteAndroid:
      'Некоторые параметры, такие как дифференциация без цвета и увеличение контраста, можно переключить прямо здесь. Остальные параметры управляются в системных настройках устройства.',
  },

  // Accessibility labels
  a11y: {
    loading: 'Загрузка',
    expandSection: 'Развернуть секцию',
    collapseSection: 'Свернуть секцию',
    colorSwatch: 'Цвет: {{name}}',
    iconChoice: 'Иконка: {{name}}',
    dayHeader: '{{day}}, неделя {{week}}',
    alphabetJumpTo: 'Перейти к букве {{letter}}',
    photo: 'Фото {{name}}',
    closePhoto: 'Закрыть фото',
    openPhoto: 'Открыть фото',
    closeModal: 'Закрыть',
    datePicker: 'Выбрать дату',
    lessonOngoing: 'Сейчас идёт',
    lessonPast: 'Прошедшее',
    lessonUpcoming: 'Предстоящее',
    blockLesson: 'Заблокировать занятие',
    unblockLesson: 'Разблокировать занятие',
    clearSearch: 'Очищает поле поиска',
    togglePin: 'Закрепляет или открепляет расписание',
    openDatePicker: 'Открывает выбор даты',
    openLessonDetails: 'Открывает детали занятия',
    openGroupSchedule: 'Открывает расписание группы',
    openEmployeeSchedule: 'Открывает расписание преподавателя',
    retryLoad: 'Повторяет загрузку',
    now: 'сейчас',
  },

  // Update
  update: {
    new: 'Новое',
    title: 'Что нового',
    openStore: 'Открыть в магазине',
    close: 'Закрыть',
    whatsNew: 'Что нового',
    noNotes: 'Информация об обновлении пока недоступна.',
  },

  // Color names
  color: {
    red: 'Красный',
    lightRed: 'Светло-красный',
    magenta: 'Маджента',
    pink: 'Розовый',
    orange: 'Оранжевый',
    amber: 'Янтарный',
    yellow: 'Жёлтый',
    brown: 'Коричневый',
    green: 'Зелёный',
    emerald: 'Изумрудный',
    teal: 'Бирюзовый',
    cyan: 'Циановый',
    lightBlue: 'Голубой',
    blue: 'Синий',
    indigo: 'Индиго',
    purple: 'Фиолетовый',
    violet: 'Лиловый',
    darkPurple: 'Тёмно-фиолетовый',
    gray: 'Серый',
    black: 'Чёрный',
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
