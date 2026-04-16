import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassButton } from '@components/GlassButton';
import { SubgroupPicker } from '@components/SubgroupPicker';
import { usePalette } from '@hooks/usePalette';
import type { SubgroupChoice } from '@stores/preferences.store';
import { Spacing } from '@theme';
import { formatDayShortCompact } from '@utils/date';

type PaletteType = ReturnType<typeof usePalette>;

interface Props {
  pinned: boolean;
  onTogglePin(): void;
  /**
   * Когда `subgroup` / `onSubgroupChange` не переданы, селектор подгруппы
   * не показывается. Используется на расписании преподавателя — там фильтр
   * по подгруппе не имеет смысла.
   */
  subgroup?: SubgroupChoice;
  onSubgroupChange?(next: SubgroupChoice): void;
  /**
   * Дата самой верхней видимой секции. Если задана, отображается лейблом
   * справа от кнопки «назад» — заменяет sticky-заголовок дня в списке.
   */
  currentDate?: Date;
  /** Подсветить лейбл акцентом, если это «сегодня». */
  isCurrentDateToday?: boolean;
  /** Подсветить лейбл красным, если это «завтра». */
  isCurrentDateTomorrow?: boolean;
  /** Show an exams shortcut button (hidden when already viewing exams). */
  showExamsButton?: boolean;
  onScrollToExams?(): void;
  /** When true, replaces back button with group title and pin with change button. */
  isDefaultSchedule?: boolean;
  /** Group name shown in the top bar (only when `isDefaultSchedule`). */
  defaultGroupName?: string;
  /** Callback to change the default group. */
  onChangeDefaultGroup?(): void;
}

/**
 * Floating top bar shown over the schedule. Holds:
 * - back button + опциональный лейбл текущего дня (left)
 * - pin toggle + (опционально) subgroup picker (right)
 * Each control uses Liquid-Glass `GlassButton` and floats over scrollable
 * content (`position: absolute`).
 */
export const FloatingTopBar = ({
  pinned,
  onTogglePin,
  subgroup,
  onSubgroupChange,
  currentDate,
  isCurrentDateToday = false,
  isCurrentDateTomorrow = false,
  showExamsButton = false,
  onScrollToExams,
  isDefaultSchedule = false,
  defaultGroupName,
  onChangeDefaultGroup,
}: Props) => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  const showSubgroupPicker = subgroup !== undefined && onSubgroupChange !== undefined;
  const dayLabel = currentDate ? formatDayShortCompact(currentDate, new Date()) : null;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { paddingTop: insets.top + Spacing.sm }]}
    >
      <View style={styles.left}>
        {isDefaultSchedule ? (
          defaultGroupName ? (
            <GlassButton
              onPress={onChangeDefaultGroup}
              height={38}
              shape="pill"
              style={styles.dayLabelChip}
              accessibilityLabel={t('schedule.changeGroup')}
            >
              <Text style={styles.dayLabel} numberOfLines={1} ellipsizeMode="tail">
                {defaultGroupName}
              </Text>
            </GlassButton>
          ) : null
        ) : (
          <GlassButton
            onPress={() => router.back()}
            size={38}
            accessibilityLabel={t('common.back')}
          >
            <Text style={styles.back}>&#8249;</Text>
          </GlassButton>
        )}

        {dayLabel && (
          <GlassButton
            height={38}
            shape="pill"
            active={isCurrentDateToday || isCurrentDateTomorrow}
            activeColor={isCurrentDateTomorrow ? Palette.destructive : undefined}
            style={styles.dayLabelChip}
            accessibilityLabel={dayLabel}
          >
            <Text
              style={[
                styles.dayLabel,
                isCurrentDateToday && styles.dayLabelToday,
                isCurrentDateTomorrow && styles.dayLabelTomorrow,
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {dayLabel}
            </Text>
          </GlassButton>
        )}
      </View>

      <View style={styles.right}>
        {showExamsButton && onScrollToExams && (
          <GlassButton
            onPress={onScrollToExams}
            size={38}
            accessibilityLabel={t('schedule.goToExams')}
          >
            <Ionicons name="school-outline" size={18} color={Palette.textPrimary} />
          </GlassButton>
        )}
        {!isDefaultSchedule && (
          <GlassButton
            onPress={onTogglePin}
            size={38}
            active={pinned}
            accessibilityLabel={pinned ? t('schedule.unpin') : t('schedule.pin')}
          >
            <Text style={[styles.pin, pinned && styles.pinActive]}>{pinned ? '\u2605' : '\u2606'}</Text>
          </GlassButton>
        )}

        {showSubgroupPicker && (
          <SubgroupPicker value={subgroup} onChange={onSubgroupChange} />
        )}
      </View>
    </View>
  );
};

const makeStyles = (Palette: PaletteType) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    zIndex: 10,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    // Чтобы дата при ellipsis не вылазила за иконки справа.
    minWidth: 0,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingLeft: Spacing.sm,
  },
  back: {
    fontSize: 28,
    lineHeight: 28,
    fontWeight: '500',
    color: Palette.textPrimary,
    marginTop: -3,
  },
  // Stretch-friendly Liquid-Glass обёртка лейбла даты: позволяет ужиматься
  // под доступную ширину, чтобы при длинном «Понедельник, 14 апреля» текст
  // подрезался многоточием, а не толкал правые контролы.
  dayLabelChip: {
    flexShrink: 1,
    minWidth: 0,
  },
  dayLabel: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Palette.textPrimary,
    letterSpacing: 0.1,
  },
  dayLabelToday: {
    color: Palette.accent,
  },
  dayLabelTomorrow: {
    color: Palette.destructive,
  },
  pin: {
    fontSize: 18,
    color: Palette.textSecondary,
  },
  pinActive: {
    color: Palette.accent,
  },
});
