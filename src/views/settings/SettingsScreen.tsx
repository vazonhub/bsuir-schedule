import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useIsDark, usePalette } from '@hooks/usePalette';
import type { LanguageChoice, ThemeChoice } from '@stores/preferences.store';
import { usePreferencesStore } from '@stores/preferences.store';
import { Spacing } from '@theme';

type PaletteType = ReturnType<typeof usePalette>;

const THEME_VALUES: ThemeChoice[] = ['auto', 'light', 'dark'];
const LANG_VALUES: LanguageChoice[] = ['ru', 'be', 'en'];
const LANG_LABELS = ['Русский', 'Беларуская', 'English'];

export const SettingsScreen = () => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const isDark = useIsDark();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  const theme = usePreferencesStore((s) => s.theme);
  const setTheme = usePreferencesStore((s) => s.setTheme);
  const language = usePreferencesStore((s) => s.language);
  const setLanguage = usePreferencesStore((s) => s.setLanguage);

  const themeLabels = [t('settings.themeAuto'), t('settings.themeLight'), t('settings.themeDark')];
  const themeIndex = THEME_VALUES.indexOf(theme);
  const langIndex = LANG_VALUES.indexOf(language);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <Text style={styles.screenTitle}>{t('settings.title')}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.themeSection')}</Text>
        <SegmentedControl
          values={themeLabels}
          selectedIndex={themeIndex >= 0 ? themeIndex : 0}
          onChange={(e) => {
            const value = THEME_VALUES[e.nativeEvent.selectedSegmentIndex];
            if (value) setTheme(value);
          }}
          fontStyle={{ color: Palette.textPrimary }}
          activeFontStyle={{ color: isDark ? '#FFFFFF' : '#000000' }}
          appearance={isDark ? 'dark' : 'light'}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.languageSection')}</Text>
        <SegmentedControl
          values={LANG_LABELS}
          selectedIndex={langIndex >= 0 ? langIndex : 0}
          onChange={(e) => {
            const value = LANG_VALUES[e.nativeEvent.selectedSegmentIndex];
            if (value) setLanguage(value);
          }}
          fontStyle={{ color: Palette.textPrimary }}
          activeFontStyle={{ color: isDark ? '#FFFFFF' : '#000000' }}
          appearance={isDark ? 'dark' : 'light'}
        />
      </View>
    </SafeAreaView>
  );
};

const makeStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: Palette.background },
    screenTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: Palette.textPrimary,
      paddingHorizontal: Spacing.screenPadding + Spacing.xs,
      paddingTop: Spacing.xl,
      paddingBottom: Spacing.lg,
    },
    section: {
      paddingHorizontal: Spacing.screenPadding,
      paddingBottom: Spacing.xl,
      gap: Spacing.md,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: Palette.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      paddingHorizontal: Spacing.xs,
    },
  });
