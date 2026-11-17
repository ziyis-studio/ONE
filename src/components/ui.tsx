import { useEffect, useRef, useId } from "react";
import type { ReactNode } from "react";
import {
  X,
  Plus,
  ArrowUpRight,
  Check,
  Folder,
  BookOpen,
  Heart,
  Leaf,
  Sparkles,
  Code,
  Palette,
  Plane,
  GraduationCap,
  Briefcase,
  Home,
  Dumbbell,
  Repeat2,
  Droplets,
  Moon,
  Sun,
  Footprints,
  Coffee,
  NotebookPen,
  Music,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { useSettle } from "./interactions";
import { useConfirm, DISCARD_CHANGES } from "../lib/confirmation";
import { ONE_SEGMENTS } from "../lib/brand-mark";
import { AuthLogo } from "./AuthLogo";
import { usePopupExit } from "../lib/popup-exit";

export const iconMap: Record<string, LucideIcon> = {
  folder: Folder,
  book: BookOpen,
  heart: Heart,
  leaf: Leaf,
  sparkles: Sparkles,
  code: Code,
  palette: Palette,
  plane: Plane,
  graduation: GraduationCap,
  briefcase: Briefcase,
  home: Home,
  fitness: Dumbbell,
  repeat: Repeat2,
  water: Droplets,
  moon: Moon,
  sun: Sun,
  walk: Footprints,
  coffee: Coffee,
  journal: NotebookPen,
  music: Music,
};
export function EntityIcon({
  name,
  size = 18,
}: {
  name?: string | null;
  size?: number;
}) {
  const Icon = iconMap[name || "folder"] || Folder;
  return <Icon size={size} strokeWidth={1.6} />;
}
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className="logo"
      fill="none"
      strokeWidth="8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {ONE_SEGMENTS.map((segment) => (
        <path
          key={segment.letter}
          d={segment.d}
          stroke="currentColor"
          className={segment.name === "short" ? "one-logo-accent" : undefined}
        />
      ))}
    </svg>
  );
}
export function IconButton({
  label,
  children,
  onClick,
  className = "",
  disabled = false,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={"icon-button " + className}
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
export function CheckButton({
  checked,
  label,
  onClick,
  disabled = false,
  circle = false,
}: {
  checked: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  circle?: boolean;
}) {
  return (
    <button
      type="button"
      className={
        "check-button " + (checked ? "checked " : "") + (circle ? "circle" : "")
      }
      aria-label={label}
      aria-pressed={checked}
      onClick={onClick}
      disabled={disabled}
    >
      {checked && <Check size={12} strokeWidth={2.5} />}
    </button>
  );
}
export function Card({
  title,
  children,
  action,
  meta,
  className = "",
}: {
  title: string;
  children: ReactNode;
  action?: () => void;
  meta?: ReactNode;
  className?: string;
}) {
  const transition = useSettle();
  return (
    <motion.section
      layout="position"
      transition={transition}
      className={"card " + className}
    >
      <div className="card-heading">
        <h2>{title}</h2>
        <div className="card-actions">
          {meta}
          {action && (
            <IconButton label={"Open " + title.toLowerCase()} onClick={action}>
              <ArrowUpRight size={16} />
            </IconButton>
          )}
        </div>
      </div>
      {children}
    </motion.section>
  );
}
export function Empty({
  title,
  detail,
  action,
  label = "Create your first one",
}: {
  title: string;
  detail?: string;
  action?: () => void;
  label?: string;
}) {
  return (
    <div className="empty">
      <div className="empty-copy">
        <h3>{title}</h3>
        {detail && <p>{detail}</p>}
      </div>
      {action && (
        <button className="empty-action" onClick={action}>
          <Plus size={14} />
          {label}
        </button>
      )}
    </div>
  );
}
export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <span
      className="one-loading-mark"
      role="status"
      aria-label="Loading"
      style={{ width: size, height: size }}
    >
      <AuthLogo state="loading" />
    </span>
  );
}
export function Dialog({
  title,
  children,
  onClose,
  wide = false,
  dirty = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  dirty?: boolean;
}) {
  const confirm = useConfirm();
  const shade = useRef<HTMLDivElement>(null);
  usePopupExit(shade, "dialog");
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  async function dismiss() {
    if (
      (!dirtyRef.current || (await confirm(DISCARD_CHANGES))) &&
      ref.current?.isConnected
    )
      closeRef.current();
  }
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    (
      ref.current?.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([tabindex="-1"]), textarea, select:not([tabindex="-1"]), [contenteditable="true"][tabindex="0"]',
      ) || ref.current?.querySelector<HTMLElement>("button")
    )?.focus();
    const key = (event: KeyboardEvent) => {
      // An owned popup handles Escape and focus before its parent editor.
      if (
        event.defaultPrevented ||
        document.querySelector("[data-one-confirm]") ||
        [...document.querySelectorAll("[data-one-dialog-owner]")].some(
          (popup) => popup.getAttribute("data-one-dialog-owner") === titleId,
        )
      )
        return;
      if (event.key === "Escape") {
        event.preventDefault();
        void dismiss();
      }
      if (event.key !== "Tab") return;
      const focusables = Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled):not([type="hidden"]):not([tabindex="-1"]), textarea:not(:disabled), select:not(:disabled):not([tabindex="-1"]), a[href], [contenteditable="true"][tabindex="0"]',
        ) || [],
      );
      const first = focusables[0],
        last = focusables.at(-1);
      if (!ref.current?.contains(document.activeElement)) {
        event.preventDefault();
        first?.focus();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="dialog-shade"
      ref={shade}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        className={"dialog " + (wide ? "wide" : "")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-one-dialog={titleId}
        ref={ref}
      >
        <header>
          <span className="eyebrow" id={titleId}>
            {title}
          </span>
          <IconButton label="Close dialog" onClick={dismiss}>
            <X size={18} />
          </IconButton>
        </header>
        {children}
      </motion.div>
    </div>
  );
}
