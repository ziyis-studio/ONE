import { PageDate } from "./PageDate";
import { useState } from "react";
import type { KeyboardEvent } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Moon,
} from "lucide-react";
import { useOne } from "../lib/workspace";
import { addDays, dateLabel, dayKey, timeKey } from "../domain/time";
import {
  sleepByDay,
  sleepDuration,
  sleepLevel,
  sleepYearDays,
} from "../lib/sleep-history";
import { Empty, IconButton } from "./ui";
export default function SleepPage() {
  const { data, edit, zone, today } = useOne();
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [selected, setSelected] = useState(today);
  const [focusDay, setFocusDay] = useState(today);
  const history = sleepByDay(data.sleepRecords, zone);
  const days = sleepYearDays(year);
  const currentYear = Number(today.slice(0, 4));
  const loggedDays = [...history.entries()].filter(
    ([date]) => Number(date.slice(0, 4)) === year && date <= today,
  );
  const average = loggedDays.length
    ? Math.round(
        loggedDays.reduce((sum, [, day]) => sum + day.minutes, 0) /
          loggedDays.length,
      )
    : 0;
  const recent = [...history.keys()]
    .filter((date) => date <= today)
    .sort()
    .at(-1);
  const records =
    history
      .get(selected)
      ?.records.toSorted((a, b) => a.startsAt.localeCompare(b.startsAt)) || [];
  function chooseYear(next: number) {
    setYear(next);
    const nextDay = next === currentYear ? today : next + "-12-31";
    setSelected(nextDay);
    setFocusDay(nextDay);
  }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    const distance: Record<string, number> = {
      ArrowUp: -1,
      ArrowDown: 1,
      ArrowLeft: -7,
      ArrowRight: 7,
    };
    if (!(event.key in distance)) return;
    event.preventDefault();
    const next = addDays(date, distance[event.key]);
    if (next.slice(0, 4) !== String(year) || next > today) return;
    setFocusDay(next);
    event.currentTarget
      .closest(".sleep-heatmap")
      ?.querySelector<HTMLButtonElement>('[data-date="' + next + '"]')
      ?.focus();
  }
  return (
    <>
      <div className="page-intro">
        <div>
          <PageDate />
          <h1>
            Sleep<span className="accent">.</span>
          </h1>
          <p className="page-description">
            Your sleep history, one day at a time.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => edit({ kind: "sleep", date: today })}
        >
          <Plus size={15} />
          Log sleep
        </button>
      </div>
      <div className="sleep-summary">
        <div>
          <span>AVERAGE PER LOGGED DAY</span>
          <strong>{sleepDuration(average)}</strong>
          <small>{year}</small>
        </div>
        <div>
          <span>DAYS LOGGED</span>
          <strong>{loggedDays.length}</strong>
          <small>in {year}</small>
        </div>
        <div>
          <span>MOST RECENT</span>
          <strong>
            {recent ? sleepDuration(history.get(recent)!.minutes) : "—"}
          </strong>
          <small>
            {recent
              ? dateLabel(recent, { month: "short", day: "numeric" })
              : "No entries yet"}
          </small>
        </div>
      </div>
      <section
        className="sleep-history-panel"
        aria-label="Sleep history heatmap"
      >
        <header>
          <div>
            <h2>Sleep history</h2>
            <p>Select a day to see its entries.</p>
          </div>
          <div className="date-navigation">
            <IconButton
              label="Previous year"
              onClick={() => chooseYear(year - 1)}
            >
              <ChevronLeft size={16} />
            </IconButton>
            <span className="heatmap-year">{year}</span>
            <IconButton
              label="Next year"
              disabled={year >= currentYear}
              onClick={() => chooseYear(year + 1)}
            >
              <ChevronRight size={16} />
            </IconButton>
          </div>
        </header>
        <div className="heatmap-scroll">
          <div className="heatmap-canvas">
            <div className="heatmap-month-labels">
              {Array.from({ length: days.length / 7 }, (_, week) => {
                const weekDays = days.slice(week * 7, week * 7 + 7);
                const first = weekDays.find(
                  (date) =>
                    date.slice(-2) === "01" &&
                    date.slice(0, 4) === String(year),
                );
                return (
                  <span key={week}>
                    {first ? dateLabel(first, { month: "short" }) : ""}
                  </span>
                );
              })}
            </div>
            <div className="heatmap-body">
              <div className="heatmap-weekdays" aria-hidden="true">
                {["M", "", "W", "", "F", "", "S"].map((day, index) => (
                  <span key={index}>{day}</span>
                ))}
              </div>
              <div
                className="sleep-heatmap"
                role="group"
                aria-label={"Daily sleep in " + year}
              >
                {days.map((date) => {
                  const current = history.get(date),
                    outside = date.slice(0, 4) !== String(year),
                    future = date > today;
                  const label =
                    dateLabel(date, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    }) +
                    (current
                      ? " · " + sleepDuration(current.minutes) + " sleep"
                      : " · No sleep logged");
                  return outside ? (
                    <span className="heatmap-cell outside" key={date} />
                  ) : (
                    <button
                      key={date}
                      data-date={date}
                      data-level={sleepLevel(current?.minutes)}
                      className={
                        "heatmap-cell level-" +
                        sleepLevel(current?.minutes) +
                        (date === today ? " is-today" : "") +
                        (date === selected ? " selected" : "")
                      }
                      disabled={future}
                      aria-label={label}
                      aria-pressed={date === selected}
                      data-chart-title={dateLabel(date)}
                      data-chart-detail={
                        current
                          ? sleepDuration(current.minutes) + " net sleep"
                          : "No sleep logged"
                      }
                      tabIndex={date === focusDay ? 0 : -1}
                      onFocus={() => setFocusDay(date)}
                      onKeyDown={(event) => keyboard(event, date)}
                      onClick={() => setSelected(date)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <footer className="heatmap-footer">
          <span>Net sleep · entries grouped by wake-up date</span>
          <div className="heatmap-legend">
            <span>No data</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <i
                className={"level-" + level}
                key={level}
                data-chart-title="Sleep duration"
                data-chart-detail={
                  [
                    "No data",
                    "Under 4 hours",
                    "4–6 hours",
                    "6–8 hours",
                    "8 hours or more",
                  ][level]
                }
              />
            ))}
            <span>8h+</span>
          </div>
        </footer>
      </section>
      <section className="sleep-day-panel" aria-label="Selected sleep day">
        <header>
          <div>
            <h2>
              {selected === today
                ? "Today"
                : dateLabel(selected, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
            </h2>
            <p>
              {records.length
                ? sleepDuration(history.get(selected)!.minutes) +
                  " net sleep · " +
                  records.length +
                  (records.length === 1 ? " entry" : " entries")
                : "No sleep logged for this date."}
            </p>
          </div>
          <button
            className="secondary-button"
            onClick={() => edit({ kind: "sleep", date: selected })}
          >
            <Plus size={14} />
            Add entry
          </button>
        </header>
        {records.length ? (
          <div className="sleep-day-entries">
            {records.map((record) => {
              const minutes = sleepByDay([record], zone).get(
                dayKey(record.endsAt, zone),
              )!.minutes;
              return (
                <button
                  className="sleep-entry"
                  key={record.id}
                  onClick={() => edit({ kind: "sleep", id: record.id })}
                >
                  <span className="sleep-entry-icon">
                    <Moon size={18} strokeWidth={1.4} />
                  </span>
                  <span>
                    <strong>
                      {timeKey(record.startsAt, zone)} –{" "}
                      {timeKey(record.endsAt, zone)}
                    </strong>
                    <small>
                      {record.awakeMinutes
                        ? record.awakeMinutes + " min awake"
                        : "No awake time recorded"}
                      {record.note ? " · " + record.note : ""}
                    </small>
                  </span>
                  <span className="sleep-entry-duration">
                    {sleepDuration(minutes)}
                  </span>
                  <ArrowUpRight size={15} />
                </button>
              );
            })}
          </div>
        ) : (
          <Empty
            title="No entry for this day"
            detail="Add your sleep time to fill in the history."
          />
        )}
      </section>
    </>
  );
}
