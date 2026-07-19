import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassButton } from '@components/GlassButton';
import { useAccessibility } from '@hooks/useAccessibility';
import { usePalette } from '@hooks/usePalette';
import { usePreferencesStore } from '@stores/preferences.store';
import { Radius, Spacing, TAB_BAR_HEIGHT } from '@theme';
import { textProps } from '@theme/typography';

type PaletteType = ReturnType<typeof usePalette>;

const STATUS_ON_GREEN = '#34C759';

export const AccessibilityScreen = () => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  const a11y = useAccessibility();
  const setAndroidDwc = usePreferencesStore((s) => s.setAndroidDifferentiateWithoutColor);
  const setAndroidHc = usePreferencesStore((s) => s.setAndroidHighContrast);

  const isAndroid = Platform.OS === 'android';

  const openSettings = useCallback(() => {
    if (Platform.OS === 'android') {
      void Linking.sendIntent('android.settings.ACCESSIBILITY_SETTINGS').catch(() =>
        Linking.openSettings(),
      );
    } else {
      void Linking.openSettings();
    }
  }, []);

  const isLargeTextEnabled = a11y.fontScale > 1.0;
  const fontScalePercent = Math.round(a11y.fontScale * 100);

  type Feature = {
    key: string;
    labelKey: string;
    descKey: string;
    enabled: boolean;
    detail?: string;
    onToggle?: () => void;
    androidIntent?: string;
  };

  const openAndroidIntent = useCallback((intent: string) => {
    void Linking.sendIntent(intent).catch(() => Linking.openSettings());
  }, []);

  // Features that come from system settings (read-only in the app).
  const systemFeatures: Feature[] = [
    {
      key: 'voiceover',
      labelKey: isAndroid ? 'accessibility.talkBack' : 'accessibility.voiceOver',
      descKey: isAndroid ? 'accessibility.talkBackDesc' : 'accessibility.voiceOverDesc',
      enabled: a11y.isScreenReaderEnabled,
      androidIntent: 'android.settings.ACCESSIBILITY_SETTINGS',
    },
    ...(!isAndroid
      ? [
          {
            key: 'voiceControl',
            labelKey: 'accessibility.voiceControl',
            descKey: 'accessibility.voiceControlDesc',
            enabled: a11y.isScreenReaderEnabled,
            detail: t('accessibility.supported'),
          },
        ]
      : []),
    {
      key: 'largeText',
      labelKey: 'accessibility.largeText',
      descKey: 'accessibility.largeTextDesc',
      enabled: isLargeTextEnabled,
      detail: `${fontScalePercent}%`,
      androidIntent: 'android.settings.DISPLAY_SETTINGS',
    },
    {
      key: 'reduceMotion',
      labelKey: 'accessibility.reduceMotion',
      descKey: 'accessibility.reduceMotionDesc',
      enabled: a11y.isReduceMotionEnabled,
      androidIntent: 'android.settings.ACCESSIBILITY_SETTINGS',
    },
    ...(!isAndroid
      ? [
          {
            key: 'boldText',
            labelKey: 'accessibility.boldText',
            descKey: 'accessibility.boldTextDesc',
            enabled: a11y.isBoldTextEnabled,
          },
        ]
      : []),
  ];

  // Features togglable inside the app (Android-only overrides).
  const appFeatures: Feature[] = [
    {
      key: 'differentiateWithoutColor',
      labelKey: 'accessibility.differentiateWithoutColor',
      descKey: 'accessibility.differentiateWithoutColorDesc',
      enabled: a11y.isDifferentiateWithoutColorEnabled,
      onToggle: isAndroid
        ? () => setAndroidDwc(!a11y.isDifferentiateWithoutColorEnabled)
        : undefined,
    },
    {
      key: 'increaseContrast',
      labelKey: 'accessibility.increaseContrast',
      descKey: 'accessibility.increaseContrastDesc',
      enabled: a11y.isDarkerSystemColorsEnabled,
      onToggle: isAndroid ? () => setAndroidHc(!a11y.isDarkerSystemColorsEnabled) : undefined,
    },
  ];

  // On iOS all features are system-level (no in-app toggles), show as one list.
  const allFeatures = isAndroid ? null : [...systemFeatures, ...appFeatures];

  const renderFeatureContent = (feature: Feature, showChevron = false) => (
    <>
      <View style={styles.featureInfo}>
        <Text {...textProps('body')} style={styles.featureLabel}>
          {t(feature.labelKey)}
        </Text>
        <Text {...textProps('footnote')} style={styles.featureDesc}>
          {t(feature.descKey)}
        </Text>
      </View>
      <View style={styles.featureRight}>
        <View style={[styles.statusBadge, feature.enabled ? styles.statusOn : styles.statusOff]}>
          <Text
            maxFontSizeMultiplier={1}
            style={[
              styles.statusText,
              feature.enabled ? styles.statusTextOn : styles.statusTextOff,
            ]}
          >
            {feature.detail ?? (feature.enabled ? t('accessibility.on') : t('accessibility.off'))}
          </Text>
        </View>
        {showChevron && <Ionicons name="chevron-forward" size={14} color={Palette.textTertiary} />}
      </View>
    </>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <GlassButton onPress={() => router.back()} size={38} accessibilityLabel={t('common.back')}>
          <Ionicons
            name="chevron-back"
            size={22}
            color={Palette.textPrimary}
            style={styles.backIcon}
          />
        </GlassButton>
        <Text {...textProps('title')} style={styles.title} numberOfLines={1}>
          {t('accessibility.title')}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + TAB_BAR_HEIGHT + Spacing.md },
        ]}
      >
        <Text {...textProps('subhead')} style={styles.hint}>
          {t('accessibility.subtitle')}
        </Text>

        {isAndroid ? (
          <>
            {/* System settings section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('accessibility.systemSection')}</Text>
              <View style={styles.card}>
                {systemFeatures.map((feature, idx) => (
                  <View key={feature.key}>
                    {idx > 0 && <View style={styles.separator} />}
                    <Pressable
                      style={({ pressed }) => [
                        styles.featureRow,
                        pressed && styles.featureRowPressed,
                      ]}
                      onPress={() =>
                        feature.androidIntent && openAndroidIntent(feature.androidIntent)
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`${t(feature.labelKey)}, ${feature.detail ?? (feature.enabled ? t('accessibility.on') : t('accessibility.off'))}`}
                      accessibilityHint={t('accessibility.openSettings')}
                    >
                      {renderFeatureContent(feature, true)}
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>

            {/* In-app toggles section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('accessibility.appSection')}</Text>
              <View style={styles.card}>
                {appFeatures.map((feature, idx) => (
                  <View key={feature.key}>
                    {idx > 0 && <View style={styles.separator} />}
                    <Pressable
                      style={({ pressed }) => [
                        styles.featureRow,
                        pressed && styles.featureRowPressed,
                      ]}
                      onPress={feature.onToggle}
                      accessibilityRole="switch"
                      accessibilityLabel={`${t(feature.labelKey)}, ${feature.detail ?? (feature.enabled ? t('accessibility.on') : t('accessibility.off'))}`}
                      accessibilityState={{ checked: feature.enabled }}
                    >
                      {renderFeatureContent(feature)}
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : (
          <View style={styles.section}>
            <View style={styles.card}>
              {allFeatures!.map((feature, idx) => (
                <View key={feature.key}>
                  {idx > 0 && <View style={styles.separator} />}
                  <View
                    style={styles.featureRow}
                    accessibilityLabel={`${t(feature.labelKey)}, ${feature.detail ?? (feature.enabled ? t('accessibility.on') : t('accessibility.off'))}`}
                  >
                    {renderFeatureContent(feature)}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <Text {...textProps('footnote')} style={styles.footnote}>
          {isAndroid ? t('accessibility.footnoteAndroid') : t('accessibility.footnote')}
        </Text>

        {!isAndroid && (
          <View style={styles.section}>
            <Pressable
              style={({ pressed }) => [
                styles.settingsButton,
                pressed && styles.settingsButtonPressed,
              ]}
              onPress={openSettings}
              accessibilityRole="button"
              accessibilityLabel={t('accessibility.openSettings')}
            >
              <Ionicons name="settings-outline" size={18} color={Palette.accent} />
              <Text style={styles.settingsButtonText}>{t('accessibility.openSettings')}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: Palette.background },
    backIcon: { marginLeft: -1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.screenPadding,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.md,
      gap: Spacing.md,
    },
    title: {
      flex: 1,
      fontSize: 22,
      fontWeight: '700',
      color: Palette.textPrimary,
    },
    scrollContent: {
      paddingTop: Spacing.md,
    },
    hint: {
      fontSize: 14,
      color: Palette.textSecondary,
      lineHeight: 20,
      paddingHorizontal: Spacing.screenPadding + Spacing.xs,
      paddingBottom: Spacing.xl,
    },
    section: {
      paddingHorizontal: Spacing.screenPadding,
      paddingBottom: Spacing.xl,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: Palette.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      paddingHorizontal: Spacing.xs,
      paddingBottom: Spacing.md,
    },
    card: {
      backgroundColor: Palette.card,
      borderRadius: Radius.lg,
      overflow: 'hidden',
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: Palette.separator,
      marginHorizontal: Spacing.cardPaddingX,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.cardPaddingY,
      paddingHorizontal: Spacing.cardPaddingX,
      gap: Spacing.lg,
    },
    featureRowPressed: {
      backgroundColor: Palette.cardPressed,
    },
    featureRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    featureInfo: {
      flex: 1,
      gap: 2,
    },
    featureLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: Palette.textPrimary,
    },
    featureDesc: {
      fontSize: 13,
      color: Palette.textSecondary,
      lineHeight: 18,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: Radius.sm,
    },
    statusOn: {
      backgroundColor: STATUS_ON_GREEN + '1A',
    },
    statusOff: {
      backgroundColor: Palette.background,
    },
    statusText: {
      fontSize: 13,
      fontWeight: '600',
    },
    statusTextOn: {
      color: STATUS_ON_GREEN,
    },
    statusTextOff: {
      color: Palette.textTertiary,
    },
    footnote: {
      fontSize: 13,
      color: Palette.textTertiary,
      lineHeight: 18,
      paddingHorizontal: Spacing.screenPadding + Spacing.xs,
      paddingBottom: Spacing.xl,
    },
    settingsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.md,
      backgroundColor: Palette.card,
      borderRadius: Radius.lg,
      paddingVertical: Spacing.cardPaddingY,
    },
    settingsButtonSpaced: {
      marginTop: Spacing.md,
    },
    settingsButtonPressed: {
      backgroundColor: Palette.cardPressed,
    },
    settingsButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: Palette.accent,
    },
  });
