import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Palette, Radius } from '@theme';

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
  style: styleProp,
}: Props) => {
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
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.7)' }]} />
      ) : (
        <BlurView
          intensity={active ? 90 : 70}
          tint={active ? 'systemThickMaterial' : 'systemThinMaterial'}
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={[StyleSheet.absoluteFill, styles.tint, active && styles.tintActive]} />
      <View style={styles.content}>{children}</View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  pressed: { opacity: 0.7 },
  tint: { backgroundColor: 'rgba(255,255,255,0.18)' },
  tintActive: { backgroundColor: Palette.accent + '33' /* alpha 0x33 ≈ 20% */ },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
