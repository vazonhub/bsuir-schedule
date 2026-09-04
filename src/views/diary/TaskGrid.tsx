import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { hapticLight } from '@utils/haptics';
import { useIsDark, usePalette } from '@hooks/usePalette';
import { Radius, Spacing } from '@theme';
import { textProps } from '@theme/typography';

type PaletteType = ReturnType<typeof usePalette>;

interface Props {
  count: number;
  completed: number[];
  /** Tap a cell — opens the task's note / assignment. */
  onPressTask(index: number): void;
  /** 1-based indices that have a note attached (shown with a small dot). */
  noted?: ReadonlySet<number>;
}

const GAP = Spacing.sm;
const CELL_HEIGHT = 32;

/**
 * Number of cells per row, chosen to keep cells readable at any N.
 * ≤10 → single row (up to N cells wide). >10 → 6–8 per row multi-row grid.
 */
const cellsPerRow = (count: number): number => {
  if (count <= 5) return count;
  if (count <= 10) return count;
  if (count <= 16) return 8;
  if (count <= 24) return 8;
  return 7;
};

export const TaskGrid = ({ count, completed, onPressTask, noted }: Props) => {
  const Palette = usePalette();
  const isDark = useIsDark();
  const styles = useMemo(() => makeStyles(Palette, isDark), [Palette, isDark]);
  const completedSet = useMemo(() => new Set(completed), [completed]);
  const perRow = cellsPerRow(count);

  const rows = useMemo(() => {
    const out: number[][] = [];
    for (let i = 1; i <= count; i += perRow) {
      const row: number[] = [];
      for (let j = i; j < i + perRow && j <= count; j++) row.push(j);
      out.push(row);
    }
    return out;
  }, [count, perRow]);

  return (
    <View style={styles.wrap} accessibilityLabel="task grid">
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((idx) => {
            const done = completedSet.has(idx);
            const hasNote = noted?.has(idx) ?? false;
            return (
              <Pressable
                key={idx}
                onPress={() => {
                  void hapticLight();
                  onPressTask(idx);
                }}
                style={({ pressed }) => [
                  styles.cell,
                  done ? styles.cellDone : styles.cellIdle,
                  pressed && !done && styles.cellPressed,
                  pressed && done && styles.cellDonePressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ checked: done }}
                accessibilityLabel={`Задание ${idx}${done ? ', выполнено' : ''}${hasNote ? ', есть заметка' : ''}`}
              >
                <Text
                  {...textProps('subhead')}
                  style={[styles.cellText, done && styles.cellTextDone]}
                >
                  {idx}
                </Text>
                {hasNote && <View style={[styles.noteDot, done && styles.noteDotDone]} />}
              </Pressable>
            );
          })}
          {/* Filler to keep last row cells the same width as full rows. */}
          {row.length < perRow &&
            Array.from({ length: perRow - row.length }).map((_, i) => (
              <View key={`filler-${i}`} style={styles.filler} />
            ))}
        </View>
      ))}
    </View>
  );
};

const DONE_BG_LIGHT = 'rgba(63, 179, 111, 0.18)';
const DONE_BG_DARK = 'rgba(63, 179, 111, 0.28)';
const DONE_BG_PRESSED_LIGHT = 'rgba(63, 179, 111, 0.30)';
const DONE_BG_PRESSED_DARK = 'rgba(63, 179, 111, 0.40)';
const DONE_TEXT_LIGHT = '#1F7A45';
const DONE_TEXT_DARK = '#7FD79E';

const makeStyles = (Palette: PaletteType, isDark: boolean) =>
  StyleSheet.create({
    wrap: {
      gap: GAP,
    },
    row: {
      flexDirection: 'row',
      gap: GAP,
    },
    cell: {
      flex: 1,
      height: CELL_HEIGHT,
      borderRadius: Radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filler: {
      flex: 1,
      height: CELL_HEIGHT,
    },
    cellIdle: {
      backgroundColor: Palette.background,
    },
    cellPressed: {
      backgroundColor: Palette.cardPressed,
    },
    cellDone: {
      backgroundColor: isDark ? DONE_BG_DARK : DONE_BG_LIGHT,
    },
    cellDonePressed: {
      backgroundColor: isDark ? DONE_BG_PRESSED_DARK : DONE_BG_PRESSED_LIGHT,
    },
    cellText: {
      fontSize: 13,
      fontWeight: '600',
      color: Palette.textPrimary,
    },
    cellTextDone: {
      color: isDark ? DONE_TEXT_DARK : DONE_TEXT_LIGHT,
    },
    noteDot: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: Palette.accent,
    },
    noteDotDone: {
      backgroundColor: isDark ? DONE_TEXT_DARK : DONE_TEXT_LIGHT,
    },
  });
