# План: реклама в Дневнике

Ветка: `feature/diary-ads` (от `develop`).

## Цель

Монетизировать новый раздел **Дневник** двумя способами:

1. **Баннер** — Unity Ads баннер в футере списка предметов.
2. **Реворд** — рекламный ролик даёт **+1 «заморозку»** стрика (огонька) в `FireSheet`.

Решения согласованы с владельцем:

- Баннер — **футер списка** (внизу `FlatList`, как на остальных экранах; ненавязчиво,
  консистентно).
- Реворд — **доп. заморозка стрика** (ложится на существующую механику freeze,
  ценно юзеру, не режет основной функционал дневника).

## Что уже есть (переиспользуем, ничего нового не тянем)

- `@components/UnityBanner` — готовый баннер 320×50, сам прячется если SDK/натив
  недоступны. Переиспользуем как есть, свойство `marginHorizontal` не нужно
  (центрируется сам).
- `@services/ads` → `showRewardedAd(): Promise<boolean>` — `true` если посмотрел
  ИЛИ реклама недоступна (fail-open), `false` только при явном skip. Паттерн уже
  применён в `AppIconScreen`/`AppearanceScreen`.
- Механика freeze в `@utils/fire`: `WEEKLY_FREEZES = 2`, пул пополняется в
  понедельник, гасит −1 за пропущенный учебный день. Поле `freezes` уже
  персистится в `fire.store` и синкается в облако (`pushFireToCloud`).
- Существующие env-переменные Unity (game id, rewarded placement, banner placement)
  покрывают обе интеграции — **новые env-переменные не нужны**.

## Архитектурные заметки (MVC)

- Показ рекламы (`showRewardedAd`) вызывается **из view** — так уже сделано в
  `AppIconScreen` (view → service). Это допустимое исключение и мы его повторяем.
- Запись в стор + push в облако — **через контроллер**, чтобы `fire.store` не знал
  про cloud (как `FireController.register`).
- Баннер — чистый UI-компонент, добавляется прямо в view дневника.

---

## Шаги

### Шаг 0 — Ветка и план (этот файл)

- [x] Ветка `feature/diary-ads` от `develop`.
- [x] План в `docs/plans/DIARY_ADS_PLAN.md`.
- Коммит: `docs: add diary ads plan`.

### Шаг 1 — Баннер в футере Дневника

Файл: `src/views/diary/DiaryScreen.tsx` (компонент `DiaryForGroup`).

- Добавить `ListFooterComponent` в `FlatList` (строки ~215–271) с `<UnityBanner />`,
  обёрнутым в `View` со стилем `bannerWrap` (небольшой `marginTop`, центрирование) —
  по образцу `AboutScreen`.
- Проверить, что нижний отступ `contentContainerStyle`
  (`insets.bottom + TAB_BAR_HEIGHT + Spacing.md`, строки ~123–130) не залезает под
  таб-бар вместе с баннером; при необходимости добавить отступ в `bannerWrap`.
- Импорт: `import { UnityBanner } from '@components/UnityBanner';`.
- Не добавлять баннер в пустые состояния (`NoPinnedState`, empty subjects,
  skeleton, error) — только в основной список с предметами.
- Коммит: `feat(diary): banner ad in list footer`.

### Шаг 2 — Экшн выдачи заморозки в fire.store

Файлы: `src/utils/fire.ts`, `src/stores/fire.store.ts`.

- В `utils/fire.ts` добавить константу лимита, чтобы реворд нельзя было
  фармить бесконечно, напр. `export const MAX_FREEZES = 5;`
  (обычный недельный пул = 2; ролик может докинуть сверх, но не выше кап).
- В `fire.store.ts` добавить экшн `grantFreeze(): void`:
  - `freezes = Math.min(get().freezes + 1, MAX_FREEZES)`;
  - если уже на капе — no-op (вернуть без изменений);
  - если `freezeWeekStart == null` — проставить текущую неделю (`mondayOfISO(today)`),
    чтобы следующий `refilledFreezes` не сбросил гранты не по делу.
- `freezes`/`freezeWeekStart` уже в `partialize` — доп. персист не нужен.
- Селектор `selectFireFreezes` при желании (или читать из `selectFireCore`).
- Коммит: `feat(fire): grantFreeze store action with cap`.

### Шаг 3 — Контроллер: реворд-заморозка + push в облако

Файл: `src/controllers/fire.controller.ts`.

- Добавить метод `FireController.rewardFreeze(): void`:
  - `useFireStore.getState().grantFreeze();`
  - `void pushFireToCloud(selectFireCore(useFireStore.getState()));`
  - (по образцу приватного `register`, но без evaluate/markActivity).
- Так view не трогает cloud напрямую.
- Коммит: `feat(fire): rewardFreeze controller method`.

### Шаг 4 — UI реворда в FireSheet

Файлы: `src/views/fire/FireSheet.tsx`, `src/i18n/{ru,en,be}.ts`.

- `FireSheet` сейчас read-only — добавляем действие:
  - Кнопка «Посмотреть рекламу → +1 заморозка» под блоком `statsRow`
    (или встроить в тайл «Заморозки»). Стиль — карточка/пилюля из темы
    (`Palette`, `Radius`, `Spacing`, без magic numbers), иконка `snow-outline` /
    `play-circle-outline`.
  - `onPress`: `const ok = await showRewardedAd(); if (!ok) return;`
    затем `FireController.rewardFreeze();`.
  - Дизейблить кнопку когда `core.freezes >= MAX_FREEZES` (показывать «Максимум»).
  - Лёгкий local `useState` для «загрузки»/блокировки повторного тапа во время
    показа ролика.
- i18n-ключи в секцию `fire` во всех трёх локалях:
  - `fire.getFreeze` — «Заморозка за рекламу» (кнопка);
  - `fire.getFreezeCta` — «Посмотреть ролik → +1 ❄️» (или короче);
  - `fire.freezeMaxed` — «Максимум заморозок»;
  - при необходимости `fire.freezeAdSubtitle` — пояснение.
- Коммит: `feat(fire): watch rewarded ad for +1 freeze in FireSheet`.

### Шаг 5 — Проверка и финал

- `npm run typecheck` — без ошибок.
- `npm run lint` — 0 warnings.
- `npm run format:check`.
- Прогнать `src/utils/__tests__/fire.test.ts` (`--if-present`), при изменении
  утилит — дописать тест на `grantFreeze`/кап при необходимости.
- Ручная проверка (если есть dev-client): баннер виден внизу дневника; в FireSheet
  ролик даёт +1 заморозку, кап работает, offline/недоступность рекламы не ломают
  (fail-open → заморозка выдаётся или кнопка мягко деградирует — уточнить поведение
  при недоступности рекламы: fail-open выдаёт заморозку, это ок).
- Коммит (если будут правки): `chore(diary): polish ads integration`.

---

## Edge cases / заметки

- **Кап и недельный сброс**: `refilledFreezes` сбрасывает пул на `WEEKLY_FREEZES`
  при смене недели. Гранты сверх кап живут только до понедельника — это осознанно
  (иначе бесконечный фарм).
- **Cross-device sync**: `mergeFireCores` берёт `min(freezes)` при совпадении
  недели. Грант на одном устройстве может «схлопнуться» при мердже с устройством,
  где заморозок меньше. Принимаем как редкий кейс; при необходимости — отдельная
  задача.
- **Fail-open рекламы**: `showRewardedAd` возвращает `true` и когда ролика нет.
  Значит при отсутствии рекламы заморозка всё равно выдаётся — это соответствует
  текущему поведению приложения (реворд как «мягкий» гейт), менять не будем.
- **Новых нативных модулей/плагинов нет** — prebuild не требуется.

## Статус: реализовано ✅

Все шаги выполнены. `typecheck` / `lint` (0 warnings) / `format:check` — чисто,
`fire.test.ts` — 32/32 зелёные.

## Коммиты (все от лица владельца, без co-author)

1. `docs: add diary ads plan` ✅
2. `feat(diary): banner ad in list footer` ✅
3. `feat(fire): grantFreeze store action with cap` ✅
4. `feat(fire): rewardFreeze controller method` ✅
5. `feat(fire): watch rewarded ad for +1 freeze in FireSheet` ✅
6. `test(fire): cover grantFreezeCore cap and week anchoring` ✅
