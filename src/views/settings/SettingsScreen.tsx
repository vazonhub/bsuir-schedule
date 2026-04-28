import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useReduceMotion } from '@hooks/useAccessibility';
import { useIsDark, usePalette } from '@hooks/usePalette';
import { hapticLight, hapticSuccess } from '@utils/haptics';
import type { LanguageChoice, ThemeChoice } from '@stores/preferences.store';
import { usePreferencesStore } from '@stores/preferences.store';
import { Radius, Spacing } from '@theme';
import { textProps } from '@theme/typography';

type PaletteType = ReturnType<typeof usePalette>;

const THEME_VALUES: ThemeChoice[] = ['auto', 'light', 'dark'];
const LANG_VALUES: LanguageChoice[] = ['ru', 'be', 'en'];
const LANG_LABELS = ['Русский', 'Беларуская', 'English'];

const PINK = '#FF2D55';

const TIP_PRODUCT_IDS = [
  'by.vazon.bsuirtime.tip.small',
  'by.vazon.bsuirtime.tip.medium',
  'by.vazon.bsuirtime.tip.large',
];

const TIP_META: Record<string, { icon: string; nameKey: string; descKey: string }> = {
  'by.vazon.bsuirtime.tip.small': { icon: 'cafe-outline', nameKey: 'settings.tipSmallName', descKey: 'settings.tipSmallDesc' },
  'by.vazon.bsuirtime.tip.medium': { icon: 'rocket-outline', nameKey: 'settings.tipMediumName', descKey: 'settings.tipMediumDesc' },
  'by.vazon.bsuirtime.tip.large': { icon: 'diamond-outline', nameKey: 'settings.tipLargeName', descKey: 'settings.tipLargeDesc' },
};

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

  const reduceMotion = useReduceMotion();
  const themeLabels = [t('settings.themeAuto'), t('settings.themeLight'), t('settings.themeDark')];
  const themeIndex = THEME_VALUES.indexOf(theme);
  const langIndex = LANG_VALUES.indexOf(language);

  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['40%'], []);

  // ── IAP ──
  type IAPProduct = { id: string; displayPrice: string };
  const [products, setProducts] = useState<IAPProduct[]>([]);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const iapReady = useRef(false);

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    Animated.timing(toastOpacity, { toValue: 1, duration: reduceMotion ? 0 : 200, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: reduceMotion ? 0 : 300, useNativeDriver: true }).start(
        () => setToast(null),
      );
    }, 2500);
  }, [toastOpacity, reduceMotion]);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let cancelled = false;
    const init = async () => {
      try {
        const RNIap = require('react-native-iap');
        await RNIap.initConnection();
        iapReady.current = true;
        const items = await RNIap.fetchProducts({ skus: TIP_PRODUCT_IDS });
        if (!cancelled && items.length > 0) {
          // Sort by price to keep small→medium→large order
          const sorted = [...items].sort(
            (a: { price?: number | null }, b: { price?: number | null }) =>
              (a.price ?? 0) - (b.price ?? 0),
          );
          setProducts(sorted.map((p: { id: string; displayPrice: string }) => ({
            id: p.id,
            displayPrice: p.displayPrice,
          })));
        }
      } catch {
        // IAP not available (simulator without StoreKit config, etc.)
      }
    };
    void init();
    return () => {
      cancelled = true;
      if (iapReady.current) {
        try {
          const RNIap = require('react-native-iap');
          void RNIap.endConnection();
        } catch { /* */ }
      }
    };
  }, []);

  const handlePurchase = useCallback(async (productId: string) => {
    if (purchasing) return;
    if (!iapReady.current) {
      showToast(t('settings.tipJarUnavailable'));
      return;
    }
    setPurchasing(productId);
    try {
      const RNIap = require('react-native-iap');
      await RNIap.requestPurchase({
        request: {
          apple: {
            sku: productId,
            andDangerouslyFinishTransactionAutomatically: true,
          },
          google: { skus: [productId] },
        },
        type: 'in-app',
      });
      void hapticSuccess();
      showToast(t('settings.tipJarThanks'));
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code !== 'E_USER_CANCELLED') {
        Alert.alert('Error', String(err));
      }
    } finally {
      setPurchasing(null);
    }
  }, [purchasing, showToast, t]);

  const handleTipPress = useCallback(() => {
    void hapticLight();
    sheetRef.current?.present();
  }, []);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <Text {...textProps('title')} style={styles.screenTitle}>{t('settings.title')}</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text {...textProps('footnote')} style={styles.sectionTitle}>{t('settings.themeSection')}</Text>
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
        <Text {...textProps('footnote')} style={styles.sectionTitle}>{t('settings.languageSection')}</Text>
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
        <Text {...textProps('footnote')} style={styles.sectionTitle}>{t('settings.interfaceSection')}</Text>
        {/* TODO 2.1: Иконка приложения + реклама
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
            onPress={() => { sheetRef.current?.dismiss(); router.push('/(tabs)/(settings)/app-icon'); }}
          >
            <Ionicons name="sparkles" size={20} color={Palette.accent} />
            <Text {...textProps('body')} style={styles.navLabel}>{t('settings.appIconSection')}</Text>
            <Ionicons name="chevron-forward" size={18} color={Palette.textTertiary} />
          </Pressable>
        </View>
        */}
        {/* TODO 2.1: Внешний вид + реклама
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
            onPress={() => { sheetRef.current?.dismiss(); router.push('/(tabs)/(settings)/appearance'); }}
          >
            <Ionicons name="color-palette-outline" size={20} color={Palette.accent} />
            <Text {...textProps('body')} style={styles.navLabel}>{t('settings.appearanceSection')}</Text>
            <Ionicons name="chevron-forward" size={18} color={Palette.textTertiary} />
          </Pressable>
        </View>
        */}
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
            onPress={() => { sheetRef.current?.dismiss(); router.push('/(tabs)/(settings)/accessibility'); }}
            accessibilityRole="button"
            accessibilityLabel={t('accessibility.title')}
          >
            <Ionicons name="accessibility-outline" size={20} color={Palette.accent} />
            <Text {...textProps('body')} style={styles.navLabel}>{t('accessibility.title')}</Text>
            <Ionicons name="chevron-forward" size={18} color={Palette.textTertiary} />
          </Pressable>
        </View>
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
            onPress={() => { sheetRef.current?.dismiss(); router.push('/(tabs)/(settings)/holidays'); }}
          >
            <Ionicons name="calendar-outline" size={20} color={Palette.accent} />
            <Text {...textProps('body')} style={styles.navLabel}>{t('settings.holidaysSection')}</Text>
            <Ionicons name="chevron-forward" size={18} color={Palette.textTertiary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.navSection}>
        <Text {...textProps('footnote')} style={styles.sectionTitle}>{t('settings.otherSection')}</Text>
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
            onPress={() => { sheetRef.current?.dismiss(); router.push('/(tabs)/(settings)/network'); }}
          >
            <Ionicons name="cloud-outline" size={20} color={Palette.accent} />
            <Text {...textProps('body')} style={styles.navLabel}>{t('settings.networkSection')}</Text>
            <Ionicons name="chevron-forward" size={18} color={Palette.textTertiary} />
          </Pressable>
        </View>
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
            onPress={() => { sheetRef.current?.dismiss(); router.push('/(tabs)/(settings)/about'); }}
          >
            <Ionicons name="information-circle-outline" size={20} color={Palette.accent} />
            <Text {...textProps('body')} style={styles.navLabel}>{t('settings.aboutSection')}</Text>
            <Ionicons name="chevron-forward" size={18} color={Palette.textTertiary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.tipSection}>
        {Platform.OS === 'ios' && (
        <View style={styles.tipCard}>
          <Pressable
            style={({ pressed }) => [styles.tipRow, pressed && styles.tipRowPressed]}
            onPress={handleTipPress}
          >
            <Ionicons name="heart" size={20} color={PINK} />
            <Text maxFontSizeMultiplier={1} style={styles.tipLabel}>{t('settings.tipJar')}</Text>
          </Pressable>
        </View>
        )}
      </View>
      </ScrollView>

      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <View style={styles.sheetHero}>
            <View style={styles.heartCircle}>
              <Ionicons name="heart" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.sheetSubtitle}>{t('settings.tipJarSubtitle')}</Text>
          </View>

          <View style={styles.sheetTips}>
            {TIP_PRODUCT_IDS.map((id) => {
              const meta = TIP_META[id];
              if (!meta) return null;
              const product = products.find((p) => p.id === id);
              const isPurchasing = purchasing === id;
              return (
                <Pressable
                  key={id}
                  style={({ pressed }) => [styles.sheetTipCard, pressed && styles.sheetTipCardPressed]}
                  onPress={() => void handlePurchase(id)}
                  disabled={isPurchasing}
                >
                  <View style={styles.sheetTipIcon}>
                    <Ionicons name={meta.icon as never} size={22} color={PINK} />
                  </View>
                  <View style={styles.sheetTipInfo}>
                    <Text style={styles.sheetTipName}>{t(meta.nameKey)}</Text>
                    <Text style={styles.sheetTipDesc}>{t(meta.descKey)}</Text>
                  </View>
                  <Text style={styles.sheetTipPrice}>
                    {product?.displayPrice ?? '...'}
                  </Text>
                  {isPurchasing && (
                    <View style={styles.purchaseOverlay}>
                      {Platform.OS === 'ios' ? (
                        <BlurView intensity={40} tint="default" style={StyleSheet.absoluteFill} />
                      ) : (
                        <View style={[StyleSheet.absoluteFill, styles.purchaseOverlayFallback]} />
                      )}
                      <ActivityIndicator size="small" color={PINK} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>

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
      paddingBottom: Spacing.xl,
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
    tipSection: {
      paddingHorizontal: Spacing.screenPadding,
      marginTop: Spacing.xl,
    },
    tipCard: {
      backgroundColor: PINK + '14',
      borderRadius: Radius.lg,
      overflow: 'hidden',
    },
    tipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.md,
      paddingVertical: Spacing.cardPaddingY,
      paddingHorizontal: Spacing.cardPaddingX,
    },
    tipRowPressed: {
      backgroundColor: PINK + '24',
    },
    tipLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: PINK,
    },
    // ── Bottom Sheet ──
    sheetBackground: {
      backgroundColor: Palette.card,
      borderRadius: Radius.xl,
    },
    sheetHandle: {
      backgroundColor: Palette.textTertiary,
      width: 36,
    },
    sheetContent: {
      padding: Spacing.xl,
      paddingBottom: Spacing.xxxl + 40,
      gap: Spacing.lg,
    },
    sheetHero: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
    },
    heartCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: PINK,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetSubtitle: {
      flex: 1,
      fontSize: 15,
      color: Palette.textSecondary,
      textAlign: 'left',
      lineHeight: 22,
    },
    sheetTips: {
      gap: Spacing.cardGap,
    },
    sheetTipCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Palette.background,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      gap: Spacing.lg,
    },
    sheetTipCardPressed: {
      backgroundColor: Palette.cardPressed,
    },
    sheetTipIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: PINK + '14',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetTipInfo: {
      flex: 1,
      gap: 2,
    },
    sheetTipName: {
      fontSize: 16,
      fontWeight: '600',
      color: Palette.textPrimary,
    },
    sheetTipDesc: {
      fontSize: 13,
      color: Palette.textSecondary,
    },
    sheetTipPrice: {
      fontSize: 16,
      fontWeight: '700',
      color: PINK,
    },
    purchaseOverlay: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: Radius.lg,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    purchaseOverlayFallback: {
      backgroundColor: Palette.background + 'CC',
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
