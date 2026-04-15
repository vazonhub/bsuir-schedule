import { GroupsApi } from '@services/api';
import { useGroupsStore } from '@stores/groups.store';

/**
 * Controller layer (the C in MVC). Keeps view components thin: views call
 * controller methods, controllers orchestrate API calls + store updates.
 */
export const GroupsController = {
  async loadAll(): Promise<void> {
    const store = useGroupsStore.getState();
    if (store.isLoading) return;

    store.setLoading(true);
    store.setError(null);
    try {
      const items = await GroupsApi.list();
      store.setItems(items);
    } catch (e) {
      store.setError(e instanceof Error ? e.message : 'Не удалось загрузить группы');
    } finally {
      store.setLoading(false);
    }
  },
};
