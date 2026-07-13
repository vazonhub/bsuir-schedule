# План выноса нативного кода в React Native / Expo библиотеки

Документ фиксирует всё, что сейчас лежит в проекте как Swift / Kotlin / Objective-C + сопутствующие Expo config plugins, и оценивает каждый кусок как кандидата на вынос в отдельную библиотеку.

Составлено на основе полной ревизии директорий: `modules/`, `ios-native/`, `targets/`, `plugins/`, `ios/BsuirTime/*.swift|*.m`, `android/app/src/main/java/**`.

Дата: 2026-07-08. Ветка: `master`.

**План действий:** 9 отдельных репозиториев, по одному на пакет, папки рядом с `bsuir-schedule/`. Идём по порядку сверху вниз — каждая следующая либа слабее предыдущей по «крутости × универсальности × востребованности сообществом».

---

## 0. TL;DR — рейтинг от лучшего к худшему

| # | Пакет | iOS | Android | LOC (нативные) | Крутость | Комментарий |
|---|-------|-----|---------|----------------|----------|-------------|
| 1 | **`expo-widgetkit-bridge`** — force-reload WidgetKit timelines | ✅ Swift | — | ~17 | ★★★★★ | Идеальный первый пакет: маленький, generic, любому нужен, аналогов на npm нормальных нет |
| 2 | **`expo-icloud-kv`** — key/value через `NSUbiquitousKeyValueStore` | ✅ Swift | — | ~31 | ★★★★★ | Стандартный iOS API, но чистой RN-обёртки нет. Cross-device sync = киллер-фича |
| 3 | **`expo-accessibility-plus`** — расширенный AccessibilityInfo | ✅ Swift (Expo Module) | ⚠️ добавить | ~37 → расширить | ★★★★☆ | Стандартный `AccessibilityInfo` из RN не покрывает половину настроек — реальный дефицит |
| 4 | **`expo-ios-widget-scaffold`** — generic-плагин для iOS-виджетов | ✅ config plugin | — | ~390 JS | ★★★★☆ | Есть `expo-target`, но наш patcher code-signing + sync версий полезен всем, кто делает виджет |
| 5 | **`expo-alt-app-icons`** — переключение иконок iOS | ✅ config plugin | — | ~60 JS | ★★★☆☆ | Тривиально, но `expo-dynamic-app-icon` / `expo-alternate-app-icons` уже есть. Наш проще/чище — стоит опубликовать как альтернативу |
| 6 | **`expo-unity-ads`** (core + banner) — интеграция Unity Ads | ✅ Swift | ✅ Kotlin | ~130 | ★★★☆☆ | Ниша (только для тех, кто на Unity Ads), но там реально нет живых RN-либ |
| 7 | **`expo-storekit-config`** — генерация `.storekit` файла | ✅ config plugin | — | ~JS | ★★☆☆☆ | Полезно для локального тестирования IAP, но узкое применение |
| 8 | **`expo-android-accent-color`** — `colorAccent` в темах | — | ✅ config plugin | ~JS | ★★☆☆☆ | Однострочный, скорее «utility gist» чем полноценный пакет |
| 9 | **`expo-android-widget-layouts`** — patch XML для `react-native-android-widget` | — | ✅ config plugin | ~JS | ★☆☆☆☆ | Слишком специфично для нашего проекта. **По-хорошему не выносить**, а рефакторить/PR-ить в исходную либу |

**Всего:** 9 репозиториев. Реалистично публиковать первые 6, №7-8 — по желанию, №9 — скорее нет.

---

## Стандарт репозитория (единый для всех 9 пакетов)

Каждый репозиторий должен быть оформлен по одному шаблону, чтобы:
- в первом (`expo-widgetkit-bridge`) отработали структуру и CI,
- в остальных 8 просто копировали и подгоняли.

### Структура репозитория

```
expo-<name>/
├── src/
│   └── index.ts                    # TS-фасад
├── ios/
│   ├── <Name>Module.swift          # Expo Module
│   └── <Name>.podspec
├── android/
│   ├── build.gradle
│   └── src/main/java/expo/modules/<name>/<Name>Module.kt
├── plugin/                         # если нужен config plugin
│   ├── src/withPlugin.ts
│   └── build/                      # компилированный JS для дистрибуции
├── example/                        # standalone Expo app для тестов
│   ├── app.json
│   ├── App.tsx
│   └── package.json
├── expo-module.config.json
├── package.json
├── tsconfig.json
├── README.md
├── CHANGELOG.md
├── LICENSE                         # MIT
└── .github/
    └── workflows/
        ├── ci.yml
        ├── release.yml
        └── example-build.yml
```

### README.md (обязательный минимум)

Стиль — по образцу `kostyabet/VSCode-FASM-ext`: заголовок с маленькой иконкой, набор static-бейджей, короткий тэглайн в `<h3>`, буллеты с бэктиками и вложенными скриншотами, `> ` blockquotes для примечаний к JSON-примерам, ссылка на GitHub и лицензию, финальная строчка «star our repo please».

Секции по порядку:

1. **Заголовок + иконка** — `# expo-<name>` + маленький логотип (`<img … width="50">`).
2. **Бейджи** — static badges для: npm version, npm downloads, CI status, license (MIT), platform (iOS 14+, Android 21+), Expo SDK (54+).
3. **Тэглайн** — одна строка в `<h3>` c описанием и ссылками на upstream (например, WidgetKit → Apple docs, Unity Ads → dashboard).
4. **Preview** — скриншот / GIF (для UI-либ) или короткий сниппет кода (для plumbing-либ).
5. **Features** — буллеты с бэктиковой подсветкой ключевых слов, вложенные под-буллеты для деталей.
6. **Installation**:
   ```bash
   npx expo install expo-<name>
   ```
7. **Setup** — вставка в `app.json` для config plugin, с blockquote-пояснениями каждого параметра (как в FASM README к `assemblerPath`/`includePath`).
8. **Usage** — минимальный JS/TS-сниппет использования.
9. **API reference** — таблица методов/событий/пропсов с типами.
10. **Requirements** — min iOS / min Android / min Expo SDK.
11. **How it works** — 1-2 абзаца, что делает под капотом (какие Apple/Android API дергает, какие entitlements просит).
12. **Contributing** — команды для запуска `example/`.
13. **Source code** — ссылка на GitHub repo.
14. **License** — ссылка на `LICENSE` (MIT).
15. **Support** — «Press star on the repo please!»

### CI/CD (`.github/workflows/`)

**`ci.yml`** — на каждый PR / push в `main`:
- Setup Node 20, cache npm.
- `npm ci` в корне и в `example/`.
- `npm run lint` (ESLint + Prettier check).
- `npm run typecheck` (tsc --noEmit).
- `npm run test` (Jest, если применимо).
- Build config plugin (`tsc -p plugin`).
- Smoke build `example/` (Expo prebuild + gradle assembleDebug для Android; для iOS хотя бы `pod install` + `xcodebuild -workspace ... build` в отдельном job на macOS runner).

**`release.yml`** — публикация новой версии **строго по push тега** `v*` (semver: `v0.1.0`, `v1.2.3` и т.д.):
```yaml
on:
  push:
    tags:
      - 'v*'
```
- Никаких других триггеров (`workflow_dispatch` — только опционально для ручного дожатия, но нормальный релиз = только тег).
- Внутри: lint → typecheck → build → `npm publish --provenance --access public` c `NPM_TOKEN` из GitHub Secrets.
- Автогенерация GitHub Release из `CHANGELOG.md` (`softprops/action-gh-release@v2` с `generate_release_notes: true`).
- Version в `package.json` **должна совпадать** с тегом без префикса `v` — иначе `npm publish` откажется.
- Флоу для каждого релиза:
  1. Обновить `CHANGELOG.md`, bump `version` в `package.json`.
  2. Коммит `chore: release vX.Y.Z`.
  3. `git tag vX.Y.Z && git push --follow-tags`.
  4. Дальше GitHub Actions сам всё делает.
- (Опционально в будущем) `changesets` для автоматизации bump и changelog.

**`example-build.yml`** — раз в неделю на `schedule`:
- Собрать `example/` с последним Expo SDK — регресс-тест на обновления Expo.

### Prettier / ESLint / TS
- Общий пресет: `@expo/eslint-config` + Prettier. Хранить в repo template.
- `tsconfig.json` — strict, `noUncheckedIndexedAccess`.
- Экспорт типов через `types` в `package.json`.

### package.json ключевое
```json
{
  "name": "expo-<name>",
  "version": "0.1.0",
  "main": "build/index.js",
  "types": "build/index.d.ts",
  "files": ["build", "ios", "android", "plugin/build", "app.plugin.js", "expo-module.config.json"],
  "scripts": {
    "build": "expo-module build",
    "clean": "expo-module clean",
    "lint": "expo-module lint",
    "test": "expo-module test",
    "prepare": "expo-module prepare",
    "prepublishOnly": "expo-module prepublishOnly",
    "expo-module": "expo-module"
  },
  "peerDependencies": { "expo": "*", "react": "*", "react-native": "*" }
}
```

### Версионирование
- Semver. Начинаем с `0.1.0` (pre-1.0, breaking OK).
- Тегируем в git, релиз через GitHub Actions.
- CHANGELOG в формате [Keep a Changelog](https://keepachangelog.com/).

### Namespace
Предложение: **`expo-*`** без scope. Публикуем открыто в npm, лицензия MIT. Если понадобится приватность или брендинг — `@vazon/expo-*`, но это менее discoverable для комьюнити.

### Первый пакет = шаблон
Делаем `expo-widgetkit-bridge` максимально идиоматично — с идеальным README, полным CI, работающим `example/`. Дальше `git clone` + переименовывание для остальных 8.

---

## 1. `expo-widgetkit-bridge` ★★★★★

**Первый пакет. Шаблон для всех остальных.**

**GitHub description (EN):**
> Reload iOS home & lock screen widgets from React Native / Expo. A one-call bridge to WidgetKit's `reloadAllTimelines` and `reloadTimelines(ofKind:)`.

### Что делает
Позволяет из JS дёрнуть `WidgetCenter.shared.reloadAllTimelines()` — принудительный рефреш всех виджетов на Home / Lock Screen после обновления данных в приложении.

### Что где лежит сейчас
- `ios-native/WidgetKitBridge.swift` — 17 строк, `@objc(WidgetKitBridge)` + `reloadAllTimelines()`.
- `ios-native/WidgetKitBridge.m` — Objective-C бридж (`RCT_EXTERN_MODULE`).
- `ios/BsuirTime/WidgetKitBridge.swift` — **дубликат** (заливается плагином).
- `plugins/withWidgetKitBridge.js` — копирует файлы в `ios/BsuirTime/`, добавляет их в PBXBuildFile / PBXSourcesBuildPhase, weak-linkает `WidgetKit.framework`.

### Публичный API (после рефакторинга)
```ts
import * as WidgetKit from 'expo-widgetkit-bridge';

WidgetKit.reloadAllTimelines();
WidgetKit.reloadTimelines(kind: string);      // рефреш конкретного виджета
WidgetKit.getCurrentConfigurations();          // список установленных виджетов
```

### Что переделать при выносе
- Переписать под **Expo Modules API** (`Function("reloadAllTimelines")`) — уходим от ручного `.m`-бриджа и dangerous mod.
- Проверка `@available(iOS 14.0, *)` — оставить, iOS 14+.
- Config plugin не нужен вообще.

### Зависимости от текущего приложения
**Нет.** Полностью generic.

### Почему №1
- Меньше всего кода (~17 LOC).
- Ноль параметров, ноль конфигурации.
- Универсально нужен всем, у кого есть виджет.
- Отработаем на нём весь скелет (структура репо, CI, README, релиз-workflow), дальше — copy-paste.

---

## 2. `expo-icloud-kv` ★★★★★

**GitHub description (EN):**
> Async key/value storage for React Native / Expo backed by iCloud (`NSUbiquitousKeyValueStore`) — sync small pieces of app state across a user's Apple devices with a Promise-based API.

### Что делает
Async key/value storage поверх `NSUbiquitousKeyValueStore` — данные (закреплённые группы, преподаватели, настройки) синхронизируются между устройствами пользователя через iCloud.

### Что где лежит сейчас
- `ios/BsuirTime/ICloudKVStore.swift` — 31 строка, promise-based `getItem` / `setItem` / `removeItem` / `getAllKeys`.
- `ios/BsuirTime/ICloudKVStore.m` — RCT bridge.
- `plugins/withICloudKVStore.js` — генерирует оба файла на лету, добавляет entitlement, патчит bridging header, регистрирует в Xcode.

### Публичный API (после рефакторинга)
```ts
await ICloudKV.getItem(key: string): string | null
await ICloudKV.setItem(key: string, value: string): void
await ICloudKV.removeItem(key: string): void
await ICloudKV.getAllKeys(): string[]
await ICloudKV.synchronize(): boolean
ICloudKV.addListener('onExternalChange', ({ keys, reason }) => {...})
```

### Что переделать при выносе
- Переписать на **Expo Modules API**. Убрать плагин, который генерирует файлы наружу — модуль сам поставит себя через `podspec`.
- **Отдельный маленький config plugin** только для entitlement `com.apple.developer.ubiquity-kvstore-identifier`:
  ```json
  ["expo-icloud-kv", { "identifier": "$(TeamIdentifierPrefix)com.example.myapp" }]
  ```
- Добавить события `onExternalChange` через `NSUbiquitousKeyValueStore.didChangeExternallyNotification` — сейчас этого нет, но фича нужна.
- Ограничения iCloud KV (1 MB total, 1024 keys, 1 MB per value) — задокументировать в README.

### Почему №2
- iCloud sync — то, что 90% RN-разработчиков хотят, но не могут найти нормальную либу.
- Существующие альтернативы либо мёртвые, либо только на classic React Native без Expo config plugin.
- Значимый public value.

---

## 3. `expo-accessibility-plus` ★★★★☆

**GitHub description (EN):**
> Extended accessibility settings for React Native / Expo. Read and subscribe to system flags that stock `AccessibilityInfo` doesn't expose: differentiate-without-color, reduce transparency, bold text, invert colors, content size category and more.

### Что делает
Читает системные accessibility-настройки iOS, которые **стандартный** `AccessibilityInfo` из RN не отдаёт, и уведомляет JS об изменениях. Основная фишка сейчас — "Differentiate Without Color" (для дальтоников).

### Что где лежит сейчас
Единственный **уже правильно оформленный Expo Module** в проекте:
- `modules/accessibility-info/expo-module.config.json`
- `modules/accessibility-info/ios/AccessibilityInfoModule.swift` (37 LOC)
- `modules/accessibility-info/index.ts` — TS-фасад

### Публичный API (расширенный)
```ts
AccessibilityPlus.shouldDifferentiateWithoutColor(): boolean       // NEW в стандартном RN нет
AccessibilityPlus.isReduceMotionEnabled(): boolean
AccessibilityPlus.isReduceTransparencyEnabled(): boolean
AccessibilityPlus.isBoldTextEnabled(): boolean
AccessibilityPlus.isInvertColorsEnabled(): boolean
AccessibilityPlus.preferredContentSizeCategory(): string
// + события onChange для каждого
```

### Что переделать при выносе
- Уже готов на 90%. Только:
  - Расширить API до перечисленного выше — реально нужно всем UI-разработчикам.
  - Добавить Android-имплементацию для того, что имеет смысл (`isReduceMotionEnabled` через `Settings.Global.TRANSITION_ANIMATION_SCALE`, `isBoldTextEnabled` через `AccessibilityManager`).

### Почему №3
- Уже готов как Expo Module, минимум работы.
- Реально закрывает дырку в стандартном RN API.
- Универсально нужен.

---

## 4. `expo-ios-widget-scaffold` ★★★★☆

**GitHub description (EN):**
> Expo config plugin that wires a SwiftUI WidgetKit extension target into your app — App Group, entitlements, PBX build phases, version sync between app and widget, plus the CocoaPods code-signing fix. Zero manual Xcode work.

### Что делает
Config plugin, который создаёт Widget Extension таргет в Xcode для любого SwiftUI-виджета: генерирует Info.plist, entitlements, PBX build phases, dependency от main app, sync версий, патч Podfile для отключения code signing на CocoaPods-бандлах.

### Что где лежит сейчас
- `plugins/withWidget.js` (~390 LOC) — всё под капотом.
- `targets/widget/expo-target.config.js` — конфиг таргета.
- `targets/widget/ScheduleWidget.swift` — сам виджет (**остаётся в приложении**, не выносится).
- Дубликаты `ios/ScheduleWidget/*` генерируются плагином.

### Публичный API
```json
["expo-ios-widget-scaffold", {
  "name": "MyWidget",
  "sourceDir": "./ios-widget",
  "bundleIdSuffix": ".widget",
  "deploymentTarget": "15.1",
  "appGroup": "group.com.example.myapp",
  "frameworks": ["SwiftUI", "WidgetKit"]
}]
```

### Что переделать при выносе
- Извлечь только инфраструктуру, **сам SwiftUI-код виджета не трогаем** (он доменный).
- Параметризовать всё, что сейчас захардкожено (`by.vazon.bsuirschedule`, `group.by.vazon.bsuirschedule`, `.widget`, `15.1`).
- Проверить, не проще ли отправить PR в существующий `expo-target` от Bacons — он частично делает то же самое, но не патчит code signing CocoaPods-бандлов и не так надёжно синхронизирует версии.
- Юнит-тестировать генерацию PBX-объектов (это самая хрупкая часть).

### Почему №4
- Реально помогает всем, кто делает виджет: сейчас это боль.
- Наш патч code signing (`CODE_SIGNING_ALLOWED = 'NO'` для `*-privacy` bundles) — то, что регулярно ломает билды у людей, и мы её решили.
- Sync версий CFBundleShortVersionString / CFBundleVersion — обязательно для App Store Connect, все на этом попадаются.
- Минус: большая сложность извлечения (~400 LOC плагина, много Xcode internals).

---

## 5. `expo-alt-app-icons` ★★★☆☆

**GitHub description (EN):**
> Expo config plugin that registers iOS alternate app icons from a directory of PNGs. No runtime native code — just point it at a folder and switch icons at runtime with `expo-application`.

### Что делает
Копирует PNG-иконки из `assets/icons/*.png` в iOS app bundle и регистрирует их в `Info.plist` как `CFBundleAlternateIcons`. Далее из JS иконку меняем стандартным `expo-application` / `Application.setAlternateIconName`.

### Что где лежит сейчас
- `plugins/withAlternateIcons.js` (62 LOC). Ничего нативного.

### Публичный API
```json
["expo-alt-app-icons", {
  "iconDir": "./assets/icons",
  "primaryIconName": "AppIcon60x60",
  "exclude": ["icon-bg-default.png"],
  "prerendered": true
}]
```

### Что переделать при выносе
- Параметризовать директорию, primary icon, exclude, prerendered.
- Опционально: auto-generate `@2x`, `@3x` из исходников либо задокументировать convention.

### Почему №5
- Уже есть популярный `expo-dynamic-app-icon` и `expo-alternate-app-icons` — конкурировать надо на простоте и качестве.
- Наш плагин чище и меньше, чем у конкурента, но overlap большой.
- Ноль нативного кода — быстро вынести, но и польза средняя.

---

## 6. `expo-unity-ads` (core + banner) ★★★☆☆

**GitHub description (EN) — `expo-unity-ads`:**
> Unity Ads SDK integration for React Native / Expo. Initialize the SDK, load and show interstitial and rewarded ads, and subscribe to typed lifecycle events. iOS + Android.

**GitHub description (EN) — `expo-unity-ads-banner`:**
> Unity Ads banner as a native React component for React Native / Expo. Cross-platform (iOS + Android), event-driven (`onLoad`, `onFail`, `onClick`), configurable size and placement.

### Что делает
Cross-platform интеграция Unity Ads: инициализация SDK + баннер как `View`.

### Что где лежит сейчас

**iOS:**
- `targets/unity-banner/UnityBannerViewManager.swift` (52 LOC) — `RCTViewManager`, prop `placementId`.
- `targets/unity-banner/UnityBannerViewManager.m` — bridge.

**Android:**
- `targets/unity-banner/UnityBannerViewManager.kt` (65 LOC) — `SimpleViewManager<FrameLayout>`, `@ReactProp placementId`.
- `targets/unity-banner/UnityBannerPackage.kt` — регистрация `ReactPackage`.

**Plugin:**
- `plugins/withUnityBanner.js` (145 LOC) — регистрирует пакет в `MainApplication`, добавляет Gradle deps (`com.unity3d.ads:unity-ads:4.12.5`), правит `androidx.work` конфликт.

### Публичный API (после рефакторинга)
Пакет разбиваем на **два**:

`expo-unity-ads-core` — init / interstitial / rewarded:
```ts
await UnityAds.initialize(gameId: string, testMode?: boolean)
await UnityAds.load(placementId: string)
await UnityAds.show(placementId: string)
UnityAds.addListener('onReady' | 'onStart' | 'onClick' | 'onComplete' | 'onError', cb)
```

`expo-unity-ads-banner` — только `View`:
```tsx
<UnityBanner
  placementId="banner"
  size="banner" | "leaderboard" | "iabStandard"
  onLoad={...}
  onFail={(e) => ...}
  onClick={...}
/>
```

### Что переделать при выносе
- Переписать оба таргета под **Expo Modules API** (`ExpoView`, `View` в конфиге).
- Добавить события — сейчас их нет, а без них UI не понимает, надо ли показывать пустое место.
- Версию SDK и `androidx.work` override — параметры плагина, не хардкод.

### Почему №6
- Ниша (только для тех, кто на Unity Ads), не универсально.
- Но там реально нет живых RN-либ, конкуренция слабая.
- Разбиение на core+banner — правильно, но добавляет работы.

---

## 7. `expo-storekit-config` ★★☆☆☆

**GitHub description (EN):**
> Expo config plugin that generates a `.storekit` configuration file and wires it into your Xcode scheme for local StoreKit testing — declare consumables, non-consumables and subscriptions right in `app.json`.

### Что делает
Config plugin, создающий `StoreKit.storekit` файл в iOS проекте с описанием in-app purchase, и патчащий Xcode scheme, чтобы StoreKit configuration testing работал в дебаге.

### Что где лежит сейчас
- `plugins/withStoreKit.js`.
- Продукты захардкожены: `by.vazon.bsuirtime.tip.{small|medium|large}`.

### Публичный API
```json
["expo-storekit-config", {
  "fileName": "StoreKit.storekit",
  "products": [
    { "id": "com.example.tip.small", "type": "consumable", "price": 0.99, "displayName": "Small tip" }
  ],
  "subscriptions": [ ... ]
}]
```

### Что переделать при выносе
- Параметризовать SKU и типы (consumable / non-consumable / subscription).
- Поддержать subscription groups и families.

### Почему №7
- Полезно только для локального тестирования IAP (не для прода).
- Не самый частый use-case.
- Ноль нативного кода — можно вынести за час, но и востребованность средняя.

---

## 8. `expo-android-accent-color` ★★☆☆☆

**GitHub description (EN):**
> Expo config plugin that sets Android `colorAccent` in your app theme, controlling the tint of system dialogs (DatePicker, TimePicker, checkboxes, radio buttons). Light and dark variants supported.

### Что делает
Config plugin, добавляющий `<item name="colorAccent">…</item>` в тему `AppTheme` в `res/values/styles.xml`. Влияет на цвет системных диалогов (DatePicker, TimePicker).

### Что где лежит сейчас
- `plugins/withAndroidAccentColor.js`.

### Публичный API
```json
["expo-android-accent-color", { "light": "#007AFF", "dark": "#0A84FF" }]
```

### Почему №8
- Микрозадача, скорее «utility gist» чем пакет.
- Но если публиковать — то работы на полчаса.
- Можно объединить с `expo-alternate-icons` в один `expo-native-styling`, если не хочется 9 репо.

---

## 9. `expo-android-widget-layouts` ★☆☆☆☆

**GitHub description (EN):**
> Expo config plugin that patches `react-native-android-widget` output — injects custom preview layouts and additional widget XML resources into your Android build.

### Что делает
Патчит XML layouts, сгенерированные `react-native-android-widget`, копирует наши preview layouts в `res/layout/`.

### Почему №9
- Слишком заточено под текущий проект и под конкретную стороннюю либу.
- **Не рекомендую выносить** — рефакторить в самом приложении в кастомизацию текущей либы или отправить PR в апстрим `react-native-android-widget`.
- В план включён для полноты; на практике этот пункт закрываем как «no-op».

---

## Схема действий по фазам

### Фаза 0 — подготовка (0.5 дня)
- Создать GitHub org / решить с namespace (`expo-*` vs `@vazon/expo-*`).
- Сгенерировать npm automation token, положить в GitHub Secrets.
- Написать общий шаблон README, CI workflow, tsconfig, ESLint config.

### Фаза 1 — эталон (1 день)
- **Пакет 1: `expo-widgetkit-bridge`.** Настраиваем всё «по красоте»: README, CI, release, example. Публикуем `0.1.0` в npm.
- Далее используем этот репо как шаблон (`git init --template` или просто copy).

### Фаза 2 — «низковисящие» (1-2 дня)
- **Пакет 2: `expo-icloud-kv`** — переписать на Expo Modules API, добавить events, config plugin для entitlement.
- **Пакет 3: `expo-accessibility-plus`** — расширить API, добавить Android.
- **Пакет 5: `expo-alt-app-icons`** — параметризовать.
- **Пакет 8: `expo-android-accent-color`** — параметризовать (либо объединить с #5).

### Фаза 3 — сложные (2-4 дня)
- **Пакет 4: `expo-ios-widget-scaffold`** — вытащить `withWidget.js` в generic.
- **Пакет 6: `expo-unity-ads`** (core + banner) — разбить на два, Expo Modules API, события.

### Фаза 4 — по желанию
- **Пакет 7: `expo-storekit-config`** — параметризовать SKU.
- **Пакет 9: `expo-android-widget-layouts`** — скорее всего пропускаем, PR-им в апстрим.

### После каждого пакета
- В `bsuir-schedule` заменить local module / plugin на `npm install expo-<name>`.
- Удалить старые файлы из `modules/`, `plugins/`, `ios-native/`, `targets/`.
- Проверить, что приложение собирается на iOS и Android.
- Проверить, что виджет всё ещё работает.

---

## Технические детали и подводные камни

### Общие для всех Expo Modules
- Минимальный совместимый Expo SDK: **54** (текущий проекта).
- Каждый пакет: `expo-module.config.json` + `podspec` + `android/build.gradle` + TS types.

### Специфика iOS-виджетов
- **App Group** — общая для приложения и виджета entitlement. Плагин должен генерировать *и* main app entitlement (`com.apple.security.application-groups`) *и* widget target entitlement.
- **Code signing бандлов CocoaPods** — при добавлении widget target Xcode начинает подписывать resource bundles CocoaPods (например `expo-modules-core-privacy`), это ломается. Патч из `withWidget.js`:
  ```ruby
  installer.pods_project.targets.each do |target|
    next unless target.name.include?('-privacy')
    target.build_configurations.each { |c| c.build_settings['CODE_SIGNING_ALLOWED'] = 'NO' }
  end
  ```
  Обязательно переносить в `expo-ios-widget-scaffold`.
- **Sync версии** app ↔ widget (CFBundleShortVersionString, CFBundleVersion) — обязательно.

### Специфика Unity Ads
- Требует `androidx.work:work-runtime` конкретной версии (2.8.1), иначе конфликт со свежим `androidx.work` из Expo. Overrides — параметры плагина.

### Специфика iCloud KV
- `NSUbiquitousKeyValueStore` не гарантирует мгновенную синхронизацию — задержки до нескольких минут. Библиотека должна экспортировать `synchronize()` и listener `onExternalChange`.
- Лимиты: 1 MB total, 1024 ключа. Задокументировать в README.

### Полный список хардкодов → параметров

| Значение | Где встречается | Куда параметризовать |
|----------|-----------------|----------------------|
| `by.vazon.bsuirschedule` | `withICloudKVStore.js`, `withWidget.js` | plugin params |
| `by.vazon.bsuirtime` | `MainApplication.kt`, `withUnityBanner.js` | Android package (Expo знает сам) |
| `group.by.vazon.bsuirschedule` | `withWidget.js`, `ScheduleWidget.swift`, `expo-target.config.js` | plugin params |
| `.widget` (bundle suffix) | `expo-target.config.js`, `withWidget.js` | plugin params |
| `widgetSnapshot` (storage key) | `ScheduleWidget.swift` | остаётся в приложении |
| `by.vazon.bsuirtime.tip.*` | `withStoreKit.js` | plugin params |
| `AppIcon60x60` (primary icon) | `withAlternateIcons.js` → `expo-alt-app-icons` | plugin params |
| `com.unity3d.ads:unity-ads:4.12.5` | `withUnityBanner.js` | plugin params |
| `androidx.work:work-runtime:2.8.1` | `withUnityBanner.js` | plugin params |
| `15.1` (widget deployment target) | `expo-target.config.js` | plugin params |

---

## Что делаем прямо сейчас

Идём по порядку. Пакет №1 (`expo-widgetkit-bridge`) — берём как эталон, вылизываем всё: структуру, README, CI/CD, релиз. Дальше остальные 8 пойдут по накатанной колее.

Скажи «поехали» — начинаю с создания папки `../expo-widgetkit-bridge` рядом с `bsuir-schedule` и разворачивания там всего скелета.
