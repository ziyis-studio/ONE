import { useRef } from "react";
import { Button, DialogTrigger, Popover, Dialog } from "react-aria-components";
import { CalendarClock, ArrowUpRight } from "lucide-react";
import type { Task } from "../domain/model";
import { dateLabel } from "../domain/time";
import { useOne } from "../lib/workspace";
import { TaskDeadlineCalendar } from "./TaskDeadline";
import { PopoverExit } from "../lib/popup-exit";
export default function TaskTiming({
  task,
  planned,
}: {
  task: Task;
  planned: boolean;
}) {
  const { edit, busy, today, execute } = useOne();
  const lock = useRef(false);
  async function update(day: string, close: () => void) {
    if (busy || lock.current) return;
    close();
    if (day === (task.deadline || "")) return;
    lock.current = true;
    try {
      await execute({
        type: "task.update",
        id: task.id,
        expectedUpdatedAt: task.updatedAt,
        patch: { deadline: day || null },
      });
    } catch {
      /* Workspace keeps the saved date and reports the error. */
    } finally {
      lock.current = false;
    }
  }
  return (
    <DialogTrigger>
      <Button
        className="task-timing-trigger"
        isDisabled={busy}
        aria-label={"Dates and schedule for " + task.title}
      >
        <CalendarClock size={13} />
        <span>
          {task.deadline
            ? task.deadline === today
              ? "Due today"
              : "Due " + dateLabel(task.deadline)
            : task.completedAt
              ? "No due date"
              : planned
                ? "Scheduled"
                : "Unscheduled"}
        </span>
      </Button>
      <Popover className="one-date-popover" placement="bottom start" offset={8}>
        <Dialog
          className="task-timing-menu"
          aria-label={"Dates and schedule for " + task.title}
        >
          {({ close }) => (
            <>
              <PopoverExit kind="date" />
              <strong>Due date</strong>
              <p>A deadline for finishing this task.</p>
              <TaskDeadlineCalendar
                task={task}
                onSelect={(day) => update(day, close)}
              />
              <div className="one-picker-footer">
                <Button onPress={() => void update(today, close)}>Today</Button>
                {task.deadline && (
                  <Button onPress={() => void update("", close)}>Clear</Button>
                )}
                <Button onPress={close}>Done</Button>
              </div>
              {!task.completedAt && (
                <>
                  <hr />
                  <strong>Time to work</strong>
                  <p>
                    {planned
                      ? "A current or upcoming block is planned."
                      : "Choose when you want to work on it."}
                  </p>
                  <button
                    className="secondary-button"
                    onClick={() => {
                      close();
                      edit({
                        kind: "block",
                        taskId: task.id,
                        date:
                          task.deadline && task.deadline >= today
                            ? task.deadline
                            : today,
                      });
                    }}
                  >
                    <CalendarClock size={14} />
                    {planned ? "Add another time block" : "Plan time"}
                    <ArrowUpRight size={13} />
                  </button>
                </>
              )}
            </>
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
