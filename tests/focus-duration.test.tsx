import { initialPomodoro } from "../src/lib/pomodoro";
// @vitest-environment jsdom
import { beforeEach, afterEach, test, expect, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
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
test("custom focus survives refresh, preserves an active deadline, applies the new choice after reset, and counts actual minutes", async () => {
  const old = initialPomodoro();
  const completedAt = start - 60000;
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
  await userEvent.click(
    screen.getByRole("button", { name: "Change focus duration" }),
  );
  let dialog = await screen.findByRole("dialog", { name: "Focus duration" });
  await userEvent.click(within(dialog).getByRole("button", { name: "45 min" }));
  await userEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
  expect(screen.getByRole("timer").textContent).toBe("45:00");
  fireEvent.click(screen.getByRole("button", { name: "Start Pomodoro" }));
  act(() => vi.advanceTimersByTime(60000));
  expect(screen.getByRole("timer").textContent).toBe("44:00");
  const oldDeadline = JSON.parse(localStorage.getItem(key)!).state.endsAt;
  await userEvent.click(
    screen.getByRole("button", { name: "Change focus duration" }),
  );
  dialog = await screen.findByRole("dialog", { name: "Focus duration" });
  await userEvent.click(within(dialog).getByRole("button", { name: "60 min" }));
  await userEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
  expect(screen.getByRole("timer").textContent).toBe("44:00");
  expect(JSON.parse(localStorage.getItem(key)!).state.endsAt).toBe(oldDeadline);
  view.unmount();
  view = show();
  expect(screen.getByRole("timer").textContent).toBe("44:00");
  expect(screen.getByText("Next focus: 60 min")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Reset Pomodoro" }));
  expect(screen.getByRole("timer").textContent).toBe("60:00");
  fireEvent.click(screen.getByRole("button", { name: "Start Pomodoro" }));
  act(() => vi.advanceTimersByTime(60 * 60000));
  expect(screen.getByText("2 sessions · 85m focus today")).toBeTruthy();
  expect(
    JSON.parse(localStorage.getItem(key)!).state.records.at(-1).durationSeconds,
  ).toBe(3600);
  fireEvent.click(screen.getByRole("button", { name: "Start short break" }));
  expect(screen.getByRole("timer").textContent).toBe("05:00");
});
test("invalid minutes and Cancel keep the prior duration", async () => {
  show();
  await userEvent.click(
    screen.getByRole("button", { name: "Change focus duration" }),
  );
  const dialog = await screen.findByRole("dialog", { name: "Focus duration" });
  const field = within(dialog).getByRole("spinbutton", { name: "Minutes" });
  for (const value of ["0", "181", "2.5", ""]) {
    fireEvent.change(field, { target: { value } });
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Apply" }),
    );
    expect(within(dialog).getByRole("alert").textContent).toContain("1 to 180");
  }
  await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  expect(screen.getByRole("timer").textContent).toBe("25:00");
});
