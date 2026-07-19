import { ScheduleController } from '@controllers/schedule.controller';
import { usePreferencesStore } from '@stores/preferences.store';

/**
 * Prefetch pinned schedules in the background.
 *
 * Called on app start and when returning to foreground. Fires all
 * requests in parallel with `Promise.allSettled` — individual failures
 * are silently ignored (stale data stays in cache).
 */
export const prefetchPinned = async (): Promise<void> => {
  const { pinnedGroups, pinnedEmployees, defaultGroup } = usePreferencesStore.getState();

  const tasks: Promise<void>[] = [ScheduleController.loadCurrentWeek()];

  // Default group first (highest priority).
  if (defaultGroup) {
    tasks.push(ScheduleController.loadGroupSchedule(defaultGroup));
  }

  for (const name of pinnedGroups) {
    if (name !== defaultGroup) {
      tasks.push(ScheduleController.loadGroupSchedule(name));
    }
  }
  for (const urlId of pinnedEmployees) {
    tasks.push(ScheduleController.loadEmployeeSchedule(urlId));
  }

  await Promise.allSettled(tasks);
};
