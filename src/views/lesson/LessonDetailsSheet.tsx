import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { forwardRef, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@components/Avatar';
import { usePalette } from '@hooks/usePalette';
import type { EmployeeDto, LessonStudentGroupDto, WeekNumber } from '@models/dto';
import { Radius, Spacing } from '@theme';
import { getDayNames } from '@utils/date';
import { getLessonAccentColor, getLessonTypeFullName } from '@utils/lesson';
import type { NormalizedLesson } from '@utils/scheduleNormalization';

type PaletteType = ReturnType<typeof usePalette>;

interface Props {
  lesson: NormalizedLesson | null;
  currentWeek: WeekNumber;
  entityType: 'group' | 'employee';
}

export const LessonDetailsSheet = forwardRef<BottomSheetModal, Props>(
  ({ lesson, currentWeek, entityType }, ref) => {
    const { t } = useTranslation();
    const router = useRouter();
    const segments = useSegments() as string[];
    const currentTab = (segments[1] ?? '(groups)') as '(my)' | '(groups)' | '(employees)';
    const Palette = usePalette();
    const styles = useMemo(() => makeStyles(Palette), [Palette]);
    const snapPoints = useMemo(() => ['45%', '90%'], []);

    const handleEmployeePress = useCallback(
      (employee: EmployeeDto) => {
        (ref as React.RefObject<BottomSheetModal | null>).current?.dismiss();
        const params = {
          urlId: employee.urlId,
          fio: employee.fio ?? `${employee.lastName} ${employee.firstName?.[0] ?? ''}.`,
        };
        switch (currentTab) {
          case '(employees)':
            router.push({ pathname: '/(tabs)/(employees)/[urlId]', params });
            break;
          case '(groups)':
            router.push({ pathname: '/(tabs)/(groups)/employee/[urlId]' as never, params });
            break;
          case '(my)':
            router.push({ pathname: '/(tabs)/(my)/employee/[urlId]' as never, params });
            break;
        }
      },
      [router, ref, currentTab],
    );

    const handleGroupPress = useCallback(
      (group: LessonStudentGroupDto) => {
        (ref as React.RefObject<BottomSheetModal | null>).current?.dismiss();
        const params = { name: group.name };
        switch (currentTab) {
          case '(groups)':
            router.push({ pathname: '/(tabs)/(groups)/[name]', params });
            break;
          case '(employees)':
            router.push({ pathname: '/(tabs)/(employees)/group/[name]' as never, params });
            break;
          case '(my)':
            router.push({ pathname: '/(tabs)/(my)/group/[name]' as never, params });
            break;
        }
      },
      [router, ref, currentTab],
    );

    if (!lesson) return null;

    const raw = lesson.raw;
    const accent = getLessonAccentColor(raw.lessonTypeAbbrev);
    const typeFull = getLessonTypeFullName(raw.lessonTypeAbbrev);
    const days = getDayNames();
    const months = t('date.months', { returnObjects: true }) as string[];
    const dayName = days[lesson.date.getDay()];
    const dom = lesson.date.getDate();
    const month = months[lesson.date.getMonth()];
    const dateStr = `${dayName}, ${dom} ${month}`;
    const auditories = (raw.auditories ?? []).join(', ');
    const employees = raw.employees ?? [];
    const groups = raw.studentGroups ?? [];
    const weekNumbers = raw.weekNumber ?? [];
    const showSubgroup = raw.numSubgroup === 1 || raw.numSubgroup === 2;

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        backgroundStyle={styles.background}
        handleIndicatorStyle={styles.handle}
      >
        <BottomSheetScrollView contentContainerStyle={styles.content}>
          {/* Type chip */}
          <View style={styles.chipRow}>
            <View style={[styles.typeChip, { backgroundColor: accent + '1A' }]}>
              <View style={[styles.typeDot, { backgroundColor: accent }]} />
              <Text style={[styles.typeText, { color: accent }]}>{typeFull}</Text>
            </View>
            {showSubgroup && (
              <View style={styles.subgroupChip}>
                <Ionicons name="person" size={14} color={Palette.textSecondary} />
                <Text style={styles.subgroupText}>{t('lesson.subgroup', { n: raw.numSubgroup })}</Text>
              </View>
            )}
          </View>

          {/* Subject */}
          <Text style={styles.subject}>{raw.subjectFullName || raw.subject}</Text>

          {/* Date & Time */}
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={18} color={Palette.textSecondary} />
            <Text style={styles.infoText}>
              {lesson.startTime} — {lesson.endTime}, {dateStr}
            </Text>
          </View>

          {/* Auditory */}
          {auditories.length > 0 && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color={Palette.textSecondary} />
              <Text style={styles.infoText}>{auditories}</Text>
            </View>
          )}

          {/* Weeks */}
          {weekNumbers.length > 0 && (
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={18} color={Palette.textSecondary} />
              <View style={styles.weeksRow}>
                {([1, 2, 3, 4] as WeekNumber[]).map((w) => {
                  const active = weekNumbers.includes(w);
                  const isCurrent = w === currentWeek;
                  return (
                    <View
                      key={w}
                      style={[
                        styles.weekBadge,
                        active && styles.weekBadgeActive,
                        isCurrent && active && styles.weekBadgeCurrent,
                      ]}
                    >
                      <Text
                        style={[
                          styles.weekText,
                          active && styles.weekTextActive,
                          isCurrent && active && styles.weekTextCurrent,
                        ]}
                      >
                        {w}
                      </Text>
                    </View>
                  );
                })}
                <Text style={styles.weeksLabel}>{t('lesson.weekLabel')}</Text>
              </View>
            </View>
          )}

          {/* Note */}
          {raw.note && (
            <View style={styles.noteCard}>
              <Text style={styles.noteText}>{raw.note}</Text>
            </View>
          )}

          {/* Employees (for group schedule) */}
          {entityType === 'group' && employees.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {employees.length === 1 ? t('lesson.teacher') : t('lesson.teachers')}
              </Text>
              {employees.map((emp) => (
                <Pressable
                  key={emp.id}
                  onPress={() => handleEmployeePress(emp)}
                  style={({ pressed }) => [styles.personCard, pressed && styles.personCardPressed]}
                >
                  <Avatar uri={emp.photoLink} initials={`${emp.lastName?.[0] ?? ''}${emp.firstName?.[0] ?? ''}`} size={40} />
                  <View style={styles.personInfo}>
                    <Text style={styles.personName} numberOfLines={1}>
                      {[emp.lastName, emp.firstName, emp.middleName].filter(Boolean).join(' ')}
                    </Text>
                    {(emp.degree || emp.rank) && (
                      <Text style={styles.personSub} numberOfLines={1}>
                        {[emp.rank, emp.degree].filter(Boolean).join(', ')}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.chevron}>&rsaquo;</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Groups (for employee schedule) */}
          {entityType === 'employee' && groups.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {groups.length === 1 ? t('lesson.group') : t('lesson.groups')}
              </Text>
              {groups.map((g) => (
                <Pressable
                  key={g.name}
                  onPress={() => handleGroupPress(g)}
                  style={({ pressed }) => [styles.personCard, pressed && styles.personCardPressed]}
                >
                  <View style={styles.groupIcon}>
                    <Ionicons name="people" size={18} color={Palette.textSecondary} />
                  </View>
                  <View style={styles.personInfo}>
                    <Text style={styles.personName}>{g.name}</Text>
                    {g.specialityName ? (
                      <Text style={styles.personSub} numberOfLines={1}>{g.specialityName}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.chevron}>&rsaquo;</Text>
                </Pressable>
              ))}
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

const makeStyles = (Palette: PaletteType) => StyleSheet.create({
  background: {
    backgroundColor: Palette.card,
    borderRadius: Radius.xl,
  },
  handle: {
    backgroundColor: Palette.textTertiary,
    width: 36,
  },
  content: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl + 40,
    gap: Spacing.lg,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    gap: Spacing.sm,
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  subgroupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Palette.background,
    gap: Spacing.sm,
  },
  subgroupText: {
    fontSize: 14,
    fontWeight: '500',
    color: Palette.textSecondary,
  },
  subject: {
    fontSize: 20,
    fontWeight: '700',
    color: Palette.textPrimary,
    lineHeight: 26,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: Palette.textSecondary,
  },
  weeksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  weekBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.background,
  },
  weekBadgeActive: {
    backgroundColor: Palette.separator,
  },
  weekBadgeCurrent: {
    backgroundColor: Palette.accent,
  },
  weekText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textTertiary,
  },
  weekTextActive: {
    color: Palette.textPrimary,
  },
  weekTextCurrent: {
    color: '#FFFFFF',
  },
  weeksLabel: {
    fontSize: 13,
    color: Palette.textTertiary,
    marginLeft: Spacing.xs,
  },
  noteCard: {
    backgroundColor: Palette.background,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  noteText: {
    fontSize: 14,
    color: Palette.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  section: {
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.background,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  personCardPressed: {
    backgroundColor: Palette.cardPressed,
  },
  personInfo: {
    flex: 1,
    gap: 2,
  },
  personName: {
    fontSize: 16,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  personSub: {
    fontSize: 13,
    color: Palette.textSecondary,
  },
  groupIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.separator,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    fontSize: 22,
    lineHeight: 22,
    color: Palette.textTertiary,
  },
});
