# Как контрибьютить в Bsuir Time

Спасибо за интерес к проекту! Это расписание БГУИР на Expo + React Native.

## Быстрый старт

```bash
npm install            # заодно поставит git-хуки (husky)
npx expo run:ios       # iOS: нужен Mac + Xcode (Expo Go НЕ подходит — используется dev client)
npx expo run:android   # Android: нужен JDK 17 + Android SDK
```

Проверки, которые гоняет CI (запускай локально перед PR):

```bash
npm run format:check   # prettier
npm run lint           # eslint (0 warnings!)
npm run typecheck      # tsc --noEmit
```

Pre-commit хук сам прогоняет prettier + eslint --fix по staged-файлам.

## Ветки и PR

- Основная ветка разработки — **`develop`** (default). Фичи и фиксы: `feature/*`, `fix/*` — ответвляйся от `develop` и делай PR обратно в `develop`.
- `testing` и `master` — служебные ветки релизного цикла, PR туда делает только мейнтейнер.
- PR должен проходить все проверки CI. Заголовок и описание — по шаблону.

## Коммиты

Conventional Commits: `feat: ...`, `fix: ...`, `chore: ...`, `refactor: ...`, `docs: ...`.
Скоуп приветствуется: `fix(android-widget): ...`, `feat(diary): ...`.

## Архитектура — MVC, строго по слоям

```
src/models/dto/*    — типы DTO под ответы API iis.bsuir.by/api/v1
src/services/api/*  — axios-обёртки; ТОЛЬКО здесь HTTP-запросы
src/stores/*        — Zustand-сторы (in-memory state)
src/controllers/*   — оркестрация: API → нормализация → store
src/views/*         — экраны (вызывают контроллеры, читают сторы селекторами)
src/components/*    — переиспользуемый UI без бизнес-логики
app/*               — file-based routing (Expo Router), тонкие re-export'ы из @views/*
```

Запреты:

- Не вызывать axios из view-компонентов.
- Не хардкодить цвета — только токены из `@theme` (`Palette`, `Radius`, `Spacing`).
- Не править `ios/` / `android/` руками — они генерируются `expo prebuild`; нативные настройки через `app.json` и config plugins.

Подробнее — в `CLAUDE.md` (используется и как контекст для AI-ассистентов, и как справка по кодстайлу).

## Стиль кода

- TypeScript strict + `noUncheckedIndexedAccess` — проверяй `arr[i]` на `undefined`.
- Компоненты функциональные, без `React.FC`. Пропсы — отдельный `interface Props`.
- `import type` для type-only импортов.
- Стили через `StyleSheet.create` (или фабрику `makeStyles(Palette)` для тем).
