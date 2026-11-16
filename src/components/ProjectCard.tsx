import { useId, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { ArrowUpRight, ChevronDown, MoreHorizontal, Plus } from "lucide-react";
import type { Project } from "../domain/model";
import { useOne } from "../lib/workspace";
import { useActions } from "../lib/actions";
import { dateLabel, dayKey } from "../domain/time";
import { useMotionPreference } from "../lib/motion-preference";
import { EntityIcon, CheckButton } from "./ui";
import { InlineTitle, MorphMenu, useSettle } from "./interactions";

export default function ProjectCard({
  project,
  row = false,
}: {
  project: Project;
  row?: boolean;
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
  const open = () => edit({ kind: "project", id: project.id });
  return (
    <motion.article
      layout
      layoutId={`project-${project.id}`}
      transition={transition}
      style={{ borderRadius: 14 }}
      className={`project-card one-project-card${row ? " one-project-row" : ""}`}
    >
      <div className="project-card-top">
        <span className="project-icon">
          <EntityIcon name={project.icon} size={21} />
        </span>
        <MorphMenu
          label={`Actions for ${project.title}`}
          className="one-icon-menu"
          trigger={<MoreHorizontal size={16} />}
          items={[
            {
              label: "Open project",
              icon: <ArrowUpRight size={14} />,
              onSelect: open,
            },
            {
              label: "Add a task",
              icon: <Plus size={14} />,
              onSelect: () => edit({ kind: "task", projectId: project.id }),
            },
          ]}
        />
      </div>
      <InlineTitle
        kind="project"
        value={project.title}
        onOpen={open}
        onSave={(title) => rename("project", project, title)}
        disabled={busy}
      />
      <button className="one-project-description" onClick={open}>
        {project.description || "Something worth making room for."}
      </button>
      <motion.div layout="position" className="one-project-overview">
        <svg
          className="one-progress-ring"
          viewBox="0 0 100 100"
          fill="none"
          role="img"
          aria-label={`${percent}% complete`}
        >
          <path
            d="M 71.064 77.952 A 35 35 0 1 1 63.111 17.549"
            stroke="currentColor"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M 76.010 26.580 A 35 35 0 0 1 81.185 65.890"
            stroke="currentColor"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <motion.path
            className="one-progress-fill"
            d="M 71.064 77.952 A 35 35 0 1 1 63.111 17.549"
            stroke="currentColor"
            strokeWidth="7"
            strokeLinecap="round"
            initial={false}
            animate={{
              pathLength: Math.min(1, progress / (239 / 308)),
              opacity: progress > 0 ? 1 : 0,
            }}
            transition={transition}
          />
          <motion.path
            className="one-progress-fill"
            d="M 76.010 26.580 A 35 35 0 0 1 81.185 65.890"
            stroke="currentColor"
            strokeWidth="7"
            strokeLinecap="round"
            initial={false}
            animate={{
              pathLength: Math.max(0, (progress - 239 / 308) / (69 / 308)),
              opacity: progress > 239 / 308 ? 1 : 0,
            }}
            transition={transition}
          />
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
                  onClick={() => edit({ kind: "task", projectId: project.id })}
                >
                  <Plus size={13} />
                  {tasks.length ? "Add a task" : "Add your first task"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>
      <footer>
        <span className="tag">{project.tags?.[0] || "Personal project"}</span>
        <span>{dateLabel(dayKey(project.createdAt, "UTC"))}</span>
      </footer>
    </motion.article>
  );
}
