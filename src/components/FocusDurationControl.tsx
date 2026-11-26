import { useId, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus } from "lucide-react";
import { usePomodoro } from "../lib/pomodoro-context";
import { pomodoroTime } from "../lib/pomodoro";
import { useMotionPreference } from "../lib/motion-preference";
import {
  MIN_FOCUS_MINUTES,
  MAX_FOCUS_MINUTES,
} from "../domain/session-duration";

const valid = (raw: string) =>
  raw.trim() !== "" &&
  Number.isInteger(Number(raw)) &&
  Number(raw) >= MIN_FOCUS_MINUTES &&
  Number(raw) <= MAX_FOCUS_MINUTES;

/** The same preference controls ready focus time and the next active session. */
export default function FocusDurationControl() {
  const { state, remainingMs, setFocusMinutes } = usePomodoro();
  const ready = state.status === "ready",
    minutes = state.focusMinutes;
  const reduced = useMotionPreference();
  const [editing, setEditing] = useState(false),
    [draft, setDraft] = useState(""),
    [error, setError] = useState("");
  const [direction, setDirection] = useState(1);
  const root = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null),
    control = useRef<HTMLButtonElement>(null);
  const selectAll = useRef(true),
    returnFocus = useRef(false),
    finished = useRef(false);
  const help = useId(),
    errorId = useId();
  const latest = useRef({ minutes, draft, editing });
  latest.current = { minutes, draft, editing };

  function update(next: number) {
    const value = Math.max(
      MIN_FOCUS_MINUTES,
      Math.min(MAX_FOCUS_MINUTES, next),
    );
    setDirection(value >= latest.current.minutes ? 1 : -1);
    setFocusMinutes(value);
    // A rapid wheel burst must build on the previous event before React paints.
    latest.current.minutes = value;
    if (latest.current.editing) {
      latest.current.draft = String(value);
      setDraft(String(value));
    }
    setError("");
  }
  function adjust(delta: number) {
    const current = latest.current;
    update(
      (current.editing && valid(current.draft)
        ? Number(current.draft)
        : current.minutes) + delta,
    );
  }
  const adjustRef = useRef(adjust);
  adjustRef.current = adjust;
  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    let amount = 0,
      last = 0;
    const wheel = (event: WheelEvent) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        !event.deltaY ||
        Math.abs(event.deltaX) >= Math.abs(event.deltaY)
      )
        return;
      event.preventDefault();
      if (event.timeStamp - last > 180) amount = 0;
      last = event.timeStamp;
      const delta =
        event.deltaY *
        (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 360 : 1);
      if (amount && Math.sign(amount) !== Math.sign(delta)) amount = 0;
      amount += delta;
      if (Math.abs(amount) >= 40) {
        adjustRef.current(-Math.sign(amount) * (event.shiftKey ? 5 : 1));
        amount = 0;
      }
    };
    node.addEventListener("wheel", wheel, { passive: false });
    return () => node.removeEventListener("wheel", wheel);
  }, []);
  useLayoutEffect(() => {
    if (editing) {
      input.current?.focus({ preventScroll: true });
      if (selectAll.current) input.current?.select();
      else
        input.current?.setSelectionRange(
          input.current.value.length,
          input.current.value.length,
        );
    } else if (returnFocus.current) {
      returnFocus.current = false;
      control.current?.focus({ preventScroll: true });
    }
  }, [editing]);
  function begin(raw = String(latest.current.minutes), select = true) {
    selectAll.current = select;
    finished.current = false;
    setDraft(raw);
    setError("");
    setEditing(true);
  }
  function finish(save: boolean, focus: boolean) {
    if (finished.current) return;
    if (save && !valid(latest.current.draft)) {
      setError("Enter a whole number from 1 to 180.");
      return;
    }
    finished.current = true;
    if (save) update(Number(latest.current.draft));
    returnFocus.current = focus;
    setError("");
    setEditing(false);
  }
  function keys(event: KeyboardEvent<HTMLElement>) {
    const delta = event.shiftKey ? 5 : 1;
    const steps: Record<string, number> = {
      ArrowUp: delta,
      ArrowDown: -delta,
      PageUp: 5,
      PageDown: -5,
    };
    if (event.key in steps) {
      event.preventDefault();
      adjust(steps[event.key]);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      update(event.key === "Home" ? MIN_FOCUS_MINUTES : MAX_FOCUS_MINUTES);
    } else if (
      !editing &&
      /^\d$/.test(event.key) &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      begin(event.key, false);
    }
  }
  const label = ready
    ? "Focus duration in minutes"
    : "Next focus duration in minutes";
  const phase =
    state.status === "complete"
      ? "Complete"
      : state.status === "paused"
        ? "Paused"
        : "Focus";
  const digits = (
    <span className="focus-duration-digits" data-reduced={reduced || undefined}>
      <AnimatePresence initial={false} mode="popLayout" custom={direction}>
        <motion.span
          key={minutes}
          custom={direction}
          variants={{
            enter: (d: number) => ({
              y: reduced ? 0 : d * 10,
              opacity: reduced ? 1 : 0,
            }),
            visible: { y: 0, opacity: 1 },
            leave: (d: number) => ({
              y: reduced ? 0 : -d * 10,
              opacity: reduced ? 1 : 0,
            }),
          }}
          initial="enter"
          animate="visible"
          exit="leave"
          transition={{ duration: reduced ? 0 : 0.16, ease: "easeOut" }}
        >
          {String(minutes).padStart(ready ? 2 : 1, "0")}
        </motion.span>
      </AnimatePresence>
    </span>
  );
  const editor = editing ? (
    <span className="focus-duration-input-wrap">
      <input
        ref={input}
        className="focus-duration-input"
        type="text"
        inputMode="numeric"
        role="spinbutton"
        aria-label={label}
        aria-valuemin={1}
        aria-valuemax={180}
        aria-valuenow={valid(draft) ? Number(draft) : minutes}
        aria-invalid={!!error}
        aria-describedby={`${help}${error ? " " + errorId : ""}`}
        value={draft}
        maxLength={6}
        onChange={(event) => {
          latest.current.draft = event.target.value;
          setDraft(event.target.value);
          setError("");
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            finish(event.key === "Enter", true);
          } else keys(event);
        }}
        onBlur={() => finish(valid(latest.current.draft), false)}
      />
      <span aria-hidden="true">{ready ? ":00" : " min"}</span>
    </span>
  ) : (
    <motion.button
      initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.16 }}
      ref={control}
      type="button"
      className="focus-duration-value"
      role="spinbutton"
      aria-label={label}
      aria-valuemin={1}
      aria-valuemax={180}
      aria-valuenow={minutes}
      aria-valuetext={`${minutes} minutes${ready ? "" : " for the next focus"}`}
      aria-describedby={help}
      onClick={() => begin()}
      onKeyDown={keys}
    >
      {ready ? (
        <time role="timer" aria-live="off">
          {digits}
          <span aria-hidden="true">:00</span>
        </time>
      ) : (
        <>
          {digits}
          <span aria-hidden="true"> min</span>
        </>
      )}
    </motion.button>
  );
  return (
    <div
      ref={root}
      className={`focus-duration-control${ready ? " is-ready" : " is-active"}`}
    >
      {ready ? (
        editor
      ) : (
        <>
          <button
            className="focus-duration-countdown"
            type="button"
            aria-label="Edit next focus duration"
            onClick={() => begin()}
            onKeyDown={keys}
          >
            <time role="timer" aria-live="off">
              {pomodoroTime(remainingMs)}
            </time>
          </button>
          <span className="focus-duration-phase">{phase}</span>
        </>
      )}
      <div className="focus-duration-actions">
        <button
          type="button"
          className="focus-duration-step"
          aria-label="Decrease focus duration"
          disabled={minutes <= 1}
          onClick={() => adjust(-1)}
        >
          <Minus size={12} />
        </button>
        {ready ? (
          <span className="focus-duration-phase">
            Focus <span className="focus-duration-affordance">· min</span>
          </span>
        ) : (
          <span className="focus-duration-next">Next focus: {editor}</span>
        )}
        <button
          type="button"
          className="focus-duration-step"
          aria-label="Increase focus duration"
          disabled={minutes >= 180}
          onClick={() => adjust(1)}
        >
          <Plus size={12} />
        </button>
      </div>
      <span className="focus-duration-help" id={help}>
        Scroll or use Up/Down to adjust. Shift changes five minutes. Click or
        press Enter to type. Range 1–180 minutes.
        {!ready ? " Changes apply to the next focus." : ""}
      </span>
      {error && (
        <span id={errorId} className="focus-duration-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
