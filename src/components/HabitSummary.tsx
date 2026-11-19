import { Check, Flame, TrendingUp } from "lucide-react";
import type { HabitInsights } from "../domain/insights";
import { dateLabel } from "../domain/time";
import { Card } from "./ui";
import { useChartEntrance } from "../lib/chart-entrance";
export default function HabitSummary({
  insights,
  loading,
}: {
  insights: HabitInsights | null;
  loading: boolean;
}) {
  const entrance = {
    ready: !!insights && !loading,
    replayKey: insights ? `${insights.from}:${insights.to}` : "entry",
  };
  const bars = useChartEntrance<SVGSVGElement>(entrance);
  const ring = useChartEntrance<SVGSVGElement>(entrance);
  const trail = useChartEntrance<HTMLDivElement>(entrance);
  const daily =
    insights?.daily.filter((d) => d.date <= insights.today).slice(-28) || [];
  const max = Math.max(1, ...daily.map((d) => d.planned));
  return (
    <div
      className="habit-summary-cards"
      aria-label="Habit summary"
      aria-busy={loading}
    >
      <Card
        className="habit-stat-card"
        title="Completed"
        meta={<Check size={17} />}
      >
        <div className="habit-stat-value">
          <strong>{insights ? insights.completed : "—"}</strong>
          <span>of {insights?.planned ?? "—"} planned</span>
        </div>
        <svg
          className="habit-completion-bars"
          ref={bars}
          viewBox="0 0 300 60"
          role="group"
          aria-label="Daily habit completions"
        >
          {daily.map((d, i) => (
            <g
              key={d.date}
              tabIndex={0}
              role="img"
              aria-label={`${dateLabel(d.date)}: ${d.completed} of ${d.planned} completed`}
              data-chart-title={dateLabel(d.date)}
              data-chart-detail={`${d.completed} of ${d.planned} completed`}
            >
              <rect
                x={(i * 300) / daily.length + 1}
                y="0"
                width={Math.max(1, 300 / daily.length - 3)}
                height="60"
                fill="transparent"
              />
              <rect
                x={(i * 300) / daily.length + 1}
                y={58 - (d.planned / max) * 48}
                width={Math.max(1, 300 / daily.length - 3)}
                height={Math.max(2, (d.planned / max) * 48)}
                rx="2"
                className="habit-bar-planned"
                data-chart-enter="bar-y"
              />
              <rect
                x={(i * 300) / daily.length + 1}
                y={58 - (d.completed / max) * 48}
                width={Math.max(1, 300 / daily.length - 3)}
                height={(d.completed / max) * 48}
                rx="2"
                className="habit-bar-complete"
                data-chart-enter="bar-y"
              />
            </g>
          ))}
        </svg>
        <p className="habit-stat-note">
          Daily completions · {daily.length} recent days in this range
        </p>
      </Card>
      <Card
        className="habit-stat-card"
        title="Completion"
        meta={<TrendingUp size={17} />}
      >
        <div className="habit-completion-body">
          <svg
            viewBox="0 0 100 100"
            className="habit-rate-ring"
            ref={ring}
            role="img"
            aria-label={`${insights?.percentage ?? 0}% completion`}
          >
            <circle
              cx="50"
              cy="50"
              r="40"
              strokeWidth="7"
              fill="none"
              className="habit-rate-track"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              strokeWidth="7"
              fill="none"
              pathLength="100"
              data-chart-enter="draw"
              strokeDasharray={`${insights?.percentage ?? 0} 100`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
            <text x="50" y="56" textAnchor="middle">
              {insights ? `${insights.percentage}%` : "—"}
            </text>
          </svg>
          <div>
            <p>
              <strong>{insights?.perfectDays ?? "—"}</strong>
              <span>fully completed days</span>
            </p>
            <p>
              <strong>{insights?.activeDays ?? "—"}</strong>
              <span>days with activity</span>
            </p>
          </div>
        </div>
        <p className="habit-stat-note">Completed ÷ planned · through today</p>
      </Card>
      <Card
        className="habit-stat-card"
        title="Streak"
        meta={<Flame size={17} />}
      >
        <div className="habit-stat-value">
          <strong>
            {insights ? insights.currentStreak : "—"}
            <small> days</small>
          </strong>
          <span>{insights?.streakHabit || "Build a little momentum"}</span>
        </div>
        <div
          className="habit-streak-trail"
          ref={trail}
          role="group"
          aria-label="Streak habit activity over the last 14 days"
        >
          {insights?.trail.map((d) => (
            <span
              key={d.date}
              data-chart-enter="cell"
              className={`streak-day level-${d.level}`}
              tabIndex={0}
              role="img"
              aria-label={`${dateLabel(d.date)}: ${d.completed} of ${d.planned} completed`}
              data-chart-title={dateLabel(d.date)}
              data-chart-detail={
                d.planned
                  ? `${d.completed} of ${d.planned} completed`
                  : "Rest day"
              }
            />
          ))}
        </div>
        <p className="habit-stat-note">
          Best in this range: {insights?.bestStreak ?? "—"} days · scheduled
          days count
        </p>
      </Card>
    </div>
  );
}
