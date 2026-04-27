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

export const GroupScheduleScreen = () => {
  const { name } = useLocalSearchParams<{ name: string }>();
  const groupName = name ?? '';
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);

  const schedule = useScheduleStore((s) => s.byKey[groupName]);
  const currentWeek = useScheduleStore((s) => s.currentWeek);
  const loadingKey = useScheduleStore((s) => s.loadingKey);
  const error = useScheduleStore((s) => s.error);
  const errorKind = useScheduleStore((s) => s.errorKind);

  const load = useCallback(() => {
    if (!groupName) return;
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
      entityKey={groupName}
      entityType="group"
      title={groupName}
      onRefresh={load}
      refreshing={isLoading}
    />
  );
};

const makeStyles = (Palette: PaletteType) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
});
