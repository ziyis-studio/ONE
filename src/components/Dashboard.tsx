import { useState } from "react";
import { motion } from "motion/react";
import { ContentSwitch, DiscreteTabs, useSettle } from "./interactions";
import { Plus, ArrowUpRight, Moon, ArrowRight, Clock3 } from "lucide-react";
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
import { PageDate } from "./PageDate";
export default function Dashboard() {
  const { data, today, zone, now, edit, navigate, busy } = useOne();
  const { toggleTask, toggleHabit, safely } = useActions();
  const [thoughtView, setThoughtView] = useState<"recent" | "linked">("recent");
  const transition = useSettle();
  const linkedThoughts = new Set([
    ...data.thoughtTaskLinks.map((link) => link.thoughtId),
    ...data.thoughtProjectLinks.map((link) => link.thoughtId),
  ]);
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
    .filter(
      (thought) => thoughtView === "recent" || linkedThoughts.has(thought.id),
    )
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
          <PageDate />
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
                          data-chart-title={dateLabel(d)}
                          data-chart-detail={
                            data.occurrences.some(
                              (x) =>
                                x.habitId === habit.id &&
                                x.plannedOn === d &&
                                executed.has(x.id),
                            )
                              ? "Completed"
                              : data.occurrences.some(
                                    (x) =>
                                      x.habitId === habit.id &&
                                      x.plannedOn === d,
                                  )
                                ? "Not completed"
                                : "Not scheduled"
                          }
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
              title={
                data.habits.length
                  ? "No habits scheduled today"
                  : "No habits yet"
              }
              detail={
                data.habits.length
                  ? "See your routines and upcoming days."
                  : "Create a habit to start tracking your days."
              }
              action={() =>
                data.habits.length
                  ? navigate("habits")
                  : edit({ kind: "habit" })
              }
              label={data.habits.length ? "View habits" : "New habit"}
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
                role="group"
                aria-label="Your recent sleep durations"
              >
                {sleep.map((record, index) => {
                  const minutes =
                    minutesBetween(record.startsAt, record.endsAt) -
                    record.awakeMinutes;
                  const date = dateLabel(dayKey(record.endsAt, zone), {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  });
                  const duration = `${Math.floor(minutes / 60)}h ${minutes % 60}m net sleep`;
                  return (
                    <button
                      key={record.id}
                      type="button"
                      aria-label={`${date} · ${duration}`}
                      data-chart-title={date}
                      data-chart-detail={duration}
                      onClick={() => edit({ kind: "sleep", id: record.id })}
                    >
                      <motion.i
                        initial={false}
                        transition={transition}
                        className={index === sleep.length - 1 ? "latest" : ""}
                        animate={{
                          height: Math.max(10, Math.min(76, minutes / 7.5)),
                        }}
                      />
                      <span>
                        {dateLabel(dayKey(record.endsAt, zone), {
                          weekday: "narrow",
                        })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <Empty
              title="No sleep logged"
              detail="Log your rest to see it here."
              action={() => edit({ kind: "sleep" })}
              label="Log sleep"
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
              title="No tasks planned today"
              detail="Add a task or schedule an existing one."
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
              title="No time blocks today"
              detail="Plan a time block for your day."
              action={() => edit({ kind: "block", date: today })}
              label="Plan time"
            />
          )}
        </Card>
        <Card
          title="Thoughts"
          action={() => navigate("thoughts")}
          className="thoughts-card"
          meta={
            <DiscreteTabs
              value={thoughtView}
              onChange={setThoughtView}
              compact
              label="Thought previews"
              items={[
                { value: "recent", label: "Recent" },
                { value: "linked", label: "Linked" },
              ]}
            />
          }
        >
          <ContentSwitch value={thoughtView}>
            {thoughts.length ? (
              <div className="dashboard-thoughts">
                {thoughts.map((thought) => (
                  <button
                    className="thought-preview"
                    onClick={() => edit({ kind: "thought", id: thought.id })}
                    key={thought.id}
                    aria-label={
                      "Edit thought: " + (thought.title || thought.content)
                    }
                  >
                    <span className="thought-preview-body">
                      {thought.title && <strong>{thought.title}</strong>}
                      <span className="thought-preview-text">
                        {thought.content}
                      </span>
                      <span className="thought-preview-foot">
                        {thought.emotion && (
                          <span className="thought-emotion">
                            {thought.emotion}
                          </span>
                        )}
                        <time dateTime={thought.createdAt}>
                          {dayKey(thought.createdAt, zone) !== today &&
                            dateLabel(dayKey(thought.createdAt, zone)) + " · "}
                          {timeKey(thought.createdAt, zone)}
                        </time>
                      </span>
                    </span>
                    <ArrowUpRight size={14} />
                  </button>
                ))}
              </div>
            ) : (
              <Empty
                title={
                  thoughtView === "linked"
                    ? "No linked thoughts"
                    : "No thoughts yet"
                }
                detail={
                  thoughtView === "linked"
                    ? "Link a thought to a task or project to find it here."
                    : "Capture an idea or something on your mind."
                }
                action={() =>
                  thoughtView === "linked"
                    ? navigate("thoughts")
                    : edit({ kind: "thought" })
                }
                label={
                  thoughtView === "linked"
                    ? "View thoughts"
                    : "Capture a thought"
                }
              />
            )}
          </ContentSwitch>
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
              title="No notes yet"
              detail="Keep ideas, references, and details here."
              action={() => edit({ kind: "note" })}
              label="New note"
            />
          )}
        </Card>
      </div>
    </>
  );
}
