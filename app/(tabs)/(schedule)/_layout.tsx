import { Stack } from 'expo-router';

/**
 * Stack for the Schedule tab — объединяет группы и преподавателей.
 * `index` = список с сегментированным свитчером (Группы / Преподаватели),
 * `group/[name]` = расписание группы, `employee/[urlId]` = расписание преподавателя.
 *
 * Headers are hidden globally — экраны рисуют свой UI «от края до края»; back
 * остаётся доступным через iOS swipe-back и системную Android-кнопку.
 */
export default function ScheduleStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
