/*! Motion patterns adapted from useLayouts. Copyright (c) 2025 Urvish Mali. MIT license: /licenses/uselayouts.txt */
// See docs/uselayouts-motion.md and docs/licenses/uselayouts.txt.
import { useEffect, useLayoutEffect, useId, useRef, useState } from "react";
import type { ReactNode, KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import {
  Check,
  ChevronDown,
  CircleAlert,
  Filter,
  PencilLine,
  X,
} from "lucide-react";
import { useMotionPreference } from "../lib/motion-preference";
import { AuthLogo } from "./AuthLogo";
import "./interactions.css";

export const settle = {
  type: "spring",
  stiffness: 380,
  damping: 34,
  mass: 0.8,
} as const;
export function useSettle() {
  return useMotionPreference() ? { duration: 0 } : settle;
}
export function DiscreteTabs<T extends string>({
  value,
  onChange,
  items,
  label = "View",
  compact = false,
  iconsOnly = false,
}: {
  value: T;
  onChange: (value: T) => void;
  items: { value: T; label: string; icon?: ReactNode }[];
  label?: string;
  compact?: boolean;
  iconsOnly?: boolean;
}) {
  const id = useId(),
    transition = useSettle();
  return (
    <LayoutGroup id={id}>
      <div
        className={`segmented one-tabs${compact ? " compact" : ""}`}
        role="group"
        aria-label={label}
        data-icons-only={iconsOnly || undefined}
      >
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={value === item.value}
            aria-label={iconsOnly ? item.label : undefined}
            className={value === item.value ? "active" : ""}
            onClick={() => onChange(item.value)}
          >
            {value === item.value && (
              <motion.span
                className="one-tab-indicator"
                layoutId="selection"
                transition={transition}
              />
            )}
            <span className="one-tab-label">
              {item.icon}
              {!iconsOnly && item.label}
            </span>
            {iconsOnly && (
              <span className="one-tab-tooltip" aria-hidden="true">
                {item.label}
              </span>
            )}
          </button>
        ))}
      </div>
    </LayoutGroup>
  );
}
export function ContentSwitch({
  value,
  children,
  className = "",
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const reduced = useMotionPreference(),
    transition = useSettle();
  return (
    <motion.div
      layout="size"
      transition={transition}
      className={`one-content-switch ${className}`}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={value}
          layout="position"
          initial={{ opacity: 0, y: reduced ? 0 : 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduced ? 0 : -4 }}
          transition={{ duration: reduced ? 0 : 0.18 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
export type MenuChoice = {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  value?: string;
};
export function MorphMenu({
  label,
  trigger,
  items,
  className = "",
  selected,
  primary = false,
  align = "end",
}: {
  label: string;
  trigger: ReactNode;
  items: MenuChoice[];
  className?: string;
  selected?: string;
  primary?: boolean;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{
    left: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
    origin: string;
  } | null>(null);
  const id = useId(),
    transition = useSettle(),
    reduced = useMotionPreference();
  const button = useRef<HTMLButtonElement>(null),
    panel = useRef<HTMLDivElement>(null);
  const listbox = selected !== undefined;
  const close = (restore = false) => {
    setOpen(false);
    if (restore) button.current?.focus();
  };
  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const rect = button.current!.getBoundingClientRect();
      const width = Math.min(260, window.innerWidth - 32);
      const available = window.innerHeight - rect.bottom - 16;
      const above =
        available < Math.min(280, items.length * 40 + 44) &&
        rect.top > available;
      setPosition({
        left: Math.max(
          16,
          Math.min(
            window.innerWidth - width - 16,
            align === "end" ? rect.right - width : rect.left,
          ),
        ),
        top: above ? undefined : rect.bottom + 8,
        bottom: above ? window.innerHeight - rect.top + 8 : undefined,
        maxHeight: above
          ? Math.min(360, rect.top - 24)
          : Math.min(360, Math.max(100, available)),
        origin: above ? "bottom right" : "top right",
      });
    }
    place();
    const outside = (event: PointerEvent) => {
      if (
        !panel.current?.contains(event.target as Node) &&
        !button.current?.contains(event.target as Node)
      )
        close();
    };
    const scroll = (event: Event) => {
      if (panel.current?.contains(event.target as Node)) return;
      const rect = button.current?.getBoundingClientRect();
      if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) close();
      else place();
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", scroll, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", scroll, true);
    };
  }, [open, align, items.length]);
  const positioned = !!position;
  useEffect(() => {
    if (!open || !positioned) return;
    const choices = panel.current?.querySelectorAll<HTMLButtonElement>(
      "button:not(:disabled)",
    );
    (
      Array.from(choices || []).find(
        (node) => node.getAttribute("aria-selected") === "true",
      ) || choices?.[0]
    )?.focus();
  }, [open, positioned]);
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    if (event.key === "Tab") {
      close(true);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const choices = Array.from(
      panel.current?.querySelectorAll<HTMLButtonElement>(
        "button:not(:disabled)",
      ) || [],
    );
    const current = choices.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? choices.length - 1
          : (current + (event.key === "ArrowDown" ? 1 : -1) + choices.length) %
            choices.length;
    choices[next]?.focus();
  }
  return (
    <LayoutGroup id={id}>
      <button
        ref={button}
        type="button"
        className={`one-menu-trigger ${primary ? "is-primary" : ""} ${className}`}
        aria-label={label}
        aria-haspopup={listbox ? "listbox" : "menu"}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {!open && (
          <motion.span
            className="one-trigger-surface"
            layoutId="surface"
            transition={transition}
          />
        )}
        <span className="one-trigger-content">{trigger}</span>
      </button>
      {createPortal(
        <>
          {open && position && (
            <motion.div
              ref={panel}
              id={id}
              key="menu"
              role={listbox ? "listbox" : "menu"}
              aria-label={label}
              onKeyDown={keyboard}
              className="one-menu-panel"
              style={{
                left: position.left,
                top: position.top,
                bottom: position.bottom,
                maxHeight: position.maxHeight,
                transformOrigin: position.origin,
              }}
              layoutId="surface"
              layoutRoot
              transition={transition}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="one-menu-heading">{label}</p>
              {items.map((item, i) => (
                <motion.button
                  key={item.value ?? item.label}
                  type="button"
                  layout="position"
                  role={listbox ? "option" : "menuitem"}
                  aria-selected={listbox ? selected === item.value : undefined}
                  disabled={item.disabled}
                  tabIndex={-1}
                  initial={{ opacity: 0, x: reduced ? 0 : -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: reduced ? 0 : 0.14,
                    delay: reduced ? 0 : Math.min(i, 5) * 0.025,
                  }}
                  onClick={() => {
                    close(true);
                    item.onSelect();
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {listbox && selected === item.value && (
                    <Check size={14} aria-hidden="true" />
                  )}
                </motion.button>
              ))}
            </motion.div>
          )}
        </>,
        document.body,
      )}
    </LayoutGroup>
  );
}
export function FilterPicker({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <MorphMenu
      label={label}
      selected={value}
      className="one-filter"
      trigger={
        <>
          <Filter size={14} />
          <span>
            {options.find((option) => option.value === value)?.label || "All"}
          </span>
          <ChevronDown size={13} />
        </>
      }
      items={options.map((option) => ({
        ...option,
        onSelect: () => onChange(option.value),
      }))}
    />
  );
}
export type SaveState = "idle" | "saving" | "saved" | "error";
export function SaveButton({
  form,
  state,
  label,
  disabled = false,
}: {
  form?: string;
  state: SaveState;
  label: string;
  disabled?: boolean;
}) {
  const reduced = useMotionPreference();
  const text =
    state === "saving"
      ? "Saving…"
      : state === "saved"
        ? "Saved"
        : state === "error"
          ? "Try again"
          : label;
  return (
    <button
      type="submit"
      form={form}
      className="primary-button one-save-button"
      disabled={disabled || state === "saving" || state === "saved"}
      aria-label={text}
      aria-busy={state === "saving"}
    >
      <span className="one-save-icon" aria-hidden="true">
        {state === "saving" || state === "saved" ? (
          <AuthLogo state={state === "saving" ? "loading" : "success"} />
        ) : state === "error" ? (
          <CircleAlert size={15} />
        ) : (
          <Check size={14} />
        )}
      </span>
      <span className="one-save-label">
        {[label, "Saving…", "Saved", "Try again"].map((sizer, index) => (
          <span key={index} aria-hidden="true" className="one-save-size">
            {sizer}
          </span>
        ))}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={text}
            initial={{ opacity: 0, y: reduced ? 0 : 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -5 }}
            transition={{ duration: reduced ? 0 : 0.14 }}
          >
            {text}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );
}
export function InlineTitle({
  value,
  onSave,
  onOpen,
  kind,
  disabled = false,
  onEditingChange,
}: {
  value: string;
  onSave: (value: string) => Promise<unknown>;
  onOpen: () => void;
  kind: string;
  disabled?: boolean;
  onEditingChange?: (editing: boolean) => void;
}) {
  const [editing, setEditing] = useState(false),
    [draft, setDraft] = useState(value),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null),
    pencil = useRef<HTMLButtonElement>(null),
    alive = useRef(true),
    locked = useRef(false),
    restore = useRef(false);
  const reduced = useMotionPreference();
  const transition = reduced ? { duration: 0 } : settle;
  const saveAction = useRef(onSave);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    onEditingChange?.(editing);
    if (editing) {
      input.current?.focus();
      input.current?.select();
    } else if (restore.current) {
      pencil.current?.focus();
      restore.current = false;
    }
  }, [editing, onEditingChange]);
  function cancel() {
    if (pending) return;
    setDraft(value);
    setError("");
    restore.current = true;
    setEditing(false);
  }
  async function save() {
    if (locked.current) return;
    const title = draft.trim();
    if (!title) {
      setError("Enter a title.");
      input.current?.focus();
      return;
    }
    if (title === value) {
      cancel();
      return;
    }
    locked.current = true;
    setPending(true);
    setError("");
    try {
      await saveAction.current(title);
      if (alive.current) {
        restore.current = true;
        setEditing(false);
      }
    } catch (cause) {
      if (alive.current)
        setError(
          cause instanceof Error ? cause.message : "Could not save. Try again.",
        );
    } finally {
      locked.current = false;
      if (alive.current) setPending(false);
    }
  }
  const errorId = useId();
  return (
    <motion.div
      layout="position"
      transition={transition}
      className={`one-inline-title${editing ? " is-editing" : ""}`}
    >
      {editing ? (
        <>
          <motion.div
            layout="position"
            className="one-inline-controls"
            initial={{ opacity: 0, y: reduced ? 0 : 2 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.16 }}
          >
            <input
              ref={input}
              aria-label={`Rename ${kind}`}
              aria-invalid={!!error}
              aria-describedby={error ? errorId : undefined}
              maxLength={200}
              readOnly={pending}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void save();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  cancel();
                }
              }}
            />
            <motion.button
              layoutId={`${errorId}-action`}
              transition={transition}
              type="button"
              aria-label={`Save ${kind} title`}
              disabled={pending}
              onClick={() => void save()}
            >
              {pending ? (
                <span className="one-inline-loader">
                  <AuthLogo state="loading" />
                </span>
              ) : (
                <Check size={15} />
              )}
            </motion.button>
            <button
              type="button"
              aria-label="Cancel rename"
              disabled={pending}
              onClick={cancel}
            >
              <X size={14} />
            </button>
          </motion.div>
          {error && (
            <p className="one-inline-error" role="alert" id={errorId}>
              {error}
            </p>
          )}
        </>
      ) : (
        <>
          <button type="button" className="one-inline-open" onClick={onOpen}>
            <h3>{value}</h3>
          </button>
          <motion.button
            layoutId={`${errorId}-action`}
            transition={transition}
            type="button"
            ref={pencil}
            className="one-rename"
            aria-label={`Rename ${kind}: ${value}`}
            disabled={disabled}
            onClick={() => {
              saveAction.current = onSave;
              setDraft(value);
              setEditing(true);
            }}
          >
            <PencilLine size={13} />
          </motion.button>
        </>
      )}
    </motion.div>
  );
}
const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
export function DayPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (days: number[]) => void;
}) {
  const [open, setOpen] = useState(false),
    id = useId(),
    reduced = useMotionPreference();
  const summary =
    value.length === 7
      ? "Every day"
      : value.length
        ? value.map((day) => weekdays[day - 1].slice(0, 3)).join(", ")
        : "Choose days";
  return (
    <div className="one-day-picker">
      <button
        type="button"
        className="one-day-summary"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <span>
          <span className="field-label">REPEAT</span>
          <strong>{summary}</strong>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: reduced ? 0 : 0.18 }}
        >
          <ChevronDown size={16} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.22 }}
            className="one-day-options"
          >
            <div className="one-day-presets">
              <button
                type="button"
                onClick={() => onChange([1, 2, 3, 4, 5, 6, 7])}
              >
                Every day
              </button>
              <button type="button" onClick={() => onChange([1, 2, 3, 4, 5])}>
                Weekdays
              </button>
              <button type="button" onClick={() => onChange([6, 7])}>
                Weekends
              </button>
            </div>
            <div
              className="weekday-picker"
              role="group"
              aria-label="Repeat days"
            >
              {weekdays.map((day, index) => (
                <motion.button
                  key={day}
                  type="button"
                  aria-label={day}
                  aria-pressed={value.includes(index + 1)}
                  className={value.includes(index + 1) ? "selected" : ""}
                  whileTap={reduced ? undefined : { scale: 0.92 }}
                  onClick={() =>
                    onChange(
                      value.includes(index + 1)
                        ? value.filter((n) => n !== index + 1)
                        : [...value, index + 1].sort((a, b) => a - b),
                    )
                  }
                >
                  {day[0]}
                </motion.button>
              ))}
            </div>
            <p className="one-day-help" role="status">
              {value.length
                ? "Repeats on your selected days."
                : "Choose at least one day."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
