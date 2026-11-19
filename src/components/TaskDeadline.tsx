import { useRef, useState } from "react";
import {
  Button,
  DialogTrigger,
  Popover,
  Dialog,
  Calendar,
  Heading,
  CalendarGrid,
  CalendarGridHeader,
  CalendarGridBody,
  CalendarHeaderCell,
  CalendarCell,
  I18nProvider,
} from "react-aria-components";
import { parseDate } from "@internationalized/date";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import type { Task } from "../domain/model";
import { dateLabel } from "../domain/time";
import { useOne } from "../lib/workspace";
import { PopoverExit } from "../lib/popup-exit";
import "./date-time-field.css";
export default function TaskDeadline({ task }: { task: Task }) {
  const { execute, busy, today } = useOne();
  const lock = useRef(false),
    trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  async function update(value: string) {
    setOpen(false);
    if (lock.current || busy || value === (task.deadline || "")) return;
    lock.current = true;
    try {
      await execute({
        type: "task.update",
        id: task.id,
        expectedUpdatedAt: task.updatedAt,
        patch: { deadline: value || null },
      });
    } catch {
      /* The workspace reports the error and keeps the saved date. */
    } finally {
      lock.current = false;
      requestAnimationFrame(() => {
        if (document.activeElement === document.body) trigger.current?.focus();
      });
    }
  }
  return (
    <span
      className={
        "task-deadline" +
        (task.deadline && task.deadline < today && !task.completedAt
          ? " overdue"
          : "")
      }
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      onDragStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <I18nProvider locale="en-GB">
        <DialogTrigger isOpen={open} onOpenChange={setOpen}>
          <Button
            ref={trigger}
            className="one-date-trigger task-date-trigger"
            aria-label={
              (task.deadline ? "Change" : "Set") + " due date for " + task.title
            }
            isDisabled={busy}
          >
            <CalendarDays size={13} />
            {task.deadline && (
              <span>
                {task.deadline === today ? "Today" : dateLabel(task.deadline)}
              </span>
            )}
          </Button>
          <Popover
            className="one-date-popover"
            placement="bottom start"
            offset={8}
          >
            <Dialog
              className="one-date-dialog"
              aria-label={"Due date for " + task.title}
            >
              <PopoverExit kind="date" />
              <Calendar
                className="one-calendar"
                aria-label="Due date"
                firstDayOfWeek="mon"
                value={task.deadline ? parseDate(task.deadline) : null}
                defaultFocusedValue={parseDate(task.deadline || today)}
                onChange={(date) => void update(date.toString())}
              >
                <header className="one-calendar-heading">
                  <Heading />
                  <div>
                    <Button slot="previous" aria-label="Previous month">
                      <ChevronLeft size={16} />
                    </Button>
                    <Button slot="next" aria-label="Next month">
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </header>
                <CalendarGrid
                  className="one-calendar-grid"
                  weekdayStyle="short"
                >
                  <CalendarGridHeader>
                    {(day) => <CalendarHeaderCell>{day}</CalendarHeaderCell>}
                  </CalendarGridHeader>
                  <CalendarGridBody>
                    {(date) => (
                      <CalendarCell date={date} className="one-calendar-day" />
                    )}
                  </CalendarGridBody>
                </CalendarGrid>
              </Calendar>
              <div className="one-picker-footer">
                <Button onPress={() => void update(today)}>Today</Button>
                {task.deadline && (
                  <Button onPress={() => void update("")}>Clear</Button>
                )}
                <Button
                  className="one-picker-done"
                  onPress={() => setOpen(false)}
                >
                  Done
                </Button>
              </div>
            </Dialog>
          </Popover>
        </DialogTrigger>
      </I18nProvider>
    </span>
  );
}
