import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassButton } from '@components/GlassButton';
import { useAccessibility } from '@hooks/useAccessibility';
import { usePalette } from '@hooks/usePalette';
import { Radius, Spacing, TAB_BAR_HEIGHT } from '@theme';
import { textProps } from '@theme/typography';

type PaletteType = ReturnType<typeof usePalette>;

export const AccessibilityScreen = () => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  const a11y = useAccessibility();

  const openA11ySettings = useCallback((path?: string) => {
    if (Platform.OS === 'ios' && path) {
      void Linking.openURL(`App-Prefs:ACCESSIBILITY/${path}`);
    } else if (Platform.OS === 'ios') {
      void Linking.openURL('App-Prefs:ACCESSIBILITY');
    } else {
      void Linking.openSettings();
    }
  }, []);

  const isLargeTextEnabled = a11y.fontScale > 1.0;
  const fontScalePercent = Math.round(a11y.fontScale * 100);

  const features: { key: string; labelKey: string; descKey: string; enabled: boolean; detail?: string; settingsPath?: string }[] = [
    {
      key: 'voiceover',
      labelKey: 'accessibility.voiceOver',
      descKey: 'accessibility.voiceOverDesc',
      enabled: a11y.isScreenReaderEnabled,
      settingsPath: 'VOICEOVER',
    },
    {
      key: 'voiceControl',
      labelKey: 'accessibility.voiceControl',
      descKey: 'accessibility.voiceControlDesc',
      enabled: a11y.isScreenReaderEnabled,
      detail: t('accessibility.supported'),
      settingsPath: 'VOICE_CONTROL',
    },
    {
      key: 'largeText',
      labelKey: 'accessibility.largeText',
      descKey: 'accessibility.largeTextDesc',
      enabled: isLargeTextEnabled,
      detail: `${fontScalePercent}%`,
      settingsPath: 'LARGER_TEXT',
    },
    {
      key: 'differentiateWithoutColor',
      labelKey: 'accessibility.differentiateWithoutColor',
      descKey: 'accessibility.differentiateWithoutColorDesc',
      enabled: a11y.isDifferentiateWithoutColorEnabled,
      settingsPath: 'DIFFERENTIATE_WITHOUT_COLOR',
    },
    {
      key: 'increaseContrast',
      labelKey: 'accessibility.increaseContrast',
      descKey: 'accessibility.increaseContrastDesc',
      enabled: a11y.isDarkerSystemColorsEnabled,
      settingsPath: 'DISPLAY_AND_TEXT',
    },
    {
      key: 'reduceMotion',
      labelKey: 'accessibility.reduceMotion',
      descKey: 'accessibility.reduceMotionDesc',
      enabled: a11y.isReduceMotionEnabled,
      settingsPath: 'MOTION',
    },
    {
      key: 'boldText',
      labelKey: 'accessibility.boldText',
      descKey: 'accessibility.boldTextDesc',
      enabled: a11y.isBoldTextEnabled,
      settingsPath: 'DISPLAY_AND_TEXT',
    },
  ];

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <GlassButton onPress={() => router.back()} size={38} accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={22} color={Palette.textPrimary} />
        </GlassButton>
        <Text {...textProps('title')} style={styles.title} numberOfLines={1}>{t('accessibility.title')}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + TAB_BAR_HEIGHT + Spacing.md },
        ]}
      >
        <Text {...textProps('subhead')} style={styles.hint}>{t('accessibility.subtitle')}</Text>

        <View style={styles.section}>
          <View style={styles.card}>
            {features.map((feature, idx) => (
              <View key={feature.key}>
                {idx > 0 && <View style={styles.separator} />}
                <Pressable
                  style={({ pressed }) => [styles.featureRow, pressed && styles.featureRowPressed]}
                  onPress={() => openA11ySettings(feature.settingsPath)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t(feature.labelKey)}, ${feature.detail ?? (feature.enabled ? t('accessibility.on') : t('accessibility.off'))}`}
                  accessibilityHint={t('accessibility.openSettings')}
                >
                  <View style={styles.featureInfo}>
                    <Text {...textProps('body')} style={styles.featureLabel}>{t(feature.labelKey)}</Text>
                    <Text {...textProps('footnote')} style={styles.featureDesc}>{t(feature.descKey)}</Text>
                  </View>
                  <View style={styles.featureRight}>
                    <View
                      style={[
                        styles.statusBadge,
                        feature.enabled ? styles.statusOn : styles.statusOff,
                      ]}
                    >
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
                    <Ionicons name="chevron-forward" size={14} color={Palette.textTertiary} />
                  </View>
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        <Text {...textProps('footnote')} style={styles.footnote}>{t('accessibility.footnote')}</Text>
      </ScrollView>
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
      backgroundColor: '#34C759' + '1A',
    },
    statusOff: {
      backgroundColor: Palette.background,
    },
    statusText: {
      fontSize: 13,
      fontWeight: '600',
    },
    statusTextOn: {
      color: '#34C759',
    },
    statusTextOff: {
      color: Palette.textTertiary,
    },
    footnote: {
      fontSize: 13,
      color: Palette.textTertiary,
      lineHeight: 18,
      paddingHorizontal: Spacing.screenPadding + Spacing.xs,
    },
  });
