# WATCH_PLAN.md — приложение для Apple Watch (watchOS)

Рабочий документ для ветки `feature/watch-app`. Живёт до мержа, потом можно свернуть/удалить.
Задача: часы как отдельная, но единая часть Bsuir Time — просмотр расписания на запястье,
по аналогии с тем, как сделаны iOS-виджеты (App Group + снапшот), но с поправкой на то,
что **часы — отдельное устройство** и App Group между iPhone и Watch не синхронизируется.

## 0. Зафиксированные продуктовые/технические решения (итог 3 волн вопросов)

| Тема                    | Решение                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------ |
| Платформа               | **watchOS only** (Apple Watch). Wear OS — вне объёма                                                   |
| Объём MVP               | Просмотр **закреплённой (default) группы**: сегодня + листание по дням/неделям                         |
| Complications           | **Отложены** на отдельную фазу (см. §8)                                                                |
| Источник данных         | **Гибрид**: WatchConnectivity от телефона (primary) + фолбэк в API БГУИР (edge-case)                   |
| Нормализация расписания | **На телефоне** (существующий `flattenSchedule`); часы получают готовые дни-блоки. Фолбэк — упрощённый |
| Локализация             | ru / en / be — как в приложении (строки уезжают в снапшоте)                                            |
| Мин. версия             | **watchOS 10+**                                                                                        |
| Мост телефон→часы       | **Локальный Expo-модуль** `modules/watch-bridge` (Swift WCSession + TS API)                            |
| Watch-таргет в проекте  | Swift в `targets/watch/`, интеграция через `plugins/withWatchApp.js` (как `withWidget.js`)             |
| EAS-сборка/submit часов | **Отложена** на отдельную фазу (§8). MVP собираем локально: prebuild + Xcode + watch-симулятор         |
| Подгруппа/тема          | На часах **read-only**, отражают выбор в приложении                                                    |
| Автор коммитов          | Только пользователь, **без** Claude co-author. По коммиту на шаг                                       |

## 1. Идентичность и структура

- **Watch app target:** `BsuirWatch`, bundle id `by.vazon.bsuirschedule.watchkitapp`,
  display name «Bsuir Time». Product type `com.apple.product-type.application`,
  `SDKROOT=watchos`, `TARGETED_DEVICE_FAMILY=4`, `WATCHOS_DEPLOYMENT_TARGET=10.0`.
  Info.plist: `WKApplication=YES`, `WKCompanionAppBundleIdentifier=by.vazon.bsuirschedule`.
  Встраивается в iOS-приложение через copy-files фазу «Embed Watch Content»
  (`dstSubfolderSpec=16`, `dstPath="$(CONTENTS_FOLDER_PATH)/Watch"`).
  Entitlements: App Group `group.by.vazon.bsuirschedule`.
- **Swift-исходники часов:** `targets/watch/*` — источник истины, копируются в `ios/BsuirWatch/`
  при каждом `prebuild` (как делает `withWidget.js` для виджета).
- **Мост телефон→часы:** локальный Expo-модуль `modules/watch-bridge/` (JS API + iOS Swift WCSession,
  Android/web — no-op). Компилируется в основной таргет приложения, автолинк.
- **RN-слой данных:** `src/services/watch/` — `watchData.ts` (сборка снапшота) + `index.ts`
  (отправка через мост, подписки на сторы). Зеркалит `src/services/widget/`.

## 2. Модель данных — `WatchSnapshot`

Строится на телефоне из сторов (та же входная точка, что и `buildWidgetSnapshot`).
Богаче виджет-снапшота: покрывает окно **[сегодня .. +4 недели]** (полный цикл) — этого хватает
для листания по дням/неделям.

```ts
interface WatchLesson {
  subject: string;
  typeAbbrev: string | null;
  typeColorHex: string;
  startTime: string;
  endTime: string;
  auditories: string[];
  teacher: string | null;
  numSubgroup: 0 | 1 | 2;
  isMine: boolean;
  note: string | null;
}
interface WatchDayBlock {
  dateISO: string;
  dayOfWeek: number; // 0..6 (JS)
  dayOfMonth: number;
  month: number; // 0..11
  weekNumber: number; // 1..4 учебная неделя цикла
  lessons: WatchLesson[];
  holidayName: string | null;
}
interface WatchSnapshot {
  version: 1;
  groupName: string;
  generatedAt: string; // ISO
  currentWeek: 1 | 2 | 3 | 4;
  theme: 'light' | 'dark';
  subgroup: 0 | 1 | 2;
  locale: 'ru' | 'en' | 'be';
  strings: WatchStrings; // локализованные подписи (дни, месяцы, «нет пар», «сегодня», «неделя», …)
  days: WatchDayBlock[]; // отсортированы по дате, только дни с парами? нет — все дни окна, пустые тоже (для листания)
}
```

Переиспользуем `flattenSchedule`, `getLessonAccentColor`, `findHolidayName`, `buildLessonBlockId`,
логику подгруппы (`isMine`) — ровно как в `widgetData.ts`, чтобы поведение совпадало 1:1.

## 3. Транспорт (WatchConnectivity)

- Телефон: при каждом обновлении снапшота (те же триггеры, что и у виджета) кодирует
  `WatchSnapshot` в JSON и вызывает `WCSession.updateApplicationContext` (latest-state-wins —
  идеальная семантика «текущее расписание»). Если payload крупный (> ~60 KB) — фолбэк на
  `transferFile`/`transferUserInfo`. Проверить реальный размер 4-недельного окна на этапе 4.
- Часы: `WCSessionDelegate.didReceiveApplicationContext` → сохраняют JSON в App-Group
  `UserDefaults` (ключ `watchSnapshot`) и обновляют UI. При старте читают последнее сохранённое.

## 4. Фолбэк в API (упрощённый)

Основной сценарий — кэшированный снапшот (окно 4 недели, устаревает редко). Фолбэк нужен когда:
(а) часы ещё ни разу не спарены с телефоном, или (б) `generatedAt` старше окна.

- Если известен последний `groupName` (из кэша) и есть сеть: часы сами дёргают
  `GET /schedule/current-week` + `GET /schedule?studentGroup=<group>` и делают **минимальную**
  нормализацию — только «сегодня + ближайшее» (без полного раскрытия цикла на Swift).
- Если группа неизвестна (никогда не спарены): экран «Откройте приложение на iPhone».
- Индикатор устаревания: если данные старые — маленькая плашка «обновлено N дн. назад».

## 5. UI (SwiftUI, watchOS 10+)

- `TodayView` — стартовый экран: заголовок «группа · неделя N», список пар на сегодня
  (или «нет пар» / название праздника). Цвет типа занятия из `typeColorHex`.
- Навигация по дням: свайп/кнопки «‹ / ›» или `TabView(.page)` по дням окна; заголовок = дата + день недели.
- `LessonDetailView` — по тапу на пару: предмет, тип, время, аудитории, преподаватель, подгруппа, заметка.
- Тема (light/dark) — из снапшота (watchOS всегда тёмный физически, но цвета акцентов берём из данных).
- Пустые дни в окне листаются, показывают «нет пар».

## 6. Фазы и шаги (по коммиту на шаг)

**Фаза 0 — Основание**

- [ ] 0.1 `docs/plans/WATCH_PLAN.md` (этот файл). _commit: `docs(watch): plan for watchOS app`_

**Фаза 1 — Слой данных на телефоне (TS, без нативного кода)**

- [ ] 1.1 `src/services/watch/watchData.ts` — типы + `buildWatchSnapshot(...)` (окно 4 недели).
- [ ] 1.2 i18n: ключи `watch.*` в `src/i18n/{ru,en,be}.ts`.
      _Проверка: `npm run typecheck`, `npm run lint`._

**Фаза 2 — Локальный Expo-модуль `modules/watch-bridge` (сторона телефона)**

- [ ] 2.1 Скелет модуля: `expo-module.config.json`, `package.json`, `index.ts`
      (`isSupported()`, `isPaired()`, `sendContext(json: string)`).
- [ ] 2.2 iOS Swift: `WCSession` делегат + `updateApplicationContext` (+ фолбэк transfer). Android/web — no-op.
- [ ] 2.3 Автолинк/сборка: подключить модуль, `npm run typecheck`.

**Фаза 3 — Watch-таргет (Swift) + config-plugin**

- [ ] 3.1 `targets/watch/` — модели (Codable зеркало `WatchSnapshot`), хранилище (App Group UserDefaults),
      WC-приёмник (`WKApplicationDelegate` + `WCSessionDelegate`).
- [ ] 3.2 `targets/watch/` — SwiftUI вью: `TodayView`, навигация по дням, `LessonDetailView`, локализация.
- [ ] 3.3 `targets/watch/` — API-фолбэк клиент (URLSession) + индикатор устаревания.
- [ ] 3.4 `plugins/withWatchApp.js` — создание watch-app таргета в pbxproj (Info.plist `WKApplication`,
      entitlements с App Group, «Embed Watch Content» в основной таргет, копирование Swift на каждый prebuild).
      Регистрация плагина в `app.json`. Ассеты иконки часов (минимальный AppIcon для сборки).
- [ ] 3.5 Верификация prebuild: `npx expo prebuild -p ios --clean` — убедиться, что pbxproj валиден и таргет создан.
      _(Swift компилируется только в Xcode у пользователя — я делаю code-review Swift.)_

**Фаза 4 — Связка телефон→часы end-to-end**

- [ ] 4.1 `src/services/watch/index.ts` — сборка снапшота из сторов, отправка через `watch-bridge`,
      подписки на изменения (default-группа, подгруппа, тема, локаль, blocked, праздники) — зеркало `widget/index.ts`.
- [ ] 4.2 Вызвать `updateWatchSnapshot()` рядом со всеми вызовами `updateWidgetSnapshot()`
      (загрузка расписания, `AppState → active`, prefetch, bootstrap).
      _Проверка: `npm run typecheck`, `npm run lint`; пользователь: prebuild + Xcode watch-scheme + симулятор._

**Фаза 5 — Полировка и документация**

- [ ] 5.1 Заметки в `README.md` / `CLAUDE.md` (watch-app, поток данных), обновить память проекта.
- [ ] 5.2 Финальный `npm run typecheck && npm run lint && npm run format`.

## 7. Верификация

- **TS-фазы (1, 2, 4):** `npm run typecheck`, `npm run lint` — гоняю сам.
- **Plugin (3.4/3.5):** `npx expo prebuild -p ios --clean` на уровне node — проверяю, что таргет
  корректно вписан в pbxproj (без Xcode).
- **Swift:** компилируется только в Xcode — я делаю ревью кода; финальный прогон на watch-симуляторе — пользователь.
- **E2E:** пользователь — `npx expo run:ios`, выбрать watch-scheme в Xcode, запустить paired-симулятор,
  проверить приём applicationContext и листание.

## 8. Отложено (отдельные будущие фазы)

- **Complications / WidgetKit на watchOS** (accessory на циферблате) — как «виджет на часах» в буквальном смысле.
- **EAS build + submit** watch-таргета: провижининг для `…​.watchkitapp`, схемы, `eas.json`.
  Провижининг-профили заводит владелец (как push/MR/merge).
- Регистрация bundle id часов и расшаривание App Group в Apple Developer — на владельце.
- Поиск/переключение произвольной группы и преподавателя на часах (сейчас — только закреплённая группа).
- Wear OS (Android-часы).

## 9. Риски / открытые вопросы

- pbxproj-хирургия для watch-app сложнее, чем для `.appex` виджета (нужна фаза «Embed Watch Content»,
  правильный `WKCompanionAppBundleIdentifier`, отдельная схема). Митигируется зеркалированием `withWidget.js`
  и проверкой через `expo prebuild`.
- Размер payload `updateApplicationContext` для 4 недель — проверить на этапе 4, при необходимости `transferFile`.
- Иконка часов: Xcode требует AppIcon для запуска — заложить минимальный набор в ассеты часов.
- Swift-код не собирается в этом окружении → полноценная проверка сборки на стороне пользователя.
