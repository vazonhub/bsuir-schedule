import { Platform } from 'react-native';

import { usePreferencesStore } from '@stores/preferences.store';
import { useScheduleStore } from '@stores/schedule.store';

import { buildWidgetSnapshot } from './widgetData';
import type { WidgetSnapshot } from './widgetData';

const APP_GROUP = 'group.by.vazon.bsuirschedule';
const WIDGET_KEY = 'widgetSnapshot';

/**
 * Write a widget snapshot to shared storage so native widget code can read it.
 * Uses react-native-shared-group-preferences for App Group UserDefaults on iOS.
 */
const writeSnapshot = async (snapshot: WidgetSnapshot): Promise<void> => {
  if (Platform.OS !== 'ios') return;
  try {
    const SharedGroupPreferences = require('react-native-shared-group-preferences').default;
    await SharedGroupPreferences.setItem(WIDGET_KEY, snapshot, APP_GROUP);
  } catch {
    // Native module not available or write failed — non-critical.
  }
};

/**
 * Rebuild and persist the widget snapshot from current store state.
 * Called after every successful schedule load for the default group,
 * and periodically by background fetch.
 */
export const updateWidgetSnapshot = async (): Promise<void> => {
  const { defaultGroup } = usePreferencesStore.getState();
  if (!defaultGroup) return;

  const { byKey, currentWeek } = useScheduleStore.getState();
  const schedule = byKey[defaultGroup];
  if (!schedule || !currentWeek) return;

  const snapshot = buildWidgetSnapshot(schedule, currentWeek, new Date(), defaultGroup);
  await writeSnapshot(snapshot);
};

// Re-build widget snapshot whenever the default group changes.
let _prevDefaultGroup = usePreferencesStore.getState().defaultGroup;
usePreferencesStore.subscribe((state) => {
  if (state.defaultGroup !== _prevDefaultGroup) {
    _prevDefaultGroup = state.defaultGroup;
    void updateWidgetSnapshot();
  }
});

export type { WidgetSnapshot, WidgetLesson } from './widgetData';
export { buildWidgetSnapshot } from './widgetData';
