import {
  TooltipTrigger,
  Tooltip,
  Button as TooltipButton,
} from "react-aria-components";
// Motion patterns adapted from useLayouts (MIT), see docs/licenses/uselayouts.txt.
import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import {
  House,
  CheckSquare2,
  CalendarDays,
  FolderClosed,
  Repeat2,
  Moon,
  Utensils,
  Lightbulb,
  FileText,
  Tags,
  Settings2,
  ArrowUpRight,
  PanelLeftOpen,
  PanelLeftClose,
  MoreHorizontal,
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Page } from "../lib/workspace";
import { Logo } from "./ui";
import { MorphMenu, useSettle } from "./interactions";
import { useMotionPreference } from "../lib/motion-preference";
import "./navigation.css";

const preferenceKey = "one-sidebar-expanded-v1";
const destinations: { id: Page; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", icon: House },
  { id: "tasks", label: "Tasks", icon: CheckSquare2 },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "projects", label: "Projects", icon: FolderClosed },
  { id: "habits", label: "Habits", icon: Repeat2 },
  { id: "sleep", label: "Sleep", icon: Moon },
  { id: "meals", label: "Meals", icon: Utensils },
  { id: "thoughts", label: "Thoughts", icon: Lightbulb },
  { id: "notes", label: "Notes", icon: FileText },
  { id: "tags", label: "Tags", icon: Tags },
  { id: "settings", label: "Settings", icon: Settings2 },
];
export { destinations as navigation };
const primary = new Set<Page>(["home", "tasks", "schedule", "thoughts"]);

export function useSidebar() {
  const [expanded, setExpanded] = useState(() => {
    try {
      return localStorage.getItem(preferenceKey) === "true";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(preferenceKey, String(expanded));
    } catch {
      /* Private storage is optional. */
    }
  }, [expanded]);
  return [expanded, setExpanded] as const;
}

export function SidebarToggle({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className="one-sidebar-toggle"
      type="button"
      onClick={onToggle}
      aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
      aria-expanded={expanded}
      aria-controls="one-workspace-navigation"
      title={`${expanded ? "Collapse" : "Expand"} sidebar (Ctrl/⌘ B)`}
    >
      {expanded ? (
        <PanelLeftClose size={18} strokeWidth={1.6} />
      ) : (
        <PanelLeftOpen size={18} strokeWidth={1.6} />
      )}
    </button>
  );
}

export default function Navigation({
  page,
  navigate,
  expanded,
  onToggle,
  initial,
  demo,
  onExit,
}: {
  page: Page;
  navigate: (page: Page) => void;
  expanded: boolean;
  onToggle: () => void;
  initial: string;
  demo: boolean;
  onExit: () => void;
}) {
  const id = useId();
  const transition = useSettle();
  const reduced = useMotionPreference();
  const [more, setMore] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  function closeMore(restore = true) {
    setMore(false);
    if (restore) moreRef.current?.focus();
  }
  function selectMobile(next: Page) {
    closeMore(false);
    navigate(next);
    requestAnimationFrame(() =>
      document.getElementById("main-content")?.focus(),
    );
  }
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (
        !(event.ctrlKey || event.metaKey) ||
        event.altKey ||
        event.key.toLowerCase() !== "b" ||
        window.matchMedia("(max-width: 700px)").matches ||
        document.querySelector('[aria-modal="true"]') ||
        (event.target instanceof Element &&
          event.target.closest(
            'input,textarea,select,[contenteditable],[role="menu"],[role="listbox"],[aria-haspopup="listbox"]',
          ))
      )
        return;
      event.preventDefault();
      onToggle();
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [onToggle]);
  useEffect(() => {
    if (!more) return;
    const media = window.matchMedia("(max-width: 700px)");
    const resize = () => {
      if (!media.matches) {
        setMore(false);
        document
          .querySelector<HTMLElement>(`.one-side-link[aria-current="page"]`)
          ?.focus();
      }
    };
    media.addEventListener("change", resize);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dockRef.current
      ?.querySelector<HTMLElement>(".one-mobile-tray button")
      ?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMore(false);
        moreRef.current?.focus();
      }
      if (event.key !== "Tab") return;
      const buttons = [
        ...dockRef.current!.querySelectorAll<HTMLButtonElement>(
          "button:not(:disabled)",
        ),
      ];
      const first = buttons[0],
        last = buttons.at(-1);
      if (
        !dockRef.current?.contains(document.activeElement) ||
        (event.shiftKey && document.activeElement === first)
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = previousOverflow;
      media.removeEventListener("change", resize);
      document.removeEventListener("keydown", key);
    };
  }, [more]);

  function link(item: (typeof destinations)[number]) {
    const Icon = item.icon;
    return (
      <TooltipTrigger
        key={item.id}
        isDisabled={expanded}
        delay={300}
        closeDelay={70}
      >
        <TooltipButton
          type="button"
          className="one-side-link"
          aria-label={item.label}
          aria-current={page === item.id ? "page" : undefined}
          onPress={() => navigate(item.id)}
        >
          {page === item.id && (
            <motion.span
              className="one-nav-selection"
              layoutId="active"
              transition={transition}
            />
          )}
          <span className="one-side-icon">
            <Icon size={19} strokeWidth={1.6} />
          </span>
          <span className="one-side-label" aria-hidden="true">
            {item.label}
          </span>
        </TooltipButton>
        <Tooltip placement="right" offset={12} className="one-nav-tooltip">
          {item.label}
        </Tooltip>
      </TooltipTrigger>
    );
  }
  return (
    <>
      <motion.aside layoutRoot className="one-sidebar" data-expanded={expanded}>
        <button
          className="one-side-brand"
          aria-label="ONE home"
          onClick={() => navigate("home")}
        >
          <span className="one-side-icon">
            <Logo size={31} />
          </span>
          <span className="one-side-label" aria-hidden="true">
            ONE
          </span>
        </button>
        <LayoutGroup id={`${id}-sidebar`}>
          <motion.nav
            layoutScroll
            id="one-workspace-navigation"
            aria-label="Your workspace"
            className="one-side-destinations"
          >
            {destinations.filter((item) => item.id !== "settings").map(link)}
          </motion.nav>
          <div className="one-side-footer">
            {link(destinations.find((item) => item.id === "settings")!)}
            <MorphMenu
              label="Your account settings"
              className="one-side-account"
              align="start"
              trigger={
                <>
                  <span className="one-side-avatar">{initial}</span>
                  <span className="one-side-label">
                    {demo ? "Demo workspace" : "Your account"}
                  </span>
                </>
              }
              items={[
                {
                  label: "Account settings",
                  icon: <Settings2 size={15} />,
                  onSelect: () => navigate("settings"),
                },
                {
                  label: demo ? "Leave demo" : "Sign out",
                  icon: <ArrowUpRight size={15} />,
                  onSelect: onExit,
                },
              ]}
            />
          </div>
        </LayoutGroup>
      </motion.aside>
      <AnimatePresence>
        {more && (
          <motion.div
            className="one-nav-shade"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.18 }}
            onClick={() => closeMore()}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
      <div
        ref={dockRef}
        className="one-mobile-dock"
        role={more ? "dialog" : undefined}
        aria-modal={more || undefined}
        aria-label={more ? "More destinations" : undefined}
      >
        <AnimatePresence initial={false}>
          {more && (
            <motion.div
              id={`${id}-more`}
              className="one-mobile-tray"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={
                reduced
                  ? { duration: 0 }
                  : { duration: 0.26, ease: [0.22, 1, 0.36, 1] }
              }
            >
              <div className="one-mobile-tray-inner">
                <span className="one-mobile-tray-label">Your workspace</span>
                <div>
                  {destinations
                    .filter((item) => !primary.has(item.id))
                    .map(({ id, label, icon: Icon }) => (
                      <button
                        type="button"
                        key={id}
                        aria-current={page === id ? "page" : undefined}
                        onClick={() => selectMobile(id)}
                      >
                        <Icon size={20} strokeWidth={1.6} />
                        <span>{label}</span>
                      </button>
                    ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <LayoutGroup id={`${id}-mobile`}>
          <nav className="one-mobile-bar" aria-label="Mobile workspace">
            {destinations
              .filter((item) => primary.has(item.id))
              .map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-current={page === id ? "page" : undefined}
                  onClick={() => selectMobile(id)}
                >
                  {page === id && (
                    <motion.span
                      className="one-nav-selection"
                      layoutId="active"
                      transition={transition}
                    />
                  )}
                  <Icon size={20} strokeWidth={1.6} />
                  <span>{label}</span>
                </button>
              ))}
            <button
              ref={moreRef}
              type="button"
              aria-expanded={more}
              aria-controls={`${id}-more`}
              aria-label={
                more ? "Close more destinations" : "More destinations"
              }
              onClick={() => setMore((open) => !open)}
            >
              {!primary.has(page) && (
                <motion.span
                  className="one-nav-selection"
                  layoutId="active"
                  transition={transition}
                />
              )}
              <span className="one-mobile-more-icon">
                {more ? (
                  <ChevronDown size={20} />
                ) : (
                  <MoreHorizontal size={20} />
                )}
              </span>
              <span>{more ? "Close" : "More"}</span>
            </button>
          </nav>
        </LayoutGroup>
      </div>
    </>
  );
}
