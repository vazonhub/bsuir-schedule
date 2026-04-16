import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { usePalette } from '@hooks/usePalette';
import type { WeekNumber } from '@models/dto';
import { Spacing } from '@theme';
import { formatDayHeader, formatExamDayHeader } from '@utils/date';

type PaletteType = ReturnType<typeof usePalette>;

interface Props {
  date: Date;
  week: WeekNumber;
  /** True for the section that contains the current real day. */
  isToday?: boolean;
  /** True for the section that contains tomorrow. */
  isTomorrow?: boolean;
  /** True for exam session sections — hides week number. */
  isExam?: boolean;
}

/**
 * Sticky section header for the schedule view. Renders as plain text on the
 * screen background; opaque `backgroundColor` ensures it cleanly hides cards
 * scrolling behind it when the section list pins it to the top.
 */
export const DayHeader = ({ date, week, isToday = false, isTomorrow = false, isExam = false }: Props) => {
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);

  return (
    <View style={styles.wrap}>
      <Text
        style={[styles.text, isToday && styles.today, isTomorrow && styles.tomorrow]}
        numberOfLines={1}
      >
        {isExam ? formatExamDayHeader(date) : formatDayHeader(date, week)}
      </Text>
    </View>
  );
};

const makeStyles = (Palette: PaletteType) => StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.cardPaddingX + Spacing.screenPadding - 8,
    paddingTop: Spacing.sectionTop,
    paddingBottom: Spacing.sectionBottom,
    backgroundColor: Palette.background,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  today: {
    color: Palette.accent,
  },
  tomorrow: {
    color: Palette.destructive,
  },
});
