import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import type { FlashListRef } from '@shopify/flash-list';
import { useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Image } from 'expo-image';
import { FloatingTopBar } from '@components/FloatingTopBar';
import { UnityBanner } from '@components/UnityBanner';
import { FireController } from '@controllers/fire.controller';
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
import { useDeepLinkStore } from '@stores/deepLink.store';
import { getMergedHolidays, useHolidaysStore } from '@stores/holidays.store';
import { addDays, isSameDay, parseBsuirDate, startOfLocalDay } from '@utils/date';
import { findHolidayName, toDateISO } from '@utils/holidays';
import { buildLessonBlockId, getLessonTimeStatus } from '@utils/lesson';
import {
  buildScheduleRows,
  findUpcomingSectionIndex,
  flattenExams,
  flattenSchedule,
  groupExamsByDay,
  groupLessonsByDay,
} from '@utils/scheduleNormalization';
import type { ScheduleRow, ScheduleSection } from '@utils/scheduleNormalization';

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
  /** Label shown in the FloatingTopBar pill when `isDefaultSchedule` (group name or "Lastname F. M."). */
  defaultLabel?: string;
  /**
   * If provided, scroll to the section containing this date on mount (once).
   * Overrides the default "scroll to nearest upcoming lesson" behaviour.
   * BSUIR-format string: `dd.MM.yyyy`.
   */
  initialScrollDate?: string;
}

const EMPTY_HOLIDAYS: Holiday[] = [];

// Viewability tuned to fire as soon as any sliver of a row enters the viewport —
// we use it only to pick the top-most visible row for the FloatingTopBar date
// label, so eager firing keeps the label in sync while scrolling.
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 1, minimumViewTime: 0 };

// Height of the floating `FloatingTopBar` BELOW the safe area (38pt button + gap).
// Goes into `contentContainerStyle.paddingTop`, into the `viewOffset` of
// programmatic scrolls and into the RefreshControl's `progressViewOffset`. The
// safe area itself (the notch) is given to a separate list wrapper
// (`paddingTop: insets.top`) so the scroll view doesn't slide under the notch —
// otherwise, when returning from another tab, iOS re-adds the safe area on top
// of our padding and the inset doubles.
const BAR_CLEARANCE = 38 + Spacing.lg;

// Bottom clearance under the native tab bar — a STABLE constant from
// `initialWindowMetrics` (window, home indicator) plus the bar height. NOT taken
// from `useSafeAreaInsets`, because on a tab screen its bottom inset "floats":
// on the first frame the bar isn't accounted for yet (too small), and after
// returning from another tab the system re-applies the bar's safe area (too
// big) — hence the inset jumps. The clearance goes into the list wrapper, so
// the scroll view ends ABOVE the bar and there's nothing for the system to re-apply.
const BOTTOM_CLEARANCE = (initialWindowMetrics?.insets.bottom ?? 0) + TAB_BAR_HEIGHT;

// Pre-render ~1.5 screens ahead/behind: fewer "white gaps" during a fast fling
// through a long list (a whole semester is hundreds of rows). FlashList's
// virtualization keeps only a window around the viewport in memory.
const DRAW_DISTANCE = Math.round(Dimensions.get('window').height * 1.5);

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
  initialScrollDate,
}: Props) => {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  const listRef = useRef<FlashListRef<ScheduleRow>>(null);
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

  // Full ФИО shown under the full-screen photo (falls back to the short title).
  const employeeFullName = useMemo(() => {
    const emp = schedule.employeeDto;
    if (emp) {
      const full = [emp.lastName, emp.firstName, emp.middleName].filter(Boolean).join(' ');
      if (full) return full;
    }
    return title ?? null;
  }, [schedule.employeeDto, title]);

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
      // The sheet is already open — update the data (via ref + forceRender)
      // and reset to the initial snap point without a dismiss/present cycle.
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

  // Dismiss the modal when the list starts scrolling.
  const handleScrollBeginDrag = useCallback(() => {
    if (sheetOpenRef.current) {
      pendingLessonRef.current = null;
      sheetRef.current?.dismiss();
    }
  }, []);

  // Viewing the schedule counts as activity for the fire streak
  // (idempotent — at most +1 per school day).
  useEffect(() => {
    FireController.registerScheduleView();
  }, []);

  // Dismiss the modal when leaving the screen (tab switch, back).
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
  // Pin `today` to the date (without time) so grouping/sections aren't
  // recomputed every 30 seconds on each `useNow` tick.
  const today = useMemo(
    () => {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [now.getFullYear(), now.getMonth(), now.getDate()],
  );

  const apiHolidays =
    useHolidaysStore((s) => s.byYear[String(today.getFullYear())]) ?? EMPTY_HOLIDAYS;
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

  // One-off reveal of past lessons from the list (the "Show past" button),
  // even when "hide past lessons" is enabled in settings.
  const [showPastOverride, setShowPastOverride] = useState(false);
  const showAll = !hidePastLessons || showPastOverride;

  // Whether there's anything to "scroll back" to: past is hidden, but the semester started before today.
  const hasPastToReveal = useMemo(() => {
    if (showAll || isExamSession) return false;
    const start = parseBsuirDate(schedule.startDate);
    return !!start && startOfLocalDay(start).getTime() < today.getTime();
  }, [showAll, isExamSession, schedule.startDate, today]);

  const regularSections = useMemo(() => {
    if (isExamSession) return [];
    const flat = flattenSchedule(schedule, currentWeek, today, { showAll });
    return groupLessonsByDay(flat);
  }, [schedule, currentWeek, today, showAll, isExamSession]);

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
    // If there are regular sections — scroll to the nearest day with lessons.
    const idx = findUpcomingSectionIndex(regularSections, today);
    if (idx >= 0) return idx;
    // If there are none but there are exams — scroll to the nearest exam.
    if (hasExams) {
      const examIdx = findUpcomingSectionIndex(examSections, today);
      return examIdx >= 0 ? firstExamSectionIndex + examIdx : 0;
    }
    return -1;
  }, [regularSections, examSections, firstExamSectionIndex, hasExams, today]);

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

  // Flat row stream for FlashList: day header → lessons → (banner),
  // with a one-off separator before the first exam section.
  const examsSeparatorBeforeIndex =
    hasExams && regularSections.length > 0 ? firstExamSectionIndex : undefined;
  const rows = useMemo(
    () => buildScheduleRows(sections, { examsSeparatorBeforeIndex, bannerSectionIndices }),
    [sections, examsSeparatorBeforeIndex, bannerSectionIndices],
  );

  // Header-row index for each section (in section order). Needed so that
  // `scrollToIndex` (which works with the flat index) jumps to the right day.
  const headerRowIndices = useMemo(() => {
    const idx: number[] = [];
    for (let i = 0; i < rows.length; i++) {
      if (rows[i]?.type === 'header') idx.push(i);
    }
    return idx;
  }, [rows]);

  // Reverse mapping: row index → section index. Used in
  // `onViewableItemsChanged` to figure out which day is currently on top.
  const rowToSectionIndex = useMemo(() => {
    const map: number[] = new Array(rows.length).fill(-1);
    let sectionIdx = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i]?.type === 'header') sectionIdx += 1;
      map[i] = sectionIdx;
    }
    return map;
  }, [rows]);

  // Lock Screen widget deep link. When the app is opened from
  // `bsuirtime://lesson?id=<blockId>`, the id is stashed in `deepLinkStore`
  // by `app/_layout.tsx`. Only the default schedule handles it — the blockId
  // is generated against the default group's snapshot.
  const pendingLessonBlockId = useDeepLinkStore((s) => s.pendingLessonBlockId);
  const setPendingLessonBlockId = useDeepLinkStore((s) => s.setPendingLessonBlockId);
  useEffect(() => {
    if (!isDefaultSchedule || !pendingLessonBlockId || sections.length === 0) return;
    for (const section of sections) {
      for (const lesson of section.data) {
        if (buildLessonBlockId(lesson) === pendingLessonBlockId) {
          handleLessonPress(lesson);
          setPendingLessonBlockId(null);
          return;
        }
      }
    }
    // Lesson not found in the currently loaded schedule (stale widget,
    // schedule rebuilt after weeks rolled). Clear anyway to avoid re-firing.
    setPendingLessonBlockId(null);
  }, [
    isDefaultSchedule,
    pendingLessonBlockId,
    sections,
    handleLessonPress,
    setPendingLessonBlockId,
  ]);

  const scheduleIdentity = `${entityKey}:${schedule.startDate}:${schedule.endDate}`;

  // The list wrapper absorbs the top safe area (notch) and the bottom clearance
  // under the tab bar as a STABLE constant, so the scroll view slides under
  // neither the notch nor the tab bar — then the system doesn't "glue on" insets
  // when returning from a tab (neither top nor bottom), and the paddings don't
  // jump. The header is an absolute sibling.
  const listWrapStyle = useMemo(
    () => ({ flex: 1, paddingTop: insets.top, paddingBottom: BOTTOM_CLEARANCE }),
    [insets.top],
  );

  // Inside the scroll view (already between the notch and the tab bar) — only
  // the header gap on top and a small padding at the bottom.
  const contentStyle = useMemo(
    () => ({
      paddingTop: BAR_CLEARANCE,
      paddingBottom: Spacing.md,
    }),
    [],
  );

  // ───── Programmatic scroll (via the flat row index) ─────
  const headerRowIndicesRef = useRef(headerRowIndices);
  useEffect(() => {
    headerRowIndicesRef.current = headerRowIndices;
  }, [headerRowIndices]);

  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const scrollToSection = useCallback((sectionIndex: number, animated = true) => {
    const rowIndex = headerRowIndicesRef.current[sectionIndex];
    if (rowIndex == null) return;
    void listRef.current
      // FlashList v2 ADDS viewOffset to the scroll offset (RN SectionList
      // subtracted it), so a NEGATIVE offset lands the day header just below
      // the floating bar instead of ~2×BAR_CLEARANCE above the viewport.
      ?.scrollToIndex({ index: rowIndex, viewOffset: -BAR_CLEARANCE, viewPosition: 0, animated })
      .catch(() => {
        /* list not laid out yet */
      });
  }, []);

  const jumpToUpcoming = useCallback(
    (animated: boolean) => {
      // `<= 0`: if the nearest day is already first in the list — don't scroll,
      // so we don't hide the list header (the "Show past" button) above it.
      if (upcomingIndex <= 0) return;
      scrollToSection(upcomingIndex, animated);
    },
    [upcomingIndex, scrollToSection],
  );

  // Changing the schedule (or entity) resets the one-off reveal of the past.
  useEffect(() => {
    setShowPastOverride(false);
  }, [scheduleIdentity]);

  const handleShowPast = useCallback(() => {
    void hapticLight();
    setShowPastOverride(true);
  }, []);

  // 1) On the first render / schedule change — jump to the nearest day.
  //    rAF guarantees FlashList has laid out the first viewport.
  useEffect(() => {
    const id = requestAnimationFrame(() => jumpToUpcoming(false));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleIdentity]);

  // 2) When toggling hidePastLessons — jump with a delay for the relayout.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const id = setTimeout(() => jumpToUpcoming(false), 150);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidePastLessons]);

  const handleTogglePin = useCallback(() => {
    void hapticSuccess();
    if (entityType === 'group') togglePinnedGroup(entityKey);
    else togglePinnedEmployee(entityKey);
  }, [entityType, entityKey, togglePinnedGroup, togglePinnedEmployee]);

  const handleChangeDefaultGroup = useCallback(() => {
    router.push('/(tabs)/(amy)/pick-group');
  }, [router]);

  // Subgroup selector only for a group schedule. For a teacher, filtering
  // by subgroup makes no sense — they teach both.
  const handleSubgroupChange = useCallback(
    (v: typeof subgroup) => setSubgroup(entityKey, v),
    [entityKey, setSubgroup],
  );

  const handleScrollToExams = useCallback(() => {
    if (!hasExams) return;
    scrollToSection(firstExamSectionIndex);
  }, [hasExams, firstExamSectionIndex, scrollToSection]);

  const handleScrollToToday = useCallback(() => {
    if (upcomingIndex < 0) return;
    scrollToSection(upcomingIndex);
  }, [upcomingIndex, scrollToSection]);

  // ───── Date Picker ─────
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerInitialDate, setDatePickerInitialDate] = useState(today);

  const sectionsRef = useRef(sections);
  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  const scrollToDate = useCallback(
    (target: Date) => {
      const list = sectionsRef.current;
      if (list.length === 0) return;
      const targetTime = target.getTime();
      let bestIndex = -1;
      for (let i = 0; i < list.length; i++) {
        const s = list[i];
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
    [scrollToSection],
  );

  // Deep-link: caller passed a specific date via `?scrollDate=dd.MM.yyyy`.
  // Fires once per param value — runs after the default "jump to upcoming"
  // effect so it overrides it.
  useEffect(() => {
    if (!initialScrollDate || sections.length === 0) return;
    const target = parseBsuirDate(initialScrollDate);
    if (!target) return;
    const id = setTimeout(() => scrollToDate(target), 250);
    return () => clearTimeout(id);
  }, [initialScrollDate, sections.length, scrollToDate]);

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

  /** True if this lesson is relevant for the selected subgroup. */
  const isMineSubgroup = useCallback(
    (numSubgroup: number): boolean => {
      if (subgroup === 0) return true; // "All" — always "mine"
      if (numSubgroup === 0) return true; // shared lesson — always "mine"
      return numSubgroup === subgroup;
    },
    [subgroup],
  );

  // ───── Current "top" day for the header ─────
  // Sticky day headers are disabled — instead, FloatingTopBar shows the date of
  // the topmost visible section. Source of truth is `onViewableItemsChanged`.
  const [topSection, setTopSection] = useState<ScheduleSection | null>(null);

  const topSectionRef = useRef<ScheduleSection | null>(null);
  useEffect(() => {
    topSectionRef.current = topSection;
  }, [topSection]);

  const rowToSectionRef = useRef(rowToSectionIndex);
  useEffect(() => {
    rowToSectionRef.current = rowToSectionIndex;
  }, [rowToSectionIndex]);

  // On a schedule change, set the "active" section to the nearest future day
  // (or the first available) — the same place we auto-scroll to.
  useEffect(() => {
    if (sections.length === 0) {
      setTopSection(null);
      return;
    }
    const initial = sections[upcomingIndex >= 0 ? upcomingIndex : 0];
    if (initial) setTopSection(initial);
  }, [sections, upcomingIndex]);

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { index: number | null; isViewable: boolean }[] }) => {
      // Take the topmost visible content row (a day header or a lesson),
      // skipping the exams separator and the banner, so the date label shows
      // the correct day at the exams boundary and doesn't "stick" to the banner.
      let minIndex = Infinity;
      for (const token of viewableItems) {
        if (!token.isViewable || typeof token.index !== 'number') continue;
        const row = rowsRef.current[token.index];
        if (!row || (row.type !== 'header' && row.type !== 'lesson')) continue;
        if (token.index < minIndex) minIndex = token.index;
      }
      if (minIndex === Infinity) return;
      const sectionIndex = rowToSectionRef.current[minIndex];
      if (sectionIndex == null || sectionIndex < 0) return;
      const section = sectionsRef.current[sectionIndex];
      if (section && section !== topSectionRef.current) setTopSection(section);
    },
    [],
  );

  const handleDatePress = useCallback(() => {
    void hapticLight();
    setDatePickerInitialDate(topSection?.date ?? today);
    setDatePickerVisible(true);
  }, [topSection?.date, today]);

  // Refresh the scroll-to-selected-lesson function (uses the up-to-date rows).
  scrollToLessonFnRef.current = (lesson: NormalizedLesson) => {
    const idx = rowsRef.current.findIndex(
      (r) => r.type === 'lesson' && r.lesson.key === lesson.key,
    );
    if (idx < 0) return;
    setTimeout(() => {
      void listRef.current
        ?.scrollToIndex({
          index: idx,
          viewOffset: -BAR_CLEARANCE,
          viewPosition: 0.4,
          animated: true,
        })
        .catch(() => {
          /* unmounted */
        });
    }, 50);
  };

  const renderItem = useCallback(
    ({ item }: { item: ScheduleRow }) => {
      switch (item.type) {
        case 'examsSeparator':
          return <ExamsSeparator Palette={Palette} />;
        case 'header': {
          const s = item.section;
          return (
            <DayHeader
              date={s.date}
              week={s.week}
              isToday={isSameDay(s.date, today)}
              isTomorrow={isSameDay(s.date, addDays(today, 1))}
              isExam={s.isExam}
              isPast={s.date.getTime() < today.getTime()}
              holidayName={findHolidayName(toDateISO(s.date), holidays) ?? undefined}
            />
          );
        }
        case 'lesson': {
          const l = item.lesson;
          return (
            <LessonCard
              lesson={l}
              compact={!isMineSubgroup(l.raw.numSubgroup)}
              blocked={isLessonBlocked(l)}
              entityType={entityType}
              timeStatus={
                isSameDay(l.date, today)
                  ? getLessonTimeStatus(l, now)
                  : l.isPast
                    ? { kind: 'past' as const }
                    : null
              }
              onPress={() => handleLessonPress(l)}
            />
          );
        }
        case 'banner':
          return (
            <View style={styles.scheduleBannerWrap}>
              <UnityBanner />
            </View>
          );
      }
    },
    [
      Palette,
      today,
      holidays,
      isMineSubgroup,
      isLessonBlocked,
      entityType,
      now,
      handleLessonPress,
      styles,
    ],
  );

  const keyExtractor = useCallback((item: ScheduleRow) => item.key, []);
  // Encode the visual variant of a lesson (full / compact / blocked) in the
  // recycle type. Otherwise FlashList reuses one pool for all lessons and, on
  // Android, a recycled cell keeps a stale height when a full card is reused as
  // a compact one (or vice versa) — the "all pairs vanish except subgroup ones"
  // bug when switching subgroup or fling-scrolling.
  const getItemType = useCallback(
    (item: ScheduleRow) => {
      if (item.type !== 'lesson') return item.type;
      const l = item.lesson;
      if (isLessonBlocked(l)) return 'lesson-blocked';
      if (!isMineSubgroup(l.raw.numSubgroup)) return 'lesson-compact';
      return 'lesson';
    },
    [isLessonBlocked, isMineSubgroup],
  );

  // extraData: forces FlashList to re-render visible rows when the subgroup /
  // blocked set / time tick changes (progress of the ongoing lesson).
  const extraData = `${subgroup}:${blockedList.length}:${now.getTime()}`;

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
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.center, listWrapStyle]}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Palette.textTertiary}
                progressViewOffset={BAR_CLEARANCE}
              />
            ) : undefined
          }
        >
          <Text style={styles.empty}>{t('schedule.notFound')}</Text>
          {onRefresh ? <Text style={styles.emptyHint}>{t('schedule.notFoundHint')}</Text> : null}
        </ScrollView>
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
      <View style={listWrapStyle}>
        <FlashList
          ref={listRef}
          data={rows}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemType={getItemType}
          extraData={extraData}
          drawDistance={DRAW_DISTANCE}
          contentContainerStyle={contentStyle}
          ListHeaderComponent={
            hasPastToReveal ? (
              <LoadPastButton
                label={t('schedule.showPast')}
                onPress={handleShowPast}
                Palette={Palette}
              />
            ) : undefined
          }
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={VIEWABILITY_CONFIG}
          onScrollBeginDrag={handleScrollBeginDrag}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Palette.textTertiary}
                progressViewOffset={BAR_CLEARANCE}
              />
            ) : undefined
          }
        />
      </View>
      <FloatingTopBar
        pinned={isPinned}
        onTogglePin={handleTogglePin}
        subgroup={subgroup}
        onSubgroupChange={handleSubgroupChange}
        currentDate={topSection?.date}
        isCurrentDateToday={topSection ? isSameDay(topSection.date, today) : false}
        isCurrentDateTomorrow={topSection ? isSameDay(topSection.date, addDays(today, 1)) : false}
        showTodayButton={
          !!topSection &&
          upcomingIndex >= 0 &&
          // In the past (old lessons are visible only when hidePastLessons is off)
          (topSection.date.getTime() < today.getTime() ||
            // On exams
            !!topSection.isExam)
        }
        onScrollToToday={handleScrollToToday}
        showExamsButton={
          hasExams &&
          regularSections.length > 0 &&
          !topSection?.isExam &&
          (topSection?.date.getTime() ?? 0) >= today.getTime()
        }
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
        onToggleBlock={
          selectedLesson
            ? () => {
                toggleBlockedLesson(entityKey, buildLessonBlockId(selectedLesson));
              }
            : undefined
        }
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
            {employeeFullName ? <Text style={styles.photoCaption}>{employeeFullName}</Text> : null}
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
};

interface LoadPastButtonProps {
  label: string;
  onPress(): void;
  Palette: PaletteType;
}

/** List header: one-off reveal of past lessons when they're hidden by the setting. */
const LoadPastButton = ({ label, onPress, Palette }: LoadPastButtonProps) => {
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.loadPastBtn, pressed && styles.loadPastBtnPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name="chevron-up" size={16} color={Palette.accent} />
      <Text style={styles.loadPastText}>{label}</Text>
    </Pressable>
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

const DATE_PICKER_BACKDROP_BG = 'rgba(0,0,0,0.4)';
const PHOTO_BACKDROP_BG = 'rgba(0,0,0,0.9)';
const PHOTO_CAPTION_COLOR = '#FFFFFF';

const makeStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: Palette.background },
    flex: { flex: 1 },
    scheduleBannerWrap: {
      alignItems: 'center',
      paddingVertical: Spacing.md,
    },
    loadPastBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      alignSelf: 'center',
      marginTop: Spacing.sm,
      marginBottom: Spacing.md,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      borderRadius: Radius.pill,
      backgroundColor: Palette.card,
    },
    loadPastBtnPressed: { backgroundColor: Palette.cardPressed },
    loadPastText: {
      fontSize: 14,
      fontWeight: '600',
      color: Palette.accent,
    },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl },
    empty: { color: Palette.textSecondary, textAlign: 'center', fontSize: 15 },
    emptyHint: {
      color: Palette.textTertiary,
      textAlign: 'center',
      fontSize: 13,
      marginTop: Spacing.sm,
    },
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
      backgroundColor: DATE_PICKER_BACKDROP_BG,
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
      backgroundColor: PHOTO_BACKDROP_BG,
      justifyContent: 'center',
      alignItems: 'center',
    },
    photoFull: {
      width: Dimensions.get('window').width,
      height: Dimensions.get('window').width,
    },
    photoCaption: {
      marginTop: Spacing.xl,
      paddingHorizontal: Spacing.xl,
      color: PHOTO_CAPTION_COLOR,
      fontSize: 17,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
