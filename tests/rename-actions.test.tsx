// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useActions } from "../src/lib/actions";
import { createDemo } from "../src/lib/demo";
import { applyCommand } from "../src/domain/commands";
import type { Command } from "../src/domain/commands";
import type { Workspace } from "../src/domain/model";
const context = vi.hoisted(() => ({ value: null as unknown }));
vi.mock("../src/lib/workspace", () => ({ useOne: () => context.value }));
afterEach(cleanup);
function actions(state: Workspace) {
  let snapshot = state;
  const execute = vi.fn(async (command: Command) => {
    const result = applyCommand(snapshot, command);
    snapshot = result.snapshot;
    return result;
  });
  context.value = { data: state, execute, today: "2026-11-16", edit: vi.fn() };
  const hook = renderHook(() => useActions());
  return { ...hook, execute, saved: () => snapshot };
}
describe("inline rename commands", () => {
  it("renames a task without changing its conditions, schedule or project", async () => {
    const state = createDemo("Asia/Kuala_Lumpur"),
      task = state.tasks[0],
      hook = actions(state);
    await act(async () => {
      await hook.result.current.rename("task", task, "New task title");
    });
    expect(hook.execute).toHaveBeenCalledWith({
      type: "task.update",
      id: task.id,
      expectedUpdatedAt: task.updatedAt,
      patch: { title: "New task title" },
    });
    const renamed = hook.saved().tasks.find((item) => item.id === task.id)!;
    expect(renamed.projectId).toBe(task.projectId);
    expect(renamed.description).toBe(task.description);
    expect(hook.saved().conditions).toEqual(state.conditions);
    expect(hook.saved().blockTaskLinks).toEqual(state.blockTaskLinks);
  });
  it("preserves a project's full metadata when its title changes", async () => {
    const state = createDemo("Asia/Kuala_Lumpur"),
      project = state.projects[0],
      hook = actions(state);
    await act(async () => {
      await hook.result.current.rename("project", project, "New project title");
    });
    const renamed = hook
      .saved()
      .projects.find((item) => item.id === project.id)!;
    expect(renamed).toMatchObject({
      title: "New project title",
      description: project.description,
      icon: project.icon,
      tags: project.tags,
      workStatus: project.workStatus,
    });
    expect(hook.saved().tasks).toEqual(state.tasks);
  });
  it("preserves note content, tags and every incoming and outgoing link", async () => {
    let state = createDemo("Asia/Kuala_Lumpur");
    const note = state.notes[0],
      other = state.notes[1];
    state = applyCommand(state, {
      type: "note.save",
      id: note.id,
      expectedUpdatedAt: note.updatedAt,
      input: {
        title: note.title,
        content: note.content,
        tags: note.tags,
        targets: [
          { kind: "task", id: state.tasks[0].id },
          { kind: "project", id: state.projects[0].id },
          { kind: "thought", id: state.thoughts[0].id },
          { kind: "note", id: other.id },
        ],
      },
    }).snapshot;
    // Rename the other end of the note-to-note relationship.
    const current = state.notes.find((item) => item.id === other.id)!,
      hook = actions(state);
    await act(async () => {
      await hook.result.current.rename("note", current, "Renamed linked note");
    });
    expect(hook.saved().noteLinks).toEqual(state.noteLinks);
    expect(
      hook.saved().notes.find((item) => item.id === other.id),
    ).toMatchObject({
      title: "Renamed linked note",
      content: other.content,
      tags: other.tags,
    });
  });
});
