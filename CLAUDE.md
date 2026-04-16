# CLAUDE.md

Контекст для Claude Code (и для разработчика). Этот файл подгружается автоматически при работе в директории.

## О проекте

Мобильное приложение «Bsuir Time» — расписание занятий БГУИР. Стек: Expo SDK 54 + React Native 0.81 + TypeScript (strict).

**Платформы:**
- **iOS** — основная. Минимальный target — iOS 15.1. Liquid Glass / native large title — только на iOS 26+ (с graceful fallback на старшие версии).
- **Android** — полноценная поддержка функционала, но UI делается iOS-first и потом адаптируется под Material 3. Виджеты на Home Screen реализуем на обеих платформах (WidgetKit + Glance).

## Архитектура — MVC

Жёстко придерживаемся слоёв. Не нарушать без обсуждения.

- `src/models/dto/*` — типы DTO под ответы API `iis.bsuir.by/api/v1`.
- `src/services/api/*` — axios-обёртки. **Только** здесь делаются HTTP-запросы.
- `src/stores/*` — Zustand-сторы (in-memory state).
- `src/controllers/*` — оркестрация: API → нормализация → store. **Единственное** место, где view-слой пересекается с сервисами.
- `src/views/*` — экраны (вызывают только методы контроллеров и читают сторы через селекторы).
- `src/components/*` — переиспользуемый UI без бизнес-логики.
- `app/*` — file-based routing **Expo Router 6** (нативный таббар через `expo-router/unstable-native-tabs`). Структура: `app/(tabs)/{(groups)|(employees)}/{_layout,index,[name|urlId]}.tsx`. Каждый файл-экран — тонкий re-export соответствующего компонента из `@views/*`.
- `src/theme/*`, `src/utils/*`, `src/hooks/*` — вспомогательное.

### Запреты

- Не зови axios из view-компонентов.
- Не хардкодь цвета пар в компонентах — используй `getLessonAccentColor` из `@utils/lesson`.
- Не правь файлы в `ios/` / `android/` вручную, если они появятся после `expo prebuild` — все нативные настройки должны проходить через `app.json` и Expo config plugins.

## Алиасы импортов

`@/`, `@models/`, `@views/`, `@controllers/`, `@services/`, `@stores/`, `@components/`, `@navigation/`, `@theme/`, `@utils/`, `@hooks/`.

Источник истины: `tsconfig.json` + `babel.config.js` (`module-resolver`). Менять синхронно в обоих.

## Цвета типов пар

Канон — в `src/theme/colors.ts → LESSON_TYPE_COLORS`. Полная таблица в `PLAN.md` §0.

## Команды

- `npm run ios` — Metro + iOS симулятор (нужен dev client, не Expo Go).
- `npm run typecheck` — `tsc --noEmit`.
- `npm run lint` / `npm run lint:fix`.
- `npm run format` — Prettier.
- `npm run prebuild` — сгенерировать `ios/` и `android/` (после изменения plugins или нативных зависимостей).

## Запуск на устройстве

`expo-router/unstable-native-tabs` использует нативный `UITabBarController` → **Expo Go не подходит**, нужен dev client (уже установлен — `expo-dev-client`):

```bash
npx expo run:ios     # Mac + Xcode, ставит dev client + запускает Metro
# или для уже собранного:
npx expo start --dev-client
```

Симптом «Expo Go вместо dev client»: ошибка `<RNCTabView> Unimplemented component` в рантайме.

## Дорожная карта

См. `PLAN.md` — там фазы 1..10, definition of done и быстрый индекс «фаза → файлы». Этот файл — основной координационный документ.

## Зафиксированные продуктовые решения

- Список групп — `SectionList`, группировка по факультетам с sticky-заголовками («ФКСиС · …»). Внутри секции — сортировка по курсу, потом по имени.
- Закреплённые группы и преподаватели предзагружаются в фоне на старте приложения и по `AppState → active`. См. `services/prefetch.ts` (создаётся в Phase 6).
- Отдельной вкладки «Сегодня» нет. Эту роль играют автоскролл на расписании закреплённой группы и виджеты.
- Виджеты на Home/Lock Screen — обязательная функциональность, и iOS, и Android. Снапшот для виджета формирует `services/widget/widgetData.ts` и пишет в shared storage (App Group на iOS, общий MMKV/SharedPreferences на Android).

## API заметки

- Базовый URL: `https://iis.bsuir.by/api/v1`. HTTPS, без авторизации для публичных endpoints.
- Расписание циклическое, **4 недели**. Текущая неделя — `GET /schedule/current-week` (число 1..4).
- `LessonDto.weekNumber: number[]` — список недель. Пустой массив = «каждую неделю».
- `LessonDto.numSubgroup: 0|1|2` — `0` = общая пара.
- `schedules` — словарь с **русскими** ключами дней недели.
- `lessonTypeAbbrev` бывает `null` — рендерим серым (`FALLBACK_LESSON_COLOR`).

## Стиль кода

- TypeScript strict + `noUncheckedIndexedAccess`. Проверяй `arr[i]` на `undefined`.
- Импорты: внешние библиотеки сверху, потом `@`-алиасы, потом локальные. Используй `import type` для type-only.
- Компоненты — функциональные, без `React.FC`. Пропсы — отдельный `interface Props`.
- Стили через `StyleSheet.create`. Цвета — только из `@theme` (`Palette`), радиусы — `Radius`, отступы — `Spacing`. Не хардкодь магические числа в стилях, ищи токен в `src/theme/spacing.ts` и `radius.ts`.

## Дизайн-система

- **Фон экрана:** `Palette.background` (#F2F2F7 / #000000 в дарке).
- **Карточка:** `Palette.card` (#FFFFFF / #1C1C1E), скругление `Radius.lg` (18 pt).
- **Press-state:** меняется только `backgroundColor` карточки на `Palette.cardPressed`. Не используем `opacity` для нажатия.
- **Отступы:** карточки от краёв экрана — `Spacing.screenPadding` (12). Между карточками — `Spacing.cardGap` (6). Внутренние паддинги карточки — `Spacing.cardPaddingX/Y`.
- **Section header:** текст без видимого фона, но `View` обёртка имеет `backgroundColor: Palette.background` — чтобы при sticky не «висел» поверх карточек.
- **Search bar:** такой же card-стиль (белая плитка, `Radius.lg`, padding от краёв = `Spacing.screenPadding`).
- **Никаких теней и рамок** на карточках по умолчанию — выделение только фоном.

## Навигация

- Между экранами — `useRouter()` из `expo-router`. Push с типобезопасным pathname:
  ```ts
  router.push({ pathname: '/(tabs)/(groups)/[name]', params: { name: '410101' } });
  ```
- Параметры маршрута — `useLocalSearchParams<{ name: string }>()`. Все значения приходят как `string | string[] | undefined`, всегда проверяй на `undefined`.
- Заголовок экрана — через `<Stack.Screen options={{ title: '…' }} />` внутри компонента, либо через `_layout.tsx` соответствующего стека.
- При добавлении нового экрана — создай файл в нужной папке `app/(tabs)/(<tab>)/`, при необходимости — `Stack.Screen` запись в `_layout.tsx` (для дефолтных опций).
