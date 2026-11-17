import type { Task, Project, Note, NoteTarget } from "../domain/model";
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
export function projectStage(project: Project): Exclude<Stage, "todo"> {
  return project.completedAt
    ? "done"
    : project.workStatus === "on_hold"
      ? "hold"
      : "progress";
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
  async function moveProject(project: Project, stage: Exclude<Stage, "todo">) {
    if (projectStage(project) === stage) return;
    if (stage === "done")
      return execute({ type: "project.complete", id: project.id });
    if (project.completedAt) {
      const result = await execute({ type: "project.reopen", id: project.id });
      project = result.snapshot.projects.find((p) => p.id === project.id)!;
    }
    const workStatus = stage === "hold" ? "on_hold" : "active";
    if ((project.workStatus || "active") !== workStatus)
      return execute({
        type: "project.update",
        id: project.id,
        expectedUpdatedAt: project.updatedAt,
        input: {
          title: project.title,
          description: project.description,
          icon: project.icon,
          tags: project.tags,
          workStatus,
        },
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
  async function rename(
    kind: "task" | "project" | "note",
    entity: Task | Project | Note,
    title: string,
  ) {
    if (kind === "task")
      return execute({
        type: "task.update",
        id: entity.id,
        expectedUpdatedAt: entity.updatedAt,
        patch: { title },
      });
    if (kind === "project") {
      const project = entity as Project;
      return execute({
        type: "project.update",
        id: project.id,
        expectedUpdatedAt: project.updatedAt,
        input: {
          title,
          description: project.description,
          icon: project.icon,
          tags: project.tags,
          workStatus: project.workStatus,
        },
      });
    }
    const note = entity as Note;
    const targets: NoteTarget[] = data.noteLinks
      .filter(
        (link) => link.noteId === note.id || link.targetNoteId === note.id,
      )
      .map((link) =>
        link.taskId
          ? { kind: "task", id: link.taskId }
          : link.projectId
            ? { kind: "project", id: link.projectId }
            : link.thoughtId
              ? { kind: "thought", id: link.thoughtId }
              : {
                  kind: "note",
                  id:
                    link.noteId === note.id ? link.targetNoteId! : link.noteId,
                },
      );
    return execute({
      type: "note.save",
      id: note.id,
      expectedUpdatedAt: note.updatedAt,
      input: { title, content: note.content, tags: note.tags || [], targets },
    });
  }
  const safely = (action: () => Promise<unknown>) => {
    void action().catch(() => {});
  };
  return { toggleTask, moveTask, moveProject, toggleHabit, rename, safely };
}
