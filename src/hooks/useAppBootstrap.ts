import { useEffect, useRef } from 'react';
import { Appearance, AppState } from 'react-native';

import { AppVersionController } from '@controllers/appVersion.controller';
import { EmployeesController } from '@controllers/employees.controller';
import { GroupsController } from '@controllers/groups.controller';
import { HolidaysController } from '@controllers/holidays.controller';
import { initAds } from '@services/ads';
import { restoreGoogleSession } from '@services/cloud/googleAuth';
import { prefetchPinned } from '@services/prefetch';
import { trackUsageAndMaybeRequestReview } from '@services/review';
import { updateWidgetSnapshot } from '@services/widget';
import { registerWidgetBackgroundFetch } from '@services/widget/backgroundTask';
import { usePreferencesStore } from '@stores/preferences.store';

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
    void HolidaysController.sync(new Date().getFullYear());
    void prefetchPinned().then(() => updateWidgetSnapshot());
    void registerWidgetBackgroundFetch();
    void trackUsageAndMaybeRequestReview();
    void AppVersionController.checkForUpdate();
    void restoreGoogleSession();
    void initAds();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const now = Date.now();
      if (now - lastForegroundRef.current < FOREGROUND_DEBOUNCE_MS) return;
      lastForegroundRef.current = now;

      void GroupsController.loadAll();
      void EmployeesController.loadAll();
      void HolidaysController.sync(new Date().getFullYear());
      void prefetchPinned().then(() => updateWidgetSnapshot());
      void AppVersionController.checkForUpdate();
    });
    return () => sub.remove();
  }, []);

  // When theme is 'auto' and the system appearance changes, update the
  // store's resolvedScheme so the JS palette follows the OS setting.
  // We do NOT call Appearance.setColorScheme() here — in auto mode the
  // override is null and the system drives the native appearance natively.
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      const { theme } = usePreferencesStore.getState();
      if (theme === 'auto' && colorScheme) {
        usePreferencesStore.setState({
          resolvedScheme: colorScheme as 'light' | 'dark',
        });
      }
    });
    return () => sub.remove();
  }, []);
};
