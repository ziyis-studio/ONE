import type { CardDragBinding } from "../lib/card-drag";
import { useId, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { ChevronDown, Plus } from "lucide-react";
import type { Project } from "../domain/model";
import { useOne } from "../lib/workspace";
import { useActions } from "../lib/actions";
import { dateLabel, dayKey } from "../domain/time";
import { useMotionPreference } from "../lib/motion-preference";
import { useChartEntrance } from "../lib/chart-entrance";
import { CardOpen, openCardBackground } from "./CardOpen";
import { EntityIcon, CheckButton } from "./ui";
import { InlineTitle, useSettle } from "./interactions";
import { PROJECT_PROGRESS_SEGMENTS, segmentProgress } from "../lib/brand-mark";

export default function ProjectCard({
  project,
  row = false,
  drag,
  descriptionId,
}: {
  project: Project;
  row?: boolean;
  drag?: CardDragBinding;
  descriptionId?: string;
}) {
  const { data, edit, busy } = useOne(),
    { rename, toggleTask, safely } = useActions();
  const [expanded, setExpanded] = useState(false);
  const id = useId(),
    transition = useSettle(),
    reduced = useMotionPreference();
  const tasks = data.tasks.filter((task) => task.projectId === project.id);
  const done = tasks.filter((task) => task.completedAt).length;
  const percent = tasks.length
    ? Math.round((done / tasks.length) * 100)
    : project.completedAt
      ? 100
      : 0;
  const progress = percent / 100;
  const chart = useChartEntrance<SVGSVGElement>();
  const open = () => edit({ kind: "project", id: project.id });
  return (
    <motion.article
      layout
      layoutId={`project-${project.id}`}
      transition={transition}
      style={{ borderRadius: 14 }}
      className={`project-card one-project-card${row ? " one-project-row" : ""}`}
      onClick={(event) => openCardBackground(event, open)}
      {...drag}
    >
      <CardOpen
        label={"Open project " + project.title}
        onOpen={open}
        descriptionId={descriptionId}
      />
      <div className="project-card-top">
        <span className="project-icon">
          <EntityIcon name={project.icon} size={21} />
        </span>
        <div className="one-project-heading">
          <InlineTitle
            kind="project"
            value={project.title}
            onOpen={open}
            onSave={(title) => rename("project", project, title)}
            disabled={busy}
          />
          <span className="tag">{project.tags?.[0] || "Personal project"}</span>
          <time dateTime={dayKey(project.createdAt, "UTC")}>
            {dateLabel(dayKey(project.createdAt, "UTC"))}
          </time>
        </div>
      </div>
      <p className="one-project-description">
        {project.description || "Something worth making room for."}
      </p>
      <motion.div layout="position" className="one-project-overview">
        <svg
          className="one-progress-ring"
          ref={chart}
          viewBox="0 0 100 100"
          fill="none"
          role="img"
          aria-label={`${percent}% complete`}
          tabIndex={0}
          data-chart-title={project.title}
          data-chart-detail={`${percent}% complete`}
          strokeWidth="8"
          strokeLinecap="round"
        >
          {PROJECT_PROGRESS_SEGMENTS.map((segment) => (
            <path key={segment.letter} d={segment.d} stroke="currentColor" />
          ))}
          {PROJECT_PROGRESS_SEGMENTS.map((segment) => {
            const value = segmentProgress(progress, segment);
            return (
              <path
                key={segment.letter}
                className="one-progress-fill"
                d={segment.d}
                stroke="currentColor"
                pathLength="1"
                data-chart-enter="draw"
                data-chart-delay={(segment.start / 288) * 660}
                data-chart-duration={Math.max(
                  1,
                  (segment.degrees / 288) * value * 660,
                )}
                style={{
                  strokeDasharray: `${value} 1`,
                  opacity: value > 0 ? 1 : 0,
                }}
              />
            );
          })}
        </svg>
        <div>
          <strong>{percent}%</strong>
          <span>
            {done} of {tasks.length} tasks complete
          </span>
        </div>
      </motion.div>
      <LayoutGroup id={id}>
        <button
          className="one-project-expand"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded(!expanded)}
        >
          <span>{expanded ? "Hide tasks" : "View tasks"}</span>
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={transition}
          >
            <ChevronDown size={14} />
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              id={id}
              className="one-project-tasks"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.24 }}
            >
              <div>
                {tasks.map((task, index) => (
                  <motion.div
                    className="one-project-task"
                    key={task.id}
                    initial={{ opacity: 0, x: reduced ? 0 : -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: reduced ? 0 : 0.16,
                      delay: reduced ? 0 : Math.min(index, 5) * 0.025,
                    }}
                  >
                    <CheckButton
                      label={
                        (task.completedAt ? "Reopen " : "Complete ") +
                        task.title
                      }
                      checked={!!task.completedAt}
                      disabled={busy}
                      onClick={() => safely(() => toggleTask(task))}
                    />
                    <button onClick={() => edit({ kind: "task", id: task.id })}>
                      {task.title}
                    </button>
                  </motion.div>
                ))}
                <button
                  className="text-button"
                  onClick={() =>
                    edit({
                      kind: "task",
                      projectId: project.id,
                      returnProjectId: project.id,
                    })
                  }
                >
                  <Plus size={13} />
                  {tasks.length ? "Add a task" : "Add your first task"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>
    </motion.article>
  );
}
