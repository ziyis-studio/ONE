import SleepSummary from "./SleepSummary";
import { PageDate } from "./PageDate";
import { useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Moon,
  Smile,
  Meh,
  Frown,
  Battery,
  BatteryLow,
} from "lucide-react";
import { useOne } from "../lib/workspace";
import { addDays, addMonths, dateLabel, dayKey, timeKey } from "../domain/time";
import {
  sleepByDay,
  sleepDuration,
  sleepLevel,
  sleepPeriod,
} from "../lib/sleep-history";
import type { SleepRange } from "../lib/sleep-history";
import { useViewState } from "../lib/view-state";
import { DiscreteTabs } from "./interactions";
import { Empty, IconButton } from "./ui";
import "./sleep-history.css";
export default function SleepPage() {
  const { data, edit, zone, today } = useOne();
  const [range, setRange] = useViewState<SleepRange>("sleep.range", "30days");
  const [anchor, setAnchor] = useViewState<string>("sleep.anchor", today);
  const [selected, setSelected] = useViewState<string>("sleep.selected", today);
  const [focusDay, setFocusDay] = useState(today);
  const scroll = useRef<HTMLDivElement>(null);
  const history = sleepByDay(data.sleepRecords, zone);
  const { start, end, days } = sleepPeriod(range, anchor);
  const label =
    range === "year"
      ? anchor.slice(0, 4)
      : range === "month"
        ? dateLabel(anchor, { month: "long", year: "numeric" })
        : dateLabel(start) + " – " + dateLabel(end);
  const records =
    history
      .get(selected)
      ?.records.toSorted((a, b) => a.startsAt.localeCompare(b.startsAt)) || [];
  function choosePeriod(amount: number) {
    const next =
      range === "30days"
        ? addDays(anchor, amount * 30)
        : addMonths(anchor, amount * (range === "year" ? 12 : 1));
    const period = sleepPeriod(range, next);
    const nextDay = period.end > today ? today : period.end;
    setAnchor(next);
    setSelected(nextDay);
    setFocusDay(nextDay);
  }
  function chooseRange(next: string) {
    setRange(next as SleepRange);
    setAnchor(today);
    setSelected(today);
    setFocusDay(today);
  }
  useLayoutEffect(() => {
    if (range !== "year" || !scroll.current) return;
    const container = scroll.current;
    const cell = container.querySelector<HTMLElement>(
      `[data-date="${selected}"]`,
    );
    if (!cell) return;
    const box = cell.getBoundingClientRect(),
      bounds = container.getBoundingClientRect();
    container.scrollTo({
      left: Math.max(
        0,
        container.scrollLeft +
          box.left -
          bounds.left -
          container.clientWidth / 2,
      ),
      behavior: "instant",
    });
  }, [range, anchor, selected]);
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    const distance: Record<string, number> = {
      ArrowUp: range === "year" ? -1 : -7,
      ArrowDown: range === "year" ? 1 : 7,
      ArrowLeft: range === "year" ? -7 : -1,
      ArrowRight: range === "year" ? 7 : 1,
    };
    if (!(event.key in distance)) return;
    event.preventDefault();
    const next = addDays(date, distance[event.key]);
    if (next < start || next > end || next > today) return;
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
      <SleepSummary
        history={history}
        start={start}
        end={end}
        today={today}
        label={label}
      />
      <section
        className="sleep-history-panel"
        aria-label="Sleep history heatmap"
      >
        <header>
          <div>
            <h2>Sleep history</h2>
            <p>Select a day to see its entries or log sleep.</p>
          </div>
          <div className="date-navigation">
            <IconButton
              label={"Previous " + (range === "30days" ? "30 days" : range)}
              onClick={() => choosePeriod(-1)}
            >
              <ChevronLeft size={16} />
            </IconButton>
            <span className="heatmap-year">{label}</span>
            <IconButton
              label={"Next " + (range === "30days" ? "30 days" : range)}
              disabled={end >= today}
              onClick={() => choosePeriod(1)}
            >
              <ChevronRight size={16} />
            </IconButton>
          </div>
        </header>
        <div className="one-sleep-ranges">
          <DiscreteTabs
            label="Sleep history range"
            value={range}
            onChange={chooseRange}
            items={[
              { value: "30days", label: "Last 30 days" },
              { value: "month", label: "This month" },
              { value: "year", label: "Year" },
            ]}
          />
        </div>
        <div className="heatmap-scroll" ref={scroll}>
          <div
            className={
              "heatmap-canvas" + (range === "year" ? "" : " one-sleep-period")
            }
          >
            {range === "year" ? (
              <div className="heatmap-month-labels">
                {Array.from({ length: days.length / 7 }, (_, week) => {
                  const weekDays = days.slice(week * 7, week * 7 + 7);
                  const first = weekDays.find(
                    (date) =>
                      date.slice(-2) === "01" &&
                      date.slice(0, 4) === anchor.slice(0, 4),
                  );
                  return (
                    <span key={week}>
                      {first ? dateLabel(first, { month: "short" }) : ""}
                    </span>
                  );
                })}
              </div>
            ) : (
              <div className="one-sleep-weekdays" aria-hidden="true">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                  (day) => (
                    <span key={day}>{day}</span>
                  ),
                )}
              </div>
            )}
            <div className="heatmap-body">
              {range === "year" && (
                <div className="heatmap-weekdays" aria-hidden="true">
                  {["M", "", "W", "", "F", "", "S"].map((day, index) => (
                    <span key={index}>{day}</span>
                  ))}
                </div>
              )}
              <div
                className="sleep-heatmap"
                role="group"
                aria-label={"Daily sleep · " + label}
              >
                {days.map((date) => {
                  const current = history.get(date),
                    outside = date < start || date > end,
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
                      tabIndex={
                        date ===
                        (focusDay >= start && focusDay <= end
                          ? focusDay
                          : selected)
                          ? 0
                          : -1
                      }
                      onFocus={() => setFocusDay(date)}
                      onKeyDown={(event) => keyboard(event, date)}
                      onClick={() => {
                        setSelected(date);
                        if (!current) edit({ kind: "sleep", date });
                      }}
                    >
                      {range !== "year" && (
                        <>
                          <span aria-hidden="true">
                            {Number(date.slice(-2))}
                          </span>
                          <small aria-hidden="true">
                            {current ? sleepDuration(current.minutes) : "·"}
                          </small>
                        </>
                      )}
                    </button>
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
              const feeling = record.note.match(
                /^\[(Rested|Good|Okay|Tired|Exhausted)\]/,
              )?.[1];
              const FeelingIcon =
                (
                  {
                    Rested: Battery,
                    Good: Smile,
                    Okay: Meh,
                    Tired: BatteryLow,
                    Exhausted: Frown,
                  } as const
                )[feeling as "Rested"] || Moon;
              return (
                <button
                  className="sleep-entry"
                  key={record.id}
                  onClick={() => edit({ kind: "sleep", id: record.id })}
                >
                  <span className="sleep-entry-icon">
                    <FeelingIcon
                      size={18}
                      strokeWidth={1.4}
                      aria-label={feeling || "Sleep"}
                    />
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
                      {record.note
                        ? " · " +
                          record.note
                            .replace(
                              /^\[(Rested|Good|Okay|Tired|Exhausted)\]\n?/,
                              "$1 · ",
                            )
                            .replace(/ · $/, "")
                        : ""}
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
