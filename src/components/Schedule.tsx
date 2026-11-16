import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, DragEvent } from "react";
import { Plus, ChevronLeft, ChevronRight, GripHorizontal } from "lucide-react";
import type { TimeBlock } from "../domain/model";
import { useOne } from "../lib/workspace";
import {
  addDays,
  addMonths,
  dateLabel,
  dayKey,
  monthDays,
  timeKey,
  weekDays,
  minutesBetween,
} from "../domain/time";
import {
  blocksOnDay,
  layoutDayBlocks,
  minuteTimestamp,
  rescheduledBlock,
  snapMinute,
} from "../lib/schedule";
import { IconButton } from "./ui";
type View = "month" | "week" | "day";
type Preview = {
  kind: "create" | "move" | "resize";
  id?: string;
  start: number;
  duration: number;
};
type Gesture = Preview & {
  pointer: number;
  originY: number;
  anchor: number;
  originalStart: number;
  originalDuration: number;
  moved: boolean;
};
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
  const [selected, setSelected] = useState(today);
  const [view, setView] = useState<View>("month");
  const [dragOver, setDragOver] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [pending, setPending] = useState<Preview | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const days = weekDays(selected);
  const blocks = blocksOnDay(data.timeBlocks, selected, zone);
  const month = monthDays(selected);
  const display = pending || preview;
  useEffect(() => {
    if (view === "day") scroller.current?.scrollTo({ top: 7 * 60 });
  }, [selected, view]);
  useEffect(() => {
    function cancel(event: KeyboardEvent) {
      if (event.key !== "Escape" || !gesture.current) return;
      const pointer = gesture.current.pointer;
      if (track.current?.hasPointerCapture(pointer))
        track.current.releasePointerCapture(pointer);
      gesture.current = null;
      setPreview(null);
    }
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, []);
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
    const startClock = timeKey(input.startsAt, zone).split(":").map(Number);
    setPending({
      kind: "move",
      id: block.id,
      start: startClock[0] * 60 + startClock[1],
      duration: minutesBetween(input.startsAt, input.endsAt),
    });
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
    } finally {
      setPending(null);
    }
  }
  function nativeDrag(event: DragEvent, block: TimeBlock) {
    event.dataTransfer.setData("text/one-block", block.id);
    event.dataTransfer.effectAllowed = "move";
  }
  function drop(event: DragEvent, day: string) {
    event.preventDefault();
    setDragOver("");
    const block = data.timeBlocks.find(
      (item) => item.id === event.dataTransfer.getData("text/one-block"),
    );
    if (block) void saveMove(block, day);
  }
  function pointerMinute(clientY: number) {
    return snapMinute(
      clientY - (track.current?.getBoundingClientRect().top || 0),
    );
  }
  function begin(
    event: ReactPointerEvent,
    kind: Gesture["kind"],
    block?: TimeBlock,
  ) {
    if (event.button !== 0 || busy) return;
    if (kind === "create" && event.pointerType === "touch") return;
    event.preventDefault();
    event.stopPropagation();
    const anchor = pointerMinute(event.clientY);
    const layout = block ? layoutDayBlocks([block], selected, zone)[0] : null;
    const start = layout?.start ?? Math.min(anchor, 1425);
    const duration = block ? minutesBetween(block.startsAt, block.endsAt) : 15;
    // Cross-day entries remain draggable between dates in month/week views.
    if (
      block &&
      (dayKey(block.startsAt, zone) !== selected || duration > 1440 - start)
    ) {
      edit({ kind: "block", id: block.id });
      return;
    }
    gesture.current = {
      kind,
      id: block?.id,
      pointer: event.pointerId,
      originY: event.clientY,
      anchor,
      originalStart: start,
      originalDuration: duration,
      start,
      duration,
      moved: false,
    };
    track.current?.setPointerCapture(event.pointerId);
    setPreview({ kind, id: block?.id, start, duration });
  }
  function move(event: ReactPointerEvent) {
    const current = gesture.current;
    if (!current || current.pointer !== event.pointerId) return;
    const delta = pointerMinute(event.clientY) - current.anchor;
    current.moved ||= Math.abs(event.clientY - current.originY) >= 4;
    if (current.kind === "move")
      current.start = Math.max(
        0,
        Math.min(1440 - current.duration, current.originalStart + delta),
      );
    else if (current.kind === "resize")
      current.duration = Math.max(
        15,
        Math.min(1440 - current.start, current.originalDuration + delta),
      );
    else {
      const finish = pointerMinute(event.clientY);
      current.start = Math.min(current.anchor, finish, 1425);
      current.duration = Math.max(15, Math.abs(finish - current.anchor));
    }
    setPreview({
      kind: current.kind,
      id: current.id,
      start: current.start,
      duration: current.duration,
    });
    // Follow the pointer near a scroll edge while moving a block.
    const viewport = scroller.current?.getBoundingClientRect();
    if (viewport && current.moved) {
      if (event.clientY > viewport.bottom - 36)
        scroller.current!.scrollTop += 12;
      if (event.clientY < viewport.top + 36) scroller.current!.scrollTop -= 12;
    }
  }
  function finish(event: ReactPointerEvent) {
    const current = gesture.current;
    if (!current || current.pointer !== event.pointerId) return;
    gesture.current = null;
    if (track.current?.hasPointerCapture(event.pointerId))
      track.current.releasePointerCapture(event.pointerId);
    setPreview(null);
    if (current.kind === "create") {
      const duration = current.moved
        ? current.duration
        : Math.min(60, 1440 - current.start);
      edit({
        kind: "block",
        date: selected,
        startsAt: minuteTimestamp(selected, current.start, zone),
        endsAt: minuteTimestamp(selected, current.start + duration, zone),
      });
    } else if (current.moved) {
      const block = data.timeBlocks.find((item) => item.id === current.id);
      if (block)
        void saveMove(block, selected, current.start, current.duration);
    } else if (current.kind === "move") edit({ kind: "block", id: current.id });
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
              <button className="tiny-pill" onClick={() => setSelected(today)}>
                Today
              </button>
            </div>
          </div>
          <div className="segmented" aria-label="Calendar view">
            {(["month", "week", "day"] as const).map((item) => (
              <button
                key={item}
                aria-pressed={view === item}
                className={view === item ? "active" : ""}
                onClick={() => setView(item)}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            ))}
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
                          {entries.slice(0, 3).map((block) => (
                            <button
                              draggable={!busy}
                              onDragStart={(event) => nativeDrag(event, block)}
                              onDragEnd={() => setDragOver("")}
                              className="month-event"
                              key={block.id}
                              onClick={() =>
                                edit({ kind: "block", id: block.id })
                              }
                              title={
                                block.title +
                                " · " +
                                timeKey(block.startsAt, zone) +
                                " – " +
                                timeKey(block.endsAt, zone)
                              }
                            >
                              <time>
                                {dayKey(block.startsAt, zone) < day
                                  ? "↳"
                                  : timeKey(block.startsAt, zone)}
                              </time>
                              <span>{block.title || "Untitled block"}</span>
                            </button>
                          ))}
                          {entries.length > 3 && (
                            <button
                              className="month-more"
                              onClick={() => changeDay(day)}
                            >
                              +{entries.length - 3} more
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
        ) : view === "week" ? (
          <div className="calendar-week-view">
            {days.map((day) => (
              <section
                key={day}
                className={
                  (day === today ? "is-today " : "") +
                  (dragOver === day ? "drag-over" : "")
                }
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(day);
                }}
                onDrop={(event) => drop(event, day)}
              >
                <button className="week-date" onClick={() => changeDay(day)}>
                  <span>{dateLabel(day, { weekday: "short" })}</span>
                  <strong>{Number(day.slice(-2))}</strong>
                </button>
                {blocksOnDay(data.timeBlocks, day, zone).map((block) => (
                  <button
                    draggable={!busy}
                    onDragStart={(event) => nativeDrag(event, block)}
                    className="week-block"
                    key={block.id}
                    onClick={() => edit({ kind: "block", id: block.id })}
                  >
                    <time>
                      {timeKey(block.startsAt, zone)} –{" "}
                      {timeKey(block.endsAt, zone)}
                    </time>
                    <strong>{block.title}</strong>
                    <small>
                      {minutesBetween(block.startsAt, block.endsAt)} min
                    </small>
                  </button>
                ))}
                <button
                  className="week-add"
                  aria-label={"Plan time on " + day}
                  onClick={() => edit({ kind: "block", date: day })}
                >
                  <Plus size={14} />
                </button>
              </section>
            ))}
          </div>
        ) : (
          <>
            <div className="timeline-day-header">
              <span>
                {dateLabel(selected, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span>{zone.replaceAll("_", " ")}</span>
            </div>
            <div className="day-schedule-scroll" ref={scroller}>
              <div className="day-schedule">
                <div className="hour-labels">
                  {Array.from({ length: 24 }, (_, hour) => (
                    <span key={hour}>{String(hour).padStart(2, "0")}:00</span>
                  ))}
                </div>
                <div
                  ref={track}
                  className={
                    "day-track editable-track " + (preview ? "is-dragging" : "")
                  }
                  data-testid="schedule-track"
                  onPointerDown={(event) => {
                    if (event.target === event.currentTarget)
                      begin(event, "create");
                  }}
                  onPointerMove={move}
                  onPointerUp={finish}
                  onPointerCancel={() => {
                    gesture.current = null;
                    setPreview(null);
                  }}
                >
                  {layoutDayBlocks(blocks, selected, zone).map(
                    ({ block, start, duration, column, columns }) => {
                      const active = display?.id === block.id ? display : null;
                      const top = active?.start ?? start,
                        height = active?.duration ?? duration;
                      return (
                        <div
                          className={
                            "scheduled-block " + (active ? "moving" : "")
                          }
                          key={block.id}
                          style={{
                            top,
                            height: Math.max(height, 20),
                            left:
                              "calc(" + (column / columns) * 100 + "% + 8px)",
                            width: "calc(" + 100 / columns + "% - 16px)",
                          }}
                        >
                          <button
                            className="schedule-block-main"
                            disabled={busy}
                            aria-label={
                              "Move or edit " + (block.title || "time block")
                            }
                            onPointerDown={(event) =>
                              begin(event, "move", block)
                            }
                            onClick={(event) => {
                              if (event.detail === 0)
                                edit({ kind: "block", id: block.id });
                            }}
                            onKeyDown={(event) => {
                              if (
                                event.altKey &&
                                (event.key === "ArrowUp" ||
                                  event.key === "ArrowDown")
                              ) {
                                event.preventDefault();
                                void saveMove(
                                  block,
                                  selected,
                                  Math.max(
                                    0,
                                    Math.min(
                                      1440 - duration,
                                      start +
                                        (event.key === "ArrowUp" ? -15 : 15),
                                    ),
                                  ),
                                );
                              }
                            }}
                          >
                            <strong>{block.title || "Untitled block"}</strong>
                            <small>
                              {timeKey(
                                active
                                  ? minuteTimestamp(selected, top, zone)
                                  : block.startsAt,
                                zone,
                              )}{" "}
                              –{" "}
                              {timeKey(
                                active
                                  ? minuteTimestamp(
                                      selected,
                                      top + height,
                                      zone,
                                    )
                                  : block.endsAt,
                                zone,
                              )}
                            </small>
                          </button>
                          <button
                            className="block-resize"
                            aria-label={
                              "Resize " + (block.title || "time block")
                            }
                            disabled={busy}
                            onPointerDown={(event) =>
                              begin(event, "resize", block)
                            }
                            onKeyDown={(event) => {
                              if (
                                event.key === "ArrowUp" ||
                                event.key === "ArrowDown"
                              ) {
                                event.preventDefault();
                                void saveMove(
                                  block,
                                  selected,
                                  start,
                                  Math.max(
                                    15,
                                    Math.min(
                                      1440 - start,
                                      duration +
                                        (event.key === "ArrowUp" ? -15 : 15),
                                    ),
                                  ),
                                );
                              }
                            }}
                          >
                            <GripHorizontal size={13} />
                          </button>
                        </div>
                      );
                    },
                  )}
                  {preview?.kind === "create" && (
                    <div
                      className="schedule-create-preview"
                      style={{ top: preview.start, height: preview.duration }}
                    >
                      <strong>New time block</strong>
                      <small>
                        {timeKey(
                          minuteTimestamp(selected, preview.start, zone),
                          zone,
                        )}{" "}
                        –{" "}
                        {timeKey(
                          minuteTimestamp(
                            selected,
                            preview.start + preview.duration,
                            zone,
                          ),
                          zone,
                        )}
                      </small>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
        <footer className="calendar-help">
          {view === "day"
            ? "Drag blocks to move them; pull the bottom edge to resize. On desktop, drag empty space to plan time. Alt + ↑ / ↓ moves a focused block by 15 minutes."
            : "Drag a time block to another date to reschedule it. Open a date for its timeline."}
          <span>{busy ? "Saving…" : "Changes save to your workspace."}</span>
        </footer>
      </section>
    </>
  );
}
