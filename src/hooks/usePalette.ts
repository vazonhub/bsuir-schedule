import { usePreferencesStore } from '@stores/preferences.store';
import { Palette as PaletteLight, PaletteDark } from '@theme/colors';

/**
 * Returns the active palette based on the resolved scheme stored in
 * PreferencesStore.  Does NOT use `useColorScheme()` — the resolved scheme
 * is computed synchronously in setTheme() / onRehydrate so the palette and
 * native UIUserInterfaceStyle stay in lock-step.
 */
export const usePalette = () => {
  const resolved = usePreferencesStore((s) => s.resolvedScheme);
  return resolved === 'dark' ? PaletteDark : PaletteLight;
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
