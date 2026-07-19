import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { usePalette } from '@hooks/usePalette';
import type { ErrorKind } from '@stores/schedule.store';
import { Radius, Spacing } from '@theme';
import { textProps } from '@theme/typography';

type PaletteType = ReturnType<typeof usePalette>;

/** Text on the accent-filled retry button — white in both themes. */
const RETRY_LABEL_COLOR = '#FFFFFF';

interface Props {
  kind: ErrorKind | null;
  onRetry(): void;
}

export const ScheduleError = ({ kind, onRetry }: Props) => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);

  const icon: keyof typeof Ionicons.glyphMap =
    kind === 'apiDisabled'
      ? 'toggle-outline'
      : kind === 'server'
        ? 'server-outline'
        : kind === 'network'
          ? 'cloud-offline-outline'
          : 'alert-circle-outline';

  const title =
    kind === 'apiDisabled'
      ? t('error.apiDisabled')
      : kind === 'server'
        ? t('error.serverDown')
        : kind === 'network'
          ? t('error.networkDown')
          : t('error.generic');

  const hint =
    kind === 'apiDisabled'
      ? t('error.apiDisabledHint')
      : kind === 'server'
        ? t('error.serverHint')
        : kind === 'network'
          ? t('error.networkHint')
          : t('error.genericHint');

  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <Ionicons name={icon} size={56} color={Palette.textTertiary} />
      <Text {...textProps('headline')} style={styles.title}>
        {title}
      </Text>
      <Text {...textProps('subhead')} style={styles.hint}>
        {hint}
      </Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
        accessibilityRole="button"
        accessibilityLabel={t('common.retry')}
        accessibilityHint={t('a11y.retryLoad')}
      >
        <Text {...textProps('callout')} style={styles.retryLabel}>
          {t('common.retry')}
        </Text>
      </Pressable>
    </View>
  );
};

const makeStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xxxl,
      gap: Spacing.lg,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: Palette.textPrimary,
      textAlign: 'center',
      marginTop: Spacing.md,
    },
    hint: {
      fontSize: 14,
      color: Palette.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    retry: {
      marginTop: Spacing.md,
      paddingHorizontal: Spacing.xxl,
      paddingVertical: Spacing.lg,
      borderRadius: Radius.lg,
      backgroundColor: Palette.accent,
    },
    retryPressed: { opacity: 0.7 },
    retryLabel: { color: RETRY_LABEL_COLOR, fontSize: 15, fontWeight: '600' },
  });
