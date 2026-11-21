import { useState } from "react";
import { ArrowUpRight, CalendarDays, Clock3 } from "lucide-react";
import type { LinkedActivityBlock } from "../domain/activity";
import { dateLabel, dayKey, timeKey } from "../domain/time";
export default function LinkedTimeBlocks({
  blocks,
  zone,
  project,
  onOpen,
}: {
  blocks: LinkedActivityBlock[];
  zone: string;
  project: boolean;
  onOpen: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!blocks.length) return null;
  const shown = expanded ? blocks : blocks.slice(0, 3);
  return (
    <section className="entity-linked-blocks" aria-label="Linked time blocks">
      <header>
        <h3>
          <CalendarDays size={14} />
          Linked time blocks <span>{blocks.length}</span>
        </h3>
      </header>
      <div>
        {shown.map((block) => {
          const first = dayKey(block.startsAt, zone),
            last = dayKey(block.endsAt, zone);
          const date =
            dateLabel(first, { month: "short", day: "numeric" }) +
            (first === last
              ? ""
              : " – " + dateLabel(last, { month: "short", day: "numeric" }));
          const interval =
            timeKey(block.startsAt, zone) + " – " + timeKey(block.endsAt, zone);
          return (
            <button
              key={block.id}
              type="button"
              className="entity-linked-block"
              aria-label={`Open linked block ${block.title}, ${date}, ${interval}`}
              onClick={() => onOpen(block.id)}
            >
              <span className="entity-linked-block-date">
                <time dateTime={block.startsAt}>{date}</time>
                <span data-timing={block.timing}>
                  {block.timing === "current"
                    ? "Now"
                    : block.timing === "upcoming"
                      ? "Upcoming"
                      : "Past"}
                </span>
              </span>
              <strong>
                {block.title}
                <ArrowUpRight size={12} aria-hidden="true" />
              </strong>
              <span className="entity-linked-block-time">
                <Clock3 size={12} aria-hidden="true" />
                {interval}
                <small>{block.durationMinutes} min</small>
              </span>
              {block.recordedType && (
                <small>
                  Recorded{" "}
                  {block.recordedType === "focus"
                    ? "focus"
                    : block.recordedType === "short"
                      ? "short break"
                      : "long break"}
                </small>
              )}
              {project && (
                <small className="entity-linked-block-tasks">
                  {block.tasks.map((t) => t.title).join(" · ")}
                </small>
              )}
            </button>
          );
        })}
      </div>
      {blocks.length > 3 && (
        <button
          type="button"
          className="text-button entity-linked-block-more"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded
            ? "Show fewer time blocks"
            : `Show ${blocks.length - 3} more time blocks`}
        </button>
      )}
      <p className="entity-linked-block-zone">
        Times in {zone.replaceAll("_", " ")}
      </p>
    </section>
  );
}
