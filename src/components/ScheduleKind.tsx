import { CalendarDays, Coffee, Target } from "lucide-react";
import type { TimeBlock } from "../domain/model";
export function scheduleKind(block: TimeBlock) {
  return block.recordedType === "focus"
    ? "focus"
    : block.recordedType
      ? "break"
      : "planned";
}
export default function ScheduleKind({
  block,
  compact = false,
}: {
  block: TimeBlock;
  compact?: boolean;
}) {
  const kind = scheduleKind(block),
    label =
      kind === "planned"
        ? "Planned"
        : kind === "focus"
          ? "Actual focus"
          : "Actual break";
  const Icon =
    kind === "planned" ? CalendarDays : kind === "focus" ? Target : Coffee;
  return (
    <span
      className={"schedule-kind " + kind + (compact ? " compact" : "")}
      title={label}
      aria-label={label}
    >
      <Icon size={12} aria-hidden="true" />
      {!compact && <span>{label}</span>}
    </span>
  );
}
export function ScheduleLegend() {
  return (
    <div className="schedule-legend" aria-label="Schedule entry types">
      <span>
        <CalendarDays size={12} />
        Planned
      </span>
      <span>
        <Target size={12} />
        Actual focus
      </span>
      <span>
        <Coffee size={12} />
        Actual break
      </span>
    </div>
  );
}
