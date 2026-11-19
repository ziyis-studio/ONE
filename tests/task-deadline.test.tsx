// @vitest-environment jsdom
import { useState } from "react";
import { beforeEach, afterEach, test, expect, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TaskDeadline from "../src/components/TaskDeadline";
import type { Task } from "../src/domain/model";
const mock = vi.hoisted(() => ({
  context: null as unknown,
  execute: vi.fn(),
  parent: vi.fn(),
}));
vi.mock("../src/lib/workspace", () => ({ useOne: () => mock.context }));
const task: Task = {
  id: "10000000-0000-4000-8000-000000000001",
  createdAt: "2026-11-19T01:00:00Z",
  updatedAt: "2026-11-19T01:00:00Z",
  title: "Exam",
  description: "Keep",
  projectId: null,
  completedAt: null,
  deadline: null,
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function Example({ fail = false }: { fail?: boolean }) {
  const [value, setValue] = useState(task);
  mock.context = { busy: false, today: "2026-11-19", execute: mock.execute };
  mock.execute.mockImplementation(async (cmd) => {
    if (fail) throw new Error("Offline");
    setValue((current) => ({ ...current, ...cmd.patch }));
    return {};
  });
  return (
    <div onClick={mock.parent}>
      <TaskDeadline task={value} />
    </div>
  );
}
test("calendar shortcut saves a civil due date, clears it, and never opens the task card", async () => {
  render(<Example />);
  await userEvent.click(
    screen.getByRole("button", { name: "Set due date for Exam" }),
  );
  let dialog = await screen.findByRole("dialog", { name: "Due date for Exam" });
  await userEvent.click(within(dialog).getByRole("button", { name: "Today" }));
  await waitFor(() =>
    expect(mock.execute).toHaveBeenCalledWith({
      type: "task.update",
      id: task.id,
      expectedUpdatedAt: task.updatedAt,
      patch: { deadline: "2026-11-19" },
    }),
  );
  expect(mock.parent).not.toHaveBeenCalled();
  await userEvent.click(
    screen.getByRole("button", { name: "Change due date for Exam" }),
  );
  dialog = await screen.findByRole("dialog", { name: "Due date for Exam" });
  await userEvent.click(within(dialog).getByRole("button", { name: "Clear" }));
  await waitFor(() =>
    expect(mock.execute).toHaveBeenLastCalledWith({
      type: "task.update",
      id: task.id,
      expectedUpdatedAt: task.updatedAt,
      patch: { deadline: null },
    }),
  );
  expect(mock.parent).not.toHaveBeenCalled();
  expect(
    screen.getByRole("button", { name: "Set due date for Exam" }),
  ).toBeTruthy();
});
test("a failed date write keeps the saved date unchanged", async () => {
  render(<Example fail />);
  await userEvent.click(
    screen.getByRole("button", { name: "Set due date for Exam" }),
  );
  await userEvent.click(
    within(await screen.findByRole("dialog")).getByRole("button", {
      name: "Today",
    }),
  );
  await waitFor(() => expect(mock.execute).toHaveBeenCalledTimes(1));
  expect(
    screen.getByRole("button", { name: "Set due date for Exam" }),
  ).toBeTruthy();
});
