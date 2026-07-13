import * as A11y from 'expo-accessibility-plus';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, PixelRatio, Platform } from 'react-native';

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
 * Subscribes to all relevant accessibility events and returns their current
 * values.  Cross-platform flags (`screenReader`, `reduceMotion`) come from
 * React Native's `AccessibilityInfo`; iOS-only flags (`boldText`,
 * `darkerSystemColors`, `differentiateWithoutColor`) come from
 * `expo-accessibility-plus`.
 */
export function useAccessibility(): AccessibilitySettings {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    ...defaults,
    fontScale: PixelRatio.getFontScale(),
  });

  useEffect(() => {
    // ── Cross-platform: screenReader + reduceMotion via RN AccessibilityInfo ──
    AccessibilityInfo.isScreenReaderEnabled().then((v) =>
      setSettings((s) => ({ ...s, isScreenReaderEnabled: v })),
    );
    AccessibilityInfo.isReduceMotionEnabled().then((v) =>
      setSettings((s) => ({ ...s, isReduceMotionEnabled: v })),
    );

    const rnSubs = [
      AccessibilityInfo.addEventListener('screenReaderChanged', (v) =>
        setSettings((s) => ({ ...s, isScreenReaderEnabled: v })),
      ),
      AccessibilityInfo.addEventListener('reduceMotionChanged', (v) =>
        setSettings((s) => ({ ...s, isReduceMotionEnabled: v })),
      ),
    ];

    // ── iOS-only: boldText + darkerSystemColors + differentiateWithoutColor ──
    // Batch read via snapshot() — one native round-trip vs three getters.
    if (A11y.isAvailable) {
      const snap = A11y.snapshot();
      setSettings((s) => ({
        ...s,
        isBoldTextEnabled: snap.boldText,
        isDarkerSystemColorsEnabled: snap.darkerSystemColors,
        isDifferentiateWithoutColorEnabled: snap.shouldDifferentiateWithoutColor,
      }));
    }

    const a11ySub = A11y.addChangeListener(({ flag, value }) => {
      if (typeof value !== 'boolean') return;
      switch (flag) {
        case 'boldText':
          setSettings((s) => ({ ...s, isBoldTextEnabled: value }));
          break;
        case 'darkerSystemColors':
          setSettings((s) => ({ ...s, isDarkerSystemColorsEnabled: value }));
          break;
        case 'shouldDifferentiateWithoutColor':
          setSettings((s) => ({ ...s, isDifferentiateWithoutColorEnabled: value }));
          break;
        default:
          break;
      }
    });

    // Re-read fontScale when the app returns from background (the user may
    // have changed Dynamic Type in system settings while backgrounded).
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const newScale = PixelRatio.getFontScale();
        setSettings((s) => (s.fontScale === newScale ? s : { ...s, fontScale: newScale }));
      }
    });

    return () => {
      rnSubs.forEach((s) => s.remove());
      a11ySub.remove();
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
