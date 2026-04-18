import { Platform } from 'react-native';

import type { SubgroupChoice } from '@stores/preferences.store';
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
 * Tell WidgetKit to reload all timelines so the widget picks up fresh data.
 */
const reloadWidgetTimelines = (): void => {
  if (Platform.OS !== 'ios') return;
  try {
    const { NativeModules } = require('react-native');
    // If we have a native bridge module for WidgetKit, call it.
    // Otherwise this is a no-op — WidgetKit will pick up changes on next timeline refresh.
    NativeModules.WidgetKitBridge?.reloadAllTimelines?.();
  } catch {
    // Not critical.
  }
};

/**
 * Rebuild and persist the widget snapshot from current store state.
 * Called after every successful schedule load for the default group,
 * on preference changes (subgroup, theme, locale), and by background fetch.
 */
export const updateWidgetSnapshot = async (): Promise<void> => {
  const { defaultGroup, subgroupByKey } = usePreferencesStore.getState();
  if (!defaultGroup) return;

  const { byKey, currentWeek } = useScheduleStore.getState();
  const schedule = byKey[defaultGroup];
  if (!schedule || !currentWeek) return;

  const subgroup: SubgroupChoice = subgroupByKey[defaultGroup] ?? 0;
  const snapshot = buildWidgetSnapshot(schedule, currentWeek, new Date(), defaultGroup, subgroup);
  await writeSnapshot(snapshot);
  reloadWidgetTimelines();
};

// ─── Auto-update on preference changes ───────────────────────

let _prev = {
  defaultGroup: usePreferencesStore.getState().defaultGroup,
  subgroupByKey: usePreferencesStore.getState().subgroupByKey,
  theme: usePreferencesStore.getState().theme,
  language: usePreferencesStore.getState().language,
};

usePreferencesStore.subscribe((state) => {
  const defaultGroup = state.defaultGroup;
  const subgroupForDefault = defaultGroup ? state.subgroupByKey[defaultGroup] : undefined;
  const prevSubgroupForDefault = _prev.defaultGroup ? _prev.subgroupByKey[_prev.defaultGroup] : undefined;

  const changed =
    defaultGroup !== _prev.defaultGroup ||
    subgroupForDefault !== prevSubgroupForDefault ||
    state.theme !== _prev.theme ||
    state.language !== _prev.language;

  if (changed) {
    _prev = {
      defaultGroup: state.defaultGroup,
      subgroupByKey: state.subgroupByKey,
      theme: state.theme,
      language: state.language,
    };
    void updateWidgetSnapshot();
  }
});

export type { WidgetSnapshot, WidgetLesson, WidgetDayBlock } from './widgetData';
export { buildWidgetSnapshot } from './widgetData';
