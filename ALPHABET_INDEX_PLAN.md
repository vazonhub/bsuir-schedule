# Алфавитный индекс преподавателей — план

Ветка: `feature/employees-alphabet-index` (от `master`).

## Цель

На панели «Преподаватели» (`ScheduleTabScreen`) добавить вертикальный алфавитный
скраббер у правого края (iOS Contacts style). Тап/пан по букве → скролл к началу
секции этой буквы. Список уже группируется по первой букве фамилии.

## Контекст (что уже есть)

- **`src/components/AlphabetIndex.tsx`** — готовый скраббер (тап + пан через RN
  responder system, ветка a11y с `Pressable`, `BlurView` на iOS). **Мёртвый код** —
  никогда не был подключён. Переиспользуем.
- **`src/utils/employeeGrouping.ts` → `buildAlphabetSections`** — группировка по
  первой букве фамилии, секции отсортированы `localeCompare('ru')`. Используется.
  **Фамилии внутри буквы НЕ отсортированы** (порядок API).
- **`src/views/schedule/ScheduleTabScreen.tsx`** — экран. Панель преподавателей:
  при поиске — `FlatList`, иначе — core RN `SectionList` (строки ~343-369).
  `employeeSections` собирается на ~118-123: `[pinned?, ...alphabet]`.
  У `SectionList` **нет ref** — программно скроллить сейчас нечем.
- ~800 преподавателей. Строки фикс. высоты (~66px). Заголовки секций — переменной
  высоты; в pinned-секции ещё и `UnityBanner` в футере → **пиксельная математика
  дрейфует**, поэтому прыгаем по индексам, а не по offset.
- `expo-haptics ~15.0.8` — есть.

## Зафиксированные решения (из уточнений)

1. Ветка от `master`.
2. Переиспользовать `AlphabetIndex.tsx`, допилить.
3. Скролл — `SectionList.scrollToLocation({ sectionIndex, itemIndex })` по индексам
   + `onScrollToIndexFailed` для надёжности. **Без** пиксельных offset'ов.
4. Сортировать фамилии внутри буквы (`localeCompare('ru')`).
5. Скраббер — только присутствующие буквы (не полный А-Я).
6. Живая подсветка активной буквы при обычном скролле (`onViewableItemsChanged`).
7. Лёгкий haptic (`selectionAsync`) при смене буквы во время пана.
8. Только панель преподавателей. Скрывать при активном поиске.
9. Pinned: если есть закреплённые — первым элементом скраббера идёт ★ (прыжок к
   pinned-секции / верху списка, `sectionIndex: 0`).
10. Нестандартные первые символы (латиница, цифры, `'?'`) — как раскладывает
    `localeCompare('ru')` (в конце), показываем в скраббере как есть.

## Шаги (каждый — отдельный коммит)

### Шаг 1 — Сортировка фамилий внутри буквы
`src/utils/employeeGrouping.ts`: в `buildAlphabetSections` сортировать `data` каждой
секции по `lastName.localeCompare(..., 'ru')`, тай-брейк по `firstName`.
- DoD: секции остаются отсортированы по буквам; внутри буквы — по алфавиту; typecheck ок.
- Коммит: `feat(employees): сортировка фамилий внутри буквы для алфавитного индекса`

### Шаг 2 — Ref + scrollToLocation по букве
`ScheduleTabScreen.tsx`:
- `sectionListRef = useRef<SectionList>(null)`, повесить на `SectionList`.
- Вывести `letters` из alphabet-секций (ключи, без pinned).
- `handleSelectLetter(letter)`: найти `sectionIndex` в `employeeSections` по
  `section.key === letter`; `scrollToLocation({ sectionIndex, itemIndex: 0,
  viewPosition: 0, animated: true })`. Учесть sticky-заголовок через `viewOffset`
  (подобрать на устройстве, т.к. header sticky).
- `onScrollToIndexFailed` → повтор через `requestAnimationFrame`/`setTimeout`.
- DoD: вызов из консоли/временной кнопки скроллит к нужной букве без краша.
- Коммит: `feat(employees): scrollToLocation по букве через ref SectionList`

### Шаг 3 — Отслеживание активной буквы при скролле
`ScheduleTabScreen.tsx`:
- `activeLetter` state; `onViewableItemsChanged` + `viewabilityConfig`
  (`itemVisiblePercentThreshold` / `viewAreaCoveragePercentThreshold`).
- Из верхнего видимого элемента брать его `section.key`; для pinned → `null`.
- `onViewableItemsChanged` обернуть в `useRef` (RN требует стабильную ссылку).
- DoD: при ручном скролле активная буква меняется корректно.
- Коммит: `feat(employees): подсветка активной буквы при скролле списка`

### Шаг 4 — Подключить AlphabetIndex в панель
`ScheduleTabScreen.tsx`:
- Рендерить `<AlphabetIndex letters onSelect={handleSelectLetter}
  activeLetter scheme />` внутри employees-пейна, поверх списка.
- Показывать только когда `!isEmpSearching && letters.length > 0`.
- `scheme` из текущей темы; нижний inset (таб-бар), чтобы последние буквы не
  уходили под нативный таб-бар.
- DoD: скраббер виден, тап/пан работают, скрывается при поиске.
- Коммит: `feat(employees): подключить алфавитный индекс к списку преподавателей`

### Шаг 5 — Haptics при смене буквы
- `expo-haptics` `selectionAsync()` при фактической смене буквы в `handleSelectLetter`
  (или в `onSelect` компонента, там уже есть `lastLetterRef`-гейт).
- DoD: тик при переходе на новую букву во время пана, без спама на каждый кадр.
- Коммит: `feat(employees): тактильный отклик при переходе по буквам`

### Шаг 6 — Полировка компонента и раскладки
`AlphabetIndex.tsx` и экран:
- Починить слипшиеся атрибуты на стр. 86 (`maxFontSizeMultiplier={1}style=`).
- Проверить, что `scheme` реально прокинут (иначе всегда light-tint).
- Отступы strip'а от краёв, чтобы не перекрывал контент/таб-бар; проверить дарк-тему.
- Пустые фамилии → бакет `'?'` в конце (поведение уже есть, проверить в скраббере).
- DoD: аккуратно в light/dark, iOS/Android; lint + typecheck чисто.
- Коммит: `refactor(employees): полировка алфавитного индекса (тема, раскладка, a11y)`

### Шаг 7 — Проверка
- `npm run typecheck`, `npm run lint`.
- Запуск на iOS-симуляторе, ручной прогон: прыжок по буквам, пан, активная буква,
  поиск (скрытие), pinned-секция, дарк-тема, производительность скролла на ~800.
- Правки при находках отдельными коммитами.

## Риски / на что смотреть

- **`scrollToLocation` + sticky header**: возможен off-by-one (header учитывается),
  из-за чего первая строка прячется под sticky-заголовок → подобрать `viewOffset`.
- **`onScrollToIndexFailed`** без `getItemLayout`: прыжок далеко вниз может
  промахнуться → нужен повтор.
- **`measureInWindow` в компоненте** уже мапит `pageY`→букву — проверить, что strip
  меряется корректно внутри анимированного пейна (`Animated.View`).
- **Производительность**: если скролл всё ещё дёргается — тюнить `windowSize`,
  `maxToRenderPerBatch`, `initialNumToRender`, `removeClippedSubviews` на `SectionList`.
