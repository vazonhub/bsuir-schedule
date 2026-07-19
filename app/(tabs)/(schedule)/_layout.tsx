import { Stack } from 'expo-router';

/**
 * Stack for the Schedule tab — combines groups and employees.
 * `index` = list with a segmented switcher (Groups / Employees),
 * `group/[name]` = group schedule, `employee/[urlId]` = employee schedule.
 *
 * Headers are hidden globally — screens draw their UI edge-to-edge; back
 * remains available via iOS swipe-back and the system Android button.
 */
export default function ScheduleStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
