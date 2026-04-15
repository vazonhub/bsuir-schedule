import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchBar } from '@components/SearchBar';
import { GroupsController } from '@controllers/groups.controller';
import { useGroupSearch } from '@hooks/useGroupSearch';
import { useGroupsStore } from '@stores/groups.store';
import { usePreferencesStore } from '@stores/preferences.store';
import { Palette, Radius, Spacing, TAB_BAR_HEIGHT } from '@theme';
import { buildPinnedSection, groupByFaculty } from '@utils/groupGrouping';

import { GroupRow } from './GroupRow';
import { SectionHeader } from './SectionHeader';

export const GroupsListScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const items = useGroupsStore((s) => s.items);
  const isLoading = useGroupsStore((s) => s.isLoading);
  const error = useGroupsStore((s) => s.error);

  const { query, setQuery, isSearching, filtered } = useGroupSearch(items);
  const pinnedNames = usePreferencesStore((s) => s.pinnedGroups);

  useEffect(() => {
    void GroupsController.loadAll();
  }, []);

  const sections = useMemo(() => {
    const pinnedSet = new Set(pinnedNames);
    const remaining = items.filter((g) => !pinnedSet.has(g.name));
    const facultySections = groupByFaculty(remaining);
    const pinned = buildPinnedSection(items, pinnedNames);
    return pinned ? [pinned, ...facultySections] : facultySections;
  }, [items, pinnedNames]);

  // Tab bar высоту приходится добавлять вручную — см. TAB_BAR_HEIGHT в
  // theme/spacing.ts. insets.bottom покрывает только home-indicator.
  const listContent = useMemo(
    () => ({
      paddingTop: Spacing.md,
      paddingBottom: insets.bottom + TAB_BAR_HEIGHT + Spacing.md,
    }),
    [insets.bottom],
  );

  const handlePress = useCallback(
    (groupName: string) => {
      router.push({ pathname: '/(tabs)/(groups)/[name]', params: { name: groupName } });
    },
    [router],
  );

  const handleRefresh = useCallback(() => {
    void GroupsController.loadAll();
  }, []);

  if (isLoading && items.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  if (error && items.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable
            onPress={handleRefresh}
            style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
          >
            <Text style={styles.retryLabel}>Повторить</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const refreshControl = (
    <RefreshControl
      refreshing={isLoading && items.length > 0}
      onRefresh={handleRefresh}
      tintColor={Palette.textTertiary}
    />
  );

  const renderRow = ({ item }: { item: (typeof items)[number] }) => (
    <GroupRow group={item} onPress={() => handlePress(item.name)} />
  );

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <SearchBar value={query} onChange={setQuery} placeholder="Поиск группы или факультета" />

      {isSearching ? (
        <FlatList
          data={filtered}
          keyExtractor={(g) => String(g.id)}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={filtered.length === 0 ? styles.emptyContent : listContent}
          renderItem={renderRow}
          refreshControl={refreshControl}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.empty}>Ничего не найдено</Text>
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
            <SectionHeader abbrev={section.facultyAbbrev} name={section.facultyName} />
          )}
          renderItem={renderRow}
          refreshControl={refreshControl}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl },
  emptyContent: { flexGrow: 1 },
  error: {
    color: Palette.destructive,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  empty: { color: Palette.textSecondary, textAlign: 'center' },
  retry: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Palette.accent,
  },
  retryPressed: { opacity: 0.7 },
  retryLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
