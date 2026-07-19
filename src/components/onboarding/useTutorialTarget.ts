import { useEffect, useRef } from 'react';
import type { View } from 'react-native';

import { useTutorial } from './TutorialContext';
import type { TargetRect } from './TutorialContext';
import type { TutorialTargetKey } from './steps';

/**
 * Регистрирует нативный `View` как цель обучалки под ключом `key`.
 * Возвращает ref, который нужно повесить на подсвечиваемый элемент.
 *
 * `enabled` позволяет регистрировать только нужный экземпляр (например,
 * первую видимую карточку предмета), не нарушая правил хуков.
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
