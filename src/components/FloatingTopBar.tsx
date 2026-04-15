import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassButton } from '@components/GlassButton';
import { SubgroupPicker } from '@components/SubgroupPicker';
import type { SubgroupChoice } from '@stores/preferences.store';
import { Palette, Spacing } from '@theme';
import { formatDayShort } from '@utils/date';

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
}: Props) => {
  const showSubgroupPicker = subgroup !== undefined && onSubgroupChange !== undefined;
  const dayLabel = currentDate ? formatDayShort(currentDate, new Date()) : null;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { paddingTop: insets.top + Spacing.sm }]}
    >
      <View style={styles.left}>
        <GlassButton
          onPress={() => router.back()}
          size={38}
          accessibilityLabel="Назад"
        >
          <Text style={styles.back}>‹</Text>
        </GlassButton>

        {dayLabel && (
          <GlassButton
            height={38}
            shape="pill"
            active={isCurrentDateToday}
            style={styles.dayLabelChip}
            accessibilityLabel={dayLabel}
          >
            <Text
              style={[styles.dayLabel, isCurrentDateToday && styles.dayLabelToday]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {dayLabel}
            </Text>
          </GlassButton>
        )}
      </View>

      <View style={styles.right}>
        <GlassButton
          onPress={onTogglePin}
          size={38}
          active={pinned}
          accessibilityLabel={pinned ? 'Открепить расписание' : 'Закрепить расписание'}
        >
          <Text style={[styles.pin, pinned && styles.pinActive]}>{pinned ? '★' : '☆'}</Text>
        </GlassButton>

        {showSubgroupPicker && (
          <SubgroupPicker value={subgroup} onChange={onSubgroupChange} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  pin: {
    fontSize: 18,
    color: Palette.textSecondary,
  },
  pinActive: {
    color: Palette.accent,
  },
});
