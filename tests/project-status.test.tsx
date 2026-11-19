// @vitest-environment jsdom
import { afterEach, test, expect, vi } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useActions, projectStage } from "../src/lib/actions";
import { emptyWorkspace } from "../src/domain/model";
import type { Workspace } from "../src/domain/model";
import { applyCommand } from "./support/domain/commands";
import type { Command } from "./support/domain/commands";
const mock = vi.hoisted(() => ({ context: null as unknown }));
vi.mock("../src/lib/workspace", () => ({ useOne: () => mock.context }));
afterEach(cleanup);
function fixture() {
  let state = applyCommand(emptyWorkspace(), {
    type: "project.create",
    input: {
      title: "Renovation",
      description: "Keep metadata",
      icon: "home",
      tags: ["Personal"],
      initialStage: "hold",
    },
  }).snapshot;
  const execute = vi.fn(async (command: Command) => {
    const result = applyCommand(state, command);
    state = result.snapshot;
    return result;
  });
  mock.context = { data: state, execute, today: "2026-11-17", edit: vi.fn() };
  const hook = renderHook(() => useActions());
  return {
    hook,
    execute,
    get: () => state,
    replace: (s: Workspace) => {
      state = s;
    },
  };
}
test("project status supports hold, done and reopening into progress while preserving metadata", async () => {
  const f = fixture(),
    original = f.get().projects[0];
  await act(async () => {
    await f.hook.result.current.moveProject(original, "done");
  });
  expect(projectStage(f.get().projects[0])).toBe("done");
  await act(async () => {
    await f.hook.result.current.moveProject(f.get().projects[0], "progress");
  });
  expect(projectStage(f.get().projects[0])).toBe("progress");
  expect(f.get().projects[0]).toMatchObject({
    title: original.title,
    description: original.description,
    icon: original.icon,
    tags: original.tags,
    workStatus: "active",
  });
  await act(async () => {
    await f.hook.result.current.moveProject(f.get().projects[0], "hold");
  });
  expect(projectStage(f.get().projects[0])).toBe("hold");
  expect(f.get().tasks).toEqual([]);
});
test("project completion still requires all tasks complete and leaves status unchanged on failure", async () => {
  const f = fixture(),
    project = f.get().projects[0];
  f.replace(
    applyCommand(f.get(), {
      type: "task.create",
      input: { title: "A step", projectId: project.id, description: "" },
    }).snapshot,
  );
  await expect(
    f.hook.result.current.moveProject(project, "done"),
  ).rejects.toThrow(/every task/);
  expect(projectStage(f.get().projects[0])).toBe("hold");
  expect(f.get().tasks[0].completedAt).toBeNull();
});
