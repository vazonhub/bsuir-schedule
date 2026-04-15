import { StyleSheet, Text, View } from 'react-native';

import { Palette, Spacing } from '@theme';

interface Props {
  abbrev: string;
  name?: string;
}

/**
 * Sticky section header for the grouped list of student groups.
 *
 * Visually it reads as plain text on the screen background, but the wrapper
 * carries an opaque `backgroundColor: Palette.background` so that — when the
 * `SectionList` makes it sticky — it cleanly hides any cards passing behind.
 */
export const SectionHeader = ({ abbrev, name }: Props) => (
  <View style={styles.header}>
    <Text style={styles.abbrev}>{abbrev}</Text>
    {name ? (
      <>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
      </>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
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
