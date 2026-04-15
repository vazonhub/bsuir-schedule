import { useEffect, useState } from 'react';

/**
 * Returns the current `Date` and re-renders the caller every `intervalMs`
 * milliseconds. Defaults to a 30-second tick — достаточный шаг, чтобы
 * визуально двигать прогресс идущей пары и переводить только что
 * закончившиеся пары в «прошедшие».
 */
export const useNow = (intervalMs = 30_000): Date => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
};
