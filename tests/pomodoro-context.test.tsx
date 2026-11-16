// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { PomodoroProvider, usePomodoro } from "../src/lib/pomodoro-context";
import {
  initialPomodoro,
  pomodoroTime,
  startPomodoro,
} from "../src/lib/pomodoro";
const now = Date.parse("2026-11-17T01:00:00Z"),
  key = "one-pomodoro-v1:demo",
  notify = vi.fn();
function Example() {
  const timer = usePomodoro();
  return (
    <>
      <output aria-label="Time">{pomodoroTime(timer.remainingMs)}</output>
      <output aria-label="State">{timer.state.status}</output>
      <output aria-label="Mode">{timer.state.mode}</output>
      <output aria-label="Count">{timer.completedToday}</output>
      <button onClick={timer.start}>Start</button>
      <button onClick={timer.pause}>Pause</button>
      <button onClick={() => timer.selectMode("focus")}>Focus</button>
    </>
  );
}
const show = () =>
  render(
    <PomodoroProvider
      scope="demo"
      zone="Asia/Kuala_Lumpur"
      today="2026-11-17"
      notify={notify}
    >
      <Example />
    </PomodoroProvider>,
  );
beforeEach(() => {
  localStorage.clear();
  notify.mockReset();
  vi.useFakeTimers({
    toFake: [
      "Date",
      "setInterval",
      "clearInterval",
      "setTimeout",
      "clearTimeout",
    ],
  });
  vi.setSystemTime(now);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
describe("workspace timer lifetime", () => {
  it("restores while running, pauses across time jumps, completes once and waits for a new start", () => {
    let view = show();
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByLabelText("Time").textContent).toBe("24:00");
    fireEvent.click(screen.getByRole("button", { name: "Focus" }));
    expect(screen.getByLabelText("Time").textContent).toBe("24:00");
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
    vi.setSystemTime(now + 3 * 60_000);
    view = show();
    expect(screen.getByLabelText("Time").textContent).toBe("22:00");
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    act(() => vi.setSystemTime(now + 3600_000));
    expect(screen.getByLabelText("Time").textContent).toBe("22:00");
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    act(() => vi.setSystemTime(now + 3600_000 + 22 * 60_000));
    fireEvent(document, new Event("visibilitychange"));
    expect(screen.getByLabelText("State").textContent).toBe("complete");
    expect(screen.getByLabelText("Count").textContent).toBe("1");
    expect(notify).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(60_000));
    expect(notify).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("State").textContent).toBe("complete");
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(screen.getByLabelText("Mode").textContent).toBe("short");
    expect(screen.getByLabelText("Time").textContent).toBe("05:00");
  });
  it("syncs tabs, counts the workspace day and remains usable without browser storage", () => {
    const timer = {
      ...startPomodoro(initialPomodoro("short"), now),
      focusCount: 2,
      focusHistory: [
        Date.parse("2026-11-16T15:59:00Z"),
        Date.parse("2026-11-16T16:01:00Z"),
      ],
    };
    localStorage.setItem(key, JSON.stringify({ version: 1, state: timer }));
    const view = show();
    expect(screen.getByLabelText("Count").textContent).toBe("1");
    localStorage.setItem(
      key,
      JSON.stringify({ version: 1, state: initialPomodoro("long") }),
    );
    fireEvent(window, new StorageEvent("storage", { key }));
    expect(screen.getByLabelText("Mode").textContent).toBe("long");
    view.unmount();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Unavailable");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Unavailable");
    });
    show();
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByLabelText("Time").textContent).toBe("24:59");
  });
});
