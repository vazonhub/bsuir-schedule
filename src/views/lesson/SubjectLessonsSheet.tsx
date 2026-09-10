import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { UnityBanner } from '@components/UnityBanner';
import { usePalette } from '@hooks/usePalette';
import type { CurrentWeekNumber, ScheduleDto } from '@models/dto';
import type { SubgroupChoice } from '@stores/preferences.store';
import { Radius, Spacing } from '@theme';
import { textProps } from '@theme/typography';
import { formatDayDate, formatDayName, isSameDay } from '@utils/date';
import { getLessonTimeStatus } from '@utils/lesson';
import { flattenSchedule } from '@utils/scheduleNormalization';
import type { NormalizedLesson } from '@utils/scheduleNormalization';
import { LessonCard } from '@views/lesson/LessonCard';

type PaletteType = ReturnType<typeof usePalette>;

/** Only submission-bearing lessons are listed here — lectures are excluded. */
const NEAREST_LESSON_TYPES: ReadonlySet<string> = new Set(['ЛР', 'ПЗ']);

/** Insert a banner after every Nth lesson block. */
const BANNER_EVERY = 3;

/** Row stream: a compact date header, a lesson block, or an inline banner. */
type Row =
  | { kind: 'date'; date: Date; key: string }
  | { kind: 'lesson'; lesson: NormalizedLesson }
  | { kind: 'banner'; id: number };

const dateKeyOf = (date: Date): string =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

export interface SubjectLessonsSheetRef {
  present(subject: string): void;
  dismiss(): void;
}

interface Props {
  schedule: ScheduleDto;
  currentWeek: CurrentWeekNumber;
  /** User's chosen subgroup: 0 = all, 1|2 = specific. */
  subgroup: SubgroupChoice;
}

/**
 * Bottom sheet listing the nearest (today + future) ЛР / ПЗ occurrences of a
 * single subject — lectures are excluded. When a subgroup is selected, only
 * shared (numSubgroup=0) and matching-subgroup lessons are shown.
 * Opened from the icon next to a lesson's title.
 *
 * Lessons render with the same `LessonCard` block used on the main schedule so
 * the look is identical; each day gets a compact (de-emphasized) date header and
 * a banner is interleaved after every few lessons.
 */
export const SubjectLessonsSheet = forwardRef<SubjectLessonsSheetRef, Props>(
  ({ schedule, currentWeek, subgroup }, ref) => {
    const { t } = useTranslation();
    const Palette = usePalette();
    const styles = useMemo(() => makeStyles(Palette), [Palette]);
    const sheetRef = useRef<BottomSheetModal>(null);
    const [subject, setSubject] = useState<string | null>(null);
    const snapPoints = useMemo(() => ['55%', '90%'], []);

    useImperativeHandle(ref, () => ({
      present: (s) => {
        setSubject(s);
        sheetRef.current?.present();
      },
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    const lessons = useMemo(() => {
      if (!subject) return [];
      return flattenSchedule(schedule, currentWeek, new Date()).filter((l) => {
        if (l.raw.subject !== subject) return false;
        // Only ЛР / ПЗ — lectures are never listed here.
        if (!l.raw.lessonTypeAbbrev || !NEAREST_LESSON_TYPES.has(l.raw.lessonTypeAbbrev)) {
          return false;
        }
        // With a subgroup selected, keep shared (numSubgroup=0) and matching
        // lessons only; drop the other subgroup's occurrences.
        if (subgroup !== 0 && l.raw.numSubgroup !== 0 && l.raw.numSubgroup !== subgroup) {
          return false;
        }
        return true;
      });
    }, [subject, schedule, currentWeek, subgroup]);

    // Build the render stream: a date header per day, lesson blocks, and a
    // banner after every BANNER_EVERY lessons (never trailing).
    const rows = useMemo(() => {
      const out: Row[] = [];
      let prevDateKey: string | null = null;
      let lessonCount = 0;
      let bannerId = 0;
      for (const lesson of lessons) {
        const dk = dateKeyOf(lesson.date);
        if (dk !== prevDateKey) {
          out.push({ kind: 'date', date: lesson.date, key: dk });
          prevDateKey = dk;
        }
        out.push({ kind: 'lesson', lesson });
        lessonCount += 1;
        if (lessonCount % BANNER_EVERY === 0) out.push({ kind: 'banner', id: bannerId++ });
      }
      // Drop a trailing banner so ads sit *between* lessons, not after the last.
      if (out[out.length - 1]?.kind === 'banner') out.pop();
      return out;
    }, [lessons]);

    const now = new Date();

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        backgroundStyle={styles.background}
        handleIndicatorStyle={styles.handle}
        onDismiss={() => setSubject(null)}
      >
        <View style={styles.header}>
          <Text {...textProps('title')} style={styles.title} numberOfLines={1}>
            {subject}
          </Text>
          <Text {...textProps('footnote')} style={styles.subtitle}>
            {t('lesson.nearestOfSubject')}
          </Text>
        </View>
        <BottomSheetScrollView contentContainerStyle={styles.content}>
          {rows.length === 0 ? (
            <View style={styles.empty}>
              <Text {...textProps('callout')} style={styles.emptyText}>
                {t('lesson.nearestOfSubjectEmpty')}
              </Text>
            </View>
          ) : (
            rows.map((row) => {
              if (row.kind === 'banner') {
                return (
                  <View key={`banner:${row.id}`} style={styles.bannerWrap}>
                    <UnityBanner />
                  </View>
                );
              }
              if (row.kind === 'date') {
                const isToday = isSameDay(row.date, now);
                const status = isToday ? t('date.today') : null;
                return (
                  <View key={`date:${row.key}`} style={styles.dateHeader}>
                    <Text style={styles.dateDayName} numberOfLines={1}>
                      {formatDayName(row.date)}
                    </Text>
                    <Text style={styles.dateDate} numberOfLines={1}>
                      {formatDayDate(row.date)}
                    </Text>
                    {status != null && <Text style={styles.dateStatus}>{status}</Text>}
                  </View>
                );
              }
              const lesson = row.lesson;
              return (
                <LessonCard
                  key={lesson.key}
                  lesson={lesson}
                  timeStatus={
                    isSameDay(lesson.date, now)
                      ? getLessonTimeStatus(lesson, now)
                      : lesson.isPast
                        ? { kind: 'past' as const }
                        : null
                  }
                />
              );
            })
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

SubjectLessonsSheet.displayName = 'SubjectLessonsSheet';

const makeStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    background: {
      // Screen background (not card) so the `LessonCard` blocks stand out just
      // like on the main schedule instead of blending into the sheet.
      backgroundColor: Palette.background,
      borderRadius: Radius.xl,
    },
    handle: {
      backgroundColor: Palette.textTertiary,
      width: 36,
    },
    header: {
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.md,
      gap: 2,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: Palette.textPrimary,
    },
    subtitle: {
      color: Palette.textSecondary,
    },
    content: {
      // No horizontal padding — LessonCard brings its own screen-edge margins,
      // matching the main schedule exactly.
      paddingBottom: Spacing.xxxl + 40,
    },
    empty: {
      alignItems: 'center',
      paddingVertical: Spacing.xxxl,
    },
    emptyText: {
      color: Palette.textSecondary,
      textAlign: 'center',
    },
    // Compact, de-emphasized date header — smaller than the main-screen DayHeader
    // so the accent stays on the lesson block.
    dateHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.screenPadding + Spacing.xs,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.sm,
    },
    dateDayName: {
      fontSize: 14,
      fontWeight: '700',
      color: Palette.textPrimary,
    },
    dateDate: {
      fontSize: 12,
      fontWeight: '500',
      color: Palette.textSecondary,
    },
    dateStatus: {
      fontSize: 12,
      fontWeight: '700',
      color: Palette.accent,
    },
    bannerWrap: {
      alignItems: 'center',
      paddingVertical: Spacing.md,
    },
  });
