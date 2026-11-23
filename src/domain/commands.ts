import type { Entity, Workspace, NoteTarget } from "./model";
import type { DatabaseField, DatabaseValue } from "./note-databases";
import type { HabitIconName } from "./habit-icons";
import type { ProjectIconName } from "./project-icons";
export type OrderRevision = Pick<Entity, "id" | "updatedAt">;

export interface TaskInput {
  recurrence?: import("./task-recurrence").RecurrenceRule | null;
  initialStage?: "todo" | "progress" | "hold" | "done";
  tags?: string[];
  workStatus?: "active" | "on_hold";
  title: string;
  deadline?: string | null;
  description?: string;
  projectId?: string | null;
  conditions?: string[];
  sourceThoughtIds?: string[];
}
export interface ProjectInput {
  initialStage?: "progress" | "hold" | "done";
  tags?: string[];
  workStatus?: "active" | "on_hold";
  icon?: ProjectIconName | null;
  title: string;
  description?: string;
}
export interface ThoughtInput {
  emotion?: string | null;
  title?: string;
  content: string;
  recordedAt?: string;
}
export interface HabitInput {
  icon?: HabitIconName | null;
  title: string;
  description?: string;
  timeZone: string;
  startsOn: string;
  endsOn?: string | null;
  isoWeekdays: number[];
}
export interface BlockInput {
  title: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  timeZone: string;
  taskIds?: string[];
  occurrenceIds?: string[];
}
export interface SleepInput {
  startsAt: string;
  endsAt: string;
  awakeMinutes: number;
  timeZone: string;
  note?: string;
}
export type Command =
  | { type: "tasks.materialize"; from: string; to: string }
  | { type: "task.recurrence.stop"; id: string; expectedUpdatedAt: string }
  | {
      type: "meal.save";
      id?: string;
      input: import("./meals").MealInput;
      expectedUpdatedAt?: string;
    }
  | { type: "meal.delete"; id: string; expectedUpdatedAt: string }
  | {
      type: "task.move";
      id: string;
      stage: "todo" | "progress" | "hold" | "done";
      beforeId?: string | null;
      items?: OrderRevision[];
      expectedUpdatedAt: string;
    }
  | {
      type: "project.move";
      id: string;
      stage: "progress" | "hold" | "done";
      beforeId?: string | null;
      items?: OrderRevision[];
      expectedUpdatedAt: string;
    }
  | { type: "task.reorder" | "project.reorder"; items: OrderRevision[] }
  | {
      type: "database.save";
      id?: string;
      expectedUpdatedAt?: string;
      input: {
        title: string;
        description: string;
        noteId: string | null;
        fields: DatabaseField[];
      };
    }
  | { type: "database.delete"; id: string; expectedUpdatedAt: string }
  | {
      type: "database.record.save";
      id?: string;
      expectedUpdatedAt?: string;
      databaseRevision: string;
      input: {
        databaseId: string;
        title: string;
        content: string;
        values: Record<string, DatabaseValue>;
      };
    }
  | { type: "database.record.delete"; id: string; expectedUpdatedAt: string }
  | { type: "tag.create"; name: string }
  | { type: "tag.rename"; from: string; to: string | null }
  | {
      type: "sleep.save";
      id?: string;
      input: SleepInput;
      expectedUpdatedAt?: string;
    }
  | { type: "sleep.delete"; id: string; expectedUpdatedAt?: string }
  | {
      type: "note.save";
      id?: string;
      expectedUpdatedAt?: string;
      input: {
        title: string;
        content: string;
        targets: NoteTarget[];
        tags?: string[];
      };
    }
  | { type: "note.delete"; id: string; expectedUpdatedAt?: string }
  | { type: "task.create"; input: TaskInput }
  | { type: "project.reorderTasks"; projectId: string; items: OrderRevision[] }
  | { type: "task.reorderConditions"; taskId: string; items: OrderRevision[] }
  | {
      type: "task.update";
      id: string;
      patch: Partial<
        Pick<
          TaskInput,
          | "title"
          | "description"
          | "projectId"
          | "deadline"
          | "tags"
          | "workStatus"
          | "recurrence"
        >
      >;
      expectedUpdatedAt?: string;
    }
  | {
      type: "task.complete" | "task.reopen" | "task.continue";
      id: string;
      expectedUpdatedAt?: string;
    }
  | { type: "task.delete"; id: string }
  | { type: "condition.add"; taskId: string; description: string }
  | {
      type: "condition.update";
      id: string;
      patch: { description?: string; isMet?: boolean };
    }
  | { type: "condition.delete"; id: string }
  | { type: "project.create"; input: ProjectInput }
  | {
      type: "project.update";
      id: string;
      input: ProjectInput;
      expectedUpdatedAt?: string;
    }
  | {
      type: "project.complete" | "project.reopen" | "project.delete";
      id: string;
    }
  | { type: "thought.create"; input: ThoughtInput }
  | {
      type: "thought.update";
      id: string;
      input: Omit<ThoughtInput, "recordedAt">;
      expectedUpdatedAt?: string;
    }
  | { type: "thought.delete"; id: string }
  | {
      type: "thought.convert";
      thoughtIds: string[];
      kind: "task" | "project";
      input: ProjectInput;
    }
  | {
      type: "thought.link" | "thought.unlink";
      kind: "task" | "project";
      targetId: string;
      thoughtIds: string[];
    }
  | { type: "habit.create"; input: HabitInput }
  | {
      type: "habit.update";
      id: string;
      input: HabitInput;
      expectedUpdatedAt?: string;
    }
  | { type: "habit.delete"; id: string; expectedUpdatedAt?: string }
  | { type: "occurrences.materialize"; from: string; to: string }
  | {
      type: "occurrence.reschedule";
      id: string;
      plannedOn: string;
      note?: string;
    }
  | {
      type: "execution.record";
      occurrenceId: string;
      performedOn: string;
      note?: string;
    }
  | { type: "execution.update"; id: string; performedOn: string; note?: string }
  | { type: "execution.delete"; id: string; expectedUpdatedAt?: string }
  | {
      type: "block.save";
      id?: string;
      input: BlockInput;
      expectedUpdatedAt?: string;
    }
  | { type: "block.delete"; id: string; expectedUpdatedAt?: string };

export interface CommandResult {
  snapshot: Workspace;
  id?: string;
}
