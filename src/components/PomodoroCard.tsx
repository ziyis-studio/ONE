import { useState } from "react";
import { Button, DialogTrigger, Popover, Dialog } from "react-aria-components";
import { useOne } from "../lib/workspace";
import {
  Target,
  Coffee,
  Armchair,
  Pause,
  Play,
  RotateCcw,
  X,
  Settings2,
} from "lucide-react";
import { motion } from "motion/react";
import { usePomodoro } from "../lib/pomodoro-context";
import {
  nextPomodoroMode,
  POMODORO_MODES,
  pomodoroTime,
} from "../lib/pomodoro";
import { ONE_SEGMENTS, segmentProgress, pomodoroHead } from "../lib/brand-mark";
import { useMotionPreference } from "../lib/motion-preference";
import { useChartEntrance } from "../lib/chart-entrance";
import { Card, IconButton } from "./ui";
import { DiscreteTabs } from "./interactions";
import "./pomodoro.css";

export default function PomodoroCard() {
  const {
    state,
    unlinkTask,
    remainingMs,
    completedToday,
    focusMinutesToday,
    start,
    pause,
    reset,
    selectMode,
  } = usePomodoro();
  const { edit, data } = useOne();
  const chart = useChartEntrance<SVGSVGElement>();
  const reduced = useMotionPreference(),
    running = state.status === "running",
    complete = state.status === "complete";
  const duration = state.durationSeconds,
    ratio = 1 - remainingMs / (duration * 1000);
  const head = pomodoroHead(ratio);
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
        <div className="pomodoro-heading-actions">
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
          <FocusDurationSettings />
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
            ref={chart}
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
                pathLength="1"
                data-chart-enter="draw"
                className={`pomodoro-track pomodoro-${segment.name}`}
              />
            ))}
            {ONE_SEGMENTS.map((segment) => {
              const progress = segmentProgress(ratio, segment);
              return (
                <motion.path
                  key={(state.sessionId || state.mode) + segment.letter}
                  d={segment.reverseD}
                  stroke="currentColor"
                  className={`pomodoro-${segment.name}`}
                  pathLength="1"
                  initial={false}
                  animate={{
                    strokeDasharray: `${progress} 2`,
                    opacity: progress > 0 ? (complete ? 1 : 0.5) : 0,
                  }}
                  transition={{
                    duration: reduced || state.status === "ready" ? 0 : 0.85,
                    ease: "linear",
                  }}
                />
              );
            })}
            {state.status !== "ready" && !complete && (
              <motion.circle
                key={head.segment.letter}
                className={"pomodoro-head pomodoro-" + head.segment.name}
                data-head={head.segment.letter}
                r="4"
                fill="currentColor"
                stroke="none"
                initial={false}
                animate={{ cx: head.x, cy: head.y }}
                transition={{ duration: reduced ? 0 : 0.85, ease: "linear" }}
              />
            )}
          </svg>
        </motion.div>
        <div className="pomodoro-controls">
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
          {state.mode === "focus" &&
            state.focusMinutes * 60 !== state.durationSeconds && (
              <small className="pomodoro-next-duration">
                Next focus: {state.focusMinutes} min
              </small>
            )}
          {state.mode === "focus" && state.taskTitle && (
            <div className="pomodoro-task-row">
              <button
                type="button"
                className="pomodoro-task text-button"
                title={state.taskTitle}
                disabled={!data.tasks.some((t) => t.id === state.taskId)}
                onClick={() => edit({ kind: "task", id: state.taskId! })}
              >
                {state.taskTitle}
              </button>
              <IconButton label="Unlink focus task" onClick={unlinkTask}>
                <X size={12} />
              </IconButton>
            </div>
          )}
          <div className="pomodoro-action-row">
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
            <IconButton label="Reset Pomodoro" onClick={reset}>
              <RotateCcw size={15} />
            </IconButton>
          </div>
          <small className="pomodoro-summary">
            {completedToday} {completedToday === 1 ? "session" : "sessions"} ·{" "}
            {focusMinutesToday}m focus today
          </small>
        </div>
      </div>
    </Card>
  );
}

function FocusDurationSettings() {
  const { state, setFocusMinutes } = usePomodoro();
  const [draft, setDraft] = useState(String(state.focusMinutes));
  const [error, setError] = useState("");
  return (
    <DialogTrigger
      onOpenChange={(open) => {
        if (open) {
          setDraft(String(state.focusMinutes));
          setError("");
        }
      }}
    >
      <Button className="icon-button" aria-label="Change focus duration">
        <Settings2 size={15} />
      </Button>
      <Popover className="one-date-popover" placement="bottom end" offset={8}>
        <Dialog
          className="pomodoro-duration-settings"
          aria-label="Focus duration"
        >
          {({ close }) => (
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                const minutes = Number(draft);
                if (
                  !Number.isInteger(minutes) ||
                  minutes < 1 ||
                  minutes > 180
                ) {
                  setError("Choose a whole number from 1 to 180 minutes.");
                  return;
                }
                setFocusMinutes(minutes);
                close();
              }}
            >
              <h3>Focus duration</h3>
              <label className="form-field">
                <span>Minutes</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={180}
                  step={1}
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    setError("");
                  }}
                  aria-invalid={!!error}
                />
              </label>
              <div className="pomodoro-duration-presets">
                {[15, 25, 45, 60, 90].map((minutes) => (
                  <button
                    type="button"
                    className="tiny-pill"
                    aria-pressed={draft === String(minutes)}
                    key={minutes}
                    onClick={() => {
                      setDraft(String(minutes));
                      setError("");
                    }}
                  >
                    {minutes} min
                  </button>
                ))}
              </div>
              <p>
                {state.status === "running" || state.status === "paused"
                  ? "Applies to your next focus. Your current session keeps its duration."
                  : "Choose 1–180 minutes. Breaks keep their 5/15 minute durations."}
              </p>
              {error && <p role="alert">{error}</p>}
              <footer>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={close}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Apply
                </button>
              </footer>
            </form>
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
