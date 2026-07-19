import { useEffect, useRef } from 'react';
import type { View } from 'react-native';

import { useTutorial } from './TutorialContext';
import type { TargetRect } from './TutorialContext';
import type { TutorialTargetKey } from './steps';

/**
 * Registers a native `View` as a tutorial target under the key `key`.
 * Returns a ref that should be attached to the highlighted element.
 *
 * `enabled` allows registering only the needed instance (e.g. the first
 * visible subject card) without breaking the rules of hooks.
 */
export const useTutorialTarget = (key: TutorialTargetKey, enabled = true) => {
  const { registerTarget, unregisterTarget } = useTutorial();
  const ref = useRef<View>(null);

  useEffect(() => {
    if (!enabled) return;

    const measure = (): Promise<TargetRect | null> =>
      new Promise((resolve) => {
        const node = ref.current;
        if (!node) {
          resolve(null);
          return;
        }
        node.measureInWindow((x, y, width, height) => {
          if (!width && !height) {
            resolve(null);
            return;
          }
          resolve({ x, y, width, height });
        });
      });

    registerTarget(key, { measure });
    return () => unregisterTarget(key);
  }, [key, enabled, registerTarget, unregisterTarget]);

  return ref;
};
