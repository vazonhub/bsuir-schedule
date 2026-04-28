import { Platform } from 'react-native';

/**
 * Native bottom-tab-bar visual height (без safe-area).
 *
 * `expo-router/unstable-native-tabs` не пробрасывает `BottomTabBarHeightContext`,
 * а нативный `UITabBarController` не всегда добавляет высоту таббара в
 * `useSafeAreaInsets().bottom` (там обычно только home-indicator). Поэтому
 * для скроллируемых экранов внутри табов мы добавляем эту константу к
 * `insets.bottom`, чтобы последний элемент не прятался под таббар.
 */
export const TAB_BAR_HEIGHT = Platform.select({ ios: 49, android: 80, default: 49 });

/**
 * Spacing scale (pt). Use these tokens instead of raw numbers in styles so
 * the rhythm stays consistent across the app.
 *
 * Per dialled-in design:
 * - `screenPadding` (12) — distance from cards to screen edges.
 * - `cardGap` (6)        — vertical gap between sibling cards.
 * - `sectionTop` (16)    — gap above a section header.
 * - `sectionBottom` (8)  — gap below a section header (header → first card).
 */
export const Spacing = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  xxxl: 24,

  screenPadding: 12,
  cardGap: 6,
  sectionTop: 16,
  sectionBottom: 8,
  cardPaddingX: 16,
  cardPaddingY: 14,
} as const;

export type SpacingToken = keyof typeof Spacing;
