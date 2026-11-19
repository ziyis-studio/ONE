import { readActivities, storeActivities, mergeLogs } from "./activity";
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
import type { Command } from "../domain/commands";
import { addDays, dayKey } from "../domain/time";
import { api, loadWorkspace, sendCommand } from "./api";
import { DEMO_KEY, readDemo } from "./demo";
import { DEFAULT_ZONE } from "./config";
import { supabase } from "./auth";
import { ViewStateProvider } from "./view-state";
import { PomodoroProvider } from "./pomodoro-context";
import type { PomodoroRecord } from "./pomodoro";
import type { Backup, RecoveryEntry } from "../domain/recovery";
import { readTrash, writeTrash } from "./recovery-store";

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
  returnProjectId?: string;
  kind: EditorKind;
  id?: string;
  projectId?: string;
  taskId?: string;
  databaseId?: string;
  date?: string;
  startsAt?: string;
  endsAt?: string;
  initialStage?: "todo" | "progress" | "hold" | "done";
};
type NoticeAction = { label: string; run: () => void };
type Notice = {
  message: string;
  error?: boolean;
  action?: NoticeAction;
} | null;
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
  notify: (message: string, error?: boolean, action?: NoticeAction) => void;
  scope: string;
  listRecovery: (offset?: number) => Promise<RecoveryEntry[]>;
  restoreRecovery: (id: string) => Promise<void>;
  purgeRecovery: (id: string) => Promise<void>;
  exportBackup: () => Promise<Backup>;
  importBackup: (
    raw: unknown,
    asCopy?: boolean,
  ) => Promise<Record<string, string>>;
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
  const scope = demo ? "demo" : session!.user.id;
  const replace = useCallback((value: Workspace) => {
    dataRef.current = value;
    setData(value);
  }, []);
  const notify = useCallback(
    (message: string, isError = false, action?: NoticeAction) => {
      setNotice({ message, error: isError, action });
      clearTimeout(noticeTimer.current);
      noticeTimer.current = setTimeout(
        () => setNotice(null),
        action ? 12000 : isError ? 9000 : 3500,
      );
    },
    [],
  );
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
      const state = demo
        ? await readDemo(zone)
        : await loadWorkspace(await token());
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
  const wantedBlocks = useRef(new Set<string>());
  const [blockRefresh, setBlockRefresh] = useState(0);
  const syncPomodoroBlocks = useCallback((ids: string[]) => {
    const missing = ids.filter(
      (id) => !dataRef.current.timeBlocks.some((block) => block.id === id),
    );
    if (!missing.length) return;
    missing.forEach((id) => wantedBlocks.current.add(id));
    setBlockRefresh((value) => value + 1);
  }, []);
  useEffect(() => {
    if (
      demo ||
      !blockRefresh ||
      busy ||
      loading ||
      error ||
      !wantedBlocks.current.size
    )
      return;
    if (
      [...wantedBlocks.current].every((id) =>
        dataRef.current.timeBlocks.some((block) => block.id === id),
      )
    ) {
      wantedBlocks.current.clear();
      return;
    }
    let current = true;
    const before = dataRef.current;
    void (async () => {
      try {
        const snapshot = await loadWorkspace(await token());
        if (
          current &&
          alive.current &&
          !lock.current &&
          dataRef.current === before
        ) {
          replace(snapshot);
          wantedBlocks.current.clear();
        }
      } catch {
        /* The next reconnect/foreground sync retries without hiding the workspace. */
      }
    })();
    return () => {
      current = false;
    };
  }, [demo, blockRefresh, busy, loading, error, token, replace]);
  const saveDemoPomodoro = useCallback(
    async (records: PomodoroRecord[]) => {
      if (!demo || lock.current) return false;
      lock.current = true;
      try {
        const { snapshot } = await api<{ snapshot: Workspace }>(
          "/v1/sample/sessions",
          "",
          {
            method: "POST",
            body: JSON.stringify({
              workspace: dataRef.current,
              timezone: zone,
              records: records.map((r) => ({
                id: r.id,
                mode: r.mode,
                startedAt: r.startedAt,
                completedAt: r.completedAt,
                durationSeconds: r.durationSeconds,
                taskId: r.taskId || null,
                taskTitle: r.taskTitle || "",
              })),
            }),
          },
        );
        if (alive.current) {
          replace(snapshot);
          localStorage.setItem(DEMO_KEY, JSON.stringify(snapshot));
        }
        return true;
      } catch {
        notify("Could not record this sample focus. Reconnect to retry.", true);
        return false;
      } finally {
        lock.current = false;
      }
    },
    [demo, zone, replace, notify],
  );
  const persist = useCallback(
    (snapshot: Workspace) => {
      if (demo) localStorage.setItem(DEMO_KEY, JSON.stringify(snapshot));
      if (alive.current) replace(snapshot);
    },
    [demo, replace],
  );
  const withRecoveryLock = useCallback(
    async <T,>(run: () => Promise<T>): Promise<T> => {
      if (lock.current)
        throw new Error("Please wait for your previous change to finish.");
      lock.current = true;
      setBusy(true);
      try {
        return await run();
      } finally {
        lock.current = false;
        if (alive.current) setBusy(false);
      }
    },
    [],
  );
  const listRecovery = useCallback(
    async (offset = 0) =>
      demo
        ? readTrash(scope)
            .filter((e) => !e.restoredAt)
            .slice(offset, offset + 50)
        : api<RecoveryEntry[]>("/v1/recovery?offset=" + offset, await token()),
    [demo, scope, token],
  );
  const restoreRecovery = useCallback(
    async (id: string) =>
      withRecoveryLock(async () => {
        if (demo) {
          const entries = readTrash(scope),
            entry = entries.find((e) => e.id === id);
          if (!entry) throw new Error("This item is no longer in Trash.");
          if (!entry.restoredAt) {
            const { snapshot } = await api<{ snapshot: Workspace }>(
              "/v1/sample/restore",
              "",
              {
                method: "POST",
                body: JSON.stringify({
                  workspace: dataRef.current,
                  patch: entry.patch,
                }),
              },
            );
            persist(snapshot);
            writeTrash(
              scope,
              entries.map((e) =>
                e.id === id
                  ? { ...e, restoredAt: new Date().toISOString() }
                  : e,
              ),
            );
          }
        } else {
          const result = await api<{ snapshot: Workspace }>(
            "/v1/recovery/" + id + "/restore",
            await token(),
            { method: "POST" },
          );
          persist(result.snapshot);
        }
        notify("Restored from Trash.");
      }),
    [demo, scope, token, persist, notify, withRecoveryLock],
  );
  const purgeRecovery = useCallback(
    async (id: string) =>
      withRecoveryLock(async () => {
        if (demo)
          writeTrash(
            scope,
            readTrash(scope).filter((e) => e.id !== id),
          );
        else
          await api("/v1/recovery/" + id, await token(), { method: "DELETE" });
      }),
    [demo, scope, token, withRecoveryLock],
  );
  const exportBackup = useCallback(async (): Promise<Backup> => {
    if (!demo) return api<Backup>("/v1/backup", await token());
    return {
      app: "ONE",
      version: 2,
      id: crypto.randomUUID(),
      ownerId: scope,
      exportedAt: new Date().toISOString(),
      workspace: dataRef.current,
      sessions: [],
      activity: readActivities(scope),
      trash: readTrash(scope),
    };
  }, [demo, scope, token]);
  const importBackup = useCallback(
    async (raw: unknown, asCopy = false) =>
      withRecoveryLock(async () => {
        if (demo) {
          const { snapshot, backup, idMap } = await api<{
            snapshot: Workspace;
            backup: Backup;
            idMap: Record<string, string>;
          }>("/v1/sample/import", "", {
            method: "POST",
            body: JSON.stringify({
              workspace: dataRef.current,
              backup: raw,
              asCopy,
            }),
          });
          const entries = readTrash(scope);
          const known = new Set(entries.map((e) => e.id));
          persist(snapshot);
          writeTrash(scope, [
            ...entries,
            ...backup.trash.filter((e) => !known.has(e.id)),
          ]);
          storeActivities(
            scope,
            mergeLogs(readActivities(scope), backup.activity || []),
          );
          return idMap;
        }
        const result = await api<{
          snapshot: Workspace;
          idMap: Record<string, string>;
        }>("/v1/backup", await token(), {
          method: "POST",
          body: JSON.stringify({ backup: raw, asCopy }),
        });
        persist(result.snapshot);
        return result.idMap;
      }),
    [demo, scope, token, persist, withRecoveryLock],
  );
  const execute = useCallback(
    async (command: Command) => {
      if (lock.current)
        throw new Error("Please wait for your previous change to finish.");
      lock.current = true;
      setBusy(true);
      try {
        const before = dataRef.current;
        const result = demo
          ? await api<{
              snapshot: Workspace;
              id?: string;
              patch?: RecoveryEntry["patch"];
            }>("/v1/sample", "", {
              method: "POST",
              body: JSON.stringify({ workspace: before, command }),
            })
          : await sendCommand(await token(), command);
        let recoveryId =
          "recoveryId" in result
            ? (result.recoveryId as string | undefined)
            : undefined;
        if (demo && command.type.endsWith(".delete")) {
          const patch = "patch" in result ? result.patch : null;
          if (
            patch &&
            (Object.keys(patch.removed).length || patch.changed.length)
          ) {
            recoveryId = crypto.randomUUID();
            const id = "id" in command ? command.id : undefined;
            const root = Object.values(before)
              .flat()
              .find((r: any) => r?.id === id) as any;
            writeTrash(scope, [
              {
                id: recoveryId,
                kind: command.type.split(".")[0],
                title: root?.title || root?.description || "Deleted item",
                deletedAt: new Date().toISOString(),
                restoredAt: null,
                patch,
              },
              ...readTrash(scope),
            ]);
          }
        }
        if (alive.current) replace(result.snapshot);
        if (recoveryId) {
          const id = recoveryId;
          notify("Moved to Trash.", false, {
            label: "Undo",
            run: () => {
              void restoreRecovery(id).catch((e) => notify(e.message, true));
            },
          });
        }
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
    [demo, scope, token, replace, notify, restoreRecovery],
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
        scope,
        listRecovery,
        restoreRecovery,
        purgeRecovery,
        exportBackup,
        importBackup,
      }}
    >
      <ViewStateProvider>
        <PomodoroProvider
          scope={demo ? "demo" : session!.user.id}
          cloud={!demo}
          zone={zone}
          today={today}
          notify={notify}
          onDemoRecords={!loading && !busy ? saveDemoPomodoro : undefined}
          onSyncedBlocks={syncPomodoroBlocks}
        >
          {children}
        </PomodoroProvider>
      </ViewStateProvider>
    </Context.Provider>
  );
}
