import { useColorScheme } from 'react-native';

import { usePreferencesStore } from '@stores/preferences.store';
import { Palette as PaletteLight, PaletteDark } from '@theme/colors';

/**
 * Returns the active palette based on user theme preference and system scheme.
 *
 * - `'auto'` → follows system `useColorScheme()`.
 * - `'light'` / `'dark'` → forced.
 */
export const usePalette = () => {
  const themeChoice = usePreferencesStore((s) => s.theme);
  const systemScheme = useColorScheme();

  const isDark =
    themeChoice === 'dark' || (themeChoice === 'auto' && systemScheme === 'dark');

  return isDark ? PaletteDark : PaletteLight;
};

/** Returns `true` if the current resolved theme is dark. */
export const useIsDark = (): boolean => {
  const themeChoice = usePreferencesStore((s) => s.theme);
  const systemScheme = useColorScheme();
  return themeChoice === 'dark' || (themeChoice === 'auto' && systemScheme === 'dark');
};

/** Glass tint colors that adapt to light/dark. */
export const useGlassTint = () => {
  const isDark = useIsDark();
  return isDark
    ? { tint: 'rgba(255,255,255,0.08)', webBg: 'rgba(30,30,30,0.92)' }
    : { tint: 'rgba(255,255,255,0.55)', webBg: 'rgba(255,255,255,0.92)' };
};
