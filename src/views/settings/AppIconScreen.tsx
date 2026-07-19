import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassButton } from '@components/GlassButton';
import { APP_ICON_SECTIONS } from '@constants/appIcons';
import { usePalette } from '@hooks/usePalette';
import { showRewardedAd } from '@services/ads';
import { Radius, Spacing, TAB_BAR_HEIGHT } from '@theme';

type PaletteType = ReturnType<typeof usePalette>;

const COLUMNS = 4;
const MIN_GAP = 8;
const BORDER_TRANSPARENT = 'transparent';

const getCurrentIconName = (): string | null => {
  try {
    const { getAppIconName } = require('expo-alternate-app-icons');
    return getAppIconName() ?? null;
  } catch {
    return null;
  }
};

const changeIcon = async (key: string | null): Promise<void> => {
  const { setAlternateAppIcon, resetAppIcon } = require('expo-alternate-app-icons');
  if (key === null) {
    await resetAppIcon();
  } else {
    await setAlternateAppIcon(key);
  }
};

export const AppIconScreen = () => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);

  const { width: screenWidth } = useWindowDimensions();
  const gridWidth = screenWidth - Spacing.screenPadding * 2;
  const iconSize = Math.floor((gridWidth - MIN_GAP * (COLUMNS - 1)) / COLUMNS) - 8;
  const iconGap = Math.floor((gridWidth - (iconSize + 8) * COLUMNS) / (COLUMNS - 1));

  const [currentIcon, setCurrentIcon] = useState<string | null>(() => getCurrentIconName());

  const handleSelect = useCallback(
    (key: string | null) => {
      if (key === currentIcon) return;

      Alert.alert(t('settings.appIconApplyTitle'), t('settings.appIconApplyMessage'), [
        {
          text: t('settings.appIconApplyButton'),
          isPreferred: true,
          onPress: async () => {
            const rewarded = await showRewardedAd();
            if (!rewarded) return;
            try {
              await changeIcon(key);
              setCurrentIcon(key);
            } catch (err) {
              Alert.alert('Error', String(err));
            }
          },
        },
        {
          text: t('common.cancel'),
          style: 'destructive',
        },
      ]);
    },
    [currentIcon, t],
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
        <Text style={styles.title} numberOfLines={1}>
          {t('settings.appIconSection')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + TAB_BAR_HEIGHT + Spacing.md },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {APP_ICON_SECTIONS.map((section) => (
          <View key={section.titleKey}>
            <Text style={styles.sectionTitle}>{t(section.titleKey)}</Text>
            <View style={[styles.grid, { gap: iconGap }]}>
              {section.icons.map((icon) => {
                const isSelected = icon.key === currentIcon;
                return (
                  <Pressable
                    key={icon.key ?? 'default'}
                    onPress={() => handleSelect(icon.key)}
                    style={[styles.iconWrap, { width: iconSize + 8 }]}
                  >
                    <View
                      style={[styles.iconBorder, isSelected && { borderColor: Palette.accent }]}
                    >
                      <Image
                        source={icon.preview}
                        style={{ width: iconSize, height: iconSize, borderRadius: Radius.lg - 3 }}
                        contentFit="cover"
                      />
                    </View>
                    <Text
                      style={[styles.iconLabel, isSelected && styles.iconLabelSelected]}
                      numberOfLines={1}
                    >
                      {icon.label}
                    </Text>
                    {isSelected && (
                      <View style={[styles.checkBadge, { backgroundColor: Palette.accent }]}>
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
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
    title: { flex: 1, fontSize: 22, fontWeight: '700', color: Palette.textPrimary },
    scroll: { paddingHorizontal: Spacing.screenPadding },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: Palette.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: Spacing.xl,
      marginBottom: Spacing.md,
      paddingHorizontal: Spacing.xs,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    iconWrap: {
      alignItems: 'center',
    },
    iconBorder: {
      borderRadius: Radius.lg,
      borderWidth: 3,
      borderColor: BORDER_TRANSPARENT,
      overflow: 'hidden',
    },
    iconLabel: {
      fontSize: 10,
      color: Palette.textSecondary,
      marginTop: 4,
    },
    iconLabelSelected: {
      color: Palette.accent,
      fontWeight: '600',
    },
    checkBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
