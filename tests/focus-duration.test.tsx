// @vitest-environment jsdom
import { initialPomodoro } from "../src/lib/pomodoro";
import { beforeEach, afterEach, test, expect, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PomodoroCard from "../src/components/PomodoroCard";
import { PomodoroProvider } from "../src/lib/pomodoro-context";
import { emptyWorkspace } from "../src/domain/model";
vi.mock("../src/lib/workspace", () => ({
  useOne: () => ({ data: emptyWorkspace(), edit: vi.fn() }),
}));
const start = Date.parse("2026-11-24T01:00:00Z"),
  key = "one-pomodoro-v1:demo";
const show = () =>
  render(
    <PomodoroProvider
      scope="demo"
      zone="Asia/Kuala_Lumpur"
      today="2026-11-24"
      notify={vi.fn()}
    >
      <PomodoroCard />
    </PomodoroProvider>,
  );
const saved = () => JSON.parse(localStorage.getItem(key)!).state;
const value = (next = false) =>
  screen.getByRole("spinbutton", {
    name: next ? "Next focus duration in minutes" : "Focus duration in minutes",
  });
async function enter(minutes: string, next = false) {
  await userEvent.click(value(next));
  fireEvent.change(value(next), { target: { value: minutes } });
  await userEvent.keyboard("{Enter}");
}
beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
  vi.setSystemTime(start);
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
test("the clock directly supports wheel, keyboard, typing and touch buttons within bounds, with no settings dialog", async () => {
  show();
  expect(
    screen.queryByRole("button", { name: "Change focus duration" }),
  ).toBeNull();
  expect(screen.queryByRole("dialog")).toBeNull();
  const wheel = (deltaY: number, extras = {}) =>
    fireEvent.wheel(value(), { deltaY, cancelable: true, ...extras });
  expect(wheel(-100)).toBe(false);
  expect(saved().focusMinutes).toBe(26);
  wheel(100, { shiftKey: true });
  expect(saved().focusMinutes).toBe(21);
  expect(wheel(-100, { ctrlKey: true })).toBe(true);
  expect(saved().focusMinutes).toBe(21);
  fireEvent.keyDown(value(), { key: "ArrowUp" });
  expect(saved().focusMinutes).toBe(22);
  fireEvent.keyDown(value(), { key: "ArrowDown", shiftKey: true });
  expect(saved().focusMinutes).toBe(17);
  await enter("45");
  expect(screen.getByRole("timer").textContent).toBe("45:00");
  await userEvent.click(
    screen.getByRole("button", { name: "Increase focus duration" }),
  );
  expect(saved().focusMinutes).toBe(46);
  fireEvent.keyDown(value(), { key: "End" });
  wheel(-100);
  expect(saved().focusMinutes).toBe(180);
  expect(
    (
      screen.getByRole("button", {
        name: "Increase focus duration",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.keyDown(value(), { key: "Home" });
  wheel(100);
  expect(saved().focusMinutes).toBe(1);
  expect(
    (
      screen.getByRole("button", {
        name: "Decrease focus duration",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});
test("custom focus survives refresh, preserves an active deadline, applies next duration after reset, and counts actual minutes", async () => {
  const old = initialPomodoro(),
    completedAt = start - 60000;
  old.focusCount = 1;
  old.focusHistory = [completedAt];
  old.records = [
    {
      id: crypto.randomUUID(),
      mode: "focus",
      startedAt: completedAt - 1500000,
      completedAt,
      durationSeconds: 1500,
    },
  ];
  localStorage.setItem(key, JSON.stringify({ version: 1, state: old }));
  let view = show();
  await enter("45");
  expect(screen.getByRole("timer").textContent).toBe("45:00");
  fireEvent.click(screen.getByRole("button", { name: "Start Pomodoro" }));
  act(() => vi.advanceTimersByTime(60000));
  expect(screen.getByRole("timer").textContent).toBe("44:00");
  const oldDeadline = saved().endsAt;
  await userEvent.click(
    screen.getByRole("button", { name: "Edit next focus duration" }),
  );
  fireEvent.change(value(true), { target: { value: "60" } });
  await userEvent.keyboard("{Enter}");
  expect(screen.getByRole("timer").textContent).toBe("44:00");
  expect(saved().endsAt).toBe(oldDeadline);
  fireEvent.wheel(
    screen.getByRole("button", { name: "Edit next focus duration" }),
    { deltaY: -100 },
  );
  expect(saved().focusMinutes).toBe(61);
  expect(saved().endsAt).toBe(oldDeadline);
  await enter("60", true);
  view.unmount();
  view = show();
  expect(screen.getByRole("timer").textContent).toBe("44:00");
  expect(value(true).getAttribute("aria-valuenow")).toBe("60");
  fireEvent.click(screen.getByRole("button", { name: "Reset Pomodoro" }));
  expect(screen.getByRole("timer").textContent).toBe("60:00");
  fireEvent.click(screen.getByRole("button", { name: "Start Pomodoro" }));
  act(() => vi.advanceTimersByTime(60 * 60000));
  expect(screen.getByText("2 sessions · 85m focus today")).toBeTruthy();
  expect(saved().records.at(-1).durationSeconds).toBe(3600);
  fireEvent.click(screen.getByRole("button", { name: "Start short break" }));
  expect(screen.getByRole("timer").textContent).toBe("05:00");
  expect(screen.queryByRole("spinbutton")).toBeNull();
});
test("invalid edits are rejected, Escape cancels, and valid blur saves without stealing focus", async () => {
  show();
  for (const raw of ["0", "181", "2.5", ""]) {
    await enter(raw);
    expect(screen.getByRole("alert").textContent).toContain("1 to 180");
    expect(saved().focusMinutes).toBe(25);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("alert")).toBeNull();
  }
  await userEvent.click(value());
  fireEvent.change(value(), { target: { value: "90" } });
  await userEvent.keyboard("{Escape}");
  expect(saved().focusMinutes).toBe(25);
  await userEvent.click(value());
  fireEvent.change(value(), { target: { value: "35" } });
  await userEvent.click(screen.getByRole("button", { name: "Start Pomodoro" }));
  expect(saved().durationSeconds).toBe(35 * 60);
  expect(saved().status).toBe("running");
});
