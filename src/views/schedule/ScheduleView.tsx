import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FloatingTopBar } from '@components/FloatingTopBar';
import { useNow } from '@hooks/useNow';
import type { CurrentWeekNumber, ScheduleDto } from '@models/dto';
import {
  selectIsEmployeePinned,
  selectIsGroupPinned,
  selectSubgroup,
  usePreferencesStore,
} from '@stores/preferences.store';
import { Palette, Spacing, TAB_BAR_HEIGHT } from '@theme';
import { isSameDay } from '@utils/date';
import { getLessonTimeStatus } from '@utils/lesson';
import {
  findUpcomingSectionIndex,
  flattenSchedule,
  groupLessonsByDay,
} from '@utils/scheduleNormalization';
import type { ScheduleSection } from '@utils/scheduleNormalization';

import { DayHeader } from '@views/lesson/DayHeader';
import { LessonCard } from '@views/lesson/LessonCard';

interface Props {
  schedule: ScheduleDto;
  currentWeek: CurrentWeekNumber;
  /** Group name (e.g. "410101") or employee urlId (e.g. "i-azarov"). */
  entityKey: string;
  entityType: 'group' | 'employee';
  onRefresh?(): void;
  refreshing?: boolean;
  onLessonPress?(lessonKey: string): void;
}

export const ScheduleView = ({
  schedule,
  currentWeek,
  entityKey,
  entityType,
  onRefresh,
  refreshing = false,
  onLessonPress,
}: Props) => {
  const insets = useSafeAreaInsets();
  const listRef = useRef<SectionList<unknown>>(null);

  // Pin / subgroup state — persisted via AsyncStorage.
  const subgroup = usePreferencesStore(selectSubgroup(entityKey));
  const setSubgroup = usePreferencesStore((s) => s.setSubgroup);
  const togglePinnedGroup = usePreferencesStore((s) => s.togglePinnedGroup);
  const togglePinnedEmployee = usePreferencesStore((s) => s.togglePinnedEmployee);
  const isPinned = usePreferencesStore(
    entityType === 'group' ? selectIsGroupPinned(entityKey) : selectIsEmployeePinned(entityKey),
  );

  const now = useNow();
  // `today` фиксируем по дате (без времени), чтобы группировка/секции
  // не пересчитывались каждые 30 секунд от тика `useNow`.
  const today = useMemo(
    () => {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [now.getFullYear(), now.getMonth(), now.getDate()],
  );

  const sections = useMemo(() => {
    const flat = flattenSchedule(schedule, currentWeek, today);
    return groupLessonsByDay(flat);
  }, [schedule, currentWeek, today]);

  const upcomingIndex = useMemo(
    () => findUpcomingSectionIndex(sections, today),
    [sections, today],
  );

  // Высота «зоны» FloatingTopBar — нужна и для верхнего отступа контента,
  // и для смещения индикатора RefreshControl (чтобы он появлялся в safe-зоне,
  // а не под чёлкой).
  const topInset = insets.top + 38 + Spacing.lg;

  // Auto-scroll to the closest upcoming day on first render / data change.
  // `viewOffset: topInset` гарантирует, что заголовок дня приземляется под
  // FloatingTopBar, а не под статус-баром (иначе дата уехала бы за край экрана).
  useEffect(() => {
    if (upcomingIndex < 0 || sections.length === 0) return;
    const id = setTimeout(() => {
      listRef.current?.scrollToLocation({
        sectionIndex: upcomingIndex,
        itemIndex: 0,
        animated: false,
        viewPosition: 0,
        viewOffset: topInset,
      });
    }, 80);
    return () => clearTimeout(id);
  }, [upcomingIndex, sections, topInset]);

  const contentStyle = useMemo(
    () => ({
      paddingTop: topInset,
      paddingBottom: insets.bottom + TAB_BAR_HEIGHT + Spacing.md,
    }),
    [insets.bottom, topInset],
  );

  const handleTogglePin = useCallback(() => {
    if (entityType === 'group') togglePinnedGroup(entityKey);
    else togglePinnedEmployee(entityKey);
  }, [entityType, entityKey, togglePinnedGroup, togglePinnedEmployee]);

  // Селектор подгруппы только для расписания группы. У преподавателя
  // фильтр по подгруппе не имеет смысла — он ведёт обе.
  const isGroup = entityType === 'group';
  const handleSubgroupChange = useCallback(
    (v: typeof subgroup) => setSubgroup(entityKey, v),
    [entityKey, setSubgroup],
  );

  /** True если данная пара актуальна для выбранной подгруппы. */
  const isMineSubgroup = useCallback(
    (numSubgroup: number): boolean => {
      if (!isGroup) return true; // расписание препода — всё «моё»
      if (subgroup === 0) return true; // «Все» — всегда «моя»
      if (numSubgroup === 0) return true; // общая пара — всегда «моя»
      return numSubgroup === subgroup;
    },
    [isGroup, subgroup],
  );

  // ───── Текущий «топовый» день для шапки ─────
  // Sticky-заголовок дня выключен (см. SectionList ниже) — вместо него
  // FloatingTopBar показывает дату секции, чей заголовок сейчас прячется
  // под панелью, справа от кнопки «назад». Источник истины —
  // `onScroll` + замеренные y-координаты секций (см. ниже).
  const [topSection, setTopSection] = useState<ScheduleSection | null>(null);

  // При смене расписания «активную» секцию ставим на ближайший день в
  // будущем (или первый доступный) — то же, куда мы автоскроллимся.
  useEffect(() => {
    if (sections.length === 0) {
      setTopSection(null);
      return;
    }
    const initial = sections[upcomingIndex >= 0 ? upcomingIndex : 0];
    if (initial) setTopSection(initial);
  }, [sections, upcomingIndex]);

  const sectionsRef = useRef(sections);
  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  // y-координаты заголовков секций в контенте скролла. Нужны, чтобы
  // переключать лейбл дня в FloatingTopBar ровно в момент, когда заголовок
  // дня прячется под панелью. `onViewableItemsChanged` не подходит: он
  // считает «видимым» всё, что попало в viewport, даже перекрытое
  // absolute-панелью сверху — и лейбл переключался с задержкой.
  //
  // Используем `measureInWindow` вместо `measureLayout`: последний на Fabric
  // ругается «must be called with a ref to a native component», потому что
  // `findNodeHandle(getScrollableNode())` возвращает null. `measureInWindow`
  // работает стабильно на обеих архитектурах. Контент-Y вычисляем как
  // `pageY - scrollViewPageY + currentScrollY`.
  const sectionOffsetsRef = useRef<Map<string, number>>(new Map());
  const currentScrollYRef = useRef<number>(0);
  const scrollViewPageYRef = useRef<number>(0);
  const topSectionRef = useRef<ScheduleSection | null>(null);
  useEffect(() => {
    topSectionRef.current = topSection;
  }, [topSection]);

  // Разово меряем, где в окне находится верх ScrollView.
  // У нас экран idet от края до края (headerShown: false, SafeAreaView не
  // оборачивает ScheduleView), так что почти всегда это 0, но подстрахуемся.
  useEffect(() => {
    const list = listRef.current as unknown as {
      getNativeScrollRef?: () => {
        measureInWindow?: (cb: (x: number, y: number) => void) => void;
      } | null;
      getScrollResponder?: () => {
        measureInWindow?: (cb: (x: number, y: number) => void) => void;
      } | null;
    } | null;
    const nativeRef = list?.getNativeScrollRef?.() ?? list?.getScrollResponder?.();
    nativeRef?.measureInWindow?.((_x, y) => {
      if (typeof y === 'number' && !Number.isNaN(y)) {
        scrollViewPageYRef.current = y;
      }
    });
  }, [sections.length]);

  const recomputeTopSection = useCallback(() => {
    const threshold = currentScrollYRef.current + topInset + 0.5;
    const list = sectionsRef.current;
    let current: ScheduleSection | null = null;
    for (const s of list) {
      const y = sectionOffsetsRef.current.get(sectionDateKey(s));
      if (y == null) continue;
      if (y <= threshold) current = s;
      else break;
    }
    if (current && current !== topSectionRef.current) {
      setTopSection(current);
    }
  }, [topInset]);

  const measureSection = useCallback(
    (section: ScheduleSection, node: View | null) => {
      if (!node) return;
      node.measureInWindow((_x, pageY) => {
        if (typeof pageY !== 'number' || Number.isNaN(pageY)) return;
        const contentY = pageY - scrollViewPageYRef.current + currentScrollYRef.current;
        sectionOffsetsRef.current.set(sectionDateKey(section), contentY);
        // Новый замер может поменять ответ «какая секция сейчас под панелью»
        // даже без нового скролла (например, сразу после автоскролла — когда
        // секции только-только отрендерились и попали в измерение).
        recomputeTopSection();
      });
    },
    [recomputeTopSection],
  );

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      currentScrollYRef.current = e.nativeEvent.contentOffset.y;
      recomputeTopSection();
    },
    [recomputeTopSection],
  );

  if (sections.length === 0) {
    return (
      <View style={styles.container}>
        <FloatingTopBar
          pinned={isPinned}
          onTogglePin={handleTogglePin}
          subgroup={isGroup ? subgroup : undefined}
          onSubgroupChange={isGroup ? handleSubgroupChange : undefined}
        />
        <View style={styles.center}>
          <Text style={styles.empty}>Расписание ещё не опубликовано</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        ref={listRef as never}
        sections={sections}
        keyExtractor={(item) => item.key}
        // Native sticky выключен — «текущий день» показываем в FloatingTopBar.
        stickySectionHeadersEnabled={false}
        contentContainerStyle={contentStyle}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderSectionHeader={({ section }) => (
          <MeasuredDayHeader
            section={section as ScheduleSection}
            today={today}
            onMeasure={measureSection}
          />
        )}
        renderItem={({ item }) => (
          <LessonCard
            lesson={item}
            compact={!isMineSubgroup(item.raw.numSubgroup)}
            timeStatus={isSameDay(item.date, today) ? getLessonTimeStatus(item, now) : null}
            onPress={onLessonPress ? () => onLessonPress(item.key) : undefined}
          />
        )}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            listRef.current?.scrollToLocation({
              sectionIndex: Math.min(info.index, sections.length - 1),
              itemIndex: 0,
              animated: false,
              viewPosition: 0,
              viewOffset: topInset,
            });
          }, 120);
        }}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Palette.textTertiary}
              progressViewOffset={topInset}
            />
          ) : undefined
        }
      />
      <FloatingTopBar
        pinned={isPinned}
        onTogglePin={handleTogglePin}
        subgroup={isGroup ? subgroup : undefined}
        onSubgroupChange={isGroup ? handleSubgroupChange : undefined}
        currentDate={topSection?.date}
        isCurrentDateToday={topSection ? isSameDay(topSection.date, today) : false}
      />
    </View>
  );
};

/** Стабильный ключ секции по её дате (00:00 локального времени). */
const sectionDateKey = (s: ScheduleSection): string => String(s.date.getTime());

interface MeasuredDayHeaderProps {
  section: ScheduleSection;
  today: Date;
  onMeasure(section: ScheduleSection, node: View | null): void;
}

/**
 * Обёртка над `DayHeader`, которая сообщает родителю свою y-координату в
 * контенте скролла. `collapsable={false}` — чтобы на Android view не схлопнулся
 * в родителя и `measureLayout` мог его найти.
 */
const MeasuredDayHeader = ({ section, today, onMeasure }: MeasuredDayHeaderProps) => {
  const ref = useRef<View>(null);
  return (
    <View ref={ref} collapsable={false} onLayout={() => onMeasure(section, ref.current)}>
      <DayHeader
        date={section.date}
        week={section.week}
        isToday={isSameDay(section.date, today)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl },
  empty: { color: Palette.textSecondary, textAlign: 'center', fontSize: 15 },
});
