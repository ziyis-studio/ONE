import {
  Plus,
  ArrowUpRight,
  Moon,
  ArrowRight,
  Sparkles,
  Clock3,
} from "lucide-react";
import { useOne } from "../lib/workspace";
import { useActions } from "../lib/actions";
import { blocksOnDay } from "../lib/schedule";
import {
  dateLabel,
  dayKey,
  timeKey,
  weekDays,
  minutesBetween,
} from "../domain/time";
import { Card, CheckButton, Empty, EntityIcon } from "./ui";
import WeatherCard from "./WeatherCard";
export default function Dashboard() {
  const { data, today, zone, now, edit, navigate, busy } = useOne();
  const { toggleTask, toggleHabit, safely } = useActions();
  const todayBlocks = blocksOnDay(data.timeBlocks, today, zone);
  const scheduledTasks = new Set(
    data.blockTaskLinks
      .filter((l) => todayBlocks.some((b) => b.id === l.timeBlockId))
      .map((l) => l.taskId),
  );
  const tasks = data.tasks
    .filter((t) => t.deadline === today || scheduledTasks.has(t.id))
    .toSorted((a, b) => Number(!!a.completedAt) - Number(!!b.completedAt));
  const occurrences = data.occurrences.filter(
    (o) => o.plannedOn === today && data.habits.some((h) => h.id === o.habitId),
  );
  const executed = new Set(data.executions.map((e) => e.occurrenceId));
  const sleep = data.sleepRecords
    .toSorted((a, b) => a.endsAt.localeCompare(b.endsAt))
    .slice(-7);
  const lastSleep = sleep.at(-1);
  const netMinutes = lastSleep
    ? minutesBetween(lastSleep.startsAt, lastSleep.endsAt) -
      lastSleep.awakeMinutes
    : 0;
  const thoughts = data.thoughts
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 2);
  const notes = data.notes
    .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 3);
  const done = tasks.filter((t) => t.completedAt).length;
  const days = weekDays(today);
  return (
    <>
      <div className="page-intro home-intro">
        <div>
          <p className="date-line">
            {dateLabel(today, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <h1>
            Today<span className="accent">.</span>
          </h1>
          <p className="page-description">Your day, at a glance.</p>
        </div>
        <span className="intro-pill">
          <span className="live-dot" />
          {tasks.length - done} things to focus on
        </span>
      </div>
      <div className="dashboard-grid">
        <WeatherCard />
        <Card
          title="Habits"
          action={() => navigate("habits")}
          className="habits-card"
          meta={
            <span className="small-count">
              {occurrences.filter((o) => executed.has(o.id)).length}
              <span> / {occurrences.length}</span>
            </span>
          }
        >
          {occurrences.length ? (
            <div className="ritual-list">
              {occurrences.slice(0, 3).map((o) => {
                const habit = data.habits.find((h) => h.id === o.habitId)!;
                return (
                  <div className="ritual-row" key={o.id}>
                    <span className="ritual-icon">
                      <EntityIcon name={habit.icon} size={16} />
                    </span>
                    <button
                      className="ritual-name"
                      onClick={() => edit({ kind: "habit", id: habit.id })}
                    >
                      {habit.title}
                    </button>
                    <div className="habit-week-mini" aria-label="This week">
                      {days.map((d) => (
                        <i
                          key={d}
                          title={dateLabel(d)}
                          className={
                            (data.occurrences.some(
                              (x) =>
                                x.habitId === habit.id &&
                                x.plannedOn === d &&
                                executed.has(x.id),
                            )
                              ? "filled "
                              : "") + (d === today ? "today" : "")
                          }
                        />
                      ))}
                    </div>
                    <CheckButton
                      circle
                      checked={executed.has(o.id)}
                      disabled={busy}
                      label={
                        (executed.has(o.id) ? "Undo " : "Complete ") +
                        habit.title
                      }
                      onClick={() => safely(() => toggleHabit(o.id))}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty
              title="Small steps, every day."
              action={() => edit({ kind: "habit" })}
              label="Start a ritual"
            />
          )}
          {occurrences.length > 0 && (
            <button
              className="card-bottom-link"
              onClick={() => navigate("habits")}
            >
              A little consistency goes a long way
              <ArrowRight size={13} />
            </button>
          )}
        </Card>
        <Card
          title="Sleep"
          action={() => navigate("sleep")}
          className="sleep-card"
        >
          {lastSleep ? (
            <>
              <div className="sleep-readout">
                <Moon size={17} />
                <strong>
                  {Math.floor(netMinutes / 60)}
                  <small>h</small> {netMinutes % 60}
                  <small>m</small>
                </strong>
              </div>
              <p className="sleep-caption">
                {timeKey(lastSleep.startsAt, zone)} –{" "}
                {timeKey(lastSleep.endsAt, zone)}
                <span> · net sleep</span>
              </p>
              <div
                className="sleep-chart"
                role="img"
                aria-label="Your recent sleep durations"
              >
                {sleep.map((s, i) => (
                  <div
                    key={s.id}
                    title={
                      dateLabel(dayKey(s.endsAt, zone)) +
                      ": " +
                      Math.round(
                        (minutesBetween(s.startsAt, s.endsAt) -
                          s.awakeMinutes) /
                          6,
                      ) /
                        10 +
                      " hours"
                    }
                  >
                    <i
                      className={i === sleep.length - 1 ? "latest" : ""}
                      style={{
                        height:
                          Math.max(
                            10,
                            Math.min(
                              55,
                              (minutesBetween(s.startsAt, s.endsAt) -
                                s.awakeMinutes) /
                                10,
                            ),
                          ) + "px",
                      }}
                    />
                    <span>
                      {dateLabel(dayKey(s.endsAt, zone), { weekday: "narrow" })}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Empty
              title="Rest matters, too."
              action={() => edit({ kind: "sleep" })}
              label="Log your sleep"
            />
          )}
        </Card>
        <Card
          title="Tasks"
          action={() => navigate("tasks")}
          className="tasks-card"
          meta={
            <span className="small-count">
              {done}
              <span> / {tasks.length}</span>
            </span>
          }
        >
          {tasks.length ? (
            <>
              <div className="focus-list">
                {tasks.slice(0, 4).map((task) => (
                  <div
                    className={
                      "focus-row " + (task.completedAt ? "completed" : "")
                    }
                    key={task.id}
                  >
                    <CheckButton
                      checked={!!task.completedAt}
                      label={
                        (task.completedAt ? "Reopen " : "Complete ") +
                        task.title
                      }
                      disabled={busy}
                      onClick={() => safely(() => toggleTask(task))}
                    />
                    <button
                      className="focus-title"
                      onClick={() => edit({ kind: "task", id: task.id })}
                    >
                      {task.title}
                      <span>
                        {data.projects.find((p) => p.id === task.projectId)
                          ?.title || "Personal task"}
                      </span>
                    </button>
                    {task.startedAt && !task.completedAt && (
                      <span className="status-dot purple" />
                    )}
                    {task.completedAt && (
                      <span className="done-label">Done</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="progress-track">
                <i style={{ width: (done / tasks.length) * 100 + "%" }} />
              </div>
              <div className="card-bottom">
                <button
                  className="text-button"
                  onClick={() => edit({ kind: "task", date: today })}
                >
                  <Plus size={14} />
                  Add a task
                </button>
                <span className="fine">
                  {done === tasks.length
                    ? "A good day’s work."
                    : done + " little win" + (done === 1 ? "" : "s") + " today"}
                </span>
              </div>
            </>
          ) : (
            <Empty
              title="A fresh page for today."
              detail="Give one small thing your attention."
              action={() => edit({ kind: "task", date: today })}
              label="Add a task"
            />
          )}
        </Card>
        <Card
          title="Schedule"
          action={() => navigate("schedule")}
          className="timeline-card"
          meta={
            <button
              className="tiny-pill"
              onClick={() => edit({ kind: "block", date: today })}
            >
              <Plus size={12} />
              Plan time
            </button>
          }
        >
          {todayBlocks.length ? (
            <div className="day-timeline">
              {todayBlocks.slice(0, 4).map((block, i) => {
                const active =
                  new Date(block.startsAt) <= now &&
                  new Date(block.endsAt) > now;
                return (
                  <div
                    className={"timeline-row " + (active ? "is-now" : "")}
                    key={block.id}
                  >
                    <time>{timeKey(block.startsAt, zone)}</time>
                    <span className="timeline-axis">
                      <i />
                    </span>
                    <button
                      className={"timeline-event event-" + (i % 4)}
                      onClick={() => edit({ kind: "block", id: block.id })}
                    >
                      <span>
                        <strong>
                          {block.title || "A little time for yourself"}
                        </strong>
                        <small>
                          <Clock3 size={11} />
                          {timeKey(block.startsAt, zone)} –{" "}
                          {timeKey(block.endsAt, zone)}
                        </small>
                      </span>
                      {active ? (
                        <span className="now-pill">Now</span>
                      ) : (
                        <ArrowUpRight size={14} />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty
              title="Room for possibility."
              detail="A few time blocks can bring a little clarity."
              action={() => edit({ kind: "block", date: today })}
              label="Plan some time"
            />
          )}
        </Card>
        <Card
          title="Thoughts"
          action={() => navigate("thoughts")}
          className="thoughts-card"
        >
          {thoughts.length ? (
            <div className="dashboard-thoughts">
              {thoughts.map((thought) => (
                <button
                  className="thought-preview"
                  onClick={() => edit({ kind: "thought", id: thought.id })}
                  key={thought.id}
                >
                  <span className="quote-mark">“</span>
                  <p>{thought.content}</p>
                  <span className="thought-preview-foot">
                    <span>{thought.emotion || "A passing thought"}</span>
                    <time>{timeKey(thought.createdAt, zone)}</time>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <Empty
              title="Let it out."
              detail="A place for ideas, reflections, and everything between."
              action={() => edit({ kind: "thought" })}
              label="Capture a thought"
            />
          )}
          {thoughts.length > 0 && (
            <button
              className="text-button"
              onClick={() => edit({ kind: "thought" })}
            >
              <Plus size={14} />
              Capture a thought
            </button>
          )}
        </Card>
        <Card
          title="Notes"
          action={() => navigate("notes")}
          className="notes-card"
          meta={<span className="fine">{data.notes.length} notes</span>}
        >
          {notes.length ? (
            <>
              <div className="dashboard-notes">
                {notes.map((note, i) => (
                  <button
                    key={note.id}
                    onClick={() => edit({ kind: "note", id: note.id })}
                  >
                    <span className={"note-glyph note-color-" + i}>
                      <EntityIcon name="journal" size={17} />
                    </span>
                    <span className="note-summary">
                      <strong>{note.title}</strong>
                      <small>
                        {note.content
                          .replace(/[#*>\-\n]/g, " ")
                          .trim()
                          .slice(0, 60) || "A fresh page, waiting for an idea."}
                      </small>
                    </span>
                    <ArrowUpRight size={14} />
                  </button>
                ))}
              </div>
              <button
                className="text-button"
                onClick={() => edit({ kind: "note" })}
              >
                <Plus size={14} />
                Start a note
              </button>
            </>
          ) : (
            <Empty
              title="Some things are worth keeping."
              action={() => edit({ kind: "note" })}
              label="Start a note"
            />
          )}
        </Card>
      </div>
      <div className="workspace-footer">
        <Sparkles size={12} />
        <span>Little by little, a life well made.</span>
        <span className="footer-brand">ONE</span>
      </div>
    </>
  );
}
