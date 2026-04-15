import { StyleSheet, Text, View } from 'react-native';

import type { WeekNumber } from '@models/dto';
import { Palette, Spacing } from '@theme';
import { formatDayHeader } from '@utils/date';

interface Props {
  date: Date;
  week: WeekNumber;
  /** True for the section that contains the current real day. */
  isToday?: boolean;
}

/**
 * Sticky section header for the schedule view. Renders as plain text on the
 * screen background; opaque `backgroundColor` ensures it cleanly hides cards
 * scrolling behind it when the section list pins it to the top.
 */
export const DayHeader = ({ date, week, isToday = false }: Props) => (
  <View style={styles.wrap}>
    <Text style={[styles.text, isToday && styles.today]} numberOfLines={1}>
      {formatDayHeader(date, week)}
    </Text>
  </View>
);

const styles = StyleSheet.create({
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
});
