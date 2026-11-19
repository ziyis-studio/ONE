import { Target } from "lucide-react";
import type { Task } from "../domain/model";
import { usePomodoro } from "../lib/pomodoro-context";
import { useOne } from "../lib/workspace";
import { useConfirm } from "../lib/confirmation";
export default function FocusTaskButton({
  task,
  onStarted,
  labelled = false,
}: {
  task: Task;
  onStarted?: () => boolean | void;
  labelled?: boolean;
}) {
  const { state, focusTask } = usePomodoro();
  const { navigate, busy } = useOne();
  const confirm = useConfirm();
  if (task.completedAt) return null;
  return (
    <button
      type="button"
      className={
        (labelled ? "secondary-button" : "icon-button") + " focus-task-button"
      }
      aria-label={"Focus on " + task.title}
      title="Start focus"
      disabled={busy}
      onClick={async () => {
        const unfinished = ["running", "paused"].includes(state.status);
        if (
          unfinished &&
          (state.mode !== "focus" || state.taskId !== task.id) &&
          !(await confirm({
            title: "Start a new focus?",
            description:
              "The unfinished timer will be reset. Completed sessions are kept.",
            confirmLabel: "Start focus",
            cancelLabel: "Keep timer",
          }))
        )
          return;
        if (onStarted?.() === false) return;
        focusTask(task);
        navigate("home");
      }}
    >
      <Target size={16} />
      {labelled && (
        <span>
          {state.mode === "focus" &&
          state.taskId === task.id &&
          state.status === "running"
            ? "Open timer"
            : state.mode === "focus" &&
                state.taskId === task.id &&
                state.status === "paused"
              ? "Resume focus"
              : "Start focus"}
        </span>
      )}
    </button>
  );
}
