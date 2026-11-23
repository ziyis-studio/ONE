import TaskScheduleHint from "./TaskScheduleHint";
import { plannedTaskIds } from "../lib/schedule";
import { useViewState } from "../lib/view-state";
import { GripVertical, Plus, Search, Repeat2 } from "lucide-react";
import { useOne } from "../lib/workspace";
import { Empty } from "./ui";
export default function ScheduleTasks({
  selected,
  onPlan,
  onDragTask,
}: {
  selected: string;
  onPlan: (taskId: string, day: string, minute?: number) => void;
  onDragTask?: (id: string | null) => void;
}) {
  const { data, edit, busy, now } = useOne();
  const [query, setQuery] = useViewState<string>("schedule.query", "");
  const planned = plannedTaskIds(data, now);
  const tasks = data.tasks.filter(
    (task) =>
      !task.completedAt &&
      (!task.recurrenceId ||
        !task.deadline ||
        task.deadline <= selected ||
        task.scheduledOn === selected) &&
      `${task.title} ${data.projects.find((project) => project.id === task.projectId)?.title || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <aside
      id="schedule-task-panel"
      className="one-schedule-tasks"
      aria-label="Tasks to schedule"
    >
      <header>
        <h2>Tasks</h2>
        <span>{tasks.length}</span>
      </header>
      <p>Drag a task into a time block, or plan a new block.</p>
      <label className="one-schedule-search">
        <Search size={14} />
        <input
          aria-label="Find tasks to schedule"
          placeholder="Find a task…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="one-planning-task-list">
        {tasks.map((task) => {
          const links = data.blockTaskLinks.filter(
            (link) => link.taskId === task.id,
          );
          return (
            <article
              key={task.id}
              className="one-planning-task"
              data-unscheduled={!planned.has(task.id) || undefined}
              draggable={!busy}
              aria-label={task.title}
              onDragStart={(event) => {
                event.dataTransfer.setData("text/one-task", task.id);
                event.dataTransfer.effectAllowed = "move";
                onDragTask?.(task.id);
              }}
              onDragEnd={() => onDragTask?.(null)}
            >
              <GripVertical size={14} className="one-task-grip" />
              <div>
                <button
                  className="one-planning-task-title"
                  onClick={() => edit({ kind: "task", id: task.id })}
                >
                  {task.title}
                </button>
                <span>
                  {data.projects.find(
                    (project) => project.id === task.projectId,
                  )?.title || "Personal"}
                </span>
                {task.recurrenceId && (
                  <span className="task-repeat-badge">
                    <Repeat2 size={11} />
                    {task.deadline}
                  </span>
                )}
                <TaskScheduleHint
                  task={task}
                  planned={planned.has(task.id)}
                  disabled={busy}
                  onPlan={() => onPlan(task.id, selected)}
                />
                {links.length > 0 && (
                  <button
                    type="button"
                    className="one-linked-blocks-button"
                    aria-label={`View ${links.length} linked ${links.length === 1 ? "block" : "blocks"} for ${task.title}`}
                    onClick={() => edit({ kind: "task", id: task.id })}
                  >
                    {links.length}{" "}
                    {planned.has(task.id) ? "linked" : "previous"}{" "}
                    {links.length === 1 ? "block" : "blocks"}
                  </button>
                )}
              </div>
              {planned.has(task.id) && (
                <button
                  className="one-task-plan"
                  disabled={busy}
                  aria-label={"Plan " + task.title}
                  onClick={() => onPlan(task.id, selected)}
                >
                  <Plus size={14} />
                </button>
              )}
            </article>
          );
        })}
        {!tasks.length && (
          <Empty
            title={query ? "No matching tasks" : "All clear"}
            detail={
              query
                ? "Try another search."
                : "Your open tasks will appear here."
            }
          />
        )}
      </div>
    </aside>
  );
}
