import { pullFireFromCloud, pushFireToCloud } from '@services/cloud/syncService';
import { rescheduleFireReminder } from '@services/notifications/fireReminder';
import { selectFireCore, useFireStore } from '@stores/fire.store';
import { usePreferencesStore } from '@stores/preferences.store';
import { useScheduleStore } from '@stores/schedule.store';
import { buildLessonDayChecker, toLocalISO } from '@utils/fire';

/**
 * Streak orchestration — the only place where streak logic intersects
 * with the schedule. Views call these methods; the store knows nothing about the schedule.
 *
 * "Lesson days" come from the pinned group's schedule (`defaultGroup`).
 * If the group/schedule/week number is not loaded yet — the predicate returns
 * `false` for all days, i.e. no penalties or credits happen (we don't punish
 * unfairly). That is why `onAppActive` is called AFTER `prefetchPinned`,
 * when `currentWeek` and the schedule are already in the store.
 */
type LessonDayChecker = (iso: string) => boolean;

/**
 * Single-slot memo: `buildLessonDayChecker` unrolls the entire semester
 * schedule, while `register` is called often (launch / schedule / every homework
 * check-off). Within a single day with the same schedule reference and week
 * the result is unchanged — reuse it instead of unrolling again.
 * Keyed by calendar day (`todayISO`), since week numbers are computed from it.
 */
let checkerCache: {
  schedule: unknown;
  currentWeek: unknown;
  todayISO: string;
  checker: LessonDayChecker;
} | null = null;

const buildChecker = (now: Date): LessonDayChecker => {
  const { defaultGroup } = usePreferencesStore.getState();
  if (!defaultGroup) return () => false;
  const scheduleStore = useScheduleStore.getState();
  const schedule = scheduleStore.byKey[defaultGroup];
  const currentWeek = scheduleStore.currentWeek;
  if (!schedule || currentWeek == null) return () => false;

  const todayISO = toLocalISO(now);
  if (
    checkerCache &&
    checkerCache.schedule === schedule &&
    checkerCache.currentWeek === currentWeek &&
    checkerCache.todayISO === todayISO
  ) {
    return checkerCache.checker;
  }
  const checker = buildLessonDayChecker(schedule, currentWeek, now);
  checkerCache = { schedule, currentWeek, todayISO, checker };
  return checker;
};

/**
 * Catch up on the past and, if today is a lesson day, credit activity.
 * `markActivity` is idempotent within a day, so repeated calls from
 * different points (launch / schedule / homework) are safe — at most +1 per day.
 * After a change — best-effort push to the cloud and rescheduling of the reminder.
 */
const register = (now: Date): void => {
  const isLessonDay = buildChecker(now);
  useFireStore.getState().markActivity(now, isLessonDay);
  void pushFireToCloud(selectFireCore(useFireStore.getState()));
  void rescheduleFireReminder(now, isLessonDay);
};

export const FireController = {
  /**
   * App startup / return to foreground. Call AFTER prefetch.
   * First pulls the cloud core and merges it into the local one (sync between
   * devices), then catches up on the past and credits activity.
   */
  async onAppActive(now: Date = new Date()): Promise<void> {
    try {
      const remote = await pullFireFromCloud();
      if (remote) useFireStore.getState().mergeRemote(remote);
    } catch {
      // sync is best-effort — being offline must not block the local streak
    }
    register(now);
  },

  /** The user viewed the schedule. */
  registerScheduleView(now: Date = new Date()): void {
    register(now);
  },

  /** The user checked off a task in the diary (any homework interaction). */
  registerHomework(now: Date = new Date()): void {
    register(now);
  },
};
