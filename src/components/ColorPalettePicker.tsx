import { useCallback, useRef, useMemo } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { usePalette } from '@hooks/usePalette';
import { Spacing } from '@theme';
import { COLOR_PALETTE } from '@constants/colorPalettes';

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
}: {
  color: string;
  isSelected: boolean;
  onPress(): void;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onPress();
  }, [onPress, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={handlePress}
        style={[
          styles.swatch,
          { backgroundColor: color },
          isSelected && styles.swatchSelected,
        ]}
      >
        {isSelected && (
          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
        )}
      </Pressable>
    </Animated.View>
  );
};

export const ColorPalettePicker = ({ selected, defaultColor, onSelect }: Props) => {
  const Palette = usePalette();
  void Palette; // used for future theming

  const handleSwatchPress = useCallback(
    (color: string) => {
      const isSelected = color.toLowerCase() === selected.toLowerCase();
      if (isSelected && defaultColor) {
        // Tapping already-selected swatch → reset to default
        onSelect(defaultColor);
      } else {
        onSelect(color);
      }
    },
    [selected, defaultColor, onSelect],
  );

  // Memoize the selected check outside map for stable identity
  const normalizedSelected = useMemo(() => selected.toLowerCase(), [selected]);

  return (
    <View style={styles.grid}>
      {COLOR_PALETTE.map((color: string) => (
        <Swatch
          key={color}
          color={color}
          isSelected={color.toLowerCase() === normalizedSelected}
          onPress={() => handleSwatchPress(color)}
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
