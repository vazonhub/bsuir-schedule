import { GroupsApi } from '@services/api';
import { cache, TTL } from '@services/cache/cache';
import { useGroupsStore } from '@stores/groups.store';

const CACHE_KEY = 'groups-list';

/**
 * Controller layer (the C in MVC). Keeps view components thin: views call
 * controller methods, controllers orchestrate API calls + store updates.
 */
export const GroupsController = {
  /**
   * Stale-while-revalidate: return cached data instantly (via persisted
   * Zustand store), then refresh from API in the background. The TTL cache
   * prevents redundant network hits within 24 h.
   */
  async loadAll(force = false): Promise<void> {
    const store = useGroupsStore.getState();
    if (store.isLoading) return;

    // If store already has items (from Zustand persistence) and cache is fresh, skip.
    if (!force && store.items.length > 0) {
      const cached = await cache.get(CACHE_KEY, TTL.lists);
      if (cached) return;
    }

    store.setLoading(true);
    store.setError(null);
    try {
      const items = await GroupsApi.list();
      store.setItems(items);
      await cache.set(CACHE_KEY, true); // mark as fresh
    } catch (e) {
      // Only show error if there's no stale data to display.
      if (store.items.length === 0) {
        store.setError(e instanceof Error ? e.message : 'Не удалось загрузить группы');
      }
    } finally {
      store.setLoading(false);
    }
  },
};
