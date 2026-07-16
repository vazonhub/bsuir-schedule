import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import i18n from '@i18n';
import { selectFireCore, useFireStore } from '@stores/fire.store';
import { nextDayISO, parseLocalISO, toLocalISO } from '@utils/fire';

/**
 * Локальное напоминание «не потеряй огонёк». Планируется ТОЛЬКО когда серия
 * реально под угрозой: есть серия (`current > 0`) и заморозок не осталось
 * (`freezes === 0`), т.е. пропуск учебного дня обнулит прогресс без страховки.
 * Пуш ставится на ~19:30 ближайшего учебного дня, который ещё не «закрыт».
 *
 * Всё — локальные уведомления, серверные push-креды не нужны. Требует
 * `expo-notifications` (см. app.json) и dev-client / prebuild-сборку.
 */

const REMINDER_ID = 'fire-reminder';
const CHANNEL_ID = 'fire';
const REMINDER_HOUR = 19;
const REMINDER_MINUTE = 30;
/** На сколько дней вперёд искать ближайший учебный день. */
const LOOKAHEAD_DAYS = 8;

let handlerConfigured = false;

/** Показывать баннер, даже если приложение на переднем плане. */
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

/** Спросить разрешение, если ещё не спрашивали. Возвращает granted. */
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
 * Ближайший учебный день (в пределах LOOKAHEAD_DAYS), чьё время напоминания
 * ещё в будущем и который не «закрыт» сегодняшней активностью. Иначе null.
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
 * Пересчитать и перепланировать напоминание. Вызывается контроллером после
 * каждого изменения огонька. Всегда сперва отменяет предыдущее.
 */
export const rescheduleFireReminder = async (
  now: Date,
  isLessonDay: (iso: string) => boolean,
): Promise<void> => {
  configureHandler();

  // Всегда снимаем предыдущее напоминание — состояние могло поменяться.
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});

  const core = selectFireCore(useFireStore.getState());
  // Планируем только когда серия под угрозой: есть что терять и нет заморозок.
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
};
