# FIRE_PLAN.md — переработка системы огонька

Рабочий документ для ветки `feature/fire-rework`. Живёт до мержа, потом можно удалить
или свернуть в `PLAN.md`.

## 0. Зафиксированные продуктовые решения (итог 4 волн вопросов)

| Тема | Решение |
|---|---|
| Область | **Один общий** огонёк на пользователя (не per-group) |
| Что растит | В учебный день **любое из**: вход в приложение / просмотр расписания / отметка домашки → `+1` |
| Ритм / учебные дни | Дни, когда по расписанию **закреплённой группы** (`defaultGroup`) есть пары |
| Пропуск | В учебный день без активности → `−1` (не ниже 0). **Заморозка отменяет `−1`** |
| Долгое отсутствие | `−1` за **каждый** пропущенный учебный день, заморозки гасят часть |
| Заморозки | **2 в неделю**, пул обновляется каждый понедельник |
| Бейдж | Остаётся в **хедере дневника** |
| Тап по бейджу | **Нижний шит**: статистика + календарь активности + заморозки |
| Уведомления | Локальный пуш **только когда серия под угрозой** (заморозки кончились и день ещё не закрыт) |
| Визуал | Пламя меняется с длиной серии; анимация вех **7 / 30 / 100**; целебрейшн нового рекорда |
| Миграция | Свернуть per-group серии в одну: `current = max`, `longest = max` |
| Синк | Синкать огонёк через существующий cloud sync (iCloud / Google Drive) |

## 1. Механика (точная спецификация)

Огонёк пересчитывается **лениво при открытии** (старт приложения + `AppState → active`).
Фонового пересчёта нет (background fetch отложён), поэтому `−1` за «не зашёл»
применяется **ретроактивно** при следующем открытии.

### Инвариант
`lastEvalDate` двигается вперёд только двумя путями: `evaluate()` (доводит до вчера)
и `markActivity()` (ставит в сегодня). ⇒ любой день строго между `lastEvalDate` и
`today` — это день **без активности**. Поэтому per-day хранилище активности не нужно.

### `evaluate(now)` — только штрафы, догоняет прошлые дни
```
today = localISO(now)
if lastEvalDate == null:                 // первый запуск
    lastEvalDate = prevDay(today)        // сегодня остаётся «открытым»
    refillFreezesFor(today)
    return
cursor = nextDay(lastEvalDate)
while cursor < today:                     // строго до сегодня
    refillFreezesFor(cursor)              // обновит пул при переходе через понедельник
    if isLessonDay(cursor):               // пропущенный учебный день
        if freezes > 0: freezes -= 1      // заморозка гасит −1
        else:           current = max(0, current - 1)
    cursor = nextDay(cursor)
lastEvalDate = prevDay(today)
refillFreezesFor(today)
```

### `markActivity(now)` — начисляет +1
```
evaluate(now)                             // сперва догнать прошлое
today = localISO(now)
if !isLessonDay(today): return            // не учебный день → нейтрально, серия стоит
if lastActiveDate == today: return        // уже засчитан сегодня
current += 1
if current > longest: longest = current; enqueueRecordCelebration()
if current in {7,30,100,...}: enqueueMilestone(current)
lastActiveDate = today
lastEvalDate  = today                     // сегодня полностью учтён
```

### `refillFreezesFor(dateISO)`
```
wk = mondayOf(dateISO)
if freezeWeekStart != wk:
    freezeWeekStart = wk
    freezes = WEEKLY_FREEZES               // = 2
```

### `isLessonDay(dateISO)`
Считает по расписанию `defaultGroup`:
1. Нет `defaultGroup` или расписание не загружено → **`false`** (нейтрально, чтобы не
   штрафовать несправедливо).
2. Вычислить номер недели (1..4) для даты и русское имя дня недели.
3. `true`, если в `schedules[dayNameRu]` есть хоть одна пара, чей `weekNumber`
   включает эту неделю (или `weekNumber` пуст = каждую неделю) и дата попадает в
   `startLessonDate..endLessonDate` (если заданы). Переиспользовать существующую
   логику вычисления недели/дня из `ScheduleView` (авто-скролл «к ближайшей паре»).

### Крайние случаи
- Учебный день, активность есть → `+1`.
- Учебный день, активности нет → `−1` (или заморозка).
- НЕ учебный день (выходной/пусто/каникулы) → нейтрально, серия не меняется.
- Расписание неизвестно на момент оценки → день трактуется как не-учебный (не штрафуем).
- Смена часового пояса/полночь: все даты — локальный `YYYY-MM-DD` (как в текущем
  `toLocalISO`, без `toISOString`).

## 2. Модель данных

Новый **отдельный** стор (огонёк больше не живёт в `diary.store`, т.к. стал глобальным).

```ts
// src/stores/fire.store.ts
interface FireState {
  current: number;               // текущая серия, >= 0
  longest: number;               // рекорд
  lastActiveDate: string | null; // ISO последнего дня с +1
  lastEvalDate: string | null;   // ISO дня, до которого досчитаны штрафы
  freezes: number;               // остаток заморозок в текущей неделе
  freezeWeekStart: string | null;// ISO понедельника недели пула
  // действия:
  markActivity(now: Date, isLessonDay: (iso: string) => boolean): void;
  evaluate(now: Date, isLessonDay: (iso: string) => boolean): void;
}
const WEEKLY_FREEZES = 2;
```

`isLessonDay` передаётся **из контроллера** (стор не должен лезть в schedule-store —
чистота слоёв). Persist через `asyncStorageAdapter`, `name: 'fire-v1'`.

## 3. Архитектура и файлы (по слоям MVC)

| Слой | Файл | Роль |
|---|---|---|
| utils | `src/utils/fire.ts` | Чистые функции: `localISO`, `mondayOf`, `nextDay`, `prevDay`, `weekNumberFor(date, currentWeek)`, `isLessonDayFor(schedule, date)`, чистый редьюсер оценки (для юнит-тестов) |
| store | `src/stores/fire.store.ts` | `FireState` + `markActivity`/`evaluate`, persist |
| controller | `src/controllers/fire.controller.ts` | Единственное место связи с schedule-store: собирает `isLessonDay` по `defaultGroup`, дёргает `markActivity`/`evaluate`; вызывает push в cloud |
| view (badge) | `src/views/diary/StreakBadge.tsx` → переработать (читает `fire.store`, открывает шит вместо `Alert`) |
| view (sheet) | `src/views/fire/FireSheet.tsx` | Нижний шит на `@gorhom/bottom-sheet`: current/longest, заморозки, календарь активности |
| component | `src/components/fire/FlameIcon.tsx` | Пламя, меняющее цвет/размер по «тиру» серии |
| component | `src/components/fire/FireCelebration.tsx` | Анимация вех/рекорда на `reanimated` + `expo-haptics` |
| component | `src/views/fire/ActivityCalendar.tsx` | Мини-календарь последних недель (горело/потухло/заморозка/выходной) |
| service | `src/services/notifications/fireReminder.ts` | (Фаза 5) локальный пуш «серия под угрозой» |
| sync | `src/services/cloud/syncService.ts` | Расширить: `pushFireToCloud` / `pullFireFromCloud` + merge |
| i18n | `src/i18n/{ru,en,be}.ts` | Ключи `fire.*` (переезд со `streak.*`) |

## 4. Точки интеграции (где дёргается контроллер)

- `src/services/prefetch.ts` — после `prefetchPinned()` (расписание в сторе) вызвать
  `FireController.onAppActive()` → `evaluate` + `markActivity` (открытие = активность).
- Просмотр расписания — на маунт/фокус `ScheduleView` вызвать
  `FireController.registerScheduleView()`.
- Отметка домашки — в `diary.store.toggleTask` (или в контроллере дневника) при
  `unchecked → checked` дёрнуть `FireController.registerHomework()`.
  ⚠️ Убрать старый streak-код из `diary.store` (строки ~156–178, `StreakState`,
  `EMPTY_STREAK`, `selectStreak`, `isStreakHot`, `nextWorkingDayAfter`, `isWeekday`).

## 5. Миграция

`diary-v1` → удалить поле `streak` из partialize и стора.
Одноразовая миграция при инициализации `fire.store`:
1. Прочитать старый persisted `diary-v1.streak` (если есть).
2. `current = max(current по всем группам)`, `longest = max(longest по всем группам)`.
3. `lastActiveDate = самый свежий` из групп; `lastEvalDate = prevDay(lastActiveDate)`.
4. Инициализировать заморозки на текущую неделю.
5. Пометить миграцию выполненной (флаг в fire-сторе), почистить старое поле.

## 6. Cloud sync + merge

Ключ `fire:state`. Пуш — best-effort после каждого изменения (как `pushScheduleToCloud`).
Пул — на старте (в `FireController.onAppActive`, до локального `evaluate`).
**Merge локального и облачного:**
```
current  = max(local.current, remote.current)
longest  = max(local.longest, remote.longest)
lastActiveDate = max(local, remote)         // самый свежий
lastEvalDate   = max(local, remote)
freezes / freezeWeekStart = у чьей записи свежее freezeWeekStart
```
Затем один `evaluate(now)` поверх слитого состояния.

## 7. Уведомления (Фаза 5, отдельно — новая native-зависимость)

- Добавить `expo-notifications` + config plugin в `app.json`, затем `prebuild`.
- Планировать локальный пуш на ~19:30 учебного дня, **только если** день ещё не закрыт
  **и** `freezes == 0` (серия реально под угрозой).
- Пере-планировать в `onAppActive`; отменять, когда день закрыт.
- Разрешения спросить мягко (при первом достижении серии, не на старте).
- Если не хочется тянуть зависимость сейчас — фазу можно отложить, ядро от неё не зависит.

## 8. UI / визуал

- **Бейдж** (хедер дневника): пламя (`FlameIcon`, цвет/размер по тиру) + число.
  Тап → `FireSheet` (haptic light).
- **Тиры пламени** (пример): 0 — серое `flame-outline`; 1–6 — оранжевое; 7–29 — насыщенное
  оранжевое, крупнее; 30–99 — с градиентом; 100+ — «синее пламя». Токены цветов — в
  `@theme/colors` (не хардкодить в компоненте).
- **FireSheet:** заголовок с крупным пламенем и числом; строки current / longest / заморозки
  (`🧊 2 осталось`); `ActivityCalendar`; кнопка «как это работает».
- **ActivityCalendar:** сетка последних ~4–6 недель, клетки: горело (оранж), потухло (серый),
  заморозка (голубой), выходной/не-учебный (пусто). Данные — производные от расписания +
  истории (историю активности придётся хранить компактно — см. «Открытые мелочи»).
- **Целебрейшн:** overlay на `reanimated` (пульс + партиклы пламени) + `hapticSuccess`
  при новом рекорде и на вехах 7/30/100.

## 9. Фазы реализации + Definition of Done

**Фаза 1 — Ядро (utils + store + миграция).** ✅ когда:
`fire.store` + `fire.ts` покрыты юнит-логикой (evaluate/markActivity/freezes/миграция),
`typecheck` и `lint` зелёные, старый streak удалён из `diary.store` без регрессий сборки.

**Фаза 2 — Контроллер + интеграция.** ✅ когда:
`+1` начисляется на вход/расписание/домашку в учебный день; `−1`/заморозка применяются
ретроактивно; всё через `FireController`; view не трогает сервисы напрямую.

**Фаза 3 — Бейдж + шит + календарь.** ✅ когда:
бейдж в хедере дневника открывает `FireSheet`; статистика и `ActivityCalendar` верны на
ручных сценариях; дизайн-токены из `@theme`, без хардкода цветов/чисел.

**Фаза 4 — Визуал (тиры пламени + целебрейшн).** ✅ когда:
пламя меняется по тирам; анимации вех/рекорда играют один раз и не спамят; haptics.

**Фаза 5 — Cloud sync.** ✅ когда:
огонёк пушится/пуллится, merge не теряет прогресс на двух устройствах.

**Фаза 6 — Уведомления (опционально).** ✅ когда:
пуш приходит только при угрозе серии, отменяется при закрытии дня; `prebuild` собирается.

Каждую фазу лить в `feature/fire-rework`; push/MR/merge — на тебе (по workflow).

## 10. Открытые мелочи и дефолты (можно менять по ходу)

- **История для календаря.** Чтобы честно рисовать «горело/потухло» за прошлые недели,
  нужно хранить компактную историю (напр. `Record<weekISO, bitmask>` или список последних
  ~42 дней со статусом). Дёшево, но это доп. поле в сторе. Дефолт: хранить последние 42 дня.
- **Верхний предел `current`.** Дефолт: без жёсткого потолка (в отличие от диapazona задач 0–99).
- **Тиры/цвета пламени** — конкретные пороги и палитра финализируются в Фазе 4.
- **Вехи** — стартовый набор `7, 30, 100` (+ далее каждые 100?).

## 11. Риски

- **`isLessonDay` зависит от загруженного расписания** — при холодном старте без сети
  оценка отложится/пропустит день. Смягчение: fallback на кэш расписания, «неизвестно =
  не штрафуем».
- **Ретроактивный штраф после долгого отсутствия** может резко обнулить серию — заморозки
  и «не ниже 0» смягчают; при желании добавим кап (сейчас решено: полноценный `−N`).
- **Уведомления** тянут native-зависимость и prebuild — изолированы в Фазе 6.
