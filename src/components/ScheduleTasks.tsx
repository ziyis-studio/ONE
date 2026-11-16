import { useState } from "react";
import { GripVertical, Plus, Search } from "lucide-react";
import { useOne } from "../lib/workspace";
import { Empty } from "./ui";
export default function ScheduleTasks({
  selected,
  onPlan,
}: {
  selected: string;
  onPlan: (taskId: string, day: string, minute?: number) => void;
}) {
  const { data, edit, busy } = useOne();
  const [query, setQuery] = useState("");
  const tasks = data.tasks.filter(
    (task) =>
      !task.completedAt &&
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
              draggable={!busy}
              aria-label={task.title}
              onDragStart={(event) => {
                event.dataTransfer.setData("text/one-task", task.id);
                event.dataTransfer.effectAllowed = "copy";
              }}
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
                {links.length > 0 && (
                  <small>
                    {links.length} linked{" "}
                    {links.length === 1 ? "block" : "blocks"}
                  </small>
                )}
              </div>
              <button
                className="one-task-plan"
                disabled={busy}
                aria-label={"Plan " + task.title}
                onClick={() => onPlan(task.id, selected)}
              >
                <Plus size={14} />
              </button>
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
