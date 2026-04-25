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
  /** True when the day is strictly before today. */
  isPast?: boolean;
  /** State holiday name to display as a badge. */
  holidayName?: string;
}

/**
 * Sticky section header for the schedule view. Renders as plain text on the
 * screen background; opaque `backgroundColor` ensures it cleanly hides cards
 * scrolling behind it when the section list pins it to the top.
 */
export const DayHeader = ({ date, week, isToday = false, isTomorrow = false, isExam = false, isPast = false, holidayName }: Props) => {
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text
          style={[styles.text, isToday && styles.today, isTomorrow && styles.tomorrow, isPast && styles.past]}
          numberOfLines={1}
        >
          {isExam ? formatExamDayHeader(date) : formatDayHeader(date, week)}
        </Text>
        {holidayName != null && (
          <View style={styles.holidayBadge}>
            <Text style={styles.holidayText} numberOfLines={1}>
              {holidayName}
            </Text>
          </View>
        )}
      </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  past: {
    opacity: 0.4,
  },
  holidayBadge: {
    backgroundColor: Palette.accent + '1A', // 10% opacity
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    flexShrink: 1,
  },
  holidayText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.accent,
  },
});
