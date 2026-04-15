import { EmployeesApi } from '@services/api';
import { useEmployeesStore } from '@stores/employees.store';

export const EmployeesController = {
  async loadAll(): Promise<void> {
    const store = useEmployeesStore.getState();
    if (store.isLoading) return;

    store.setLoading(true);
    store.setError(null);
    try {
      const items = await EmployeesApi.list();
      store.setItems(items);
    } catch (e) {
      store.setError(e instanceof Error ? e.message : 'Не удалось загрузить преподавателей');
    } finally {
      store.setLoading(false);
    }
  },
};
