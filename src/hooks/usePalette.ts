import { useIncreasedContrast } from '@hooks/useAccessibility';
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
 */
export const usePalette = () => {
  const resolved = usePreferencesStore((s) => s.resolvedScheme);
  const highContrast = useIncreasedContrast();
  if (resolved === 'dark') return highContrast ? PaletteDarkHighContrast : PaletteDark;
  return highContrast ? PaletteHighContrast : PaletteLight;
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
