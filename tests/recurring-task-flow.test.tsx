// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
import { createDemo, DEMO_KEY } from "./support/demo";
import { enterDate, enterTime } from "./date-field-helpers";
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
beforeEach(() => {
  localStorage.clear();
  location.hash = "/";
  window.scrollTo = vi.fn();
  Element.prototype.scrollTo = vi.fn();
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  localStorage.setItem(
    DEMO_KEY,
    JSON.stringify(createDemo("Asia/Kuala_Lumpur")),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const saved = () => JSON.parse(localStorage.getItem(DEMO_KEY)!);
async function pick(label: string, option: string) {
  await userEvent.click(
    screen.getByRole("button", { name: new RegExp(`\\b${label}$`) }),
  );
  await userEvent.click(await screen.findByRole("option", { name: option }));
}
test("creates monthly last-day tasks and linked timeline blocks, exposes independent instances and can stop the schedule", async () => {
  render(<App />);
  await userEvent.click(
    await screen.findByRole("button", { name: "Explore ONE" }),
  );
  await screen.findByRole("heading", { name: "Today." });
  const navigation = new Promise<void>((resolve) => {
    const listener = (e: HashChangeEvent) => {
      if (e.newURL.endsWith("#/tasks")) {
        window.removeEventListener("hashchange", listener);
        resolve();
      }
    };
    window.addEventListener("hashchange", listener);
  });
  await userEvent.click(screen.getAllByRole("button", { name: "Tasks" })[0]);
  await navigation;
  await screen.findByRole("heading", { name: "Tasks." });
  await userEvent.click(
    await screen.findByRole("button", { name: "New task" }),
  );
  let dialog = await screen.findByRole("dialog", undefined, { timeout: 10000 });
  await userEvent.type(
    within(dialog).getByRole("textbox", { name: "Title" }),
    "还网费",
  );
  await pick("Repeat", "Monthly");
  await enterDate(dialog, "Repeat starts", "2026-11-24");
  await pick("On", "Last day of the month");
  expect(within(dialog).getByText("Nov 30")).toBeTruthy();
  await userEvent.click(
    within(dialog).getByRole("checkbox", {
      name: "Add a time block for each occurrence",
    }),
  );
  await enterTime(dialog, "Repeat time", "20:30");
  await userEvent.click(
    within(dialog).getByRole("button", { name: "Create task" }),
  );
  await waitFor(() => expect(saved().taskRecurrences).toHaveLength(1));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  const s = saved(),
    series = s.taskRecurrences[0],
    tasks = s.tasks.filter((t: any) => t.recurrenceId === series.id);
  expect(tasks.map((t: any) => t.deadline)).toEqual([
    "2026-11-30",
    "2026-12-31",
  ]);
  expect(series.rule.time).toBe("20:30");
  expect(
    tasks.every((t: any) =>
      s.blockTaskLinks.some((l: any) => l.taskId === t.id),
    ),
  ).toBe(true);
  await userEvent.click(
    screen.getByRole("button", { name: "Repeat schedules" }),
  );
  const manager = screen.getByRole("region", { name: "Repeat schedules" });
  expect(within(manager).getByRole("heading", { name: "还网费" })).toBeTruthy();
  await userEvent.click(
    within(manager).getByRole("button", { name: "Stop repeating" }),
  );
  dialog = await screen.findByRole("alertdialog");
  await userEvent.click(
    within(dialog).getByRole("button", { name: "Stop repeating" }),
  );
  await waitFor(() => expect(saved().taskRecurrences[0].active).toBe(false));
  expect(
    saved().tasks.filter((t: any) => t.recurrenceId === series.id),
  ).toHaveLength(2);
}, 30000);

test("repeat rules survive editor draft dismissal and restoration", async () => {
  render(<App />);
  await userEvent.click(
    await screen.findByRole("button", { name: "Explore ONE" }),
  );
  await screen.findByRole("heading", { name: "Today." });
  const navigation = new Promise<void>((resolve) => {
    const listener = (e: HashChangeEvent) => {
      if (e.newURL.endsWith("#/tasks")) {
        window.removeEventListener("hashchange", listener);
        resolve();
      }
    };
    window.addEventListener("hashchange", listener);
  });
  await userEvent.click(screen.getAllByRole("button", { name: "Tasks" })[0]);
  await navigation;
  await screen.findByRole("heading", { name: "Tasks." });
  await userEvent.click(
    await screen.findByRole("button", { name: "New task" }),
  );
  let dialog = await screen.findByRole("dialog", undefined, { timeout: 10000 });
  await userEvent.type(
    within(dialog).getByRole("textbox", { name: "Title" }),
    "Weekly review",
  );
  await pick("Repeat", "Weekly");
  await userEvent.click(
    within(dialog).getByRole("button", { name: "Close dialog" }),
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await screen.findByRole("heading", { name: "Tasks." });
  await userEvent.click(
    await screen.findByRole("button", { name: "New task" }),
  );
  dialog = await screen.findByRole("dialog", undefined, { timeout: 10000 });

  expect(
    within(dialog).getByRole("button", {
      name: /Weekly.*Repeat|Repeat.*Weekly/,
    }),
  ).toBeTruthy();
}, 20000);

test("clears a stopped daily testing series and its time blocks from the manager, supports cancellation and Undo", async () => {
  const { applyCommand } = await import("./support/domain/commands");
  const base = createDemo("Asia/Kuala_Lumpur");
  const created = applyCommand(base, {
    type: "task.create",
    input: {
      title: "testing",
      recurrence: {
        frequency: "daily",
        interval: 1,
        startsOn: "2026-11-24",
        endsOn: "2026-11-27",
        monthDay: 24,
        time: "09:00",
        duration: 30,
        timeZone: "Asia/Kuala_Lumpur",
      },
    },
  }).snapshot;
  const series = created.taskRecurrences[0],
    before = applyCommand(created, {
      type: "task.recurrence.stop",
      id: series.id,
      expectedUpdatedAt: series.updatedAt,
    }).snapshot;
  const taskIds = before.tasks
      .filter((t) => t.recurrenceId === series.id)
      .map((t) => t.id),
    blockIds = before.blockTaskLinks
      .filter((l) => taskIds.includes(l.taskId))
      .map((l) => l.timeBlockId);
  localStorage.setItem(DEMO_KEY, JSON.stringify(before));
  render(<App />);
  await userEvent.click(
    await screen.findByRole("button", { name: "Explore ONE" }),
  );
  await screen.findByRole("heading", { name: "Today." });
  const navigation = new Promise<void>((resolve) => {
    const listener = (e: HashChangeEvent) => {
      if (e.newURL.endsWith("#/tasks")) {
        window.removeEventListener("hashchange", listener);
        resolve();
      }
    };
    window.addEventListener("hashchange", listener);
  });
  await userEvent.click(screen.getAllByRole("button", { name: "Tasks" })[0]);
  await navigation;
  await userEvent.click(
    await screen.findByRole("button", { name: "Repeat schedules" }),
  );
  let manager = screen.getByRole("region", { name: "Repeat schedules" });
  await userEvent.click(
    within(manager).getByRole("button", { name: "Delete entire series" }),
  );
  let confirmation = await screen.findByRole("alertdialog");
  expect(within(confirmation).getByText(/all 4 occurrences/)).toBeTruthy();
  await userEvent.click(
    within(confirmation).getByRole("button", { name: "Cancel" }),
  );
  expect(saved().tasks.filter((t: any) => taskIds.includes(t.id))).toHaveLength(
    4,
  );
  await userEvent.click(
    within(manager).getByRole("button", { name: "Delete entire series" }),
  );
  confirmation = await screen.findByRole("alertdialog");
  await userEvent.click(
    within(confirmation).getByRole("button", { name: "Delete entire series" }),
  );
  await waitFor(() => expect(saved().taskRecurrences).toHaveLength(0));
  expect(saved().tasks.some((t: any) => taskIds.includes(t.id))).toBe(false);
  expect(saved().timeBlocks.some((b: any) => blockIds.includes(b.id))).toBe(
    false,
  );
  expect(saved().tasks).toHaveLength(base.tasks.length);
  await userEvent.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(saved().taskRecurrences).toHaveLength(1));
  expect(saved().tasks.filter((t: any) => taskIds.includes(t.id))).toHaveLength(
    4,
  );
  expect(
    saved().timeBlocks.filter((b: any) => blockIds.includes(b.id)),
  ).toHaveLength(4);
}, 25000);
