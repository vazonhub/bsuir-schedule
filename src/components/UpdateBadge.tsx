import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Image, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReduceMotion } from '@hooks/useAccessibility';
import { usePalette } from '@hooks/usePalette';
import { AppVersionController } from '@controllers/appVersion.controller';
import { useAppVersionStore } from '@stores/appVersion.store';
import { usePreferencesStore } from '@stores/preferences.store';
import { Radius, Spacing } from '@theme';
import { TAB_BAR_HEIGHT } from '@theme/spacing';

const appLogo = require('../../assets/splash-logo.png') as number;

type PaletteType = ReturnType<typeof usePalette>;

interface Props {
  onPress: () => void;
}

const DEV_FORCE_VISIBLE = false; // __DEV__

/** Text on the accent-filled pill — white in both themes. */
const BADGE_LABEL_COLOR = '#FFFFFF';

export const UpdateBadge = ({ onPress }: Props) => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);

  const latestVersion = useAppVersionStore((s) => s.latestVersion);
  const lastSeenVersion = usePreferencesStore((s) => s.lastSeenVersion);

  const hasUpdate = latestVersion ? AppVersionController.hasUpdate : false;
  const isUnseen = latestVersion ? lastSeenVersion !== latestVersion : false;

  const visible = DEV_FORCE_VISIBLE || hasUpdate || isUnseen;
  const label = hasUpdate ? `v${latestVersion}` : t('update.new');

  // Slide-in animation
  const [translateX] = useState(() => new Animated.Value(120));

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: visible ? 0 : 120,
      duration: reduceMotion ? 0 : 300,
      useNativeDriver: true,
    }).start();
  }, [visible, translateX, reduceMotion]);

  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  if (!DEV_FORCE_VISIBLE && !latestVersion) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: TAB_BAR_HEIGHT + insets.bottom + 20,
          transform: [{ translateX }],
        },
      ]}
    >
      <Pressable
        style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
        onPress={handlePress}
        accessibilityLabel={t('update.whatsNew')}
        accessibilityRole="button"
      >
        <Image source={appLogo} style={styles.logo} />
        <Text style={styles.label}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
};

const makeStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      right: 0,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: Palette.accent,
      borderTopLeftRadius: Radius.md,
      borderBottomLeftRadius: Radius.md,
      borderTopRightRadius: 0,
      borderBottomRightRadius: 0,
      paddingVertical: Spacing.md,
      paddingLeft: Spacing.lg,
      paddingRight: Spacing.xl,
    },
    pillPressed: {
      opacity: 0.85,
    },
    logo: {
      width: 20,
      height: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '700',
      color: BADGE_LABEL_COLOR,
    },
  });
