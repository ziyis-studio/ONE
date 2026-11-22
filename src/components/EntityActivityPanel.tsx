import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  MessageSquare,
  Send,
  FileText,
  RefreshCw,
  X,
  CalendarClock,
} from "lucide-react";
import { useOne } from "../lib/workspace";
import { api } from "../lib/api";
import LinkedTimeBlocks from "./LinkedTimeBlocks";
import type { ActivityPage, LinkedActivityBlock } from "../domain/activity";
import type { ActivityLog } from "../domain/activity";
import type { NoteTarget } from "../domain/model";
import {
  readActivities,
  storeActivities,
  readLogDrafts,
  saveLogDraft,
  clearLogDraft,
  mergeLogs,
} from "../lib/activity";
import type { LogKind } from "../lib/activity";
import { dateLabel, dayKey, timeKey } from "../domain/time";
import { useMotionPreference } from "../lib/motion-preference";
import { IconButton, Spinner } from "./ui";
import { SelectField } from "./SelectField";
import "./entity-activity.css";
export type ActivityHandle = { flush: () => boolean };
type Page = ActivityPage;
export default forwardRef<
  ActivityHandle,
  {
    kind: LogKind;
    id?: string;
    onOpen: (target: { kind: "task" | "note" | "block"; id: string }) => void;
    onSchedule?: () => void;
  }
>(function EntityActivityPanel({ kind, id, onOpen, onSchedule }, ref) {
  const { data, demo, scope, session, zone, busy, execute } = useOne(),
    reduced = useMotionPreference();
  const [items, setItems] = useState<ActivityLog[]>([]),
    [next, setNext] = useState<Page["next"]>(null),
    [loading, setLoading] = useState(!!id),
    [posting, setPosting] = useState(false),
    [error, setError] = useState("");
  const [linkedBlocks, setLinkedBlocks] = useState<LinkedActivityBlock[]>([]);
  const [notesError, setNotesError] = useState("");
  const [tab, setTab] = useState<"log" | "notes">("log");
  const activityId = useId();
  const [loadFailed, setLoadFailed] = useState(false);
  const [draft, setDraft] = useState(() => {
    const old = id
      ? readLogDrafts(scope).find((d) => d.kind === kind && d.targetId === id)
      : undefined;
    return {
      entryId: old?.entryId || crypto.randomUUID(),
      body: old?.body || "",
    };
  });
  const latest = useRef(draft);
  latest.current = draft;
  const alive = useRef(true),
    request = useRef(0),
    postingLock = useRef(false),
    feed = useRef<HTMLDivElement>(null),
    scrollToEnd = useRef(false);
  const notes = data.notes.filter((note) =>
    data.noteLinks.some(
      (link) =>
        link.noteId === note.id &&
        (kind === "task" ? link.taskId === id : link.projectId === id),
    ),
  );
  function flush() {
    if (!id) return true;
    try {
      const d = latest.current;
      if (d.body.trim())
        saveLogDraft(scope, {
          ...d,
          kind,
          targetId: id,
          savedAt: new Date().toISOString(),
        });
      else clearLogDraft(scope, kind, id);
      return true;
    } catch {
      if (alive.current)
        setError(
          "Could not keep this log draft. Post it or copy it before closing.",
        );
      return false;
    }
  }
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useImperativeHandle(ref, () => ({ flush: () => flushRef.current() }), []);
  useEffect(() => {
    const timer = setTimeout(() => flushRef.current(), 450);
    return () => clearTimeout(timer);
  }, [draft]);
  useEffect(() => {
    alive.current = true;
    const save = () => flushRef.current();
    window.addEventListener("pagehide", save);
    return () => {
      alive.current = false;
      request.current++;
      save();
      window.removeEventListener("pagehide", save);
    };
  }, []);
  async function load(older = false) {
    if (!id) return;
    const current = ++request.current;
    setLoading(true);
    setError("");
    setLoadFailed(false);
    try {
      const cursor = older ? next : null;
      const query = new URLSearchParams({ kind, id, ...(cursor || {}) });
      const page: Page = demo
        ? await api<Page>("/v1/sample/activity-feed", "", {
            method: "POST",
            body: JSON.stringify({
              workspace: data,
              items: readActivities(scope),
              query: { kind, id, ...(cursor || {}) },
            }),
          })
        : await api<Page>("/v1/activity?" + query, session?.access_token || "");
      if (alive.current && current === request.current) {
        scrollToEnd.current = !older && !page.linkedBlocks?.length;
        if (!older) setLinkedBlocks(page.linkedBlocks || []);
        setItems((old) =>
          older ? mergeLogs(old, page.items) : mergeLogs(page.items),
        );
        setNext(page.next);
      }
    } catch (e) {
      if (alive.current && current === request.current) {
        setError(message(e, "load the log"));
        setLoadFailed(true);
      }
    } finally {
      if (alive.current && current === request.current) setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [kind, id, scope, session?.access_token]);
  useLayoutEffect(() => {
    if (tab === "log" && scrollToEnd.current && feed.current) {
      feed.current.scrollTo({
        top: feed.current.scrollHeight,
        behavior: reduced ? "instant" : "smooth",
      });
      scrollToEnd.current = false;
    }
  }, [items, reduced, tab]);
  async function post() {
    const current = latest.current,
      body = current.body.trim();
    if (!id || !body || postingLock.current || busy || loading) return;
    postingLock.current = true;
    setPosting(true);
    setError("");
    try {
      let row: ActivityLog;
      if (demo) {
        const existing = readActivities(scope);
        row = await api<ActivityLog>("/v1/sample/activity", "", {
          method: "POST",
          body: JSON.stringify({
            workspace: data,
            items: existing,
            entry: { id: current.entryId, kind, targetId: id, body },
          }),
        });
        if (!existing.some((item) => item.id === row.id))
          storeActivities(scope, [...existing, row]);
      } else
        row = await api<ActivityLog>(
          "/v1/activity",
          session?.access_token || "",
          {
            method: "POST",
            body: JSON.stringify({
              id: current.entryId,
              kind,
              targetId: id,
              body,
            }),
          },
        );
      clearLogDraft(scope, kind, id, current.entryId, body);
      if (alive.current) {
        const empty = { entryId: crypto.randomUUID(), body: "" };
        latest.current = empty;
        setDraft(empty);
        scrollToEnd.current = true;
        setItems((old) => mergeLogs(old, [row]));
      }
    } catch (e) {
      if (alive.current) {
        setError(message(e, "save the log"));
        flushRef.current();
      }
    } finally {
      postingLock.current = false;
      if (alive.current) setPosting(false);
    }
  }
  async function linkNote(noteId: string, remove = false) {
    const note = data.notes.find((n) => n.id === noteId);
    if (!id || !note || busy) return;
    setNotesError("");
    const targets: NoteTarget[] = data.noteLinks
      .filter((l) => l.noteId === noteId || l.targetNoteId === noteId)
      .map((l) =>
        l.taskId
          ? { kind: "task", id: l.taskId }
          : l.projectId
            ? { kind: "project", id: l.projectId }
            : l.thoughtId
              ? { kind: "thought", id: l.thoughtId }
              : {
                  kind: "note",
                  id: l.noteId === noteId ? l.targetNoteId! : l.noteId,
                },
      );
    const kept = targets.filter((t) => t.kind !== kind || t.id !== id);
    try {
      await execute({
        type: "note.save",
        id: noteId,
        expectedUpdatedAt: note.updatedAt,
        input: {
          title: note.title,
          content: note.content,
          tags: note.tags || [],
          targets: remove ? kept : [...kept, { kind, id }],
        },
      });
    } catch (e) {
      setNotesError(message(e, "link the note"));
    }
  }
  return (
    <aside
      className="entity-activity-panel"
      aria-label={
        kind === "project"
          ? "Project log and linked notes"
          : "Task log and linked notes"
      }
    >
      <div className="entity-activity-header">
        <div
          className="entity-activity-tabs"
          role="tablist"
          aria-label="Activity sections"
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
              return;
            event.preventDefault();
            const next =
              event.key === "Home"
                ? "log"
                : event.key === "End"
                  ? "notes"
                  : tab === "log"
                    ? "notes"
                    : "log";
            setTab(next);
            document.getElementById(`${activityId}-${next}-tab`)?.focus();
          }}
        >
          <button
            type="button"
            role="tab"
            id={`${activityId}-log-tab`}
            aria-controls={`${activityId}-log`}
            aria-selected={tab === "log"}
            tabIndex={tab === "log" ? 0 : -1}
            onClick={() => setTab("log")}
          >
            <MessageSquare size={14} />
            Log
          </button>
          <button
            type="button"
            role="tab"
            id={`${activityId}-notes-tab`}
            aria-controls={`${activityId}-notes`}
            aria-selected={tab === "notes"}
            tabIndex={tab === "notes" ? 0 : -1}
            onClick={() => setTab("notes")}
          >
            <FileText size={14} />
            Notes <span>{notes.length}</span>
          </button>
        </div>
        {id && tab === "log" && (
          <IconButton
            label="Refresh log"
            onClick={() => void load()}
            disabled={loading || posting}
          >
            <RefreshCw size={14} />
          </IconButton>
        )}
      </div>
      <section
        className="entity-log-section"
        id={`${activityId}-log`}
        role="tabpanel"
        aria-labelledby={`${activityId}-log-tab`}
        hidden={tab !== "log"}
      >
        <div className="entity-log-feed" ref={feed} aria-label="Log entries">
          <LinkedTimeBlocks
            blocks={linkedBlocks}
            zone={zone}
            project={kind === "project"}
            onOpen={(id) => onOpen({ kind: "block", id })}
          />
          {next && (
            <button
              type="button"
              className="text-button"
              disabled={loading}
              onClick={() => void load(true)}
            >
              Load older entries
            </button>
          )}
          {loading && !items.length ? (
            <Spinner />
          ) : !items.length ? (
            <p className="entity-log-empty">
              {loadFailed
                ? "Entries could not be loaded."
                : id
                  ? linkedBlocks.length
                    ? "No written entries yet."
                    : "No entries yet."
                  : "Save this " + kind + " to start its log."}
            </p>
          ) : (
            items.map((row) => (
              <article className="entity-log-entry" key={row.id}>
                <header>
                  <span className="entity-log-author">You</span>
                  <time dateTime={row.created_at}>
                    {dateLabel(dayKey(row.created_at, zone), {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    · {timeKey(row.created_at, zone)}
                  </time>
                </header>
                {kind === "project" && row.target_kind === "task" && (
                  <button
                    type="button"
                    className="entity-log-source"
                    onClick={() => onOpen({ kind: "task", id: row.target_id })}
                  >
                    {data.tasks.find((t) => t.id === row.target_id)?.title ||
                      "Task"}
                  </button>
                )}
                <p>{row.body}</p>
              </article>
            ))
          )}
        </div>
        <div className="entity-log-composer">
          <textarea
            aria-label="Write a log entry"
            placeholder="Write a log entry…"
            value={draft.body}
            maxLength={10000}
            disabled={!id || posting}
            onChange={(e) => {
              const next = { ...latest.current, body: e.target.value };
              latest.current = next;
              setDraft(next);
            }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                void post();
              }
            }}
          />
          <div>
            <small>⌘ / Ctrl + Enter</small>
            <span className="entity-log-actions">
              {onSchedule && (
                <button
                  type="button"
                  className="secondary-button"
                  disabled={!id || busy || posting}
                  onClick={onSchedule}
                  title={!id ? "Save this task before scheduling" : undefined}
                >
                  <CalendarClock size={13} />
                  Schedule
                </button>
              )}
              <button
                type="button"
                className="secondary-button"
                disabled={
                  !id || loading || posting || busy || !draft.body.trim()
                }
                onClick={() => void post()}
              >
                {posting ? <Spinner /> : <Send size={13} />}Add log
              </button>
            </span>
          </div>
        </div>
        {error && (
          <div className="entity-log-error" role="alert">
            <span>{error}</span>
            {loadFailed && (
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
              >
                Retry loading log
              </button>
            )}
            <IconButton
              label="Dismiss log message"
              onClick={() => setError("")}
            >
              <X size={12} />
            </IconButton>
          </div>
        )}
      </section>
      <section
        className="entity-linked-notes"
        id={`${activityId}-notes`}
        role="tabpanel"
        aria-labelledby={`${activityId}-notes-tab`}
        hidden={tab !== "notes"}
      >
        <header>
          <h3 id="entity-notes-heading">
            <FileText size={15} />
            Linked notes <span>{notes.length}</span>
          </h3>
        </header>
        <div className="entity-note-list">
          {notes.length ? (
            notes.map((note) => (
              <div className="entity-note-row" key={note.id}>
                <button
                  type="button"
                  className="entity-note-open"
                  onClick={() => onOpen({ kind: "note", id: note.id })}
                >
                  <strong>{note.title}</strong>
                  <small>
                    {note.content.replace(/[#*_`]/g, "").slice(0, 90)}
                  </small>
                </button>
                <IconButton
                  label={"Unlink " + note.title}
                  disabled={busy}
                  onClick={() => void linkNote(note.id, true)}
                >
                  <X size={12} />
                </IconButton>
              </div>
            ))
          ) : (
            <p className="entity-log-empty">No linked notes yet.</p>
          )}
        </div>
        {id &&
          data.notes.some(
            (n) => !notes.some((linked) => linked.id === n.id),
          ) && (
            <SelectField
              label="Link a note"
              hideLabel
              value=""
              disabled={busy}
              onChange={(value) => {
                if (value) void linkNote(value);
              }}
              options={[
                { value: "", label: "Link a note…" },
                ...data.notes
                  .filter((n) => !notes.some((linked) => linked.id === n.id))
                  .map((n) => ({ value: n.id, label: n.title })),
              ]}
            />
          )}
        {notesError && (
          <p className="entity-log-error" role="alert">
            {notesError}
          </p>
        )}
      </section>
    </aside>
  );
});
const message = (e: unknown, operation = "update the log") =>
  e instanceof Error && "code" in e && e.code === "invalid"
    ? `Could not ${operation}. Please retry; your draft is kept.`
    : e instanceof Error
      ? e.message
      : "Could not update the log. Your draft was kept.";
