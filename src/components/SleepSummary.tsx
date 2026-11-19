import { Moon, CalendarCheck, Clock3 } from "lucide-react";
import type { SleepRecord } from "../domain/model";
import { dateLabel } from "../domain/time";
import { sleepDuration } from "../lib/sleep-history";
import { Card } from "./ui";
type Day = { minutes: number; records: SleepRecord[] };
export default function SleepSummary({
  history,
  start,
  end,
  today,
  label,
}: {
  history: Map<string, Day>;
  start: string;
  end: string;
  today: string;
  label: string;
}) {
  const entries = [...history.entries()]
    .filter(([date]) => date >= start && date <= end && date <= today)
    .sort(([a], [b]) => a.localeCompare(b));
  const average = entries.length
    ? Math.round(
        entries.reduce((sum, [, d]) => sum + d.minutes, 0) / entries.length,
      )
    : 0;
  const recent = entries.at(-1),
    elapsedEnd = end < today ? end : today;
  const total =
    elapsedEnd < start
      ? 0
      : Math.round((Date.parse(elapsedEnd) - Date.parse(start)) / 86400000) + 1;
  const values = entries.map(([date, d]) => ({
    x:
      6 +
      ((Date.parse(date) - Date.parse(start)) /
        Math.max(86400000, Date.parse(elapsedEnd) - Date.parse(start))) *
        108,
    y: 42 - (Math.min(720, d.minutes) / 720) * 34,
  }));
  const path = values
    .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  return (
    <div className="sleep-summary" aria-label="Sleep summary">
      <Card
        className="sleep-stat-card"
        title="Average sleep"
        meta={<Moon size={17} aria-hidden="true" />}
      >
        <div className="sleep-stat-body">
          <div>
            <strong>{entries.length ? sleepDuration(average) : "—"}</strong>
            <small>Per logged day</small>
          </div>
          {values.length > 0 && (
            <svg
              className="sleep-stat-trend"
              viewBox="0 0 120 50"
              aria-hidden="true"
            >
              <path
                d={path}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {values.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="2" fill="currentColor" />
              ))}
            </svg>
          )}
        </div>
        <p className="sleep-stat-note">{label}</p>
      </Card>
      <Card
        className="sleep-stat-card"
        title="Days logged"
        meta={<CalendarCheck size={17} aria-hidden="true" />}
      >
        <div className="sleep-stat-body">
          <div>
            <strong>{entries.length}</strong>
            <small>of {total} days in this range</small>
          </div>
        </div>
        <progress
          className="sleep-stat-coverage"
          value={entries.length}
          max={Math.max(1, total)}
          aria-label="Days with sleep records"
        />
      </Card>
      <Card
        className="sleep-stat-card"
        title="Most recent"
        meta={<Clock3 size={17} aria-hidden="true" />}
      >
        <div className="sleep-stat-body">
          <div>
            <strong>{recent ? sleepDuration(recent[1].minutes) : "—"}</strong>
            <small>
              {recent
                ? dateLabel(recent[0], {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })
                : "No entries yet"}
            </small>
          </div>
        </div>
        <p className="sleep-stat-note">
          {recent
            ? recent[1].records.length +
              " " +
              (recent[1].records.length === 1 ? "entry" : "entries") +
              " · net sleep"
            : "Log your rest to see it here."}
        </p>
      </Card>
    </div>
  );
}
