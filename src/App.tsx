import { Component, Suspense, lazy, useState, useEffect, useRef } from "react";
import type { ReactNode, ErrorInfo } from "react";
import type { Session } from "@supabase/supabase-js";
import { AnimatePresence, motion } from "motion/react";
import {
  House,
  CheckSquare2,
  CalendarDays,
  FolderClosed,
  Repeat2,
  Moon,
  Lightbulb,
  FileText,
  Settings2,
  Search,
  Plus,
  ArrowUpRight,
  ChevronRight,
  MoreHorizontal,
  Check,
  CircleAlert,
  RefreshCw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "./lib/auth";
import { WorkspaceProvider, useOne } from "./lib/workspace";
import type { Page, EditorKind } from "./lib/workspace";
import { Logo, Dialog, Spinner } from "./components/ui";
import Dashboard from "./components/Dashboard";
const Auth = lazy(() => import("./components/Auth"));
const Editor = lazy(() => import("./components/Editor"));
const Settings = lazy(() => import("./components/Settings"));
const Tasks = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.TasksPage })),
);
const Projects = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.ProjectsPage })),
);
const Schedule = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.SchedulePage })),
);
const Habits = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.HabitsPage })),
);
const Sleep = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.SleepPage })),
);
const Thoughts = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.ThoughtsPage })),
);
const Notes = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.NotesPage })),
);
const navigation: { id: Page; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", icon: House },
  { id: "tasks", label: "Tasks", icon: CheckSquare2 },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "projects", label: "Projects", icon: FolderClosed },
  { id: "habits", label: "Habits", icon: Repeat2 },
  { id: "sleep", label: "Sleep", icon: Moon },
  { id: "thoughts", label: "Thoughts", icon: Lightbulb },
  { id: "notes", label: "Notes", icon: FileText },
];
export default function App() {
  return (
    <ErrorBoundary>
      <SessionApp />
    </ErrorBoundary>
  );
}
function SessionApp() {
  const [session, setSession] = useState<Session | null>(null),
    [booting, setBooting] = useState(true),
    [demo, setDemo] = useState(false),
    [recovery, setRecovery] = useState(false),
    [authError, setAuthError] = useState("");
  useEffect(() => {
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      setSession(next);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      setBooting(false);
    });
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setAuthError(error.message);
        setSession(data.session);
        setBooting(false);
      })
      .catch(() => {
        if (active) {
          setAuthError("Could not restore your session. Please sign in again.");
          setBooting(false);
        }
      });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  async function exit() {
    if (demo) {
      setDemo(false);
      location.hash = "/";
      return;
    }
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      setAuthError(error.message);
      return;
    }
    setSession(null);
    location.hash = "/";
  }
  if (booting)
    return (
      <div className="boot-screen">
        <Logo size={40} />
        <Spinner />
      </div>
    );
  if ((!session && !demo) || recovery)
    return (
      <Suspense
        fallback={
          <div className="boot-screen">
            <Spinner />
          </div>
        }
      >
        <Auth
          onDemo={() => {
            setDemo(true);
            location.hash = "/home";
          }}
          recovery={recovery}
          onRecovered={() => setRecovery(false)}
        />
        {authError && (
          <p className="auth-restore-error" role="alert">
            {authError}
          </p>
        )}
      </Suspense>
    );
  return (
    <WorkspaceProvider
      key={demo ? "demo" : session!.user.id}
      session={session}
      demo={demo}
    >
      <Shell onExit={() => void exit()} />
    </WorkspaceProvider>
  );
}
function Shell({ onExit }: { onExit: () => void }) {
  const {
    page,
    navigate,
    loading,
    error,
    reload,
    demo,
    session,
    editor,
    edit,
    notice,
    busy,
  } = useOne();
  const [search, setSearch] = useState(false),
    [quick, setQuick] = useState(false),
    [more, setMore] = useState(false);
  const quickRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const input = (e.target as HTMLElement).closest(
        "input,textarea,select,[contenteditable]",
      );
      if ((e.metaKey || e.ctrlKey) && e.key === "k" && !editor) {
        e.preventDefault();
        setSearch((s) => !s);
      } else if (
        e.key === "n" &&
        !input &&
        !editor &&
        !search &&
        !e.metaKey &&
        !e.ctrlKey
      ) {
        e.preventDefault();
        edit({ kind: "task" });
      }
      if (e.key === "Escape") setQuick(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editor, edit, search]);
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!quickRef.current?.contains(e.target as Node)) setQuick(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const newItems: { kind: EditorKind; label: string; icon: LucideIcon }[] = [
    { kind: "task", label: "A task", icon: CheckSquare2 },
    { kind: "project", label: "A project", icon: FolderClosed },
    { kind: "block", label: "A little time", icon: CalendarDays },
    { kind: "habit", label: "A habit", icon: Repeat2 },
    { kind: "sleep", label: "A night of rest", icon: Moon },
    { kind: "thought", label: "A thought", icon: Lightbulb },
    { kind: "note", label: "A note", icon: FileText },
  ];
  const pageContent =
    page === "home" ? (
      <Dashboard />
    ) : page === "tasks" ? (
      <Tasks />
    ) : page === "projects" ? (
      <Projects />
    ) : page === "schedule" ? (
      <Schedule />
    ) : page === "habits" ? (
      <Habits />
    ) : page === "sleep" ? (
      <Sleep />
    ) : page === "thoughts" ? (
      <Thoughts />
    ) : page === "notes" ? (
      <Notes />
    ) : (
      <Settings onExit={onExit} />
    );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="nav-rail">
        <button
          className="rail-brand"
          onClick={() => navigate("home")}
          aria-label="ONE home"
        >
          <Logo size={32} />
        </button>
        <nav aria-label="Your workspace">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={"rail-link " + (page === id ? "active" : "")}
              aria-label={label}
              title={label}
              aria-current={page === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={19} strokeWidth={1.6} />
              <span className="rail-tooltip">{label}</span>
            </button>
          ))}
        </nav>
        <div className="rail-bottom">
          <button
            className={"rail-link " + (page === "settings" ? "active" : "")}
            aria-label="Settings"
            title="Settings"
            onClick={() => navigate("settings")}
          >
            <Settings2 size={19} strokeWidth={1.5} />
            <span className="rail-tooltip">Settings</span>
          </button>
          <button
            className="avatar"
            aria-label="Your account settings"
            onClick={() => navigate("settings")}
          >
            {demo ? "Y" : session?.user.email?.slice(0, 1).toUpperCase() || "Y"}
          </button>
        </div>
      </aside>
      <main className="workspace">
        <div className="workspace-wrap">
          <header className="topbar">
            <div className="topbar-brand">
              <span className="brand-word">ONE</span>
              <span className="topbar-divider" />
              <span className="workspace-label">Personal workspace</span>
              <ChevronRight size={12} />
              <span className="breadcrumb-current">
                {page === "home"
                  ? "Overview"
                  : page.charAt(0).toUpperCase() + page.slice(1)}
              </span>
            </div>
            <div className="topbar-actions">
              <span className={"connection-chip " + (demo ? "demo" : "")}>
                <i className="live-dot" />
                {demo
                  ? "Demo workspace"
                  : busy
                    ? "Saving…"
                    : loading
                      ? "Connecting…"
                      : error
                        ? "Connection issue"
                        : "Your space, synced"}
              </span>
              <button
                className="search-button"
                aria-label="Search workspace"
                onClick={() => setSearch(true)}
              >
                <Search size={15} />
                <span>Search anything</span>
                <kbd>⌘ K</kbd>
              </button>
              <div className="quick-create" ref={quickRef}>
                <button
                  className="primary-button quick-button"
                  onClick={() => setQuick(!quick)}
                  aria-expanded={quick}
                >
                  <Plus size={15} />
                  <span>Create</span>
                </button>
                {quick && (
                  <div className="quick-menu">
                    {newItems.map(({ kind, label, icon: Icon }) => (
                      <button
                        key={kind}
                        onClick={() => {
                          edit({ kind });
                          setQuick(false);
                        }}
                      >
                        <Icon size={15} />
                        {label}
                        <Plus size={12} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </header>
          {demo && (
            <div className="demo-banner">
              <span>You’re exploring ONE. Make yourself at home.</span>
              <button onClick={onExit}>
                Make this space yours
                <ArrowUpRight size={12} />
              </button>
            </div>
          )}
          <div id="main-content" tabIndex={-1}>
            {error ? (
              <div className="workspace-error" role="alert">
                <CircleAlert size={32} strokeWidth={1} />
                <h1>Your space is still here.</h1>
                <p>{error}</p>
                <p className="fine">
                  Refresh to load the latest data before making another change.
                </p>
                <button
                  className="primary-button"
                  onClick={() => void reload()}
                >
                  <RefreshCw size={14} />
                  Try again
                </button>
                <button className="text-button" onClick={onExit}>
                  Back to sign in
                </button>
              </div>
            ) : loading ? (
              <LoadingWorkspace />
            ) : (
              <Suspense fallback={<LoadingWorkspace />}>
                <motion.div
                  key={page}
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24 }}
                >
                  {pageContent}
                </motion.div>
              </Suspense>
            )}
          </div>
        </div>
      </main>
      <nav className="mobile-nav" aria-label="Mobile workspace">
        {navigation
          .filter((n) =>
            ["home", "tasks", "schedule", "thoughts"].includes(n.id),
          )
          .map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={page === id ? "active" : ""}
              aria-current={page === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={20} strokeWidth={1.6} />
              <span>{label}</span>
            </button>
          ))}
        <button
          onClick={() => setMore(true)}
          className={
            !["home", "tasks", "schedule", "thoughts"].includes(page)
              ? "active"
              : ""
          }
        >
          <MoreHorizontal size={20} />
          <span>More</span>
        </button>
      </nav>
      <AnimatePresence>
        {notice && (
          <motion.div
            key={notice.message}
            role={notice.error ? "alert" : "status"}
            className={"toast " + (notice.error ? "error" : "")}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            {notice.error ? <CircleAlert size={16} /> : <Check size={16} />}
            <span>{notice.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
      {editor && (
        <Suspense
          fallback={
            <div className="dialog-shade">
              <Spinner />
            </div>
          }
        >
          <Editor key={editor.kind + ":" + (editor.id || "new")} />
        </Suspense>
      )}
      {search && <SearchDialog onClose={() => setSearch(false)} />}
      {more && (
        <Dialog title="A LITTLE MORE SPACE" onClose={() => setMore(false)}>
          <div className="more-navigation">
            {[
              ...navigation,
              { id: "settings" as const, label: "Settings", icon: Settings2 },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setMore(false);
                  navigate(id);
                }}
              >
                <Icon size={19} />
                {label}
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
        </Dialog>
      )}
    </div>
  );
}
function SearchDialog({ onClose }: { onClose: () => void }) {
  const { data, edit, navigate } = useOne();
  const [query, setQuery] = useState("");
  const entries = [
    ...data.tasks.map((t) => ({
      kind: "task" as const,
      id: t.id,
      title: t.title,
      content: t.description,
    })),
    ...data.projects.map((p) => ({
      kind: "project" as const,
      id: p.id,
      title: p.title,
      content: p.description,
    })),
    ...data.notes.map((n) => ({
      kind: "note" as const,
      id: n.id,
      title: n.title,
      content: n.content,
    })),
    ...data.thoughts.map((t) => ({
      kind: "thought" as const,
      id: t.id,
      title: t.title || t.content,
      content: t.content,
    })),
    ...data.habits.map((h) => ({
      kind: "habit" as const,
      id: h.id,
      title: h.title,
      content: h.description,
    })),
  ];
  const results = entries
    .filter((e) =>
      (e.title + " " + e.content).toLowerCase().includes(query.toLowerCase()),
    )
    .slice(0, 15);
  return (
    <Dialog title="FIND A LITTLE CLARITY" onClose={onClose}>
      <div className="global-search-input">
        <Search size={19} />
        <input
          aria-label="Search your workspace"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What are you looking for?"
        />
      </div>
      <div className="search-results">
        {results.map((result) => (
          <button
            key={result.kind + result.id}
            onClick={() => {
              onClose();
              edit({ kind: result.kind, id: result.id });
            }}
          >
            <span className="search-result-kind">{result.kind}</span>
            <strong>{result.title}</strong>
            <ArrowUpRight size={14} />
          </button>
        ))}
        {!results.length && <p>No little things found. Try another word.</p>}
      </div>
      <div className="search-quick-nav">
        {navigation.slice(0, 4).map((n) => (
          <button
            key={n.id}
            onClick={() => {
              onClose();
              navigate(n.id);
            }}
          >
            {n.label}
            <ChevronRight size={12} />
          </button>
        ))}
      </div>
    </Dialog>
  );
}
function LoadingWorkspace() {
  return (
    <div
      className="loading-workspace"
      role="status"
      aria-label="Loading your workspace"
    >
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-subtitle" />
      <div className="loading-grid">
        {Array.from({ length: 6 }, (_, i) => (
          <div className="skeleton" key={i} />
        ))}
      </div>
    </div>
  );
}
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    /* Never log account data. */
  }
  render() {
    return this.state.error ? (
      <main className="boot-screen">
        <Logo size={45} />
        <h1>A little pause.</h1>
        <p>ONE couldn’t display this page. Your saved workspace is safe.</p>
        <button className="primary-button" onClick={() => location.reload()}>
          Reload ONE
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
