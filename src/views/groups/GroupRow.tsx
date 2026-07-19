import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { usePalette } from '@hooks/usePalette';
import type { StudentGroupDto } from '@models/dto';
import { Radius, Spacing } from '@theme';
import { textProps } from '@theme/typography';

type PaletteType = ReturnType<typeof usePalette>;

interface Props {
  group: StudentGroupDto;
  onPress(): void;
}

export const GroupRow = React.memo(({ group, onPress }: Props) => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const styles = useMemo(() => makeStyles(Palette), [Palette]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={t('groups.groupLabel', {
        name: group.name,
        speciality: group.specialityName,
        course: group.course,
      })}
      accessibilityHint={t('a11y.openGroupSchedule')}
    >
      <View style={styles.main}>
        <Text {...textProps('headline')} style={styles.title}>
          {group.name}
        </Text>
        <Text {...textProps('footnote')} style={styles.subtitle} numberOfLines={1}>
          {group.facultyAbbrev} &middot; {group.specialityAbbrev} &middot; {group.course} курс
        </Text>
      </View>
      <Text maxFontSizeMultiplier={1} style={styles.chevron} importantForAccessibility="no">
        &rsaquo;
      </Text>
    </Pressable>
  );
});

const makeStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Palette.card,
      borderRadius: Radius.lg,
      marginHorizontal: Spacing.screenPadding,
      marginBottom: Spacing.cardGap,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
    },
    cardPressed: {
      backgroundColor: Palette.cardPressed,
    },
    main: { flex: 1, gap: 2 },
    title: { fontSize: 17, fontWeight: '600', color: Palette.textPrimary },
    subtitle: { fontSize: 13, color: Palette.textSecondary },
    chevron: {
      fontSize: 22,
      lineHeight: 22,
      color: Palette.textTertiary,
      marginLeft: Spacing.lg,
    },
  });
