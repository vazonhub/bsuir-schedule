import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { EmployeeDto } from '@models/dto';
import { asyncStorageAdapter } from '@services/cache/asyncStorage';

interface EmployeesState {
  items: EmployeeDto[];
  isLoading: boolean;
  error: string | null;
  setItems(items: EmployeeDto[]): void;
  setLoading(value: boolean): void;
  setError(message: string | null): void;
}

export const useEmployeesStore = create<EmployeesState>()(
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
      name: 'employees-cache-v1',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
