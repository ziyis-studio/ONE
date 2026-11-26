import { useId } from "react";
import TaskScheduleHint from "./TaskScheduleHint";
import { SelectField } from "./SelectField";
import { plannedTaskIds } from "../lib/schedule";
import { stages, taskStage } from "../lib/actions";
import { useViewState } from "../lib/view-state";
import {
  CalendarClock,
  ChevronRight,
  GripVertical,
  History,
  Plus,
  Search,
  Repeat2,
  SlidersHorizontal,
} from "lucide-react";
import { useOne } from "../lib/workspace";
import { Empty } from "./ui";
type Filters = { project: string; status: string; planning: string };
const EMPTY_FILTERS: Filters = { project: "", status: "", planning: "" };
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
  const [filters, setFilters] = useViewState<Filters>(
    "schedule.taskFilters",
    EMPTY_FILTERS,
  );
  const [filtersOpen, setFiltersOpen] = useViewState(
    "schedule.taskFiltersOpen",
    false,
  );
  const filtersId = useId();
  const planned = plannedTaskIds(data, now);
  const projects = new Map(
    data.projects.map((project) => [project.id, project]),
  );
  const project =
    filters.project === "personal" || projects.has(filters.project)
      ? filters.project
      : "";
  const activeFilters = [project, filters.status, filters.planning].filter(
    Boolean,
  ).length;
  const blockIds = new Set(data.timeBlocks.map((block) => block.id));
  const linkCounts = new Map<string, number>();
  for (const link of data.blockTaskLinks)
    if (blockIds.has(link.timeBlockId))
      linkCounts.set(link.taskId, (linkCounts.get(link.taskId) || 0) + 1);
  const eligible = data.tasks.filter(
    (task) =>
      !task.completedAt &&
      (!task.recurrenceId ||
        !task.deadline ||
        task.deadline <= selected ||
        task.scheduledOn === selected),
  );
  const search = query.trim().toLowerCase();
  const tasks = eligible.filter((task) => {
    const isPlanned = planned.has(task.id);
    return (
      (!project ||
        (project === "personal"
          ? !task.projectId
          : task.projectId === project)) &&
      (!filters.status || taskStage(task) === filters.status) &&
      (!filters.planning ||
        (filters.planning === "planned" && isPlanned) ||
        (filters.planning === "unscheduled" && !isPlanned) ||
        (filters.planning === "previous" &&
          !isPlanned &&
          !!linkCounts.get(task.id))) &&
      `${task.title} ${projects.get(task.projectId || "")?.title || "Personal"}`
        .toLowerCase()
        .includes(search)
    );
  });
  const narrowed = !!search || activeFilters > 0;
  function reset() {
    setQuery("");
    setFilters(EMPTY_FILTERS);
  }
  return (
    <aside
      id="schedule-task-panel"
      className="one-schedule-tasks"
      aria-label="Tasks to schedule"
    >
      <header>
        <h2>Tasks</h2>
        <span
          role="status"
          aria-label={`${tasks.length} of ${eligible.length} open tasks shown`}
        >
          {narrowed ? `${tasks.length} / ${eligible.length}` : tasks.length}
        </span>
      </header>
      <p>Drag a task into a time block, or plan a new block.</p>
      <div className="one-schedule-task-toolbar">
        <label className="one-schedule-search">
          <Search size={14} aria-hidden="true" />
          <input
            aria-label="Find tasks to schedule"
            placeholder="Find a task…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="one-task-filter-toggle"
          aria-label={`Filter tasks${activeFilters ? `, ${activeFilters} active` : ""}`}
          aria-expanded={filtersOpen}
          aria-controls={filtersOpen ? filtersId : undefined}
          data-active={activeFilters > 0 || undefined}
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <SlidersHorizontal size={14} aria-hidden="true" />
          {activeFilters > 0 && <span>{activeFilters}</span>}
        </button>
      </div>
      {filtersOpen && (
        <fieldset className="one-schedule-task-filters" id={filtersId}>
          <legend className="one-visually-hidden">Task filters</legend>
          <SelectField
            label="Project"
            value={project}
            onChange={(value) =>
              setFilters((current) => ({ ...current, project: value }))
            }
            options={[
              { value: "", label: "All projects" },
              { value: "personal", label: "Personal" },
              ...data.projects
                .toSorted((a, b) => a.title.localeCompare(b.title))
                .map((item) => ({ value: item.id, label: item.title })),
            ]}
          />
          <SelectField
            label="Task status"
            value={filters.status}
            onChange={(value) =>
              setFilters((current) => ({ ...current, status: value }))
            }
            options={[
              { value: "", label: "All open statuses" },
              ...stages
                .filter((stage) => stage.id !== "done")
                .map((stage) => ({ value: stage.id, label: stage.title })),
            ]}
          />
          <SelectField
            label="Scheduling"
            value={filters.planning}
            onChange={(value) =>
              setFilters((current) => ({ ...current, planning: value }))
            }
            options={[
              { value: "", label: "All tasks" },
              { value: "unscheduled", label: "Unscheduled" },
              { value: "planned", label: "Planned" },
              { value: "previous", label: "Previous blocks only" },
            ]}
          />
          {activeFilters > 0 && (
            <button
              type="button"
              className="one-task-filter-reset"
              onClick={() => setFilters(EMPTY_FILTERS)}
            >
              Reset filters
            </button>
          )}
        </fieldset>
      )}
      <div className="one-planning-task-list">
        {tasks.map((task) => {
          const links = linkCounts.get(task.id) || 0;
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
                  {projects.get(task.projectId || "")?.title || "Personal"}
                </span>
                {task.recurrenceId && (
                  <span className="task-repeat-badge">
                    <Repeat2 size={11} />
                    {task.deadline}
                  </span>
                )}
                <div className="one-planning-task-metadata">
                  <TaskScheduleHint
                    task={task}
                    planned={planned.has(task.id)}
                    disabled={busy}
                    onPlan={() => onPlan(task.id, selected)}
                  />
                  {links > 0 && (
                    <button
                      type="button"
                      className="one-linked-blocks-button"
                      aria-label={`View ${links} linked ${links === 1 ? "block" : "blocks"} for ${task.title}`}
                      onClick={() => edit({ kind: "task", id: task.id })}
                    >
                      {planned.has(task.id) ? (
                        <CalendarClock size={11} aria-hidden="true" />
                      ) : (
                        <History size={11} aria-hidden="true" />
                      )}
                      <span>
                        {links} {planned.has(task.id) ? "linked" : "previous"}{" "}
                        {links === 1 ? "block" : "blocks"}
                      </span>
                      <ChevronRight size={10} aria-hidden="true" />
                    </button>
                  )}
                </div>
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
            title={narrowed ? "No matching tasks" : "All clear"}
            detail={
              narrowed
                ? "Try another search or adjust your filters."
                : "Your open tasks will appear here."
            }
            action={narrowed ? reset : undefined}
            label="Clear search and filters"
          />
        )}
      </div>
    </aside>
  );
}
