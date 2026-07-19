import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FloatingTopBar } from '@components/FloatingTopBar';
import { ScheduleError } from '@components/ScheduleError';
import { SkeletonSchedule } from '@components/Skeleton';
import { ScheduleController } from '@controllers/schedule.controller';
import { usePalette } from '@hooks/usePalette';
import type { DefaultEmployee, SubgroupChoice } from '@stores/preferences.store';
import {
  usePreferencesStore,
  selectIsGroupPinned,
  selectIsEmployeePinned,
  selectSubgroup,
} from '@stores/preferences.store';
import { useScheduleStore } from '@stores/schedule.store';
import { Radius, Spacing } from '@theme';
import { textProps } from '@theme/typography';

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
  const { scrollDate } = useLocalSearchParams<{ scrollDate?: string }>();
  const defaultGroup = usePreferencesStore((s) => s.defaultGroup);
  const defaultEmployee = usePreferencesStore((s) => s.defaultEmployee);

  if (defaultGroup) {
    return <DefaultGroupSchedule groupName={defaultGroup} initialScrollDate={scrollDate} />;
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
        <Text {...textProps('title')} style={styles.emptyTitle}>
          {t('mySchedule.title')}
        </Text>
        <Text {...textProps('callout')} style={styles.emptySubtitle}>
          {t('mySchedule.subtitle')}
        </Text>
        <Pressable
          onPress={onSelect}
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

// ────────────────────────────────────────────────────────────────

const DefaultGroupSchedule = ({
  groupName,
  initialScrollDate,
}: {
  groupName: string;
  initialScrollDate?: string;
}) => {
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  const router = useRouter();
  const schedule = useScheduleStore((s) => s.byKey[groupName]);
  const currentWeek = useScheduleStore((s) => s.currentWeek);
  const isLoading = useScheduleStore((s) => s.loadingKeys[groupName] === true);
  const error = useScheduleStore((s) => s.error);
  const errorKind = useScheduleStore((s) => s.errorKind);
  const pinned = usePreferencesStore(selectIsGroupPinned(groupName));
  const togglePin = usePreferencesStore((s) => s.togglePinnedGroup);
  const subgroup = usePreferencesStore(selectSubgroup(groupName));
  const setSubgroup = usePreferencesStore((s) => s.setSubgroup);

  const load = useCallback(() => {
    void ScheduleController.loadCurrentWeek();
    void ScheduleController.loadGroupSchedule(groupName);
  }, [groupName]);

  useEffect(() => {
    load();
  }, [load]);

  if (!schedule || !currentWeek) {
    if (error && !schedule) {
      return (
        <View style={styles.container}>
          <FloatingTopBar
            pinned={pinned}
            onTogglePin={() => togglePin(groupName)}
            subgroup={subgroup}
            onSubgroupChange={(v: SubgroupChoice) => setSubgroup(groupName, v)}
            isDefaultSchedule
            defaultGroupName={groupName}
            onChangeDefaultGroup={() => router.push('/(tabs)/(amy)/pick-group')}
          />
          <ScheduleError kind={errorKind} onRetry={load} />
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <SkeletonSchedule />
      </View>
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
      initialScrollDate={initialScrollDate}
    />
  );
};

// ────────────────────────────────────────────────────────────────

const DefaultEmployeeSchedule = ({ employee }: { employee: DefaultEmployee }) => {
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  const router = useRouter();
  const schedule = useScheduleStore((s) => s.byKey[employee.urlId]);
  const currentWeek = useScheduleStore((s) => s.currentWeek);
  const isLoading = useScheduleStore((s) => s.loadingKeys[employee.urlId] === true);
  const error = useScheduleStore((s) => s.error);
  const errorKind = useScheduleStore((s) => s.errorKind);
  const pinned = usePreferencesStore(selectIsEmployeePinned(employee.urlId));
  const togglePin = usePreferencesStore((s) => s.togglePinnedEmployee);

  const load = useCallback(() => {
    void ScheduleController.loadCurrentWeek();
    void ScheduleController.loadEmployeeSchedule(employee.urlId);
  }, [employee.urlId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!schedule || !currentWeek) {
    if (error && !schedule) {
      return (
        <View style={styles.container}>
          <FloatingTopBar
            pinned={pinned}
            onTogglePin={() => togglePin(employee.urlId)}
            isDefaultSchedule
            defaultGroupName={employee.fio}
            onChangeDefaultGroup={() => router.push('/(tabs)/(amy)/pick-group')}
          />
          <ScheduleError kind={errorKind} onRetry={load} />
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <SkeletonSchedule />
      </View>
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

const makeStyles = (Palette: PaletteType) =>
  StyleSheet.create({
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
  });
