import { Component, Suspense, lazy, useState, useEffect } from "react";
import type { ReactNode, ErrorInfo } from "react";
import type { Session } from "@supabase/supabase-js";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckSquare2,
  CalendarDays,
  FolderClosed,
  Repeat2,
  Moon,
  Lightbulb,
  FileText,
  Search,
  Plus,
  ArrowUpRight,
  ChevronRight,
  Check,
  CircleAlert,
  RefreshCw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "./lib/auth";
import { WorkspaceProvider, useOne } from "./lib/workspace";
import type { EditorKind } from "./lib/workspace";
import { Logo, Dialog, Spinner } from "./components/ui";
import { MorphMenu } from "./components/interactions";
import { ChartTooltipScope } from "./components/ChartTooltip";
import { timeBlockTitle } from "./lib/schedule";
import WorkspaceLoading from "./components/WorkspaceLoading";
import { ThemeProvider } from "./lib/theme";
import { ConfirmationProvider } from "./lib/confirmation";
import Dashboard from "./components/Dashboard";
import Navigation, {
  useSidebar,
  navigation,
  SidebarToggle,
} from "./components/Navigation";
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
export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ConfirmationProvider>
          <SessionApp />
        </ConfirmationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
function SessionApp() {
  const [session, setSession] = useState<Session | null>(null),
    [booting, setBooting] = useState(true),
    [demo, setDemo] = useState(false),
    [recovery, setRecovery] = useState(false),
    [authError, setAuthError] = useState(""),
    [authPending, setAuthPending] = useState(false);
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
        if (error)
          setAuthError("Could not restore your session. Please sign in again.");
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
    setAuthError("");
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      setSession(null);
      location.hash = "/";
    } catch {
      setAuthError("Couldn’t sign out. Please try again.");
    }
  }
  if (booting)
    return (
      <div className="boot-screen">
        <Logo size={40} />
        <Spinner />
      </div>
    );
  if ((!session && !demo) || recovery || authPending)
    return (
      <Suspense
        fallback={
          <div className="boot-screen">
            <Spinner />
          </div>
        }
      >
        <Auth
          key={recovery ? "recovery" : "login"}
          onDemo={() => {
            setDemo(true);
            location.hash = "/home";
          }}
          recovery={recovery}
          onRecovered={() => setRecovery(false)}
          onTransitionChange={setAuthPending}
          onAuthenticated={() => {
            setAuthPending(false);
            setAuthError("");
            location.hash = "/home";
          }}
          initialError={authError}
        />
      </Suspense>
    );
  return (
    <WorkspaceProvider
      key={demo ? "demo" : session!.user.id}
      session={session}
      demo={demo}
    >
      <Shell onExit={() => void exit()} accountError={authError} />
    </WorkspaceProvider>
  );
}
function Shell({
  onExit,
  accountError,
}: {
  onExit: () => void;
  accountError?: string;
}) {
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
    notify,
    busy,
  } = useOne();
  useEffect(() => {
    if (accountError) notify(accountError, true);
  }, [accountError, notify]);
  const [search, setSearch] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useSidebar();
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const input =
        e.target instanceof Element
          ? e.target.closest(
              'input,textarea,select,[contenteditable],[role="menu"],[role="listbox"],[aria-haspopup="listbox"]',
            )
          : null;
      const modal = document.querySelector('[aria-modal="true"]');
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key === "k" &&
        !editor &&
        (!modal || search)
      ) {
        e.preventDefault();
        setSearch((s) => !s);
      } else if (
        e.key === "n" &&
        !input &&
        !editor &&
        !search &&
        !modal &&
        !e.metaKey &&
        !e.ctrlKey
      ) {
        e.preventDefault();
        edit({ kind: "task" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editor, edit, search]);
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
    <div
      className="app-shell one-shell"
      data-sidebar={sidebarExpanded ? "expanded" : "collapsed"}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Navigation
        page={page}
        navigate={navigate}
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded((expanded) => !expanded)}
        initial={
          demo ? "Y" : session?.user.email?.slice(0, 1).toUpperCase() || "Y"
        }
        demo={demo}
        onExit={onExit}
      />
      <main className="workspace">
        <div className="workspace-wrap">
          <header className="topbar">
            <div className="topbar-brand">
              <SidebarToggle
                expanded={sidebarExpanded}
                onToggle={() => setSidebarExpanded((expanded) => !expanded)}
              />
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
              <MorphMenu
                label="Create"
                primary
                className="quick-button"
                trigger={
                  <>
                    <Plus size={15} />
                    <span>Create</span>
                  </>
                }
                items={newItems.map(({ kind, label, icon: Icon }) => ({
                  label,
                  icon: <Icon size={15} />,
                  onSelect: () => edit({ kind }),
                }))}
              />
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
            <ChartTooltipScope key={page}>
              {error ? (
                <div className="workspace-error" role="alert">
                  <CircleAlert size={32} strokeWidth={1} />
                  <h1>Your space is still here.</h1>
                  <p>{error}</p>
                  <p className="fine">
                    Refresh to load the latest data before making another
                    change.
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
                <WorkspaceLoading page={page} />
              ) : (
                <Suspense fallback={<WorkspaceLoading page={page} />}>
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
            </ChartTooltipScope>
          </div>
        </div>
      </main>
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
    ...data.timeBlocks.map((block) => ({
      kind: "block" as const,
      id: block.id,
      title: timeBlockTitle(block, data),
      content: block.description,
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
            aria-label={`${result.kind === "block" ? "Time block" : result.kind} ${result.title}`}
            onClick={() => {
              onClose();
              edit({ kind: result.kind, id: result.id });
            }}
          >
            <span className="search-result-kind">
              {result.kind === "block" ? "Time block" : result.kind}
            </span>
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
