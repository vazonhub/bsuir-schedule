import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useGetLessonAccentColor, useIconName } from '@hooks/useAppearance';
import { usePalette } from '@hooks/usePalette';
import type { CurrentWeekNumber, ScheduleDto } from '@models/dto';
import { Radius, Spacing } from '@theme';
import { textProps } from '@theme/typography';
import { formatDiaryWhen } from '@utils/diary';
import { getLessonTypeFullName } from '@utils/lesson';
import { flattenSchedule } from '@utils/scheduleNormalization';

type PaletteType = ReturnType<typeof usePalette>;

export interface SubjectLessonsSheetRef {
  present(subject: string): void;
  dismiss(): void;
}

interface Props {
  schedule: ScheduleDto;
  currentWeek: CurrentWeekNumber;
}

/**
 * Bottom sheet listing the nearest (today + future) occurrences of a single
 * subject — labs, practicals, lectures, everything — in a scrollable list.
 * Opened from the icon next to a lesson's title.
 */
export const SubjectLessonsSheet = forwardRef<SubjectLessonsSheetRef, Props>(
  ({ schedule, currentWeek }, ref) => {
    const { t } = useTranslation();
    const Palette = usePalette();
    const styles = useMemo(() => makeStyles(Palette), [Palette]);
    const getLessonColor = useGetLessonAccentColor();
    const locationIcon = useIconName('location');
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
      return flattenSchedule(schedule, currentWeek, new Date()).filter(
        (l) => l.raw.subject === subject,
      );
    }, [subject, schedule, currentWeek]);

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
          {lessons.length === 0 ? (
            <View style={styles.empty}>
              <Text {...textProps('callout')} style={styles.emptyText}>
                {t('lesson.nearestOfSubjectEmpty')}
              </Text>
            </View>
          ) : (
            lessons.map((lesson) => {
              const type = lesson.raw.lessonTypeAbbrev;
              const accent = getLessonColor(type);
              const auditories = (lesson.raw.auditories ?? []).join(', ');
              return (
                <View key={lesson.key} style={styles.row}>
                  <View style={[styles.typeStripe, { backgroundColor: accent }]} />
                  <View style={styles.rowBody}>
                    <View style={styles.rowTop}>
                      <Text {...textProps('body')} style={styles.when} numberOfLines={1}>
                        {formatDiaryWhen(lesson.date, lesson.startTime, new Date())}
                      </Text>
                      {type && (
                        <View style={[styles.typeBadge, { backgroundColor: accent + '1A' }]}>
                          <Text
                            {...textProps('tiny')}
                            style={[styles.typeBadgeText, { color: accent }]}
                          >
                            {getLessonTypeFullName(type)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.rowMeta}>
                      <Text {...textProps('footnote')} style={styles.time}>
                        {lesson.startTime}–{lesson.endTime}
                      </Text>
                      {auditories.length > 0 && (
                        <View style={styles.auditory}>
                          <Ionicons
                            name={locationIcon as never}
                            size={13}
                            color={Palette.textTertiary}
                          />
                          <Text {...textProps('footnote')} style={styles.auditoryText}>
                            {auditories}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
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
      backgroundColor: Palette.card,
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
      paddingHorizontal: Spacing.xl,
      paddingBottom: Spacing.xxxl + 40,
      gap: Spacing.cardGap,
    },
    empty: {
      alignItems: 'center',
      paddingVertical: Spacing.xxxl,
    },
    emptyText: {
      color: Palette.textSecondary,
      textAlign: 'center',
    },
    row: {
      flexDirection: 'row',
      backgroundColor: Palette.background,
      borderRadius: Radius.lg,
      overflow: 'hidden',
    },
    typeStripe: {
      width: 4,
    },
    rowBody: {
      flex: 1,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      gap: 4,
    },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.md,
    },
    when: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: Palette.textPrimary,
    },
    typeBadge: {
      paddingHorizontal: Spacing.md,
      paddingVertical: 2,
      borderRadius: Radius.pill,
    },
    typeBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    rowMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
    },
    time: {
      color: Palette.textSecondary,
    },
    auditory: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    auditoryText: {
      color: Palette.textTertiary,
    },
  });
