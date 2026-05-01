import i18n from 'i18next';
import { Platform } from 'react-native';

import { getMergedHolidays, useHolidaysStore } from '@stores/holidays.store';
import type { SubgroupChoice } from '@stores/preferences.store';
import { usePreferencesStore } from '@stores/preferences.store';
import { useScheduleStore } from '@stores/schedule.store';

import { buildWidgetSnapshot } from './widgetData';
import type { WidgetSnapshot, WidgetStrings } from './widgetData';

const APP_GROUP = 'group.by.vazon.bsuirschedule';
const WIDGET_KEY = 'widgetSnapshot';

const ANDROID_SNAPSHOT_KEY = 'android_widget_snapshot';

/**
 * Write a widget snapshot to shared storage so native widget code can read it.
 * iOS: App Group UserDefaults via react-native-shared-group-preferences.
 * Android: AsyncStorage (read by headless JS widget task handler).
 */
const writeSnapshot = async (snapshot: WidgetSnapshot): Promise<void> => {
  try {
    if (Platform.OS === 'ios') {
      const SharedGroupPreferences = require('react-native-shared-group-preferences').default;
      await SharedGroupPreferences.setItem(WIDGET_KEY, snapshot, APP_GROUP);
    } else if (Platform.OS === 'android') {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(ANDROID_SNAPSHOT_KEY, JSON.stringify(snapshot));
    }
  } catch {
    // Native module not available or write failed — non-critical.
  }
};

/**
 * Tell the native widget system to refresh.
 * iOS: WidgetKit timeline reload.
 * Android: requestWidgetUpdate for all widget sizes.
 */
const reloadWidgetTimelines = (): void => {
  try {
    if (Platform.OS === 'ios') {
      const { NativeModules } = require('react-native');
      NativeModules.WidgetKitBridge?.reloadAllTimelines?.();
    } else if (Platform.OS === 'android') {
      const { requestWidgetUpdate } = require('react-native-android-widget') as typeof import('react-native-android-widget');
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const { ScheduleWidget } = require('../../widgets/ScheduleWidget') as typeof import('../../widgets/ScheduleWidget');
      const React = require('react');

      const render = async (size: 'small' | 'medium' | 'large') => {
        const raw = await AsyncStorage.getItem(ANDROID_SNAPSHOT_KEY);
        const snap = raw ? JSON.parse(raw) : null;
        return React.createElement(ScheduleWidget, { snapshot: snap, size });
      };

      const update = async () => {
        await requestWidgetUpdate({
          widgetName: 'ScheduleSmall',
          renderWidget: () => render('small'),
        });
        await requestWidgetUpdate({
          widgetName: 'ScheduleMedium',
          renderWidget: () => render('medium'),
        });
        await requestWidgetUpdate({
          widgetName: 'ScheduleLarge',
          renderWidget: () => render('large'),
        });
      };
      void update();
    }
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
  const { defaultGroup, subgroupByKey, blockedLessons } = usePreferencesStore.getState();
  if (!defaultGroup) return;

  const { byKey, currentWeek } = useScheduleStore.getState();
  const schedule = byKey[defaultGroup];
  if (!schedule || !currentWeek) return;

  const subgroup: SubgroupChoice = subgroupByKey[defaultGroup] ?? 0;
  const blockedIds = new Set(blockedLessons[defaultGroup] ?? []);

  const t = i18n.t;
  const strings: WidgetStrings = {
    daysShort: i18n.t('date.daysShort', { returnObjects: true }) as string[],
    months: i18n.t('date.months', { returnObjects: true }) as string[],
    weekLabel: t('widget.weekLabel'),
    noClasses: t('widget.noClasses'),
    allDone: t('widget.allDone'),
    subgroupShort: t('widget.subgroupShort'),
    description: t('widget.description'),
  };

  const year = new Date().getFullYear();
  const { byYear, userAdded, userRemoved, userAddedHidden } = useHolidaysStore.getState();
  const holidays = getMergedHolidays(byYear[String(year)] ?? [], userAdded, userRemoved, userAddedHidden);

  const snapshot = buildWidgetSnapshot(schedule, currentWeek, new Date(), defaultGroup, subgroup, strings, blockedIds, holidays);
  await writeSnapshot(snapshot);
  reloadWidgetTimelines();
};

// ─── Auto-update on preference changes ───────────────────────

let _prev = {
  defaultGroup: usePreferencesStore.getState().defaultGroup,
  subgroupByKey: usePreferencesStore.getState().subgroupByKey,
  blockedLessons: usePreferencesStore.getState().blockedLessons,
  theme: usePreferencesStore.getState().theme,
  language: usePreferencesStore.getState().language,
};

usePreferencesStore.subscribe((state) => {
  const defaultGroup = state.defaultGroup;
  const subgroupForDefault = defaultGroup ? state.subgroupByKey[defaultGroup] : undefined;
  const prevSubgroupForDefault = _prev.defaultGroup ? _prev.subgroupByKey[_prev.defaultGroup] : undefined;
  const blockedForDefault = defaultGroup ? state.blockedLessons[defaultGroup] : undefined;
  const prevBlockedForDefault = _prev.defaultGroup ? _prev.blockedLessons[_prev.defaultGroup] : undefined;

  const changed =
    defaultGroup !== _prev.defaultGroup ||
    subgroupForDefault !== prevSubgroupForDefault ||
    blockedForDefault !== prevBlockedForDefault ||
    state.theme !== _prev.theme ||
    state.language !== _prev.language;

  if (changed) {
    _prev = {
      defaultGroup: state.defaultGroup,
      subgroupByKey: state.subgroupByKey,
      blockedLessons: state.blockedLessons,
      theme: state.theme,
      language: state.language,
    };
    void updateWidgetSnapshot();
  }
});

// ─── Auto-update on holiday changes ───────────────────────

let _prevHolidays = {
  userAdded: useHolidaysStore.getState().userAdded,
  userRemoved: useHolidaysStore.getState().userRemoved,
  userAddedHidden: useHolidaysStore.getState().userAddedHidden,
};

useHolidaysStore.subscribe((state) => {
  if (
    state.userAdded !== _prevHolidays.userAdded ||
    state.userRemoved !== _prevHolidays.userRemoved ||
    state.userAddedHidden !== _prevHolidays.userAddedHidden
  ) {
    _prevHolidays = {
      userAdded: state.userAdded,
      userRemoved: state.userRemoved,
      userAddedHidden: state.userAddedHidden,
    };
    void updateWidgetSnapshot();
  }
});

export type { WidgetSnapshot, WidgetLesson, WidgetDayBlock } from './widgetData';
export { buildWidgetSnapshot } from './widgetData';
