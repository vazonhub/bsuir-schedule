# WATCH_PLAN.md — Apple Watch companion для «Bsuir Time»

Инвестигейт и план реализации приложения-компаньона для Apple Watch.

Дата: 2026-07-16. Ветка: `feature/apple-watch-app`.

---

## 0. TL;DR

- watchOS-приложение — **нативный SwiftUI-таргет** (RN на часах не существует), добавляется через config-plugin `./plugins/withWatch.js` по образцу `withWidget.js` (проект managed/CNG — руками `ios/` не трогаем).
- **Ключевой факт:** App Group **не** синхронизируется iPhone ↔ Apple Watch. Нужен явный транспорт снапшота на часы.
- **Данные не пересчитываем на часах.** Переиспользуем готовый контракт `WidgetSnapshot` (уже есть JSON + Swift `Codable` в `ScheduleWidget.swift`). Часы = «декодировать и показать», как это уже делают accessory-виджеты.
- **Транспорт — 2 кандидата** (детально в §3):
  - **A. iCloud KV** через уже вынесенный `expo-icloud-kv` → минимум нового кода, ноль нового RN-glue, работает cross-device. Задержка до минут. → **рекомендую как v1.**
  - **B. WatchConnectivity** → мгновенно, но требует новый нативный модуль на обе стороны. → **v2 + новый пакет `expo-watch-connectivity`** (отлично ложится в EXTRACTION_PLAN как пакет №10).
- **Функционал v1:** экран «Сегодня/Следующая пара», превью «Завтра», индикатор недели (1..4), + **осложнения (complications)** через WidgetKit accessory-семейства (переиспользуем `snapshot.upcoming`).
- **Побочный профит для библиотек:** `withWatch.js` → кандидат в `expo-watchos-scaffold`; транспорт B → `expo-watch-connectivity`. Оба закрывают реальные дыры в Expo-экосистеме.

---

## 1. Что уже есть (фундамент)

Полный разбор пайплайна данных — актуален и переиспользуется целиком.

```
Zustand stores → buildWidgetSnapshot()  src/services/widget/widgetData.ts
  → writeSnapshot()  src/services/widget/index.ts
      SharedGroupPreferences.setItem('widgetSnapshot', snapshot, 'group.by.vazon.bsuirschedule')
  → reloadAllTimelines()  (expo-widgetkit-bridge)
  → Swift loadSnapshot() → JSONDecoder → WidgetSnapshot → SwiftUI
      targets/widget/ScheduleWidget.swift
```

Что переиспользуем «как есть»:

| Актив | Где | Роль для часов |
|-------|-----|----------------|
| `WidgetSnapshot` JSON-контракт | `src/services/widget/widgetData.ts:70-84` | единый источник правды, ничего нового не изобретаем |
| Swift `Codable` структуры | `ScheduleWidget.swift:7-61` | **выносим в общий файл**, компилим в widget + watch + watch-complication |
| Accessory-виджеты (читают `snapshot.upcoming`) | `ScheduleWidget.swift:732-806` | почти 1:1 = осложнения на watchOS |
| Stale-date fallback (сверка `today.dateISO` с реальной датой) | `ScheduleWidget.swift:278-343` | обязателен на часах: снапшот может прийти вчерашний |
| `typeColorHex`, `isMine`, `blockId`, `strings` | внутри снапшота | цвета/фильтр подгруппы/deep-link/локализация — уже посчитаны |
| config-plugin как способ добавить нативный таргет | `plugins/withWidget.js` (395 стр.) | **шаблон** для `withWatch.js` |

Важные детали контракта (не потерять при реализации на Swift):
- Даты **локальные, собраны руками** (`toDateISO` widgetData.ts:122-127; Swift `isoString` ScheduleWidget.swift:337-343) — не UTC.
- `subgroup: 0|1|2`, `isMine` уже учитывает выбранную подгруппу.
- Экзаменационная сессия: обычные пары вырезаны, только экзамены (widgetData.ts:157-162).
- `currentWeek: 1..4` — циклические 4 недели.
- Все UI-строки (ru/en/be) лежат в `snapshot.strings` — локализацию на часах **не дублируем**.

---

## 2. Почему нативный таргет и как он вплетается

- RN/Expo на watchOS **нет** — весь watch-код это SwiftUI/WidgetKit.
- Проект — **managed / CNG**: `ios/` и `android/` в `.gitignore`, генерятся `expo prebuild`. Источник правды — `app.json` + `plugins/` + `targets/`.
- Значит watch-таргет добавляем **только** config-plugin'ом, как виджет. `@bacons/apple-targets` в проекте **не** установлен (файл `targets/widget/expo-target.config.js` — рудимент, не вводит в заблуждение), всё делает ручной `withWidget.js`.

### `./plugins/withWatch.js` (по образцу `withWidget.js`)

Должен на каждом prebuild:
1. Скопировать Swift-исходники из `targets/watch/` → `ios/BsuirTimeWatch/` (как widget копирует `ScheduleWidget.swift`, withWidget.js:31-34).
2. Собрать PBX-таргеты:
   - **Watch App** — product type `com.apple.product-type.application` (современный single-target watch app, watchOS 9+), `WKApplication = YES` в Info.plist. (Старую схему watchapp2 + extension не используем — deprecated.)
   - **Watch Widget Extension** — отдельный app-extension внутри watch app для осложнений (WidgetKit).
3. Прописать связи Info.plist:
   - `WKCompanionAppBundleIdentifier = by.vazon.bsuirschedule` (в watch app),
   - bundle id watch app = `by.vazon.bsuirschedule.watchkitapp`,
   - bundle id watch widget = `by.vazon.bsuirschedule.watchkitapp.widget`.
4. Copy-files phase «Embed Watch Content» на main app (dstSubfolderSpec 16).
5. `WATCHOS_DEPLOYMENT_TARGET = 9.0` (WidgetKit-осложнения требуют watchOS 9; `expo-build-properties` покрывает только iOS — задаём вручную в плагине).
6. Entitlements watch-таргета под выбранный транспорт (см. §3): App Group и/или `ubiquity-kvstore-identifier`.
7. Переиспользовать патч Podfile `CODE_SIGNING_ALLOWED=NO` для `*-privacy` bundles (withWidget.js:359-390).

### `app.json`
- Добавить `./plugins/withWatch` в массив plugins.
- Добавить запись в `extra.eas.build.experimental.ios.appExtensions` (app.json:229-251) для watch app + watch widget (targetName, bundle id, entitlements) — иначе EAS не выпустит provisioning profiles.

### Общий Swift-код
Рефактор: вынести `WidgetSnapshot`/`WidgetLesson`/… из `ScheduleWidget.swift` в `targets/shared/WidgetSnapshotModel.swift`, подключить в оба виджета и watch-таргеты. Один контракт — три потребителя.

---

## 3. Транспорт данных phone → watch (главное решение)

App Group общий у iPhone-приложения и его расширений **на одном устройстве**. Часы — отдельное устройство, контейнер App Group туда **не** синхронизируется. Варианты:

### Вариант A — iCloud KV (`expo-icloud-kv`) ✅ рекомендую для v1

Идея: телефон уже умеет писать в `NSUbiquitousKeyValueStore` (пакет `expo-icloud-kv` уже стоит, `^0.1.2`). Часы читают тот же `NSUbiquitousKeyValueStore` нативно (доступен на watchOS 2+) и подписываются на `didChangeExternallyNotification`.

- **Новый код на телефоне:** ~1 строка — в `updateWidgetSnapshot()` дополнительно `ICloudKV.setItem('widgetSnapshot', JSON.stringify(snapshot))`.
- **Новый код на часах:** маленький Swift-ридер + наблюдатель нотификации → пишет в свой storage → `WidgetCenter.shared.reloadAllTimelines()`.
- **Entitlement:** добавить `com.apple.developer.ubiquity-kvstore-identifier` на watch-таргет (сейчас `expo-icloud-kv` вешает его только на main app).
- **Плюсы:** максимум переиспользования уже вынесенной библиотеки; ноль нового RN-нативного glue; работает cross-device даже когда часы далеко от телефона (обоим нужен интернет + iCloud).
- **Минусы:** задержка синхронизации до нескольких минут (Apple не гарантирует мгновенность); лимит 1 MB на весь KV-стор; нужен вход в iCloud.
- **Почему ок:** снапшот ~5–15 KB (фото — это URL, не блобы) → в лимит влезаем с запасом. Расписание меняется редко; а `today/next` часы всё равно **пересчитывают локально** через stale-date fallback, так что задержка iCloud не критична.

### Вариант B — WatchConnectivity (WCSession) → v2 + новый пакет

Идея: телефон пушит снапшот через `WCSession.updateApplicationContext` (коалесцируется до «последнего состояния» — ровно семантика снапшота). Часы получают, пишут в свой App Group, релоадят осложнения.

- **Новый код:** полноценный Expo-модуль (Swift WCSession delegate на телефоне + JS-фасад) + WCSession delegate на часах.
- **Плюсы:** мгновенная доставка когда часы рядом; `applicationContext` отдаётся при следующем пробуждении часов даже офлайн; батарейно-дружелюбно.
- **Минусы:** заметно больше работы; часы должны быть спарены/приложение установлено.
- **Библиотечный профит:** живого Expo-WatchConnectivity-пакета нет → `expo-watch-connectivity` = сильный кандидат №10 в EXTRACTION_PLAN.

### Вариант C — часы сами ходят в API

`iis.bsuir.by/api/v1` публичный, watchOS умеет `URLSession`. Но: часам всё равно нужно узнать *какая группа закреплена* (это только через A или B), плюс пришлось бы дублировать всю нормализацию на Swift. → **не берём** (кроме, опционально, догрузки фото преподавателей по URL из снапшота).

### Рекомендация

**v1 = A (iCloud KV)** — быстро, максимум переиспользования, cross-device из коробки.
**v2 = добавить B (WatchConnectivity)** как приоритетный канал для мгновенных обновлений, оформив его новым пакетом `expo-watch-connectivity`. A остаётся резервным каналом (работает, когда телефон недоступен, но есть интернет).

Итог — слоёная модель: WC когда телефон рядом, iCloud KV как fallback, локальный stale-date пересчёт всегда.

---

## 4. Функционал на часах

### 4.1 Watch App (SwiftUI)
- **Экран «Сейчас/Следующая»** (главный): крупная карточка — идёт ли пара сейчас (`upcoming.isOngoing`) или следующая; предмет, время, тип (цвет `typeColorHex`), аудитория, инициалы преподавателя, бейдж подгруппы. Строки — из `snapshot.strings` (`now`/`next`/`allDone`/`noClasses`).
- **Список «Сегодня»**: пары дня (`today.lessons`, фильтр `isMine`), прошедшие приглушены. Пусто → `strings.noClasses`/`allDone` + название праздника (`holidayName`).
- **«Завтра/следующий день»**: `nextDay` превью (сколько пар, во сколько первая).
- **Хедер**: группа (`groupName`) + неделя (`strings.weekLabel` + `currentWeek`).
- Навигация — Digital Crown-скролл; тап по паре → (опц.) детали.

### 4.2 Complications (WidgetKit accessory-семейства на watchOS 9+)
Переиспускают `snapshot.upcoming` — те же данные, что iOS accessory-виджеты уже рендерят:
- `accessoryCircular` — время следующей пары + кольцо цвета типа.
- `accessoryRectangular` — предмет + время + аудитория.
- `accessoryInline` — «МСиСвИТ · 10:00».
- `accessoryCorner` — watch-специфичное, компактно.
- **Smart Stack relevance / таймлайн**: точки обновления на start/end каждой пары — логика уже есть в `buildEntry` (ScheduleWidget.swift:278-335), переносим.

### 4.3 Обновление и свежесть
- Пуш при каждом `updateWidgetSnapshot()` (после загрузки расписания, смены подгруппы/языка/темы, blocked lessons, background fetch).
- Часы пишут снапшот в свой storage → `WidgetCenter.shared.reloadAllTimelines()`.
- **Всегда** локальный stale-date fallback: сверять `today.dateISO`/`nextDay.dateISO` с реальной датой часов (как виджет), чтобы после полуночи осложнения оставались верными без свежего пуша.
- `WKApplicationRefreshBackgroundTask` на часах — периодический релоад осложнений.

---

## 4a. Статус реализации

- ✅ **Фаза 0 — каркас (сделано).** watchOS app target добавлен через `plugins/withWatch.js`.
  - `targets/watch/` — `BsuirWatchApp.swift` (@main), `ContentView.swift` (placeholder), `SnapshotModel.swift` (Codable-контракт).
  - `plugins/withWatch.js` — генерит PBX-таргет `BsuirWatch` (product-type application, `SDKROOT=watchos`, `WATCHOS_DEPLOYMENT_TARGET=9.0`, `TARGETED_DEVICE_FAMILY=4`, bundle id `by.vazon.bsuirschedule.watchkitapp`), Info.plist с `WKApplication`/`WKCompanionAppBundleIdentifier`, entitlements (App Group + `ubiquity-kvstore-identifier`), Embed Watch Content copy-phase, target dependency.
  - `app.json` — плагин зарегистрирован; добавлена запись `BsuirWatch` в EAS `appExtensions`.
  - **Watch widget extension (осложнения) сознательно отложен на Фазу 3** — Фаза 0 = только app target, чтобы не тащить вложенные таргеты раньше времени.
  - **Проверено:** `expo prebuild -p ios --clean --no-install` проходит; pbxproj парсится; присутствуют 3 таргета (BsuirTime / BsuirWatch / ScheduleWidget), виджет цел, все 3 swift-файла в Sources, entitlements корректны.
  - **Осталось проверить руками:** реальная сборка/запуск в watchOS-симуляторе (`npm run ios:build`, требует `pod install` + Xcode с watchOS SDK).

- ✅ **Фаза 1 — транспорт iCloud KV (сделано).**
  - Телефон: `src/services/widget/index.ts` → `writeSnapshot()` дополнительно пишет снапшот в iCloud KV (`ICloudKV.setItem('widgetSnapshot', JSON.stringify(snapshot))`), best-effort, не ломает виджет при отсутствии iCloud.
  - Часы: `targets/watch/SnapshotStore.swift` — `ObservableObject`, читает `NSUbiquitousKeyValueStore`, подписан на `didChangeExternallyNotification`, кэширует в App Group UserDefaults часов, публикует `snapshot`, дёргает `WidgetCenter.reloadAllTimelines()` (no-op до Фазы 3).
  - UI: `ContentView.swift` рендерит реальные данные (группа + неделя + пары на сегодня, цвет типа из `typeColorHex`), empty-state когда снапшота ещё нет; `BsuirWatchApp` держит `SnapshotStore` через `@StateObject` + `environmentObject`.
  - **Проверено:** `npm run typecheck` — чисто; lint изменённого файла — новых замечаний нет; `expo prebuild` — все 4 swift-файла попадают в Sources watch-таргета, граф цел.
  - **Осталось проверить руками:** реальная сквозная синхронизация phone → watch (нужны устройства/симуляторы с одним iCloud-аккаунтом и входом в iCloud).

- ✅ **Фаза 2 — watch UI (сделано).**
  - `LessonSupport.swift` — чистая логика: локальный расчёт времени (`nowMinutes`/`parseMinutes`), `phase()` (past/ongoing/upcoming), `heroSelection()` (сейчас → следующая сегодня → первая на nextDay), `myLessons()` (фильтр `isMine`), `dayLabel()`, `Color(hex:)`.
  - `NowNextCard.swift` — hero «Сейчас/Далее»: тип-бейдж с цветом, подгруппа, аудитории, преподаватель; ярлык `strings.now`/`next` + дата если завтра.
  - `LessonRow.swift` — строка пары (цветовой rail, время, бейдж подгруппы, аудитории), прошедшие приглушены.
  - `DayView.swift` — полный список дня + `NextDayRow` (дата · кол-во · первая пара) с переходом.
  - `ContentView.swift` — `HomeView`: hero + неделя (footer) + сегодня (заголовок = дата, past dimmed) + ссылка на следующий день; empty-state до первой синхронизации.
  - **«Сейчас/Далее» считается локально по текущему времени** (снапшот может быть построен часами ранее). Полноценный stale-date fallback (если `today.dateISO` ≠ реальной дате) — Фаза 4.
  - **Проверено:** `swiftc -parse` — без синтаксических ошибок; **полный `swiftc -typecheck` против watchOS SDK (`arm64-apple-watchos9.0-simulator`) — 0 ошибок, 0 предупреждений**; `expo prebuild` — все 8 swift-файлов в Sources watch-таргета, граф цел.

- ✅ **Фаза 3 — осложнения / complications (сделано).**
  - `targets/watch-widget/ScheduleComplication.swift` — WidgetKit accessory-семейства (`accessoryCircular`/`accessoryRectangular`/`accessoryInline`/`accessoryCorner`), `WidgetBundle` @main, `TimelineProvider` с точками обновления на start/end пар, чтение снапшота из App Group часов, переиспользование `heroSelection()` для «сейчас/следующая».
  - `plugins/withWatch.js` переписан: теперь создаёт **два** таргета — watch app (`BsuirWatch`) и widget extension (`BsuirWatchWidget`, product-type app-extension, watchos, bundle id `…watchkitapp.widget`), вложенный в watch app (Embed App Extensions, spec 13). Вынесены хелперы (`makeConfigList`/`makeSourcesPhase`/`embedProduct`/`addDependency`), гварды по каждому таргету отдельно.
  - **Общие файлы `SnapshotModel.swift` + `LessonSupport.swift` компилятся в оба таргета** (один fileRef, два build-file) — без дублирования.
  - `app.json` — добавлена запись `BsuirWatchWidget` в EAS `appExtensions`.
  - **Проверено:** `swiftc -typecheck` виджет-сорсов (widget + shared) против watchOS SDK — 0 ошибок/0 предупреждений; `expo prebuild` — 4 таргета, виджет вложен в watch app (spec 13), `BsuirWatch.app` в main (spec 16), `ScheduleWidget` цел, shared-файлы в обоих таргетах, pbxproj парсится.

- ✅ **Фаза 4 — свежесть/фон (сделано).**
  - **Stale-date fallback** (`LessonSupport.swift`): `currentDateISO()` + `resolvedDays()` сверяют `today.dateISO`/`nextDay.dateISO` с реальной датой часов; после полуночи `nextDay`→`today` автоматически. `heroSelection(_, at: Date)` теперь учитывает и время, и дату. Общий код для UI и осложнений.
  - **UI** (`ContentView.swift`): использует resolved-дни; отдельное состояние «данные устарели» когда снапшот не описывает реальный сегодня; заголовок дня из даты при отсутствии блока. `onChange(scenePhase)`: `.active` → `store.reload()`, `.background` → `scheduleWatchRefresh()`.
  - **Фон** (`SnapshotStore.swift` + `BsuirWatchApp.swift`): `syncFromCloudToLocal()` (iCloud→App Group, безопасно из фона), `scheduleWatchRefresh()` через `WKApplication.scheduleBackgroundRefresh`, обработчик `.backgroundTask(.appRefresh)` — тянет данные, релоадит осложнения, перепланирует себя.
  - **Осложнения** (`ScheduleComplication.swift`): таймлайн-границы и `heroSelection` считаются от resolved-дня.
  - **Проверено:** `swiftc -typecheck` обоих target-сетов против watchOS SDK — **0 ошибок/0 предупреждений**; `expo prebuild` — 4 таргета, sources 8/3, граф цел.

## 5. Фазы реализации

| Фаза | Содержание | DoD |
|------|-----------|-----|
| **0. Каркас** | `withWatch.js` (PBX watch app + watch widget ext), `targets/watch/`, вынос общих Swift-моделей в `targets/shared/`, запись в `app.json` + EAS appExtensions | `expo prebuild` собирает watch-таргет, пустой SwiftUI-экран запускается в симуляторе |
| **1. Транспорт A** | watch-ридер `NSUbiquitousKeyValueStore` + наблюдатель; телефон пишет снапшот в iCloud KV; entitlement KV на watch | на часах появляется реальный снапшот закреплённой группы |
| **2. Watch App UI** | экраны Сейчас/Сегодня/Завтра + хедер недели, empty states, цвета типов, локализация из `strings` | полноценный экран расписания на часах |
| **3. Complications** | WidgetKit accessory-семейства из `snapshot.upcoming` + таймлайн-границы | осложнения на циферблате и в Smart Stack |
| **4. Свежесть/фон** | stale-date fallback, `WKApplicationRefreshBackgroundTask`, (опц.) догрузка фото по URL | корректно после полуночи и в фоне |
| **5. Релиз** | EAS provisioning для watch bundle id'ов, TestFlight, проверка на реальных часах | сборка в App Store Connect, работает на девайсе |
| **6 (v2). Транспорт B** | `expo-watch-connectivity` (Expo-модуль WCSession) как приоритетный канал; A → fallback | мгновенные апдейты когда часы рядом |

---

## 6. Подводные камни

- **App Group ≠ cross-device** — главный миф, из него растёт весь §3.
- **watchOS deployment target** — задать явно (9.0), `expo-build-properties` его не покрывает.
- **PBX-генерация watch app** — самая хрупкая часть (product types, embed phase, companion bundle id linking); юнит-тестировать генерацию, как советует EXTRACTION_PLAN для scaffold-плагинов.
- **EAS credentials** — три bundle id (app / watch app / watch widget), каждому profile; забудешь запись в `appExtensions` — билд упадёт.
- **iCloud KV лимит 1 MB** — снапшот маленький, но не пихать в KV блобы фото; фото только по URL, догрузка на часах опционально.
- **iCloud KV задержка** — минуты; компенсируется локальным пересчётом today/next.
- **Фото преподавателей** — на маленьком экране часов, вероятно, лишнее; для v1 можно инициалы (`teacher`), фото — потом.

---

## 7. Связь с EXTRACTION_PLAN (библиотечный профит)

- `withWatch.js` → кандидат в **`expo-watchos-scaffold`** (в пару к запланированному №4 `expo-ios-widget-scaffold`): generic config-plugin, добавляющий watch app + watch widget target. Реальная дыра в Expo.
- Транспорт B → **`expo-watch-connectivity`** (пакет №10): живых Expo-обёрток над WCSession нет.
- Транспорт A подтверждает ценность уже вынесенного **`expo-icloud-kv`** (cross-device как killer-feature, ровно как в плане §2).

---

## 8. Зафиксированные решения (2026-07-16)

1. **Транспорт v1 = iCloud KV** (`expo-icloud-kv`). WatchConnectivity — v2.
2. **Скоуп v1 = полноценный watch app + осложнения.** Экраны Сейчас/Сегодня/Завтра + complications.
3. **Оформление = сначала app-internal.** `withWatch.js` живёт в `plugins/`, watch-Swift в `targets/watch/`. Вынос в `expo-watchos-scaffold` / `expo-watch-connectivity` — отдельной фазой EXTRACTION_PLAN позже, когда стабилизируется.
4. **Фото преподавателей** — для v1 инициалы (`teacher`); фото по URL — опционально позже.

### Что это значит для фаз §5
- Фаза 6 (WatchConnectivity) → отложена в v2.
- Фазы 0–5 идут как есть, весь код — внутри репозитория приложения (`plugins/`, `targets/`), без публикации пакетов.
- Entitlement `com.apple.developer.ubiquity-kvstore-identifier` нужно добавить на watch-таргет (сейчас `expo-icloud-kv` вешает его только на main app) — делаем прямо в `withWatch.js`.
