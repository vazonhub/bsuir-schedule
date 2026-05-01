import { Stack } from 'expo-router';

import { usePalette } from '@hooks/usePalette';

/**
 * Stack for the Employees tab.
 * `index` = list of all teachers, `[urlId]` = schedule of a specific teacher.
 *
 * Headers are hidden globally — см. комментарий в (groups)/_layout.tsx.
 */
export default function EmployeesStackLayout() {
  const Palette = usePalette();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Palette.background },
      }}
    />
  );
}
