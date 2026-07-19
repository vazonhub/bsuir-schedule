import { useCallback, useRef, useMemo } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useReduceMotion } from '@hooks/useAccessibility';
import { usePalette } from '@hooks/usePalette';
import { Spacing } from '@theme';
import { COLOR_PALETTE } from '@constants/colorPalettes';
import { getColorNameKey, luminance } from '@utils/a11y';

interface Props {
  selected: string;
  /** The default/original color — tapping the currently selected swatch resets to this. */
  defaultColor?: string;
  onSelect(color: string): void;
}

const SWATCH_SIZE = 32;
const SWATCH_GAP = 10;

const Swatch = ({
  color,
  isSelected,
  onPress,
  label,
}: {
  color: string;
  isSelected: boolean;
  onPress(): void;
  label: string;
}) => {
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const checkColor = luminance(color) > 0.4 ? '#000000' : '#FFFFFF';

  const handlePress = useCallback(() => {
    if (!reduceMotion) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
    }
    onPress();
  }, [onPress, scale, reduceMotion]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={handlePress}
        style={[styles.swatch, { backgroundColor: color }, isSelected && styles.swatchSelected]}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: isSelected }}
      >
        {isSelected && <Ionicons name="checkmark" size={18} color={checkColor} />}
      </Pressable>
    </Animated.View>
  );
};

export const ColorPalettePicker = ({ selected, defaultColor, onSelect }: Props) => {
  const { t } = useTranslation();
  const Palette = usePalette();
  void Palette; // used for future theming

  const handleSwatchPress = useCallback(
    (color: string) => {
      const isSelected = color.toLowerCase() === selected.toLowerCase();
      if (isSelected && defaultColor) {
        onSelect(defaultColor);
      } else {
        onSelect(color);
      }
    },
    [selected, defaultColor, onSelect],
  );

  const normalizedSelected = useMemo(() => selected.toLowerCase(), [selected]);

  return (
    <View style={styles.grid}>
      {COLOR_PALETTE.map((color: string) => (
        <Swatch
          key={color}
          color={color}
          isSelected={color.toLowerCase() === normalizedSelected}
          onPress={() => handleSwatchPress(color)}
          label={t('a11y.colorSwatch', { name: t(getColorNameKey(color)) })}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SWATCH_GAP,
    paddingVertical: Spacing.sm,
  },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: SWATCH_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
