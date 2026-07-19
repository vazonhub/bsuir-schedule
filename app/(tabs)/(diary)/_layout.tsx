import { Stack } from 'expo-router';

/**
 * Stack for the Diary tab — subject cards of the pinned group.
 * A single screen (`index`), but wrapped in a Stack for consistency with
 * the other tabs and for potential future screens (e.g. per-subject details).
 */
export default function DiaryStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
