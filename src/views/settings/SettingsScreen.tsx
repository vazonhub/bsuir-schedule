import { Ionicons } from '@expo/vector-icons';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useIsDark, usePalette } from '@hooks/usePalette';
import type { LanguageChoice, ThemeChoice } from '@stores/preferences.store';
import { usePreferencesStore } from '@stores/preferences.store';
import { Radius, Spacing } from '@theme';

type PaletteType = ReturnType<typeof usePalette>;

const THEME_VALUES: ThemeChoice[] = ['auto', 'light', 'dark'];
const LANG_VALUES: LanguageChoice[] = ['ru', 'be', 'en'];
const LANG_LABELS = ['Русский', 'Беларуская', 'English'];

export const SettingsScreen = () => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const isDark = useIsDark();
  const router = useRouter();
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

      <View style={styles.navSection}>
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
            onPress={() => router.push('/(tabs)/(settings)/schedule')}
          >
            <Ionicons name="calendar-outline" size={20} color={Palette.accent} />
            <Text style={styles.navLabel}>{t('settings.scheduleSection')}</Text>
            <Ionicons name="chevron-forward" size={18} color={Palette.textTertiary} />
          </Pressable>
        </View>
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
            onPress={() => router.push('/(tabs)/(settings)/network')}
          >
            <Ionicons name="cloud-outline" size={20} color={Palette.accent} />
            <Text style={styles.navLabel}>{t('settings.networkSection')}</Text>
            <Ionicons name="chevron-forward" size={18} color={Palette.textTertiary} />
          </Pressable>
        </View>
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
    navSection: {
      paddingHorizontal: Spacing.screenPadding,
      gap: Spacing.cardGap,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: Palette.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      paddingHorizontal: Spacing.xs,
    },
    card: {
      backgroundColor: Palette.card,
      borderRadius: Radius.lg,
      overflow: 'hidden',
    },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
      paddingVertical: Spacing.cardPaddingY,
      paddingHorizontal: Spacing.cardPaddingX,
    },
    navRowPressed: {
      backgroundColor: Palette.cardPressed,
    },
    navLabel: {
      flex: 1,
      fontSize: 16,
      color: Palette.textPrimary,
    },
  });
