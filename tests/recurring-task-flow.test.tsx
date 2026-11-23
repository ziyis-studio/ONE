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
