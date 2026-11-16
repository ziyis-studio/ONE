import { describe, expect, it } from "vitest";
import {
  changePomodoroMode,
  initialPomodoro,
  nextPomodoroMode,
  parsePomodoro,
  pausePomodoro,
  pomodoroTime,
  remainingPomodoro,
  settlePomodoro,
  startPomodoro,
} from "../src/lib/pomodoro";
const now = Date.parse("2026-11-17T01:00:00Z");
describe("deadline-based Pomodoro", () => {
  it("pauses exactly, resumes from remaining time and completes only once", () => {
    let timer = startPomodoro(initialPomodoro(), now);
    expect(remainingPomodoro(timer, now + 60_000)).toBe(24 * 60_000);
    timer = pausePomodoro(timer, now + 60_123);
    expect(timer.remainingMs).toBe(25 * 60_000 - 60_123);
    expect(remainingPomodoro(timer, now + 3600_000)).toBe(timer.remainingMs);
    timer = startPomodoro(timer, now + 3600_000);
    const end = timer.endsAt!;
    timer = settlePomodoro(timer, end + 3600_000);
    expect(timer.status).toBe("complete");
    expect(timer.focusCount).toBe(1);
    expect(timer.focusHistory).toEqual([end]);
    expect(settlePomodoro(timer, end + 86400_000)).toBe(timer);
    expect(
      pausePomodoro(startPomodoro(initialPomodoro(), now), now + 25 * 60_000)
        .status,
    ).toBe("complete");
  });
  it("offers a long break after four focuses and never auto-starts a phase", () => {
    let timer = initialPomodoro(),
      time = now;
    for (let i = 1; i <= 4; i++) {
      timer = startPomodoro(timer, time);
      time = timer.endsAt!;
      timer = settlePomodoro(timer, time);
      expect(timer.status).toBe("complete");
      expect(nextPomodoroMode(timer)).toBe(i === 4 ? "long" : "short");
      if (i < 4) {
        timer = startPomodoro(timer, time);
        expect(timer.mode).toBe("short");
        time = timer.endsAt!;
        timer = settlePomodoro(timer, time);
        expect(nextPomodoroMode(timer)).toBe("focus");
      }
    }
    timer = startPomodoro(timer, time);
    expect(timer.mode).toBe("long");
    expect(timer.remainingMs).toBe(15 * 60_000);
  });
  it("switches and resets without counting unfinished work, but keeps finished history", () => {
    let timer = startPomodoro(initialPomodoro(), now);
    timer = changePomodoroMode(timer, "short", now + 1000);
    expect(timer.focusCount).toBe(0);
    expect(timer.status).toBe("ready");
    timer = startPomodoro(changePomodoroMode(timer, "focus", now), now);
    timer = changePomodoroMode(timer, "focus", now + 26 * 60_000);
    expect(timer.focusCount).toBe(1);
    expect(timer.focusHistory).toHaveLength(1);
    expect(timer.remainingMs).toBe(25 * 60_000);
  });
  it("restores an elapsed deadline without inventing sessions, bounds history and rejects corrupt storage", () => {
    const timer = startPomodoro(initialPomodoro(), now),
      raw = JSON.stringify({ version: 1, state: timer });
    const restored = parsePomodoro(raw, now + 86400_000);
    expect(restored).toEqual(timer);
    expect(settlePomodoro(restored, now + 86400_000).focusCount).toBe(1);
    for (const value of [
      null,
      "broken",
      JSON.stringify({ version: 2, state: timer }),
      JSON.stringify({ version: 1, state: { ...timer, mode: "bad" } }),
      JSON.stringify({ version: 1, state: { ...timer, remainingMs: -1 } }),
      JSON.stringify({
        version: 1,
        state: { ...timer, focusHistory: ["bad"] },
      }),
    ])
      expect(parsePomodoro(value, now)).toEqual(initialPomodoro());
    expect(pomodoroTime(59_001)).toBe("01:00");
    expect(pomodoroTime(0)).toBe("00:00");
  });
});
