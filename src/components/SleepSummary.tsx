import { useId, useState } from "react";
import { Moon, Sunrise, Clock3 } from "lucide-react";
import type { SleepInsights } from "../domain/insights";
import { dateLabel, timeKey } from "../domain/time";
import { sleepDuration } from "../lib/sleep-history";
import { Card } from "./ui";

const clockMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
export default function SleepSummary({
  insights,
  label,
  loading = false,
  error = "",
  onRetry,
  zone,
}: {
  insights: SleepInsights | null;
  label: string;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  zone: string;
}) {
  const fillId = useId();
  const [active, setActive] = useState<string | null>(null);
  const entries = insights?.days || [];
  const first = entries[0]?.date,
    last = entries.at(-1)?.date;
  const maxHours = Math.max(
    12,
    ...entries.map((d) => Math.ceil(d.minutes / 60 / 4) * 4),
  );
  const values = entries.map((day) => ({
    ...day,
    x:
      entries.length === 1
        ? 294
        : 44 +
          ((Date.parse(day.date) - Date.parse(first!)) /
            Math.max(86400000, Date.parse(last!) - Date.parse(first!))) *
            500,
    y: 146 - (day.minutes / (maxHours * 60)) * 126,
  }));
  const path = values
    .map((point, i) => {
      if (!i) return `M${point.x},${point.y}`;
      const previous = values[i - 1],
        mid = (previous.x + point.x) / 2;
      return `C${mid},${previous.y} ${mid},${point.y} ${point.x},${point.y}`;
    })
    .join(" ");
  const rhythm = insights?.rhythm,
    recent = insights?.recent;
  const band = rhythm
    ? ((clockMinutes(rhythm.wakeTime) - clockMinutes(rhythm.bedtime) + 1440) %
        1440) /
      1440
    : 0;
  return (
    <div
      className="sleep-summary"
      aria-label="Sleep summary"
      aria-busy={loading}
    >
      <Card
        className="sleep-stat-card sleep-average-card"
        title="Average sleep"
        meta={<Moon size={17} aria-hidden="true" />}
      >
        <div className="sleep-stat-body">
          <div>
            <strong>
              {insights?.average != null
                ? sleepDuration(insights.average)
                : "—"}
            </strong>
            <small>Per logged day</small>
          </div>
          {insights && (
            <span className="sleep-data-count">
              {insights.loggedDays} logged days
            </span>
          )}
        </div>
        {values.length ? (
          <div
            className="sleep-history-chart"
            role="group"
            aria-label="Sleep duration by logged day"
          >
            <svg
              viewBox="0 0 560 170"
              className="sleep-duration-chart"
              role="group"
              aria-label={`${entries.length} logged days. Average ${sleepDuration(insights!.average!)}`}
              onPointerLeave={() => setActive(null)}
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
                pointerEvents="none"
              />
              <path
                d={path}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                pointerEvents="none"
              />
              {values.map((point, i) => {
                const left = i ? (values[i - 1].x + point.x) / 2 : 38,
                  right =
                    i < values.length - 1
                      ? (point.x + values[i + 1].x) / 2
                      : 550;
                return (
                  <g
                    key={point.date}
                    className="sleep-chart-node"
                    tabIndex={0}
                    role="img"
                    aria-label={`${dateLabel(point.date)}: ${sleepDuration(point.minutes)}`}
                    data-chart-title={dateLabel(point.date, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                    data-chart-detail={`${sleepDuration(point.minutes)} net sleep · ${point.entries} ${point.entries === 1 ? "entry" : "entries"}`}
                    onPointerEnter={() => setActive(point.date)}
                    onFocus={() => setActive(point.date)}
                    onBlur={() => setActive(null)}
                  >
                    <rect
                      x={left}
                      y="8"
                      width={right - left}
                      height="144"
                      fill="transparent"
                    />
                    {active === point.date && (
                      <>
                        <line
                          x1={point.x}
                          x2={point.x}
                          y1="15"
                          y2="146"
                          stroke="currentColor"
                          strokeDasharray="3 4"
                          opacity=".3"
                          pointerEvents="none"
                        />
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="8"
                          fill="currentColor"
                          opacity=".18"
                          pointerEvents="none"
                        />
                      </>
                    )}
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={
                        active === point.date
                          ? 4.5
                          : values.length > 45
                            ? 2
                            : 3.5
                      }
                      fill="currentColor"
                      pointerEvents="none"
                    />
                  </g>
                );
              })}
            </svg>
            <div className="sleep-history-chart-dates">
              <span>{dateLabel(first!)}</span>
              <span>{dateLabel(last!)}</span>
            </div>
          </div>
        ) : (
          <p className="sleep-chart-empty">
            {loading
              ? "Loading your sleep history…"
              : "Log your sleep to see your rest over time."}
          </p>
        )}
        <p className="sleep-stat-note">
          {label}
          {insights
            ? ` · ${insights.loggedDays} of ${insights.elapsedDays} days logged`
            : ""}
        </p>
      </Card>
      <Card
        className="sleep-stat-card sleep-rhythm-card"
        title="Sleep rhythm"
        meta={<Moon size={17} aria-hidden="true" />}
      >
        <div className="sleep-rhythm-main">
          <svg
            viewBox="0 0 100 100"
            className="sleep-clock-chart"
            role="img"
            aria-label={
              rhythm
                ? `Usual sleep window ${rhythm.bedtime} to ${rhythm.wakeTime}`
                : "No sleep rhythm yet"
            }
          >
            <circle
              cx="50"
              cy="50"
              r="39"
              fill="none"
              stroke="currentColor"
              opacity=".13"
              strokeWidth="7"
            />
            {rhythm && (
              <circle
                cx="50"
                cy="50"
                r="39"
                fill="none"
                stroke="currentColor"
                strokeWidth="7"
                pathLength="1"
                strokeDasharray={`${band} 1`}
                strokeLinecap="round"
                transform={`rotate(${clockMinutes(rhythm.bedtime) / 4 - 90} 50 50)`}
              />
            )}
            <text x="50" y="47" textAnchor="middle">
              24h
            </text>
            <text
              x="50"
              y="61"
              textAnchor="middle"
              className="sleep-clock-caption"
            >
              rhythm
            </text>
          </svg>
          <div className="sleep-clock-times">
            <div>
              <span>
                <Moon size={12} /> Avg. bedtime
              </span>
              <strong>{rhythm?.bedtime || "—"}</strong>
            </div>
            <div>
              <span>
                <Sunrise size={12} /> Avg. wake-up
              </span>
              <strong>{rhythm?.wakeTime || "—"}</strong>
            </div>
          </div>
        </div>
        <div className="sleep-insight-pair">
          <div>
            <span>Bedtime variation</span>
            <strong>{rhythm ? `${rhythm.variation} min` : "—"}</strong>
          </div>
          <div>
            <span>Observed sleep range</span>
            <strong>
              {insights?.shortest != null
                ? `${sleepDuration(insights.shortest)} – ${sleepDuration(insights.longest!)}`
                : "—"}
            </strong>
          </div>
        </div>
        <p className="sleep-stat-note">
          {rhythm
            ? `Based on the longest sleep period on each of ${rhythm.samples} logged days.`
            : "Your usual sleep window will appear as you log your rest."}
        </p>
      </Card>
      <Card
        className="sleep-stat-card sleep-recent-card"
        title="Most recent"
        meta={<Clock3 size={17} aria-hidden="true" />}
      >
        <div className="sleep-stat-body">
          <div>
            <strong>{recent ? sleepDuration(recent.minutes) : "—"}</strong>
            <small>
              {recent
                ? dateLabel(recent.date, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })
                : "No entries yet"}
            </small>
          </div>
        </div>
        <div className="sleep-recent-times">
          <div>
            <span>
              <Moon size={12} /> Bedtime
            </span>
            <strong>{recent?.bedtime || "—"}</strong>
          </div>
          <div>
            <span>
              <Sunrise size={12} /> Wake-up
            </span>
            <strong>{recent?.wakeTime || "—"}</strong>
          </div>
        </div>
        {recent ? (
          <>
            <div
              className="sleep-composition"
              role="img"
              aria-label={`${sleepDuration(recent.minutes)} asleep, ${recent.awake} minutes awake, ${sleepDuration(recent.inBed)} in bed`}
            >
              <span
                style={{
                  width: `${recent.inBed ? (recent.minutes / recent.inBed) * 100 : 0}%`,
                }}
              />
              <i style={{ flex: 1 }} />
            </div>
            <div className="sleep-composition-legend">
              <span>
                <i />
                Net sleep
              </span>
              <span>
                <i />
                {recent.awake}m awake
              </span>
            </div>
            <div className="sleep-recent-comparison">
              {recent.difference == null
                ? "Your latest recorded rest."
                : recent.difference === 0
                  ? "Same duration as the previous logged day."
                  : `${sleepDuration(Math.abs(recent.difference))} ${recent.difference > 0 ? "longer" : "shorter"} than the previous logged day.`}
            </div>
            {recent.records.length > 1 && (
              <details className="sleep-period-details">
                <summary>{recent.records.length} sleep periods</summary>
                {recent.records.map((r) => (
                  <p key={r.id}>
                    {timeKey(r.startsAt, zone)} – {timeKey(r.endsAt, zone)}
                    <span>{sleepDuration(r.minutes)}</span>
                  </p>
                ))}
              </details>
            )}
            <p className="sleep-stat-note">
              {sleepDuration(recent.inBed)} in bed · {recent.entries}{" "}
              {recent.entries === 1 ? "entry" : "entries"}
            </p>
          </>
        ) : (
          <p className="sleep-chart-empty">
            Log your rest to see its timing and duration here.
          </p>
        )}
      </Card>
      {error && (
        <p className="insights-error" role="status">
          Could not load sleep insights.{" "}
          <button onClick={onRetry}>Try again</button>
        </p>
      )}
    </div>
  );
}
