import { PageDate } from "./PageDate";
import HabitSummary from "./HabitSummary";
import { useInsights } from "../lib/insights";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Plus, ArrowUpRight } from "lucide-react";
import type { Habit, HabitOccurrence, Workspace } from "../domain/model";
import { useViewState } from "../lib/view-state";
import { useOne } from "../lib/workspace";
import { addDays, dateLabel } from "../domain/time";
import { habitRange } from "../lib/habit-history";
import type { HabitRangePreset } from "../lib/habit-history";
import { CheckButton, Dialog, Empty, EntityIcon, IconButton } from "./ui";
import { DiscreteTabs } from "./interactions";
import "./habit-insights.css";

const presets: { value: HabitRangePreset; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "30days", label: "Last 30 days" },
  { value: "year", label: "Year" },
];
export default function HabitsPage() {
  const { data, today, busy, edit, execute, notify } = useOne();
  const [preset, setPreset] = useViewState<HabitRangePreset>(
    "habits.range",
    "week",
  );
  const [detail, setDetail] = useState<{
    habitId: string;
    date: string;
  } | null>(null);
  const range = useMemo(() => habitRange(preset, today), [preset, today]);
  const summary = useInsights("habits", range.from, range.to);
  const heatmaps = useRef<HTMLDivElement>(null),
    revealedYear = useRef<string | null>(null);
  const [yearFocus, setYearFocus] = useState<Record<string, string>>({});
  useLayoutEffect(() => {
    if (preset !== "year") {
      revealedYear.current = null;
      return;
    }
    if (!summary.insights || revealedYear.current === range.from) return;
    revealedYear.current = range.from;
    heatmaps.current
      ?.querySelectorAll<HTMLElement>(".habit-year-scroll")
      .forEach((container) => {
        const cell = container.querySelector<HTMLElement>(
          `[data-date="${today}"]`,
        );
        if (cell)
          container.scrollTo({
            left: Math.max(0, cell.offsetLeft - container.clientWidth / 2),
            behavior: "instant",
          });
      });
  }, [preset, summary.insights, range.from, today]);
  function yearKeyboard(
    event: KeyboardEvent<HTMLButtonElement>,
    habitId: string,
    date: string,
  ) {
    const step = (
      { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 } as Record<
        string,
        number
      >
    )[event.key];
    if (!step) return;
    event.preventDefault();
    for (
      let next = addDays(date, step);
      next >= range.from && next <= range.to && next <= today;
      next = addDays(next, step)
    ) {
      const target = event.currentTarget
        .closest(".habit-year-cells")
        ?.querySelector<HTMLButtonElement>(`[data-date="${next}"]`);
      if (target && !target.disabled) {
        setYearFocus((old) => ({ ...old, [habitId]: next }));
        target.focus();
        break;
      }
    }
  }
  const rows = data.habits.map((habit) => {
    const row = summary.insights?.habits.find((h) => h.id === habit.id);
    return {
      habit,
      completed: row?.completed || 0,
      planned: row?.planned || 0,
      days: new Map(row?.days.map((d) => [d.date, d]) || []),
      focusDate:
        yearFocus[habit.id] ||
        row?.days.findLast((d) => d.date <= today && d.planned > 0)?.date,
    };
  });
  async function toggleOccurrence(
    occurrence: HabitOccurrence,
    snapshot: Workspace = data,
  ) {
    const execution = snapshot.executions.find(
      (item) => item.occurrenceId === occurrence.id,
    );
    await execute(
      execution
        ? {
            type: "execution.delete",
            id: execution.id,
            expectedUpdatedAt: execution.updatedAt,
          }
        : {
            type: "execution.record",
            occurrenceId: occurrence.id,
            performedOn: today,
          },
    );
  }
  async function selectDay(habit: Habit, date: string) {
    if (busy || date > today) return;
    try {
      let snapshot = data;
      const cell = rows.find((r) => r.habit.id === habit.id)?.days.get(date);
      if (!cell?.planned) return;
      if (cell.needsMaterialization)
        snapshot = (
          await execute({
            type: "occurrences.materialize",
            from: date,
            to: date,
          })
        ).snapshot;
      const occurrences = snapshot.occurrences.filter(
        (item) => item.habitId === habit.id && item.plannedOn === date,
      );
      if (occurrences.length > 1) setDetail({ habitId: habit.id, date });
      else if (occurrences.length === 1)
        await toggleOccurrence(occurrences[0], snapshot);
      else notify("No habit is scheduled for this date.", true);
    } catch {
      /* The workspace keeps and displays API errors. */
    }
  }
  const selectedHabit = data.habits.find(
    (habit) => habit.id === detail?.habitId,
  );
  const selectedOccurrences = detail
    ? data.occurrences.filter(
        (item) =>
          item.habitId === detail.habitId && item.plannedOn === detail.date,
      )
    : [];
  return (
    <>
      <div className="page-intro">
        <div>
          <PageDate />
          <h1>
            Habits<span className="accent">.</span>
          </h1>
          <p className="page-description">Your habits, one day at a time.</p>
        </div>
        <button
          className="primary-button"
          onClick={() => edit({ kind: "habit" })}
        >
          <Plus size={15} />
          New habit
        </button>
      </div>
      <div className="habit-range-toolbar">
        <DiscreteTabs
          value={preset}
          onChange={setPreset}
          items={presets}
          label="Habit date range"
        />
        <span>
          {dateLabel(range.from, { month: "short", day: "numeric" })} –{" "}
          {dateLabel(range.to, { month: "short", day: "numeric" })}
        </span>
      </div>
      {data.habits.length ? (
        <>
          <HabitSummary insights={summary.insights} loading={summary.loading} />
          {summary.error && (
            <p className="insights-error" role="status">
              Could not load habit activity.{" "}
              <button onClick={summary.reload}>Try again</button>
            </p>
          )}
          <div
            ref={heatmaps}
            className={
              "habit-heatmap-grid" + (preset === "year" ? " is-year" : "")
            }
          >
            {rows.map(
              ({ habit, completed: done, planned: due, days, focusDate }) => (
                <section
                  className="habit-activity-card"
                  aria-label={habit.title + " activity"}
                  key={habit.id}
                >
                  <header>
                    <span className="habit-activity-icon">
                      <EntityIcon name={habit.icon || "repeat"} size={17} />
                    </span>
                    <div>
                      <h2>
                        <button
                          onClick={() => edit({ kind: "habit", id: habit.id })}
                        >
                          {habit.title}
                        </button>
                      </h2>
                      <p>
                        {habit.isoWeekdays.length === 7
                          ? "Every day"
                          : habit.isoWeekdays.length + " days a week"}
                      </p>
                    </div>
                    <IconButton
                      label={"Edit " + habit.title}
                      onClick={() => edit({ kind: "habit", id: habit.id })}
                    >
                      <ArrowUpRight size={15} />
                    </IconButton>
                  </header>
                  <div className={preset === "year" ? "habit-year-scroll" : ""}>
                    {preset === "year" && (
                      <div className="habit-year-months" aria-hidden="true">
                        {Array.from(
                          { length: range.calendarDays.length / 7 },
                          (_, i) => {
                            const first = range.calendarDays
                              .slice(i * 7, i * 7 + 7)
                              .find(
                                (d) =>
                                  d.slice(-2) === "01" &&
                                  d >= range.from &&
                                  d <= range.to,
                              );
                            return (
                              <span key={i}>
                                {first
                                  ? dateLabel(first, { month: "short" })
                                  : ""}
                              </span>
                            );
                          },
                        )}
                      </div>
                    )}
                    <div className="habit-heatmap-weekdays" aria-hidden="true">
                      {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                        <span key={index}>{day}</span>
                      ))}
                    </div>
                    <div
                      className={
                        "habit-activity-cells" +
                        (preset === "year" ? " habit-year-cells" : "")
                      }
                      role="group"
                      aria-label={habit.title + " completion history"}
                    >
                      {range.calendarDays.map((date) => {
                        if (date < range.from || date > range.to)
                          return (
                            <span className="habit-activity-blank" key={date} />
                          );
                        const cell = days.get(date);
                        if (!cell)
                          return (
                            <span
                              className="habit-activity-blank is-loading"
                              key={date}
                            />
                          );
                        const allDone =
                          cell.planned > 0 && cell.completed === cell.planned;
                        const actualDates = cell.actualDates;
                        const title =
                          dateLabel(date, {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                          }) +
                          " · " +
                          (cell.planned
                            ? cell.completed + "/" + cell.planned + " completed"
                            : "Not scheduled") +
                          (actualDates.length
                            ? " · Recorded " + actualDates.join(", ")
                            : "");
                        return (
                          <button
                            key={date}
                            data-date={date}
                            tabIndex={
                              preset === "year"
                                ? date === focusDate
                                  ? 0
                                  : -1
                                : undefined
                            }
                            onFocus={() => {
                              if (preset === "year")
                                setYearFocus((old) =>
                                  old[habit.id] === date
                                    ? old
                                    : { ...old, [habit.id]: date },
                                );
                            }}
                            onKeyDown={
                              preset === "year"
                                ? (event) => yearKeyboard(event, habit.id, date)
                                : undefined
                            }
                            className={
                              "habit-activity-cell activity-" +
                              cell.level +
                              (date === today ? " is-today" : "") +
                              (date > today ? " future" : "")
                            }
                            aria-label={
                              (allDone ? "Undo " : "Complete ") +
                              habit.title +
                              " for " +
                              date
                            }
                            aria-pressed={cell.level === 2 ? "mixed" : allDone}
                            data-chart-title={
                              habit.title + " · " + dateLabel(date)
                            }
                            data-chart-detail={title
                              .split(" · ")
                              .slice(1)
                              .join(" · ")}
                            disabled={
                              busy ||
                              summary.loading ||
                              date > today ||
                              !cell.planned
                            }
                            onClick={() => void selectDay(habit, date)}
                          >
                            <span>{Number(date.slice(-2))}</span>
                            {cell.planned > 1 && (
                              <small>
                                {cell.completed}/{cell.planned}
                              </small>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <footer>
                    <span>
                      {done} / {due} completed
                    </span>
                    <strong>{due ? Math.round((done / due) * 100) : 0}%</strong>
                  </footer>
                </section>
              ),
            )}
          </div>
          <div className="habit-heatmap-legend">
            <span>
              <i className="activity-0" />
              Not scheduled
            </span>
            <span>
              <i className="activity-1" />
              Planned
            </span>
            <span>
              <i className="activity-2" />
              Partial
            </span>
            <span>
              <i className="activity-3" />
              Completed
            </span>
          </div>
        </>
      ) : (
        <section className="habits-empty-panel">
          <Empty
            title="No habits yet"
            detail="Create a habit to start tracking your days."
            action={() => edit({ kind: "habit" })}
            label="New habit"
          />
        </section>
      )}
      {detail && selectedHabit && (
        <Dialog
          title={selectedHabit.title + " · " + dateLabel(detail.date)}
          onClose={() => setDetail(null)}
        >
          <div className="habit-day-occurrences">
            {selectedOccurrences.map((occurrence, index) => {
              const execution = data.executions.find(
                (e) => e.occurrenceId === occurrence.id,
              );
              return (
                <div key={occurrence.id}>
                  <CheckButton
                    checked={!!execution}
                    label={
                      (execution ? "Undo" : "Complete") +
                      " occurrence " +
                      (index + 1)
                    }
                    disabled={busy}
                    onClick={() => {
                      void toggleOccurrence(occurrence).catch(() => {});
                    }}
                  />
                  <span>
                    Scheduled {dateLabel(occurrence.scheduledOn)}
                    {execution && (
                      <small>Recorded {dateLabel(execution.performedOn)}</small>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </Dialog>
      )}
    </>
  );
}
