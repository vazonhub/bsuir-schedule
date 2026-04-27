import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@components/Avatar';
import { useAccessibility } from '@hooks/useAccessibility';
import { useGetLessonAccentColor, useIconName } from '@hooks/useAppearance';
import { useIsDark, usePalette } from '@hooks/usePalette';
import type { NormalizedLesson } from '@utils/scheduleNormalization';
import { Radius, Spacing } from '@theme';
import { textProps } from '@theme/typography';
import { getLessonBreakRange, getLessonTypeFullName } from '@utils/lesson';
import type { LessonTimeStatus } from '@utils/lesson';
import { buildLabel } from '@utils/a11y';

type PaletteType = ReturnType<typeof usePalette>;

interface Props {
  lesson: NormalizedLesson;
  onPress?(): void;
  /**
   * Compact-mode для пар не своей подгруппы — одна строка с названием
   * предмета, пунктирная рамка цвета типа занятия, прозрачный фон.
   */
  compact?: boolean;
  /** Заблокированная (замьюченная) пара — красная окантовка, compact-вид. */
  blocked?: boolean;
  /**
   * Состояние пары относительно «сейчас» — `null` если пара не сегодня
   * (тогда никакой подсветки не накладываем).
   */
  timeStatus?: LessonTimeStatus | null;
}

// Полупрозрачная серая «вуаль» для прошедших / уже прошедшей части идущей пары.
const PAST_OVERLAY_LIGHT = 'rgba(60, 60, 67, 0.10)';
const PAST_OVERLAY_DARK = 'rgba(0, 0, 0, 0.40)';
// Тонкий синий «маркер» 5-минутного перерыва в середине пары — рисуется
// поверх серой вуали, пока пара не закончилась.
const BREAK_OVERLAY_LIGHT = 'rgba(10, 132, 255, 0.18)';
const BREAK_OVERLAY_DARK = 'rgba(10, 132, 255, 0.35)';

const buildAvatarInitials = (lesson: NormalizedLesson): string => {
  const first = (lesson.raw.employees ?? [])[0];
  if (!first) return '?';
  return `${first.lastName?.[0] ?? ''}${first.firstName?.[0] ?? ''}`;
};

const BLOCKED_BG_LIGHT = 'rgba(255, 59, 48, 0.06)';
const BLOCKED_BG_DARK = 'rgba(255, 59, 48, 0.12)';

export const LessonCard = ({ lesson, onPress, compact = false, blocked = false, timeStatus }: Props) => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const isDark = useIsDark();
  const pastOverlayColor = isDark ? PAST_OVERLAY_DARK : PAST_OVERLAY_LIGHT;
  const breakOverlayColor = isDark ? BREAK_OVERLAY_DARK : BREAK_OVERLAY_LIGHT;
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  const { isDifferentiateWithoutColorEnabled } = useAccessibility();
  const getLessonColor = useGetLessonAccentColor();
  const subgroupIcon = useIconName('subgroup');
  const blockIcon = useIconName('block');
  const accent = getLessonColor(lesson.raw.lessonTypeAbbrev);
  const typeAbbrev = lesson.raw.lessonTypeAbbrev;

  // Ширина «прошедшей» серой заливки. 0 = ничего не закрашено,
  // 1 = карточка полностью закрашена (пара уже прошла).
  const pastFraction =
    timeStatus?.kind === 'past'
      ? 1
      : timeStatus?.kind === 'ongoing'
        ? timeStatus.progress
        : 0;

  // Синий маркер 5-минутного перерыва — только пока пара ещё не закончилась
  // (показываем как для идущей, так и для запланированной на сегодня).
  const breakRange =
    timeStatus?.kind === 'ongoing' || timeStatus?.kind === 'future'
      ? getLessonBreakRange(lesson)
      : null;

  // Подпись с временем начала перерыва (вертикально внутри синего блока).
  // Показываем только для уже идущей пары, у которой перерыв ещё не наступил.
  const showBreakLabel =
    !!breakRange &&
    timeStatus?.kind === 'ongoing' &&
    timeStatus.progress < breakRange.startFraction;

  if (blocked) {
    const blockedBg = isDark ? BLOCKED_BG_DARK : BLOCKED_BG_LIGHT;
    return (
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [
          styles.compact,
          { borderColor: Palette.destructive, backgroundColor: blockedBg },
          pressed && onPress && styles.compactPressed,
        ]}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={`${lesson.raw.subject}, ${lesson.startTime}–${lesson.endTime}, ${t('lesson.blocked')}`}
      >
        <Text {...textProps('footnote')} style={styles.compactText} numberOfLines={1}>
          {isDifferentiateWithoutColorEnabled && typeAbbrev ? `${typeAbbrev} · ` : ''}{lesson.raw.subject} · {lesson.startTime} — {lesson.endTime}
        </Text>
        {(lesson.raw.numSubgroup === 1 || lesson.raw.numSubgroup === 2) && (
          <View style={styles.subgroupChip}>
            <Ionicons name={subgroupIcon as never} size={12} color={Palette.textSecondary} />
            <Text maxFontSizeMultiplier={1}style={styles.subgroupNumber}>{lesson.raw.numSubgroup}</Text>
          </View>
        )}
        <View style={styles.blockedIcon}>
          <Ionicons name={blockIcon as never} size={14} color={Palette.destructive} />
        </View>
      </Pressable>
    );
  }

  if (compact) {
    const compactNumSubgroup = lesson.raw.numSubgroup;
    const showCompactSubgroup = compactNumSubgroup === 1 || compactNumSubgroup === 2;
    return (
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [
          styles.compact,
          { borderColor: accent },
          pressed && onPress && styles.compactPressed,
        ]}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={
          showCompactSubgroup
            ? `${lesson.raw.subject}, ${lesson.startTime}–${lesson.endTime}, ${t('lesson.subgroup', { n: compactNumSubgroup })}`
            : `${lesson.raw.subject}, ${lesson.startTime}–${lesson.endTime}, ${t('lesson.notMySubgroup')}`
        }
      >
        <Text {...textProps('footnote')} style={styles.compactText} numberOfLines={1}>
          {isDifferentiateWithoutColorEnabled && typeAbbrev ? `${typeAbbrev} · ` : ''}{lesson.raw.subject} · {lesson.startTime} — {lesson.endTime}
        </Text>
        {showCompactSubgroup && (
          <View style={styles.subgroupChip}>
            <Ionicons name={subgroupIcon as never} size={12} color={Palette.textSecondary} />
            <Text maxFontSizeMultiplier={1}style={styles.subgroupNumber}>{compactNumSubgroup}</Text>
          </View>
        )}
      </Pressable>
    );
  }

  const auditories = (lesson.raw.auditories ?? []).join(', ');
  const teacherEmployee = (lesson.raw.employees ?? [])[0];
  const hasAvatar = Boolean(teacherEmployee);
  const numSubgroup = lesson.raw.numSubgroup;
  const showSubgroup = numSubgroup === 1 || numSubgroup === 2;
  const hasRightArea = hasAvatar || showSubgroup;

  const statusLabel =
    timeStatus?.kind === 'ongoing' ? t('a11y.lessonOngoing') :
    timeStatus?.kind === 'past' ? t('a11y.lessonPast') :
    timeStatus?.kind === 'future' ? t('a11y.lessonUpcoming') :
    null;

  const teacherName = teacherEmployee
    ? [teacherEmployee.lastName, teacherEmployee.firstName].filter(Boolean).join(' ')
    : null;

  const fullLabel = buildLabel(
    getLessonTypeFullName(lesson.raw.lessonTypeAbbrev),
    lesson.raw.subject,
    `${lesson.startTime}–${lesson.endTime}`,
    auditories || null,
    teacherName,
    showSubgroup && t('lesson.subgroup', { n: numSubgroup }),
    statusLabel,
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.card, pressed && onPress && styles.cardPressed]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={fullLabel}
      accessibilityHint={onPress ? t('a11y.openLessonDetails') : undefined}
    >
      <View style={[styles.stripe, { backgroundColor: accent }]} importantForAccessibility="no" />

      <View style={styles.content}>
        {pastFraction > 0 && (
          <View
            pointerEvents="none"
            importantForAccessibility="no"
            style={[styles.pastOverlay, { width: `${pastFraction * 100}%`, backgroundColor: pastOverlayColor }]}
          />
        )}
        {breakRange && (
          <View
            pointerEvents="none"
            importantForAccessibility="no"
            style={[
              styles.breakOverlay,
              {
                left: `${breakRange.startFraction * 100}%`,
                width: `${breakRange.widthFraction * 100}%`,
                backgroundColor: breakOverlayColor,
              },
            ]}
          >
            <View style={styles.breakLabelRotator} pointerEvents="none">
              <Text style={styles.breakLabel} numberOfLines={1}>
                {breakRange.startsAt}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.body}>
          <View style={styles.timeRow}>
            <Text {...textProps('footnote')} style={styles.time}>
              {lesson.startTime}–{lesson.endTime}
            </Text>
            {isDifferentiateWithoutColorEnabled && typeAbbrev && (
              <View style={[styles.typeBadge, { backgroundColor: accent + '1A' }]}>
                <Text {...textProps('tiny')} style={[styles.typeBadgeText, { color: accent }]}>{typeAbbrev}</Text>
              </View>
            )}
            {timeStatus?.kind === 'ongoing' && (
              <Text maxFontSizeMultiplier={1}style={[styles.nowBadge, { color: Palette.accent }]}>{t('a11y.now')}</Text>
            )}
          </View>
          <Text {...textProps('headline')} style={styles.subject} numberOfLines={2}>
            {lesson.raw.subject}
          </Text>
          {auditories.length > 0 && (
            <Text {...textProps('footnote')} style={styles.meta} numberOfLines={1}>
              {auditories}
            </Text>
          )}
          {lesson.raw.note && (
            <Text {...textProps('caption')} style={styles.note} numberOfLines={1}>
              {lesson.raw.note}
            </Text>
          )}
        </View>

        {hasRightArea && (
          <View style={styles.right}>
            {showSubgroup && (
              <View style={styles.subgroupChip}>
                <Ionicons name={subgroupIcon as never} size={16} color={Palette.textSecondary} />
                <Text maxFontSizeMultiplier={1}style={styles.subgroupNumber}>{numSubgroup}</Text>
              </View>
            )}
            {hasAvatar && teacherEmployee && (
              <Avatar
                uri={teacherEmployee.photoLink}
                initials={buildAvatarInitials(lesson)}
                size={48}
              />
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
};

const STRIPE_WIDTH = 5;

const makeStyles = (Palette: PaletteType) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.cardGap,
    overflow: 'hidden',
  },
  cardPressed: { backgroundColor: Palette.cardPressed },
  stripe: {
    width: STRIPE_WIDTH,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
  },
  pastOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  breakOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    alignItems: 'center',
    overflow: 'visible',
  },
  // Чтобы повёрнутый текст не переносился на 2 строки, обёртке нужны
  // явные размеры в её «исходных» (горизонтальных) координатах: ширина =
  // достаточно для строки "HH:MM", высота = высота строки.
  // Поворот делаем на View, а не на Text — на Text transform в RN иногда
  // не применяется в узком контейнере (наш блок перерыва ~20pt).
  // alignItems: 'flex-end' внутри обёртки ставит Text у правого края
  // горизонтального бокса; после поворота на -90° (против часовой стрелки)
  // правый край становится верхом → надпись прижата к верху полоски.
  // marginTop компенсирует сдвиг центра при rotate: visualTop = marginTop +
  // (height - width)/2; для 50×14 и желаемого visualTop ≈ 4 → marginTop ≈ 22.
  breakLabelRotator: {
    width: 50,
    height: 14,
    marginTop: 22,
    alignItems: 'flex-end',
    justifyContent: 'center',
    transform: [{ rotate: '-90deg' }],
  },
  breakLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: Palette.accent,
    includeFontPadding: false,
  },
  body: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingRight: Spacing.lg,
  },
  subgroupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 20,
    gap: 3,
  },
  subgroupNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Palette.textSecondary,
  },

  typeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nowBadge: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  time: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textPrimary,
    letterSpacing: 0.2,
  },
  subject: {
    fontSize: 17,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  meta: {
    fontSize: 13,
    color: Palette.textSecondary,
  },
  note: {
    fontSize: 12,
    color: Palette.textTertiary,
    fontStyle: 'italic',
  },

  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.cardGap,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  blockedIcon: {
    minHeight: 20,
    justifyContent: 'center',
  },
  compactPressed: { opacity: 0.5 },
  compactText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: Palette.textSecondary,
  },
});
