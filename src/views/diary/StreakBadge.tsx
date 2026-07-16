import { useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FlameIcon } from '@components/fire/FlameIcon';
import { usePalette } from '@hooks/usePalette';
import { selectFireCurrent, useFireStore } from '@stores/fire.store';
import { Radius, Spacing } from '@theme';
import { textProps } from '@theme/typography';
import { getFlameColor } from '@utils/fire';
import { hapticLight } from '@utils/haptics';

import { FireSheet } from '@views/fire/FireSheet';
import type { FireSheetRef } from '@views/fire/FireSheet';

type PaletteType = ReturnType<typeof usePalette>;

export const StreakBadge = () => {
  const { t } = useTranslation();
  const Palette = usePalette();
  const current = useFireStore(selectFireCurrent);
  const hot = current > 0;
  const flameColor = getFlameColor(current);
  const styles = useMemo(() => makeStyles(Palette, hot, flameColor), [Palette, hot, flameColor]);
  const sheetRef = useRef<FireSheetRef>(null);

  const handlePress = () => {
    void hapticLight();
    sheetRef.current?.present();
  };

  const textColor = hot ? flameColor : Palette.textSecondary;

  return (
    <>
      <Pressable
        onPress={handlePress}
        hitSlop={6}
        style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
        accessibilityRole="button"
        accessibilityLabel={t('fire.a11y', { n: current })}
      >
        <FlameIcon current={current} size={14} />
        <Text {...textProps('footnote')} style={[styles.number, { color: textColor }]}>
          {current}
        </Text>
      </Pressable>
      <FireSheet ref={sheetRef} />
    </>
  );
};

const makeStyles = (Palette: PaletteType, hot: boolean, flameColor: string) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: Spacing.md,
      paddingVertical: 4,
      borderRadius: Radius.pill,
      backgroundColor: hot ? flameColor + '1F' : Palette.card,
    },
    pillPressed: {
      opacity: 0.7,
    },
    number: {
      fontSize: 13,
      fontWeight: '700',
    },
  });
