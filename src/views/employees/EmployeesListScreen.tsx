import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import {
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
import { SkeletonEmployeesList } from '@components/Skeleton';
import { EmployeesController } from '@controllers/employees.controller';
import { useEmployeeSearch } from '@hooks/useEmployeeSearch';
import { usePalette } from '@hooks/usePalette';
import type { EmployeeDto } from '@models/dto';
import { useEmployeesStore } from '@stores/employees.store';
import { usePreferencesStore } from '@stores/preferences.store';
import { Radius, Spacing, TAB_BAR_HEIGHT } from '@theme';
import { textProps } from '@theme/typography';
import type { EmployeeSection } from '@utils/employeeGrouping';
import { PINNED_SECTION_KEY, buildAlphabetSections, buildPinnedEmployeeSection } from '@utils/employeeGrouping';

import { EmployeeRow } from './EmployeeRow';

type PaletteType = ReturnType<typeof usePalette>;

export const EmployeesListScreen = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  const items = useEmployeesStore((s) => s.items);
  const isLoading = useEmployeesStore((s) => s.isLoading);
  const error = useEmployeesStore((s) => s.error);

  const { query, setQuery, isSearching, filtered } = useEmployeeSearch(items);
  const pinnedUrlIds = usePreferencesStore((s) => s.pinnedEmployees);
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null);
  const sectionListRef = useRef<SectionList>(null);

  const sections = useMemo(() => {
    const pinned = buildPinnedEmployeeSection(items, pinnedUrlIds);
    const alphabet = buildAlphabetSections(items, pinnedUrlIds);
    return pinned ? [pinned, ...alphabet] : alphabet;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, pinnedUrlIds, i18n.language]);

  const hasPinned = sections.some((s) => s.key === PINNED_SECTION_KEY);


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
        <SkeletonEmployeesList />
      </SafeAreaView>
    );
  }

  if (error && items.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.center}>
          <Text {...textProps('body')} style={styles.error}>{error}</Text>
          <Pressable
            onPress={handleRefresh}
            style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
          >
            <Text {...textProps('callout')} style={styles.retryLabel}>{t('common.retry')}</Text>
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
        placeholder={t('employees.searchPlaceholder')}
      />
      {isSearching ? (
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
                  item.fio ?? `${item.lastName} ${item.firstName?.[0] ?? ''}.${item.middleName?.[0] ? item.middleName[0] + '.' : ''}`,
                )
              }
              onPhotoPress={setFullscreenPhoto}
            />
          )}
          refreshControl={refreshControl}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text {...textProps('body')} style={styles.empty}>{t('common.nothingFound')}</Text>
            </View>
          }
        />
      ) : (
        <View style={styles.listWrapper}>
          <SectionList
            ref={sectionListRef as never}
            sections={sections}
            keyExtractor={(e) => String(e.id)}
            stickySectionHeadersEnabled
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={listContent}
            renderSectionHeader={({ section }) => (
              <View
                style={styles.sectionHeader}
              >
                {section.key === PINNED_SECTION_KEY && (
                  <Ionicons name="star" size={13} color={Palette.accent} />
                )}
                <Text {...textProps('footnote')} style={styles.sectionTitle}>{section.title}</Text>
              </View>
            )}
            renderItem={({ item }) => (
              <EmployeeRow
                employee={item}
                onPress={() =>
                  handlePress(
                    item.urlId,
                    item.fio ?? `${item.lastName} ${item.firstName?.[0] ?? ''}.${item.middleName?.[0] ? item.middleName[0] + '.' : ''}`,
                  )
                }
                onPhotoPress={setFullscreenPhoto}
              />
            )}
            refreshControl={refreshControl}
          />
        </View>
      )}
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

const makeStyles = (Palette: PaletteType) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  listWrapper: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl },
  emptyContent: { flexGrow: 1 },
  error: {
    color: Palette.destructive,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  empty: { color: Palette.textSecondary, textAlign: 'center' },
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
  retry: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Palette.accent,
  },
  retryPressed: { opacity: 0.7 },
  retryLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
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
