import { Stack } from 'expo-router';

/**
 * Stack for the Diary tab — карточки предметов закреплённой группы.
 * Один экран (`index`), но оборачиваем в Stack для консистентности с
 * другими табами и на случай будущих экранов (например, per-subject детали).
 */
export default function DiaryStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
