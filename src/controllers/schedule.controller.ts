import type { AxiosError } from 'axios';
import { InteractionManager } from 'react-native';

import { buildDemoSchedule, DEMO_SCHEDULE_GROUP_NAME } from '@fixtures/demoSchedule';
import type { ScheduleDto } from '@models/dto';
import { EmployeesApi, GroupsApi, ScheduleApi } from '@services/api';
import { pullScheduleFromCloud, pushScheduleToCloud } from '@services/cloud/syncService';
import { updateWatchSnapshot } from '@services/watch';
import { updateWidgetSnapshot } from '@services/widget';
import { usePreferencesStore } from '@stores/preferences.store';
import type { ErrorKind } from '@stores/schedule.store';
import { useScheduleStore } from '@stores/schedule.store';

/** Wait for navigation/animation to finish before running heavy work. */
const afterInteractions = () =>
  new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(() => resolve());
  });

const isNotFound = (e: unknown): boolean => (e as AxiosError)?.response?.status === 404;

/** Determines the error kind: server down (5xx/timeout) or a network problem. */
const classifyError = (e: unknown): ErrorKind => {
  const axErr = e as AxiosError | undefined;
  const status = axErr?.response?.status;
  // 5xx — server is down
  if (status && status >= 500) return 'server';
  // Timeout or no response from the server (no internet / DNS / server not responding)
  if (axErr?.code === 'ECONNABORTED' || axErr?.code === 'ERR_NETWORK' || !axErr?.response) {
    return 'network';
  }
  return 'generic';
};

const EMPTY_SCHEDULE: ScheduleDto = {
  startDate: null,
  endDate: null,
  startExamsDate: null,
  endExamsDate: null,
  studentGroupDto: null,
  employeeDto: null,
  schedules: null,
  nextSchedules: null,
  currentTerm: null,
  nextTerm: null,
  exams: [],
  currentPeriod: null,
  isZaochOrDist: false,
};

export const ScheduleController = {
  async loadCurrentWeek(): Promise<void> {
    const store = useScheduleStore.getState();
    try {
      const raw = await ScheduleApi.currentWeek();
      const week = Number(raw);
      if (week < 1 || week > 4 || !Number.isInteger(week)) {
        store.setError('Некорректный номер недели от сервера', 'generic');
        return;
      }
      store.setCurrentWeek(week as 1 | 2 | 3 | 4);
    } catch (e) {
      // Network/server failure: if we already have a cached week (rotated from
      // the last known value on rehydration), keep it so the cached schedule
      // still renders offline. Only surface an error when there is nothing to
      // fall back to.
      if (store.currentWeek != null) return;
      store.setError(
        e instanceof Error ? e.message : 'Не удалось получить текущую неделю',
        classifyError(e),
      );
    }
  },

  async loadGroupSchedule(groupName: string): Promise<void> {
    const store = useScheduleStore.getState();
    if (store.loadingKeys[groupName]) return;

    const prefs = usePreferencesStore.getState();
    store.addLoadingKey(groupName);
    store.setError(null);

    let primaryError: unknown = null;

    try {
      if (prefs.sourceBsuirApi) {
        try {
          const data = await GroupsApi.schedule(groupName);
          await afterInteractions();
          store.setSchedule(groupName, data);
          void pushScheduleToCloud(groupName, data);
          if (groupName === prefs.defaultGroup) {
            void updateWidgetSnapshot();
            void updateWatchSnapshot();
          }
          return;
        } catch (e) {
          if (isNotFound(e)) {
            store.setSchedule(groupName, EMPTY_SCHEDULE);
            return;
          }
          // API failed — remember why, then fall through to cloud fallback.
          primaryError = e;
        }
      }

      // Try cloud fallback.
      const cloudData = await pullScheduleFromCloud(groupName);
      if (cloudData) {
        await afterInteractions();
        store.setSchedule(groupName, cloudData);
      } else if (!prefs.sourceBsuirApi) {
        store.setError('apiDisabled', 'apiDisabled');
      } else {
        // Cloud had nothing — surface the original API failure kind
        // (5xx → 'server', timeout/no-response → 'network', etc.),
        // not a blanket 'network' error.
        store.setError('cloudFallbackFailed', classifyError(primaryError));
      }
    } finally {
      store.removeLoadingKey(groupName);
    }
  },

  async loadEmployeeSchedule(urlId: string): Promise<void> {
    const store = useScheduleStore.getState();
    if (store.loadingKeys[urlId]) return;

    const prefs = usePreferencesStore.getState();
    store.addLoadingKey(urlId);
    store.setError(null);

    let primaryError: unknown = null;

    try {
      if (prefs.sourceBsuirApi) {
        try {
          const data = await EmployeesApi.schedule(urlId);
          await afterInteractions();
          store.setSchedule(urlId, data);
          void pushScheduleToCloud(urlId, data);
          return;
        } catch (e) {
          if (isNotFound(e)) {
            store.setSchedule(urlId, EMPTY_SCHEDULE);
            return;
          }
          // API failed — remember why, then fall through to cloud fallback.
          primaryError = e;
        }
      }

      // Try cloud fallback.
      const cloudData = await pullScheduleFromCloud(urlId);
      if (cloudData) {
        await afterInteractions();
        store.setSchedule(urlId, cloudData);
      } else if (!prefs.sourceBsuirApi) {
        store.setError('apiDisabled', 'apiDisabled');
      } else {
        store.setError('cloudFallbackFailed', classifyError(primaryError));
      }
    } finally {
      store.removeLoadingKey(urlId);
    }
  },

  /**
   * Dev helper — seed a hand-crafted demo schedule into the store so the
   * Diary tab can be tested when the live BSUIR API is unavailable. Sets
   * `defaultGroup` to the demo group name and forces `currentWeek` to 1.
   */
  seedDemoSchedule(): void {
    const scheduleStore = useScheduleStore.getState();
    const prefs = usePreferencesStore.getState();
    const demo = buildDemoSchedule(new Date());
    scheduleStore.setSchedule(DEMO_SCHEDULE_GROUP_NAME, demo);
    if (scheduleStore.currentWeek == null) scheduleStore.setCurrentWeek(1);
    scheduleStore.setError(null);
    prefs.setDefaultGroup(DEMO_SCHEDULE_GROUP_NAME);
  },

  /**
   * Remove the demo schedule from the store. If the default group was set
   * to the demo group, clear it as well.
   */
  clearDemoSchedule(): void {
    const scheduleStore = useScheduleStore.getState();
    const prefs = usePreferencesStore.getState();
    const { [DEMO_SCHEDULE_GROUP_NAME]: _removed, ...rest } = scheduleStore.byKey;
    useScheduleStore.setState({ byKey: rest });
    if (prefs.defaultGroup === DEMO_SCHEDULE_GROUP_NAME) {
      prefs.setDefaultGroup(null);
    }
  },
};
