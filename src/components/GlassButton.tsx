import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { useGlassTint, useIsDark, usePalette } from '@hooks/usePalette';
import { Radius } from '@theme';

type PaletteType = ReturnType<typeof usePalette>;

interface Props {
  children: ReactNode;
  onPress?(): void;
  /** Diameter for icon-only buttons; ignored when `children` is wider. */
  size?: number;
  /** Optional fixed height (e.g. for pill-shaped buttons with text). */
  height?: number;
  /** Round (`pill`) or rounded-rect (`Radius.lg`). */
  shape?: 'pill' | 'rect';
  accessibilityLabel?: string;
  /** When true the button is rendered with a stronger fill — use for the
   * primary "active" state of toggle controls (e.g. pinned). */
  active?: boolean;
  /** Override tint colour when active (default: `Palette.accent`). */
  activeColor?: string;
  /** Дополнительные стили обёртки — например, чтобы разрешить flex-shrink
   * у шрифта-лейбла внутри топ-бара. */
  style?: StyleProp<ViewStyle>;
}

/**
 * Floating "Liquid Glass" button. Uses native blur on iOS / experimental
 * dimezis blur on Android; falls back to translucent fill on web. Designed
 * for use over scrolling content (back, pin, subgroup picker, etc.).
 */
export const GlassButton = ({
  children,
  onPress,
  size = 38,
  height,
  shape = 'pill',
  accessibilityLabel,
  active = false,
  activeColor,
  style: styleProp,
}: Props) => {
  const Palette = usePalette();
  const isDark = useIsDark();
  const glassTint = useGlassTint();
  const styles = useMemo(() => makeStyles(Palette, glassTint.tint), [Palette, glassTint.tint]);
  const radius = shape === 'pill' ? 999 : Radius.lg;
  const heightPx = height ?? size;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.wrap,
        { minWidth: size, height: heightPx, borderRadius: radius },
        styleProp,
        pressed && onPress && styles.pressed,
      ]}
    >
      {Platform.OS === 'web' ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: glassTint.webBg }]} />
      ) : (
        <BlurView
          intensity={active ? 90 : 70}
          tint={isDark ? (active ? 'systemThickMaterialDark' : 'systemThinMaterialDark') : (active ? 'systemThickMaterial' : 'systemThinMaterial')}
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
      )}
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.tint,
          active && (activeColor ? { backgroundColor: activeColor + '33' } : styles.tintActive),
        ]}
      />
      <View style={styles.content}>{children}</View>
    </Pressable>
  );
};

const makeStyles = (Palette: PaletteType, tintBg: string) => StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  pressed: { opacity: 0.7 },
  tint: { backgroundColor: tintBg },
  tintActive: { backgroundColor: Palette.accent + '33' },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
