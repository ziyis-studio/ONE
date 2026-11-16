import { Pause, Play, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import { usePomodoro } from "../lib/pomodoro-context";
import {
  nextPomodoroMode,
  POMODORO_MODES,
  pomodoroTime,
} from "../lib/pomodoro";
import { ONE_ARC_LONG, ONE_ARC_SHORT } from "../lib/brand-mark";
import { useMotionPreference } from "../lib/motion-preference";
import { Card, IconButton } from "./ui";
import { DiscreteTabs } from "./interactions";
import "./pomodoro.css";

export default function PomodoroCard() {
  const {
    state,
    remainingMs,
    completedToday,
    start,
    pause,
    reset,
    selectMode,
  } = usePomodoro();
  const reduced = useMotionPreference(),
    running = state.status === "running",
    complete = state.status === "complete";
  const duration = POMODORO_MODES[state.mode].seconds,
    ratio = complete ? 1 : remainingMs / (duration * 1000),
    longRatio = 239 / 308;
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
        <IconButton label="Reset Pomodoro" onClick={reset}>
          <RotateCcw size={14} />
        </IconButton>
      }
    >
      <DiscreteTabs
        label="Pomodoro mode"
        compact
        value={state.mode}
        onChange={selectMode}
        items={[
          { value: "focus", label: "Focus" },
          { value: "short", label: "Short break" },
          { value: "long", label: "Long break" },
        ]}
      />
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
            strokeWidth="6"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d={ONE_ARC_LONG} className="pomodoro-track" />
            <path d={ONE_ARC_SHORT} className="pomodoro-track pomodoro-short" />
            <motion.path
              d={ONE_ARC_LONG}
              stroke="currentColor"
              initial={false}
              animate={{ pathLength: Math.min(1, ratio / longRatio) }}
              transition={{ duration: reduced ? 0 : 0.3, ease: "linear" }}
            />
            <motion.path
              d={ONE_ARC_SHORT}
              className="pomodoro-short"
              initial={false}
              animate={{
                pathLength: Math.max(0, (ratio - longRatio) / (1 - longRatio)),
              }}
              transition={{ duration: reduced ? 0 : 0.3, ease: "linear" }}
            />
          </svg>
          <div
            className="pomodoro-dial"
            role="progressbar"
            aria-label={label + " time remaining"}
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={Math.ceil(remainingMs / 1000)}
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
        </motion.div>
        <div className="pomodoro-controls">
          <h3>
            {complete
              ? state.mode === "focus"
                ? "A little progress, made."
                : "A fresh start awaits."
              : state.mode === "focus"
                ? "One thing at a time."
                : "A little room to recharge."}
          </h3>
          <p>
            {complete
              ? POMODORO_MODES[next].label + " is next."
              : `${duration / 60} minutes, just for ${state.mode === "focus" ? "this" : "you"}.`}
          </p>
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
          <small>
            {completedToday} focus{" "}
            {completedToday === 1 ? "session" : "sessions"} today
          </small>
        </div>
      </div>
    </Card>
  );
}
