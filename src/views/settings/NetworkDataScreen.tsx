import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassButton } from '@components/GlassButton';
import { usePalette } from '@hooks/usePalette';
import { clearLocalCache } from '@services/cache/cache';
import { isICloudAvailable } from '@services/cloud/icloud';
import { clearCloudSchedules } from '@services/cloud/syncService';
import { updateWidgetSnapshot } from '@services/widget';
import { usePreferencesStore } from '@stores/preferences.store';
import { Radius, Spacing } from '@theme';
import { hapticLight, hapticSuccess } from '@utils/haptics';

type PaletteType = ReturnType<typeof usePalette>;

export const NetworkDataScreen = () => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);

  const sourceBsuirApi = usePreferencesStore((s) => s.sourceBsuirApi);
  const setSourceBsuirApi = usePreferencesStore((s) => s.setSourceBsuirApi);
  const sourceICloud = usePreferencesStore((s) => s.sourceICloud);
  const setSourceICloud = usePreferencesStore((s) => s.setSourceICloud);

  // ── Toast ──
  const [toast, setToast] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(
        () => setToast(null),
      );
    }, 2000);
  }, [toastOpacity]);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // ── Tooltip (availability hint) ──
  const [hintVisible, setHintVisible] = useState(false);
  const tooltipOpacity = useRef(new Animated.Value(0)).current;

  const toggleHint = useCallback(() => {
    if (hintVisible) {
      Animated.timing(tooltipOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(
        () => setHintVisible(false),
      );
    } else {
      setHintVisible(true);
      Animated.timing(tooltipOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [hintVisible, tooltipOpacity]);

  const toggleBsuirApi = useCallback(() => {
    void hapticLight();
    setSourceBsuirApi(!sourceBsuirApi);
  }, [sourceBsuirApi, setSourceBsuirApi]);

  const toggleICloud = useCallback(() => {
    void hapticLight();
    setSourceICloud(!sourceICloud);
  }, [sourceICloud, setSourceICloud]);

  const handleClearCache = useCallback(() => {
    Alert.alert(
      t('settings.clearCache'),
      t('settings.clearCacheConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.clear'),
          style: 'destructive',
          onPress: async () => {
            await clearLocalCache();
            await clearCloudSchedules();
            void hapticSuccess();
            showToast(t('settings.clearCacheDone'));
          },
        },
      ],
    );
  }, [t, showToast]);

  const handleRefreshWidget = useCallback(async () => {
    await updateWidgetSnapshot();
    void hapticSuccess();
    showToast(t('settings.refreshWidgetDone'));
  }, [t, showToast]);

  const showICloud = Platform.OS === 'ios' && isICloudAvailable;

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <GlassButton onPress={() => router.back()} size={38} accessibilityLabel={t('common.back')}>
          <Text style={styles.backChevron}>&#8249;</Text>
        </GlassButton>
        <Text style={styles.title} numberOfLines={1}>{t('settings.networkSection')}</Text>
      </View>

      {/* ── Доступность ── */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{t('settings.availabilityLabel')}</Text>
          <Pressable hitSlop={10} onPress={toggleHint}>
            <Ionicons name="information-circle-outline" size={18} color={Palette.textTertiary} />
          </Pressable>
          {hintVisible && (
            <Animated.View style={[styles.tooltip, { opacity: tooltipOpacity }]}>
              <Pressable onPress={toggleHint}>
                <Text style={styles.tooltipText}>{t('settings.availabilityHint')}</Text>
              </Pressable>
            </Animated.View>
          )}
        </View>
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.sourceRow, pressed && styles.sourceRowPressed]}
            onPress={toggleBsuirApi}
          >
            <Text style={styles.sourceLabel}>{t('settings.sourceBsuirApi')}</Text>
            {sourceBsuirApi && (
              <Ionicons name="checkmark" size={20} color="#34C759" />
            )}
          </Pressable>

          {showICloud && (
            <>
              <View style={styles.separator} />
              <Pressable
                style={({ pressed }) => [styles.sourceRow, pressed && styles.sourceRowPressed]}
                onPress={toggleICloud}
              >
                <Text style={styles.sourceLabel}>{t('settings.sourceICloud')}</Text>
                {sourceICloud && (
                  <Ionicons name="checkmark" size={20} color="#34C759" />
                )}
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* ── Данные ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { paddingHorizontal: Spacing.xs }]}>
          {t('settings.dataLabel')}
        </Text>
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.actionRow, pressed && styles.sourceRowPressed]}
            onPress={handleClearCache}
          >
            <Text style={styles.actionLabelDestructive}>{t('settings.clearCache')}</Text>
          </Pressable>
          <View style={styles.separator} />
          <Pressable
            style={({ pressed }) => [styles.actionRow, pressed && styles.sourceRowPressed]}
            onPress={handleRefreshWidget}
          >
            <Text style={styles.actionLabel}>{t('settings.refreshWidget')}</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Toast ── */}
      {toast && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}
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
      shadowColor: '#000',
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
    sourceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: Spacing.cardPaddingY,
      paddingHorizontal: Spacing.cardPaddingX,
    },
    sourceRowPressed: {
      backgroundColor: Palette.cardPressed,
    },
    sourceLabel: {
      fontSize: 16,
      color: Palette.textPrimary,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: Palette.separator,
      marginLeft: Spacing.cardPaddingX,
    },
    actionRow: {
      paddingVertical: Spacing.cardPaddingY,
      paddingHorizontal: Spacing.cardPaddingX,
    },
    actionLabel: {
      fontSize: 16,
      color: Palette.accent,
    },
    actionLabelDestructive: {
      fontSize: 16,
      color: Palette.destructive,
    },
    toast: {
      position: 'absolute',
      top: 60,
      alignSelf: 'center',
      backgroundColor: Palette.card,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      borderRadius: Radius.pill,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    toastText: {
      fontSize: 14,
      fontWeight: '600',
      color: Palette.textPrimary,
    },
  });
