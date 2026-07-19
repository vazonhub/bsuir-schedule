import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { usePalette } from '@hooks/usePalette';
import { Radius, Spacing } from '@theme';
import { FIRE_COLORS } from '@theme/colors';
import { textProps } from '@theme/typography';
import { addDays } from '@utils/date';
import type { FireDayStatus } from '@utils/fire';
import { mondayOfISO, parseLocalISO, toLocalISO } from '@utils/fire';

type PaletteType = ReturnType<typeof usePalette>;

/** How many weeks to show. */
const WEEKS = 6;
/** Mon-first day-of-week order → index in `Date.getDay()` (Sun=0..Sat=6). */
const MON_FIRST_DOW: readonly number[] = [1, 2, 3, 4, 5, 6, 0];

interface Props {
  /** Status history keyed by ISO day. */
  history: Record<string, FireDayStatus>;
  /** Color for "burning" days — tier of the current streak. */
  accentColor: string;
  now?: Date;
}

/**
 * Activity calendar: a grid of recent weeks. Each cell is a school day with a
 * status (burning / freeze / missed) or empty (no data / not a school day).
 * Data comes from `FireCore.history`.
 */
export const ActivityCalendar = ({ history, accentColor, now = new Date() }: Props) => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);

  const dayLabels = t('date.daysShort', { returnObjects: true }) as string[];
  const todayISO = toLocalISO(now);

  const weeks = useMemo(() => {
    const currentMonday = mondayOfISO(todayISO);
    const oldest = toLocalISO(addDays(parseLocalISO(currentMonday), -(WEEKS - 1) * 7));
    const rows: string[][] = [];
    for (let w = 0; w < WEEKS; w++) {
      const monday = parseLocalISO(toLocalISO(addDays(parseLocalISO(oldest), w * 7)));
      const row: string[] = [];
      for (let i = 0; i < 7; i++) {
        row.push(toLocalISO(addDays(monday, i)));
      }
      rows.push(row);
    }
    return rows;
  }, [todayISO]);

  const cellColor = (status: FireDayStatus | undefined): string => {
    switch (status) {
      case 'active':
        return accentColor;
      case 'frozen':
        return FIRE_COLORS.frozen;
      case 'missed':
        return FIRE_COLORS.missed;
      default:
        return Palette.background;
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        {MON_FIRST_DOW.map((dow) => (
          <View key={dow} style={styles.headerCell}>
            <Text {...textProps('caption')} style={styles.headerLabel}>
              {dayLabels[dow]}
            </Text>
          </View>
        ))}
      </View>
      {weeks.map((row, wi) => (
        <View key={wi} style={styles.weekRow}>
          {row.map((iso) => {
            const isToday = iso === todayISO;
            const isFuture = iso > todayISO;
            return (
              <View key={iso} style={styles.cellSlot}>
                <View
                  style={[
                    styles.cell,
                    { backgroundColor: isFuture ? Palette.background : cellColor(history[iso]) },
                    isToday && styles.cellToday,
                    isToday && { borderColor: Palette.accent },
                  ]}
                />
              </View>
            );
          })}
        </View>
      ))}

      <View style={styles.legend}>
        <LegendDot color={accentColor} label={t('fire.legendActive')} styles={styles} />
        <LegendDot color={FIRE_COLORS.frozen} label={t('fire.legendFrozen')} styles={styles} />
        <LegendDot color={FIRE_COLORS.missed} label={t('fire.legendMissed')} styles={styles} />
      </View>
    </View>
  );
};

const LegendDot = ({
  color,
  label,
  styles,
}: {
  color: string;
  label: string;
  styles: ReturnType<typeof makeStyles>;
}) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, { backgroundColor: color }]} />
    <Text {...textProps('caption')} style={styles.legendLabel}>
      {label}
    </Text>
  </View>
);

const makeStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    wrap: {
      gap: Spacing.xs,
    },
    headerRow: {
      flexDirection: 'row',
    },
    headerCell: {
      flex: 1,
      alignItems: 'center',
    },
    headerLabel: {
      color: Palette.textTertiary,
    },
    weekRow: {
      flexDirection: 'row',
    },
    cellSlot: {
      flex: 1,
      padding: 2,
    },
    cell: {
      aspectRatio: 1,
      borderRadius: Radius.sm,
    },
    cellToday: {
      borderWidth: 1.5,
    },
    legend: {
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: Spacing.md,
      marginTop: Spacing.sm,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 3,
    },
    legendLabel: {
      color: Palette.textSecondary,
    },
  });
