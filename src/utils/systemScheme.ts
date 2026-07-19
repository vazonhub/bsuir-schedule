import { Appearance } from 'react-native';

import type { ResolvedScheme } from '@stores/preferences.store';

/**
 * Tracks the real system color scheme independently of any
 * Appearance.setColorScheme() override.
 *
 * Captured at module load time (before any override is applied) and kept
 * up-to-date via Appearance.addChangeListener.
 *
 * NOTE: The listener only fires when Appearance.setColorScheme(null) is
 * active (no override) or when transitioning to/from an override.
 * When a forced override is active, system changes are NOT reported — but
 * that's fine because we only need the value when switching to 'auto'.
 */
let current: ResolvedScheme = (Appearance.getColorScheme() as ResolvedScheme | null) ?? 'light';

Appearance.addChangeListener(({ colorScheme }) => {
  if (colorScheme) {
    current = colorScheme as ResolvedScheme;
  }
});

/** Returns the last known system color scheme (ignoring any override). */
export const getSystemScheme = (): ResolvedScheme => current;
