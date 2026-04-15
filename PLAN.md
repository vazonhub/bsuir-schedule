# BSUIR Schedule — План разработки

> Документ создан для совместной работы с Claude Code. Редактируй свободно: меняй приоритеты, добавляй задачи, отмечай выполненное чек-боксом `[x]`. Каждая фаза заканчивается явным «definition of done», чтобы можно было отдать её ассистенту одной командой.

---

## 0. Контекст и принципы

- **Стек:** Expo SDK 54 + React Native 0.81 + React 19 + TypeScript (strict + noUncheckedIndexedAccess).
- **Платформы:**
  - **iOS** — основная. Минимальный deployment target — **iOS 15.1** (по умолчанию SDK 54). Liquid Glass-эффекты включаются автоматически на устройствах с **iOS 26+** (нативный `UITabBarController`, native large title, Material Glass под карточками); на iOS 15..25 деградирует на стандартный look.
  - **Android** — полноценная поддержка функционала (списки, расписание, детали, виджеты), но без iOS-специфичных полировок (Liquid Glass / SF Symbols заменяются Material 3 + векторными иконками). В UI решения принимаются «iOS-first», после чего проверяется/адаптируется Android.
- **Архитектура:** MVC в нашей трактовке.
  - **Model** = `src/models/dto/*` (DTO API) + `src/stores/*` (in-memory state, Zustand).
  - **View** = `src/views/*` (React Native компоненты экранов) + `src/components/*` (переиспользуемые UI-кирпичики).
  - **Controller** = `src/controllers/*` (классы/объекты, оборачивающие `services/api/*` и обновляющие stores).
  - **Service** = `src/services/api/*` (axios-обёртки над REST API), `src/services/cache` (MMKV) и т.д.
- **Чистота слоёв:** view-компоненты НЕ зовут axios напрямую, они зовут только методы контроллеров и читают данные из stores через селекторы. Контроллеры — единственное место, где допустима оркестрация (API → нормализация → store).
- **Алиасы импортов:** `@models`, `@views`, `@controllers`, `@services`, `@stores`, `@components`, `@navigation`, `@theme`, `@utils`, `@hooks`. Настроены и в `tsconfig.json`, и в `babel.config.js`.

### Конвенции цветов (lesson type → accent)

| Тип            | Источник API              | Цвет        | Hex       |
| -------------- | ------------------------- | ----------- | --------- |
| ПЗ             | `lessonTypeAbbrev = "ПЗ"` | фиолетовый  | `#8E5CD9` |
| ЛР             | `"ЛР"`                    | оранжевый   | `#F08A24` |
| ЛК             | `"ЛК"`                    | зелёный     | `#3FB36F` |
| Консультация   | `"Консультация"`          | коричневый  | `#8B5A2B` |
| Экзамен        | `"Экзамен"` (или `exams`) | фиолетовый* | `#7A3FB6` |

*У экзамена и ПЗ цвет одного семейства, но насыщенность другая — экзамен темнее. Если нужен полный визуальный различитель, см. фазу 9.

Цвет применяется как `border-left` карточки урока (полоска ~4–6 px).

---

## 1. Текущая структура репозитория

```
.
├── app/                            # Expo Router (file-based)
│   ├── _layout.tsx                 # Root: GestureHandler + SafeArea + Stack
│   └── (tabs)/
│       ├── _layout.tsx             # NativeTabs (expo-router/unstable-native-tabs)
│       ├── (groups)/
│       │   ├── _layout.tsx         # Stack для вкладки «Группы»
│       │   ├── index.tsx           # → GroupsListScreen
│       │   └── [name].tsx          # → GroupScheduleScreen
│       └── (employees)/
│           ├── _layout.tsx         # Stack для вкладки «Преподаватели»
│           ├── index.tsx           # → EmployeesListScreen
│           └── [urlId].tsx         # → EmployeeScheduleScreen
├── app.json                        # Expo config (plugin expo-router)
├── babel.config.js                 # module-resolver + reanimated/plugin
├── tsconfig.json                   # strict + path aliases
├── .eslintrc.js / .prettierrc      # линт/формат
├── PLAN.md                         # этот файл
└── src/
    ├── models/dto/                 # DTO под ответы iis.bsuir.by
    │   ├── common.dto.ts           # типы дат, недели, дни недели
    │   ├── student-group.dto.ts
    │   ├── employee.dto.ts
    │   ├── lesson.dto.ts           # LessonDto + LessonTypeAbbrev
    │   ├── schedule.dto.ts         # ScheduleDto + CurrentWeekNumber
    │   └── index.ts
    ├── services/
    │   └── api/
    │       ├── http.ts             # axios instance, baseURL=https://iis.bsuir.by/api/v1
    │       ├── groups.api.ts
    │       ├── employees.api.ts
    │       ├── schedule.api.ts     # current-week
    │       └── index.ts
    ├── stores/                     # Zustand
    │   ├── groups.store.ts
    │   ├── employees.store.ts
    │   ├── schedule.store.ts       # byKey: groupName | employeeUrlId → ScheduleDto
    │   └── index.ts
    ├── controllers/
    │   ├── groups.controller.ts
    │   ├── employees.controller.ts
    │   ├── schedule.controller.ts
    │   └── index.ts
    ├── views/
    │   ├── groups/
    │   │   ├── GroupsListScreen.tsx
    │   │   ├── GroupRow.tsx
    │   │   └── SectionHeader.tsx
    │   ├── employees/
    │   │   └── EmployeesListScreen.tsx
    │   ├── schedule/
    │   │   ├── GroupScheduleScreen.tsx     # пока заглушка
    │   │   └── EmployeeScheduleScreen.tsx  # пока заглушка
    │   └── lesson/                         # будет сюда: LessonCard, LessonDetailsSheet
    ├── components/
    │   └── SearchBar.tsx           # iOS-style rounded search field
    ├── theme/colors.ts             # LESSON_TYPE_COLORS + Palette/PaletteDark
    ├── utils/
    │   ├── lesson.ts               # getLessonAccentColor / getLessonTypeFullName
    │   ├── date.ts                 # parse/format dd.MM.yyyy
    │   └── groupGrouping.ts        # groupByFaculty
    └── hooks/
        └── useGroupSearch.ts       # search + useDeferredValue
```

---

## 2. API iis.bsuir.by — справка

Базовый URL: `https://iis.bsuir.by/api/v1`. Аутентификация для публичных endpoint'ов не нужна.

| Метод | Путь                                | Назначение                                       |
| ----- | ----------------------------------- | ------------------------------------------------ |
| GET   | `/student-groups`                   | Список всех групп (`StudentGroupDto[]`)          |
| GET   | `/employees/all`                    | Список всех преподавателей (`EmployeeDto[]`)     |
| GET   | `/schedule?studentGroup={name}`     | Расписание группы (`ScheduleDto`)                |
| GET   | `/employees/schedule/{urlId}`       | Расписание преподавателя (`ScheduleDto`)         |
| GET   | `/schedule/current-week`            | Номер текущей недели (число 1..4)                |
| GET   | `/employees/photo/{employeeId}`     | Фото преподавателя (бинарный JPEG)               |

### Особенности `ScheduleDto`

- `schedules` — словарь, где **ключи — русские названия дней** (`"Понедельник"`, …, `"Воскресенье"`).
- Каждый `LessonDto.weekNumber` — массив чисел 1..4. Пустой массив трактуется API как «каждую неделю».
- `numSubgroup`: `0` — общая пара, `1` / `2` — для подгруппы.
- `dateLesson` — для одиночных событий (объявления, экзамены), `startLessonDate` / `endLessonDate` — диапазон периодических.
- `exams` — отдельный плоский список; их тоже можно показывать как пары с типом «Экзамен».
- Когда `studentGroupDto != null` — это расписание группы, когда `employeeDto != null` — преподавателя.

### Граничные случаи, замеченные в API

- Бывают группы, у которых `schedules` = `null` (расписание ещё не опубликовано). Нужно показывать «расписание ещё не опубликовано».
- `lessonTypeAbbrev` бывает `null` (видимо, для объявлений) — рендерим серым.
- Поля `currentTerm` / `nextTerm` стабильно `null` — игнорируем.

---

## 3. Definition of Done для проекта в целом

- [ ] Список групп открывается мгновенно (с MMKV-кэшем), сгруппирован по факультетам с заголовками-секциями, поддерживает поиск.
- [ ] Список преподавателей открывается с поиском.
- [ ] При тапе на группу/преподавателя открывается экран расписания, который сразу скроллит к ближайшей будущей паре от «сейчас».
- [ ] Цветовые маркеры пар соответствуют таблице в §0.
- [ ] Тап по карточке пары открывает bottom sheet с полной информацией (полное название предмета, ФИО преподавателей, тип, аудитории, заметка, недели).
- [ ] Корректно обрабатываются `weekNumber` + `currentWeek` (подсветка «эта неделя» / «не на этой неделе»).
- [ ] iOS 26: таббар Liquid Glass, корректные SF Symbols, native large title, swipe-back на стеках.
- [ ] iOS 15.1+: корректный fallback без Liquid Glass.
- [ ] Android: тот же набор экранов, Material 3-стиль таббара, векторные иконки.
- [ ] Закреплённые расписания (группы и преподаватели) предзагружаются в фоне при старте и обновляются по расписанию.
- [ ] Виджет «Сегодня» работает на iOS (WidgetKit) и Android (Glance/RemoteViews), показывает ближайшие пары закреплённой группы.

---

## 4. Дорожная карта (фазы)

### Phase 1 — Каркас (готово ✅)

- [x] Инициализация Expo TS.
- [x] Алиасы, ESLint, Prettier, strict TS.
- [x] DTO под все основные ответы API.
- [x] Axios-инстанс + три API-модуля.
- [x] Zustand stores (`groups`, `employees`, `schedule`).
- [x] Контроллеры (`GroupsController`, `EmployeesController`, `ScheduleController`).
- [x] Навигация: Expo Router file-based, `app/(tabs)/(groups|employees)/...`, нативный таббар через `expo-router/unstable-native-tabs`.
- [x] Заглушечные экраны списков и расписания.

### Phase 2 — Список групп (production-ready) ✅

Файлы: `src/views/groups/*`, `src/components/SearchBar.tsx`, `src/hooks/useGroupSearch.ts`, `src/utils/groupGrouping.ts`.

- [x] Группировка по факультетам через `SectionList` — каждая секция имеет sticky header вида «ФКСиС · Факультет компьютерных систем и сетей». Внутри секции — сортировка по `course`, потом по `name`.
- [x] Порядок секций — **по алфавиту** `facultyAbbrev` (детерминированно, без фиксированных приоритетов).
- [x] Утилита `groupByFaculty(groups: StudentGroupDto[]): Section[]` в `utils/groupGrouping.ts`.
- [x] Поиск: фильтрация по `name`, `facultyAbbrev`, `facultyName`, `specialityAbbrev`, `specialityName`. Через `useDeferredValue` + мемоизированный selector.
- [x] При активном поиске секции **схлопываются** в плоский список совпадений (`FlatList`), отсортированный по `name`. Когда поиск пуст — снова `SectionList` по факультетам.
- [x] Pull-to-refresh (`RefreshControl`).
- [x] Пустое состояние («Ничего не найдено») и состояние ошибки с кнопкой «Повторить».
- [ ] Анимация нажатия (`Pressable` + `useAnimatedStyle` reanimated, опционально). — отложено.
- [ ] Сохранять последний загруженный список в MMKV → быстрый старт оффлайн (через `services/cache`, фаза 6). — относится к Phase 6.

### Phase 3 — Список преподавателей ✅

Файлы: `src/views/employees/*`, `src/components/Avatar.tsx`, `src/hooks/useEmployeeSearch.ts`.

- [x] Поиск по `lastName + firstName + middleName + fio + rank + academicDepartment`. Через `useDeferredValue` — клавиатура отзывчива на ≈3000 записей.
- [x] Аватарка: `Image` source = `photoLink`, плейсхолдер с инициалами (`ФИ`) при ошибке загрузки или отсутствии URL.
- [ ] Опционально: алфавитный sticky-индекс справа (как в Контактах iOS) — отложено.
- [x] Pull-to-refresh (`RefreshControl`), full-screen loading/error c кнопкой «Повторить», empty-state «Ничего не найдено».
- [x] Карточный стиль (Avatar + ФИО + кафедра/должность + chevron) на `Palette.card` с press-feedback через `cardPressed`.

### Phase 4 — Расписание (главный экран функциональности) ✅

#### 4.1 Нормализация данных ✅

Файл: `src/utils/scheduleNormalization.ts`.

- [x] `flattenSchedule(schedule, currentWeek, today)` — разворачивает `schedules` в плоский хронологический список конкретных вхождений пары (дата + время). Поддерживает `dateLesson` (одиночное событие) и периодические пары через `startLessonDate / endLessonDate / weekNumber`. По умолчанию `daysInPast = 0` — показываем только сегодняшние и будущие пары.
- [x] `computeWeekForDate(date, today, currentWeek)` — определяет номер 1..4 для произвольной даты, исходя из того что `today` находится в `currentWeek`.
- [x] Тип `NormalizedLesson` (key/date/startTime/endTime/week/dayName/isCurrentWeek/isPast/raw).
- [x] `groupLessonsByDay(lessons)` — группирует в `ScheduleSection[]` для SectionList.
- [x] `findUpcomingSectionIndex(sections, now)` — для авто-скролла к ближайшему дню.

#### 4.2 Компоненты ✅

Файлы: `src/views/lesson/LessonCard.tsx`, `src/views/lesson/DayHeader.tsx`, `src/views/schedule/ScheduleView.tsx`.

- [x] `LessonCard`: цветная полоска слева (5 px) из `LESSON_TYPE_COLORS`, время, название (`subject`), мета-строка (преподаватель + аудитория), бейдж «1/2 п/г», заметка курсивом. Compact-режим для пар не своей подгруппы — пунктирная рамка цвета типа занятия + только название.
- [x] `DayHeader`: «Понедельник, 14 апреля · Неделя 2», sticky, акцентный цвет для сегодняшнего дня.
- [x] `ScheduleView`: SectionList по дням, sticky headers, авто-скролл к ближайшему дню (`scrollToLocation` с retry через `onScrollToIndexFailed`), pull-to-refresh, корректный отступ снизу под таббар. Над списком — `FloatingTopBar` (Liquid Glass через `expo-blur`): кнопка назад слева, pin + `SubgroupPicker` справа. Подгруппа и pin-статус хранятся в `preferences.store` (MMKV-persist).

#### 4.3 Подключение к экранам ✅

- [x] `GroupScheduleScreen` подгружает `current-week` + расписание группы, рендерит `<ScheduleView />`.
- [x] `EmployeeScheduleScreen` — то же для преподавателя.
- [ ] Header стека сейчас скрыт (см. фазу полировки/UI). Бейдж текущей недели — отложено.

#### 4.4 Состояния ✅

- [ ] Skeleton-плейсхолдеры — отложено в Phase 9 (сейчас `ActivityIndicator`).
- [x] Empty: «Расписание ещё не опубликовано» (если `schedules` пуст или нормализация даёт 0 событий).
- [x] Error: ретрай-кнопка, под капотом — повтор контроллера.

### Phase 5 — Детали пары (bottom sheet)

Файлы: `src/views/lesson/LessonDetailsSheet.tsx`, потенциально библиотека `@gorhom/bottom-sheet`.

- [ ] Установить `@gorhom/bottom-sheet` (`expo install @gorhom/bottom-sheet`).
- [ ] Sheet с контентом:
  - Полное название предмета (`subjectFullName`).
  - Тип (полное название из `getLessonTypeFullName`) + цветовой чип.
  - Время и дата.
  - Аудитории.
  - Список преподавателей (ФИО + degree + rank, тап → переход в `EmployeeSchedule` соответствующего таба).
  - Список групп (для расписания преподавателя — тап → `GroupSchedule`).
  - Заметка (`note`), если есть.
  - Недели (`weekNumber`) с подсветкой текущей.
- [ ] Открытие по тапу на `LessonCard`.

### Phase 6 — Кэш, оффлайн и предзагрузка закреплённого

Файлы: `src/services/cache/mmkv.ts`, `src/services/prefetch.ts`, обновление контроллеров.

- [ ] Тонкая обёртка над MMKV: `cache.get<T>(key)`, `cache.set(key, value, ttl?)`, `cache.invalidate(key)`.
- [ ] Контроллеры пишут результат в кэш и читают его на старте → возвращают данные пользователю мгновенно, потом обновляют сетью (stale-while-revalidate).
- [ ] TTL: 24 ч для списков групп/преподавателей, 6 ч для расписания, 1 ч для `current-week`.
- [ ] Хранить ключ «последняя открытая группа» — для быстрого старта (опционально открывать её сразу).
- [ ] **Prefetch закреплённого:** на старте приложения `prefetch.ts` проходит по `preferences.pinnedGroups[]` и `preferences.pinnedEmployees[]` и зовёт `ScheduleController.loadGroupSchedule` / `loadEmployeeSchedule` для каждого. Запросы идут параллельно с `Promise.allSettled`, ошибки логируются, не падают.
- [ ] Refresh закреплённого по триггерам: `AppState` → active (с дебаунсом), pull-to-refresh на любом списке, ручное «обновить» в настройках.

### Phase 7 — Закрепление и «моя группа»

Файлы: `src/stores/preferences.store.ts`, `src/components/PinButton.tsx`.

- [ ] `preferences.store.ts` (Zustand + persist через MMKV): `pinnedGroups: string[]`, `pinnedEmployees: string[]`, `defaultGroup: string | null`, `theme: 'auto'|'light'|'dark'`.
- [ ] Первый запуск — без onboarding-модала. Просто открывается список групп; пользователь сам выбирает и закрепляет.
- [ ] Кнопка ★ (Pin) в шапке `GroupScheduleScreen` и `EmployeeScheduleScreen` — toggle закрепления. Первая закреплённая группа автоматически становится `defaultGroup` (используется виджетами).
- [ ] Закреплённые поднимаются наверх списка отдельной секцией «Закреплённые» (показывается выше факультетов в `SectionList`).
- [ ] Закреплённые автоматически попадают в Phase 6 prefetch.
- [ ] Виджеты (Phase 10) читают `defaultGroup` для отображения.

### Phase 8 — Тёмная тема и Liquid Glass-полировка

- [ ] Тема через `useColorScheme()`, `Palette` / `PaletteDark` уже готовы.
- [ ] Кастомный header (large title) — изучить `react-native-screens` `headerLargeTitle` для нативного эффекта.
- [ ] BlurView (`expo-blur`) под карточкой расписания «сегодня» — подчёркивает Liquid Glass.

### Phase 9 — Полировка и QA

- [ ] Haptics при тапе на пару и при pin/unpin (`expo-haptics`).
- [ ] Локализация (i18n) — для начала только русский, инфраструктура с `i18next` чтобы потом добавить английский/белорусский.
- [ ] Аналитика ошибок (Sentry) — опционально.
- [ ] Ручное QA на iPhone 17 (iOS 26) и любом Android-устройстве/эмуляторе с API 33+.

### Phase 10 — Виджеты на главный экран

Цель: показывать ближайшие пары закреплённой (default) группы прямо на Home Screen / Lock Screen.

#### 10.1 Подготовка общего слоя

Файлы: `src/services/widget/widgetData.ts`, `src/services/widget/index.ts`.

- [ ] Утилита `buildWidgetSnapshot(schedule: ScheduleDto, currentWeek: WeekNumber, now: Date): WidgetSnapshot` — компактное представление: «сегодня» + «следующие 1–3 пары».
  ```ts
  interface WidgetSnapshot {
    groupName: string;
    generatedAt: string;       // ISO
    currentWeek: WeekNumber;
    todayLessons: WidgetLesson[];
    upcomingLessons: WidgetLesson[]; // ближайшие после "сейчас"
  }
  interface WidgetLesson {
    subject: string;
    typeAbbrev: string | null;
    typeColorHex: string;
    startTime: string;
    endTime: string;
    auditories: string[];
    teacher: string | null;     // короткое ФИО
  }
  ```
- [ ] Сериализация снапшота в JSON и запись в **shared storage** (см. ниже).
- [ ] Записывать снапшот после каждого успешного `loadGroupSchedule` для закреплённых групп.

#### 10.2 iOS — WidgetKit (Swift)

- [ ] `npx expo install expo-apple-targets` (или ручной target в Xcode после `prebuild`).
- [ ] App Group: добавить `group.by.vazon.bsuirschedule` в `app.json → ios.entitlements`. JS-сторона использует `react-native-shared-group-preferences` или MMKV с `appGroupId`, чтобы писать в общий контейнер.
- [ ] WidgetKit Extension на Swift:
  - читает JSON-снапшот из App Group,
  - реализует `TimelineProvider`, обновляющий вид раз в час и по `Timeline.refresh`,
  - размеры: `systemSmall` (1 ближайшая пара), `systemMedium` (3 пары + «сегодня»), `accessoryRectangular` для Lock Screen (Live Activities — позже).
- [ ] Цвета пар прокидываются как hex из `WidgetSnapshot` (Swift парсит в `Color`).
- [ ] Иконка SF Symbol (`graduationcap.fill` или `calendar`) в шапке виджета.

#### 10.3 Android — Glance App Widgets

- [ ] После `expo prebuild` добавить нативный модуль с Jetpack Glance (Compose-style виджеты).
- [ ] Хранилище — общий `SharedPreferences` (или DataStore) внутри пакета приложения. JS пишет через `react-native-default-preference` либо через `react-native-mmkv` с одним и тем же файлом-инстансом — нативный код Glance читает оттуда.
- [ ] Layouts: маленький (1 пара), средний (3 пары) — соответствуют iOS размерам, чтобы JS-код снапшота был общим.
- [ ] Цвет акцента — `RoundedCornerShape` + цветовая полоска слева, как в карточке внутри приложения.

#### 10.4 Обновление виджетов

- [ ] iOS: после успешной перезаписи снапшота вызывать `WidgetCenter.shared.reloadAllTimelines()` через нативный модуль.
- [ ] Android: триггерить `GlanceAppWidget.update(...)`.
- [ ] Бэкграунд-обновление: `expo-background-fetch` (iOS) + `expo-task-manager` (Android) — задача раз в N часов перезапрашивает расписание для default группы и перезаписывает снапшот.
- [ ] Описать ограничения (iOS background fetch не гарантирует частоту) в `CLAUDE.md`.

---

## 5. Связь файлов с фазами (быстрый индекс для Claude Code)

| Фаза | Создаёт / меняет |
| ---- | ---------------- |
| 2 | `views/groups/*`, `components/SearchBar.tsx`, `hooks/useGroupSearch.ts`, `utils/groupGrouping.ts` |
| 3 | `views/employees/*`, `components/Avatar.tsx`, `hooks/useEmployeeSearch.ts` |
| 4.1 | `utils/scheduleNormalization.ts`, расширение `models/dto` |
| 4.2 | `views/lesson/LessonCard.tsx`, `views/lesson/DayHeader.tsx`, `views/schedule/ScheduleView.tsx` |
| 4.3 | `views/schedule/GroupScheduleScreen.tsx`, `views/schedule/EmployeeScheduleScreen.tsx` |
| 5 | `views/lesson/LessonDetailsSheet.tsx` + установка `@gorhom/bottom-sheet` |
| 6 | `services/cache/mmkv.ts`, `services/prefetch.ts`, апдейт всех контроллеров |
| 7 | `stores/preferences.store.ts`, `components/PinButton.tsx` |
| 8 | `theme/*`, `components/Surface.tsx` |
| 9 | `utils/haptics.ts`, инфраструктура i18n |
| 10 | `services/widget/*`, нативные таргеты iOS WidgetKit + Android Glance, изменения в `app.json` (App Group, entitlements) |

---

## 6. Скрипты и команды

```bash
# Установка зависимостей (если потребуется)
npm install

# Запуск Metro + dev-сборка iOS (нужен Mac + Xcode)
npm run ios

# Просто Metro для физического устройства (Expo Go не поддержит native bottom tabs — нужен dev client)
npm start

# Создать нативные проекты ios/android (потребуется один раз перед первой сборкой)
npm run prebuild

# Проверки
npm run typecheck
npm run lint
npm run format
```

> **Важно:** `expo-router/unstable-native-tabs` использует native `UITabBarController` (iOS) и `BottomNavigationView` (Android) — **Expo Go не подходит**. Используется dev client (`expo-dev-client` уже установлен). Запуск через `npx expo run:ios` — он соберёт нативный проект, поставит dev client и поднимет Metro.

---

## 7. Зафиксированные решения

- iOS deployment target: **15.1** (по умолчанию SDK 54). Liquid Glass — только при запуске на устройстве с **iOS 26+**, ниже — graceful fallback.
- Android — **поддерживается полностью** (списки, расписание, виджеты). UI делается iOS-first, после чего проверяется/адаптируется Android (Material 3, без SF Symbols).
- Список групп — `SectionList`, **группировка по факультетам** с sticky-заголовками вида «ФКСиС · Факультет компьютерных систем и сетей». Порядок секций — **по алфавиту `facultyAbbrev`**. Внутри секций — сортировка по курсу, затем по имени.
- При активном поиске — секции схлопываются в **плоский список** совпадений; при пустой строке — снова `SectionList` по факультетам.
- **Onboarding-модала нет.** Первый запуск сразу открывает список групп; пользователь сам выбирает и при желании закрепляет.
- **Закреплённые** группы и преподаватели **предзагружаются** в фоне на старте приложения и при возврате в foreground (см. Phase 6).
- Отдельная вкладка «Сегодня» **не нужна**. Её роль выполняют: (а) автоскролл к ближайшей паре на экране расписания закреплённой группы, (б) виджеты на Home/Lock Screen.

---

## 8. Что НЕ входит в текущий план

- Авторизация / личный кабинет студента.
- Push-уведомления о парах.
- Полноценный календарь (.ics экспорт).
- Web-версия приложения.
- Live Activities / Dynamic Island (можно добавить отдельной фазой 11 после виджетов).

Эти пункты обсуждаемы, но сейчас не приоритет.
