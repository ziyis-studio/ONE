// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
import { readDate } from "./date-field-helpers";
import { createDemo, DEMO_KEY } from "../src/lib/demo";
import { addDays, dayKey, timeKey } from "../src/domain/time";
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
          temperature_2m: 28.4,
          weather_code: 2,
          time: "2026-11-16T12:00",
        },
      }),
    ),
  );
  class TestPointerEvent extends window.MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId || 1;
    }
  }
  vi.stubGlobal("PointerEvent", TestPointerEvent);
  window.scrollTo = vi.fn();
  Element.prototype.scrollTo = vi.fn();
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => true);
  Element.prototype.releasePointerCapture = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
async function demo() {
  const state = createDemo(zone);
  state.blockTaskLinks.push({
    timeBlockId: state.timeBlocks[0].id,
    taskId: state.tasks[0].id,
  });
  state.blockOccurrenceLinks.push({
    timeBlockId: state.timeBlocks[0].id,
    occurrenceId: state.occurrences[0].id,
  });
  localStorage.setItem(DEMO_KEY, JSON.stringify(state));
  const result = render(<App />);
  await userEvent.click(
    await screen.findByRole("button", { name: "Explore ONE" }),
  );
  await screen.findByRole("heading", { name: "Today." });
  return { ...result, state };
}
async function openSchedule() {
  const result = await demo();
  await userEvent.click(screen.getAllByRole("button", { name: "Schedule" })[0]);
  await screen.findByRole("heading", { name: "Schedule.", level: 1 });
  return result;
}
async function openDay() {
  const result = await openSchedule();
  await userEvent.click(screen.getByRole("button", { name: "Day" }));
  const track = await screen.findByTestId("schedule-track");
  vi.spyOn(track, "getBoundingClientRect").mockReturnValue({
    top: 0,
    left: 0,
    bottom: 1440,
    right: 600,
    height: 1440,
    width: 600,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  return { ...result, track };
}
function saved() {
  return JSON.parse(localStorage.getItem(DEMO_KEY)!);
}
describe("calendar and history interactions", () => {
  it("puts the live time/weather card first in the dashboard", async () => {
    const { container } = await demo();
    expect(
      container.querySelector(".dashboard-grid > section h2")?.textContent,
    ).toBe("Time & weather");
    expect(await screen.findByText("Partly cloudy")).toBeTruthy();
    expect(screen.getByText("28°")).toBeTruthy();
  });
  it("starts with month view and moves a block to another date without losing links or duration", async () => {
    const { state } = await openSchedule();
    expect(
      screen
        .getByRole("button", { name: "Month" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    const targetDay = addDays(dayKey(state.timeBlocks[0].startsAt, zone), 1);
    const transfer = new Map<string, string>();
    const dataTransfer = {
      setData: (key: string, value: string) => transfer.set(key, value),
      getData: (key: string) => transfer.get(key),
      effectAllowed: "",
    };
    const event = screen.getByText("A little deep work").closest("button")!;
    fireEvent.dragStart(event, { dataTransfer });
    fireEvent.drop(screen.getByRole("gridcell", { name: targetDay }), {
      dataTransfer,
    });
    await waitFor(() =>
      expect(dayKey(saved().timeBlocks[0].startsAt, zone)).toBe(targetDay),
    );
    const next = saved();
    expect(timeKey(next.timeBlocks[0].startsAt, zone)).toBe("09:00");
    expect(
      Date.parse(next.timeBlocks[0].endsAt) -
        Date.parse(next.timeBlocks[0].startsAt),
    ).toBe(90 * 60_000);
    expect(next.blockTaskLinks).toEqual(state.blockTaskLinks);
    expect(next.blockOccurrenceLinks).toEqual(state.blockOccurrenceLinks);
  });
  it("creates an editable range by dragging empty timeline space", async () => {
    const { track } = await openDay();
    fireEvent.pointerDown(track, { pointerId: 1, button: 0, clientY: 1140 });
    fireEvent.pointerMove(track, { pointerId: 1, clientY: 1200 });
    fireEvent.pointerUp(track, { pointerId: 1, clientY: 1200 });
    const dialog = await screen.findByRole("dialog");
    expect(readDate(dialog, "Starts at", true)).toMatch(/T19:00$/);
    expect(readDate(dialog, "Ends at", true)).toMatch(/T20:00$/);
    await userEvent.type(
      within(dialog).getByRole("textbox", { name: "Title" }),
      "New timeline block",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Create time block" }),
    );
    await waitFor(() =>
      expect(
        saved().timeBlocks.some(
          (block: { title: string }) => block.title === "New timeline block",
        ),
      ).toBe(true),
    );
  });
  it("moves and resizes timeline blocks in 15-minute increments", async () => {
    const { track } = await openDay();
    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Move or edit A little deep work" }),
      { pointerId: 2, button: 0, clientY: 560 },
    );
    fireEvent.pointerMove(track, { pointerId: 2, clientY: 620 });
    fireEvent.pointerUp(track, { pointerId: 2, clientY: 620 });
    await waitFor(() =>
      expect(timeKey(saved().timeBlocks[0].startsAt, zone)).toBe("10:00"),
    );
    expect(timeKey(saved().timeBlocks[0].endsAt, zone)).toBe("11:30");
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: "Resize A little deep work",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Resize A little deep work" }),
      { pointerId: 3, button: 0, clientY: 690 },
    );
    fireEvent.pointerMove(track, { pointerId: 3, clientY: 720 });
    fireEvent.pointerUp(track, { pointerId: 3, clientY: 720 });
    await waitFor(() =>
      expect(timeKey(saved().timeBlocks[0].endsAt, zone)).toBe("12:00"),
    );
  });
  it("cancels a timeline drag with Escape without writing changes", async () => {
    const { track, state } = await openDay();
    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Move or edit A little deep work" }),
      { pointerId: 4, button: 0, clientY: 560 },
    );
    fireEvent.pointerMove(track, { pointerId: 4, clientY: 620 });
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.pointerUp(track, { pointerId: 4, clientY: 620 });
    expect(saved().timeBlocks).toEqual(state.timeBlocks);
  });
  it("replaces sleep history with a date heatmap and opens the selected record", async () => {
    const { container, state } = await demo();
    await userEvent.click(screen.getAllByRole("button", { name: "Sleep" })[0]);
    await screen.findByRole("heading", { name: "Sleep.", level: 1 });
    expect(
      screen.getByRole("region", { name: "Sleep history heatmap" }),
    ).toBeTruthy();
    expect(screen.queryByRole("table")).toBe(null);
    const record = state.sleepRecords.at(-1)!;
    const date = dayKey(record.endsAt, zone);
    await userEvent.click(
      container.querySelector<HTMLButtonElement>(
        '.heatmap-cell[data-date="' + date + '"]',
      )!,
    );
    await userEvent.click(
      container.querySelector<HTMLButtonElement>(".sleep-entry")!,
    );
    const dialog = await screen.findByRole("dialog");
    expect(readDate(dialog, "Fell asleep", true)).toBe(
      dayKey(record.startsAt, zone) + "T" + timeKey(record.startsAt, zone),
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Cancel" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Add entry" }));
    expect(readDate(await screen.findByRole("dialog"), "Woke up", true)).toBe(
      date + "T07:00",
    );
  });
});
