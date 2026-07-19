import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { usePalette } from '@hooks/usePalette';
import { Spacing } from '@theme';
import { textProps } from '@theme/typography';

type PaletteType = ReturnType<typeof usePalette>;

interface Props {
  abbrev: string;
  name?: string;
  pinned?: boolean;
}

/**
 * Sticky section header for the grouped list of student groups.
 *
 * Visually it reads as plain text on the screen background, but the wrapper
 * carries an opaque `backgroundColor: Palette.background` so that — when the
 * `SectionList` makes it sticky — it cleanly hides any cards passing behind.
 */
export const SectionHeader = ({ abbrev, name, pinned }: Props) => {
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);

  const a11yLabel = name ? `${abbrev}, ${name}` : abbrev;

  return (
    <View style={styles.header} accessibilityRole="header" accessibilityLabel={a11yLabel}>
      {pinned && (
        <Ionicons name="star" size={13} color={Palette.accent} importantForAccessibility="no" />
      )}
      <Text {...textProps('footnote')} style={styles.abbrev} numberOfLines={1} ellipsizeMode="tail">
        {abbrev}
      </Text>
      {name ? (
        <>
          <Text {...textProps('footnote')} style={styles.dot}>
            &middot;
          </Text>
          <Text
            {...textProps('footnote')}
            style={styles.name}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {name}
          </Text>
        </>
      ) : null}
    </View>
  );
};

const makeStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.cardPaddingX + Spacing.screenPadding - 8, // визуально выровнено с текстом карточки
      paddingTop: Spacing.sectionTop,
      paddingBottom: Spacing.sectionBottom,
      backgroundColor: Palette.background,
      gap: Spacing.sm,
    },
    abbrev: {
      fontSize: 13,
      fontWeight: '700',
      color: Palette.textPrimary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      flexShrink: 0,
    },
    dot: {
      fontSize: 13,
      color: Palette.textTertiary,
    },
    name: {
      flex: 1,
      fontSize: 13,
      color: Palette.textSecondary,
    },
  });
