import { NativeModules } from 'react-native';

import { ScheduleApi } from '@services/api';
import { usePreferencesStore } from '@stores/preferences.store';
import { useScheduleStore } from '@stores/schedule.store';

import { updateWatchSnapshot } from '@services/watch';

import { updateWidgetSnapshot } from './index';

const TASK_NAME = 'WIDGET_REFRESH';

/**
 * Register the background fetch task definition + schedule it.
 * Call once at app startup. Safe to call multiple times.
 *
 * Checks for the native module before importing JS wrappers,
 * so no red-box error is shown on devices without the module
 * (e.g. iPad simulator).
 */
export const registerWidgetBackgroundFetch = async (): Promise<void> => {
  if (!NativeModules.ExpoTaskManager) return;

  const TaskManager = require('expo-task-manager') as typeof import('expo-task-manager');
  const BackgroundFetch =
    require('expo-background-fetch') as typeof import('expo-background-fetch');

  try {
    TaskManager.defineTask(TASK_NAME, async () => {
      try {
        const { defaultGroup } = usePreferencesStore.getState();
        if (!defaultGroup) return BackgroundFetch.BackgroundFetchResult.NoData;

        const week = await ScheduleApi.currentWeek();
        useScheduleStore.getState().setCurrentWeek(week);

        const { GroupsApi } = require('@services/api');
        const data = await GroupsApi.schedule(defaultGroup);
        useScheduleStore.getState().setSchedule(defaultGroup, data);

        await updateWidgetSnapshot();
        await updateWatchSnapshot();

        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch {
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });

    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 2 * 60 * 60,
      stopOnTerminate: false,
      startOnBoot: false,
    });
  } catch {
    // Registration failed — non-critical.
  }
};
