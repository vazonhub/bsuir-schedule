import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useSegments } from 'expo-router';
import { forwardRef, useCallback, useMemo, useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@components/Avatar';
import { useGetLessonAccentColor, useIconName } from '@hooks/useAppearance';
import { usePalette } from '@hooks/usePalette';
import type { EmployeeDto, LessonStudentGroupDto, WeekNumber } from '@models/dto';
import { Radius, Spacing } from '@theme';
import { textProps } from '@theme/typography';
import { getDayNames } from '@utils/date';
import { hapticLight } from '@utils/haptics';
import { getLessonTypeFullName } from '@utils/lesson';
import type { NormalizedLesson } from '@utils/scheduleNormalization';
import { FALLBACK_LESSON_COLOR as FALLBACK } from '@theme/colors';

type PaletteType = ReturnType<typeof usePalette>;

interface Props {
  lesson: NormalizedLesson | null;
  currentWeek: WeekNumber;
  entityType: 'group' | 'employee';
  onDismiss?(): void;
  onChange?(index: number): void;
  /** Текущее состояние блокировки выбранной пары. */
  isBlocked?: boolean;
  /** Callback для toggle блокировки. Если не передан — кнопка не показывается. */
  onToggleBlock?(): void;
}

export const LessonDetailsSheet = forwardRef<BottomSheetModal, Props>(
  ({ lesson, currentWeek, entityType, onDismiss, onChange, isBlocked, onToggleBlock }, ref) => {
    const { t } = useTranslation();
    const router = useRouter();
    const segments = useSegments() as string[];
    const currentTab = (segments[1] ?? '(groups)') as '(amy)' | '(groups)' | '(employees)';
    const Palette = usePalette();
    const styles = useMemo(() => makeStyles(Palette), [Palette]);
    const snapPoints = useMemo(() => ['45%', '90%'], []);

    const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null);

    const handleAvatarPress = useCallback((photoLink: string) => {
      if (photoLink) setFullscreenPhoto(photoLink);
    }, []);

    const handleEmployeePress = useCallback(
      (employee: EmployeeDto) => {
        void hapticLight();
        (ref as React.RefObject<BottomSheetModal | null>).current?.dismiss();
        const params = {
          urlId: employee.urlId,
          fio: employee.fio ?? `${employee.lastName} ${employee.firstName?.[0] ?? ''}.${employee.middleName?.[0] ? employee.middleName[0] + '.' : ''}`,
        };
        switch (currentTab) {
          case '(employees)':
            router.push({ pathname: '/(tabs)/(employees)/[urlId]', params });
            break;
          case '(groups)':
            router.push({ pathname: '/(tabs)/(groups)/employee/[urlId]' as never, params });
            break;
          case '(amy)':
            router.push({ pathname: '/(tabs)/(amy)/employee/[urlId]' as never, params });
            break;
        }
      },
      [router, ref, currentTab],
    );

    const handleGroupPress = useCallback(
      (group: LessonStudentGroupDto) => {
        void hapticLight();
        (ref as React.RefObject<BottomSheetModal | null>).current?.dismiss();
        const params = { name: group.name };
        switch (currentTab) {
          case '(groups)':
            router.push({ pathname: '/(tabs)/(groups)/[name]', params });
            break;
          case '(employees)':
            router.push({ pathname: '/(tabs)/(employees)/group/[name]' as never, params });
            break;
          case '(amy)':
            router.push({ pathname: '/(tabs)/(amy)/group/[name]' as never, params });
            break;
        }
      },
      [router, ref, currentTab],
    );

    const getLessonColor = useGetLessonAccentColor();
    const subgroupIcon = useIconName('subgroup');
    const blockIcon = useIconName('block');
    const clockIcon = useIconName('clock');
    const locationIcon = useIconName('location');
    const raw = lesson?.raw ?? null;
    const accent = raw ? getLessonColor(raw.lessonTypeAbbrev) : FALLBACK;
    const typeFull = raw ? getLessonTypeFullName(raw.lessonTypeAbbrev) : '';
    const days = getDayNames();
    const months = t('date.months', { returnObjects: true }) as string[];
    const dayName = lesson ? days[lesson.date.getDay()] : '';
    const dom = lesson?.date.getDate() ?? 0;
    const month = lesson ? months[lesson.date.getMonth()] : '';
    const dateStr = `${dayName}, ${dom} ${month}`;
    const auditories = (raw?.auditories ?? []).join(', ');
    const employees = raw?.employees ?? [];
    const groups = raw?.studentGroups ?? [];
    const weekNumbers = raw?.weekNumber ?? [];
    const showSubgroup = raw?.numSubgroup === 1 || raw?.numSubgroup === 2;

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        backgroundStyle={styles.background}
        handleIndicatorStyle={styles.handle}
        onDismiss={onDismiss}
        onChange={onChange}
      >
        {lesson && raw && <BottomSheetScrollView contentContainerStyle={styles.content}>
          {/* Type chip + block button */}
          <View style={styles.chipRow}>
            <View style={styles.chipGroup}>
              <View style={[styles.typeChip, { backgroundColor: accent + '1A' }]}>
                <View style={[styles.typeDot, { backgroundColor: accent }]} importantForAccessibility="no" />
                <Text {...textProps('subhead')} style={[styles.typeText, { color: accent }]}>{typeFull}</Text>
              </View>
              {showSubgroup && (
                <View style={styles.subgroupChip}>
                  <Ionicons name={subgroupIcon as never} size={14} color={Palette.textSecondary} />
                  <Text {...textProps('subhead')} style={styles.subgroupText}>{t('lesson.subgroup', { n: raw.numSubgroup })}</Text>
                </View>
              )}
            </View>
            {onToggleBlock && (
              <Pressable
                onPress={() => {
                  void hapticLight();
                  onToggleBlock();
                }}
                hitSlop={8}
                style={[
                  styles.blockButton,
                  isBlocked
                    ? { backgroundColor: Palette.destructive + '1A' }
                    : { backgroundColor: Palette.background },
                ]}
                accessibilityRole="button"
                accessibilityLabel={isBlocked ? t('a11y.unblockLesson') : t('a11y.blockLesson')}
              >
                <Ionicons
                  name={blockIcon as never}
                  size={16}
                  color={isBlocked ? Palette.destructive : Palette.textTertiary}
                />
              </Pressable>
            )}
          </View>

          {/* Subject */}
          <Text {...textProps('title')} style={styles.subject}>{raw.subjectFullName || raw.subject}</Text>

          {/* Date & Time */}
          <View style={styles.infoRow}>
            <Ionicons name={clockIcon as never} size={18} color={Palette.textSecondary} />
            <Text {...textProps('callout')} style={styles.infoText}>
              {lesson.startTime} — {lesson.endTime}, {dateStr}
            </Text>
          </View>

          {/* Auditory */}
          {auditories.length > 0 && (
            <View style={styles.infoRow}>
              <Ionicons name={locationIcon as never} size={18} color={Palette.textSecondary} />
              <Text {...textProps('callout')} style={styles.infoText}>{auditories}</Text>
            </View>
          )}

          {/* Weeks or specific date */}
          {raw.dateLesson ? (
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={18} color={Palette.textSecondary} />
              <Text {...textProps('callout')} style={styles.infoText}>{dateStr}</Text>
            </View>
          ) : weekNumbers.length > 0 ? (
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
                        maxFontSizeMultiplier={1}
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
                <Text {...textProps('footnote')} style={styles.weeksLabel}>{t('lesson.weekLabel')}</Text>
              </View>
            </View>
          ) : null}

          {/* Note */}
          {raw.note && (
            <View style={styles.noteCard}>
              <Text {...textProps('subhead')} style={styles.noteText}>{raw.note}</Text>
            </View>
          )}

          {/* Employees (for group schedule) */}
          {entityType === 'group' && employees.length > 0 && (
            <View style={styles.section}>
              <Text {...textProps('footnote')} style={styles.sectionTitle}>
                {employees.length === 1 ? t('lesson.teacher') : t('lesson.teachers')}
              </Text>
              {employees.map((emp) => {
                const isDanilovaOaip =
                  emp.lastName === 'Данилова' &&
                  emp.firstName === 'Галина' &&
                  emp.middleName === 'Владимировна' &&
                  raw.subject === 'ОАиП';
                return (
                  <View key={emp.id}>
                    <Pressable
                      onPress={() => handleEmployeePress(emp)}
                      style={({ pressed }) => [styles.personCard, pressed && styles.personCardPressed]}
                      accessibilityRole="button"
                      accessibilityLabel={t('employees.teacherLabel', { name: [emp.lastName, emp.firstName, emp.middleName].filter(Boolean).join(' ') })}
                      accessibilityHint={t('a11y.openEmployeeSchedule')}
                    >
                      <Pressable onPress={() => handleAvatarPress(emp.photoLink)} importantForAccessibility="no">
                        <Avatar uri={emp.photoLink} initials={`${emp.lastName?.[0] ?? ''}${emp.firstName?.[0] ?? ''}`} size={40} />
                      </Pressable>
                      <View style={styles.personInfo}>
                        <Text {...textProps('body')} style={styles.personName} numberOfLines={1}>
                          {[emp.lastName, emp.firstName, emp.middleName].filter(Boolean).join(' ')}
                        </Text>
                        {(emp.degree || emp.rank) && (
                          <Text {...textProps('footnote')} style={styles.personSub} numberOfLines={1}>
                            {[emp.rank, emp.degree].filter(Boolean).join(', ')}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.chevron} importantForAccessibility="no">&rsaquo;</Text>
                    </Pressable>
                    {isDanilovaOaip && (
                      <Text style={styles.easterEgg}>не забудь про творческий блок!</Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Groups (for employee schedule) */}
          {entityType === 'employee' && groups.length > 0 && (
            <View style={styles.section}>
              <Text {...textProps('footnote')} style={styles.sectionTitle}>
                {groups.length === 1 ? t('lesson.group') : t('lesson.groups')}
              </Text>
              {groups.map((g) => (
                <Pressable
                  key={g.name}
                  onPress={() => handleGroupPress(g)}
                  style={({ pressed }) => [styles.personCard, pressed && styles.personCardPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('lesson.group')} ${g.name}`}
                  accessibilityHint={t('a11y.openGroupSchedule')}
                >
                  <View style={styles.groupIcon}>
                    <Ionicons name="people" size={18} color={Palette.textSecondary} />
                  </View>
                  <View style={styles.personInfo}>
                    <Text {...textProps('body')} style={styles.personName}>{g.name}</Text>
                    {g.specialityName ? (
                      <Text {...textProps('footnote')} style={styles.personSub} numberOfLines={1}>{g.specialityName}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.chevron} importantForAccessibility="no">&rsaquo;</Text>
                </Pressable>
              ))}
            </View>
          )}
        </BottomSheetScrollView>}
        <Modal
          visible={fullscreenPhoto !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setFullscreenPhoto(null)}
        >
          <Pressable
            style={styles.photoBackdrop}
            onPress={() => setFullscreenPhoto(null)}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.closePhoto')}
            accessibilityViewIsModal
          >
            <Image
              source={fullscreenPhoto ?? undefined}
              style={styles.photoFull}
              contentFit="contain"
              cachePolicy="memory-disk"
              accessibilityIgnoresInvertColors
            />
          </Pressable>
        </Modal>
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    flex: 1,
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
  blockButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.md,
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
    minWidth: 28,
    minHeight: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
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
  easterEgg: {
    fontSize: 13,
    fontStyle: 'italic',
    color: Palette.textTertiary,
    textAlign: 'right',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  photoBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoFull: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').width,
  },
});
