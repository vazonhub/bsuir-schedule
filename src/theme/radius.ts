/**
 * Border-radius scale. `lg` (18) is the canonical value for cards, search
 * field and any other tile-like surface — chosen as part of the design system.
 */
export const Radius = {
  sm: 8,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof Radius;
