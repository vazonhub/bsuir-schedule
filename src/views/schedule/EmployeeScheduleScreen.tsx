import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScheduleController } from '@controllers/schedule.controller';
import { usePalette } from '@hooks/usePalette';
import { useScheduleStore } from '@stores/schedule.store';
import { Radius, Spacing } from '@theme';

import { ScheduleView } from './ScheduleView';

type PaletteType = ReturnType<typeof usePalette>;

export const EmployeeScheduleScreen = () => {
  const { t } = useTranslation();
  const { urlId } = useLocalSearchParams<{ urlId: string; fio?: string }>();
  const key = urlId ?? '';
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);

  const schedule = useScheduleStore((s) => s.byKey[key]);
  const currentWeek = useScheduleStore((s) => s.currentWeek);
  const loadingKey = useScheduleStore((s) => s.loadingKey);
  const error = useScheduleStore((s) => s.error);

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
        <SafeAreaView edges={['top']} style={styles.container}>
          <View style={styles.center}>
            <Text style={styles.error}>{error}</Text>
            <Pressable
              onPress={load}
              style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
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
      entityKey={key}
      entityType="employee"
      onRefresh={load}
      refreshing={isLoading}
    />
  );
};

const makeStyles = (Palette: PaletteType) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl },
  error: { color: Palette.destructive, textAlign: 'center', marginBottom: Spacing.xl },
  retry: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Palette.accent,
  },
  retryPressed: { opacity: 0.7 },
  retryLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
