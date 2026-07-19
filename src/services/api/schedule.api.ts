import { http } from './http';
import type { CurrentWeekNumber } from '@models/dto';

export const ScheduleApi = {
  /** GET /schedule/current-week — returns the current 4-week-cycle index (1..4). */
  currentWeek(): Promise<CurrentWeekNumber> {
    return http.get<CurrentWeekNumber>('/schedule/current-week').then((r) => r.data);
  },
};
