import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { EmployeesController } from '@controllers/employees.controller';
import { GroupsController } from '@controllers/groups.controller';
import { prefetchPinned } from '@services/prefetch';
import { updateWidgetSnapshot } from '@services/widget';

const FOREGROUND_DEBOUNCE_MS = 5_000;

/**
 * App-level bootstrap hook. Call once in the root layout.
 *
 * - Loads groups + employees lists (stale-while-revalidate).
 * - Prefetches pinned schedules.
 * - Refreshes pinned schedules when returning to foreground (debounced).
 */
export const useAppBootstrap = () => {
  const lastForegroundRef = useRef(0);

  useEffect(() => {
    // Initial load on app start.
    void GroupsController.loadAll();
    void EmployeesController.loadAll();
    void prefetchPinned().then(() => updateWidgetSnapshot());
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const now = Date.now();
      if (now - lastForegroundRef.current < FOREGROUND_DEBOUNCE_MS) return;
      lastForegroundRef.current = now;

      void GroupsController.loadAll();
      void EmployeesController.loadAll();
      void prefetchPinned().then(() => updateWidgetSnapshot());
    });
    return () => sub.remove();
  }, []);
};
