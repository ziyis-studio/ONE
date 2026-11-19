import { describe, expect, it } from "vitest";
import { pomodoroTimeBlock } from "./support/pomodoro-timeline";
import { pomodoroHead, ONE_SEGMENTS } from "../src/lib/brand-mark";

describe("recorded Pomodoro time blocks and head", () => {
  it("preserves the complete real window and distinguishes paused time from focus", () => {
    const record = {
      id: crypto.randomUUID(),
      mode: "focus" as const,
      startedAt: Date.parse("2026-11-17T01:00:00Z"),
      completedAt: Date.parse("2026-11-17T01:35:00Z"),
      durationSeconds: 1500,
    };
    const block = pomodoroTimeBlock(record, "Asia/Kuala_Lumpur");
    expect(block.id).toBe(record.id);
    expect(block.title).toBe("Pomodoro · Focus");
    expect(block.startsAt).toBe("2026-11-17T01:00:00.000Z");
    expect(block.endsAt).toBe("2026-11-17T01:35:00.000Z");
    expect(block.description).toContain("Focus time: 25 min");
    expect(block.description).toContain("Paused: 10 min");
    expect(
      pomodoroTimeBlock(
        { ...record, mode: "short", durationSeconds: 300 },
        "UTC",
      ).title,
    ).toBe("Pomodoro · Short break");
  });
  it("places only the moving head on the reverse arc, handing off across the three gaps", () => {
    expect(pomodoroHead(0).segment.letter).toBe("O");
    expect(pomodoroHead(0).x).toBeCloseTo(63.67559, 4);
    expect(pomodoroHead(0).y).toBeCloseTo(17.78233, 4);
    expect(pomodoroHead(0.625).segment.letter).toBe("N");
    expect(pomodoroHead(0.875).segment.letter).toBe("E");
    expect(pomodoroHead(1).x).toBeCloseTo(75.59738, 4);
    expect(pomodoroHead(1).y).toBeCloseTo(26.13006, 4);
    for (const ratio of [0.1, 0.3, 0.7, 0.95]) {
      const { x, y } = pomodoroHead(ratio);
      expect(Math.hypot(x - 50, y - 50)).toBeCloseTo(35, 6);
    }
    expect(ONE_SEGMENTS).toHaveLength(3);
  });
});
