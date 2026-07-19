/**
 * Date strings used by iis.bsuir.by — formatted as `dd.MM.yyyy`.
 */
export type BsuirDateString = string;

/**
 * Time strings — formatted as `HH:mm`.
 */
export type BsuirTimeString = string;

/**
 * BSUIR week numbers are always 1..4 (the schedule rotates on a 4-week cycle).
 */
export type WeekNumber = 1 | 2 | 3 | 4;

/**
 * Subgroup discriminator. `0` = whole group, `1` / `2` = subgroup-specific lesson.
 */
export type SubgroupNumber = 0 | 1 | 2;

/**
 * Russian day names used as object keys in the schedules map returned by API.
 */
export type DayNameRu =
  | 'Понедельник'
  | 'Вторник'
  | 'Среда'
  | 'Четверг'
  | 'Пятница'
  | 'Суббота'
  | 'Воскресенье';
