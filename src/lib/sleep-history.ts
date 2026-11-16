import type { SleepRecord } from "../domain/model";
import {
  addDays,
  addMonths,
  dayKey,
  isoWeekday,
  minutesBetween,
} from "../domain/time";
export type SleepRange = "30days" | "month" | "year";
export function sleepPeriod(range: SleepRange, anchor: string) {
  const start =
    range === "30days"
      ? addDays(anchor, -29)
      : range === "month"
        ? anchor.slice(0, 7) + "-01"
        : anchor.slice(0, 4) + "-01-01";
  const end =
    range === "30days"
      ? anchor
      : range === "month"
        ? addDays(addMonths(start, 1), -1)
        : anchor.slice(0, 4) + "-12-31";
  const first = addDays(start, 1 - isoWeekday(start)),
    last = addDays(end, 7 - isoWeekday(end));
  const length =
    Math.round((Date.parse(last) - Date.parse(first)) / 86400000) + 1;
  return {
    start,
    end,
    days: Array.from({ length }, (_, index) => addDays(first, index)),
  };
}
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
