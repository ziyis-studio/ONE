import type { Task } from "../domain/model";
import { useOne } from "./workspace";
export const stages = [
  { id: "todo", title: "To do", color: "neutral" },
  { id: "progress", title: "In progress", color: "purple" },
  { id: "hold", title: "On hold", color: "sand" },
  { id: "done", title: "Done", color: "green" },
] as const;
export type Stage = (typeof stages)[number]["id"];
export function taskStage(task: Task): Stage {
  return task.completedAt
    ? "done"
    : task.workStatus === "on_hold"
      ? "hold"
      : task.startedAt
        ? "progress"
        : "todo";
}
export function useActions() {
  const { execute, data, today, edit } = useOne();
  async function toggleTask(task: Task) {
    if (
      !task.completedAt &&
      data.conditions.some((c) => c.taskId === task.id && !c.isMet)
    ) {
      edit({ kind: "task", id: task.id });
      return;
    }
    await execute({
      type: task.completedAt ? "task.reopen" : "task.complete",
      id: task.id,
      expectedUpdatedAt: task.updatedAt,
    });
  }
  async function moveTask(task: Task, stage: Stage) {
    if (taskStage(task) === stage) return;
    if (stage === "done") {
      await execute({
        type: "task.complete",
        id: task.id,
        expectedUpdatedAt: task.updatedAt,
      });
      return;
    }
    if (stage === "hold") {
      if (task.completedAt) {
        const result = await execute({
          type: "task.reopen",
          id: task.id,
          expectedUpdatedAt: task.updatedAt,
        });
        task = result.snapshot.tasks.find((t) => t.id === task.id)!;
      }
      await execute({
        type: "task.update",
        id: task.id,
        expectedUpdatedAt: task.updatedAt,
        patch: { workStatus: "on_hold" },
      });
      return;
    }
    if (task.workStatus === "on_hold") {
      const result = await execute({
        type: "task.update",
        id: task.id,
        expectedUpdatedAt: task.updatedAt,
        patch: { workStatus: "active" },
      });
      task = result.snapshot.tasks.find((t) => t.id === task.id)!;
    }
    await execute({
      type: stage === "todo" ? "task.reopen" : "task.continue",
      id: task.id,
      expectedUpdatedAt: task.updatedAt,
    });
  }
  async function toggleHabit(occurrenceId: string) {
    const execution = data.executions.find(
      (e) => e.occurrenceId === occurrenceId,
    );
    await execute(
      execution
        ? {
            type: "execution.delete",
            id: execution.id,
            expectedUpdatedAt: execution.updatedAt,
          }
        : { type: "execution.record", occurrenceId, performedOn: today },
    );
  }
  const safely = (action: () => Promise<unknown>) => {
    void action().catch(() => {});
  };
  return { toggleTask, moveTask, toggleHabit, safely };
}
