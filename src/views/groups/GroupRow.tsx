import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { StudentGroupDto } from '@models/dto';
import { Palette, Radius, Spacing } from '@theme';

interface Props {
  group: StudentGroupDto;
  onPress(): void;
}

export const GroupRow = ({ group, onPress }: Props) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    accessibilityRole="button"
    accessibilityLabel={`Группа ${group.name}, ${group.specialityName}, ${group.course} курс`}
  >
    <View style={styles.main}>
      <Text style={styles.title}>{group.name}</Text>
      <Text style={styles.subtitle} numberOfLines={1}>
        {group.facultyAbbrev} · {group.specialityAbbrev} · {group.course} курс
      </Text>
    </View>
    <Text style={styles.chevron}>›</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.cardGap,
    paddingVertical: Spacing.cardPaddingY,
    paddingHorizontal: Spacing.cardPaddingX,
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
