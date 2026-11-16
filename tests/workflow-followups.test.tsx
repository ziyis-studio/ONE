// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
import { createDemo, DEMO_KEY } from "../src/lib/demo";
import { addDays, dayKey, timeKey } from "../src/domain/time";
import { taskStage } from "../src/lib/actions";
import { readDate } from "./date-field-helpers";
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
  window.scrollTo = vi.fn();
  Element.prototype.scrollTo = vi.fn();
  vi.stubGlobal("DragEvent", window.MouseEvent);
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ current: { temperature_2m: 28, weather_code: 2 } }),
    ),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const saved = () => JSON.parse(localStorage.getItem(DEMO_KEY)!);
async function demo() {
  const state = createDemo(zone);
  localStorage.setItem(DEMO_KEY, JSON.stringify(state));
  render(<App />);
  await userEvent.click(
    await screen.findByRole("button", { name: "Explore ONE" }),
  );
  await screen.findByRole("heading", { name: "Today." });
  return state;
}
async function nav(name: string) {
  await userEvent.click(screen.getAllByRole("button", { name })[0]);
  await screen.findByRole("heading", {
    name: name === "Home" ? "Today." : name + ".",
    level: 1,
  });
}
describe("approved workspace follow-ups", () => {
  it("remembers task/project views and filters and the selected calendar date while navigating", async () => {
    await demo();
    await nav("Tasks");
    await userEvent.click(screen.getByRole("button", { name: "List" }));
    await userEvent.type(
      screen.getByRole("textbox", { name: "Find a task…" }),
      "Refine",
    );
    await nav("Projects");
    await userEvent.click(screen.getByRole("button", { name: "List" }));
    await userEvent.type(
      screen.getByRole("textbox", { name: "Find a project…" }),
      "Reading",
    );
    await nav("Schedule");
    const date = addDays(dayKey(new Date(), zone), 3);
    await userEvent.click(
      screen.getByRole("button", { name: "Open day " + date }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Hide task panel" }),
    );
    await nav("Home");
    await nav("Tasks");
    expect(
      screen.getByRole("button", { name: "List" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      (
        screen.getByRole("textbox", {
          name: "Find a task…",
        }) as HTMLInputElement
      ).value,
    ).toBe("Refine");
    await nav("Projects");
    expect(
      screen.getByRole("button", { name: "List" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      (
        screen.getByRole("textbox", {
          name: "Find a project…",
        }) as HTMLInputElement
      ).value,
    ).toBe("Reading");
    await nav("Schedule");
    expect(
      screen.getByRole("button", { name: "Day" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getByTestId("schedule-track").getAttribute("data-date")).toBe(
      date,
    );
    expect(
      screen.getByRole("button", { name: "Show task panel" }),
    ).toBeTruthy();
  });
  it("creates items directly in all four task columns and all three project columns", async () => {
    await demo();
    await nav("Tasks");
    for (const [stage, label] of [
      ["todo", "To do"],
      ["progress", "In progress"],
      ["hold", "On hold"],
      ["done", "Done"],
    ]) {
      await userEvent.click(
        screen.getByRole("button", { name: "Add task in " + label }),
      );
      const dialog = await screen.findByRole("dialog");
      expect(
        dialog.querySelector(".editor-status-fields .one-select-value")
          ?.textContent,
      ).toContain(label);
      await userEvent.type(
        within(dialog).getByRole("textbox", { name: "Title" }),
        "Column task " + stage,
      );
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Create task" }),
      );
      await waitFor(() =>
        expect(
          taskStage(
            saved().tasks.find(
              (t: { title: string }) => t.title === "Column task " + stage,
            ),
          ),
        ).toBe(stage),
      );
      await waitFor(() => expect(screen.queryByRole("dialog")).toBe(null));
    }
    await nav("Projects");
    for (const [stage, label] of [
      ["progress", "In motion"],
      ["hold", "On hold"],
      ["done", "Done"],
    ]) {
      await userEvent.click(
        screen.getByRole("button", { name: "Add project in " + label }),
      );
      const dialog = await screen.findByRole("dialog");
      expect(
        dialog.querySelector(".editor-status-fields .one-select-value")
          ?.textContent,
      ).toContain(label);
      await userEvent.type(
        within(dialog).getByRole("textbox", { name: "Title" }),
        "Column project " + stage,
      );
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Create project" }),
      );
      await waitFor(() => {
        const p = saved().projects.find(
          (p: { title: string }) => p.title === "Column project " + stage,
        );
        expect(
          p?.completedAt
            ? "done"
            : p?.workStatus === "on_hold"
              ? "hold"
              : "progress",
        ).toBe(stage);
      });
      await waitFor(() => expect(screen.queryByRole("dialog")).toBe(null));
    }
  }, 15000);
  it("never creates a Done task with unmet conditions, and keeps the draft for correction", async () => {
    const state = await demo();
    await nav("Tasks");
    await userEvent.click(
      screen.getByRole("button", { name: "Add task in Done" }),
    );
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(
      within(dialog).getByRole("textbox", { name: "Title" }),
      "Do not bypass conditions",
    );
    await userEvent.type(
      within(dialog).getByRole("textbox", { name: "New completion condition" }),
      "Check the result",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Create task" }),
    );
    expect((await within(dialog).findByRole("alert")).textContent).toContain(
      "completion condition",
    );
    expect(saved().tasks).toHaveLength(state.tasks.length);
    expect(
      (
        within(dialog).getByRole("textbox", {
          name: "Title",
        }) as HTMLInputElement
      ).value,
    ).toBe("Do not bypass conditions");
  });
  it("shows due-date tasks in month, week and day without creating time blocks", async () => {
    const state = await demo();
    const due = dayKey(new Date(), zone).slice(0, 8) + "22",
      task = state.tasks[0];
    // Edit through the actual task date field so the workspace remains authoritative.
    await nav("Tasks");
    await userEvent.click(
      screen.getByRole("button", { name: "Open task " + task.title }),
    );
    const { enterDate } = await import("./date-field-helpers");
    let dialog = await screen.findByRole("dialog");
    await enterDate(dialog, "Due date", due);
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Save changes" }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBe(null));
    await nav("Schedule");
    const cell = screen.getByRole("gridcell", { name: due });
    await userEvent.click(
      within(cell).getByRole("button", { name: `Due ${due}: ${task.title}` }),
    );
    dialog = await screen.findByRole("dialog");
    expect(readDate(dialog, "Due date")).toBe(due);
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Cancel" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Open day " + due }),
    );
    expect(
      within(screen.getByRole("group", { name: "Tasks due " + due })).getByRole(
        "button",
        { name: `Due ${due}: ${task.title}` },
      ),
    ).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Week" }));
    expect(
      screen.getByRole("group", { name: "Tasks due " + due }),
    ).toBeTruthy();
    expect(saved().timeBlocks).toEqual(state.timeBlocks);
  });
  it("drops a task straight into a saved timeline block, uses move feedback and prevents duplicate drops", async () => {
    const state = await demo(),
      task = state.tasks[0];
    await nav("Schedule");
    await userEvent.click(screen.getByRole("button", { name: "Day" }));
    const panel = screen.getByRole("complementary", {
      name: "Tasks to schedule",
    });
    const source = within(panel).getByRole("article", { name: task.title });
    const transfer = {
      types: ["text/one-task"],
      effectAllowed: "",
      dropEffect: "",
      setData: vi.fn(),
      getData: () => task.id,
    };
    fireEvent.dragStart(source, { dataTransfer: transfer });
    expect(transfer.effectAllowed).toBe("move");
    const track = screen.getByTestId("schedule-track");
    fireEvent.dragOver(track, { dataTransfer: transfer });
    expect(transfer.dropEffect).toBe("move");
    fireEvent.drop(track, { dataTransfer: transfer, clientY: 900 });
    await waitFor(() =>
      expect(saved().timeBlocks).toHaveLength(state.timeBlocks.length + 1),
    );
    expect(screen.queryByRole("dialog")).toBe(null);
    const block = saved().timeBlocks.at(-1);
    expect(timeKey(block.startsAt, zone)).toBe("15:00");
    expect(Date.parse(block.endsAt) - Date.parse(block.startsAt)).toBe(
      30 * 60000,
    );
    expect(block.title).toBe("");
    expect(saved().blockTaskLinks).toContainEqual({
      timeBlockId: block.id,
      taskId: task.id,
    });
    expect(saved().tasks).toEqual(state.tasks);
    await waitFor(() =>
      expect(document.querySelector(".schedule-create-preview")).toBe(null),
    );
    fireEvent.drop(track, { dataTransfer: transfer, clientY: 900 });
    await screen.findByText("This task is already planned here.");
    expect(saved().timeBlocks).toHaveLength(state.timeBlocks.length + 1);
  });
  it("defaults sleep to recent dates and remembers its range and selected day", async () => {
    const state = await demo();
    await nav("Sleep");
    expect(
      screen
        .getByRole("button", { name: "Last 30 days" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    const record = state.sleepRecords.at(-1)!,
      date = dayKey(record.endsAt, zone);
    await userEvent.click(
      document.querySelector<HTMLButtonElement>(
        `.heatmap-cell[data-date="${date}"]`,
      )!,
    );
    await userEvent.click(screen.getByRole("button", { name: "This month" }));
    await nav("Home");
    await nav("Sleep");
    expect(
      screen
        .getByRole("button", { name: "This month" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    await userEvent.click(screen.getByRole("button", { name: "Year" }));
    expect(document.querySelector(".one-sleep-period")).toBe(null);
    expect(Element.prototype.scrollTo).toHaveBeenCalled();
    expect(saved().sleepRecords).toEqual(state.sleepRecords);
  });
});
