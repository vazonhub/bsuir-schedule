import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchBar } from '@components/SearchBar';
import { SkeletonGroupsList, SkeletonEmployeesList } from '@components/Skeleton';
import { hapticSuccess } from '@utils/haptics';
import { EmployeesController } from '@controllers/employees.controller';
import { GroupsController } from '@controllers/groups.controller';
import { useEmployeeSearch } from '@hooks/useEmployeeSearch';
import { useGroupSearch } from '@hooks/useGroupSearch';
import { usePalette } from '@hooks/usePalette';
import { useEmployeesStore } from '@stores/employees.store';
import { useGroupsStore } from '@stores/groups.store';
import { usePreferencesStore } from '@stores/preferences.store';
import { Radius, Spacing, TAB_BAR_HEIGHT } from '@theme';
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

/**
 * Schedule picker — allows user to select a default group or employee
 * for the "Моё" tab. Segmented control at the top switches between
 * groups list and employees list.
 */
export const GroupPickerScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  const [activeTab, setActiveTab] = useState<PickerTab>('groups');

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
  }, [groups, pinnedGroupNames]);

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
  }, [employees, pinnedEmployeeIds]);

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

  const isLoading = activeTab === 'groups'
    ? groupsLoading && groups.length === 0
    : employeesLoading && employees.length === 0;

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        {activeTab === 'groups' ? <SkeletonGroupsList /> : <SkeletonEmployeesList />}
      </SafeAreaView>
    );
  }

  const renderGroupRow = ({ item }: { item: (typeof groups)[number] }) => (
    <GroupRow group={item} onPress={() => handleGroupPress(item.name)} />
  );

  const renderEmployeeRow = ({ item }: { item: (typeof employees)[number] }) => (
    <EmployeeRow
      employee={item}
      onPress={() =>
        handleEmployeePress(
          item.urlId,
          item.fio ?? `${item.lastName} ${item.firstName[0] ?? ''}.`,
        )
      }
    />
  );

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backLabel}>&#8249; {t('common.back')}</Text>
        </Pressable>
        <Text style={styles.title}>{t('groups.pickerTitle')}</Text>
      </View>

      {/* ─── Segmented control ─── */}
      <View style={styles.segmentWrapper}>
        <View style={styles.segment}>
          <Pressable
            onPress={() => setActiveTab('groups')}
            style={[styles.segmentTab, activeTab === 'groups' && styles.segmentTabActive]}
          >
            <Text style={[styles.segmentLabel, activeTab === 'groups' && styles.segmentLabelActive]}>
              {t('groups.pickerTabGroups')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('employees')}
            style={[styles.segmentTab, activeTab === 'employees' && styles.segmentTabActive]}
          >
            <Text style={[styles.segmentLabel, activeTab === 'employees' && styles.segmentLabelActive]}>
              {t('groups.pickerTabEmployees')}
            </Text>
          </Pressable>
        </View>
      </View>

      {activeTab === 'groups' ? (
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
                  <Text style={styles.empty}>{t('common.nothingFound')}</Text>
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
                  <Text style={styles.empty}>{t('common.nothingFound')}</Text>
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
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                </View>
              )}
              renderItem={renderEmployeeRow}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
};

const makeStyles = (Palette: PaletteType) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl },
  emptyContent: { flexGrow: 1 },
  empty: { color: Palette.textSecondary, textAlign: 'center' },
  header: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  backBtn: {
    alignSelf: 'flex-start',
  },
  backLabel: {
    fontSize: 17,
    color: Palette.accent,
    fontWeight: '500',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  // ─── Segmented control ───
  segmentWrapper: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.md,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    padding: 3,
  },
  segmentTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.lg - 2,
  },
  segmentTabActive: {
    backgroundColor: Palette.accent,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  segmentLabelActive: {
    color: '#FFFFFF',
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
