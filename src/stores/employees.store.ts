import { create } from 'zustand';

import type { EmployeeDto } from '@models/dto';

interface EmployeesState {
  items: EmployeeDto[];
  isLoading: boolean;
  error: string | null;
  setItems(items: EmployeeDto[]): void;
  setLoading(value: boolean): void;
  setError(message: string | null): void;
}

export const useEmployeesStore = create<EmployeesState>((set) => ({
  items: [],
  isLoading: false,
  error: null,
  setItems: (items) => set({ items }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
