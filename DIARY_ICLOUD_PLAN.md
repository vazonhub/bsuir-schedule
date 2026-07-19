# DIARY_ICLOUD_PLAN.md — синхронизация Дневника через iCloud

Рабочий документ для ветки `feature/diary-icloud-sync`. Живёт до мержа, потом можно
удалить или свернуть в `PLAN.md` (по аналогии с `FIRE_PLAN.md`).

## 0. Зафиксированные продуктовые решения (итог 2 волн вопросов)

| Тема                | Решение                                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Merge-стратегия     | **LWW по `updatedAt`** — весь снапшот дневника единое целое; новее по времени побеждает                                                                 |
| Объём синка         | `progress` (кол-во лаб + сделанные), `hidden` (замьюченные предметы), `planner`, **+** `blockedLessons` (замьюченные пары), **+** `diaryOnboardingSeen` |
| Огонёк              | Уже синкается (`fire:state` через `pushFireToCloud`/`pullFireFromCloud`) — только проверить, не трогать                                                 |
| Живой синк          | Только по входу в foreground / на старте (как огонёк), **без** `onExternalChange`                                                                       |
| Архитектура         | Новый `DiaryController` по образцу `FireController`                                                                                                     |
| Бэкенды             | iCloud **и** Google Drive (Android), гейтинг по `prefs.sourceICloud` / `prefs.sourceGoogleDrive`                                                        |
| Галочка iCloud вкл. | При включении — сразу `pull + merge + push`                                                                                                             |
| Ключ в облаке       | `diary:state` (один JSON-блоб)                                                                                                                          |

## 1. Текущее состояние (аудит)

- `useDiaryStore` (`diary-v1`, AsyncStorage) — **только локально**, облака нет:
  - `progress: Record<group, Record<subject, { taskCount, completed }>>` — сколько лаб и какие сделаны;
  - `hidden: Record<group, string[]>` — замьюченные предметы;
  - `planner: Record<group, PlannerItem[]>` — планер.
- `usePreferencesStore` (`preferences-v1`) — тоже только локально:
  - `blockedLessons: Record<entityKey, string[]>` — замьюченные пары (влияют на подсчёты дневника);
  - `diaryOnboardingSeen: boolean` — флаг «туториал показан».
- Огонёк: `fire.controller.ts` → `pullFireFromCloud` при `onAppActive`, `pushFireToCloud`
  после каждого изменения. Ключ `fire:state`. Гейтинг на `sourceICloud` уже есть в
  `syncService.ts` — **работает, не трогаем**.
- `expo-icloud-kv` (NSUbiquitousKeyValueStore): лимиты 1 МБ на стор / 1024 ключа —
  один блоб дневника заведомо вписывается.

## 2. Модель облачного снапшота

```ts
// src/utils/diarySync.ts
interface DiaryCloudSnapshot {
  updatedAt: number; // ms epoch — ключ LWW
  progress: Record<string, Record<string, SubjectProgress>>;
  hidden: Record<string, string[]>;
  planner: Record<string, PlannerItem[]>;
  blockedLessons: Record<string, string[]>;
  diaryOnboardingSeen: boolean;
}
```

- type-guard `isDiaryCloudSnapshot(x)` (по образцу `isFireCore`) — валидация при `pull`.

## 3. Логика merge (LWW)

```
local  = снапшот из diary.store (progress/hidden/planner + updatedAt)
         + preferences (blockedLessons, diaryOnboardingSeen)
remote = pullDiaryFromCloud()

if !remote:                              push(local со свежим updatedAt); return
if remote.updatedAt >  local.updatedAt:  applyRemoteSnapshot(remote)   // перезапись сторов
elif local.updatedAt > remote.updatedAt: push(local)
else:                                    ничего (равные метки)
```

Флаг `applyingRemote` в контроллере глушит push-подписку на время применения
удалённого снапшота — защита от петли «apply → subscription → push».

## 4. Отслеживание изменений

`DiaryController.init()` подписывается на срезы обоих сторов:

- `useDiaryStore` → `progress`, `hidden`, `planner`;
- `usePreferencesStore` → `blockedLessons`, `diaryOnboardingSeen`.

На любое изменение (если не `applyingRemote`): `touchUpdatedAt(Date.now())` в
diary-стор + **debounced** (~1 с) best-effort push в облако. Экшены сторов при этом
править не нужно.

## 5. Файлы

| Слой       | Файл                                  | Что делаем                                                                                                       |
| ---------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| utils      | `src/utils/diarySync.ts`              | **новый**: `SNAPSHOT_VERSION`, `DiaryCloudSnapshot`, строгий `isDiaryCloudSnapshot`, `sanitizeDiaryFields`       |
| store      | `src/stores/diary.store.ts`           | `updatedAt` (persist), LWW-штамп внутри `setStamped`, `touchUpdatedAt` (Lamport), `applyRemoteSnapshot`+sanitize |
| store      | `src/stores/preferences.store.ts`     | bulk-сеттер `setBlockedLessons(map)`                                                                             |
| service    | `src/services/cloud/syncService.ts`   | generic `pushJsonToCloud`/`pullJsonFromCloud<T>` + `CloudPullResult`; доменные пары — однострочники              |
| controller | `src/controllers/diary.controller.ts` | **новый**: `init` (initPromise), `onAppActive`, LWW-merge, debounced push, триггер включения источника           |
| controller | `src/controllers/index.ts`            | экспорт `DiaryController`                                                                                        |
| hook       | `src/hooks/useAppBootstrap.ts`        | `DiaryController.init()` + `onAppActive()` на старте и в foreground                                              |

Включение галочки iCloud/Drive ловится **подпиской контроллера на preferences-стор**
(рост `sourceICloud`/`sourceGoogleDrive`), а не колбэками в `NetworkDataScreen` —
любой будущий код, включающий источник, получает немедленный синк автоматически.
Там же для паритета дёргается `FireController.onAppActive()` (огонёк тоже
восстанавливается сразу, а не при следующем foreground).

## 6. Шаги (каждый — отдельный коммит)

1. ✅ Этот документ.
2. ✅ Модель снапшота (`diarySync.ts`) + `updatedAt`/`touchUpdatedAt`/`applyRemoteSnapshot` в `diary.store`.
3. ✅ `setBlockedLessons` в `preferences.store`.
4. ✅ `pushDiaryToCloud` / `pullDiaryFromCloud` в `syncService`.
5. ✅ `DiaryController` (LWW merge, подписки, debounced push).
6. ✅ Проводка: `useAppBootstrap` + тоглы iCloud/Drive в `NetworkDataScreen`.
7. ✅ Проверка огонька, `npm run typecheck`, Prettier по новым файлам
   (`npm run lint` сломан на уровне репо ещё до ветки: ESLint 9 требует
   `eslint.config.js`, а в проекте старый `.eslintrc` — чинится отдельной задачей).

## 7. Definition of done

- `typecheck` и `lint` зелёные.
- Гейтинг: при `sourceICloud=false` и `sourceGoogleDrive=false` — ни push, ни pull.
- LWW: устройство с более свежим `updatedAt` побеждает целиком.
- Огонёк не затронут, продолжает синкаться через `fire:state`.
- Отметка лабы / мьют предмета / правка планера уходит в облако (debounced push);
  повторный вход в приложение подтягивает состояние с другого устройства.

## 8. Принятые допущения

- `handleClearCache` в настройках **не** трогает `diary:state` — это пользовательские
  данные, а не кэш расписаний.
- LWW на уровне всего блоба: правка одного поля на устройстве A может перекрыть
  правку другого поля на устройстве B, если A новее, — осознанный компромисс.
- Debounce push ≈ 1 с.
- iOS и Android используют разные бэкенды (iCloud KVS / Google Drive) и между
  платформами дневник **не** синкается — как и огонёк/расписания (паритет).

## 9. Ревью-фиксы (9 находок code-review)

1. **Stamp-before-pull** (CONFIRMED): штамп легаси-метки перенесён ИЗ начала
   `sync()` в ветку «облако пусто» — свежее/легаси устройство больше не
   выигрывает LWW у реального облачного снапшота. `hasLocalData` игнорирует
   остаточные пустые ключи.
2. **Гонки гидрации** (CONFIRMED): `initialized`-флаг заменён мемоизированным
   `initPromise`; `onAppActive` ждёт его; отдельный вход `onCloudSourceEnabled`
   удалён (см. п. 9.7) — `sync()` недостижим до регидрации сторов.
3. **Инварианты remote-снапшота** (CONFIRMED): `sanitizeDiaryFields` (clamp
   0..99, prune индексов/планера, dedupe слотов и id) вызывается в
   `applyRemoteSnapshot`; guard отвергает массивы (`isPlainRecord`) и
   нецелые числа — битый блоб не завесит TaskGrid и не попадёт в persist.
4. **Часы/ничьи** (PLAUSIBLE): `updatedAt` двигается Lamport-бампом
   `max(now, prev + 1)` — правки после применения чужого снапшота при
   отстающих часах всё равно строго новее и не теряются на «ничьей».
5. **Replay туториала** (PLAUSIBLE): `diaryOnboardingSeen` мержится только
   вверх (OR): удалённый `false` не сбрасывает локальный `true`.
6. **Версия схемы** (PLAUSIBLE): `v: 1` в снапшоте; `invalid`-блоб (мусор или
   другая версия) отличается от `empty` и НЕ затирается push'ем.
7. **Триггер включения источника** (PLAUSIBLE): перенесён из трёх колбэков
   view в подписку контроллера на preferences + паритет огонька.
8. **Триплетизация push/pull** (CONFIRMED): generic
   `pushJsonToCloud`/`pullJsonFromCloud<T>`; schedule/fire/diary — однострочники.
9. **Штамп снаружи стора** (PLAUSIBLE): метка ставится внутри `setStamped`
   в самом сторе (один persist-цикл на мутацию вместо двух); diary-подписка
   контроллера следит только за `updatedAt`.

Опровергнуты (не чинились): short-circuit iCloud→Drive (бэкенды взаимоисключающие
по платформе), кросс-доменный clobber `blockedLessons` (в рамках компромисса §8),
гонки конкурентных `sync()` (сходимость: снапшоты атомарно собираются из
текущего состояния).
