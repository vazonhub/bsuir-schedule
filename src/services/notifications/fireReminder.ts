import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import i18n from '@i18n';
import { selectFireCore, useFireStore } from '@stores/fire.store';
import { nextDayISO, parseLocalISO, toLocalISO } from '@utils/fire';

/**
 * Local "don't lose your streak" reminder. Scheduled ONLY when the streak is
 * genuinely at risk: there is a streak (`current > 0`) and no freezes left
 * (`freezes === 0`), i.e. missing a lesson day would reset progress with no
 * safety net. The push is set for ~19:30 of the nearest lesson day that is
 * not yet "closed".
 *
 * Everything is local notifications, no server push credentials needed.
 * Requires `expo-notifications` (see app.json) and a dev-client / prebuild build.
 */

const REMINDER_ID = 'fire-reminder';
const CHANNEL_ID = 'fire';
const REMINDER_HOUR = 19;
const REMINDER_MINUTE = 30;
/** How many days ahead to look for the nearest lesson day. */
const LOOKAHEAD_DAYS = 8;

let handlerConfigured = false;

/** Show the banner even when the app is in the foreground. */
const configureHandler = (): void => {
  if (handlerConfigured) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  handlerConfigured = true;
};

const ensureChannel = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: i18n.t('fire.title'),
    importance: Notifications.AndroidImportance.DEFAULT,
  });
};

/** Ask for permission if not asked yet. Returns granted. */
const ensurePermission = async (): Promise<boolean> => {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  if (settings.status === Notifications.PermissionStatus.DENIED && !settings.canAskAgain) {
    return false;
  }
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
};

/**
 * Nearest lesson day (within LOOKAHEAD_DAYS) whose reminder time is still in
 * the future and which is not "closed" by today's activity. Otherwise null.
 */
const findReminderDate = (
  now: Date,
  isLessonDay: (iso: string) => boolean,
  lastActiveDate: string | null,
): Date | null => {
  const todayISO = toLocalISO(now);
  let iso = todayISO;
  for (let i = 0; i < LOOKAHEAD_DAYS; i++) {
    if (isLessonDay(iso)) {
      const alreadyClosed = iso === todayISO && lastActiveDate === todayISO;
      if (!alreadyClosed) {
        const d = parseLocalISO(iso);
        d.setHours(REMINDER_HOUR, REMINDER_MINUTE, 0, 0);
        if (d.getTime() > now.getTime()) return d;
      }
    }
    iso = nextDayISO(iso);
  }
  return null;
};

/**
 * Recompute and reschedule the reminder. Called by the controller after
 * every fire change. Always cancels the previous one first.
 */
export const rescheduleFireReminder = async (
  now: Date,
  isLessonDay: (iso: string) => boolean,
): Promise<void> => {
  // The whole function is best-effort: called via `void` from the controller,
  // so any expo-notifications reject is silenced here to avoid an unhandled
  // rejection and not break the activity registration flow.
  try {
    configureHandler();

    // Always cancel the previous reminder — state may have changed.
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});

    const core = selectFireCore(useFireStore.getState());
    // Schedule only when the streak is at risk: something to lose and no freezes.
    if (core.current <= 0 || core.freezes > 0) return;

    const target = findReminderDate(now, isLessonDay, core.lastActiveDate);
    if (!target) return;

    const granted = await ensurePermission();
    if (!granted) return;

    await ensureChannel();
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: {
        title: i18n.t('fire.reminderTitle'),
        body: i18n.t('fire.reminderBody', { n: core.current }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: target,
        channelId: CHANNEL_ID,
      },
    });
  } catch {
    // the reminder is optional functionality, swallow errors
  }
};
