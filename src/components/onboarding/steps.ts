/**
 * Configuration of the step-by-step tutorial on the Diary tab.
 * Order is "top to bottom" along the screen (see DIARY_ONBOARDING_PLAN.md §1).
 */

/** Keys of the highlighted targets. A `null` target = centered step with no spotlight. */
export type TutorialTargetKey =
  | 'streak'
  | 'planner'
  | 'upcoming'
  | 'subjectCard'
  | 'enterCount'
  | 'completeTask'
  | 'hideSubject';

export interface TutorialStep {
  /** Unique step key. */
  key: string;
  /** What we highlight. `null` — a centered welcome step, no spotlight. */
  target: TutorialTargetKey | null;
  /**
   * Fallback target when the primary one is not registered/could not be measured
   * (e.g. the card has no task grid — fall back to the whole card).
   */
  fallbackTarget?: TutorialTargetKey;
  /** i18n key of the tooltip title. */
  titleKey: string;
  /** i18n key of the tooltip body. */
  bodyKey: string;
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    key: 'welcome',
    target: null,
    titleKey: 'onboarding.welcomeTitle',
    bodyKey: 'onboarding.welcomeBody',
  },
  {
    key: 'streak',
    target: 'streak',
    titleKey: 'onboarding.streakTitle',
    bodyKey: 'onboarding.streakBody',
  },
  {
    key: 'planner',
    target: 'planner',
    titleKey: 'onboarding.plannerTitle',
    bodyKey: 'onboarding.plannerBody',
  },
  {
    key: 'upcoming',
    target: 'upcoming',
    titleKey: 'onboarding.upcomingTitle',
    bodyKey: 'onboarding.upcomingBody',
  },
  {
    key: 'subjectCard',
    target: 'subjectCard',
    titleKey: 'onboarding.subjectCardTitle',
    bodyKey: 'onboarding.subjectCardBody',
  },
  {
    key: 'enterCount',
    target: 'enterCount',
    fallbackTarget: 'subjectCard',
    titleKey: 'onboarding.enterCountTitle',
    bodyKey: 'onboarding.enterCountBody',
  },
  {
    key: 'completeTask',
    target: 'completeTask',
    fallbackTarget: 'subjectCard',
    titleKey: 'onboarding.completeTaskTitle',
    bodyKey: 'onboarding.completeTaskBody',
  },
  {
    key: 'hideSubject',
    target: 'hideSubject',
    fallbackTarget: 'subjectCard',
    titleKey: 'onboarding.hideSubjectTitle',
    bodyKey: 'onboarding.hideSubjectBody',
  },
] as const;

export const TUTORIAL_STEP_COUNT = TUTORIAL_STEPS.length;
