import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
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
import { GroupsController } from '@controllers/groups.controller';
import { useGroupSearch } from '@hooks/useGroupSearch';
import { usePalette } from '@hooks/usePalette';
import { useGroupsStore } from '@stores/groups.store';
import { usePreferencesStore } from '@stores/preferences.store';
import { Radius, Spacing, TAB_BAR_HEIGHT } from '@theme';
import { PINNED_SECTION_KEY, buildPinnedSection, groupByFaculty } from '@utils/groupGrouping';

import { GroupRow } from './GroupRow';
import { SectionHeader } from './SectionHeader';

type PaletteType = ReturnType<typeof usePalette>;

/**
 * Group picker — almost identical to GroupsListScreen, but tapping a group
 * sets it as `defaultGroup` and navigates back instead of opening its schedule.
 */
export const GroupPickerScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  const items = useGroupsStore((s) => s.items);
  const isLoading = useGroupsStore((s) => s.isLoading);
  const setDefaultGroup = usePreferencesStore((s) => s.setDefaultGroup);

  const pinnedNames = usePreferencesStore((s) => s.pinnedGroups);
  const { query, setQuery, isSearching, filtered } = useGroupSearch(items);

  const sections = useMemo(() => {
    const pinnedSet = new Set(pinnedNames);
    const remaining = items.filter((g) => !pinnedSet.has(g.name));
    const facultySections = groupByFaculty(remaining);
    const pinned = buildPinnedSection(items, pinnedNames);
    return pinned ? [pinned, ...facultySections] : facultySections;
  }, [items, pinnedNames]);

  const listContent = useMemo(
    () => ({
      paddingTop: Spacing.md,
      paddingBottom: insets.bottom + TAB_BAR_HEIGHT + Spacing.md,
    }),
    [insets.bottom],
  );

  useEffect(() => {
    void GroupsController.loadAll();
  }, []);

  const handlePress = useCallback(
    (groupName: string) => {
      setDefaultGroup(groupName);
      router.back();
    },
    [router, setDefaultGroup],
  );

  if (isLoading && items.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  const renderRow = ({ item }: { item: (typeof items)[number] }) => (
    <GroupRow group={item} onPress={() => handlePress(item.name)} />
  );

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backLabel}>&#8249; {t('common.back')}</Text>
        </Pressable>
        <Text style={styles.title}>{t('groups.pickerTitle')}</Text>
      </View>
      <SearchBar value={query} onChange={setQuery} placeholder={t('groups.pickerSearchPlaceholder')} />

      {isSearching ? (
        <FlatList
          data={filtered}
          keyExtractor={(g) => String(g.id)}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={filtered.length === 0 ? styles.emptyContent : listContent}
          renderItem={renderRow}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.empty}>{t('common.nothingFound')}</Text>
            </View>
          }
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(g) => String(g.id)}
          stickySectionHeadersEnabled
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={listContent}
          renderSectionHeader={({ section }) => (
            <SectionHeader abbrev={section.facultyAbbrev} name={section.facultyName} pinned={section.key === PINNED_SECTION_KEY} />
          )}
          renderItem={renderRow}
        />
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
});
