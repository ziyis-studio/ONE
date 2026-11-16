import { describe, it, expect } from "vitest";
import {
  blocksOnDay,
  layoutDayBlocks,
  rescheduledBlock,
  minuteTimestamp,
  snapMinute,
} from "../src/lib/schedule";
import type { TimeBlock } from "../src/domain/model";
function block(id: string, startsAt: string, endsAt: string): TimeBlock {
  return {
    id,
    title: id,
    description: "",
    startsAt,
    endsAt,
    timeZone: "Asia/Kuala_Lumpur",
    createdAt: startsAt,
    updatedAt: startsAt,
  };
}
describe("schedule day projection", () => {
  it("moves between dates with the same local start and duration, including an overnight end", () => {
    const original = block(
      "overnight",
      "2026-11-16T23:30:00+08:00",
      "2026-11-17T01:00:00+08:00",
    );
    const input = rescheduledBlock(original, "2026-11-20", "Asia/Kuala_Lumpur");
    expect(new Date(input.startsAt).toISOString()).toBe(
      "2026-11-20T15:30:00.000Z",
    );
    expect(input.endsAt).toBe("2026-11-20T17:00:00.000Z");
    expect(Date.parse(input.endsAt) - Date.parse(input.startsAt)).toBe(
      90 * 60_000,
    );
    expect(snapMinute(547)).toBe(540);
    expect(snapMinute(548)).toBe(555);
    expect(
      new Date(
        minuteTimestamp("2026-11-16", 1440, "Asia/Kuala_Lumpur"),
      ).toISOString(),
    ).toBe("2026-11-16T16:00:00.000Z");
  });
  it("includes and clips blocks that cross midnight", () => {
    const overnight = block(
      "overnight",
      "2026-11-15T23:00:00+08:00",
      "2026-11-16T02:00:00+08:00",
    );
    expect(
      blocksOnDay([overnight], "2026-11-16", "Asia/Kuala_Lumpur"),
    ).toHaveLength(1);
    const item = layoutDayBlocks(
      [overnight],
      "2026-11-16",
      "Asia/Kuala_Lumpur",
    )[0];
    expect(item.start).toBe(0);
    expect(item.duration).toBe(120);
    expect(
      layoutDayBlocks([overnight], "2026-11-15", "Asia/Kuala_Lumpur")[0]
        .duration,
    ).toBe(60);
  });
  it("uses stable columns across chains of overlapping blocks", () => {
    const items = layoutDayBlocks(
      [
        block("a", "2026-11-16T09:00:00+08:00", "2026-11-16T10:00:00+08:00"),
        block("b", "2026-11-16T09:30:00+08:00", "2026-11-16T11:00:00+08:00"),
        block("c", "2026-11-16T10:30:00+08:00", "2026-11-16T12:00:00+08:00"),
      ],
      "2026-11-16",
      "Asia/Kuala_Lumpur",
    );
    expect(items.map((i) => i.columns)).toEqual([2, 2, 2]);
    expect(items.map((i) => i.column)).toEqual([0, 1, 0]);
  });
});
