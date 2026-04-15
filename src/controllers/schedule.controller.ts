import { EmployeesApi, GroupsApi, ScheduleApi } from '@services/api';
import { useScheduleStore } from '@stores/schedule.store';

export const ScheduleController = {
  async loadCurrentWeek(): Promise<void> {
    const store = useScheduleStore.getState();
    try {
      const week = await ScheduleApi.currentWeek();
      store.setCurrentWeek(week);
    } catch (e) {
      store.setError(e instanceof Error ? e.message : 'Не удалось получить текущую неделю');
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
    } catch (e) {
      store.setError(e instanceof Error ? e.message : 'Не удалось загрузить расписание группы');
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
    } catch (e) {
      store.setError(
        e instanceof Error ? e.message : 'Не удалось загрузить расписание преподавателя',
      );
    } finally {
      store.setLoadingKey(null);
    }
  },
};
