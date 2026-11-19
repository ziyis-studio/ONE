import "./task-schedule-hint.css";
import { CalendarClock } from "lucide-react";
import type { Task } from "../domain/model";
export default function TaskScheduleHint({
  task,
  planned,
  disabled,
  onPlan,
}: {
  task: Task;
  planned: boolean;
  disabled?: boolean;
  onPlan: () => void;
}) {
  if (task.completedAt || planned) return null;
  return (
    <button
      type="button"
      className="task-schedule-hint"
      disabled={disabled}
      aria-label={"Schedule " + task.title}
      aria-description="No current or upcoming planned time block. A due date is only a deadline."
      onClick={onPlan}
    >
      <CalendarClock size={12} aria-hidden="true" />
      <span>Unscheduled</span>
    </button>
  );
}
