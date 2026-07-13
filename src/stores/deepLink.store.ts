import { create } from 'zustand';

interface DeepLinkState {
  /**
   * Block id of a lesson to auto-open once the default group's schedule is
   * mounted. Set when the app is launched (or resumed) via
   * `bsuirtime://lesson?id=<blockId>` — the URL that accessory widgets emit
   * via `.widgetURL` on the Lock Screen.
   *
   * `ScheduleView` consumes this in default-schedule mode: finds the lesson,
   * opens the details sheet + scrolls to it, and clears the field.
   */
  pendingLessonBlockId: string | null;
  setPendingLessonBlockId: (id: string | null) => void;
}

export const useDeepLinkStore = create<DeepLinkState>((set) => ({
  pendingLessonBlockId: null,
  setPendingLessonBlockId: (id) => set({ pendingLessonBlockId: id }),
}));
