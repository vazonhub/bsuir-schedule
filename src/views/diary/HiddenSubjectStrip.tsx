import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { usePalette } from '@hooks/usePalette';
import { Radius, Spacing } from '@theme';
import { textProps } from '@theme/typography';
import { hapticLight } from '@utils/haptics';

type PaletteType = ReturnType<typeof usePalette>;

interface Props {
  subject: string;
  subjectFullName: string;
  onUnhide(): void;
}

/**
 * Thin bar for a subject the user has hidden. Muted appearance — mirrors the
 * "blocked lesson" strip in the schedule. Tap or long-press → offer to unhide.
 */
export const HiddenSubjectStrip = ({ subject, subjectFullName, onUnhide }: Props) => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);

  const askUnhide = () => {
    Alert.alert(t('diary.actionsTitle'), subjectFullName, [
      {
        text: t('diary.actionShow'),
        onPress: () => {
          void hapticLight();
          onUnhide();
        },
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  return (
    <Pressable
      onPress={askUnhide}
      onLongPress={askUnhide}
      style={({ pressed }) => [styles.strip, pressed && styles.stripPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${subject} — скрыт`}
    >
      <Ionicons name="eye-off-outline" size={14} color={Palette.textTertiary} />
      <Text {...textProps('subhead')} style={styles.code} numberOfLines={1}>
        {subject}
      </Text>
      <Text {...textProps('footnote')} style={styles.full} numberOfLines={1}>
        {subjectFullName}
      </Text>
    </Pressable>
  );
};

const makeStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    strip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: Palette.card,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.cardPaddingX,
      paddingVertical: Spacing.md,
      opacity: 0.6,
    },
    stripPressed: {
      backgroundColor: Palette.cardPressed,
    },
    code: {
      fontSize: 14,
      fontWeight: '700',
      color: Palette.textSecondary,
      flexShrink: 0,
    },
    full: {
      flex: 1,
      color: Palette.textTertiary,
    },
  });
