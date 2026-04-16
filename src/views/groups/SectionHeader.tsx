import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { usePalette } from '@hooks/usePalette';
import { Spacing } from '@theme';

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

  return (
    <View style={styles.header}>
      {pinned && <Ionicons name="star" size={13} color={Palette.accent} />}
      <Text style={styles.abbrev}>{abbrev}</Text>
      {name ? (
        <>
          <Text style={styles.dot}>&middot;</Text>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
        </>
      ) : null}
    </View>
  );
};

const makeStyles = (Palette: PaletteType) => StyleSheet.create({
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
