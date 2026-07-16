import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { usePalette } from '@hooks/usePalette';
import { useFireStore, selectFireCore } from '@stores/fire.store';
import { Radius, Spacing } from '@theme';
import { textProps } from '@theme/typography';
import { isFireHot } from '@utils/fire';
import { hapticLight } from '@utils/haptics';

type PaletteType = ReturnType<typeof usePalette>;

const HOT_COLOR = '#F08A24';

export const StreakBadge = () => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const core = useFireStore(selectFireCore);
  const hot = useMemo(() => isFireHot(core), [core]);
  const styles = useMemo(() => makeStyles(Palette, hot), [Palette, hot]);

  const iconName = hot ? 'flame' : 'flame-outline';
  const iconColor = hot ? HOT_COLOR : Palette.textTertiary;
  const textColor = hot ? HOT_COLOR : Palette.textSecondary;

  const handlePress = () => {
    void hapticLight();
    const lines: string[] = [
      t('diary.streakCurrent', { n: core.current }),
      t('diary.streakLongest', { n: core.longest }),
      '',
      t('diary.streakRules'),
    ];
    Alert.alert(t('diary.streakTitle'), lines.join('\n'), [
      { text: t('common.done'), style: 'default' },
    ]);
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={6}
      style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
      accessibilityRole="button"
      accessibilityLabel={t('diary.streakA11y', { n: core.current })}
    >
      <Ionicons name={iconName as never} size={14} color={iconColor} />
      <Text {...textProps('footnote')} style={[styles.number, { color: textColor }]}>
        {core.current}
      </Text>
    </Pressable>
  );
};

const makeStyles = (Palette: PaletteType, hot: boolean) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: Spacing.md,
      paddingVertical: 4,
      borderRadius: Radius.pill,
      backgroundColor: hot ? HOT_COLOR + '1F' : Palette.card,
    },
    pillPressed: {
      opacity: 0.7,
    },
    number: {
      fontSize: 13,
      fontWeight: '700',
    },
  });
