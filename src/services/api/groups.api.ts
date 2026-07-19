import { http } from './http';
import type { ScheduleDto, StudentGroupDto } from '@models/dto';

export const GroupsApi = {
  /** GET /student-groups — full list of available student groups. */
  list(): Promise<StudentGroupDto[]> {
    return http.get<StudentGroupDto[]>('/student-groups').then((r) => r.data);
  },

  /** GET /schedule?studentGroup=... — schedule for a specific group. */
  schedule(groupName: string): Promise<ScheduleDto> {
    return http
      .get<ScheduleDto>('/schedule', { params: { studentGroup: groupName } })
      .then((r) => r.data);
  },
};
