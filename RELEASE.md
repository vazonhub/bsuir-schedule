# RELEASE.md — чеклист релиза

Полная модель веток и пайплайнов — в `docs/plans/CICD_PLAN.md`.

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
