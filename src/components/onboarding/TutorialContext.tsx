import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { TUTORIAL_STEPS } from './steps';
import type { TutorialStep, TutorialTargetKey } from './steps';

/** Target rect in window coordinates. */
export interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Handle of a registered target — can measure itself in the window. */
export interface TargetHandle {
  /** Returns the target rect, or `null` if it is not mounted/visible yet. */
  measure: () => Promise<TargetRect | null>;
}

/** Scroll the list so the target enters the viewport. */
export type TutorialScroller = (rect: TargetRect) => Promise<void>;

interface TutorialContextValue {
  active: boolean;
  stepIndex: number;
  steps: readonly TutorialStep[];
  currentStep: TutorialStep | null;
  start: () => void;
  next: () => void;
  skip: () => void;
  finish: () => void;
  registerTarget: (key: TutorialTargetKey, handle: TargetHandle) => void;
  unregisterTarget: (key: TutorialTargetKey) => void;
  getTarget: (key: TutorialTargetKey) => TargetHandle | undefined;
  setScroller: (fn: TutorialScroller | null) => void;
  getScroller: () => TutorialScroller | null;
}

const noop = () => {};

const TutorialContext = createContext<TutorialContextValue>({
  active: false,
  stepIndex: 0,
  steps: TUTORIAL_STEPS,
  currentStep: null,
  start: noop,
  next: noop,
  skip: noop,
  finish: noop,
  registerTarget: noop,
  unregisterTarget: noop,
  getTarget: () => undefined,
  setScroller: noop,
  getScroller: () => null,
});

interface TutorialProviderProps {
  children: ReactNode;
  /** Called when the tutorial is finished or skipped (mark it as seen). */
  onFinish?: () => void;
}

export const TutorialProvider = ({ children, onFinish }: TutorialProviderProps) => {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Keep the target registry and scroller in refs — changing them must not re-render the tree.
  const targetsRef = useRef<Map<TutorialTargetKey, TargetHandle>>(new Map());
  const scrollerRef = useRef<TutorialScroller | null>(null);

  const start = useCallback(() => {
    setStepIndex(0);
    setActive(true);
  }, []);

  const close = useCallback(() => {
    setActive(false);
    setStepIndex(0);
    onFinish?.();
  }, [onFinish]);

  const next = useCallback(() => {
    if (stepIndex >= TUTORIAL_STEPS.length - 1) {
      close();
    } else {
      setStepIndex((i) => i + 1);
    }
  }, [stepIndex, close]);

  const skip = useCallback(() => {
    close();
  }, [close]);

  const finish = useCallback(() => {
    close();
  }, [close]);

  const registerTarget = useCallback((key: TutorialTargetKey, handle: TargetHandle) => {
    targetsRef.current.set(key, handle);
  }, []);

  const unregisterTarget = useCallback((key: TutorialTargetKey) => {
    targetsRef.current.delete(key);
  }, []);

  const getTarget = useCallback((key: TutorialTargetKey) => targetsRef.current.get(key), []);

  const setScroller = useCallback((fn: TutorialScroller | null) => {
    scrollerRef.current = fn;
  }, []);

  const getScroller = useCallback(() => scrollerRef.current, []);

  const value = useMemo<TutorialContextValue>(
    () => ({
      active,
      stepIndex,
      steps: TUTORIAL_STEPS,
      currentStep: active ? (TUTORIAL_STEPS[stepIndex] ?? null) : null,
      start,
      next,
      skip,
      finish,
      registerTarget,
      unregisterTarget,
      getTarget,
      setScroller,
      getScroller,
    }),
    [
      active,
      stepIndex,
      start,
      next,
      skip,
      finish,
      registerTarget,
      unregisterTarget,
      getTarget,
      setScroller,
      getScroller,
    ],
  );

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
};

export const useTutorial = (): TutorialContextValue => useContext(TutorialContext);
