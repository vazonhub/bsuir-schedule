import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScheduleError } from '@components/ScheduleError';
import { SkeletonDiary } from '@components/Skeleton';
import { SpotlightOverlay } from '@components/onboarding/SpotlightOverlay';
import { TutorialProvider, useTutorial } from '@components/onboarding/TutorialContext';
import { ScheduleController } from '@controllers/schedule.controller';
import { useIconName } from '@hooks/useAppearance';
import { usePalette } from '@hooks/usePalette';
import { useDiaryStore, selectHidden } from '@stores/diary.store';
import {
  usePreferencesStore,
  selectBlockedLessons,
  selectDiaryOnboardingSeen,
  selectSubgroup,
  waitForHydration,
} from '@stores/preferences.store';
import { useScheduleStore } from '@stores/schedule.store';
import { Radius, Spacing, TAB_BAR_HEIGHT } from '@theme';
import { textProps } from '@theme/typography';
import { extractDiarySubjects } from '@utils/diary';
import type { DiarySubject } from '@utils/diary';

import { DiaryStats } from './DiaryStats';
import { EnterTaskCountSheet } from './EnterTaskCountSheet';
import type { EnterTaskCountSheetRef } from './EnterTaskCountSheet';
import { HiddenSubjectStrip } from './HiddenSubjectStrip';
import { StreakBadge } from './StreakBadge';
import { SubjectCard } from './SubjectCard';

type ListItem =
  | { kind: 'card'; subject: DiarySubject }
  | { kind: 'hiddenHeader' }
  | { kind: 'hidden'; subject: DiarySubject };

type PaletteType = ReturnType<typeof usePalette>;

/**
 * "Diary" — per-subject task tracker for the user's pinned group.
 * Shows only for a pinned group (not employee). Empty states cover:
 *   - no default pinned entity
 *   - default is an employee (feature unsupported)
 */
export const DiaryScreen = () => {
  const defaultGroup = usePreferencesStore((s) => s.defaultGroup);
  const defaultEmployee = usePreferencesStore((s) => s.defaultEmployee);

  if (defaultGroup) return <DiaryForGroup groupName={defaultGroup} />;
  if (defaultEmployee) return <EmployeePinnedState />;
  return <NoPinnedState />;
};

// ─────────────────────────────────────────────────────────────

const DiaryForGroup = ({ groupName }: { groupName: string }) => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  const sheetRef = useRef<EnterTaskCountSheetRef>(null);
  const listRef = useRef<FlatList<ListItem>>(null);
  const scrollOffsetRef = useRef(0);
  const setOnboardingSeen = usePreferencesStore((s) => s.setDiaryOnboardingSeen);

  const schedule = useScheduleStore((s) => s.byKey[groupName]);
  const currentWeek = useScheduleStore((s) => s.currentWeek);
  const isLoading = useScheduleStore((s) => s.loadingKeys[groupName] === true);
  const error = useScheduleStore((s) => s.error);
  const errorKind = useScheduleStore((s) => s.errorKind);

  const subgroup = usePreferencesStore(selectSubgroup(groupName));
  const subgroupIcon = useIconName('subgroup');
  const blocked = usePreferencesStore(selectBlockedLessons(groupName));
  const setTaskCount = useDiaryStore((s) => s.setTaskCount);
  const toggleHidden = useDiaryStore((s) => s.toggleHidden);
  const hiddenList = useDiaryStore(selectHidden(groupName));

  const load = useCallback(() => {
    void ScheduleController.loadCurrentWeek();
    void ScheduleController.loadGroupSchedule(groupName);
  }, [groupName]);

  useEffect(() => {
    load();
  }, [load]);

  const subjects: DiarySubject[] = useMemo(() => {
    if (!schedule || !currentWeek) return [];
    const blockedSet: ReadonlySet<string> = new Set<string>(blocked);
    return extractDiarySubjects(schedule, currentWeek, new Date(), {
      subgroup,
      blockedIds: blockedSet,
    });
  }, [schedule, currentWeek, subgroup, blocked]);

  const { visible, hidden } = useMemo(() => {
    const hiddenSet = new Set(hiddenList);
    const vis: DiarySubject[] = [];
    const hid: DiarySubject[] = [];
    for (const s of subjects) {
      if (hiddenSet.has(s.subject)) hid.push(s);
      else vis.push(s);
    }
    return { visible: vis, hidden: hid };
  }, [subjects, hiddenList]);

  const listData: ListItem[] = useMemo(() => {
    const out: ListItem[] = visible.map((s) => ({ kind: 'card', subject: s }));
    if (hidden.length > 0) {
      out.push({ kind: 'hiddenHeader' });
      for (const s of hidden) out.push({ kind: 'hidden', subject: s });
    }
    return out;
  }, [visible, hidden]);

  const contentContainerStyle = useMemo(
    () => ({
      paddingHorizontal: Spacing.screenPadding,
      paddingTop: Spacing.md,
      paddingBottom: insets.bottom + TAB_BAR_HEIGHT + Spacing.md,
    }),
    [insets.bottom],
  );

  const handleRequestEnterCount = useCallback(
    (subject: string, subjectFullName: string, initial: number | null) => {
      sheetRef.current?.present({ subject, subjectFullName, initial });
    },
    [],
  );

  const handleSubmitCount = useCallback(
    (subject: string, count: number) => {
      setTaskCount(groupName, subject, count);
    },
    [groupName, setTaskCount],
  );

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
  }, []);

  const handleTutorialFinish = useCallback(() => {
    setOnboardingSeen(true);
  }, [setOnboardingSeen]);

  if (!schedule || !currentWeek) {
    if (error && !isLoading) {
      return (
        <SafeAreaView edges={['top']} style={styles.container}>
          <ScheduleError kind={errorKind} onRetry={load} />
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <SkeletonDiary />
      </SafeAreaView>
    );
  }

  if (subjects.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="book-outline" size={56} color={Palette.textTertiary} />
          <Text {...textProps('title')} style={styles.emptyTitle}>
            {t('diary.emptySubjectsTitle')}
          </Text>
          <Text {...textProps('callout')} style={styles.emptySubtitle}>
            {t('diary.emptySubjectsSubtitle')}
          </Text>
        </View>
        <EnterTaskCountSheet ref={sheetRef} onSubmit={handleSubmitCount} />
      </SafeAreaView>
    );
  }

  return (
    <TutorialProvider onFinish={handleTutorialFinish}>
      <View style={styles.root}>
        <SafeAreaView edges={['top']} style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text {...textProps('title')} style={styles.headerTitle}>
                {t('tabs.diary')}
              </Text>
              <View style={styles.subtitleRow}>
                <Text {...textProps('subhead')} style={styles.headerSubtitle} numberOfLines={1}>
                  {groupName}
                </Text>
                {subgroup !== 0 && (
                  <View style={styles.subgroupBadge}>
                    <Text {...textProps('subhead')} style={styles.subgroupNum}>
                      {subgroup}
                    </Text>
                    <Ionicons
                      name={subgroupIcon as never}
                      size={14}
                      color={Palette.textSecondary}
                    />
                  </View>
                )}
              </View>
            </View>
            <StreakBadge />
          </View>
          <FlatList
            ref={listRef}
            data={listData}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            ListHeaderComponent={
              <DiaryStats
                groupName={groupName}
                schedule={schedule}
                currentWeek={currentWeek}
                subgroup={subgroup}
                blocked={blocked}
                subjects={visible}
              />
            }
            keyExtractor={(item) => {
              if (item.kind === 'hiddenHeader') return '__hidden-header';
              return `${item.kind}:${item.subject.subject}`;
            }}
            renderItem={({ item, index }) => {
              if (item.kind === 'card') {
                return (
                  <SubjectCard
                    subject={item.subject}
                    groupName={groupName}
                    onRequestEnterCount={handleRequestEnterCount}
                    isTutorialTarget={index === 0}
                  />
                );
              }
              if (item.kind === 'hiddenHeader') {
                return (
                  <View style={styles.hiddenHeaderWrap}>
                    <Text {...textProps('footnote')} style={styles.hiddenHeader}>
                      {t('diary.hiddenSectionTitle')}
                    </Text>
                  </View>
                );
              }
              return (
                <HiddenSubjectStrip
                  subject={item.subject.subject}
                  subjectFullName={item.subject.subjectFullName}
                  onUnhide={() => toggleHidden(groupName, item.subject.subject)}
                />
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.gap} />}
            contentContainerStyle={contentContainerStyle}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={load}
                tintColor={Palette.textTertiary}
              />
            }
          />
          <EnterTaskCountSheet ref={sheetRef} onSubmit={handleSubmitCount} />
        </SafeAreaView>
        <TutorialRunner
          hasSubjects={visible.length > 0}
          listRef={listRef}
          scrollOffsetRef={scrollOffsetRef}
        />
        <SpotlightOverlay />
      </View>
    </TutorialProvider>
  );
};

// ─────────────────────────────────────────────────────────────

/**
 * Starts the tutorial on the first visit to the diary (after prefs hydration,
 * if there are subjects) and registers a scroller for auto-scrolling to targets.
 * Renders `null` — effects only. Lives inside `TutorialProvider`.
 */
const TutorialRunner = ({
  hasSubjects,
  listRef,
  scrollOffsetRef,
}: {
  hasSubjects: boolean;
  listRef: React.RefObject<FlatList<ListItem> | null>;
  scrollOffsetRef: React.RefObject<number>;
}) => {
  const { active, start, setScroller } = useTutorial();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const seen = usePreferencesStore(selectDiaryOnboardingSeen);
  const [hydrated, setHydrated] = useState(() => usePreferencesStore.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) return;
    let mounted = true;
    void waitForHydration().then(() => {
      if (mounted) setHydrated(true);
    });
    return () => {
      mounted = false;
    };
  }, [hydrated]);

  // Scroller: pulls the target up under the header if it's outside the viewport.
  useEffect(() => {
    setScroller(async (rect) => {
      const desiredY = insets.top + Spacing.xxxl * 3;
      const delta = rect.y - desiredY;
      if (Math.abs(delta) < 8) return;
      const nextOffset = Math.max(0, scrollOffsetRef.current + delta);
      listRef.current?.scrollToOffset({ offset: nextOffset, animated: true });
    });
    return () => setScroller(null);
  }, [setScroller, insets.top, listRef, scrollOffsetRef]);

  // Trigger for the first showing (and a re-run after the flag is reset).
  // Gated on focus — so the tutorial doesn't start while the tab is in the background.
  useEffect(() => {
    if (!isFocused || !hydrated || seen || !hasSubjects || active) return;
    const timer = setTimeout(() => start(), 450);
    return () => clearTimeout(timer);
  }, [isFocused, hydrated, seen, hasSubjects, active, start]);

  return null;
};

// ─────────────────────────────────────────────────────────────

const NoPinnedState = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.center}>
        <Ionicons name="book-outline" size={64} color={Palette.textTertiary} />
        <Text {...textProps('title')} style={styles.emptyTitle}>
          {t('diary.emptyPickTitle')}
        </Text>
        <Text {...textProps('callout')} style={styles.emptySubtitle}>
          {t('diary.emptyPickSubtitle')}
        </Text>
        <Pressable
          onPress={() => router.push('/(tabs)/(amy)/pick-group')}
          style={({ pressed }) => [styles.selectBtn, pressed && styles.selectBtnPressed]}
        >
          <Text {...textProps('body')} style={styles.selectBtnLabel}>
            {t('mySchedule.selectGroup')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────

const EmployeePinnedState = () => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.center}>
        <Ionicons name="information-circle-outline" size={56} color={Palette.textTertiary} />
        <Text {...textProps('title')} style={styles.emptyTitle}>
          {t('diary.employeeUnsupportedTitle')}
        </Text>
        <Text {...textProps('callout')} style={styles.emptySubtitle}>
          {t('diary.employeeUnsupportedSubtitle')}
        </Text>
      </View>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────

const ACCENT_BUTTON_LABEL = '#FFFFFF';

const makeStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    root: { flex: 1 },
    container: { flex: 1, backgroundColor: Palette.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingHorizontal: Spacing.screenPadding,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.md,
    },
    headerText: {
      flex: 1,
      minWidth: 0,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: Palette.textPrimary,
    },
    subtitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      marginTop: 2,
    },
    headerSubtitle: {
      color: Palette.textSecondary,
      flexShrink: 1,
    },
    subgroupBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      flexShrink: 0,
    },
    subgroupNum: {
      color: Palette.textSecondary,
      fontWeight: '600',
    },
    gap: { height: Spacing.cardGap },
    hiddenHeaderWrap: {
      paddingTop: Spacing.xl,
      paddingBottom: Spacing.sectionBottom,
    },
    hiddenHeader: {
      fontSize: 13,
      fontWeight: '700',
      color: Palette.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xxxl,
      gap: Spacing.lg,
    },
    emptyTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: Palette.textPrimary,
      marginTop: Spacing.lg,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: 15,
      color: Palette.textSecondary,
      textAlign: 'center',
      lineHeight: 21,
    },
    selectBtn: {
      marginTop: Spacing.md,
      paddingHorizontal: Spacing.xxl,
      paddingVertical: Spacing.lg,
      borderRadius: Radius.lg,
      backgroundColor: Palette.accent,
    },
    selectBtnPressed: { opacity: 0.7 },
    selectBtnLabel: { color: ACCENT_BUTTON_LABEL, fontSize: 16, fontWeight: '600' },
  });
