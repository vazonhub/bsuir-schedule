/**
 * Конфигурация пошаговой обучалки на вкладке «Дневник».
 * Порядок — «сверху вниз» по экрану (см. DIARY_ONBOARDING_PLAN.md §1).
 */

/** Ключи подсвечиваемых целей. `null`-цель = шаг по центру без подсветки. */
export type TutorialTargetKey =
  | 'streak'
  | 'planner'
  | 'upcoming'
  | 'subjectCard'
  | 'enterCount'
  | 'completeTask'
  | 'hideSubject';

export interface TutorialStep {
  /** Уникальный ключ шага. */
  key: string;
  /** Что подсвечиваем. `null` — приветственный шаг по центру, без подсветки. */
  target: TutorialTargetKey | null;
  /**
   * Запасная цель, если основная не зарегистрирована/не измерилась
   * (напр. на карточке нет сетки заданий — падаем на всю карточку).
   */
  fallbackTarget?: TutorialTargetKey;
  /** i18n-ключ заголовка подсказки. */
  titleKey: string;
  /** i18n-ключ тела подсказки. */
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
