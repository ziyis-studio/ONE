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
import { addDays, dayKey } from "../src/domain/time";
import { enterTime, readTime, readDate } from "./date-field-helpers";
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
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
test("linked block count opens the log, themed time edits save, and returning keeps task/log drafts", async () => {
  const state = createDemo("Asia/Kuala_Lumpur"),
    task = state.tasks[0],
    block = state.timeBlocks[0];
  state.blockTaskLinks = state.blockTaskLinks.filter(
    (l) => l.taskId !== task.id,
  );
  state.blockTaskLinks.push({ taskId: task.id, timeBlockId: block.id });
  const next = {
    ...block,
    id: crypto.randomUUID(),
    title: "Evening preparation",
    startsAt: new Date(Date.now() + 86400000).toISOString(),
    endsAt: new Date(Date.now() + 90000000).toISOString(),
  };
  state.timeBlocks.push(next);
  state.blockTaskLinks.push({ taskId: task.id, timeBlockId: next.id });
  localStorage.setItem(DEMO_KEY, JSON.stringify(state));
  render(<App />);
  await userEvent.click(
    await screen.findByRole("button", { name: "Explore ONE" }),
  );
  await screen.findByRole("heading", { name: "Today." });
  await userEvent.click(
    screen.getAllByRole("button", { name: "Schedule" })[0],
  );
  await screen.findByRole("heading", { name: "Schedule." });
  await userEvent.click(
    screen.getByRole("button", {
      name: `View 2 linked blocks for ${task.title}`,
    }),
  );
  let dialog = await screen.findByRole("dialog", {}, { timeout: 5000 });
  const linked = await within(dialog).findByRole("button", {
    name: /Open linked block Evening preparation/,
  });
  await userEvent.clear(within(dialog).getByRole("textbox", { name: "Title" }));
  await userEvent.type(
    within(dialog).getByRole("textbox", { name: "Title" }),
    "Task draft kept",
  );
  await userEvent.type(
    within(dialog).getByRole("textbox", { name: "Write a log entry" }),
    "Unsent log kept",
  );
  await userEvent.click(linked);
  dialog = await screen.findByRole("dialog", { name: "EDIT TIME BLOCK" });
  expect(
    within(dialog).getByRole("button", { name: /Back to task/ }),
  ).toBeTruthy();
  const date = readDate(dialog, "Date");
  await enterTime(dialog, "Starts at", "23:45");
  await userEvent.click(within(dialog).getByRole("button", { name: "30 min" }));
  expect(readTime(dialog, "Ends at")).toBe("00:15");
  expect(readDate(dialog, "End date")).toBe(addDays(date, 1));
  await userEvent.clear(within(dialog).getByRole("textbox", { name: "Title" }));
  await userEvent.type(
    within(dialog).getByRole("textbox", { name: "Title" }),
    "Evening preparation moved",
  );
  await userEvent.click(
    within(dialog).getByRole("button", { name: "Save changes" }),
  );
  dialog = await screen.findByRole(
    "dialog",
    { name: "EDIT TASK" },
    { timeout: 5000 },
  );
  expect(
    (within(dialog).getByRole("textbox", { name: "Title" }) as HTMLInputElement)
      .value,
  ).toBe("Task draft kept");
  expect(
    (
      within(dialog).getByRole("textbox", {
        name: "Write a log entry",
      }) as HTMLTextAreaElement
    ).value,
  ).toBe("Unsent log kept");
  expect(
    await within(dialog).findByRole("button", {
      name: /Open linked block Evening preparation moved/,
    }),
  ).toBeTruthy();
  await waitFor(() => {
    const saved = JSON.parse(localStorage.getItem(DEMO_KEY)!);
    expect(
      dayKey(
        saved.timeBlocks.find((b: { id: string }) => b.id === next.id).endsAt,
        "Asia/Kuala_Lumpur",
      ),
    ).toBe(addDays(date, 1));
  });
}, 25000);
