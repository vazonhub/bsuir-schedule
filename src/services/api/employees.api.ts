import { http } from './http';
import type { EmployeeDto, ScheduleDto } from '@models/dto';

export const EmployeesApi = {
  /** GET /employees/all — flat list of all employees (teachers). */
  list(): Promise<EmployeeDto[]> {
    return http.get<EmployeeDto[]>('/employees/all').then((r) => r.data);
  },

  /** GET /employees/schedule/{urlId} — schedule for a teacher. */
  schedule(urlId: string): Promise<ScheduleDto> {
    return http.get<ScheduleDto>(`/employees/schedule/${urlId}`).then((r) => r.data);
  },
};
