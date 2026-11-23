import { useRef } from "react";
import { Check, CheckSquare2, Repeat2 } from "lucide-react";
import type { Task } from "../domain/model";
import { useOne } from "../lib/workspace";
export default function ScheduleDeadline({ task }: { task: Task }) {
  const { edit, busy } = useOne();
  const dragged = useRef(false);
  return (
    <button
      type="button"
      className={"one-deadline" + (task.completedAt ? " is-complete" : "")}
      aria-label={`Due ${task.deadline}: ${task.title}${task.completedAt ? " · Completed" : ""}`}
      title={task.title}
      draggable={!busy && !task.completedAt}
      onPointerDown={() => {
        dragged.current = false;
      }}
      onDragStart={(event) => {
        dragged.current = true;
        event.dataTransfer.setData("text/one-task", task.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={() =>
        requestAnimationFrame(() => {
          dragged.current = false;
        })
      }
      onClick={() => {
        if (!dragged.current) edit({ kind: "task", id: task.id });
      }}
    >
      {task.completedAt ? (
        <Check size={12} aria-hidden="true" />
      ) : (
        <CheckSquare2 size={12} aria-hidden="true" />
      )}
      {task.recurrenceId && <Repeat2 size={11} aria-label="Repeating task" />}
      <small>Due</small>
      <span>{task.title}</span>
    </button>
  );
}
