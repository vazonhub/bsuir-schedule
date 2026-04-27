/**
 * Semantic text-size presets aligned with the iOS Dynamic Type scale.
 * Each preset carries `maxFontSizeMultiplier` so Dynamic Type scales text
 * to at least 200 % without blowing constrained layouts.
 */

interface TypographyEntry {
  fontSize: number;
  maxFontSizeMultiplier: number;
}

export const Typography = {
  /** 22 pt — screen titles, large headers */
  title: { fontSize: 22, maxFontSizeMultiplier: 2.0 },
  /** 17 pt — primary content */
  headline: { fontSize: 17, maxFontSizeMultiplier: 2.0 },
  /** 16 pt — body text */
  body: { fontSize: 16, maxFontSizeMultiplier: 2.0 },
  /** 15 pt — callout / secondary content */
  callout: { fontSize: 15, maxFontSizeMultiplier: 2.0 },
  /** 14 pt — subheadlines, meta text */
  subhead: { fontSize: 14, maxFontSizeMultiplier: 2.0 },
  /** 13 pt — footnotes, timestamps */
  footnote: { fontSize: 13, maxFontSizeMultiplier: 2.5 },
  /** 12 pt — captions */
  caption: { fontSize: 12, maxFontSizeMultiplier: 2.5 },
  /** 11 pt — micro labels */
  micro: { fontSize: 11, maxFontSizeMultiplier: 1.5 },
  /** 10 pt — tiny decorative labels (break indicators, etc.) */
  tiny: { fontSize: 10, maxFontSizeMultiplier: 1.5 },
} as const satisfies Record<string, TypographyEntry>;

export type TypographyPreset = keyof typeof Typography;

/**
 * Returns spread-ready props for `<Text>` / `<TextInput>`.
 *
 * @example <Text {...textProps('footnote')} style={styles.time}>08:00</Text>
 */
export function textProps(preset: TypographyPreset) {
  return {
    allowFontScaling: true,
    maxFontSizeMultiplier: Typography[preset].maxFontSizeMultiplier,
  };
}

/**
 * Returns spread-ready props for constrained containers (buttons, badges)
 * where text should scale but less aggressively.
 */
export function constrainedTextProps() {
  return {
    allowFontScaling: true,
    maxFontSizeMultiplier: 1.5,
  };
}
