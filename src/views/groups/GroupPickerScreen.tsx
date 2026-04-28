import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassButton } from '@components/GlassButton';
import { SearchBar } from '@components/SearchBar';
import { SkeletonGroupsList, SkeletonEmployeesList } from '@components/Skeleton';
import { useReduceMotion } from '@hooks/useAccessibility';
import { hapticSuccess } from '@utils/haptics';
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
  buildAllEmployeesSection,
  buildPinnedEmployeeSection,
} from '@utils/employeeGrouping';

import { EmployeeRow } from '@views/employees/EmployeeRow';
import { GroupRow } from './GroupRow';
import { SectionHeader } from './SectionHeader';

type PaletteType = ReturnType<typeof usePalette>;
type PickerTab = 'groups' | 'employees';

const SCREEN_WIDTH = Dimensions.get('window').width;

/**
 * Schedule picker — allows user to select a default group or employee
 * for the "Моё" tab. Segmented control at the top switches between
 * groups list and employees list.
 */
export const GroupPickerScreen = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  const isDark = useIsDark();
  const reduceMotion = useReduceMotion();
  const [activeTab, setActiveTab] = useState<PickerTab>('groups');
  const slideAnim = useRef(new Animated.Value(0)).current;

  const switchTab = useCallback((tab: PickerTab) => {
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
  }, [activeTab, slideAnim, reduceMotion]);

  // ─── Groups ───
  const groups = useGroupsStore((s) => s.items);
  const groupsLoading = useGroupsStore((s) => s.isLoading);
  const setDefaultGroup = usePreferencesStore((s) => s.setDefaultGroup);
  const pinnedGroupNames = usePreferencesStore((s) => s.pinnedGroups);
  const { query: groupQuery, setQuery: setGroupQuery, isSearching: isGroupSearching, filtered: filteredGroups } = useGroupSearch(groups);

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
  const setDefaultEmployee = usePreferencesStore((s) => s.setDefaultEmployee);
  const pinnedEmployeeIds = usePreferencesStore((s) => s.pinnedEmployees);
  const { query: empQuery, setQuery: setEmpQuery, isSearching: isEmpSearching, filtered: filteredEmployees } = useEmployeeSearch(employees);

  const employeeSections = useMemo(() => {
    const pinned = buildPinnedEmployeeSection(employees, pinnedEmployeeIds);
    const all = buildAllEmployeesSection(employees, pinnedEmployeeIds);
    return pinned ? [pinned, all] : [all];
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
      void hapticSuccess();
      setDefaultGroup(groupName);
      router.back();
    },
    [router, setDefaultGroup],
  );

  const handleEmployeePress = useCallback(
    (urlId: string, fio: string) => {
      void hapticSuccess();
      setDefaultEmployee({ urlId, fio });
      router.back();
    },
    [router, setDefaultEmployee],
  );

  const isGroupsLoading = groupsLoading && groups.length === 0;
  const isEmployeesLoading = employeesLoading && employees.length === 0;

  const renderGroupRow = ({ item }: { item: (typeof groups)[number] }) => (
    <GroupRow group={item} onPress={() => handleGroupPress(item.name)} />
  );

  const renderEmployeeRow = ({ item }: { item: (typeof employees)[number] }) => (
    <EmployeeRow
      employee={item}
      onPress={() =>
        handleEmployeePress(
          item.urlId,
          item.fio ?? `${item.lastName} ${item.firstName?.[0] ?? ''}.${item.middleName?.[0] ? item.middleName[0] + '.' : ''}`,
        )
      }
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
        <GlassButton onPress={() => router.back()} size={38} accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={22} color={Palette.textPrimary} style={{ marginLeft: -1 }} />
        </GlassButton>
        <Text {...textProps('title')} style={styles.title} numberOfLines={1}>{t('groups.pickerTitle')}</Text>
      </View>

      {/* ─── Segmented control ─── */}
      <View style={styles.segmentWrapper}>
        <SegmentedControl
          values={[t('groups.pickerTabGroups'), t('groups.pickerTabEmployees')]}
          selectedIndex={activeTab === 'groups' ? 0 : 1}
          onChange={(e) => {
            const tab = e.nativeEvent.selectedSegmentIndex === 0 ? 'groups' : 'employees';
            switchTab(tab);
          }}
          fontStyle={{ color: Palette.textPrimary }}
          activeFontStyle={{ color: isDark ? '#FFFFFF' : '#000000' }}
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
          {isGroupsLoading ? (
            <SkeletonGroupsList />
          ) : (
            <>
              <SearchBar value={groupQuery} onChange={setGroupQuery} placeholder={t('groups.pickerSearchPlaceholder')} />
              {isGroupSearching ? (
                <FlatList
                  data={filteredGroups}
                  keyExtractor={(g) => String(g.id)}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  contentContainerStyle={filteredGroups.length === 0 ? styles.emptyContent : listContent}
                  renderItem={renderGroupRow}
                  ListEmptyComponent={
                    <View style={styles.center}>
                      <Text {...textProps('body')} style={styles.empty}>{t('common.nothingFound')}</Text>
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
                    <SectionHeader abbrev={section.facultyAbbrev} name={section.facultyName} pinned={section.key === PINNED_SECTION_KEY} />
                  )}
                  renderItem={renderGroupRow}
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
          {isEmployeesLoading ? (
            <SkeletonEmployeesList />
          ) : (
            <>
              <SearchBar value={empQuery} onChange={setEmpQuery} placeholder={t('employees.searchPlaceholder')} />
              {isEmpSearching ? (
                <FlatList
                  data={filteredEmployees}
                  keyExtractor={(e) => String(e.id)}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  contentContainerStyle={filteredEmployees.length === 0 ? styles.emptyContent : listContent}
                  renderItem={renderEmployeeRow}
                  ListEmptyComponent={
                    <View style={styles.center}>
                      <Text {...textProps('body')} style={styles.empty}>{t('common.nothingFound')}</Text>
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
                      <Text {...textProps('footnote')} style={styles.sectionTitle}>{section.title}</Text>
                    </View>
                  )}
                  renderItem={renderEmployeeRow}
                />
              )}
            </>
          )}
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const makeStyles = (Palette: PaletteType) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl },
  emptyContent: { flexGrow: 1 },
  empty: { color: Palette.textSecondary, textAlign: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  // ─── Segmented control ───
  segmentWrapper: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.md,
  },
  // ─── Animated content ───
  contentContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  pane: {
    ...StyleSheet.absoluteFillObject,
  },
  // ─── Employee section headers ───
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
});
