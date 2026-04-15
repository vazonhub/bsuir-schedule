import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchBar } from '@components/SearchBar';
import { EmployeesController } from '@controllers/employees.controller';
import { useEmployeeSearch } from '@hooks/useEmployeeSearch';
import { useEmployeesStore } from '@stores/employees.store';
import { Palette, Radius, Spacing, TAB_BAR_HEIGHT } from '@theme';

import { EmployeeRow } from './EmployeeRow';

export const EmployeesListScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const items = useEmployeesStore((s) => s.items);
  const isLoading = useEmployeesStore((s) => s.isLoading);
  const error = useEmployeesStore((s) => s.error);

  const { query, setQuery, filtered } = useEmployeeSearch(items);

  // Tab bar высоту приходится добавлять вручную — см. TAB_BAR_HEIGHT в
  // theme/spacing.ts. insets.bottom покрывает только home-indicator.
  const listContent = useMemo(
    () => ({
      paddingTop: Spacing.md,
      paddingBottom: insets.bottom + TAB_BAR_HEIGHT + Spacing.md,
    }),
    [insets.bottom],
  );

  useEffect(() => {
    void EmployeesController.loadAll();
  }, []);

  const handlePress = useCallback(
    (urlId: string, fio: string) => {
      router.push({
        pathname: '/(tabs)/(employees)/[urlId]',
        params: { urlId, fio },
      });
    },
    [router],
  );

  const handleRefresh = useCallback(() => {
    void EmployeesController.loadAll();
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

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Поиск по фамилии, кафедре или должности"
      />
      <FlatList
        data={filtered}
        keyExtractor={(e) => String(e.id)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={filtered.length === 0 ? styles.emptyContent : listContent}
        renderItem={({ item }) => (
          <EmployeeRow
            employee={item}
            onPress={() =>
              handlePress(
                item.urlId,
                item.fio ?? `${item.lastName} ${item.firstName[0] ?? ''}.`,
              )
            }
          />
        )}
        refreshControl={refreshControl}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.empty}>Ничего не найдено</Text>
          </View>
        }
      />
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
