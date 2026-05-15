import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Returns the current `Date` and re-renders the caller every `intervalMs`
 * milliseconds. Defaults to a 30-second tick — достаточный шаг, чтобы
 * визуально двигать прогресс идущей пары и переводить только что
 * закончившиеся пары в «прошедшие».
 *
 * Also force-refreshes when the app returns to the foreground, because
 * setInterval doesn't tick while the app is suspended — without this,
 * `now` could stay stale for hours after an overnight background.
 */
export const useNow = (intervalMs = 30_000): Date => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(new Date());
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [intervalMs]);
  return now;
};
