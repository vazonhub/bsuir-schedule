import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, PixelRatio, Platform } from 'react-native';
import {
  shouldDifferentiateWithoutColor,
  addDifferentiateWithoutColorListener,
} from '../../modules/accessibility-info';
import { usePreferencesStore } from '@stores/preferences.store';

interface AccessibilitySettings {
  isScreenReaderEnabled: boolean;
  isReduceMotionEnabled: boolean;
  isBoldTextEnabled: boolean;
  isDarkerSystemColorsEnabled: boolean;
  /** Font scale from system Dynamic Type settings (1.0 = default). */
  fontScale: number;
  /** True when the user has enabled "Differentiate Without Color" (iOS). */
  isDifferentiateWithoutColorEnabled: boolean;
}

const defaults: AccessibilitySettings = {
  isScreenReaderEnabled: false,
  isReduceMotionEnabled: false,
  isBoldTextEnabled: false,
  isDarkerSystemColorsEnabled: false,
  fontScale: 1.0,
  isDifferentiateWithoutColorEnabled: false,
};

/**
 * Subscribes to all relevant AccessibilityInfo events and returns their
 * current values.  Listeners are shared across all hook consumers via a
 * module-level singleton so the native bridge is only polled once.
 */
export function useAccessibility(): AccessibilitySettings {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    ...defaults,
    fontScale: PixelRatio.getFontScale(),
  });

  useEffect(() => {
    // Query initial values
    AccessibilityInfo.isScreenReaderEnabled().then((v) =>
      setSettings((s) => ({ ...s, isScreenReaderEnabled: v })),
    );
    AccessibilityInfo.isReduceMotionEnabled().then((v) =>
      setSettings((s) => ({ ...s, isReduceMotionEnabled: v })),
    );
    if (Platform.OS === 'ios') {
      AccessibilityInfo.isBoldTextEnabled().then((v) =>
        setSettings((s) => ({ ...s, isBoldTextEnabled: v })),
      );
      AccessibilityInfo.isDarkerSystemColorsEnabled().then((v) =>
        setSettings((s) => ({ ...s, isDarkerSystemColorsEnabled: v })),
      );
      try {
        const dwc = shouldDifferentiateWithoutColor();
        setSettings((s) => ({ ...s, isDifferentiateWithoutColorEnabled: dwc }));
      } catch {
        // Module not available (e.g. Expo Go or Android)
      }
    }

    // Subscribe to changes
    const subs = [
      AccessibilityInfo.addEventListener('screenReaderChanged', (v) =>
        setSettings((s) => ({ ...s, isScreenReaderEnabled: v })),
      ),
      AccessibilityInfo.addEventListener('reduceMotionChanged', (v) =>
        setSettings((s) => ({ ...s, isReduceMotionEnabled: v })),
      ),
      ...(Platform.OS === 'ios'
        ? [
            AccessibilityInfo.addEventListener('boldTextChanged', (v) =>
              setSettings((s) => ({ ...s, isBoldTextEnabled: v })),
            ),
            AccessibilityInfo.addEventListener('darkerSystemColorsChanged', (v) =>
              setSettings((s) => ({ ...s, isDarkerSystemColorsEnabled: v })),
            ),
          ]
        : []),
    ];

    // Native module listener for differentiateWithoutColor (iOS only)
    const dwcSub = addDifferentiateWithoutColorListener((event) => {
      setSettings((s) => ({ ...s, isDifferentiateWithoutColorEnabled: event.enabled }));
    });

    // Re-read fontScale when app returns from background (user may have
    // changed Dynamic Type in system settings).
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const newScale = PixelRatio.getFontScale();
        setSettings((s) => (s.fontScale === newScale ? s : { ...s, fontScale: newScale }));
      }
    });

    return () => {
      subs.forEach((s) => s.remove());
      dwcSub?.remove();
      appStateSub.remove();
    };
  }, []);

  // Android in-app overrides (these system APIs are iOS-only)
  const androidDwc = usePreferencesStore((s) => s.androidDifferentiateWithoutColor);
  const androidHc = usePreferencesStore((s) => s.androidHighContrast);

  if (Platform.OS === 'android') {
    return {
      ...settings,
      isDifferentiateWithoutColorEnabled: androidDwc,
      isDarkerSystemColorsEnabled: androidHc,
    };
  }

  return settings;
}

/** Convenience: `true` when VoiceOver / TalkBack is active. */
export function useIsScreenReader(): boolean {
  return useAccessibility().isScreenReaderEnabled;
}

/** Convenience: `true` when the system Reduce Motion setting is on. */
export function useReduceMotion(): boolean {
  return useAccessibility().isReduceMotionEnabled;
}

/** Convenience: `true` when iOS "Increase Contrast / Darken Colors" is on. */
export function useIncreasedContrast(): boolean {
  return useAccessibility().isDarkerSystemColorsEnabled;
}
