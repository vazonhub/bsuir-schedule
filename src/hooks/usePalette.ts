import { useMemo } from 'react';

import { useAccessibility, useIncreasedContrast } from '@hooks/useAccessibility';
import { usePreferencesStore } from '@stores/preferences.store';
import {
  Palette as PaletteLight,
  PaletteDark,
  PaletteHighContrast,
  PaletteDarkHighContrast,
} from '@theme/colors';

/**
 * Returns the active palette based on the resolved scheme stored in
 * PreferencesStore.  Does NOT use `useColorScheme()` — the resolved scheme
 * is computed synchronously in setTheme() / onRehydrate so the palette and
 * native UIUserInterfaceStyle stay in lock-step.
 *
 * When the system "Increase Contrast" (iOS Darken Colors) setting is
 * enabled, returns high-contrast palette variants instead.
 *
 * Also depends on `fontScale` and `isBoldTextEnabled` from accessibility
 * settings. When these change (user switches Dynamic Type or Bold Text in
 * system settings), a new object reference is returned, forcing all
 * `useMemo(() => makeStyles(Palette), [Palette])` to recalculate styles
 * and re-render text with correct metrics.
 */
export const usePalette = () => {
  const resolved = usePreferencesStore((s) => s.resolvedScheme);
  const highContrast = useIncreasedContrast();
  const { fontScale, isBoldTextEnabled } = useAccessibility();

  return useMemo(() => {
    const base =
      resolved === 'dark'
        ? highContrast
          ? PaletteDarkHighContrast
          : PaletteDark
        : highContrast
          ? PaletteHighContrast
          : PaletteLight;
    // Spread creates a new object reference so downstream useMemo deps fire.
    return { ...base };
    // fontScale/isBoldTextEnabled are intentionally in deps: a change of a11y settings must
    // produce a new palette reference so makeStyles memoizations recalculate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved, highContrast, fontScale, isBoldTextEnabled]);
};

/** Returns `true` if the current resolved theme is dark. */
export const useIsDark = (): boolean => {
  return usePreferencesStore((s) => s.resolvedScheme) === 'dark';
};

/** Glass tint colors that adapt to light/dark. */
export const useGlassTint = () => {
  const isDark = useIsDark();
  return isDark
    ? { tint: 'rgba(255,255,255,0.08)', webBg: 'rgba(30,30,30,0.92)' }
    : { tint: 'rgba(255,255,255,0.55)', webBg: 'rgba(255,255,255,0.92)' };
};
