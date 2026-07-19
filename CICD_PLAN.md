# CICD_PLAN.md — CI/CD и git flow

Координационный документ по перестройке работы с репозиторием: ветки, пайплайны, защита, релизы.
Ветка работ: `infra/ci-cd`.

---

## §0. Целевая модель веток

```
feature/* ──PR──▶ develop ──PR (vX.Y.Z)──▶ testing ──PR (vX.Y.Z)──▶ master
                     ▲                        │                        │
                     │                        │ EAS build+submit       │ tag vX.Y.Z
              default branch                  │ iOS → TestFlight       │ GitHub Release
                                              │ Android → Internal     │ + production APK
                                              ▼ (обе платформы,        ▼ + ссылки на сторы
                                                 [ios]/[android]        (в сторы — руками,
                                                 для выборочной         промоушен билдов
                                                 сборки)                из testing)
```

- **`develop`** — основная ветка разработки, default branch на GitHub. Все `feature/*`, `fix/*` ветки — от неё и PR обратно в неё.
- **`testing`** — одна ветка для тестовых сборок обеих платформ. Merge из develop → автоматический EAS build + submit (iOS → TestFlight, Android → Internal testing track).
- **`master`** — только релизы. PR из testing с версией в заголовке. После merge: git-тег, GitHub Release с APK и ссылками на сторы.

### Версионирование

- Источник истины — `package.json` (`app.config.ts` уже подтягивает оттуда).
- Бамп версии — **руками** (`npm run bump:patch|minor|major`) перед PR в `testing`.
- Заголовок PR в `testing` и `master` обязан содержать версию `vX.Y.Z`, CI сверяет её с `package.json`.
- В `master` идёт та же версия, что тестировалась. `buildNumber`/`versionCode` авто-инкрементятся EAS (`autoIncrement` + `appVersionSource: remote`), поэтому повторные итерации тестирования одной версии — ок.
- Тег `vX.Y.Z` создаёт релизный workflow после merge в master. Тегов до этого в репо не было — начинаем с текущей версии.

### Релизный поток (руками + CI)

1. `develop`: фичи готовы → `npm run bump:minor` → PR «Release v2.4.0» в `testing`.
2. CI сверяет версию, гоняет линтеры/тесты → merge → EAS build+submit обеих платформ.
3. Тестируем через TestFlight / Internal testing. Баги → фиксы в develop → снова PR в testing (та же версия).
4. Готово → PR «Release v2.4.0» из `testing` в `master`. CI сверяет версию + все проверки.
5. Merge → workflow: тег `v2.4.0`, production-APK билд, GitHub Release (changelog + APK + ссылки на App Store / Google Play).
6. Руками: в App Store Connect выбираем протестированный TestFlight-билд → на ревью; в Play Console промоутим билд из Internal → Production.

---

## §1. Фазы работ

### Фаза 1 — структура веток ⏸ (после merge infra/ci-cd)

- [ ] Создать `develop` от `master`, запушить.
- [ ] Создать `testing` от `develop`, запушить.
- [ ] Сделать `develop` default branch на GitHub (Settings → General → Default branch, либо `gh repo edit --default-branch develop`).

### Фаза 2 — pre-commit (husky + lint-staged) ✅

- [ ] `husky` v9 + `lint-staged`.
- [ ] pre-commit hook: `lint-staged` → `prettier --write` + `eslint --fix` только по staged-файлам.
- [ ] Скрипт `prepare` в package.json для автоустановки хуков после `npm install`.

### Фаза 3 — общий CI (`.github/workflows/ci.yml`) ✅

- [ ] Триггеры: `pull_request` → `develop`, `testing`, `master`; `push` → `develop`, `testing`, `master`.
- [ ] Node 22, `npm ci` с кэшем.
- [ ] Шаги: `prettier --check` (новый скрипт `format:check`) → `eslint` → `tsc --noEmit` → `npm run test --if-present` (тестов пока нет — шаг тихо пропускается, появятся — подхватится сам).

### Фаза 4 — проверка версии в PR (`version-check` job) ✅

- [ ] Job в ci.yml только для PR в `testing` и `master` (`types: opened, edited, synchronize, reopened` — правка заголовка перезапускает).
- [ ] Извлечь `vX.Y.Z` из заголовка PR, сравнить с `package.json.version` — иначе fail с понятным сообщением.
- [ ] Для PR в `master`: дополнительно проверить, что тега `vX.Y.Z` ещё нет.

### Фаза 5 — профили EAS (`eas.json`) ✅

- [ ] Профиль build `testing`: distribution store, `autoIncrement: true`, iOS image как в production, Android `app-bundle`, канал/env `production`-подобные.
- [ ] Профиль build `production-apk`: Android `buildType: apk` — для аттача к GitHub Release, той же подписью.
- [ ] Профили submit: `testing.ios` (ASC API key — уже в EAS credentials), `testing.android` (`track: internal`, Google Service Account — Фаза 9).

### Фаза 6 — testing-пайплайн (`.github/workflows/eas-testing.yml`) ✅

- [ ] Триггер: `push` → `testing` + `workflow_dispatch` с input `platform: all|ios|android`.
- [ ] Выбор платформы: по умолчанию обе; тег `[ios]` / `[android]` в сообщении head-коммита (включая merge-коммит PR) ограничивает сборку одной платформой.
- [ ] `eas build --profile testing --platform <p> --auto-submit --non-interactive --no-wait` — билд и сабмит выполняет EAS, runner не ждёт.
- [ ] Секрет `EXPO_TOKEN` в GitHub (robot access token с expo.dev).

### Фаза 7 — релизный пайплайн (`.github/workflows/release.yml`) ✅

- [ ] Триггер: `push` → `master`.
- [ ] Прочитать версию из `package.json`, создать и запушить тег `vX.Y.Z` (если ещё нет).
- [ ] `eas build --profile production-apk --platform android --non-interactive --wait` → скачать артефакт.
- [ ] Создать GitHub Release: авто-changelog (generate_release_notes), постоянные ссылки на App Store и Google Play, приложить `bsuir-time-vX.Y.Z.apk`.
- [ ] В сторы CI ничего не сабмитит — релиз в App Store Connect / Play Console делается руками промоушеном testing-билдов.

### Фаза 8 — переменные окружения в EAS ✅

- [ ] Завести все `EXPO_PUBLIC_*` из локального `.env` в EAS Environment Variables (environments: production, preview, development).
- [ ] ⚠️ Вероятный фикс текущего бага: реклама в проде не работает, потому что EAS-билды собирались без Unity-переменных.
- [ ] Проверить `eas env:list` после заведения.

### Фаза 9 — Google Service Account для Play Console ⏸ (ручные шаги)

- [ ] Google Cloud: создать проект (или использовать существующий), включить Google Play Android Developer API, создать Service Account, скачать JSON-ключ.
- [ ] Play Console: Users and permissions → пригласить SA email с правами на релизы приложения.
- [ ] Загрузить ключ в EAS credentials (`eas credentials` → Android → Google Service Account) — тогда `--auto-submit` работает с серверов EAS, ключ в GitHub не нужен.

### Фаза 10 — branch protection ✅ скрипт / ⏸ применение

- [ ] Скрипт `scripts/setup-branch-protection.sh` (через `gh api`): rulesets для `master` (только PR, required checks: ci + version-check, linear history), `develop` (только PR, required checks: ci), `testing` (required checks, прямой push разрешён для merge из develop).
- [ ] ⚠️ Пока репо приватный на Free-плане — GitHub не даст применить. Скрипт готовим сейчас, применяем после перехода в опенсорс/на платный план.

### Фаза 11 — документация ✅

- [ ] `RELEASE.md` — чеклист релиза (пошагово, от бампа до промоушена в сторах).
- [ ] Обновить `CLAUDE.md`: раздел про ветки/флоу и новые команды.

---

### Фаза 12 — lint-долг ✅ (добавлена по ходу)

- [x] Миграция eslint на flat config (v9): линтер в репо был сломан и не запускался вовсе.
- [x] Репо-вайд prettier-формат (75 файлов).
- [x] 624 ошибки → 0 ошибок, 0 предупреждений: реальные фиксы (Animated.Value через lazy useState, displayName, set-state-in-effect, инлайн-стили → StyleSheet, цветовые литералы → константы, мёртвый код) + точечные отключения только ложных срабатываний (no-unused-styles на фабрике тем, no-inline-styles для android-widget, require для ассетов/ленивых модулей).
- [x] CI гоняет eslint с `--max-warnings 0`.

### Фаза 13 — community-файлы для опенсорса ✅ (добавлена по ходу)

- [x] CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md.
- [x] .github/ISSUE_TEMPLATE (bug + feature + config), PULL_REQUEST_TEMPLATE.md.

## §2. Что потребуется от разработчика (ручные шаги)

| Шаг               | Когда   | Что сделать                                                                               |
| ----------------- | ------- | ----------------------------------------------------------------------------------------- |
| `EXPO_TOKEN`      | Фаза 6  | expo.dev → Access tokens → создать robot token → GitHub repo Settings → Secrets → Actions |
| Default branch    | Фаза 1  | Подтвердить смену на `develop` (или дать `gh` доступ)                                     |
| Google SA         | Фаза 9  | Клики в Google Cloud + Play Console по инструкции                                         |
| EAS env vars      | Фаза 8  | `eas` залогинен локально — заведём вместе значениями из `.env`                            |
| Branch protection | Фаза 10 | Применить скрипт после смены плана/визибилити репо                                        |

## §3. Секреты и токены

| Секрет          | Где живёт                          | Зачем                               |
| --------------- | ---------------------------------- | ----------------------------------- |
| `EXPO_TOKEN`    | GitHub Actions secrets             | Авторизация `eas` CLI в workflow    |
| ASC API Key     | EAS credentials (уже есть)         | submit в TestFlight                 |
| Google SA JSON  | EAS credentials (Фаза 9)           | submit в Internal testing track     |
| `EXPO_PUBLIC_*` | EAS Environment Variables (Фаза 8) | Unity Ads / Google Sign-In в билдах |

## §4. Definition of Done

- [ ] PR из feature-ветки в develop гоняет prettier/eslint/tsc/tests.
- [ ] PR в testing/master дополнительно сверяет версию из заголовка с package.json.
- [ ] Push в testing собирает и сабмитит обе платформы (или одну по `[ios]`/`[android]`).
- [ ] Merge в master создаёт тег, GitHub Release с APK и ссылками на сторы.
- [ ] Pre-commit прогоняет prettier+eslint по staged-файлам.
- [ ] Скрипт branch protection готов к применению.
- [ ] Реклама в prod-билде работает (env vars доехали до EAS).
