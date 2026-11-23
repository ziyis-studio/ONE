import { useRecurringTaskRange } from "../lib/use-recurring-tasks";
import ScheduleKind, { ScheduleLegend, scheduleKind } from "./ScheduleKind";
import { PageDate } from "./PageDate";
import { useRef, useState } from "react";
import type { DragEvent } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import type { TimeBlock } from "../domain/model";
import { useViewState } from "../lib/view-state";
import { useOne } from "../lib/workspace";
import {
  addDays,
  addMonths,
  dateLabel,
  dayKey,
  monthDays,
  timeKey,
  weekDays,
} from "../domain/time";
import {
  blocksOnDay,
  timeBlockTitle,
  minuteTimestamp,
  snapMinute,
  rescheduledBlock,
} from "../lib/schedule";
import { IconButton } from "./ui";
import ScheduleTimeline from "./ScheduleTimeline";
import ScheduleTasks from "./ScheduleTasks";
import ScheduleDeadline from "./ScheduleDeadline";
import { DiscreteTabs } from "./interactions";
type View = "month" | "week" | "day";
const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
export default function SchedulePage() {
  const { data, today, zone, edit, execute, busy, notify } = useOne();
  const [selected, setSelected] = useViewState<string>("schedule.date", today);
  const [view, setView] = useViewState<View>("schedule.view", "month");
  const [dragOver, setDragOver] = useState("");
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const days = weekDays(selected);
  const month = monthDays(selected);
  useRecurringTaskRange(
    view === "month" ? month[0] : view === "week" ? days[0] : selected,
    view === "month"
      ? month.at(-1)!
      : view === "week"
        ? days.at(-1)!
        : selected,
  );
  const [showTasks, setShowTasks] = useViewState<boolean>(
    "schedule.tasks",
    true,
  );
  const dropPending = useRef(false);
  async function dropTask(taskId: string, day: string, minute = 9 * 60) {
    if (
      busy ||
      dropPending.current ||
      !data.tasks.some((task) => task.id === taskId)
    )
      return;
    dropPending.current = true;
    try {
      const start = Math.min(1425, snapMinute(minute));
      const startsAt = minuteTimestamp(day, start, zone),
        endsAt = minuteTimestamp(day, Math.min(1440, start + 30), zone);
      if (
        data.timeBlocks.some(
          (block) =>
            Date.parse(block.startsAt) === Date.parse(startsAt) &&
            Date.parse(block.endsAt) === Date.parse(endsAt) &&
            data.blockTaskLinks.some(
              (link) => link.timeBlockId === block.id && link.taskId === taskId,
            ),
        )
      ) {
        notify("This task is already planned here.");
        return;
      }
      await execute({
        type: "block.save",
        input: {
          title: "",
          description: "",
          startsAt,
          endsAt,
          timeZone: zone,
          taskIds: [taskId],
          occurrenceIds: [],
        },
      });
      notify("Task scheduled.");
    } catch (cause) {
      notify(
        cause instanceof Error
          ? cause.message
          : "Could not schedule this task.",
        true,
      );
    } finally {
      dropPending.current = false;
    }
  }
  async function saveMove(
    block: TimeBlock,
    day: string,
    minute?: number,
    duration?: number,
  ) {
    if (busy) return;
    let input: ReturnType<typeof rescheduledBlock>;
    try {
      input = rescheduledBlock(block, day, zone, minute, duration);
    } catch (cause) {
      notify(
        cause instanceof Error
          ? cause.message
          : "Could not move this time block.",
        true,
      );
      return;
    }
    if (
      Date.parse(input.startsAt) === Date.parse(block.startsAt) &&
      Date.parse(input.endsAt) === Date.parse(block.endsAt)
    )
      return;
    try {
      await execute({
        type: "block.save",
        id: block.id,
        expectedUpdatedAt: block.updatedAt,
        input: {
          ...input,
          taskIds: data.blockTaskLinks
            .filter((link) => link.timeBlockId === block.id)
            .map((link) => link.taskId),
          occurrenceIds: data.blockOccurrenceLinks
            .filter((link) => link.timeBlockId === block.id)
            .map((link) => link.occurrenceId),
        },
      });
      notify("Schedule updated.");
    } catch {
      /* The workspace displays errors and preserves the server snapshot. */
    }
  }
  function planTask(taskId: string, day: string, minute = 9 * 60) {
    if (busy || !data.tasks.some((task) => task.id === taskId)) return;
    try {
      edit({
        kind: "block",
        taskId,
        date: day,
        startsAt: minuteTimestamp(day, minute, zone),
        endsAt: minuteTimestamp(day, Math.min(1440, minute + 60), zone),
      });
    } catch (cause) {
      notify(
        cause instanceof Error ? cause.message : "Choose another time.",
        true,
      );
    }
  }
  async function attachTask(block: TimeBlock, taskId: string) {
    if (busy || !data.tasks.some((task) => task.id === taskId)) return;
    if (
      data.blockTaskLinks.some(
        (link) => link.timeBlockId === block.id && link.taskId === taskId,
      )
    ) {
      notify("This task is already linked.");
      return;
    }
    try {
      await execute({
        type: "block.save",
        id: block.id,
        expectedUpdatedAt: block.updatedAt,
        input: {
          title: block.title,
          description: block.description,
          startsAt: block.startsAt,
          endsAt: block.endsAt,
          timeZone: block.timeZone,
          taskIds: [
            ...data.blockTaskLinks
              .filter((link) => link.timeBlockId === block.id)
              .map((link) => link.taskId),
            taskId,
          ],
          occurrenceIds: data.blockOccurrenceLinks
            .filter((link) => link.timeBlockId === block.id)
            .map((link) => link.occurrenceId),
        },
      });
      notify("Task added to time block.");
    } catch {
      /* The workspace reports the error without changing the saved links. */
    }
  }
  function nativeDrag(event: DragEvent, block: TimeBlock) {
    event.dataTransfer.setData("text/one-block", block.id);
    event.dataTransfer.effectAllowed = "move";
  }
  function drop(event: DragEvent, day: string) {
    event.preventDefault();
    setDragOver("");
    const taskId = event.dataTransfer.getData("text/one-task");
    if (taskId) {
      void dropTask(taskId, day);
      return;
    }
    const block = data.timeBlocks.find(
      (item) => item.id === event.dataTransfer.getData("text/one-block"),
    );
    if (block) void saveMove(block, day);
  }
  function navigate(amount: number) {
    setSelected(
      view === "month"
        ? addMonths(selected, amount)
        : addDays(selected, amount * (view === "week" ? 7 : 1)),
    );
  }
  function changeDay(day: string) {
    setSelected(day);
    setView("day");
  }
  return (
    <>
      <div className="page-intro">
        <div>
          <PageDate />
          <h1>
            Schedule<span className="accent">.</span>
          </h1>
          <p className="page-description">
            Plan your month. Move things as your day changes.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => edit({ kind: "block", date: selected })}
        >
          <Plus size={15} />
          Plan time
        </button>
      </div>
      <ScheduleLegend />
      <div className={"one-schedule-layout " + (showTasks ? "with-tasks" : "")}>
        <section
          className={"calendar-workspace view-" + view}
          aria-label="Schedule calendar"
        >
          <header className="calendar-toolbar">
            <div className="calendar-title">
              <h2>
                {dateLabel(
                  selected,
                  view === "month"
                    ? { month: "long", year: "numeric" }
                    : { month: "long", day: "numeric", year: "numeric" },
                )}
              </h2>
              <div className="date-navigation">
                <IconButton
                  label={"Previous " + view}
                  onClick={() => navigate(-1)}
                >
                  <ChevronLeft size={16} />
                </IconButton>
                <IconButton label={"Next " + view} onClick={() => navigate(1)}>
                  <ChevronRight size={16} />
                </IconButton>
                <button
                  className="tiny-pill"
                  onClick={() => setSelected(today)}
                >
                  Today
                </button>
              </div>
            </div>
            <div className="calendar-view-actions">
              <button
                className="tiny-pill one-tasks-toggle"
                aria-label={showTasks ? "Hide task panel" : "Show task panel"}
                aria-expanded={showTasks}
                aria-controls="schedule-task-panel"
                onClick={() => setShowTasks((value) => !value)}
              >
                {showTasks ? (
                  <PanelRightClose size={14} />
                ) : (
                  <PanelRightOpen size={14} />
                )}
                Tasks
              </button>
              <DiscreteTabs
                value={view}
                onChange={setView}
                label="Calendar view"
                items={(["month", "week", "day"] as const).map((item) => ({
                  value: item,
                  label: item.charAt(0).toUpperCase() + item.slice(1),
                }))}
              />
            </div>
          </header>
          {view === "month" ? (
            <>
              <div className="month-weekdays">
                {weekdays.map((day) => (
                  <span key={day}>{day.slice(0, 3)}</span>
                ))}
              </div>
              <div
                className="month-calendar"
                role="grid"
                aria-label={dateLabel(selected, {
                  month: "long",
                  year: "numeric",
                })}
              >
                {Array.from({ length: 6 }, (_, week) => (
                  <div className="month-week" role="row" key={week}>
                    {month.slice(week * 7, week * 7 + 7).map((day) => {
                      const entries = blocksOnDay(data.timeBlocks, day, zone);
                      const deadlines = data.tasks
                        .filter((task) => task.deadline === day)
                        .toSorted(
                          (a, b) =>
                            Number(!!a.completedAt) - Number(!!b.completedAt),
                        );
                      const visibleDeadlines = deadlines.slice(
                        0,
                        Math.max(2, 5 - Math.min(3, entries.length)),
                      );
                      const visibleEntries = entries.slice(0, 3);
                      const hiddenEntries =
                        deadlines.length +
                        entries.length -
                        visibleDeadlines.length -
                        visibleEntries.length;
                      return (
                        <div
                          role="gridcell"
                          aria-label={day}
                          key={day}
                          className={
                            "month-cell " +
                            (day.slice(0, 7) !== selected.slice(0, 7)
                              ? "outside "
                              : "") +
                            (day === today ? "is-today " : "") +
                            (dragOver === day ? "drag-over" : "")
                          }
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "move";
                            setDragOver(day);
                          }}
                          onDragLeave={(event) => {
                            if (
                              !event.currentTarget.contains(
                                event.relatedTarget as Node,
                              )
                            )
                              setDragOver("");
                          }}
                          onDrop={(event) => drop(event, day)}
                        >
                          <div className="month-cell-header">
                            <button
                              className="month-date"
                              aria-label={"Open day " + day}
                              onClick={() => changeDay(day)}
                            >
                              {Number(day.slice(-2)) === 1
                                ? dateLabel(day, {
                                    month: "short",
                                    day: "numeric",
                                  })
                                : Number(day.slice(-2))}
                            </button>
                            <button
                              className="month-add"
                              aria-label={"Plan time on " + day}
                              onClick={() => edit({ kind: "block", date: day })}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <div className="month-entries">
                            {visibleDeadlines.map((task) => (
                              <ScheduleDeadline key={task.id} task={task} />
                            ))}
                            {visibleEntries.map((block) => (
                              <button
                                draggable={!busy}
                                onDragStart={(event) =>
                                  nativeDrag(event, block)
                                }
                                onDragEnd={() => setDragOver("")}
                                className={
                                  "month-event kind-" +
                                  scheduleKind(block) +
                                  " " +
                                  (dragOver === block.id
                                    ? "task-drop-target"
                                    : "")
                                }
                                data-block-id={block.id}
                                onDragOver={(event) => {
                                  if (
                                    event.dataTransfer.types.includes(
                                      "text/one-task",
                                    )
                                  ) {
                                    event.preventDefault();
                                    event.dataTransfer.dropEffect = "move";
                                    event.stopPropagation();
                                    setDragOver(block.id);
                                  }
                                }}
                                onDragLeave={() => setDragOver("")}
                                onDrop={(event) => {
                                  const taskId =
                                    event.dataTransfer.getData("text/one-task");
                                  if (taskId) {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    setDragOver("");
                                    void attachTask(block, taskId);
                                  }
                                }}
                                key={block.id}
                                onClick={() =>
                                  edit({ kind: "block", id: block.id })
                                }
                                title={
                                  timeBlockTitle(block, data) +
                                  " · " +
                                  timeKey(block.startsAt, zone) +
                                  " – " +
                                  timeKey(block.endsAt, zone)
                                }
                              >
                                <ScheduleKind block={block} compact />
                                <time>
                                  {dayKey(block.startsAt, zone) < day
                                    ? "↳"
                                    : timeKey(block.startsAt, zone)}
                                </time>
                                <span>{timeBlockTitle(block, data)}</span>
                              </button>
                            ))}
                            {hiddenEntries > 0 && (
                              <button
                                className="month-more"
                                onClick={() => changeDay(day)}
                              >
                                +{hiddenEntries} more
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <ScheduleTimeline
              days={view === "week" ? days : [selected]}
              week={view === "week"}
              onDay={changeDay}
              onMove={saveMove}
              onAttach={attachTask}
              onPlan={dropTask}
              draggedTaskTitle={
                data.tasks.find((task) => task.id === draggedTask)?.title
              }
            />
          )}
          <footer className="calendar-help">
            {view === "day"
              ? "Drag blocks to move them; pull the bottom edge to resize. On desktop, drag empty space to plan time. Alt + ↑ / ↓ moves a focused block by 15 minutes."
              : view === "week"
                ? "Drag blocks between days and times. Pull the bottom edge to resize; drag empty space to plan time."
                : "Drag a time block to another date to reschedule it. Open a date for its timeline."}
            <span>{busy ? "Saving…" : "Changes save to your workspace."}</span>
          </footer>
        </section>
        {showTasks && (
          <ScheduleTasks
            selected={selected}
            onPlan={planTask}
            onDragTask={setDraggedTask}
          />
        )}
      </div>
    </>
  );
}
