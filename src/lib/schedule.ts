import type { TimeBlock, Workspace } from "../domain/model";
import { addDays, dayBounds, timeKey, wallTime } from "../domain/time";
import type { BlockInput } from "../domain/commands";
export const SCHEDULE_SNAP = 15;
export function snapMinute(value: number) {
  return Math.max(
    0,
    Math.min(1440, Math.round(value / SCHEDULE_SNAP) * SCHEDULE_SNAP),
  );
}
export function minuteTimestamp(day: string, minute: number, zone: string) {
  const actualDay = addDays(day, Math.floor(minute / 1440));
  const value = ((minute % 1440) + 1440) % 1440;
  return wallTime(
    actualDay,
    String(Math.floor(value / 60)).padStart(2, "0") +
      ":" +
      String(value % 60).padStart(2, "0"),
    zone,
  );
}
export function rescheduledBlock(
  block: TimeBlock,
  day: string,
  zone: string,
  minute?: number,
  duration?: number,
): BlockInput {
  const startsAt =
    minute === undefined
      ? wallTime(day, timeKey(block.startsAt, zone), zone)
      : minuteTimestamp(day, minute, zone);
  return {
    title: block.title,
    description: block.description,
    timeZone: zone,
    startsAt,
    endsAt: new Date(
      Date.parse(startsAt) +
        (duration === undefined
          ? Date.parse(block.endsAt) - Date.parse(block.startsAt)
          : duration * 60_000),
    ).toISOString(),
  };
}
export function blocksOnDay(blocks: TimeBlock[], day: string, zone: string) {
  const [start, end] = dayBounds(day, zone);
  return blocks
    .filter((b) => Date.parse(b.startsAt) < end && Date.parse(b.endsAt) > start)
    .toSorted(
      (a, b) =>
        a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id),
    );
}
export function layoutDayBlocks(
  blocks: TimeBlock[],
  day: string,
  zone: string,
) {
  const [dayStart, dayEnd] = dayBounds(day, zone);
  const visible = blocksOnDay(blocks, day, zone);
  const output: {
    block: TimeBlock;
    start: number;
    duration: number;
    column: number;
    columns: number;
  }[] = [];
  let group: typeof output = [];
  let ends: number[] = [];
  let groupEnd = 0;
  function flush() {
    for (const item of group) item.columns = ends.length;
    output.push(...group);
    group = [];
    ends = [];
  }
  for (const block of visible) {
    const startMs = Math.max(dayStart, Date.parse(block.startsAt)),
      endMs = Math.min(dayEnd, Date.parse(block.endsAt));
    if (group.length && startMs >= groupEnd) flush();
    let column = ends.findIndex((end) => end <= startMs);
    if (column < 0) column = ends.length;
    ends[column] = endMs;
    groupEnd = Math.max(...ends);
    const [hour, minute] = timeKey(new Date(startMs), zone)
      .split(":")
      .map(Number);
    const start = hour * 60 + minute;
    const [endHour, endMinute] = timeKey(new Date(endMs), zone)
      .split(":")
      .map(Number);
    const finish = endMs === dayEnd ? 1440 : endHour * 60 + endMinute;
    group.push({
      block,
      start,
      duration: Math.max(1, finish - start),
      column,
      columns: 1,
    });
  }
  flush();
  return output;
}

/** Derive a display name without copying a task name into the saved block title. */
export function timeBlockTitle(
  block: Pick<TimeBlock, "id"> & { title?: string | null },
  workspace: Pick<Workspace, "tasks" | "blockTaskLinks">,
) {
  if (block.title?.trim()) return block.title.trim();
  const ids = new Set(
    workspace.blockTaskLinks
      .filter((link) => link.timeBlockId === block.id)
      .map((link) => link.taskId),
  );
  const names = workspace.tasks
    .filter((task) => ids.has(task.id))
    .map((task) => (task.title || "").trim())
    .filter(Boolean);
  return names.join(" · ") || "Untitled block";
}
