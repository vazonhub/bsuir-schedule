import { create } from 'zustand';

import type { StudentGroupDto } from '@models/dto';

interface GroupsState {
  items: StudentGroupDto[];
  isLoading: boolean;
  error: string | null;
  setItems(items: StudentGroupDto[]): void;
  setLoading(value: boolean): void;
  setError(message: string | null): void;
}

/**
 * Cache of all student groups (model layer of MVC).
 * Mutations should be performed through `GroupsController`, not directly from views.
 */
export const useGroupsStore = create<GroupsState>((set) => ({
  items: [],
  isLoading: false,
  error: null,
  setItems: (items) => set({ items }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
