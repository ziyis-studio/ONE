import { useEffect, useRef, useState } from "react";
import {
  Download,
  Upload,
  RotateCcw,
  Trash2,
  FilePenLine,
  RefreshCw,
} from "lucide-react";
import { useOne } from "../lib/workspace";
import { useConfirm } from "../lib/confirmation";
import { useTheme, readableAccent } from "../lib/theme";
import { readDrafts, removeDraft } from "../lib/drafts";
import type { EditorDraft } from "../lib/drafts";
import {
  completeBackup,
  parsePortableBackup,
  restoreImages,
  restoreDrafts,
  restoreLocalHistory,
  BACKUP_LIMIT,
} from "../lib/backup";
import type { PortableBackup } from "../lib/backup";
import { parseBackup } from "../domain/recovery";
import type { RecoveryEntry } from "../domain/recovery";
import { Spinner } from "./ui";
import "./recovery.css";
export default function RecoverySettings() {
  const {
    scope,
    data,
    busy,
    edit,
    notify,
    zone,
    setZone,
    listRecovery,
    restoreRecovery,
    purgeRecovery,
    exportBackup,
    importBackup,
  } = useOne();
  const { primaryColor, setPrimaryColor } = useTheme();
  const confirm = useConfirm();
  const input = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState(() => readDrafts(scope)),
    [trash, setTrash] = useState<RecoveryEntry[]>([]),
    [loading, setLoading] = useState(true),
    [more, setMore] = useState(false),
    [operation, setOperation] = useState(""),
    [error, setError] = useState(""),
    [pending, setPending] = useState<PortableBackup | null>(null),
    [asCopy, setAsCopy] = useState(false),
    [preferences, setPreferences] = useState(false),
    [draftLimit, setDraftLimit] = useState(5);
  const working = !!operation || busy;
  const refresh = async (offset = 0) => {
    setLoading(true);
    try {
      const result = await listRecovery(offset);
      setTrash((old) => (offset ? [...old, ...result] : result));
      setMore(result.length === 50);
      setError("");
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let active = true;
    void listRecovery()
      .then((rows) => {
        if (active) {
          setTrash(rows);
          setMore(rows.length === 50);
        }
      })
      .catch((e) => {
        if (active) setError(message(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const update = () => setDrafts(readDrafts(scope));
    window.addEventListener("one-drafts", update);
    window.addEventListener("storage", update);
    return () => {
      active = false;
      window.removeEventListener("one-drafts", update);
      window.removeEventListener("storage", update);
    };
  }, [scope, listRecovery]);
  async function run(label: string, action: () => Promise<void>) {
    if (working) return;
    setOperation(label);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(message(e));
    } finally {
      setOperation("");
    }
  }
  function resume(draft: EditorDraft) {
    if (draft.editor.id) {
      const groups = {
        task: data.tasks,
        project: data.projects,
        thought: data.thoughts,
        note: data.notes,
        block: data.timeBlocks,
        habit: data.habits,
        sleep: data.sleepRecords,
        database: data.noteDatabases,
        record: data.databaseRecords,
      };
      if (!groups[draft.editor.kind].some((e) => e.id === draft.editor.id)) {
        notify("Restore this item from Trash before resuming its draft.", true);
        return;
      }
    }
    edit(draft.editor);
  }
  return (
    <>
      <section
        className="settings-card recovery-card"
        aria-labelledby="drafts-heading"
      >
        <header>
          <FilePenLine size={19} />
          <div>
            <h2 id="drafts-heading">Drafts</h2>
            <p>
              Unsaved edits stay on this device, separately for each account.
            </p>
          </div>
        </header>
        {!drafts.length ? (
          <p className="fine">No unfinished drafts.</p>
        ) : (
          drafts.slice(0, draftLimit).map((draft) => (
            <div className="recovery-row" key={draft.key}>
              <span>
                <strong>
                  {draft.values.title ||
                    draft.values.content.slice(0, 60) ||
                    "Untitled " + draft.editor.kind}
                </strong>
                <small>
                  {draft.editor.kind} · {stamp(draft.savedAt, zone)}
                </small>
              </span>
              <button
                className="secondary-button"
                disabled={working}
                onClick={() => resume(draft)}
              >
                Resume
              </button>
              <button
                className="icon-button"
                aria-label={
                  "Discard draft " + (draft.values.title || draft.editor.kind)
                }
                disabled={working}
                onClick={async () => {
                  if (
                    await confirm({
                      title: "Discard this draft?",
                      description: "Your saved item stays unchanged.",
                      confirmLabel: "Discard draft",
                    })
                  ) {
                    try {
                      removeDraft(scope, draft.key);
                      setDrafts(readDrafts(scope));
                    } catch (e) {
                      setError(message(e));
                    }
                  }
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
        {drafts.length > draftLimit && (
          <button
            className="text-button"
            onClick={() => setDraftLimit((n) => n + 10)}
          >
            Show more drafts
          </button>
        )}
      </section>
      <section
        className="settings-card recovery-card"
        aria-labelledby="trash-heading"
      >
        <header>
          <Trash2 size={19} />
          <div>
            <h2 id="trash-heading">Trash</h2>
            <p>
              Restore deleted items and their links. Your later edits are
              preserved.
            </p>
          </div>
          <button
            className="icon-button"
            aria-label="Refresh Trash"
            disabled={working || loading}
            onClick={() => void refresh()}
          >
            <RefreshCw size={15} />
          </button>
        </header>
        {loading && !trash.length ? (
          <Spinner />
        ) : !trash.length ? (
          <p className="fine">Trash is empty.</p>
        ) : (
          trash.map((entry) => (
            <div className="recovery-row" key={entry.id}>
              <span>
                <strong>{entry.title}</strong>
                <small>
                  {entry.kind} · {stamp(entry.deletedAt, zone)}
                </small>
              </span>
              <button
                className="secondary-button"
                disabled={working}
                onClick={() =>
                  void run("Restoring item…", async () => {
                    await restoreRecovery(entry.id);
                    setTrash((rows) => rows.filter((e) => e.id !== entry.id));
                  })
                }
              >
                <RotateCcw size={14} />
                Restore
              </button>
              <button
                className="icon-button"
                aria-label={"Permanently delete " + entry.title}
                disabled={working}
                onClick={async () => {
                  if (
                    await confirm({
                      title: "Permanently delete this item?",
                      description:
                        "It will be removed from Trash and cannot be restored here. Download a backup first if you need to keep a copy.",
                      confirmLabel: "Delete permanently",
                    })
                  )
                    void run("Removing item…", async () => {
                      await purgeRecovery(entry.id);
                      setTrash((rows) => rows.filter((e) => e.id !== entry.id));
                    });
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
        {more && (
          <button
            className="text-button"
            disabled={working || loading}
            onClick={() => void refresh(trash.length)}
          >
            Load more
          </button>
        )}
      </section>
      <section
        className="settings-card recovery-card"
        aria-labelledby="backup-heading"
      >
        <header>
          <Download size={19} />
          <div>
            <h2 id="backup-heading">Backup & restore</h2>
            <p>
              Keep a complete copy of your workspace, logs, focus history,
              Trash, drafts and attached images.
            </p>
          </div>
        </header>
        <div className="recovery-actions">
          <button
            className="secondary-button"
            disabled={working}
            onClick={() =>
              void run("Preparing backup…", async () => {
                const backup = await completeBackup(
                  await exportBackup(),
                  scope,
                  { primaryColor, timeZone: zone },
                );
                const json = JSON.stringify(backup);
                if (new Blob([json]).size > BACKUP_LIMIT)
                  throw new Error("This backup exceeds the 50 MB file limit.");
                const url = URL.createObjectURL(
                  new Blob([json], { type: "application/json" }),
                );
                const link = document.createElement("a");
                link.href = url;
                link.download =
                  "one-backup-" +
                  new Date().toISOString().slice(0, 10) +
                  ".json";
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                notify("Complete backup downloaded.");
              })
            }
          >
            <Download size={14} />
            Export backup
          </button>
          <button
            className="secondary-button"
            disabled={working}
            onClick={() => input.current?.click()}
          >
            <Upload size={14} />
            Import backup
          </button>
          <input
            ref={input}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              void run("Reading backup…", async () => {
                if (file.size > BACKUP_LIMIT)
                  throw new Error("Choose a backup up to 50 MB.");
                const backup = parsePortableBackup(
                  JSON.parse(await file.text()),
                );
                const prefs = backup.device.preferences;
                if (prefs.primaryColor && !readableAccent(prefs.primaryColor))
                  throw new Error(
                    "The backup contains an invalid primary color.",
                  );
                if (prefs.timeZone) {
                  try {
                    new Intl.DateTimeFormat("en", { timeZone: prefs.timeZone });
                  } catch {
                    throw new Error(
                      "The backup contains an invalid time zone.",
                    );
                  }
                }
                setPending(backup);
                setAsCopy(!!backup.ownerId && backup.ownerId !== scope);
                setPreferences(false);
              });
            }}
          />
        </div>
        <p className="fine">
          Import adds missing items and keeps current edits. Older ONE exports
          are supported. Files up to 50 MB; workspace metadata up to 3.5 MB.
          Active countdowns are not resumed.
        </p>
        {pending && (
          <div className="backup-preview" aria-label="Backup preview">
            <h3>Review import</h3>
            <p>
              {pending.workspace.tasks.length} tasks ·{" "}
              {pending.workspace.projects.length} projects ·{" "}
              {pending.workspace.notes.length} notes · {pending.sessions.length}{" "}
              sessions · {pending.trash.filter((e) => !e.restoredAt).length}{" "}
              items in Trash · {pending.device.drafts.length} drafts ·{" "}
              {pending.images.length} images · {pending.activity?.length || 0}{" "}
              log entries
            </p>
            <small>Exported {stamp(pending.exportedAt, zone)}</small>
            <label>
              <input
                type="checkbox"
                checked={asCopy}
                disabled={
                  working || (!!pending.ownerId && pending.ownerId !== scope)
                }
                onChange={(e) => setAsCopy(e.target.checked)}
              />
              Import as a separate copy
            </label>
            <label>
              <input
                type="checkbox"
                checked={preferences}
                disabled={working}
                onChange={(e) => setPreferences(e.target.checked)}
              />
              Restore primary color and time zone
            </label>
            <div className="recovery-actions">
              <button
                className="primary-button"
                disabled={working}
                onClick={() =>
                  void run("Restoring backup…", async () => {
                    const core = parseBackup(pending);
                    if (
                      new TextEncoder().encode(
                        JSON.stringify({ backup: core, asCopy }),
                      ).length > 3_500_000
                    )
                      throw new Error(
                        "Workspace metadata exceeds 3.5 MB. No workspace data was changed.",
                      );
                    await restoreImages(pending, scope);
                    const map = await importBackup(core, asCopy);
                    try {
                      restoreLocalHistory(core, scope, map);
                      await restoreDrafts(pending, scope, map);
                      if (preferences) {
                        if (pending.device.preferences.primaryColor)
                          setPrimaryColor(
                            pending.device.preferences.primaryColor,
                          );
                        if (pending.device.preferences.timeZone)
                          setZone(pending.device.preferences.timeZone);
                      }
                    } catch {
                      notify(
                        "Workspace restored. Device storage is full; drafts or preferences could not be restored.",
                        true,
                      );
                      setPending(null);
                      await refresh();
                      return;
                    }
                    setDrafts(readDrafts(scope));
                    setPending(null);
                    await refresh();
                    notify("Backup restored. Current edits were kept.");
                  })
                }
              >
                Restore backup
              </button>
              <button
                className="secondary-button"
                disabled={working}
                onClick={() => setPending(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
      {operation && (
        <p className="recovery-progress" role="status">
          <Spinner />
          {operation}
        </p>
      )}
      {error && (
        <p className="form-message error recovery-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Could not complete this action. Please retry.";
function stamp(value: string, zone: string) {
  const date = new Date(value);
  return Number.isFinite(+date)
    ? date.toLocaleString("en", {
        timeZone: zone,
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Unknown date";
}
