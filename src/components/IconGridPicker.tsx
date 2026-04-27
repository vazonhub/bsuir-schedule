import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { usePalette } from '@hooks/usePalette';
import { Radius, Spacing } from '@theme';

interface Props {
  icons: readonly string[];
  selected: string;
  color: string;
  onSelect(name: string): void;
}

const CELL_SIZE = 44;
const CELL_GAP = 8;

/** Clean up Ionicons name for accessibility: "school-outline" → "School" */
const humanizeIconName = (name: string): string =>
  name
    .replace(/-outline$/, '')
    .replace(/-sharp$/, '')
    .replace(/-/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());

export const IconGridPicker = ({ icons, selected, color, onSelect }: Props) => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);

  return (
    <View style={styles.grid}>
      {icons.map((name) => {
        const isSelected = name === selected;
        return (
          <Pressable
            key={name}
            onPress={() => onSelect(name)}
            style={[
              styles.cell,
              isSelected && [styles.cellSelected, { borderColor: color }],
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.iconChoice', { name: humanizeIconName(name) })}
            accessibilityState={{ selected: isSelected }}
          >
            <Ionicons
              name={name as never}
              size={22}
              color={isSelected ? color : Palette.textSecondary}
            />
          </Pressable>
        );
      })}
    </View>
  );
};

type PaletteType = ReturnType<typeof usePalette>;

const makeStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: CELL_GAP,
      paddingVertical: Spacing.sm,
    },
    cell: {
      width: CELL_SIZE,
      height: CELL_SIZE,
      borderRadius: Radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Palette.card,
    },
    cellSelected: {
      borderWidth: 2,
    },
  });
