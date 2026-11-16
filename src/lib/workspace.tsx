import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Workspace } from "../domain/model";
import { emptyWorkspace } from "../domain/model";
import { applyCommand } from "../domain/commands";
import type { Command } from "../domain/commands";
import { addDays, dayKey } from "../domain/time";
import { loadWorkspace, sendCommand } from "./api";
import { DEMO_KEY, readDemo } from "./demo";
import { DEFAULT_ZONE } from "./config";
import { supabase } from "./auth";

export type Page =
  | "home"
  | "tasks"
  | "projects"
  | "schedule"
  | "habits"
  | "sleep"
  | "thoughts"
  | "notes"
  | "settings";
export type EditorKind =
  | "task"
  | "project"
  | "block"
  | "habit"
  | "sleep"
  | "thought"
  | "note"
  | "database"
  | "record";
export type Editor = {
  kind: EditorKind;
  id?: string;
  projectId?: string;
  taskId?: string;
  databaseId?: string;
  date?: string;
  startsAt?: string;
  endsAt?: string;
};
type Notice = { message: string; error?: boolean } | null;
interface OneContext {
  data: Workspace;
  busy: boolean;
  loading: boolean;
  error: string | null;
  demo: boolean;
  zone: string;
  setZone: (zone: string) => void;
  today: string;
  now: Date;
  page: Page;
  navigate: (page: Page) => void;
  editor: Editor | null;
  edit: (value: Editor | null) => void;
  execute: (command: Command) => Promise<{ snapshot: Workspace; id?: string }>;
  reload: () => Promise<void>;
  notice: Notice;
  notify: (message: string, error?: boolean) => void;
  session: Session | null;
}
const Context = createContext<OneContext | null>(null);
export function useOne() {
  const value = useContext(Context);
  if (!value) throw new Error("Workspace is missing.");
  return value;
}
const pages: Page[] = [
  "home",
  "tasks",
  "projects",
  "schedule",
  "habits",
  "sleep",
  "thoughts",
  "notes",
  "settings",
];
function currentPage(): Page {
  const path = location.hash.replace("#/", "");
  return pages.includes(path as Page) ? (path as Page) : "home";
}
export function WorkspaceProvider({
  children,
  session,
  demo,
}: {
  children: ReactNode;
  session: Session | null;
  demo: boolean;
}) {
  const [data, setData] = useState<Workspace>(emptyWorkspace);
  const dataRef = useRef(data);
  const [zone, updateZone] = useState(() => {
    try {
      return localStorage.getItem("one-timezone") || DEFAULT_ZONE;
    } catch {
      return DEFAULT_ZONE;
    }
  });
  const [now, setNow] = useState(new Date());
  const [page, setPage] = useState<Page>(currentPage);
  const [editor, edit] = useState<Editor | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const alive = useRef(true);
  const today = dayKey(now, zone);
  const replace = useCallback((value: Workspace) => {
    dataRef.current = value;
    setData(value);
  }, []);
  const notify = useCallback((message: string, isError = false) => {
    setNotice({ message, error: isError });
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(
      () => setNotice(null),
      isError ? 9000 : 3500,
    );
  }, []);
  const token = useCallback(async () => {
    const { data: auth, error: authError } = await supabase.auth.getSession();
    if (authError || !auth.session)
      throw new Error("Your session expired. Please sign in again.");
    return auth.session.access_token;
  }, []);
  const reload = useCallback(async () => {
    if (lock.current) return;
    setLoading(true);
    setError(null);
    try {
      const state = demo ? readDemo(zone) : await loadWorkspace(await token());
      if (alive.current) replace(state);
    } catch (cause) {
      if (alive.current)
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not load your workspace.",
        );
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [demo, zone, token, replace]);
  const execute = useCallback(
    async (command: Command) => {
      if (lock.current)
        throw new Error("Please wait for your previous change to finish.");
      lock.current = true;
      setBusy(true);
      try {
        const result = demo
          ? applyCommand(dataRef.current, command)
          : await sendCommand(await token(), command);
        if (alive.current) replace(result.snapshot);
        if (demo) {
          try {
            localStorage.setItem(DEMO_KEY, JSON.stringify(result.snapshot));
          } catch {
            notify("Demo saved for this visit. Browser storage is full.", true);
          }
        }
        return result;
      } catch (cause) {
        const message =
          cause instanceof Error
            ? cause.message
            : "Could not save this change.";
        notify(message, true);
        throw cause;
      } finally {
        lock.current = false;
        if (alive.current) setBusy(false);
      }
    },
    [demo, token, replace, notify],
  );
  useEffect(() => {
    alive.current = true;
    void reload();
    return () => {
      alive.current = false;
      clearTimeout(noticeTimer.current);
    };
  }, [reload]);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const update = () => {
      setPage(currentPage());
      edit(null);
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  // Materialize only missing habit dates. A failed write is shown and never retried automatically.
  const attemptedRange = useRef("");
  useEffect(() => {
    if (loading || error || !data.habits.length) return;
    const key =
      today +
      ":" +
      zone +
      ":" +
      data.habits.map((h) => h.id + h.updatedAt).join(",");
    if (attemptedRange.current === key) return;
    attemptedRange.current = key;
    void execute({
      type: "occurrences.materialize",
      from: addDays(today, -14),
      to: addDays(today, 7),
    }).catch(() => {});
  }, [loading, error, today, zone, data.habits, execute]);
  function navigate(value: Page) {
    setPage(value);
    edit(null);
    location.hash = "/" + value;
    window.scrollTo({ top: 0 });
  }
  function setZone(value: string) {
    updateZone(value);
    try {
      localStorage.setItem("one-timezone", value);
    } catch {
      /* Visit-only preference. */
    }
  }
  return (
    <Context.Provider
      value={{
        data,
        busy,
        loading,
        error,
        demo,
        zone,
        setZone,
        today,
        now,
        page,
        navigate,
        editor,
        edit,
        execute,
        reload,
        notice,
        notify,
        session,
      }}
    >
      {children}
    </Context.Provider>
  );
}
