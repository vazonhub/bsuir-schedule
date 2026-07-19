import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchBar } from '@components/SearchBar';
import { UnityBanner } from '@components/UnityBanner';
import { SkeletonGroupsList, SkeletonEmployeesList } from '@components/Skeleton';
import { useReduceMotion } from '@hooks/useAccessibility';
import { EmployeesController } from '@controllers/employees.controller';
import { GroupsController } from '@controllers/groups.controller';
import { useEmployeeSearch } from '@hooks/useEmployeeSearch';
import { useGroupSearch } from '@hooks/useGroupSearch';
import { useIsDark, usePalette } from '@hooks/usePalette';
import { useEmployeesStore } from '@stores/employees.store';
import { useGroupsStore } from '@stores/groups.store';
import { usePreferencesStore } from '@stores/preferences.store';
import { Spacing, TAB_BAR_HEIGHT } from '@theme';
import { textProps } from '@theme/typography';
import { PINNED_SECTION_KEY, buildPinnedSection, groupByFaculty } from '@utils/groupGrouping';
import {
  PINNED_SECTION_KEY as PINNED_EMP_KEY,
  buildAlphabetSections,
  buildPinnedEmployeeSection,
} from '@utils/employeeGrouping';

import { EmployeeRow } from '@views/employees/EmployeeRow';
import { GroupRow } from '@views/groups/GroupRow';
import { SectionHeader } from '@views/groups/SectionHeader';

type PaletteType = ReturnType<typeof usePalette>;
type ScheduleTab = 'groups' | 'employees';

const SCREEN_WIDTH = Dimensions.get('window').width;

const SEGMENT_ACTIVE_FONT_DARK = '#FFFFFF';
const SEGMENT_ACTIVE_FONT_LIGHT = '#000000';
const PHOTO_BACKDROP_BG = 'rgba(0,0,0,0.9)';

const segmentFontStyles = StyleSheet.create({
  activeDark: { color: SEGMENT_ACTIVE_FONT_DARK },
  activeLight: { color: SEGMENT_ACTIVE_FONT_LIGHT },
});

/**
 * Combined tab that lets the user browse groups and employees to open a
 * schedule. Segmented control at the top switches between the two lists
 * with the same animation as the picker in the "My" tab.
 */
export const ScheduleTabScreen = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  const isDark = useIsDark();
  const reduceMotion = useReduceMotion();
  const [activeTab, setActiveTab] = useState<ScheduleTab>('groups');
  const [slideAnim] = useState(() => new Animated.Value(0));

  const switchTab = useCallback(
    (tab: ScheduleTab) => {
      if (tab === activeTab) return;
      setActiveTab(tab);
      const toValue = tab === 'groups' ? 0 : 1;
      if (reduceMotion) {
        slideAnim.setValue(toValue);
      } else {
        Animated.spring(slideAnim, {
          toValue,
          useNativeDriver: true,
          friction: 26,
          tension: 170,
        }).start();
      }
    },
    [activeTab, slideAnim, reduceMotion],
  );

  // ─── Groups ───
  const groups = useGroupsStore((s) => s.items);
  const groupsLoading = useGroupsStore((s) => s.isLoading);
  const pinnedGroupNames = usePreferencesStore((s) => s.pinnedGroups);
  const {
    query: groupQuery,
    setQuery: setGroupQuery,
    isSearching: isGroupSearching,
    filtered: filteredGroups,
  } = useGroupSearch(groups);

  const groupSections = useMemo(() => {
    const pinnedSet = new Set(pinnedGroupNames);
    const remaining = groups.filter((g) => !pinnedSet.has(g.name));
    const facultySections = groupByFaculty(remaining);
    const pinned = buildPinnedSection(groups, pinnedGroupNames);
    return pinned ? [pinned, ...facultySections] : facultySections;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, pinnedGroupNames, i18n.language]);

  // ─── Employees ───
  const employees = useEmployeesStore((s) => s.items);
  const employeesLoading = useEmployeesStore((s) => s.isLoading);
  const pinnedEmployeeIds = usePreferencesStore((s) => s.pinnedEmployees);
  const {
    query: empQuery,
    setQuery: setEmpQuery,
    isSearching: isEmpSearching,
    filtered: filteredEmployees,
  } = useEmployeeSearch(employees);
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null);

  const employeeSections = useMemo(() => {
    const pinned = buildPinnedEmployeeSection(employees, pinnedEmployeeIds);
    const alphabet = buildAlphabetSections(employees, pinnedEmployeeIds);
    return pinned ? [pinned, ...alphabet] : alphabet;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, pinnedEmployeeIds, i18n.language]);

  const listContent = useMemo(
    () => ({
      paddingTop: Spacing.md,
      paddingBottom: insets.bottom + TAB_BAR_HEIGHT + Spacing.md,
    }),
    [insets.bottom],
  );

  useEffect(() => {
    void GroupsController.loadAll();
    void EmployeesController.loadAll();
  }, []);

  const handleGroupPress = useCallback(
    (groupName: string) => {
      router.push({
        pathname: '/(tabs)/(schedule)/group/[name]',
        params: { name: groupName },
      });
    },
    [router],
  );

  const handleEmployeePress = useCallback(
    (urlId: string, fio: string) => {
      router.push({
        pathname: '/(tabs)/(schedule)/employee/[urlId]',
        params: { urlId, fio },
      });
    },
    [router],
  );

  const handleRefreshGroups = useCallback(() => {
    void GroupsController.loadAll();
  }, []);

  const handleRefreshEmployees = useCallback(() => {
    void EmployeesController.loadAll();
  }, []);

  const isGroupsInitialLoading = groupsLoading && groups.length === 0;
  const isEmployeesInitialLoading = employeesLoading && employees.length === 0;

  const groupsRefreshControl = (
    <RefreshControl
      refreshing={groupsLoading && groups.length > 0}
      onRefresh={handleRefreshGroups}
      tintColor={Palette.textTertiary}
    />
  );

  const employeesRefreshControl = (
    <RefreshControl
      refreshing={employeesLoading && employees.length > 0}
      onRefresh={handleRefreshEmployees}
      tintColor={Palette.textTertiary}
    />
  );

  const renderGroupRow = ({ item }: { item: (typeof groups)[number] }) => (
    <GroupRow group={item} onPress={() => handleGroupPress(item.name)} />
  );

  const renderEmployeeRow = ({ item }: { item: (typeof employees)[number] }) => (
    <EmployeeRow
      employee={item}
      onPress={() =>
        handleEmployeePress(
          item.urlId,
          item.fio ??
            `${item.lastName} ${item.firstName?.[0] ?? ''}.${
              item.middleName?.[0] ? item.middleName[0] + '.' : ''
            }`,
        )
      }
      onPhotoPress={setFullscreenPhoto}
    />
  );

  const groupsTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -SCREEN_WIDTH],
  });
  const employeesTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_WIDTH, 0],
  });
  const groupsOpacity = slideAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.3, 0],
  });
  const employeesOpacity = slideAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.3, 1],
  });

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Text {...textProps('title')} style={styles.headerTitle}>
          {t('tabs.schedule')}
        </Text>
      </View>
      <View style={styles.segmentWrapper}>
        <SegmentedControl
          values={[t('groups.pickerTabGroups'), t('groups.pickerTabEmployees')]}
          selectedIndex={activeTab === 'groups' ? 0 : 1}
          onChange={(e) => {
            const tab = e.nativeEvent.selectedSegmentIndex === 0 ? 'groups' : 'employees';
            switchTab(tab);
          }}
          fontStyle={{ color: Palette.textPrimary }}
          activeFontStyle={isDark ? segmentFontStyles.activeDark : segmentFontStyles.activeLight}
          appearance={isDark ? 'dark' : 'light'}
        />
      </View>

      <View style={styles.contentContainer}>
        {/* Groups pane */}
        <Animated.View
          style={[
            styles.pane,
            { transform: [{ translateX: groupsTranslateX }], opacity: groupsOpacity },
          ]}
          pointerEvents={activeTab === 'groups' ? 'auto' : 'none'}
        >
          {isGroupsInitialLoading ? (
            <SkeletonGroupsList />
          ) : (
            <>
              <SearchBar
                value={groupQuery}
                onChange={setGroupQuery}
                placeholder={t('groups.searchPlaceholder')}
              />
              {isGroupSearching ? (
                <FlatList
                  data={filteredGroups}
                  keyExtractor={(g) => String(g.id)}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  contentContainerStyle={
                    filteredGroups.length === 0 ? styles.emptyContent : listContent
                  }
                  renderItem={renderGroupRow}
                  refreshControl={groupsRefreshControl}
                  ListEmptyComponent={
                    <View style={styles.center}>
                      <Text {...textProps('body')} style={styles.empty}>
                        {t('common.nothingFound')}
                      </Text>
                    </View>
                  }
                />
              ) : (
                <SectionList
                  sections={groupSections}
                  keyExtractor={(g) => String(g.id)}
                  stickySectionHeadersEnabled
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  contentContainerStyle={listContent}
                  renderSectionHeader={({ section }) => (
                    <SectionHeader
                      abbrev={section.facultyAbbrev}
                      name={section.facultyName}
                      pinned={section.key === PINNED_SECTION_KEY}
                    />
                  )}
                  renderSectionFooter={({ section }) =>
                    section.key === PINNED_SECTION_KEY ? (
                      <View style={styles.bannerWrap}>
                        <UnityBanner />
                      </View>
                    ) : null
                  }
                  renderItem={renderGroupRow}
                  refreshControl={groupsRefreshControl}
                />
              )}
            </>
          )}
        </Animated.View>

        {/* Employees pane */}
        <Animated.View
          style={[
            styles.pane,
            { transform: [{ translateX: employeesTranslateX }], opacity: employeesOpacity },
          ]}
          pointerEvents={activeTab === 'employees' ? 'auto' : 'none'}
        >
          {isEmployeesInitialLoading ? (
            <SkeletonEmployeesList />
          ) : (
            <>
              <SearchBar
                value={empQuery}
                onChange={setEmpQuery}
                placeholder={t('employees.searchPlaceholder')}
              />
              {isEmpSearching ? (
                <FlatList
                  data={filteredEmployees}
                  keyExtractor={(e) => String(e.id)}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  contentContainerStyle={
                    filteredEmployees.length === 0 ? styles.emptyContent : listContent
                  }
                  renderItem={renderEmployeeRow}
                  refreshControl={employeesRefreshControl}
                  ListEmptyComponent={
                    <View style={styles.center}>
                      <Text {...textProps('body')} style={styles.empty}>
                        {t('common.nothingFound')}
                      </Text>
                    </View>
                  }
                />
              ) : (
                <SectionList
                  sections={employeeSections}
                  keyExtractor={(e) => String(e.id)}
                  stickySectionHeadersEnabled
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  contentContainerStyle={listContent}
                  renderSectionHeader={({ section }) => (
                    <View style={styles.sectionHeader}>
                      {section.key === PINNED_EMP_KEY && (
                        <Ionicons name="star" size={13} color={Palette.accent} />
                      )}
                      <Text {...textProps('footnote')} style={styles.sectionTitle}>
                        {section.title}
                      </Text>
                    </View>
                  )}
                  renderSectionFooter={({ section }) =>
                    section.key === PINNED_EMP_KEY ? (
                      <View style={styles.bannerWrap}>
                        <UnityBanner />
                      </View>
                    ) : null
                  }
                  renderItem={renderEmployeeRow}
                  refreshControl={employeesRefreshControl}
                />
              )}
            </>
          )}
        </Animated.View>
      </View>

      <Modal
        visible={fullscreenPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenPhoto(null)}
      >
        <Pressable style={styles.photoBackdrop} onPress={() => setFullscreenPhoto(null)}>
          <Image
            source={fullscreenPhoto ?? undefined}
            style={styles.photoFull}
            contentFit="contain"
            cachePolicy="memory-disk"
            accessibilityIgnoresInvertColors
          />
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const makeStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: Palette.background },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xxxl,
    },
    emptyContent: { flexGrow: 1 },
    empty: { color: Palette.textSecondary, textAlign: 'center' },
    header: {
      paddingHorizontal: Spacing.screenPadding,
      paddingTop: Spacing.md,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: Palette.textPrimary,
    },
    segmentWrapper: {
      paddingHorizontal: Spacing.screenPadding,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.md,
    },
    contentContainer: {
      flex: 1,
      overflow: 'hidden',
    },
    pane: {
      ...StyleSheet.absoluteFillObject,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.cardPaddingX + Spacing.screenPadding - 8,
      paddingTop: Spacing.sectionTop,
      paddingBottom: Spacing.sectionBottom,
      backgroundColor: Palette.background,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: Palette.textPrimary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    bannerWrap: {
      alignItems: 'center',
      paddingVertical: Spacing.md,
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
  });
