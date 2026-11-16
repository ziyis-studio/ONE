import { describe, expect, it } from "vitest";
import {
  sleepByDay,
  sleepLevel,
  sleepYearDays,
} from "../src/lib/sleep-history";
import type { SleepRecord } from "../src/domain/model";
function entry(
  id: string,
  startsAt: string,
  endsAt: string,
  awakeMinutes = 0,
): SleepRecord {
  return {
    id,
    startsAt,
    endsAt,
    awakeMinutes,
    timeZone: "Asia/Kuala_Lumpur",
    note: "",
    createdAt: startsAt,
    updatedAt: startsAt,
  };
}
describe("sleep heatmap history", () => {
  it("groups separate sleep entries by waking date in the workspace time zone", () => {
    const records = [
      entry("night", "2026-11-15T15:00:00Z", "2026-11-15T23:00:00Z", 20),
      entry("nap", "2026-11-16T05:00:00Z", "2026-11-16T06:00:00Z", 10),
    ];
    const result = sleepByDay(records, "Asia/Kuala_Lumpur");
    expect(result.size).toBe(1);
    expect(result.get("2026-11-16")?.minutes).toBe(510);
    expect(result.get("2026-11-16")?.records).toHaveLength(2);
    expect(sleepLevel(result.get("2026-11-16")?.minutes)).toBe(4);
    expect(sleepLevel(undefined)).toBe(0);
    expect(sleepLevel(0)).toBe(1);
  });
  it("includes every calendar day once, with complete weeks and leap days", () => {
    const days = sleepYearDays(2024);
    expect(days.length % 7).toBe(0);
    expect(days.filter((day) => day.startsWith("2024"))).toHaveLength(366);
    expect(days).toContain("2024-02-29");
    expect(new Set(days).size).toBe(days.length);
  });
});
