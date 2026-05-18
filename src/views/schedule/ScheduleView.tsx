import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Dimensions, Modal, Platform, Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Image } from 'expo-image';
import { FloatingTopBar } from '@components/FloatingTopBar';
import { UnityBanner } from '@components/UnityBanner';
import { hapticLight, hapticSuccess } from '@utils/haptics';
import { useIconName } from '@hooks/useAppearance';
import { useNow } from '@hooks/useNow';
import { usePalette } from '@hooks/usePalette';
import type { CurrentWeekNumber, ScheduleDto } from '@models/dto';
import {
  selectBlockedLessons,
  selectIsEmployeePinned,
  selectIsGroupPinned,
  selectSubgroup,
  usePreferencesStore,
} from '@stores/preferences.store';
import { Radius, Spacing, TAB_BAR_HEIGHT } from '@theme';
import type { Holiday } from '@models/holiday';
import { getMergedHolidays, useHolidaysStore } from '@stores/holidays.store';
import { addDays, isSameDay, parseBsuirDate, startOfLocalDay } from '@utils/date';
import { findHolidayName, toDateISO } from '@utils/holidays';
import { buildLessonBlockId, getLessonTimeStatus } from '@utils/lesson';
import {
  findUpcomingSectionIndex,
  flattenExams,
  flattenSchedule,
  groupExamsByDay,
  groupLessonsByDay,
} from '@utils/scheduleNormalization';
import type { ScheduleSection } from '@utils/scheduleNormalization';

import { DayHeader } from '@views/lesson/DayHeader';
import { LessonCard } from '@views/lesson/LessonCard';
import { LessonDetailsSheet } from '@views/lesson/LessonDetailsSheet';
import type { NormalizedLesson } from '@utils/scheduleNormalization';

type PaletteType = ReturnType<typeof usePalette>;

interface Props {
  schedule: ScheduleDto;
  currentWeek: CurrentWeekNumber;
  /** Group name (e.g. "410101") or employee urlId (e.g. "i-azarov"). */
  entityKey: string;
  entityType: 'group' | 'employee';
  onRefresh?(): void;
  refreshing?: boolean;
  /** Static title shown instead of the date label on detail pages (group number or employee FIO). */
  title?: string;
  /** Avatar URL shown in the top bar (employee photo). */
  avatarUri?: string | null;
  /** True when rendered as the root "My Schedule" tab (no back button). */
  isDefaultSchedule?: boolean;
  /** Label shown in the FloatingTopBar pill when `isDefaultSchedule` (group name or "Фамилия И.О."). */
  defaultLabel?: string;
}

const EMPTY_HOLIDAYS: Holiday[] = [];

export const ScheduleView = ({
  schedule,
  currentWeek,
  entityKey,
  entityType,
  onRefresh,
  refreshing = false,
  title,
  avatarUri,
  isDefaultSchedule = false,
  defaultLabel,
}: Props) => {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  const listRef = useRef<SectionList<unknown>>(null);
  const sheetRef = useRef<BottomSheetModal>(null);
  // Lesson data lives in a ref so it's always available synchronously when
  // the sheet renders — no dependency on React's async state batching.
  const lessonRef = useRef<NormalizedLesson | null>(null);
  const [, forceRender] = useReducer((x: number) => x + 1, 0);
  const selectedLesson = lessonRef.current;

  const [fullscreenPhoto, setFullscreenPhoto] = useState(false);
  const handleAvatarPress = useCallback(() => {
    if (avatarUri) setFullscreenPhoto(true);
  }, [avatarUri]);

  // When a dismiss animation is still in flight, present() is silently
  // ignored by BottomSheetModal.  We force-dismiss first, then re-present
  // once the animation finishes (onDismiss fires).
  const pendingLessonRef = useRef<NormalizedLesson | null>(null);
  const sheetOpenRef = useRef(false);
  const scrollToLessonFnRef = useRef<(lesson: NormalizedLesson) => void>(() => {});

  const handleLessonPress = useCallback((lesson: NormalizedLesson) => {
    void hapticLight();
    lessonRef.current = lesson;
    forceRender();

    const sheet = sheetRef.current;
    if (!sheet) return;

    if (sheetOpenRef.current) {
      // Шит уже открыт — обновляем данные (через ref + forceRender) и
      // сбрасываем на начальный snap-point без dismiss/present цикла.
      sheet.snapToIndex(0);
    } else {
      pendingLessonRef.current = lesson;
      sheet.present();
    }

    scrollToLessonFnRef.current(lesson);
  }, []);

  const handleSheetChange = useCallback((index: number) => {
    sheetOpenRef.current = index >= 0;
    if (index >= 0) {
      pendingLessonRef.current = null;
    }
  }, []);

  const handleSheetDismiss = useCallback(() => {
    sheetOpenRef.current = false;
    const pending = pendingLessonRef.current;
    if (pending) {
      pendingLessonRef.current = null;
      sheetRef.current?.present();
    }
  }, []);

  // Закрываем модалку при начале скролла списка.
  const handleScrollBeginDrag = useCallback(() => {
    if (sheetOpenRef.current) {
      pendingLessonRef.current = null;
      sheetRef.current?.dismiss();
    }
  }, []);

  // Закрываем модалку при уходе с экрана (смена вкладки, back).
  const navigation = useNavigation();
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      pendingLessonRef.current = null;
      sheetRef.current?.dismiss();
    });
    return unsubscribe;
  }, [navigation]);

  // Pin / subgroup / hide-past state — persisted via AsyncStorage.
  const hidePastLessons = usePreferencesStore((s) => s.hidePastLessons);
  const subgroup = usePreferencesStore(selectSubgroup(entityKey));
  const setSubgroup = usePreferencesStore((s) => s.setSubgroup);
  const togglePinnedGroup = usePreferencesStore((s) => s.togglePinnedGroup);
  const togglePinnedEmployee = usePreferencesStore((s) => s.togglePinnedEmployee);
  const isPinned = usePreferencesStore(
    entityType === 'group' ? selectIsGroupPinned(entityKey) : selectIsEmployeePinned(entityKey),
  );

  const blockedSelector = useMemo(() => selectBlockedLessons(entityKey), [entityKey]);
  const blockedList = usePreferencesStore(blockedSelector);
  const blockedSet = useMemo(() => new Set(blockedList), [blockedList]);
  const toggleBlockedLesson = usePreferencesStore((s) => s.toggleBlockedLesson);
  const isLessonBlocked = useCallback(
    (lesson: NormalizedLesson): boolean => blockedSet.has(buildLessonBlockId(lesson)),
    [blockedSet],
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

  const apiHolidays = useHolidaysStore((s) => s.byYear[String(today.getFullYear())]) ?? EMPTY_HOLIDAYS;
  const userAdded = useHolidaysStore((s) => s.userAdded);
  const userRemoved = useHolidaysStore((s) => s.userRemoved);
  const userAddedHidden = useHolidaysStore((s) => s.userAddedHidden);
  const holidays = useMemo(
    () => getMergedHolidays(apiHolidays, userAdded, userRemoved, userAddedHidden),
    [apiHolidays, userAdded, userRemoved, userAddedHidden],
  );

  // Detect exam session mode: today >= startExamsDate → show only exams, no week headers.
  const isExamSession = useMemo(() => {
    const start = parseBsuirDate(schedule.startExamsDate);
    return !!start && today.getTime() >= start.getTime();
  }, [schedule.startExamsDate, today]);

  const regularSections = useMemo(() => {
    if (isExamSession) return [];
    const flat = flattenSchedule(schedule, currentWeek, today, {
      showAll: !hidePastLessons,
    });
    return groupLessonsByDay(flat);
  }, [schedule, currentWeek, today, hidePastLessons, isExamSession]);

  const examSections = useMemo(() => {
    const flat = flattenExams(schedule, currentWeek, today);
    return groupExamsByDay(flat);
  }, [schedule, currentWeek, today]);

  const firstExamSectionIndex = regularSections.length > 0 ? regularSections.length : 0;
  const sections = useMemo(
    () => [...regularSections, ...examSections],
    [regularSections, examSections],
  );

  const hasExams = examSections.length > 0;

  const upcomingIndex = useMemo(() => {
    // Если есть обычные секции — скроллим к ближайшему дню занятий.
    const idx = findUpcomingSectionIndex(regularSections, today);
    if (idx >= 0) return idx;
    // Если обычных нет, но есть экзамены — скроллим к ближайшему экзамену.
    if (hasExams) {
      const examIdx = findUpcomingSectionIndex(examSections, today);
      return examIdx >= 0 ? firstExamSectionIndex + examIdx : 0;
    }
    return -1;
  }, [regularSections, examSections, firstExamSectionIndex, hasExams, today]);

  // Высота «зоны» FloatingTopBar — нужна и для верхнего отступа контента,
  // и для смещения индикатора RefreshControl (чтобы он появлялся в safe-зоне,
  // а не под чёлкой).
  const topInset = insets.top + 38 + Spacing.lg;

  // Auto-scroll to the closest upcoming day.
  // `viewOffset: topInset` гарантирует, что заголовок дня приземляется под
  // FloatingTopBar, а не под статус-баром.
  const scheduleIdentity = `${entityKey}:${schedule.startDate}:${schedule.endDate}`;

  const jumpToUpcoming = useCallback(
    (delay: number) => {
      if (upcomingIndex < 0 || sections.length === 0) return undefined;
      const target = upcomingIndex;
      const opts = {
        sectionIndex: target,
        itemIndex: 0,
        animated: false,
        viewPosition: 0 as const,
        viewOffset: topInset,
      };
      const ids: ReturnType<typeof setTimeout>[] = [];
      // Multiple attempts — SectionList without getItemLayout needs
      // several passes to land on the correct position.
      for (const d of [delay, delay + 150, delay + 500]) {
        ids.push(setTimeout(() => {
          console.log(`[ScheduleView] scrollToLocation section=${target} viewOffset=${topInset} delay=${d}`);
          try { listRef.current?.scrollToLocation(opts); } catch { /* unmounted */ }
        }, d));
      }
      return ids;
    },
    [upcomingIndex, sections.length, topInset],
  );

  // 1) При первом рендере / смене расписания — мгновенный jump.
  useEffect(() => {
    const ids = jumpToUpcoming(50);
    return () => { ids?.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleIdentity]);

  // 2) При переключении hidePastLessons — jump с задержкой на layout.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const ids = jumpToUpcoming(300);
    return () => { ids?.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidePastLessons]);

  const isIOS = Platform.OS === 'ios';

  // Stable initial contentOffset — stored in a ref so it's never re-applied
  // on subsequent renders. Passing contentOffset as a prop causes iOS to
  // re-scroll to the initial position whenever the component re-renders
  // (e.g. when switching tabs), creating a visible gap.
  const initialContentOffset = useRef(
    isIOS ? { x: 0, y: -topInset } : undefined,
  ).current;

  const contentStyle = useMemo(
    () => ({
      // На iOS используем contentInset вместо paddingTop — иначе
      // RefreshControl-спиннер прячется за FloatingTopBar, а также
      // после pull-to-refresh может оставаться «призрачный» отступ.
      paddingTop: isIOS ? 0 : topInset,
      paddingBottom: insets.bottom + TAB_BAR_HEIGHT + Spacing.md,
    }),
    [insets.bottom, topInset, isIOS],
  );

  // Banner indices for employee schedules: starting at upcomingIndex, every 3 days with lessons.
  const bannerSectionIndices = useMemo(() => {
    if (entityType !== 'employee') return new Set<number>();
    const start = Math.max(0, upcomingIndex);
    const indices = new Set<number>();
    let count = 0;
    for (let i = start; i < sections.length; i++) {
      const s = sections[i];
      if (!s || s.data.length === 0) continue;
      if (count % 3 === 0) indices.add(i);
      count++;
    }
    return indices;
  }, [entityType, upcomingIndex, sections]);

  const handleTogglePin = useCallback(() => {
    void hapticSuccess();
    if (entityType === 'group') togglePinnedGroup(entityKey);
    else togglePinnedEmployee(entityKey);
  }, [entityType, entityKey, togglePinnedGroup, togglePinnedEmployee]);

  const handleChangeDefaultGroup = useCallback(() => {
    router.push('/(tabs)/(amy)/pick-group');
  }, [router]);

  // Селектор подгруппы только для расписания группы. У преподавателя
  // фильтр по подгруппе не имеет смысла — он ведёт обе.
  const isGroup = entityType === 'group';
  const handleSubgroupChange = useCallback(
    (v: typeof subgroup) => setSubgroup(entityKey, v),
    [entityKey, setSubgroup],
  );

  const scrollToSection = useCallback(
    (sectionIndex: number, animated = true) => {
      if (sections.length === 0) return;
      const opts = {
        sectionIndex,
        itemIndex: 0,
        animated,
        viewPosition: 0 as const,
        viewOffset: topInset,
      };
      listRef.current?.scrollToLocation(opts);
      // scrollToLocation без getItemLayout оценивает позицию приблизительно —
      // повторный вызов после завершения первой анимации «дотягивает» до цели.
      setTimeout(() => listRef.current?.scrollToLocation(opts), 350);
    },
    [sections.length, topInset],
  );

  const handleScrollToExams = useCallback(() => {
    if (!hasExams) return;
    scrollToSection(firstExamSectionIndex);
  }, [hasExams, firstExamSectionIndex, scrollToSection]);

  const handleScrollToSchedule = useCallback(() => {
    if (regularSections.length === 0) return;
    const targetIndex = upcomingIndex >= 0 && upcomingIndex < regularSections.length
      ? upcomingIndex
      : 0;
    scrollToSection(targetIndex);
  }, [regularSections.length, upcomingIndex, scrollToSection]);

  const handleScrollToToday = useCallback(() => {
    if (upcomingIndex < 0) return;
    scrollToSection(upcomingIndex);
  }, [upcomingIndex, scrollToSection]);

  // ───── Date Picker ─────
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerInitialDate, setDatePickerInitialDate] = useState(today);

  const scrollToDate = useCallback(
    (target: Date) => {
      if (sections.length === 0) return;
      const targetTime = target.getTime();
      let bestIndex = -1;
      for (let i = 0; i < sections.length; i++) {
        const s = sections[i];
        if (!s) continue;
        if (s.date.getTime() >= targetTime) {
          bestIndex = i;
          break;
        }
        bestIndex = i;
      }
      if (bestIndex < 0) return;
      scrollToSection(bestIndex);
    },
    [sections, scrollToSection],
  );

  const handleDatePickerChange = useCallback(
    (_event: DateTimePickerEvent, selected?: Date) => {
      // On Android the picker auto-dismisses on select/cancel.
      if (Platform.OS === 'android') setDatePickerVisible(false);
      if (!selected) return;
      const target = startOfLocalDay(selected);
      scrollToDate(target);
    },
    [scrollToDate],
  );

  const handleDatePickerDismiss = useCallback(() => {
    setDatePickerVisible(false);
  }, []);

  // Date range for the picker — bounded by schedule sections.
  const datePickerMinDate = sections[0]?.date;
  const datePickerMaxDate = sections[sections.length - 1]?.date;

  /** True если данная пара актуальна для выбранной подгруппы. */
  const isMineSubgroup = useCallback(
    (numSubgroup: number): boolean => {
      if (subgroup === 0) return true; // «Все» — всегда «моя»
      if (numSubgroup === 0) return true; // общая пара — всегда «моя»
      return numSubgroup === subgroup;
    },
    [subgroup],
  );

  // Счётчик для принудительной перемерки секций после смены подгруппы
  // или набора секций (hidePastLessons toggle): карточки меняют высоту /
  // состав, сдвигая заголовки ниже.
  const [measureKey, setMeasureKey] = useState(0);
  const prevSubgroupRef = useRef(subgroup);
  const prevSectionsLenRef = useRef(sections.length);
  useEffect(() => {
    const changed =
      prevSubgroupRef.current !== subgroup ||
      prevSectionsLenRef.current !== sections.length;
    if (changed) {
      prevSubgroupRef.current = subgroup;
      prevSectionsLenRef.current = sections.length;
      sectionOffsetsRef.current.clear();
      setMeasureKey((k) => k + 1);
    }
  }, [subgroup, sections.length]);

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

  const handleDatePress = useCallback(() => {
    void hapticLight();
    setDatePickerInitialDate(topSection?.date ?? today);
    setDatePickerVisible(true);
  }, [topSection?.date, today]);

  const sectionsRef = useRef(sections);
  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  // Обновляем функцию скролла к выбранной паре (использует актуальные sections).
  scrollToLessonFnRef.current = (lesson: NormalizedLesson) => {
    for (let si = 0; si < sections.length; si++) {
      const section = sections[si];
      if (!section) continue;
      const ii = section.data.findIndex((l) => l.key === lesson.key);
      if (ii >= 0) {
        setTimeout(() => {
          try {
            listRef.current?.scrollToLocation({
              sectionIndex: si,
              itemIndex: ii,
              viewPosition: 0.4,
              animated: true,
            });
          } catch { /* unmounted */ }
        }, 50);
        return;
      }
    }
  };

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
  const currentScrollYRef = useRef<number>(isIOS ? -topInset : 0);
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
    const threshold = currentScrollYRef.current + topInset + 48;
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

  if (regularSections.length === 0 && examSections.length === 0) {
    return (
      <View style={styles.container}>
        <FloatingTopBar
          pinned={isPinned}
          onTogglePin={handleTogglePin}
          subgroup={subgroup}
          onSubgroupChange={handleSubgroupChange}
          title={title}
          avatarUri={avatarUri}
          onAvatarPress={handleAvatarPress}
          isDefaultSchedule={isDefaultSchedule}
          defaultGroupName={isDefaultSchedule ? defaultLabel : undefined}
          onChangeDefaultGroup={isDefaultSchedule ? handleChangeDefaultGroup : undefined}
        />
        <View style={styles.center}>
          <Text style={styles.empty}>{t('schedule.notFound')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      onStartShouldSetResponderCapture={() => {
        if (sheetOpenRef.current) {
          sheetOpenRef.current = false;
          pendingLessonRef.current = null;
          sheetRef.current?.dismiss();
        }
        return false;
      }}
    >
      <SectionList
        ref={listRef as never}
        sections={sections}
        keyExtractor={(item) => `${item.key}_${blockedSet.has(buildLessonBlockId(item)) ? 'b' : 'u'}`}
        extraData={`${subgroup}:${blockedList.length}`}
        // Native sticky выключен — «текущий день» показываем в FloatingTopBar.
        stickySectionHeadersEnabled={false}
        contentContainerStyle={contentStyle}
        initialNumToRender={20}
        windowSize={11}
        // На iOS contentInset сдвигает контент вниз, а RefreshControl-спиннер
        // показывается ниже FloatingTopBar, а не за ним.
        contentInset={isIOS ? { top: topInset } : undefined}
        contentOffset={initialContentOffset}
        scrollIndicatorInsets={isIOS ? { top: topInset } : undefined}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={handleScrollBeginDrag}
        renderSectionHeader={({ section }) => {
          const s = section as ScheduleSection;
          const isFirstExam = hasExams && s === examSections[0];
          return (
            <>
              {isFirstExam && regularSections.length > 0 && (
                <ExamsSeparator Palette={Palette} />
              )}
              <MeasuredDayHeader
                section={s}
                today={today}
                onMeasure={measureSection}
                measureKey={measureKey}
                holidayName={findHolidayName(toDateISO(s.date), holidays) ?? undefined}
              />
            </>
          );
        }}
        renderSectionFooter={({ section }) => {
          const idx = sections.indexOf(section as ScheduleSection);
          if (!bannerSectionIndices.has(idx)) return null;
          return (
            <View style={styles.scheduleBannerWrap}>
              <UnityBanner />
            </View>
          );
        }}
        renderItem={({ item }) => (
          <LessonCard
            lesson={item}
            compact={!isMineSubgroup(item.raw.numSubgroup)}
            blocked={isLessonBlocked(item)}
            entityType={entityType}
            timeStatus={
              isSameDay(item.date, today)
                ? getLessonTimeStatus(item, now)
                : item.isPast
                  ? { kind: 'past' as const }
                  : null
            }
            onPress={() => handleLessonPress(item)}
          />
        )}
        onScrollToIndexFailed={(info) => {
          // Jump close to the target so it gets rendered, then retry.
          const approxOffset = info.averageItemLength * info.index;
          const scrollResponder = (listRef.current as unknown as {
            getScrollResponder?: () => {
              scrollTo?: (opts: { y: number; animated: boolean }) => void;
            } | null;
          })?.getScrollResponder?.();
          scrollResponder?.scrollTo?.({ y: approxOffset, animated: false });
          setTimeout(() => {
            listRef.current?.scrollToLocation({
              sectionIndex: Math.min(info.index, sections.length - 1),
              itemIndex: 0,
              animated: false,
              viewPosition: 0,
              viewOffset: topInset,
            });
          }, 100);
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
        subgroup={subgroup}
        onSubgroupChange={handleSubgroupChange}
        currentDate={topSection?.date}
        isCurrentDateToday={topSection ? isSameDay(topSection.date, today) : false}
        isCurrentDateTomorrow={topSection ? isSameDay(topSection.date, addDays(today, 1)) : false}
        showTodayButton={
          !!topSection && upcomingIndex >= 0 && (
            // В прошлом (старые пары видны только когда hidePastLessons выключен)
            topSection.date.getTime() < today.getTime() ||
            // На экзаменах
            !!topSection.isExam
          )
        }
        onScrollToToday={handleScrollToToday}
        showExamsButton={hasExams && regularSections.length > 0 && !topSection?.isExam && (topSection?.date.getTime() ?? 0) >= today.getTime()}
        onScrollToExams={handleScrollToExams}
        title={title}
        avatarUri={avatarUri}
        onAvatarPress={handleAvatarPress}
        isDefaultSchedule={isDefaultSchedule}
        defaultGroupName={isDefaultSchedule ? defaultLabel : undefined}
        onChangeDefaultGroup={isDefaultSchedule ? handleChangeDefaultGroup : undefined}
        onDatePress={handleDatePress}
      />
      {/* Date Picker */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={datePickerVisible}
          transparent
          animationType="fade"
          onRequestClose={handleDatePickerDismiss}
        >
          <Pressable style={styles.datePickerBackdrop} onPress={handleDatePickerDismiss}>
            <Pressable style={styles.datePickerSheet}>
              <DateTimePicker
                value={datePickerInitialDate}
                mode="date"
                display="inline"
                minimumDate={datePickerMinDate}
                maximumDate={datePickerMaxDate}
                onChange={handleDatePickerChange}
                locale="ru-RU"
                accentColor={Palette.accent}
              />
              <Pressable style={styles.datePickerDone} onPress={handleDatePickerDismiss}>
                <Text style={styles.datePickerDoneText}>{t('common.done')}</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      ) : (
        datePickerVisible && (
          <DateTimePicker
            value={datePickerInitialDate}
            mode="date"
            display="default"
            minimumDate={datePickerMinDate}
            maximumDate={datePickerMaxDate}
            onChange={handleDatePickerChange}
          />
        )
      )}
      <LessonDetailsSheet
        ref={sheetRef}
        lesson={selectedLesson}
        currentWeek={currentWeek}
        entityType={entityType}
        onDismiss={handleSheetDismiss}
        onChange={handleSheetChange}
        isBlocked={selectedLesson ? isLessonBlocked(selectedLesson) : false}
        onToggleBlock={selectedLesson ? () => {
          toggleBlockedLesson(entityKey, buildLessonBlockId(selectedLesson));
        } : undefined}
      />
      {avatarUri ? (
        <Modal
          visible={fullscreenPhoto}
          transparent
          animationType="fade"
          onRequestClose={() => setFullscreenPhoto(false)}
        >
          <Pressable style={styles.photoBackdrop} onPress={() => setFullscreenPhoto(false)}>
            <Image
              source={avatarUri}
              style={styles.photoFull}
              contentFit="contain"
              cachePolicy="memory-disk"
              accessibilityIgnoresInvertColors
            />
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
};

/** Стабильный ключ секции по её дате (00:00 локального времени). */
const sectionDateKey = (s: ScheduleSection): string => String(s.date.getTime());

interface MeasuredDayHeaderProps {
  section: ScheduleSection;
  today: Date;
  onMeasure(section: ScheduleSection, node: View | null): void;
  /** Changing this value forces a re-measure (e.g. after subgroup switch). */
  measureKey?: number;
  /** Holiday name for this day, if any. */
  holidayName?: string;
}

/**
 * Обёртка над `DayHeader`, которая сообщает родителю свою y-координату в
 * контенте скролла. `collapsable={false}` — чтобы на Android view не схлопнулся
 * в родителя и `measureLayout` мог его найти.
 */
const MeasuredDayHeader = ({ section, today, onMeasure, measureKey, holidayName }: MeasuredDayHeaderProps) => {
  const ref = useRef<View>(null);
  useEffect(() => {
    if (measureKey != null && measureKey > 0) {
      // Subgroup (or other layout-affecting prop) changed — schedule a
      // re-measure after RN completes the layout pass.
      const id = setTimeout(() => onMeasure(section, ref.current), 150);
      return () => clearTimeout(id);
    }
  }, [measureKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View ref={ref} collapsable={false} onLayout={() => onMeasure(section, ref.current)}>
      <DayHeader
        date={section.date}
        week={section.week}
        isToday={isSameDay(section.date, today)}
        isTomorrow={isSameDay(section.date, addDays(today, 1))}
        isExam={section.isExam}
        isPast={section.date.getTime() < today.getTime()}
        holidayName={holidayName}
      />
    </View>
  );
};

interface ExamsSeparatorProps {
  Palette: PaletteType;
}

const ExamsSeparator = ({ Palette }: ExamsSeparatorProps) => {
  const { t } = useTranslation();
  const examIcon = useIconName('exam');
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  return (
    <View style={styles.examsSeparator}>
      <View style={styles.examsSeparatorLine} />
      <View style={styles.examsSeparatorContent}>
        <Ionicons name={examIcon as never} size={14} color={Palette.textSecondary} />
        <Text style={styles.examsSeparatorText}>{t('schedule.exams')}</Text>
      </View>
      <View style={styles.examsSeparatorLine} />
    </View>
  );
};

const makeStyles = (Palette: PaletteType) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  scheduleBannerWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl },
  empty: { color: Palette.textSecondary, textAlign: 'center', fontSize: 15 },
  examsSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  examsSeparatorLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Palette.separator,
  },
  examsSeparatorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  examsSeparatorText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  datePickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerSheet: {
    backgroundColor: Palette.card,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginHorizontal: Spacing.screenPadding,
    width: '90%',
    maxWidth: 380,
  },
  datePickerDone: {
    alignSelf: 'flex-end',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.md,
  },
  datePickerDoneText: {
    fontSize: 17,
    fontWeight: '600',
    color: Palette.accent,
  },
  photoBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoFull: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').width,
  },
});
