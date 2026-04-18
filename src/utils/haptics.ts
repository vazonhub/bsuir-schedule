import * as Haptics from 'expo-haptics';

/** Light tap — card press, navigation, segmented control switch. */
export const hapticLight = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

/** Medium tap — pull-to-refresh trigger. */
export const hapticMedium = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

/** Success — pin/unpin, selecting default group. */
export const hapticSuccess = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
