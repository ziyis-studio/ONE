import type { SleepRecord } from "../domain/model";
import { addDays, dayKey, isoWeekday, minutesBetween } from "../domain/time";
export function sleepByDay(records: SleepRecord[], zone: string) {
  const days = new Map<string, { minutes: number; records: SleepRecord[] }>();
  for (const record of records) {
    const date = dayKey(record.endsAt, zone);
    const day = days.get(date) || { minutes: 0, records: [] };
    day.minutes += Math.max(
      0,
      minutesBetween(record.startsAt, record.endsAt) - record.awakeMinutes,
    );
    day.records.push(record);
    days.set(date, day);
  }
  return days;
}
export function sleepLevel(minutes: number | undefined) {
  if (minutes === undefined) return 0;
  if (minutes < 240) return 1;
  if (minutes < 360) return 2;
  if (minutes < 480) return 3;
  return 4;
}
export function sleepYearDays(year: number) {
  const first = year + "-01-01",
    last = year + "-12-31";
  const start = addDays(first, 1 - isoWeekday(first));
  const end = addDays(last, 7 - isoWeekday(last));
  const count =
    Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
  return Array.from({ length: count }, (_, index) => addDays(start, index));
}
export function sleepDuration(minutes: number) {
  return Math.floor(minutes / 60) + "h " + (minutes % 60) + "m";
}
