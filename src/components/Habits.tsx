import { useMemo, useState } from "react";
import { Plus, ArrowUpRight } from "lucide-react";
import type { Habit, HabitOccurrence, Workspace } from "../domain/model";
import { useOne } from "../lib/workspace";
import { dateLabel } from "../domain/time";
import { habitDay, habitRange, indexHabitHistory } from "../lib/habit-history";
import type { HabitRangePreset } from "../lib/habit-history";
import { CheckButton, Dialog, Empty, EntityIcon, IconButton } from "./ui";

const presets: { value: HabitRangePreset; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "30days", label: "Last 30 days" },
];
export default function HabitsPage() {
  const { data, today, busy, edit, execute, notify } = useOne();
  const [preset, setPreset] = useState<HabitRangePreset>("week");
  const [detail, setDetail] = useState<{
    habitId: string;
    date: string;
  } | null>(null);
  const range = useMemo(() => habitRange(preset, today), [preset, today]);
  const history = useMemo(() => indexHabitHistory(data), [data]);
  const rows = data.habits.map((habit) => {
    const cells = range.days.map((day) => habitDay(history, habit, day));
    const due = cells.filter((cell) => cell.date <= today);
    return {
      habit,
      completed: due.reduce((sum, cell) => sum + cell.completed, 0),
      planned: due.reduce((sum, cell) => sum + cell.planned, 0),
    };
  });
  const completed = rows.reduce((sum, row) => sum + row.completed, 0);
  const planned = rows.reduce((sum, row) => sum + row.planned, 0);
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
      const cell = habitDay(history, habit, date);
      if (!cell.planned) return;
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
        <div className="segmented" role="group" aria-label="Habit date range">
          {presets.map((item) => (
            <button
              key={item.value}
              aria-pressed={preset === item.value}
              className={preset === item.value ? "active" : ""}
              onClick={() => setPreset(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <span>
          {dateLabel(range.from, { month: "short", day: "numeric" })} –{" "}
          {dateLabel(range.to, { month: "short", day: "numeric" })}
        </span>
      </div>
      {data.habits.length ? (
        <>
          <div className="habit-range-stats">
            <div>
              <span>Completed</span>
              <strong>
                {completed}
                <small> / {planned}</small>
              </strong>
            </div>
            <div>
              <span>Completion</span>
              <strong>
                {planned ? Math.round((completed / planned) * 100) : 0}
                <small>%</small>
              </strong>
            </div>
            <div>
              <span>Habits</span>
              <strong>{data.habits.length}</strong>
            </div>
          </div>
          <div className="habit-heatmap-grid">
            {rows.map(({ habit, completed: done, planned: due }) => (
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
                <div className="habit-heatmap-weekdays" aria-hidden="true">
                  {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                    <span key={index}>{day}</span>
                  ))}
                </div>
                <div
                  className="habit-activity-cells"
                  role="group"
                  aria-label={habit.title + " completion history"}
                >
                  {range.calendarDays.map((date) => {
                    if (date < range.from || date > range.to)
                      return (
                        <span className="habit-activity-blank" key={date} />
                      );
                    const cell = habitDay(history, habit, date);
                    const allDone =
                      cell.planned > 0 && cell.completed === cell.planned;
                    const actualDates = [
                      ...new Set(
                        cell.occurrences.flatMap((occurrence) =>
                          history.executions.has(occurrence.id)
                            ? [
                                history.executions.get(occurrence.id)!
                                  .performedOn,
                              ]
                            : [],
                        ),
                      ),
                    ];
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
                        title={title}
                        disabled={busy || date > today || !cell.planned}
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
                <footer>
                  <span>
                    {done} / {due} completed
                  </span>
                  <strong>{due ? Math.round((done / due) * 100) : 0}%</strong>
                </footer>
              </section>
            ))}
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
              const execution = history.executions.get(occurrence.id);
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
