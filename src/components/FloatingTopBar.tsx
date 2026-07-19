import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@components/Avatar';
import { GlassButton } from '@components/GlassButton';
import { SubgroupPicker } from '@components/SubgroupPicker';
import { useIconColor, useIconName } from '@hooks/useAppearance';
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
  /** Called when user taps the date label to open date picker. */
  onDatePress?(): void;
  /** Show a "back to today" button when viewing past dates. */
  showTodayButton?: boolean;
  onScrollToToday?(): void;
  /** Show an exams shortcut button (hidden when already viewing exams). */
  showExamsButton?: boolean;
  onScrollToExams?(): void;
  /** Show a "back to schedule" button when viewing exams. */
  showScheduleButton?: boolean;
  onScrollToSchedule?(): void;
  /** Static title shown instead of the date label (e.g. group number or employee FIO). */
  title?: string;
  /** Avatar URL shown next to the title (employee photo). */
  avatarUri?: string | null;
  /** Called when user taps the avatar. */
  onAvatarPress?(): void;
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
export const FloatingTopBar = React.memo(
  ({
    pinned,
    onTogglePin,
    subgroup,
    onSubgroupChange,
    currentDate,
    isCurrentDateToday = false,
    isCurrentDateTomorrow = false,
    showTodayButton = false,
    onScrollToToday,
    showExamsButton = false,
    onScrollToExams,
    showScheduleButton = false,
    onScrollToSchedule,
    title,
    avatarUri,
    onAvatarPress,
    isDefaultSchedule = false,
    defaultGroupName,
    onChangeDefaultGroup,
    onDatePress,
  }: Props) => {
    const { t } = useTranslation();
    const Palette = usePalette();
    const styles = useMemo(() => makeStyles(Palette), [Palette]);
    const examIcon = useIconName('exam');
    const todayIcon = useIconName('today');
    const examColor = useIconColor('exam');
    const todayColor = useIconColor('today');
    const showSubgroupPicker = subgroup !== undefined && onSubgroupChange !== undefined;
    const dayLabel = currentDate ? formatDayShortCompact(currentDate, new Date()) : null;
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const gradientColors = [
      Palette.background,
      Palette.background,
      Palette.background + '00',
    ] as const;

    return (
      <View
        pointerEvents="box-none"
        style={[styles.container, { paddingTop: insets.top + Spacing.sm }]}
      >
        <LinearGradient
          colors={gradientColors}
          locations={[0.1, 0.1, 1]}
          style={styles.gradient}
          pointerEvents="none"
        />
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
                <Text
                  maxFontSizeMultiplier={1}
                  style={styles.dayLabel}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
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
              <Ionicons
                name="chevron-back"
                size={22}
                color={Palette.textPrimary}
                style={{ marginLeft: -1 }}
              />
            </GlassButton>
          )}

          {!isDefaultSchedule && avatarUri ? (
            <Pressable onPress={onAvatarPress} hitSlop={4}>
              <Avatar uri={avatarUri} size={32} />
            </Pressable>
          ) : null}

          {!isDefaultSchedule && title ? (
            <GlassButton
              height={38}
              shape="pill"
              style={styles.dayLabelChip}
              accessibilityLabel={title}
            >
              <Text
                maxFontSizeMultiplier={1}
                style={styles.dayLabel}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {title}
              </Text>
            </GlassButton>
          ) : dayLabel ? (
            <GlassButton
              onPress={onDatePress}
              height={38}
              shape="pill"
              active={isCurrentDateToday || isCurrentDateTomorrow}
              activeColor={isCurrentDateTomorrow ? Palette.destructive : undefined}
              style={styles.dayLabelChip}
              accessibilityLabel={dayLabel}
              accessibilityHint={t('a11y.openDatePicker')}
            >
              <Text
                maxFontSizeMultiplier={1}
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
          ) : null}
        </View>

        <View style={styles.right}>
          {showTodayButton && onScrollToToday ? (
            <GlassButton
              onPress={onScrollToToday}
              size={38}
              accessibilityLabel={t('schedule.goToToday')}
            >
              <Ionicons name={todayIcon as never} size={18} color={todayColor} />
            </GlassButton>
          ) : showExamsButton && onScrollToExams ? (
            <GlassButton
              onPress={onScrollToExams}
              size={38}
              accessibilityLabel={t('schedule.goToExams')}
            >
              <Ionicons name={examIcon as never} size={18} color={examColor} />
            </GlassButton>
          ) : showScheduleButton && onScrollToSchedule ? (
            <GlassButton
              onPress={onScrollToSchedule}
              size={38}
              accessibilityLabel={t('schedule.goToSchedule')}
            >
              <Ionicons name={todayIcon as never} size={18} color={todayColor} />
            </GlassButton>
          ) : null}
          <GlassButton
            onPress={onTogglePin}
            size={38}
            active={pinned}
            accessibilityLabel={pinned ? t('schedule.unpin') : t('schedule.pin')}
            accessibilityHint={t('a11y.togglePin')}
            accessibilityState={{ selected: pinned }}
          >
            <Ionicons
              name={pinned ? 'star' : 'star-outline'}
              size={15}
              color={pinned ? Palette.accent : Palette.textSecondary}
            />
          </GlassButton>

          {showSubgroupPicker && <SubgroupPicker value={subgroup} onChange={onSubgroupChange} />}
        </View>
      </View>
    );
  },
);

FloatingTopBar.displayName = 'FloatingTopBar';
const makeStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.screenPadding,
      paddingBottom: Spacing.md,
      zIndex: 10,
    },
    gradient: {
      ...StyleSheet.absoluteFillObject,
      bottom: -Spacing.xl,
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
  });
