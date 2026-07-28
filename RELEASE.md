# RELEASE.md — чеклист релиза

Полная модель веток и пайплайнов — в `docs/plans/CICD_PLAN.md`.

## 0. Одноразовая настройка watch-таргетов (только владелец)

Apple Watch-приложение и его complication встроены в основное iOS-приложение
(config-плагины `withWatchApp` / `withWatchComplication`), поэтому при EAS-сборке
схемы `BsuirTime` они **автоматически попадают в архив** — отдельная EAS-сборка
не нужна, `eas.json` менять не нужно. Проверено: Release-архив содержит
`BsuirTime.app/Watch/BsuirWatch.app/PlugIns/BsuirWatchComplication.appex`.

Что нужно сделать один раз перед первым релизом с часами:

1. **Зарегистрировать App IDs** в Apple Developer (Certificates, IDs & Profiles)
   с включённой capability **App Groups**:
   - `by.vazon.bsuirschedule.watchapp` (watch-приложение);
   - `by.vazon.bsuirschedule.watchapp.complications` (complication).
     (`by.vazon.bsuirschedule` и `.widget` уже заведены.)
     NB: НЕ используем namespace `…watchkitapp.*` — Apple его резервирует и не
     даёт зарегистрировать App ID («identifier is not available»). Поэтому
     watch-приложение живёт на `.watchapp`, а complication вложен в него как
     `.watchapp.complications` (обязан начинаться с id watch-приложения).
2. **App Group** `group.by.vazon.bsuirschedule` — добавить к обоим новым App ID
   (тот же, что у основного приложения и виджета).
3. **Провижининг**: `eas credentials -p ios` (или первый `eas build`) обнаруживает
   встроенные таргеты по пребилду и заводит distribution-профили на каждый bundle
   id. Дать EAS создать/обновить профили для двух новых id.
4. **App Store Connect**: watch-приложение публикуется в составе основного —
   отдельной записи не требуется.

Версии watch/complication синхронизируются с основным приложением так же, как у
виджета (`MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` из версии приложения) —
отдельных действий не требует.

## 1. Подготовка версии (в develop)

```bash
git checkout develop && git pull
npm run bump:patch   # или bump:minor / bump:major
git commit -am "chore: bump version to vX.Y.Z"
git push
```

## 2. PR в testing

- Создай PR `develop → testing` с заголовком **`Release vX.Y.Z`** (версия обязана совпадать с package.json — CI проверит).
- После merge пайплайн сам соберёт и отправит обе платформы: iOS → TestFlight, Android → Internal testing.
- Нужна только одна платформа (hotfix)? Добавь `[ios]` или `[android]` в merge-коммит, либо запусти workflow «EAS Testing Build» руками с выбором платформы.

## 3. Тестирование

- iOS: TestFlight.
- Android: Google Play → Internal testing.
- Нашёлся баг → фикс в `develop` → новый PR `develop → testing` с **той же** версией (buildNumber инкрементится сам).

## 4. PR в master

- PR `testing → master`, заголовок тот же: **`Release vX.Y.Z`**.
- CI сверит версию и проверит, что тега `vX.Y.Z` ещё нет.

## 5. После merge (автоматически)

Workflow «Release» сам:

1. создаст тег `vX.Y.Z`;
2. соберёт production-APK через EAS;
3. опубликует GitHub Release с changelog, ссылками на сторы и APK.

## 6. Публикация в сторах (руками)

- **App Store Connect**: выбери протестированный TestFlight-билд → добавь release notes → Submit for Review.
- **Play Console**: продвинь билд из Internal testing → Production (или создай релиз в production-треке из того же AAB) → раскатка.

## 7. Синхронизация веток

После релиза убедись, что бамп версии есть в `develop` (он там и делался — конфликтов быть не должно).
