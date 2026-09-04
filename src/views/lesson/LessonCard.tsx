import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AvatarGroup } from '@components/AvatarGroup';
import { useAccessibility } from '@hooks/useAccessibility';
import { useGetLessonAccentColor, useIconName } from '@hooks/useAppearance';
import { useIsDark, usePalette } from '@hooks/usePalette';
import type { NormalizedLesson } from '@utils/scheduleNormalization';
import { Radius, Spacing } from '@theme';
import { ANNOUNCEMENT_COLOR } from '@theme/colors';
import { textProps } from '@theme/typography';
import { getLessonBreakRange, getLessonTypeFullName } from '@utils/lesson';
import type { LessonTimeStatus } from '@utils/lesson';
import { buildLabel } from '@utils/a11y';

type PaletteType = ReturnType<typeof usePalette>;

interface Props {
  lesson: NormalizedLesson;
  onPress?(): void;
  /**
   * Compact mode for lessons of another subgroup — a single line with the
   * subject name, a dashed border in the lesson-type color, transparent background.
   */
  compact?: boolean;
  /** Blocked (muted) lesson — red border, compact look. */
  blocked?: boolean;
  /**
   * Lesson state relative to "now" — `null` if the lesson is not today
   * (in that case no highlight is applied).
   */
  timeStatus?: LessonTimeStatus | null;
  /** Schedule type — for an employee we show groups instead of the avatar. */
  entityType?: 'group' | 'employee';
  /**
   * When provided, an icon is shown to the right of the subject name; tapping
   * it opens the list of nearest pairs of the same subject.
   */
  onSubjectPress?(subject: string): void;
}

// Semi-transparent gray "veil" for past lessons / the elapsed part of an ongoing lesson.
const PAST_OVERLAY_LIGHT = 'rgba(60, 60, 67, 0.10)';
const PAST_OVERLAY_DARK = 'rgba(0, 0, 0, 0.40)';
// Thin blue "marker" for the 5-minute mid-lesson break — drawn on top of the
// gray veil until the lesson ends.
const BREAK_OVERLAY_LIGHT = 'rgba(10, 132, 255, 0.18)';
const BREAK_OVERLAY_DARK = 'rgba(10, 132, 255, 0.35)';

const buildAvatarItems = (lesson: NormalizedLesson) => {
  return (lesson.raw.employees ?? []).map((emp) => ({
    uri: emp.photoLink,
    initials: `${emp.lastName?.[0] ?? ''}${emp.firstName?.[0] ?? ''}`,
  }));
};

const buildGroupAvatarItems = (lesson: NormalizedLesson) => {
  return (lesson.raw.studentGroups ?? []).map((g) => ({
    uri: null as string | null,
    initials: g.name,
  }));
};

const BLOCKED_BG_LIGHT = 'rgba(255, 59, 48, 0.06)';
const BLOCKED_BG_DARK = 'rgba(255, 59, 48, 0.07)';

const COMPACT_CARD_BG = 'transparent';

export const LessonCard = React.memo(
  ({
    lesson,
    onPress,
    compact = false,
    blocked = false,
    timeStatus,
    entityType = 'group',
    onSubjectPress,
  }: Props) => {
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
    const isAnnouncement = lesson.raw.announcement === true;
    const accent = isAnnouncement
      ? ANNOUNCEMENT_COLOR
      : getLessonColor(lesson.raw.lessonTypeAbbrev);
    const typeAbbrev = lesson.raw.lessonTypeAbbrev;

    // Width of the "elapsed" gray fill. 0 = nothing filled,
    // 1 = card fully filled (the lesson has already ended).
    const pastFraction =
      timeStatus?.kind === 'past' ? 1 : timeStatus?.kind === 'ongoing' ? timeStatus.progress : 0;

    // Blue 5-minute break marker — only while the lesson hasn't ended yet
    // (shown both for an ongoing lesson and for one scheduled later today).
    const breakRange =
      timeStatus?.kind === 'ongoing' || timeStatus?.kind === 'future'
        ? getLessonBreakRange(lesson)
        : null;

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
            {isDifferentiateWithoutColorEnabled && typeAbbrev ? `${typeAbbrev} · ` : ''}
            {lesson.raw.subject} · {lesson.startTime} — {lesson.endTime}
          </Text>
          {(lesson.raw.numSubgroup === 1 || lesson.raw.numSubgroup === 2) && (
            <View style={styles.subgroupChip}>
              <Ionicons name={subgroupIcon as never} size={12} color={Palette.textSecondary} />
              <Text maxFontSizeMultiplier={1} style={styles.subgroupNumber}>
                {lesson.raw.numSubgroup}
              </Text>
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
            {isDifferentiateWithoutColorEnabled && typeAbbrev ? `${typeAbbrev} · ` : ''}
            {lesson.raw.subject} · {lesson.startTime} — {lesson.endTime}
          </Text>
          {showCompactSubgroup && (
            <View style={styles.subgroupChip}>
              <Ionicons name={subgroupIcon as never} size={12} color={Palette.textSecondary} />
              <Text maxFontSizeMultiplier={1} style={styles.subgroupNumber}>
                {compactNumSubgroup}
              </Text>
            </View>
          )}
        </Pressable>
      );
    }

    const auditories = (lesson.raw.auditories ?? []).join(', ');
    const employees = lesson.raw.employees ?? [];
    const avatarItems =
      entityType === 'group' ? buildAvatarItems(lesson) : buildGroupAvatarItems(lesson);
    const hasAvatar = avatarItems.length > 0;
    const numSubgroup = lesson.raw.numSubgroup;
    const showSubgroup = numSubgroup === 1 || numSubgroup === 2;
    const hasRightArea = hasAvatar || showSubgroup;

    // Meta row under the title: the auditory. The lesson type is shown as a text
    // badge only when "differentiate without color" (a11y) is enabled — otherwise
    // the type is conveyed by the colored stripe on the left.
    const showTypeBadge = isDifferentiateWithoutColorEnabled && !isAnnouncement && !!typeAbbrev;
    const showNowBadge = isDifferentiateWithoutColorEnabled && timeStatus?.kind === 'ongoing';
    const showMetaRow = isAnnouncement || showTypeBadge || showNowBadge || auditories.length > 0;

    const statusLabel =
      timeStatus?.kind === 'ongoing'
        ? t('a11y.lessonOngoing')
        : timeStatus?.kind === 'past'
          ? t('a11y.lessonPast')
          : timeStatus?.kind === 'future'
            ? t('a11y.lessonUpcoming')
            : null;

    const teacherName =
      employees.length > 0
        ? employees.map((e) => [e.lastName, e.firstName].filter(Boolean).join(' ')).join(', ')
        : null;

    const fullLabel = buildLabel(
      isAnnouncement
        ? t('lesson.announcement')
        : getLessonTypeFullName(lesson.raw.lessonTypeAbbrev),
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
        {pastFraction > 0 && (
          <View
            pointerEvents="none"
            importantForAccessibility="no"
            style={[
              styles.pastOverlay,
              { width: `${pastFraction * 100}%`, backgroundColor: pastOverlayColor },
            ]}
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

        <View style={styles.row}>
          <View style={styles.timeCol} importantForAccessibility="no">
            <Text maxFontSizeMultiplier={1.2} style={styles.timeStart} numberOfLines={1}>
              {lesson.startTime}
            </Text>
            <Text maxFontSizeMultiplier={1.2} style={styles.timeEnd} numberOfLines={1}>
              {lesson.endTime}
            </Text>
          </View>

          <View
            style={[styles.stripe, { backgroundColor: accent }]}
            importantForAccessibility="no"
          />

          <View style={styles.body}>
            <View style={styles.subjectRow}>
              <Text {...textProps('headline')} style={styles.subject} numberOfLines={2}>
                {lesson.raw.subject}
              </Text>
              {onSubjectPress && (
                <Pressable
                  onPress={() => onSubjectPress(lesson.raw.subject)}
                  hitSlop={8}
                  style={styles.subjectIconBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t('lesson.nearestOfSubject')}
                >
                  <Ionicons name="albums-outline" size={16} color={Palette.textTertiary} />
                </Pressable>
              )}
            </View>
            {showMetaRow && (
              <View style={styles.metaRow}>
                {isAnnouncement && (
                  <View
                    style={[
                      styles.announcementBadge,
                      { backgroundColor: ANNOUNCEMENT_COLOR + '1A' },
                    ]}
                  >
                    <Ionicons name="megaphone" size={10} color={ANNOUNCEMENT_COLOR} />
                    <Text
                      {...textProps('tiny')}
                      style={[styles.announcementBadgeText, { color: ANNOUNCEMENT_COLOR }]}
                    >
                      {t('lesson.announcement')}
                    </Text>
                  </View>
                )}
                {showTypeBadge && (
                  <View style={[styles.typeBadge, { backgroundColor: accent + '1A' }]}>
                    <Text {...textProps('tiny')} style={[styles.typeBadgeText, { color: accent }]}>
                      {typeAbbrev}
                    </Text>
                  </View>
                )}
                {showNowBadge && (
                  <Text
                    maxFontSizeMultiplier={1}
                    style={[styles.nowBadge, { color: Palette.accent }]}
                  >
                    {t('a11y.now')}
                  </Text>
                )}
                {auditories.length > 0 && (
                  <Text {...textProps('footnote')} style={styles.meta} numberOfLines={1}>
                    {auditories}
                  </Text>
                )}
              </View>
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
                  <Text maxFontSizeMultiplier={1} style={styles.subgroupNumber}>
                    {numSubgroup}
                  </Text>
                </View>
              )}
              {hasAvatar && (
                <AvatarGroup
                  items={avatarItems}
                  size={40}
                  maxChars={entityType === 'employee' ? 6 : undefined}
                />
              )}
            </View>
          )}
        </View>
      </Pressable>
    );
  },
);

LessonCard.displayName = 'LessonCard';
const STRIPE_WIDTH = 4;

const makeStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    card: {
      backgroundColor: Palette.card,
      borderRadius: Radius.lg,
      marginHorizontal: Spacing.screenPadding,
      marginBottom: Spacing.cardGap,
      overflow: 'hidden',
    },
    cardPressed: { backgroundColor: Palette.cardPressed },
    row: {
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    timeCol: {
      // No fixed width: the time is always "HH:MM" (5 characters), so the
      // columns align on their own and "14:50" is never clipped or wrapped.
      paddingLeft: Spacing.lg,
      paddingRight: Spacing.md,
      paddingVertical: Spacing.md,
      justifyContent: 'center',
      alignItems: 'flex-end',
      gap: 1,
    },
    timeStart: {
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 0.2,
      color: Palette.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    timeEnd: {
      fontSize: 13,
      fontWeight: '500',
      color: Palette.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    stripe: {
      width: STRIPE_WIDTH,
      borderRadius: STRIPE_WIDTH / 2,
      marginVertical: Spacing.md,
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
    // To keep the rotated text from wrapping onto 2 lines, the wrapper needs
    // explicit dimensions in its "original" (horizontal) coordinates: width =
    // enough for an "HH:MM" string, height = line height.
    // We rotate the View, not the Text — in RN a transform on Text sometimes
    // isn't applied in a narrow container (our break block is ~20pt).
    // alignItems: 'flex-end' inside the wrapper places the Text at the right
    // edge of the horizontal box; after the -90° rotation (counterclockwise)
    // the right edge becomes the top → the label is pinned to the top of the strip.
    // marginTop compensates for the center shift under rotate: visualTop = marginTop +
    // (height - width)/2; for 50×14 and a desired visualTop ≈ 4 → marginTop ≈ 22.
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
      justifyContent: 'center',
      paddingVertical: Spacing.md,
      // Symmetric to the gap left of the stripe (timeCol.paddingRight = Spacing.md).
      paddingLeft: Spacing.md,
      paddingRight: Spacing.lg,
      gap: 3,
    },
    subjectRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
    },
    subjectIconBtn: {
      paddingTop: 2,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
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

    announcementBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    announcementBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    nowBadge: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    subject: {
      flex: 1,
      fontSize: 16,
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
      backgroundColor: COMPACT_CARD_BG,
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
