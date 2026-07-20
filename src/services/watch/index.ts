import i18n from 'i18next';
import { Platform } from 'react-native';

import { getMergedHolidays, useHolidaysStore } from '@stores/holidays.store';
import type { SubgroupChoice } from '@stores/preferences.store';
import { usePreferencesStore } from '@stores/preferences.store';
import { useScheduleStore } from '@stores/schedule.store';

import { sendWatchContext } from '../../../modules/watch-bridge';
import { buildWatchSnapshot } from './watchData';
import type { WatchStrings } from './watchData';

/**
 * Rebuild the watch snapshot from current store state and push it to the paired
 * Apple Watch via the WatchConnectivity bridge. Mirrors `updateWidgetSnapshot`
 * (same triggers), but sends a full 4-week window instead of today-only.
 *
 * iOS-only: the watch app / bridge don't exist on Android.
 */
export const updateWatchSnapshot = async (): Promise<void> => {
  if (Platform.OS !== 'ios') return;

  const { defaultGroup, subgroupByKey, blockedLessons, resolvedScheme, language } =
    usePreferencesStore.getState();
  if (!defaultGroup) return;

  const { byKey, currentWeek } = useScheduleStore.getState();
  const schedule = byKey[defaultGroup];
  if (!schedule || !currentWeek) return;

  const subgroup: SubgroupChoice = subgroupByKey[defaultGroup] ?? 0;
  const blockedIds = new Set(blockedLessons[defaultGroup] ?? []);

  const strings: WatchStrings = {
    daysShort: i18n.t('date.daysShort', { returnObjects: true }) as string[],
    daysLong: i18n.t('date.days', { returnObjects: true }) as string[],
    months: i18n.t('date.months', { returnObjects: true }) as string[],
    weekLabel: i18n.t('widget.weekLabel'),
    noClasses: i18n.t('widget.noClasses'),
    today: i18n.t('date.today'),
    tomorrow: i18n.t('date.tomorrow'),
    subgroupShort: i18n.t('widget.subgroupShort'),
  };

  const year = new Date().getFullYear();
  const { byYear, userAdded, userRemoved, userAddedHidden } = useHolidaysStore.getState();
  const holidays = getMergedHolidays(
    byYear[String(year)] ?? [],
    userAdded,
    userRemoved,
    userAddedHidden,
  );

  const snapshot = buildWatchSnapshot(
    schedule,
    currentWeek,
    new Date(),
    defaultGroup,
    subgroup,
    resolvedScheme,
    language,
    strings,
    blockedIds,
    holidays,
  );

  sendWatchContext(JSON.stringify(snapshot));
};

// ─── Auto-update on preference changes ───────────────────────

let _prev = {
  defaultGroup: usePreferencesStore.getState().defaultGroup,
  subgroupByKey: usePreferencesStore.getState().subgroupByKey,
  blockedLessons: usePreferencesStore.getState().blockedLessons,
  theme: usePreferencesStore.getState().theme,
  resolvedScheme: usePreferencesStore.getState().resolvedScheme,
  language: usePreferencesStore.getState().language,
};

usePreferencesStore.subscribe((state) => {
  const defaultGroup = state.defaultGroup;
  const subgroupForDefault = defaultGroup ? state.subgroupByKey[defaultGroup] : undefined;
  const prevSubgroupForDefault = _prev.defaultGroup
    ? _prev.subgroupByKey[_prev.defaultGroup]
    : undefined;
  const blockedForDefault = defaultGroup ? state.blockedLessons[defaultGroup] : undefined;
  const prevBlockedForDefault = _prev.defaultGroup
    ? _prev.blockedLessons[_prev.defaultGroup]
    : undefined;

  const changed =
    defaultGroup !== _prev.defaultGroup ||
    subgroupForDefault !== prevSubgroupForDefault ||
    blockedForDefault !== prevBlockedForDefault ||
    state.theme !== _prev.theme ||
    state.resolvedScheme !== _prev.resolvedScheme ||
    state.language !== _prev.language;

  if (changed) {
    _prev = {
      defaultGroup: state.defaultGroup,
      subgroupByKey: state.subgroupByKey,
      blockedLessons: state.blockedLessons,
      theme: state.theme,
      resolvedScheme: state.resolvedScheme,
      language: state.language,
    };
    void updateWatchSnapshot();
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
    void updateWatchSnapshot();
  }
});

export type { WatchSnapshot, WatchLesson, WatchDayBlock } from './watchData';
export { buildWatchSnapshot } from './watchData';
