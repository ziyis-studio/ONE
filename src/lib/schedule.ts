import type { TimeBlock } from "../domain/model";
import { dayBounds, timeKey } from "../domain/time";
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
