import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Search,
  Columns3,
  List,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowRight,
  Check,
  MoreHorizontal,
  Moon,
  Table2,
  FileText,
  Sparkles,
  Filter,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Task, Project } from "../domain/model";
import { useOne } from "../lib/workspace";
import { useActions, stages, taskStage } from "../lib/actions";
import { blocksOnDay, layoutDayBlocks } from "../lib/schedule";
import type { Stage } from "../lib/actions";
import {
  addDays,
  addMonths,
  dayKey,
  dateLabel,
  timeKey,
  weekDays,
  monthDays,
  minutesBetween,
} from "../domain/time";
import { CheckButton, Empty, EntityIcon, IconButton } from "./ui";

export function PageIntro({
  title,
  subtitle,
  action,
  label,
}: {
  title: string;
  subtitle: string;
  action?: () => void;
  label?: string;
}) {
  return (
    <div className="page-intro">
      <div>
        <p className="eyebrow">
          YOUR WORKSPACE <span>/ {title.toUpperCase()}</span>
        </p>
        <h1>
          {title}
          <span className="accent">.</span>
        </h1>
        <p className="page-description">{subtitle}</p>
      </div>
      {action && (
        <button className="primary-button" onClick={action}>
          <Plus size={15} />
          {label || "New " + title.toLowerCase().replace(/s$/, "")}
        </button>
      )}
    </div>
  );
}
function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="search-field">
      <Search size={15} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function Tabs({
  value,
  setValue,
  items,
}: {
  value: string;
  setValue: (value: string) => void;
  items: { value: string; label: string; icon?: ReactNode }[];
}) {
  return (
    <div className="segmented">
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => setValue(item.value)}
          className={value === item.value ? "active" : ""}
          aria-pressed={value === item.value}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}
const matches = (query: string, ...values: (string | undefined)[]) =>
  values.join(" ").toLowerCase().includes(query.toLowerCase());
export function TasksPage() {
  const { data, edit, busy, today } = useOne();
  const { toggleTask, moveTask, safely } = useActions();
  const [view, setView] = useState("board"),
    [query, setQuery] = useState(""),
    [project, setProject] = useState("all");
  const [dragOver, setDragOver] = useState("");
  const tasks = data.tasks.filter(
    (t) =>
      matches(query, t.title, t.description, t.tags?.join(" ")) &&
      (project === "all" || t.projectId === project),
  );
  const open = data.tasks.filter((t) => !t.completedAt).length;
  return (
    <>
      <PageIntro
        title="Tasks"
        subtitle={open + " open loops. One clear place to start."}
        action={() => edit({ kind: "task" })}
        label="New task"
      />
      <div className="page-toolbar">
        <Tabs
          value={view}
          setValue={setView}
          items={[
            { value: "board", label: "Board", icon: <Columns3 size={14} /> },
            { value: "list", label: "List", icon: <List size={14} /> },
          ]}
        />
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Find a task…"
        />
        <label className="filter-select">
          <Filter size={14} />
          <select
            aria-label="Filter by project"
            value={project}
            onChange={(e) => setProject(e.target.value)}
          >
            <option value="all">All projects</option>
            {data.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <span className="fine toolbar-count">{tasks.length} tasks</span>
      </div>
      {view === "board" ? (
        <div className="board-scroll">
          <div className="task-board">
            {stages.map((stage) => (
              <section
                key={stage.id}
                className={
                  "board-lane " + (dragOver === stage.id ? "drag-over" : "")
                }
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(stage.id);
                }}
                onDragLeave={() => setDragOver("")}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver("");
                  const task = data.tasks.find(
                    (t) => t.id === e.dataTransfer.getData("text/one-task"),
                  );
                  if (task) safely(() => moveTask(task, stage.id));
                }}
              >
                <header>
                  <span>
                    <i className={"status-dot " + stage.color} />
                    {stage.title}
                    <small>
                      {tasks.filter((t) => taskStage(t) === stage.id).length}
                    </small>
                  </span>
                  <IconButton
                    label={"Add task in " + stage.title}
                    onClick={() => edit({ kind: "task" })}
                  >
                    <Plus size={15} />
                  </IconButton>
                </header>
                <div className="lane-stack">
                  {tasks
                    .filter((t) => taskStage(t) === stage.id)
                    .map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                </div>
                <button
                  className="lane-add"
                  onClick={() => edit({ kind: "task" })}
                >
                  <Plus size={14} />
                  Add a task
                </button>
              </section>
            ))}
          </div>
        </div>
      ) : (
        <div className="table-shell">
          <table className="data-table task-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Status</th>
                <th>Project</th>
                <th>Due date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <div className="table-task-title">
                      <CheckButton
                        checked={!!task.completedAt}
                        disabled={busy}
                        label={"Toggle " + task.title}
                        onClick={() => safely(() => toggleTask(task))}
                      />
                      <button
                        onClick={() => edit({ kind: "task", id: task.id })}
                      >
                        {task.title}
                      </button>
                    </div>
                  </td>
                  <td>
                    <select
                      aria-label={"Status of " + task.title}
                      disabled={busy}
                      className="status-select"
                      value={taskStage(task)}
                      onChange={(e) =>
                        safely(() => moveTask(task, e.target.value as Stage))
                      }
                    >
                      {stages.map((s) => (
                        <option value={s.id} key={s.id}>
                          {s.title}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {data.projects.find((p) => p.id === task.projectId)
                      ?.title || "—"}
                  </td>
                  <td
                    className={
                      task.deadline &&
                      task.deadline < today &&
                      !task.completedAt
                        ? "overdue"
                        : ""
                    }
                  >
                    {task.deadline ? dateLabel(task.deadline) : "No date"}
                  </td>
                  <td>
                    <IconButton
                      label={"Edit " + task.title}
                      onClick={() => edit({ kind: "task", id: task.id })}
                    >
                      <ArrowUpRight size={14} />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!tasks.length && (
            <Empty
              title="A little breathing room."
              detail={
                query
                  ? "No tasks match your search."
                  : "Your next small step starts here."
              }
              action={() => edit({ kind: "task" })}
              label="New task"
            />
          )}
        </div>
      )}
    </>
  );
}
function TaskCard({ task }: { task: Task }) {
  const { data, edit, busy, today } = useOne();
  const { toggleTask, safely } = useActions();
  const project = data.projects.find((p) => p.id === task.projectId);
  const conditions = data.conditions.filter((c) => c.taskId === task.id);
  const done = conditions.filter((c) => c.isMet).length;
  return (
    <article
      className={"task-card " + (task.completedAt ? "is-complete" : "")}
      draggable={!busy}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/one-task", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      <div className="task-card-top">
        <span className="tag">
          {task.tags?.[0] || project?.title || "Personal"}
        </span>
        <IconButton
          label={"Edit " + task.title}
          onClick={() => edit({ kind: "task", id: task.id })}
        >
          <MoreHorizontal size={16} />
        </IconButton>
      </div>
      <button
        className="task-card-main"
        onClick={() => edit({ kind: "task", id: task.id })}
      >
        <h3>{task.title}</h3>
        <p>{task.description || "One little thing, worth doing well."}</p>
      </button>
      {conditions.length > 0 && (
        <div className="condition-progress">
          <span className="progress-track">
            <i style={{ width: (done / conditions.length) * 100 + "%" }} />
          </span>
          <span>
            {done}/{conditions.length}
          </span>
        </div>
      )}
      <div className="task-card-foot">
        <span
          className={
            task.deadline && task.deadline < today && !task.completedAt
              ? "overdue"
              : ""
          }
        >
          <CalendarDays size={12} />
          {task.deadline
            ? task.deadline === today
              ? "Today"
              : dateLabel(task.deadline)
            : "Whenever you’re ready"}
        </span>
        <CheckButton
          checked={!!task.completedAt}
          disabled={busy}
          label={"Toggle " + task.title}
          onClick={() => safely(() => toggleTask(task))}
        />
      </div>
    </article>
  );
}
export function ProjectsPage() {
  const { data, edit } = useOne();
  const [query, setQuery] = useState(""),
    [view, setView] = useState("board");
  const projects = data.projects.filter((p) =>
    matches(query, p.title, p.description, p.tags?.join(" ")),
  );
  const status = (p: Project) =>
    p.completedAt ? "done" : p.workStatus === "on_hold" ? "hold" : "progress";
  return (
    <>
      <PageIntro
        title="Projects"
        subtitle="The bigger picture, one small step at a time."
        action={() => edit({ kind: "project" })}
        label="New project"
      />
      <div className="page-toolbar">
        <Tabs
          value={view}
          setValue={setView}
          items={[
            { value: "board", label: "Board", icon: <Columns3 size={14} /> },
            { value: "list", label: "List", icon: <List size={14} /> },
          ]}
        />
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Find a project…"
        />
        <span className="fine toolbar-count">{projects.length} projects</span>
      </div>
      {view === "board" ? (
        <div className="project-board">
          {stages
            .filter((s) => s.id !== "todo")
            .map((stage) => (
              <section className="board-lane" key={stage.id}>
                <header>
                  <span>
                    <i className={"status-dot " + stage.color} />
                    {stage.id === "progress" ? "In motion" : stage.title}
                    <small>
                      {projects.filter((p) => status(p) === stage.id).length}
                    </small>
                  </span>
                </header>
                <div className="lane-stack">
                  {projects
                    .filter((p) => status(p) === stage.id)
                    .map((p) => (
                      <ProjectCard key={p.id} project={p} />
                    ))}
                </div>
                <button
                  className="lane-add"
                  onClick={() => edit({ kind: "project" })}
                >
                  <Plus size={14} />
                  New project
                </button>
              </section>
            ))}
        </div>
      ) : (
        <div className="project-list">
          {projects.map((p) => (
            <ProjectCard project={p} key={p.id} />
          ))}
        </div>
      )}
    </>
  );
}
function ProjectCard({ project }: { project: Project }) {
  const { data, edit } = useOne();
  const tasks = data.tasks.filter((t) => t.projectId === project.id);
  const done = tasks.filter((t) => t.completedAt).length;
  const percent = tasks.length
    ? Math.round((done / tasks.length) * 100)
    : project.completedAt
      ? 100
      : 0;
  return (
    <button
      className="project-card"
      onClick={() => edit({ kind: "project", id: project.id })}
    >
      <div className="project-card-top">
        <span className="project-icon">
          <EntityIcon name={project.icon} size={21} />
        </span>
        <ArrowUpRight size={15} />
      </div>
      <h3>{project.title}</h3>
      <p>{project.description || "Something worth making room for."}</p>
      <div className="project-progress">
        <span>
          {done} of {tasks.length} tasks
        </span>
        <strong>{percent}%</strong>
      </div>
      <div className="progress-track">
        <i style={{ width: percent + "%" }} />
      </div>
      <footer>
        <span className="tag">{project.tags?.[0] || "Personal project"}</span>
        <span>{dateLabel(dayKey(project.createdAt, "UTC"))}</span>
      </footer>
    </button>
  );
}
export function SchedulePage() {
  const { data, today, zone, edit } = useOne();
  const [selected, setSelected] = useState(today),
    [month, setMonth] = useState(today),
    [view, setView] = useState("day");
  const scroller = useRef<HTMLDivElement>(null);
  const days = weekDays(selected);
  const blocks = blocksOnDay(data.timeBlocks, selected, zone);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 7 * 60 });
  }, [selected, view]);
  return (
    <>
      <PageIntro
        title="Schedule"
        subtitle="Give your day a little shape. Leave a little room."
        action={() => edit({ kind: "block", date: selected })}
        label="Plan time"
      />
      <div className="schedule-layout">
        <aside className="calendar-panel">
          <div className="calendar-month">
            <h3>{dateLabel(month, { month: "long", year: "numeric" })}</h3>
            <div>
              <IconButton
                label="Previous month"
                onClick={() => setMonth(addMonths(month, -1))}
              >
                <ChevronLeft size={14} />
              </IconButton>
              <IconButton
                label="Next month"
                onClick={() => setMonth(addMonths(month, 1))}
              >
                <ChevronRight size={14} />
              </IconButton>
            </div>
          </div>
          <div className="calendar-grid weekday-labels">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {monthDays(month).map((day) => (
              <button
                key={day}
                aria-label={dateLabel(day, { dateStyle: "full" })}
                aria-pressed={day === selected}
                onClick={() => setSelected(day)}
                className={
                  (day === selected ? "selected " : "") +
                  (day === today ? "is-today " : "") +
                  (day.slice(0, 7) !== month.slice(0, 7) ? "outside" : "")
                }
              >
                {Number(day.slice(-2))}
                {data.timeBlocks.some(
                  (b) => dayKey(b.startsAt, zone) === day,
                ) && <i />}
              </button>
            ))}
          </div>
          <div className="calendar-note">
            <Sparkles size={16} />
            <p>
              Time is a place to put your attention.
              <br />
              Make it a kind one.
            </p>
          </div>
        </aside>
        <section className="schedule-main">
          <div className="schedule-toolbar">
            <div className="date-navigation">
              <IconButton
                label="Previous day"
                onClick={() =>
                  setSelected(addDays(selected, view === "week" ? -7 : -1))
                }
              >
                <ChevronLeft size={16} />
              </IconButton>
              <h3>{dateLabel(selected, { month: "long", day: "numeric" })}</h3>
              <IconButton
                label="Next day"
                onClick={() =>
                  setSelected(addDays(selected, view === "week" ? 7 : 1))
                }
              >
                <ChevronRight size={16} />
              </IconButton>
              <button
                className="tiny-pill"
                onClick={() => {
                  setSelected(today);
                  setMonth(today);
                }}
              >
                Today
              </button>
            </div>
            <Tabs
              value={view}
              setValue={setView}
              items={[
                { value: "day", label: "Day" },
                { value: "week", label: "Week" },
              ]}
            />
          </div>
          <div className="schedule-weekstrip">
            {days.map((d) => (
              <button
                key={d}
                onClick={() => setSelected(d)}
                className={d === selected ? "selected" : ""}
              >
                <span>{dateLabel(d, { weekday: "short" })}</span>
                <strong>{Number(d.slice(-2))}</strong>
                <i className={d === today ? "live-dot" : ""} />
              </button>
            ))}
          </div>
          {view === "week" ? (
            <div className="week-agenda">
              {days.map((day) => (
                <section key={day}>
                  <h4>
                    {dateLabel(day, { weekday: "short", day: "numeric" })}
                  </h4>
                  {blocksOnDay(data.timeBlocks, day, zone).map((block, i) => (
                    <button
                      className={"week-block event-" + (i % 4)}
                      key={block.id}
                      onClick={() => edit({ kind: "block", id: block.id })}
                    >
                      <time>{timeKey(block.startsAt, zone)}</time>
                      <strong>{block.title}</strong>
                      <small>
                        {minutesBetween(block.startsAt, block.endsAt)} min
                      </small>
                    </button>
                  ))}
                  <button
                    className="week-add"
                    aria-label={"Plan time on " + day}
                    onClick={() => edit({ kind: "block", date: day })}
                  >
                    <Plus size={14} />
                  </button>
                </section>
              ))}
            </div>
          ) : (
            <div className="day-schedule-scroll" ref={scroller}>
              <div className="day-schedule">
                <div className="hour-labels">
                  {Array.from({ length: 24 }, (_, i) => (
                    <span key={i}>{String(i).padStart(2, "0")}:00</span>
                  ))}
                </div>
                <div className="day-track">
                  {layoutDayBlocks(blocks, selected, zone).map(
                    ({ block, start, duration, column, columns }, i) => (
                      <button
                        className={"scheduled-block event-" + (i % 4)}
                        key={block.id}
                        style={{
                          top: start,
                          height: Math.max(duration, 24),
                          left: "calc(" + (column / columns) * 100 + "% + 8px)",
                          width: "calc(" + 100 / columns + "% - 16px)",
                        }}
                        onClick={() => edit({ kind: "block", id: block.id })}
                      >
                        <strong>{block.title}</strong>
                        <small>
                          {timeKey(block.startsAt, zone)} –{" "}
                          {timeKey(block.endsAt, zone)}
                        </small>
                      </button>
                    ),
                  )}
                  {!blocks.length && (
                    <div className="schedule-empty">
                      <Empty
                        title="A clear day ahead."
                        action={() => edit({ kind: "block", date: selected })}
                        label="Plan some time"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
export function HabitsPage() {
  const { data, today, edit, execute, busy } = useOne();
  const { toggleHabit, safely } = useActions();
  const [offset, setOffset] = useState(0);
  const days = weekDays(addDays(today, offset * 7));
  const range = days[0];
  const attempted = useRef(new Set<string>());
  useEffect(() => {
    if (offset === 0 || attempted.current.has(range)) return;
    attempted.current.add(range);
    void execute({
      type: "occurrences.materialize",
      from: range,
      to: addDays(range, 6),
    }).catch(() => {});
  }, [range, offset, execute]);
  const executed = new Set(data.executions.map((e) => e.occurrenceId));
  const weekOcc = data.occurrences.filter(
    (o) => days.includes(o.plannedOn) && o.plannedOn <= today,
  );
  const done = weekOcc.filter((o) => executed.has(o.id)).length;
  return (
    <>
      <PageIntro
        title="Habits"
        subtitle="Not perfection. Just a little more consistency."
        action={() => edit({ kind: "habit" })}
        label="New habit"
      />
      <div className="habit-stats">
        <div>
          <span>YOUR WEEK, SO FAR</span>
          <strong>
            {done}
            <small>little promises kept</small>
          </strong>
        </div>
        <div>
          <span>SHOWING UP</span>
          <strong>
            {weekOcc.length ? Math.round((done / weekOcc.length) * 100) : 0}
            <small>% of planned rituals</small>
          </strong>
        </div>
        <div className="habit-stat-note">
          <Sparkles size={26} strokeWidth={1} />
          <p>
            Some days are easier than others.
            <br />
            Every little step still counts.
          </p>
        </div>
      </div>
      <div className="section-toolbar">
        <h2>
          {dateLabel(days[0])} – {dateLabel(days[6])}
        </h2>
        <div className="date-navigation">
          <IconButton
            label="Previous week"
            onClick={() => setOffset(offset - 1)}
          >
            <ChevronLeft size={16} />
          </IconButton>
          <button className="tiny-pill" onClick={() => setOffset(0)}>
            This week
          </button>
          <IconButton label="Next week" onClick={() => setOffset(offset + 1)}>
            <ChevronRight size={16} />
          </IconButton>
        </div>
      </div>
      <div className="table-shell">
        <table className="data-table habit-table">
          <thead>
            <tr>
              <th>Your ritual</th>
              {days.map((day) => (
                <th key={day} className={day === today ? "accent" : ""}>
                  {dateLabel(day, { weekday: "short" })}
                  <small>{Number(day.slice(-2))}</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.habits.map((habit) => (
              <tr key={habit.id}>
                <td>
                  <button
                    className="habit-title-button"
                    onClick={() => edit({ kind: "habit", id: habit.id })}
                  >
                    <span className="ritual-icon">
                      <EntityIcon name={habit.icon || "repeat"} />
                    </span>
                    <span>
                      {habit.title}
                      <small>
                        {habit.isoWeekdays.length === 7
                          ? "Every day"
                          : habit.isoWeekdays.length + " days a week"}
                      </small>
                    </span>
                  </button>
                </td>
                {days.map((day) => {
                  const occurrence = data.occurrences.find(
                    (o) => o.habitId === habit.id && o.plannedOn === day,
                  );
                  return (
                    <td key={day} className={day === today ? "today-cell" : ""}>
                      {occurrence ? (
                        <CheckButton
                          circle
                          disabled={busy || day > today}
                          checked={executed.has(occurrence.id)}
                          label={
                            (executed.has(occurrence.id)
                              ? "Undo "
                              : "Complete ") +
                            habit.title +
                            " for " +
                            day
                          }
                          onClick={() =>
                            safely(() => toggleHabit(occurrence.id))
                          }
                        />
                      ) : (
                        <span className="not-planned">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {!data.habits.length && (
          <Empty
            title="Build a kinder routine."
            detail="Start small. Make it something you can come back to."
            action={() => edit({ kind: "habit" })}
            label="New habit"
          />
        )}
      </div>
      <p className="page-footnote">
        A check records when you actually did it. Your original plan stays
        intact.
      </p>
    </>
  );
}
export function SleepPage() {
  const { data, edit, zone } = useOne();
  const sleep = data.sleepRecords.toSorted((a, b) =>
    b.endsAt.localeCompare(a.endsAt),
  );
  const recent = sleep.slice(0, 7);
  const net = (s: (typeof sleep)[number]) =>
    minutesBetween(s.startsAt, s.endsAt) - s.awakeMinutes;
  const average = recent.length
    ? Math.round(recent.reduce((sum, s) => sum + net(s), 0) / recent.length)
    : 0;
  return (
    <>
      <PageIntro
        title="Sleep"
        subtitle="A softer landing. A better beginning."
        action={() => edit({ kind: "sleep" })}
        label="Log sleep"
      />
      <div className="sleep-overview">
        <div>
          <span className="eyebrow">RECENT AVERAGE</span>
          <strong>
            {Math.floor(average / 60)}
            <small>h</small> {average % 60}
            <small>m</small>
          </strong>
          <p>Across your last {recent.length} entries</p>
        </div>
        <div className="sleep-large-chart">
          {recent.toReversed().map((record, i) => (
            <button
              key={record.id}
              onClick={() => edit({ kind: "sleep", id: record.id })}
              aria-label={"Sleep on " + dayKey(record.endsAt, zone)}
            >
              <span>{Math.round(net(record) / 6) / 10}h</span>
              <i
                style={{ height: Math.max(10, net(record) / 5) }}
                className={i === recent.length - 1 ? "latest" : ""}
              />
              <small>
                {dateLabel(dayKey(record.endsAt, zone), { weekday: "short" })}
              </small>
            </button>
          ))}
        </div>
        <Moon className="sleep-overview-moon" size={68} strokeWidth={0.7} />
      </div>
      <div className="table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th>Waking up on</th>
              <th>Fell asleep</th>
              <th>Woke up</th>
              <th>Time awake</th>
              <th>Net sleep</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sleep.map((record) => (
              <tr key={record.id}>
                <td>
                  {dateLabel(dayKey(record.endsAt, zone), {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td>{timeKey(record.startsAt, zone)}</td>
                <td>{timeKey(record.endsAt, zone)}</td>
                <td>{record.awakeMinutes} min</td>
                <td className="accent">
                  {Math.floor(net(record) / 60)}h {net(record) % 60}m
                </td>
                <td>
                  <IconButton
                    label="Edit sleep entry"
                    onClick={() => edit({ kind: "sleep", id: record.id })}
                  >
                    <ArrowUpRight size={15} />
                  </IconButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!sleep.length && (
          <Empty
            title="Make room for rest."
            action={() => edit({ kind: "sleep" })}
            label="Log your first night"
          />
        )}
      </div>
    </>
  );
}
export function ThoughtsPage() {
  const { data, edit, zone, today, execute, busy, notify } = useOne();
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [day, setDay] = useState(""),
    [month, setMonth] = useState(today);
  const thoughts = data.thoughts
    .filter(
      (t) =>
        matches(query, t.title, t.content) &&
        (!day || dayKey(t.createdAt, zone) === day) &&
        (filter !== "unlinked" ||
          (!data.thoughtTaskLinks.some((l) => l.thoughtId === t.id) &&
            !data.thoughtProjectLinks.some((l) => l.thoughtId === t.id))),
    )
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
  const groups = [...new Set(thoughts.map((t) => dayKey(t.createdAt, zone)))];
  async function convert(id: string, content: string) {
    try {
      await execute({
        type: "thought.convert",
        thoughtIds: [id],
        kind: "task",
        input: { title: content.slice(0, 100), description: content },
      });
      notify("A thought, now a little step forward.");
    } catch {}
  }
  return (
    <>
      <PageIntro
        title="Thoughts"
        subtitle="No structure needed. Just a place to let it out."
        action={() => edit({ kind: "thought" })}
        label="Capture a thought"
      />
      <div className="page-toolbar">
        <Tabs
          value={filter}
          setValue={setFilter}
          items={[
            { value: "all", label: "All thoughts" },
            { value: "unlinked", label: "Unlinked" },
          ]}
        />
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Find a thought…"
        />
        {day && (
          <button className="tiny-pill" onClick={() => setDay("")}>
            {dateLabel(day)} ×
          </button>
        )}
        <span className="fine toolbar-count">{thoughts.length} thoughts</span>
      </div>
      <div className="thought-layout">
        <div className="thought-timeline">
          {groups.map((group) => (
            <section key={group}>
              <h2>
                {group === today
                  ? "Today"
                  : dateLabel(group, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                <span>
                  {
                    thoughts.filter((t) => dayKey(t.createdAt, zone) === group)
                      .length
                  }{" "}
                  thoughts
                </span>
              </h2>
              {thoughts
                .filter((t) => dayKey(t.createdAt, zone) === group)
                .map((thought) => (
                  <article className="thought-entry" key={thought.id}>
                    <time>{timeKey(thought.createdAt, zone)}</time>
                    <i className="entry-dot" />
                    <div className="thought-entry-card">
                      <button
                        className="thought-entry-content"
                        onClick={() =>
                          edit({ kind: "thought", id: thought.id })
                        }
                      >
                        {thought.title && <h3>{thought.title}</h3>}
                        <p>{thought.content}</p>
                      </button>
                      <footer>
                        <span className="tag">
                          {thought.emotion || "Just a thought"}
                        </span>
                        <button
                          disabled={busy}
                          onClick={() =>
                            void convert(thought.id, thought.content)
                          }
                        >
                          <ArrowRight size={12} />
                          Turn into a task
                        </button>
                        <IconButton
                          label="Edit thought"
                          onClick={() =>
                            edit({ kind: "thought", id: thought.id })
                          }
                        >
                          <MoreHorizontal size={16} />
                        </IconButton>
                      </footer>
                    </div>
                  </article>
                ))}
            </section>
          ))}
          {!thoughts.length && (
            <Empty
              title="What’s on your mind?"
              detail={
                query
                  ? "No thoughts match your search."
                  : "An idea doesn’t have to be ready to be worth keeping."
              }
              action={() => edit({ kind: "thought" })}
              label="Capture a thought"
            />
          )}
        </div>
        <aside className="calendar-panel thought-calendar">
          <div className="calendar-month">
            <h3>{dateLabel(month, { month: "long", year: "numeric" })}</h3>
            <div>
              <IconButton
                label="Previous month"
                onClick={() => setMonth(addMonths(month, -1))}
              >
                <ChevronLeft size={14} />
              </IconButton>
              <IconButton
                label="Next month"
                onClick={() => setMonth(addMonths(month, 1))}
              >
                <ChevronRight size={14} />
              </IconButton>
            </div>
          </div>
          <div className="calendar-grid weekday-labels">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {monthDays(month).map((date) => (
              <button
                key={date}
                aria-label={dateLabel(date, { dateStyle: "full" })}
                onClick={() => setDay(day === date ? "" : date)}
                className={
                  (day === date ? "selected " : "") +
                  (date === today ? "is-today " : "") +
                  (date.slice(0, 7) !== month.slice(0, 7) ? "outside" : "")
                }
              >
                {Number(date.slice(-2))}
                {data.thoughts.some(
                  (t) => dayKey(t.createdAt, zone) === date,
                ) && <i />}
              </button>
            ))}
          </div>
          <button className="card-bottom-link" onClick={() => setDay("")}>
            Show all thoughts
            <ArrowRight size={12} />
          </button>
        </aside>
      </div>
    </>
  );
}
export function NotesPage() {
  const { data, edit, zone } = useOne();
  const [view, setView] = useState("notes"),
    [query, setQuery] = useState(""),
    [databaseId, setDatabaseId] = useState("");
  const notes = data.notes
    .filter((n) => matches(query, n.title, n.content, n.tags?.join(" ")))
    .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const databases = data.noteDatabases.filter((db) =>
    matches(query, db.title, db.description),
  );
  const database = data.noteDatabases.find((db) => db.id === databaseId);
  const records = data.databaseRecords.filter(
    (r) => r.databaseId === databaseId && matches(query, r.title, r.content),
  );
  return (
    <>
      <PageIntro
        title="Notes"
        subtitle="Keep a little knowledge. Make a little room for ideas."
        action={() => edit({ kind: view === "notes" ? "note" : "database" })}
        label={view === "notes" ? "New note" : "New database"}
      />
      <div className="page-toolbar">
        <Tabs
          value={view}
          setValue={(value) => {
            setView(value);
            setDatabaseId("");
            setQuery("");
          }}
          items={[
            { value: "notes", label: "Notes", icon: <FileText size={14} /> },
            {
              value: "databases",
              label: "Databases",
              icon: <Table2 size={14} />,
            },
          ]}
        />
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder={
            view === "notes" ? "Find a note…" : "Find a record or database…"
          }
        />
        <span className="fine toolbar-count">
          {view === "notes"
            ? notes.length + " notes"
            : databases.length + " databases"}
        </span>
      </div>
      {view === "notes" ? (
        <div className="notes-grid">
          {notes.map((note, i) => (
            <button
              className="note-card"
              key={note.id}
              onClick={() => edit({ kind: "note", id: note.id })}
            >
              <span className={"note-glyph note-color-" + (i % 3)}>
                <FileText size={20} strokeWidth={1.4} />
              </span>
              <ArrowUpRight className="note-open" size={16} />
              <h3>{note.title}</h3>
              <p>
                {note.content.replace(/[#*>]/g, "") ||
                  "A page full of possibility."}
              </p>
              <footer>
                <span>
                  {note.tags?.[0] && (
                    <span className="tag">{note.tags[0]}</span>
                  )}
                </span>
                <time>{dateLabel(dayKey(note.updatedAt, zone))}</time>
              </footer>
            </button>
          ))}
          <button
            className="new-note-card"
            onClick={() => edit({ kind: "note" })}
          >
            <Plus size={22} strokeWidth={1.2} />
            <span>A fresh page</span>
          </button>
        </div>
      ) : database ? (
        <>
          <div className="section-toolbar">
            <button className="text-button" onClick={() => setDatabaseId("")}>
              <ChevronLeft size={15} />
              All databases
            </button>
            <h2>{database.title}</h2>
            <div className="row-actions">
              <button
                className="secondary-button"
                onClick={() => edit({ kind: "database", id: database.id })}
              >
                Properties
              </button>
              <button
                className="primary-button"
                onClick={() =>
                  edit({ kind: "record", databaseId: database.id })
                }
              >
                <Plus size={14} />
                New record
              </button>
            </div>
          </div>
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  {database.fields.map((f) => (
                    <th key={f.id}>{f.name}</th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <button
                        className="table-name"
                        onClick={() =>
                          edit({
                            kind: "record",
                            id: record.id,
                            databaseId: database.id,
                          })
                        }
                      >
                        {record.title}
                      </button>
                    </td>
                    {database.fields.map((field) => (
                      <td key={field.id}>
                        {field.type === "checkbox" ? (
                          record.values[field.id] ? (
                            <Check size={15} />
                          ) : (
                            <span className="fine">—</span>
                          )
                        ) : Array.isArray(record.values[field.id]) ? (
                          (record.values[field.id] as string[]).map((v) => (
                            <span className="tag" key={v}>
                              {v}
                            </span>
                          ))
                        ) : (
                          String(record.values[field.id] ?? "—")
                        )}
                      </td>
                    ))}
                    <td>
                      <IconButton
                        label={"Edit " + record.title}
                        onClick={() =>
                          edit({
                            kind: "record",
                            id: record.id,
                            databaseId: database.id,
                          })
                        }
                      >
                        <ArrowUpRight size={14} />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!records.length && (
              <Empty
                title="A place for a little structure."
                action={() => edit({ kind: "record", databaseId: database.id })}
                label="Add a record"
              />
            )}
          </div>
        </>
      ) : (
        <div className="notes-grid">
          {databases.map((db) => (
            <button
              className="note-card database-card"
              key={db.id}
              onClick={() => {
                setDatabaseId(db.id);
                setQuery("");
              }}
            >
              <span className="note-glyph note-color-1">
                <Table2 size={20} />
              </span>
              <h3>{db.title}</h3>
              <p>{db.description || "A little structure for your ideas."}</p>
              <footer>
                <span>
                  {
                    data.databaseRecords.filter((r) => r.databaseId === db.id)
                      .length
                  }{" "}
                  records
                </span>
                <span>{db.fields.length} properties</span>
              </footer>
            </button>
          ))}
          <button
            className="new-note-card"
            onClick={() => edit({ kind: "database" })}
          >
            <Plus size={22} />
            <span>A new database</span>
          </button>
        </div>
      )}
    </>
  );
}
