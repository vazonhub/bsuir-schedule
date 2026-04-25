import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScheduleError } from '@components/ScheduleError';
import { SkeletonSchedule } from '@components/Skeleton';
import { ScheduleController } from '@controllers/schedule.controller';
import { usePalette } from '@hooks/usePalette';
import { useScheduleStore } from '@stores/schedule.store';

import { ScheduleView } from './ScheduleView';

type PaletteType = ReturnType<typeof usePalette>;

export const EmployeeScheduleScreen = () => {
  const { urlId } = useLocalSearchParams<{ urlId: string; fio?: string }>();
  const key = urlId ?? '';
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);

  const schedule = useScheduleStore((s) => s.byKey[key]);
  const currentWeek = useScheduleStore((s) => s.currentWeek);
  const loadingKey = useScheduleStore((s) => s.loadingKey);
  const error = useScheduleStore((s) => s.error);
  const errorKind = useScheduleStore((s) => s.errorKind);

  const load = useCallback(() => {
    if (!key) return;
    void ScheduleController.loadCurrentWeek();
    void ScheduleController.loadEmployeeSchedule(key);
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  const isLoading = loadingKey === key;

  if (!schedule || !currentWeek) {
    if (error && !schedule) {
      return (
        <View style={styles.container}>
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
      entityKey={key}
      entityType="employee"
      title={schedule.employeeDto?.fio ?? (schedule.employeeDto ? `${schedule.employeeDto.lastName} ${schedule.employeeDto.firstName?.[0] ?? ''}.${schedule.employeeDto.middleName?.[0] ? schedule.employeeDto.middleName[0] + '.' : ''}` : undefined)}
      avatarUri={schedule.employeeDto?.photoLink}
      onRefresh={load}
      refreshing={isLoading}
    />
  );
};

const makeStyles = (Palette: PaletteType) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
});
