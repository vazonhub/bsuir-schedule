import type { AccessibilityRole } from 'react-native';

/**
 * Joins non-empty parts into a single accessibility label.
 *
 * @example buildLabel('Лекция', 'Математика', null, '08:00–09:35') → "Лекция, Математика, 08:00–09:35"
 */
export function buildLabel(...parts: (string | null | undefined | false | 0)[]): string {
  return parts.filter(Boolean).join(', ');
}

/** Shorthand for button-like a11y props. */
export function buttonA11y(label: string, hint?: string) {
  return {
    accessibilityRole: 'button' as AccessibilityRole,
    accessibilityLabel: label,
    ...(hint ? { accessibilityHint: hint } : undefined),
  };
}

/** Shorthand for header a11y props. */
export function headerA11y(label: string) {
  return {
    accessibilityRole: 'header' as AccessibilityRole,
    accessibilityLabel: label,
  };
}

/**
 * Maps hex colours from COLOR_PALETTE to human-readable i18n keys.
 * Falls back to the raw hex value if the colour is unknown.
 */
const COLOR_NAMES: Record<string, string> = {
  '#ff3b30': 'color.red',
  '#ff6961': 'color.lightRed',
  '#ff2d55': 'color.magenta',
  '#e91e63': 'color.pink',
  '#ff9500': 'color.orange',
  '#f08a24': 'color.amber',
  '#ffcc00': 'color.yellow',
  '#a2845e': 'color.brown',
  '#34c759': 'color.green',
  '#3fb36f': 'color.emerald',
  '#00c7be': 'color.teal',
  '#009688': 'color.cyan',
  '#32ade6': 'color.lightBlue',
  '#0a84ff': 'color.blue',
  '#5856d6': 'color.indigo',
  '#8e5cd9': 'color.purple',
  '#af52de': 'color.violet',
  '#9c27b0': 'color.darkPurple',
  '#6e6e73': 'color.gray',
  '#1c1c1e': 'color.black',
};

/** Returns the i18n key for a colour hex, or the hex itself. */
export function getColorNameKey(hex: string): string {
  return COLOR_NAMES[hex.toLowerCase()] ?? hex;
}

/**
 * Relative luminance of a hex colour (sRGB).
 * Used to decide whether text/icons on top should be dark or light.
 */
export function luminance(hex: string): number {
  const raw = hex.replace('#', '');
  const r = parseInt(raw.substring(0, 2), 16) / 255;
  const g = parseInt(raw.substring(2, 4), 16) / 255;
  const b = parseInt(raw.substring(4, 6), 16) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}
