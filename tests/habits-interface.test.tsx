// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
import { createDemo, DEMO_KEY } from "./support/demo";
import { habitRange } from "../src/lib/habit-history";
import { dayKey } from "../src/domain/time";
vi.mock("../src/lib/auth", () => ({
  signIn: vi.fn(),
  supabase: {
    auth: {
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null }),
    },
  },
}));
const zone = "Asia/Kuala_Lumpur";
beforeEach(() => {
  localStorage.clear();
  location.hash = "/";
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        current: {
          temperature_2m: 28,
          weather_code: 2,
          time: "2026-11-16T12:00",
        },
      }),
    ),
  );
  window.scrollTo = vi.fn();
  Element.prototype.scrollTo = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function saved() {
  return JSON.parse(localStorage.getItem(DEMO_KEY)!);
}
async function openHabits() {
  const state = createDemo(zone);
  localStorage.setItem(DEMO_KEY, JSON.stringify(state));
  render(<App />);
  await userEvent.click(
    await screen.findByRole("button", { name: "Explore ONE" }),
  );
  await screen.findByRole("heading", { name: "Today." });
  await userEvent.click(screen.getAllByRole("button", { name: "Habits" })[0]);
  await screen.findByRole("heading", { name: "Habits.", level: 1 });
  return { state, today: dayKey(new Date(), zone) };
}
describe("habit heatmap interaction", () => {
  it("changes between week, month, and rolling dates without writing new activity records", async () => {
    const { today } = await openHabits();
    const history = () =>
      screen.getByRole("group", {
        name: "Read a few pages completion history",
      });
    const before = saved().occurrences.length;
    expect(within(history()).getAllByRole("button")).toHaveLength(7);
    await userEvent.click(screen.getByRole("button", { name: "This month" }));
    expect(within(history()).getAllByRole("button")).toHaveLength(
      habitRange("month", today).days.length,
    );
    await userEvent.click(screen.getByRole("button", { name: "Last 30 days" }));
    expect(within(history()).getAllByRole("button")).toHaveLength(30);
    expect(saved().occurrences).toHaveLength(before);
    expect(screen.queryByRole("table")).toBe(null);
  });
  it("records and undoes a past planned day while retaining the actual completion date", async () => {
    const { state, today } = await openHabits();
    await userEvent.click(screen.getByRole("button", { name: "Last 30 days" }));
    const date = habitRange("30days", today).from;
    const habitId = state.habits[0].id;
    expect(
      saved().occurrences.some(
        (item: { habitId: string; plannedOn: string }) =>
          item.habitId === habitId && item.plannedOn === date,
      ),
    ).toBe(false);
    await userEvent.click(
      screen.getByRole("button", {
        name: "Complete Read a few pages for " + date,
      }),
    );
    const occurrence = () =>
      saved().occurrences.find(
        (item: { habitId: string; plannedOn: string }) =>
          item.habitId === habitId && item.plannedOn === date,
      );
    await waitFor(() =>
      expect(
        saved().executions.some(
          (item: { occurrenceId: string; performedOn: string }) =>
            item.occurrenceId === occurrence()?.id &&
            item.performedOn === today,
        ),
      ).toBe(true),
    );
    expect(occurrence().scheduledOn).toBe(date);
    await userEvent.click(
      screen.getByRole("button", { name: "Undo Read a few pages for " + date }),
    );
    await waitFor(() =>
      expect(
        saved().executions.some(
          (item: { occurrenceId: string }) =>
            item.occurrenceId === occurrence().id,
        ),
      ).toBe(false),
    );
    expect(occurrence().scheduledOn).toBe(date);
  });
});
