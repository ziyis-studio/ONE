// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Workspace } from "../src/domain/model";
import ScheduleTasks from "../src/components/ScheduleTasks";
import { ViewStateProvider } from "../src/lib/view-state";
import { createDemo } from "./support/demo";

let data: Workspace;
const now = new Date("2026-11-26T04:00:00Z");
const edit = vi.fn(),
  onPlan = vi.fn();
vi.mock("../src/lib/workspace", () => ({
  useOne: () => ({ data, edit, busy: false, now }),
}));
beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  data = createDemo("Asia/Kuala_Lumpur");
  const task = data.tasks[0],
    project = data.projects[0].id,
    other = data.projects[1].id;
  data.tasks = [
    {
      ...task,
      id: "personal",
      title: "Personal task",
      projectId: null,
      startedAt: null,
      completedAt: null,
    },
    {
      ...task,
      id: "past",
      title: "Past planning",
      projectId: project,
      startedAt: now.toISOString(),
      completedAt: null,
    },
    {
      ...task,
      id: "planned",
      title: "Upcoming work",
      projectId: project,
      workStatus: "on_hold",
      completedAt: null,
    },
    {
      ...task,
      id: "recorded",
      title: "Recorded focus",
      projectId: other,
      startedAt: null,
      completedAt: null,
    },
    {
      ...task,
      id: "done",
      title: "Already done",
      completedAt: now.toISOString(),
    },
    {
      ...task,
      id: "future",
      title: "Tomorrow repeat",
      recurrenceId: "repeat",
      deadline: "2026-11-27",
      scheduledOn: "2026-11-27",
      completedAt: null,
    },
    {
      ...task,
      id: "today",
      title: "Today repeat",
      recurrenceId: "repeat",
      deadline: "2026-11-26",
      scheduledOn: "2026-11-26",
      startedAt: null,
      completedAt: null,
    },
  ];
  const block = data.timeBlocks[0];
  data.timeBlocks = [
    {
      ...block,
      id: "past-block",
      startsAt: "2026-11-26T02:00:00Z",
      endsAt: "2026-11-26T03:00:00Z",
    },
    {
      ...block,
      id: "future-block",
      startsAt: "2026-11-26T05:00:00Z",
      endsAt: "2026-11-26T06:00:00Z",
    },
    {
      ...block,
      id: "focus-block",
      startsAt: "2026-11-26T03:00:00Z",
      endsAt: "2026-11-26T03:25:00Z",
      recordedType: "focus",
    },
  ];
  data.blockTaskLinks = [
    { taskId: "past", timeBlockId: "past-block" },
    { taskId: "planned", timeBlockId: "future-block" },
    { taskId: "recorded", timeBlockId: "focus-block" },
    { taskId: "personal", timeBlockId: "missing-block" },
  ];
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
const names = () =>
  screen
    .queryAllByRole("article")
    .map((node) => node.getAttribute("aria-label"));
async function choose(label: string, option: string) {
  const group = screen.getByRole("group", { name: "Task filters" });
  await userEvent.click(
    within(group).getByRole("button", { name: new RegExp(` ${label}$`) }),
  );
  await userEvent.click(
    await screen.findByRole("option", { name: option }),
  );
}
function Panel() {
  return <ScheduleTasks selected="2026-11-26" onPlan={onPlan} />;
}
function open() {
  return render(
    <ViewStateProvider>
      <Panel />
    </ViewStateProvider>,
  );
}
async function filters() {
  await userEvent.click(screen.getByRole("button", { name: /^Filter tasks/ }));
}

describe("Schedule task filters", () => {
  it("combines project, status, scheduling and search, then clears an empty result without changing data", async () => {
    const original = structuredClone(data);
    open();
    expect(names()).toEqual([
      "Personal task",
      "Past planning",
      "Upcoming work",
      "Recorded focus",
      "Today repeat",
    ]);
    expect(screen.queryByRole("group", { name: "Task filters" })).toBe(null);
    await filters();
    await choose("Project", data.projects[0].title);
    await choose("Task status", "In progress");
    expect(names()).toEqual(["Past planning"]);
    await choose("Scheduling", "Previous blocks only");
    expect(names()).toEqual(["Past planning"]);
    expect(
      screen.getByRole("button", { name: "Filter tasks, 3 active" }),
    ).toBeTruthy();
    expect(screen.getByRole("status").getAttribute("aria-label")).toBe(
      "1 of 5 open tasks shown",
    );
    await userEvent.type(
      screen.getByRole("textbox", { name: "Find tasks to schedule" }),
      "not here",
    );
    expect(names()).toEqual([]);
    expect(screen.getByText("No matching tasks")).toBeTruthy();
    await userEvent.click(
      screen.getByRole("button", { name: "Clear search and filters" }),
    );
    expect(names()).toHaveLength(5);
    expect(
      (
        screen.getByRole("textbox", {
          name: "Find tasks to schedule",
        }) as HTMLInputElement
      ).value,
    ).toBe("");
    expect(data).toEqual(original);
  });
  it("distinguishes upcoming plans from past/focus history, and keeps linked history and planning actions usable", async () => {
    open();
    await filters();
    await choose("Scheduling", "Unscheduled");
    expect(names()).toEqual([
      "Personal task",
      "Past planning",
      "Recorded focus",
      "Today repeat",
    ]);
    await choose("Scheduling", "Previous blocks only");
    expect(names()).toEqual(["Past planning", "Recorded focus"]);
    await userEvent.click(
      screen.getByRole("button", {
        name: "View 1 linked block for Past planning",
      }),
    );
    expect(edit).toHaveBeenCalledWith({ kind: "task", id: "past" });
    await userEvent.click(
      screen.getByRole("button", { name: "Schedule Past planning" }),
    );
    expect(onPlan).toHaveBeenCalledWith("past", "2026-11-26");
    await choose("Scheduling", "Planned");
    expect(names()).toEqual(["Upcoming work"]);
    await userEvent.click(
      screen.getByRole("button", { name: "Plan Upcoming work" }),
    );
    expect(onPlan).toHaveBeenLastCalledWith("planned", "2026-11-26");
    await userEvent.click(
      screen.getByRole("button", { name: "Reset filters" }),
    );
    await choose("Project", "Personal");
    expect(names()).toEqual(["Personal task"]);
    expect(
      screen.queryByRole("button", { name: /linked block for Personal task/ }),
    ).toBe(null);
  });
  it("remembers filters within the visit and reacts when a task's last upcoming block ends", async () => {
    function Visit({ show }: { show: boolean }) {
      return <ViewStateProvider>{show && <Panel />}</ViewStateProvider>;
    }
    const result = render(<Visit show />);
    await filters();
    await choose("Task status", "On hold");
    await choose("Scheduling", "Planned");
    expect(names()).toEqual(["Upcoming work"]);
    await filters();
    result.rerender(<Visit show={false} />);
    result.rerender(<Visit show />);
    expect(names()).toEqual(["Upcoming work"]);
    expect(
      screen
        .getByRole("button", { name: "Filter tasks, 2 active" })
        .getAttribute("aria-expanded"),
    ).toBe("false");
    data = {
      ...data,
      timeBlocks: data.timeBlocks.map((b) =>
        b.id === "future-block"
          ? {
              ...b,
              startsAt: "2026-11-26T01:00:00Z",
              endsAt: "2026-11-26T02:00:00Z",
            }
          : b,
      ),
    };
    result.rerender(<Visit show />);
    expect(names()).toEqual([]);
    await filters();
    await choose("Scheduling", "Previous blocks only");
    expect(names()).toEqual(["Upcoming work"]);
  });
});
