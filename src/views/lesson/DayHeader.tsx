import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { usePalette } from '@hooks/usePalette';
import type { WeekNumber } from '@models/dto';
import { Radius, Spacing } from '@theme';
import { formatDayDate, formatDayName } from '@utils/date';
import { buildLabel } from '@utils/a11y';

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
 * Двухстрочный заголовок дня: крупное название дня недели сверху, дата и
 * статус («Сегодня» / «Завтра») — снизу, номер недели цикла — чипом справа.
 * Рендерится на фоне экрана (`Palette.background`), sticky отключён —
 * «текущий день» показывает `FloatingTopBar`.
 */
export const DayHeader = React.memo(
  ({
    date,
    week,
    isToday = false,
    isTomorrow = false,
    isExam = false,
    isPast = false,
    holidayName,
  }: Props) => {
    const { t } = useTranslation();
    const Palette = usePalette();
    const styles = useMemo(() => makeStyles(Palette), [Palette]);

    const dayName = formatDayName(date);
    const dateText = formatDayDate(date);
    const weekLabel = t('schedule.week', { n: week });
    const statusLabel = isToday ? t('date.today') : isTomorrow ? t('date.tomorrow') : null;

    const a11yLabel = buildLabel(
      `${dayName}, ${dateText}`,
      !isExam && weekLabel,
      statusLabel,
      holidayName,
    );

    return (
      <View style={styles.wrap} accessibilityRole="header" accessibilityLabel={a11yLabel}>
        <View style={styles.textCol}>
          <Text
            maxFontSizeMultiplier={1.4}
            style={[styles.dayName, isToday && styles.accentText, isPast && styles.pastText]}
            numberOfLines={1}
          >
            {dayName}
          </Text>
          <View style={styles.subRow}>
            <Text
              maxFontSizeMultiplier={1.3}
              style={[styles.dateText, isPast && styles.pastText]}
              numberOfLines={1}
            >
              {dateText}
              {statusLabel != null && (
                <Text style={isTomorrow ? styles.statusTomorrow : styles.statusToday}>
                  {'  ·  '}
                  {statusLabel}
                </Text>
              )}
            </Text>
            {holidayName != null && (
              <View style={styles.holidayBadge}>
                <Text maxFontSizeMultiplier={1} style={styles.holidayText} numberOfLines={1}>
                  {holidayName}
                </Text>
              </View>
            )}
          </View>
        </View>
        {!isExam && (
          <View style={[styles.weekChip, isPast && styles.weekChipPast]}>
            <Text
              maxFontSizeMultiplier={1.2}
              style={[styles.weekChipText, isPast && styles.weekChipTextPast]}
              numberOfLines={1}
            >
              {weekLabel}
            </Text>
          </View>
        )}
      </View>
    );
  },
);

DayHeader.displayName = 'DayHeader';
const makeStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.md,
      paddingHorizontal: Spacing.cardPaddingX + Spacing.screenPadding - 8,
      paddingTop: Spacing.sectionTop,
      paddingBottom: Spacing.sectionBottom,
      backgroundColor: Palette.background,
    },
    textCol: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    dayName: {
      fontSize: 20,
      fontWeight: '700',
      letterSpacing: 0.2,
      color: Palette.textPrimary,
    },
    subRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dateText: {
      flexShrink: 1,
      fontSize: 13,
      fontWeight: '500',
      color: Palette.textSecondary,
    },
    statusToday: {
      fontWeight: '700',
      color: Palette.accent,
    },
    statusTomorrow: {
      fontWeight: '700',
      color: Palette.destructive,
    },
    accentText: {
      color: Palette.accent,
    },
    pastText: {
      color: Palette.textTertiary,
    },
    weekChip: {
      alignSelf: 'flex-start',
      marginTop: 2,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: Radius.sm,
      backgroundColor: Palette.accent + '1A', // 10% accent tint
    },
    weekChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: Palette.accent,
    },
    weekChipPast: {
      backgroundColor: Palette.separator,
    },
    weekChipTextPast: {
      color: Palette.textTertiary,
    },
    holidayBadge: {
      backgroundColor: Palette.accent + '26', // 15% opacity
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
