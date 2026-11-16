import { useId, useRef, useState } from "react";
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
  Table2,
  FileText,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Task, Project, Note } from "../domain/model";
import { useViewState } from "../lib/view-state";
import { useOne } from "../lib/workspace";
import { useActions, stages, taskStage } from "../lib/actions";
import type { Stage } from "../lib/actions";
import {
  addMonths,
  dayKey,
  dateLabel,
  timeKey,
  monthDays,
} from "../domain/time";
import { CheckButton, Empty, IconButton } from "./ui";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import {
  DiscreteTabs,
  ContentSwitch,
  FilterPicker,
  InlineTitle,
  useSettle,
} from "./interactions";
import { CardOpen, openCardBackground } from "./CardOpen";
import ProjectCard from "./ProjectCard";
import { SelectField } from "./SelectField";
import { PageDate } from "./PageDate";

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
        <PageDate />
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
  return <DiscreteTabs value={value} onChange={setValue} items={items} />;
}
const matches = (query: string, ...values: (string | undefined)[]) =>
  values.join(" ").toLowerCase().includes(query.toLowerCase());
export function TasksPage() {
  const { data, edit, busy, today } = useOne();
  const { toggleTask, moveTask, rename, safely } = useActions();
  const [view, setView] = useViewState<string>("tasks.view", "board"),
    [query, setQuery] = useViewState<string>("tasks.query", ""),
    [project, setProject] = useViewState<string>("tasks.project", "all");
  const [dragOver, setDragOver] = useState("");
  const collectionId = useId(),
    collectionTransition = useSettle();
  const activeProject =
    project === "all" || data.projects.some((item) => item.id === project)
      ? project
      : "all";
  const tasks = data.tasks.filter(
    (t) =>
      matches(query, t.title, t.description, t.tags?.join(" ")) &&
      (activeProject === "all" || t.projectId === activeProject),
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
        <FilterPicker
          label="Filter by project"
          value={activeProject}
          onChange={setProject}
          options={[
            { value: "all", label: "All projects" },
            ...data.projects.map((item) => ({
              value: item.id,
              label: item.title,
            })),
          ]}
        />
        <span className="fine toolbar-count">{tasks.length} tasks</span>
      </div>
      <LayoutGroup id={collectionId}>
        <ContentSwitch value={view} className="one-collection">
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
                          {
                            tasks.filter((t) => taskStage(t) === stage.id)
                              .length
                          }
                        </small>
                      </span>
                      <IconButton
                        label={"Add task in " + stage.title}
                        onClick={() =>
                          edit({ kind: "task", initialStage: stage.id })
                        }
                      >
                        <Plus size={15} />
                      </IconButton>
                    </header>
                    <div className="lane-stack">
                      <AnimatePresence initial={false}>
                        {tasks
                          .filter((t) => taskStage(t) === stage.id)
                          .map((task) => (
                            <motion.div
                              layout="position"
                              transition={collectionTransition}
                              key={task.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            >
                              <TaskCard task={task} />
                            </motion.div>
                          ))}
                      </AnimatePresence>
                    </div>
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
                    <motion.tr
                      layout="position"
                      layoutId={`task-${task.id}`}
                      transition={collectionTransition}
                      key={task.id}
                    >
                      <td>
                        <div className="table-task-title">
                          <CheckButton
                            checked={!!task.completedAt}
                            disabled={busy}
                            label={"Toggle " + task.title}
                            onClick={() => safely(() => toggleTask(task))}
                          />
                          <InlineTitle
                            kind="task"
                            value={task.title}
                            onOpen={() => edit({ kind: "task", id: task.id })}
                            onSave={(title) => rename("task", task, title)}
                            disabled={busy}
                          />
                        </div>
                      </td>
                      <td>
                        <SelectField
                          label={"Status of " + task.title}
                          hideLabel
                          className="one-select-inline"
                          disabled={busy}
                          value={taskStage(task)}
                          onChange={(value) =>
                            safely(() => moveTask(task, value as Stage))
                          }
                          options={stages.map((stage) => ({
                            value: stage.id,
                            label: stage.title,
                          }))}
                        />
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
                    </motion.tr>
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
        </ContentSwitch>
      </LayoutGroup>
    </>
  );
}
function TaskCard({ task }: { task: Task }) {
  const { data, edit, busy, today } = useOne();
  const { toggleTask, rename, safely } = useActions();
  const transition = useSettle();
  const [renaming, setRenaming] = useState(false);
  const dragged = useRef(false);
  const open = () => {
    if (!dragged.current) edit({ kind: "task", id: task.id });
  };
  const project = data.projects.find((p) => p.id === task.projectId);
  const conditions = data.conditions.filter((c) => c.taskId === task.id);
  const done = conditions.filter((c) => c.isMet).length;
  return (
    <motion.article
      layout="position"
      layoutId={`task-${task.id}`}
      transition={transition}
      className={"task-card " + (task.completedAt ? "is-complete" : "")}
      draggable={!busy && !renaming}
      onClick={(event) => openCardBackground(event, open)}
      onPointerDown={() => {
        dragged.current = false;
      }}
      onDragEnd={() => {
        requestAnimationFrame(() => {
          dragged.current = false;
        });
      }}
      onDragStartCapture={(e) => {
        dragged.current = true;
        e.dataTransfer.setData("text/one-task", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      <CardOpen label={"Open task " + task.title} onOpen={open} />
      <div className="task-card-top">
        <span className="tag">
          {task.tags?.[0] || project?.title || "Personal"}
        </span>
      </div>
      <div className="task-card-main">
        <InlineTitle
          kind="task"
          onEditingChange={setRenaming}
          value={task.title}
          onOpen={open}
          onSave={(title) => rename("task", task, title)}
          disabled={busy}
        />
        <p className="one-task-description">
          {task.description || "One little thing, worth doing well."}
        </p>
      </div>
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
    </motion.article>
  );
}
export function ProjectsPage() {
  const { data, edit } = useOne();
  const [query, setQuery] = useViewState<string>("projects.query", ""),
    [view, setView] = useViewState<string>("projects.view", "board"),
    [stageFilter, setStageFilter] = useViewState<string>(
      "projects.status",
      "all",
    );
  const status = (p: Project) =>
    p.completedAt ? "done" : p.workStatus === "on_hold" ? "hold" : "progress";
  const projects = data.projects.filter(
    (p) =>
      matches(query, p.title, p.description, p.tags?.join(" ")) &&
      (stageFilter === "all" || status(p) === stageFilter),
  );
  const collectionId = useId(),
    collectionTransition = useSettle();
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
        <FilterPicker
          label="Filter projects by status"
          value={stageFilter}
          onChange={setStageFilter}
          options={[
            { value: "all", label: "All statuses" },
            { value: "progress", label: "In progress" },
            { value: "hold", label: "On hold" },
            { value: "done", label: "Done" },
          ]}
        />
        <span className="fine toolbar-count">{projects.length} projects</span>
      </div>
      <LayoutGroup id={collectionId}>
        <ContentSwitch value={view} className="one-collection">
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
                          {
                            projects.filter((p) => status(p) === stage.id)
                              .length
                          }
                        </small>
                      </span>
                      <IconButton
                        label={
                          "Add project in " +
                          (stage.id === "progress" ? "In motion" : stage.title)
                        }
                        onClick={() =>
                          edit({ kind: "project", initialStage: stage.id })
                        }
                      >
                        <Plus size={15} />
                      </IconButton>
                    </header>
                    <div className="lane-stack">
                      <AnimatePresence initial={false}>
                        {projects
                          .filter((p) => status(p) === stage.id)
                          .map((p) => (
                            <motion.div
                              layout="position"
                              transition={collectionTransition}
                              key={p.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            >
                              <ProjectCard project={p} />
                            </motion.div>
                          ))}
                      </AnimatePresence>
                    </div>
                  </section>
                ))}
            </div>
          ) : (
            <div className="project-list">
              <AnimatePresence initial={false}>
                {projects.map((p) => (
                  <motion.div
                    layout="position"
                    transition={collectionTransition}
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <ProjectCard project={p} row />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ContentSwitch>
      </LayoutGroup>
    </>
  );
}
export { default as SchedulePage } from "./Schedule";
export { default as HabitsPage } from "./Habits";
export { default as SleepPage } from "./SleepHistory";
export function ThoughtsPage() {
  const { data, edit, zone, today, execute, busy, notify } = useOne();
  const [query, setQuery] = useViewState<string>("thoughts.query", ""),
    [filter, setFilter] = useViewState<string>("thoughts.filter", "all"),
    [day, setDay] = useViewState<string>("thoughts.day", ""),
    [month, setMonth] = useViewState<string>("thoughts.month", today);
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
                        {thought.emotion && (
                          <span className="tag">{thought.emotion}</span>
                        )}
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
  const { data, edit } = useOne();
  const collectionId = useId();
  const [view, setView] = useViewState<string>("notes.view", "notes"),
    [query, setQuery] = useViewState<string>("notes.query", ""),
    [databaseId, setDatabaseId] = useViewState<string>("notes.database", "");
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
        <LayoutGroup id={collectionId}>
          <motion.div layout className="notes-grid">
            <AnimatePresence initial={false}>
              {notes.map((note, i) => (
                <NoteCard note={note} index={i} key={note.id} />
              ))}
            </AnimatePresence>
            <button
              className="new-note-card"
              onClick={() => edit({ kind: "note" })}
            >
              <Plus size={22} strokeWidth={1.2} />
              <span>A fresh page</span>
            </button>
          </motion.div>
        </LayoutGroup>
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

function NoteCard({ note, index }: { note: Note; index: number }) {
  const { edit, busy, zone } = useOne(),
    { rename } = useActions();
  const transition = useSettle();
  const open = () => edit({ kind: "note", id: note.id });
  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={transition}
      className="note-card one-note-card"
    >
      <span className={"note-glyph note-color-" + (index % 3)}>
        <FileText size={20} strokeWidth={1.4} />
      </span>
      <button
        className="note-open"
        aria-label={"Open " + note.title}
        onClick={open}
      >
        <ArrowUpRight size={16} />
      </button>
      <InlineTitle
        kind="note"
        value={note.title}
        onOpen={open}
        onSave={(title) => rename("note", note, title)}
        disabled={busy}
      />
      <button className="one-note-open" onClick={open}>
        <p>
          {note.content.replace(/[#*>]/g, "") || "A page full of possibility."}
        </p>
      </button>
      <footer>
        <span>
          {note.tags?.[0] && <span className="tag">{note.tags[0]}</span>}
        </span>
        <time>{dateLabel(dayKey(note.updatedAt, zone))}</time>
      </footer>
    </motion.article>
  );
}
