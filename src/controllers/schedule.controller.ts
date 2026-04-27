import type { AxiosError } from 'axios';

import type { ScheduleDto } from '@models/dto';
import { EmployeesApi, GroupsApi, ScheduleApi } from '@services/api';
import { pullScheduleFromCloud, pushScheduleToCloud } from '@services/cloud/syncService';
import { updateWidgetSnapshot } from '@services/widget';
import { usePreferencesStore } from '@stores/preferences.store';
import type { ErrorKind } from '@stores/schedule.store';
import { useScheduleStore } from '@stores/schedule.store';

const isNotFound = (e: unknown): boolean =>
  (e as AxiosError)?.response?.status === 404;

/** Определяет тип ошибки: сервер лёг (5xx/timeout) или проблема с сетью. */
const classifyError = (e: unknown): ErrorKind => {
  const axErr = e as AxiosError | undefined;
  const status = axErr?.response?.status;
  // 5xx — сервер лёг
  if (status && status >= 500) return 'server';
  // Таймаут или нет ответа от сервера (нет интернета / DNS / сервер не отвечает)
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
      const week = await ScheduleApi.currentWeek();
      store.setCurrentWeek(week);
    } catch (e) {
      store.setError(e instanceof Error ? e.message : 'Не удалось получить текущую неделю', classifyError(e));
    }
  },

  async loadGroupSchedule(groupName: string): Promise<void> {
    const store = useScheduleStore.getState();
    if (store.loadingKey === groupName) return;

    store.setLoadingKey(groupName);
    store.setError(null);
    try {
      const data = await GroupsApi.schedule(groupName);
      store.setSchedule(groupName, data);
      void pushScheduleToCloud(groupName, data);
      // Update widget if this is the default group.
      if (groupName === usePreferencesStore.getState().defaultGroup) {
        void updateWidgetSnapshot();
      }
    } catch (e) {
      if (isNotFound(e)) {
        store.setSchedule(groupName, EMPTY_SCHEDULE);
      } else {
        // Try iCloud fallback before giving up.
        const cloudData = await pullScheduleFromCloud(groupName);
        if (cloudData) {
          store.setSchedule(groupName, cloudData);
        } else {
          store.setError(e instanceof Error ? e.message : 'Не удалось загрузить расписание группы', classifyError(e));
        }
      }
    } finally {
      store.setLoadingKey(null);
    }
  },

  async loadEmployeeSchedule(urlId: string): Promise<void> {
    const store = useScheduleStore.getState();
    if (store.loadingKey === urlId) return;

    store.setLoadingKey(urlId);
    store.setError(null);
    try {
      const data = await EmployeesApi.schedule(urlId);
      store.setSchedule(urlId, data);
      void pushScheduleToCloud(urlId, data);
    } catch (e) {
      if (isNotFound(e)) {
        store.setSchedule(urlId, EMPTY_SCHEDULE);
      } else {
        const cloudData = await pullScheduleFromCloud(urlId);
        if (cloudData) {
          store.setSchedule(urlId, cloudData);
        } else {
          store.setError(
            e instanceof Error ? e.message : 'Не удалось загрузить расписание преподавателя',
            classifyError(e),
          );
        }
      }
    } finally {
      store.setLoadingKey(null);
    }
  },
};
