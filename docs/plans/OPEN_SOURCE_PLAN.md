# План подготовки к open source

Ветка: `chore/open-source-prep`. Каждый шаг — отдельный коммит. Финал — squash всей истории
в один «Initial commit» и force-push `master` **только по команде владельца** (координация
с параллельной настройкой CI/CD и branch protection).

## Зафиксированные решения

| Вопрос                                                              | Решение                                                                                                |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Git-история (личный email в 118 коммитах, мусорные сообщения)       | Squash в один initial commit                                                                           |
| Лицензия                                                            | MIT, copyright «Konstantsin Betenya»                                                                   |
| README                                                              | EN основной (`README.md`) + RU (`README.ru.md`), скриншоты даёт владелец                               |
| План-файлы из корня                                                 | Переносятся в `docs/plans/`                                                                            |
| CLAUDE.md                                                           | Остаётся в корне, модифицируется под новые реалии                                                      |
| Русские комментарии в коде                                          | Переводятся на английский (UI-строки виджетов в app.json остаются русскими)                            |
| Пасхалка «легенды»                                                  | Остаётся; удаляется только личный Google Calendar ID                                                   |
| Инфра-идентификаторы (EAS owner/projectId, auditory API URL, KV id) | Выносятся в env / плейсхолдеры                                                                         |
| Community-файлы                                                     | CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, issue/PR templates                                            |
| Git-идентичность новых коммитов                                     | `Kostya Betenya <70769021+kostyabet@users.noreply.github.com>` (repo-local config, без Co-Authored-By) |

## Шаги

- [x] **0. Git-гигиена** (без коммита) — repo-local `user.email` → GitHub noreply.
- [x] **1. docs: перенос план-файлов** — `PLAN.md`, `FIRE_PLAN.md`, `EXTRACTION_PLAN.md`,
      `DIARY_ICLOUD_PLAN.md`, `DIARY_ONBOARDING_PLAN.md`, `FIX_PATCH_PLAN.md` → `docs/plans/`;
      добавление этого файла.
- [x] **2. chore: пасхалка** — `src/constants/legends.ts`: `calendarId` → `''`.
- [x] **3. chore: инфра-идентификаторы в env**
      — `app.json`: удалить `owner`, `extra.eas.projectId`, `extra.auditoryApiUrl`;
      — `app.config.ts`: читать их из `process.env` (`EXPO_OWNER`, `EAS_PROJECT_ID`,
      `EXPO_PUBLIC_AUDITORY_API_URL`) с graceful-поведением для форков;
      — `.env.example` со всеми ключами (Unity Ads, Google client ID, новые);
      — `services/auditory-api/wrangler.toml`: KV namespace id → `REPLACE_ME_KV_NAMESPACE_ID`;
      — `package.json`: убрать машинный `JAVA_HOME` из `android:build`.
      ⚠️ Для EAS cloud-билдов владельцу нужно завести эти переменные в EAS
      (dashboard → project → Environment variables), т.к. `.env` в git не попадает.
- [x] **4. refactor: перевод комментариев** — все русские комментарии в `src/`, `plugins/`,
      `targets/`, `scripts/`, `services/` → английский. Смысл сохраняется 1:1, UI-строки не трогаем.
- [x] **5. docs: CLAUDE.md под новые реалии** — перевод на английский, актуализация
      (ссылки на `docs/plans/`, README, `.env.example`; убрать упоминания живых PLAN-фаз).
- [x] **6. chore: LICENSE + package.json** — MIT «Copyright (c) 2026 Konstantsin Betenya»;
      в `package.json`: `license`, `author`, `repository`, `description`, `homepage`
      (`private: true` остаётся — приложение не публикуется в npm).
- [x] **7. docs: README.md (EN) + README.ru.md (RU)** — бейджи (Expo SDK 54, RN 0.81,
      TypeScript, MIT, платформы), бейджи сторов (App Store id 6762343557,
      Play `by.vazon.bsuirtime`), фичи, скриншоты (`docs/screenshots/`, слоты до получения
      картинок), архитектура (MVC-диаграмма), сборка/запуск, auditory-api, i18n ru/be/en,
      ссылки Notion/Telegram, лицензия.
- [x] **8. docs: community-файлы** — `CONTRIBUTING.md` (сборка, MVC-правила, стиль),
      `CODE_OF_CONDUCT.md` (Contributor Covenant), `SECURITY.md` (GitHub Security Advisories).
- [x] **9. chore: .github-шаблоны** — bug report, feature request, PR template.
- [x] **10. Скриншоты** — владелец кладёт картинки в `docs/screenshots/`, интеграция в оба README.
- [ ] **11. Верификация** — `npm run typecheck`, контрольный grep на
      личные данные / абсолютные пути по всему дереву.
- [ ] **12. Финал (по команде)** — squash-ветка с одним «Initial commit», ревью владельцем,
      force-push `master`.

## Контрольный чек-лист публичности

- [ ] Ни одного вхождения личного email в дереве и (после squash) в истории.
- [ ] `.env` не в git; `.env.example` актуален.
- [ ] Нет личного Google Calendar ID в `legends.ts`.
- [ ] `wrangler.toml` без реального KV id.
- [ ] GitHub Secrets (`AUDITORY_WORKER_URL`, `AUDITORY_CRAWL_TOKEN`) — уже ок, не в коде.

## Дополнительно сделано вне нумерации

- Перевод README auditory-api на английский, prettier-форматирование всего репо.
- ~~Линт-долг~~ — закрыт владельцем в ветке `infra/ci-cd` (flat config ESLint 9,
  фиксы react-hooks, husky + lint-staged, CI). Влит через merge origin/master;
  из community-доков возвращены требования `npm run lint`.
- Merge origin/master (CI/CD-инфраструктура): конфликты решены по принципу
  «код master + английские доки с содержанием master»; `CICD_PLAN.md`
  переехал в `docs/plans/`; повторно применены переводы комментариев и
  вычищенный `calendarId` в `legends.ts`.
