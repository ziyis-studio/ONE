import { describe, it, expect } from "vitest";
import { createDemo } from "../src/lib/demo";
import { applyCommand } from "../src/domain/commands";
describe("explicit offline sample", () => {
  it("creates a valid complete workspace using real domain commands", () => {
    const state = createDemo("Asia/Kuala_Lumpur");
    expect(state.tasks).toHaveLength(4);
    expect(state.habits).toHaveLength(3);
    expect(state.notes).toHaveLength(3);
    for (const entity of [...state.tasks, ...state.projects, ...state.habits])
      expect(entity.id).toMatch(/^[0-9a-f-]{36}$/);
    const task = state.tasks.find((t) =>
      state.conditions.some((c) => c.taskId === t.id),
    )!;
    expect(() =>
      applyCommand(state, { type: "task.complete", id: task.id }),
    ).toThrow("completion condition");
    expect(task.completedAt).toBe(null);
  });
  it("keeps planned habit dates intact when completion is recorded on another day", () => {
    const state = createDemo("Asia/Kuala_Lumpur");
    const occurrence = state.occurrences.find(
      (o) => !state.executions.some((e) => e.occurrenceId === o.id),
    )!;
    const next = applyCommand(state, {
      type: "execution.record",
      occurrenceId: occurrence.id,
      performedOn: "2026-11-16",
    }).snapshot;
    expect(
      next.occurrences.find((o) => o.id === occurrence.id)?.scheduledOn,
    ).toBe(occurrence.scheduledOn);
    expect(
      next.executions.find((e) => e.occurrenceId === occurrence.id)
        ?.performedOn,
    ).toBe("2026-11-16");
  });
});
