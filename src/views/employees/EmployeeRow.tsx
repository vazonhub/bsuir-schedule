import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@components/Avatar';
import { usePalette } from '@hooks/usePalette';
import type { EmployeeDto } from '@models/dto';
import { Radius, Spacing } from '@theme';

type PaletteType = ReturnType<typeof usePalette>;

interface Props {
  employee: EmployeeDto;
  onPress(): void;
}

const buildInitials = (e: EmployeeDto): string => {
  const last = e.lastName?.[0] ?? '';
  const first = e.firstName?.[0] ?? '';
  return `${last}${first}`;
};

const buildSubtitle = (e: EmployeeDto): string | null => {
  const departments = e.academicDepartment?.length ? e.academicDepartment.join(', ') : '';
  if (departments && e.rank) return `${departments} · ${e.rank}`;
  if (departments) return departments;
  if (e.rank) return e.rank;
  return null;
};

export const EmployeeRow = ({ employee, onPress }: Props) => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);
  const subtitle = buildSubtitle(employee);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={t('employees.teacherLabel', { name: `${employee.lastName} ${employee.firstName} ${employee.middleName}` })}
    >
      <Avatar uri={employee.photoLink} initials={buildInitials(employee)} />
      <View style={styles.main}>
        <Text style={styles.title} numberOfLines={1}>
          {[employee.lastName, employee.firstName, employee.middleName]
            .filter(Boolean)
            .join(' ')}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      <Text style={styles.chevron}>&rsaquo;</Text>
    </Pressable>
  );
};

const makeStyles = (Palette: PaletteType) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.cardGap,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.lg,
  },
  cardPressed: { backgroundColor: Palette.cardPressed },
  main: { flex: 1, gap: 2 },
  title: { fontSize: 17, fontWeight: '600', color: Palette.textPrimary },
  subtitle: { fontSize: 13, color: Palette.textSecondary },
  chevron: {
    fontSize: 22,
    lineHeight: 22,
    color: Palette.textTertiary,
    marginLeft: Spacing.sm,
  },
});
