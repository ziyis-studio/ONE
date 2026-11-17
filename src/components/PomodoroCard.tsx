import {
  CloudCheck,
  CloudOff,
  CloudUpload,
  Target,
  Coffee,
  Armchair,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { motion } from "motion/react";
import { usePomodoro } from "../lib/pomodoro-context";
import {
  nextPomodoroMode,
  POMODORO_MODES,
  pomodoroTime,
} from "../lib/pomodoro";
import { ONE_SEGMENTS, segmentProgress } from "../lib/brand-mark";
import { useMotionPreference } from "../lib/motion-preference";
import { Card, IconButton } from "./ui";
import { DiscreteTabs } from "./interactions";
import "./pomodoro.css";

export default function PomodoroCard() {
  const {
    state,
    remainingMs,
    completedToday,
    syncStatus,
    refreshRecords,
    start,
    pause,
    reset,
    selectMode,
  } = usePomodoro();
  const reduced = useMotionPreference(),
    running = state.status === "running",
    complete = state.status === "complete";
  const duration = POMODORO_MODES[state.mode].seconds,
    ratio = 1 - remainingMs / (duration * 1000);
  const next = nextPomodoroMode(state),
    label = POMODORO_MODES[state.mode].label;
  const action = running
    ? "Pause"
    : state.status === "paused"
      ? "Resume"
      : complete
        ? next === "focus"
          ? "Start focus"
          : "Start break"
        : "Start";
  return (
    <Card
      title="Pomodoro"
      className="pomodoro-card"
      meta={
        <div className="pomodoro-meta">
          {syncStatus !== "local" && (
            <IconButton
              label={
                syncStatus === "offline"
                  ? "Focus records waiting to sync. Retry"
                  : syncStatus === "syncing"
                    ? "Saving focus records"
                    : "Focus records saved. Refresh"
              }
              onClick={refreshRecords}
              disabled={syncStatus === "syncing"}
            >
              {syncStatus === "offline" ? (
                <CloudOff size={14} />
              ) : syncStatus === "syncing" ? (
                <CloudUpload size={14} />
              ) : (
                <CloudCheck size={14} />
              )}
            </IconButton>
          )}
          <IconButton label="Reset Pomodoro" onClick={reset}>
            <RotateCcw size={14} />
          </IconButton>
        </div>
      }
    >
      <div className="pomodoro-body">
        <motion.div
          className={"pomodoro-mark" + (running ? " is-running" : "")}
          data-timer-state={state.status}
          data-reduced={reduced || undefined}
          animate={{ scale: complete && !reduced ? [1, 1.04, 1] : 1 }}
          transition={{ duration: reduced ? 0 : 0.45 }}
        >
          <svg
            viewBox="0 0 100 100"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            {ONE_SEGMENTS.map((segment) => (
              <path
                key={segment.letter}
                d={segment.d}
                className={`pomodoro-track pomodoro-${segment.name}`}
              />
            ))}
            {ONE_SEGMENTS.map((segment) => {
              const progress = segmentProgress(ratio, segment);
              return (
                <motion.path
                  key={segment.letter}
                  d={segment.reverseD}
                  stroke="currentColor"
                  className={`pomodoro-${segment.name}`}
                  initial={false}
                  animate={{
                    pathLength: progress,
                    opacity: progress > 0 ? 1 : 0,
                  }}
                  transition={{ duration: reduced ? 0 : 0.85, ease: "linear" }}
                />
              );
            })}
          </svg>
        </motion.div>
        <div className="pomodoro-controls">
          <DiscreteTabs
            label="Pomodoro mode"
            compact
            iconsOnly
            value={state.mode}
            onChange={selectMode}
            items={[
              {
                value: "focus",
                label: "Focus",
                icon: <Target size={16} aria-hidden="true" />,
              },
              {
                value: "short",
                label: "Short break",
                icon: <Coffee size={16} aria-hidden="true" />,
              },
              {
                value: "long",
                label: "Long break",
                icon: <Armchair size={16} aria-hidden="true" />,
              },
            ]}
          />
          <div
            className="pomodoro-dial"
            role="progressbar"
            aria-label={label + " progress"}
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={duration - Math.ceil(remainingMs / 1000)}
            aria-valuetext={pomodoroTime(remainingMs) + " remaining"}
          >
            <time role="timer" aria-live="off">
              {pomodoroTime(remainingMs)}
            </time>
            <span>
              {complete
                ? "Complete"
                : state.status === "paused"
                  ? "Paused"
                  : label}
            </span>
          </div>
          <button
            type="button"
            className="primary-button"
            onClick={running ? pause : start}
            aria-label={
              running
                ? "Pause Pomodoro"
                : complete
                  ? "Start " + POMODORO_MODES[next].label.toLowerCase()
                  : state.status === "paused"
                    ? "Resume Pomodoro"
                    : "Start Pomodoro"
            }
          >
            {running ? <Pause size={14} /> : <Play size={14} />}
            <span>{action}</span>
          </button>
          <small className="pomodoro-summary">
            {completedToday} {completedToday === 1 ? "session" : "sessions"} ·{" "}
            {completedToday * 25}m focus today
          </small>
        </div>
      </div>
    </Card>
  );
}
