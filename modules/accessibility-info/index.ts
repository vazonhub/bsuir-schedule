import { Platform } from 'react-native';
import type { EventSubscription } from 'expo-modules-core';

import AccessibilityExtras from './src/AccessibilityInfoModule';

type DWCEvent = { enabled: boolean };

/**
 * Returns the current value of iOS "Differentiate Without Color" setting.
 * Returns `false` on Android or when the native module is unavailable.
 */
export function shouldDifferentiateWithoutColor(): boolean {
  if (Platform.OS !== 'ios' || !AccessibilityExtras) return false;
  try {
    return AccessibilityExtras.shouldDifferentiateWithoutColor() as boolean;
  } catch {
    return false;
  }
}

/**
 * Subscribes to changes of the iOS "Differentiate Without Color" setting.
 */
export function addDifferentiateWithoutColorListener(
  callback: (event: DWCEvent) => void,
): EventSubscription | null {
  if (Platform.OS !== 'ios' || !AccessibilityExtras) return null;
  try {
    const mod = AccessibilityExtras as {
      addListener(name: string, cb: (event: DWCEvent) => void): EventSubscription;
    };
    return mod.addListener('onDifferentiateWithoutColorChanged', callback);
  } catch {
    return null;
  }
}
