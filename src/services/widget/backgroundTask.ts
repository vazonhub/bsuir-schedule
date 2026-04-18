import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

import { ScheduleApi } from '@services/api';
import { usePreferencesStore } from '@stores/preferences.store';
import { useScheduleStore } from '@stores/schedule.store';

import { updateWidgetSnapshot } from './index';

const TASK_NAME = 'WIDGET_REFRESH';

/**
 * Background fetch task: refreshes current-week + default group schedule,
 * then rebuilds the widget snapshot. Runs approximately every 2 hours
 * (iOS does not guarantee exact intervals).
 */
TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const { defaultGroup } = usePreferencesStore.getState();
    if (!defaultGroup) return BackgroundFetch.BackgroundFetchResult.NoData;

    // Refresh current week
    const week = await ScheduleApi.currentWeek();
    useScheduleStore.getState().setCurrentWeek(week);

    // Refresh schedule for default group
    const { GroupsApi } = require('@services/api');
    const data = await GroupsApi.schedule(defaultGroup);
    useScheduleStore.getState().setSchedule(defaultGroup, data);

    // Rebuild widget snapshot
    await updateWidgetSnapshot();

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register the background fetch task. Call once at app startup.
 * Safe to call multiple times — re-registration is idempotent.
 */
export const registerWidgetBackgroundFetch = async (): Promise<void> => {
  try {
    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 2 * 60 * 60, // 2 hours (iOS may throttle further)
      stopOnTerminate: false,
      startOnBoot: false,
    });
  } catch {
    // Background fetch not available on this device/simulator — non-critical.
  }
};
