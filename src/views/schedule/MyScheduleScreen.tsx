import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScheduleController } from '@controllers/schedule.controller';
import { usePalette } from '@hooks/usePalette';
import type { DefaultEmployee } from '@stores/preferences.store';
import { usePreferencesStore } from '@stores/preferences.store';
import { useScheduleStore } from '@stores/schedule.store';
import { Radius, Spacing } from '@theme';

import { ScheduleView } from './ScheduleView';

type PaletteType = ReturnType<typeof usePalette>;

/**
 * «Моё расписание» — главный экран приложения.
 *
 * - Если `defaultGroup` выбрана → показываем её расписание.
 * - Если `defaultEmployee` выбран → показываем расписание преподавателя.
 * - Если ничего не выбрано → предлагаем выбрать.
 */
export const MyScheduleScreen = () => {
  const router = useRouter();
  const defaultGroup = usePreferencesStore((s) => s.defaultGroup);
  const defaultEmployee = usePreferencesStore((s) => s.defaultEmployee);

  if (defaultGroup) {
    return <DefaultGroupSchedule groupName={defaultGroup} />;
  }

  if (defaultEmployee) {
    return <DefaultEmployeeSchedule employee={defaultEmployee} />;
  }

  return <EmptyState onSelect={() => router.push('/(tabs)/(amy)/pick-group')} />;
};

// ────────────────────────────────────────────────────────────────

const EmptyState = ({ onSelect }: { onSelect(): void }) => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.center}>
        <Ionicons name="calendar-outline" size={64} color={Palette.textTertiary} />
        <Text style={styles.emptyTitle}>{t('mySchedule.title')}</Text>
        <Text style={styles.emptySubtitle}>
          {t('mySchedule.subtitle')}
        </Text>
        <Pressable
          onPress={onSelect}
          style={({ pressed }) => [styles.selectBtn, pressed && styles.selectBtnPressed]}
        >
          <Text style={styles.selectBtnLabel}>{t('mySchedule.selectGroup')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

// ────────────────────────────────────────────────────────────────

const DefaultGroupSchedule = ({ groupName }: { groupName: string }) => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  const schedule = useScheduleStore((s) => s.byKey[groupName]);
  const currentWeek = useScheduleStore((s) => s.currentWeek);
  const loadingKey = useScheduleStore((s) => s.loadingKey);
  const error = useScheduleStore((s) => s.error);

  const load = useCallback(() => {
    void ScheduleController.loadCurrentWeek();
    void ScheduleController.loadGroupSchedule(groupName);
  }, [groupName]);

  useEffect(() => {
    load();
  }, [load]);

  const isLoading = loadingKey === groupName;

  if (!schedule || !currentWeek) {
    if (error && !schedule) {
      return (
        <SafeAreaView edges={['top']} style={styles.container}>
          <View style={styles.center}>
            <Text style={styles.error}>{error}</Text>
            <Pressable
              onPress={load}
              style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
            >
              <Text style={styles.retryLabel}>{t('common.retry')}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ScheduleView
      schedule={schedule}
      currentWeek={currentWeek}
      entityKey={groupName}
      entityType="group"
      onRefresh={load}
      refreshing={isLoading}
      isDefaultSchedule
      defaultLabel={groupName}
    />
  );
};

// ────────────────────────────────────────────────────────────────

const DefaultEmployeeSchedule = ({ employee }: { employee: DefaultEmployee }) => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  const schedule = useScheduleStore((s) => s.byKey[employee.urlId]);
  const currentWeek = useScheduleStore((s) => s.currentWeek);
  const loadingKey = useScheduleStore((s) => s.loadingKey);
  const error = useScheduleStore((s) => s.error);

  const load = useCallback(() => {
    void ScheduleController.loadCurrentWeek();
    void ScheduleController.loadEmployeeSchedule(employee.urlId);
  }, [employee.urlId]);

  useEffect(() => {
    load();
  }, [load]);

  const isLoading = loadingKey === employee.urlId;

  if (!schedule || !currentWeek) {
    if (error && !schedule) {
      return (
        <SafeAreaView edges={['top']} style={styles.container}>
          <View style={styles.center}>
            <Text style={styles.error}>{error}</Text>
            <Pressable
              onPress={load}
              style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
            >
              <Text style={styles.retryLabel}>{t('common.retry')}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ScheduleView
      schedule={schedule}
      currentWeek={currentWeek}
      entityKey={employee.urlId}
      entityType="employee"
      onRefresh={load}
      refreshing={isLoading}
      isDefaultSchedule
      defaultLabel={employee.fio}
    />
  );
};

// ────────────────────────────────────────────────────────────────

const makeStyles = (Palette: PaletteType) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
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
  selectBtnLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  error: { color: Palette.destructive, textAlign: 'center', marginBottom: Spacing.xl },
  retryBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Palette.accent,
  },
  retryBtnPressed: { opacity: 0.7 },
  retryLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
