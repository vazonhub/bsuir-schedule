import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassButton } from '@components/GlassButton';
import { UnityBanner } from '@components/UnityBanner';
import { UpdateModal } from '@components/UpdateModal';
import { useReduceMotion } from '@hooks/useAccessibility';
import { usePalette } from '@hooks/usePalette';
import { useAppVersionStore } from '@stores/appVersion.store';
import { usePreferencesStore } from '@stores/preferences.store';
import { Radius, Spacing } from '@theme';

type PaletteType = ReturnType<typeof usePalette>;

const PRIVACY_POLICY_RU =
  'https://dorian-camera-fc6.notion.site/Bsuir-Time-34ba9d552bd8800e8008d333dace4ada';
const PRIVACY_POLICY_EN =
  'https://dorian-camera-fc6.notion.site/Privacy-Policy-for-Bsuir-Time-344a9d552bd880c79b77cd8a6605e653';

const TOOLTIP_SHADOW_COLOR = '#000';

export const AboutScreen = () => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const router = useRouter();
  const reduceMotion = useReduceMotion();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  const language = usePreferencesStore((s) => s.language);

  const latestVersion = useAppVersionStore((s) => s.latestVersion);
  const releaseNotes = useAppVersionStore((s) => s.releaseNotes);
  const storeUrl = useAppVersionStore((s) => s.storeUrl);
  const [whatsNewVisible, setWhatsNewVisible] = useState(false);

  // ── Tooltip ──
  const [hintVisible, setHintVisible] = useState(false);
  const [tooltipOpacity] = useState(() => new Animated.Value(0));

  const toggleHint = useCallback(() => {
    if (hintVisible) {
      Animated.timing(tooltipOpacity, {
        toValue: 0,
        duration: reduceMotion ? 0 : 200,
        useNativeDriver: true,
      }).start(() => setHintVisible(false));
    } else {
      setHintVisible(true);
      Animated.timing(tooltipOpacity, {
        toValue: 1,
        duration: reduceMotion ? 0 : 200,
        useNativeDriver: true,
      }).start();
    }
  }, [hintVisible, tooltipOpacity, reduceMotion]);

  const openTelegram = useCallback(() => {
    void Linking.openURL('https://t.me/multibelbet');
  }, []);

  const openGithub = useCallback(() => {
    void Linking.openURL('https://github.com/vazonhub/bsuir-schedule');
  }, []);

  const openPrivacyPolicy = useCallback(() => {
    const url = language === 'en' ? PRIVACY_POLICY_EN : PRIVACY_POLICY_RU;
    void Linking.openURL(url);
  }, [language]);

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
        <Text style={styles.title} numberOfLines={1}>
          {t('settings.aboutSection')}
        </Text>
      </View>

      {/* ── Social media ── */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{t('settings.aboutSocials')}</Text>
          <Pressable hitSlop={10} onPress={toggleHint}>
            <Ionicons name="information-circle-outline" size={18} color={Palette.textTertiary} />
          </Pressable>
          {hintVisible && (
            <Animated.View style={[styles.tooltip, { opacity: tooltipOpacity }]}>
              <Pressable onPress={toggleHint}>
                <Text style={styles.tooltipText}>{t('settings.aboutTelegramHint')}</Text>
              </Pressable>
            </Animated.View>
          )}
        </View>
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
            onPress={openTelegram}
          >
            <Ionicons name="paper-plane-outline" size={20} color={Palette.accent} />
            <Text style={styles.navLabel}>Telegram</Text>
            <Ionicons name="open-outline" size={18} color={Palette.textTertiary} />
          </Pressable>
          <View style={styles.separator} />
          <Pressable
            style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
            onPress={openGithub}
          >
            <Ionicons name="logo-github" size={20} color={Palette.accent} />
            <Text style={styles.navLabel}>GitHub</Text>
            <Ionicons name="open-outline" size={18} color={Palette.textTertiary} />
          </Pressable>
        </View>
      </View>

      {/* ── Documents ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { paddingHorizontal: Spacing.xs }]}>
          {t('settings.aboutDocuments')}
        </Text>
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
            onPress={() => setWhatsNewVisible(true)}
          >
            <Ionicons name="sparkles-outline" size={20} color={Palette.accent} />
            <Text style={styles.navLabel}>{t('update.whatsNew')}</Text>
            <Ionicons name="chevron-forward" size={18} color={Palette.textTertiary} />
          </Pressable>
          <View style={styles.separator} />
          <Pressable
            style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
            onPress={openPrivacyPolicy}
          >
            <Ionicons name="document-text-outline" size={20} color={Palette.accent} />
            <Text style={styles.navLabel}>{t('settings.aboutPrivacyPolicy')}</Text>
            <Ionicons name="open-outline" size={18} color={Palette.textTertiary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.bannerWrap}>
        <UnityBanner />
      </View>

      <UpdateModal
        visible={whatsNewVisible}
        version={latestVersion}
        releaseNotes={releaseNotes}
        storeUrl={storeUrl}
        onClose={() => setWhatsNewVisible(false)}
      />
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
    section: {
      paddingHorizontal: Spacing.screenPadding,
      paddingBottom: Spacing.xl,
      gap: Spacing.md,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.xs,
      zIndex: 10,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: Palette.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    tooltip: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      marginTop: Spacing.sm,
      backgroundColor: Palette.card,
      borderRadius: Radius.md,
      padding: Spacing.lg,
      shadowColor: TOOLTIP_SHADOW_COLOR,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
    tooltipText: {
      fontSize: 13,
      color: Palette.textSecondary,
      lineHeight: 18,
      textAlign: 'justify',
    },
    card: {
      backgroundColor: Palette.card,
      borderRadius: Radius.lg,
      overflow: 'hidden',
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: Palette.separator,
      marginLeft: Spacing.cardPaddingX,
    },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
      paddingVertical: Spacing.cardPaddingY,
      paddingHorizontal: Spacing.cardPaddingX,
    },
    bannerWrap: {
      alignItems: 'center',
      paddingHorizontal: Spacing.screenPadding,
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
