import { EmployeesApi } from '@services/api';
import { cache, TTL } from '@services/cache/cache';
import { useEmployeesStore } from '@stores/employees.store';

const CACHE_KEY = 'employees-list';

export const EmployeesController = {
  async loadAll(force = false): Promise<void> {
    const store = useEmployeesStore.getState();
    if (store.isLoading) return;

    if (!force && store.items.length > 0) {
      const cached = await cache.get(CACHE_KEY, TTL.lists);
      if (cached) return;
    }

    store.setLoading(true);
    store.setError(null);
    try {
      const items = await EmployeesApi.list();
      store.setItems(items);
      await cache.set(CACHE_KEY, true);
    } catch (e) {
      if (store.items.length === 0) {
        store.setError(e instanceof Error ? e.message : 'Не удалось загрузить преподавателей');
      }
    } finally {
      store.setLoading(false);
    }
  },
};
