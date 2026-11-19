import { useId } from "react";
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
  const fillId = useId();
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
  const chartStart = entries[0]?.[0] || start,
    chartEnd = entries.at(-1)?.[0] || elapsedEnd;
  const maxHours = Math.max(
    12,
    ...entries.map(([, d]) => Math.ceil(d.minutes / 60 / 4) * 4),
  );
  const values = entries.map(([date, d]) => ({
    date,
    minutes: d.minutes,
    x:
      entries.length === 1
        ? 294
        : 44 +
          ((Date.parse(date) - Date.parse(chartStart)) /
            Math.max(86400000, Date.parse(chartEnd) - Date.parse(chartStart))) *
            500,
    y: 146 - (d.minutes / (maxHours * 60)) * 126,
  }));
  const path = values
    .map((point, index) => {
      if (!index) return `M${point.x},${point.y}`;
      const previous = values[index - 1],
        mid = (previous.x + point.x) / 2;
      return `C${mid},${previous.y} ${mid},${point.y} ${point.x},${point.y}`;
    })
    .join(" ");

  return (
    <div className="sleep-summary" aria-label="Sleep summary">
      <Card
        className="sleep-stat-card sleep-average-card"
        title="Average sleep"
        meta={<Moon size={17} aria-hidden="true" />}
      >
        <div className="sleep-stat-body">
          <div>
            <strong>{entries.length ? sleepDuration(average) : "—"}</strong>
            <small>Per logged day</small>
          </div>
        </div>
        {values.length > 0 ? (
          <div
            className="sleep-history-chart"
            role="group"
            aria-label="Sleep duration by logged day"
          >
            <svg
              viewBox="0 0 560 170"
              className="sleep-duration-chart"
              role="img"
              aria-label={
                entries.length +
                " logged days. Average " +
                sleepDuration(average)
              }
            >
              <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="currentColor"
                    stopOpacity=".22"
                  />
                  <stop
                    offset="100%"
                    stopColor="currentColor"
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>
              {[0, maxHours / 3, (maxHours * 2) / 3, maxHours].map((hour) => (
                <g key={hour}>
                  <line
                    x1="44"
                    x2="544"
                    y1={146 - (hour / maxHours) * 126}
                    y2={146 - (hour / maxHours) * 126}
                    stroke="currentColor"
                    strokeOpacity=".1"
                  />
                  <text
                    x="32"
                    y={150 - (hour / maxHours) * 126}
                    textAnchor="end"
                  >
                    {Math.round(hour)}h
                  </text>
                </g>
              ))}
              <path
                d={path + ` L${values.at(-1)!.x},146 L${values[0].x},146 Z`}
                fill={`url(#${fillId})`}
              />
              <path
                d={path}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {values.map((point) => (
                <circle
                  key={point.date}
                  cx={point.x}
                  cy={point.y}
                  r={values.length > 45 ? 2 : 3.5}
                  fill="currentColor"
                  tabIndex={0}
                  aria-label={
                    dateLabel(point.date) + ": " + sleepDuration(point.minutes)
                  }
                  data-chart-title={dateLabel(point.date)}
                  data-chart-detail={
                    sleepDuration(point.minutes) + " net sleep"
                  }
                >
                  <title>
                    {dateLabel(point.date) +
                      ": " +
                      sleepDuration(point.minutes)}
                  </title>
                </circle>
              ))}
            </svg>
            <div className="sleep-history-chart-dates">
              <span>{dateLabel(chartStart)}</span>
              <span>{dateLabel(chartEnd)}</span>
            </div>
          </div>
        ) : (
          <p className="sleep-chart-empty">
            Log your sleep to see your rest over time.
          </p>
        )}

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
