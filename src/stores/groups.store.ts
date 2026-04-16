import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { StudentGroupDto } from '@models/dto';
import { asyncStorageAdapter } from '@services/cache/asyncStorage';

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
export const useGroupsStore = create<GroupsState>()(
  persist(
    (set) => ({
      items: [],
      isLoading: false,
      error: null,
      setItems: (items) => set({ items }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'groups-cache-v1',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
