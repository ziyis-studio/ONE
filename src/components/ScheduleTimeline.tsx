import ScheduleKind, { scheduleKind } from "./ScheduleKind";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { GripHorizontal } from "lucide-react";
import type { TimeBlock } from "../domain/model";
import ScheduleDeadline from "./ScheduleDeadline";
import { useOne } from "../lib/workspace";
import {
  blocksOnDay,
  timeBlockTitle,
  layoutDayBlocks,
  snapMinute,
  minuteTimestamp,
} from "../lib/schedule";
import { dayKey, dateLabel, timeKey, minutesBetween } from "../domain/time";
import "./schedule-planning.css";
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
type Actions = {
  onMove: (
    block: TimeBlock,
    day: string,
    minute?: number,
    duration?: number,
  ) => Promise<void>;
  onAttach: (block: TimeBlock, taskId: string) => Promise<void>;
  onPlan: (taskId: string, day: string, minute: number) => Promise<void>;
};
function clockLabel(minute: number) {
  return (
    String(Math.floor(minute / 60)).padStart(2, "0") +
    ":" +
    String(minute % 60).padStart(2, "0")
  );
}
export default function ScheduleTimeline({
  days,
  week,
  onDay,
  ...actions
}: Actions & { days: string[]; week: boolean; onDay: (day: string) => void }) {
  const { today, zone, data } = useOne();
  const dueDays = days.map((day) =>
    data.tasks
      .filter((task) => task.deadline === day)
      .toSorted((a, b) => Number(!!a.completedAt) - Number(!!b.completedAt)),
  );
  const scroller = useRef<HTMLDivElement>(null);
  const key = days.join(":");
  useEffect(() => {
    scroller.current?.scrollTo({ top: 7 * 60 });
  }, [key]);
  return (
    <div
      className={
        "one-timeline " + (week ? "one-timeline-week" : "one-timeline-day")
      }
    >
      <div className="one-timeline-zone">{zone.replaceAll("_", " ")}</div>
      <div className="one-timeline-scroll" ref={scroller}>
        <div className="one-timeline-heading">
          <div
            className="one-timeline-header"
            style={{
              gridTemplateColumns: `54px repeat(${days.length},minmax(${week ? 100 : 0}px,1fr))`,
            }}
          >
            <span />
            {days.map((day) => (
              <button
                key={day}
                className={day === today ? "is-today" : ""}
                onClick={() => onDay(day)}
                aria-label={"Open day " + day}
              >
                <span>
                  {dateLabel(day, { weekday: week ? "short" : "long" })}
                </span>
                <strong>
                  {dateLabel(day, {
                    month: week ? undefined : "short",
                    day: "numeric",
                  })}
                </strong>
              </button>
            ))}
          </div>
          {dueDays.some((tasks) => tasks.length) && (
            <div
              className="one-deadline-row"
              style={{
                gridTemplateColumns: `54px repeat(${days.length},minmax(${week ? 100 : 0}px,1fr))`,
              }}
            >
              <span>Due</span>
              {days.map((day, index) => (
                <div
                  className="one-deadline-cell"
                  key={day}
                  role="group"
                  aria-label={"Tasks due " + day}
                >
                  {dueDays[index].map((task) => (
                    <ScheduleDeadline key={task.id} task={task} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        <div
          className="one-time-grid"
          style={{
            gridTemplateColumns: `54px repeat(${days.length},minmax(${week ? 100 : 0}px,1fr))`,
          }}
        >
          <div className="hour-labels" aria-label="Hour labels">
            {Array.from({ length: 24 }, (_, hour) => (
              <span key={hour}>{String(hour).padStart(2, "0")}:00</span>
            ))}
          </div>
          {days.map((day) => (
            <TimelineTrack
              key={day}
              day={day}
              week={week}
              scroller={scroller}
              {...actions}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
function TimelineTrack({
  day,
  week,
  scroller,
  onMove,
  onAttach,
  onPlan,
}: Actions & {
  day: string;
  week: boolean;
  scroller: RefObject<HTMLDivElement | null>;
}) {
  const { data, zone, edit, busy, notify } = useOne();
  const blocks = blocksOnDay(data.timeBlocks, day, zone);
  const track = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null),
    [pending, setPending] = useState<Preview | null>(null);
  const [taskOver, setTaskOver] = useState("");
  const display = pending || preview;
  const dragging = preview !== null;
  useEffect(() => {
    if (!dragging) return;
    const cancel = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !gesture.current) return;
      const pointer = gesture.current.pointer;
      if (track.current?.hasPointerCapture(pointer))
        track.current.releasePointerCapture(pointer);
      gesture.current = null;
      setPreview(null);
    };
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, [dragging]);
  async function saveMove(
    block: TimeBlock,
    target: string,
    minute?: number,
    duration?: number,
  ) {
    const parts = timeKey(block.startsAt, zone).split(":").map(Number);
    setPending({
      kind: "move",
      id: block.id,
      start: minute ?? parts[0] * 60 + parts[1],
      duration: duration ?? minutesBetween(block.startsAt, block.endsAt),
    });
    try {
      await onMove(block, target, minute, duration);
    } finally {
      setPending(null);
    }
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
    const layout = block ? layoutDayBlocks([block], day, zone)[0] : null;
    const start = layout?.start ?? Math.min(anchor, 1425);
    const duration = block ? minutesBetween(block.startsAt, block.endsAt) : 15;
    // Cross-day entries remain draggable between dates in month/week views.
    if (
      block &&
      (dayKey(block.startsAt, zone) !== day || duration > 1440 - start)
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
      try {
        edit({
          kind: "block",
          date: day,
          startsAt: minuteTimestamp(day, current.start, zone),
          endsAt: minuteTimestamp(day, current.start + duration, zone),
        });
      } catch (cause) {
        notify(
          cause instanceof Error ? cause.message : "Choose another time.",
          true,
        );
      }
    } else if (current.moved) {
      const block = data.timeBlocks.find((item) => item.id === current.id);
      if (block) void saveMove(block, day, current.start, current.duration);
    } else if (current.kind === "move") edit({ kind: "block", id: current.id });
  }

  return (
    <div
      ref={track}
      className={"day-track editable-track " + (preview ? "is-dragging" : "")}
      data-testid={week ? "schedule-track-" + day : "schedule-track"}
      data-date={day}
      aria-label={"Timeline " + day}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) begin(event, "create");
      }}
      onDragOver={(event) => {
        if (
          event.dataTransfer.types.some((type) =>
            ["text/one-task", "text/one-block"].includes(type),
          )
        ) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        const taskId = event.dataTransfer.getData("text/one-task");
        const minute = Math.min(1425, pointerMinute(event.clientY));
        if (taskId) {
          setPending({
            kind: "create",
            start: minute,
            duration: Math.min(30, 1440 - minute),
          });
          void onPlan(taskId, day, minute).finally(() => setPending(null));
        } else {
          const block = data.timeBlocks.find(
            (item) => item.id === event.dataTransfer.getData("text/one-block"),
          );
          if (block) void saveMove(block, day, minute);
        }
      }}
      onPointerMove={move}
      onPointerUp={finish}
      onPointerCancel={() => {
        gesture.current = null;
        setPreview(null);
      }}
    >
      {layoutDayBlocks(blocks, day, zone).map(
        ({ block, start, duration, column, columns }) => {
          const active = display?.id === block.id ? display : null;
          const top = active?.start ?? start,
            height = active?.duration ?? duration;
          return (
            <div
              className={
                "scheduled-block kind-" +
                scheduleKind(block) +
                " " +
                (active ? "moving" : "")
              }
              key={block.id}
              data-block-id={block.id}
              data-task-over={taskOver === block.id || undefined}
              draggable={week && !busy}
              onDragStart={(event) => {
                event.dataTransfer.setData("text/one-block", block.id);
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(event) => {
                if (event.dataTransfer.types.includes("text/one-task")) {
                  event.preventDefault();
                  event.stopPropagation();
                  event.dataTransfer.dropEffect = "move";
                  setTaskOver(block.id);
                }
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node))
                  setTaskOver("");
              }}
              onDrop={(event) => {
                const taskId = event.dataTransfer.getData("text/one-task");
                if (taskId) {
                  event.preventDefault();
                  event.stopPropagation();
                  setTaskOver("");
                  void onAttach(block, taskId);
                }
              }}
              style={{
                top,
                height: Math.max(height, 20),
                left: "calc(" + (column / columns) * 100 + "% + 8px)",
                width: "calc(" + 100 / columns + "% - 16px)",
              }}
            >
              <button
                className="schedule-block-main"
                disabled={busy}
                aria-label={"Move or edit " + timeBlockTitle(block, data)}
                onPointerDown={
                  week ? undefined : (event) => begin(event, "move", block)
                }
                onClick={(event) => {
                  if (week || event.detail === 0)
                    edit({ kind: "block", id: block.id });
                }}
                onKeyDown={(event) => {
                  if (
                    event.altKey &&
                    (event.key === "ArrowUp" || event.key === "ArrowDown")
                  ) {
                    event.preventDefault();
                    void saveMove(
                      block,
                      day,
                      Math.max(
                        0,
                        Math.min(
                          1440 - duration,
                          start + (event.key === "ArrowUp" ? -15 : 15),
                        ),
                      ),
                    );
                  }
                }}
              >
                <strong>
                  <ScheduleKind block={block} compact />
                  {timeBlockTitle(block, data)}
                </strong>
                {data.blockTaskLinks.some(
                  (link) => link.timeBlockId === block.id,
                ) && (
                  <span className="schedule-task-count">
                    {
                      data.blockTaskLinks.filter(
                        (link) => link.timeBlockId === block.id,
                      ).length
                    }{" "}
                    linked tasks
                  </span>
                )}
                <small>
                  {active ? clockLabel(top) : timeKey(block.startsAt, zone)} –{" "}
                  {active
                    ? clockLabel(top + height)
                    : timeKey(block.endsAt, zone)}
                </small>
              </button>
              <button
                className="block-resize"
                aria-label={"Resize " + timeBlockTitle(block, data)}
                disabled={busy}
                onPointerDown={(event) => begin(event, "resize", block)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                    event.preventDefault();
                    void saveMove(
                      block,
                      day,
                      start,
                      Math.max(
                        15,
                        Math.min(
                          1440 - start,
                          duration + (event.key === "ArrowUp" ? -15 : 15),
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
      {display?.kind === "create" && (
        <div
          className="schedule-create-preview"
          style={{ top: display.start, height: display.duration }}
        >
          <strong>{pending ? "Scheduling…" : "New time block"}</strong>
          <small>
            {clockLabel(display.start)} –{" "}
            {clockLabel(display.start + display.duration)}
          </small>
        </div>
      )}
    </div>
  );
}
