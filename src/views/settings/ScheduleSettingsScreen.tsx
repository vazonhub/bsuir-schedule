import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassButton } from '@components/GlassButton';
import { usePalette } from '@hooks/usePalette';
import { usePreferencesStore } from '@stores/preferences.store';
import { Spacing } from '@theme';

type PaletteType = ReturnType<typeof usePalette>;

export const ScheduleSettingsScreen = () => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);

  const hidePastLessons = usePreferencesStore((s) => s.hidePastLessons);
  const setHidePastLessons = usePreferencesStore((s) => s.setHidePastLessons);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <GlassButton onPress={() => router.back()} size={38} accessibilityLabel={t('common.back')}>
          <Text style={styles.backChevron}>&#8249;</Text>
        </GlassButton>
        <Text style={styles.title} numberOfLines={1}>{t('settings.scheduleSection')}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{t('settings.hidePastLessons')}</Text>
          <Switch
            value={hidePastLessons}
            onValueChange={setHidePastLessons}
            trackColor={{ true: Palette.accent }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const makeStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: Palette.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.screenPadding,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.md,
      gap: Spacing.md,
    },
    backChevron: {
      fontSize: 28,
      lineHeight: 28,
      fontWeight: '500',
      color: Palette.textPrimary,
    },
    title: {
      flex: 1,
      fontSize: 22,
      fontWeight: '700',
      color: Palette.textPrimary,
    },
    section: {
      paddingHorizontal: Spacing.screenPadding,
      gap: Spacing.md,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.xs,
    },
    switchLabel: {
      flex: 1,
      fontSize: 16,
      color: Palette.textPrimary,
      marginRight: Spacing.md,
    },
  });
