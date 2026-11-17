import { useEffect, useState, useRef } from "react";
import type { FormEvent, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import {
  Plus,
  Trash2,
  Check,
  ArrowUpRight,
  FileText,
  Eye,
  PencilLine,
  CircleAlert,
} from "lucide-react";
import { useConfirm } from "../lib/confirmation";
import { useOne } from "../lib/workspace";
import { useActions, stages, taskStage } from "../lib/actions";
import type { Stage } from "../lib/actions";
import { Dialog, IconButton, CheckButton, EntityIcon } from "./ui";
import { SelectField, MultiSelectField } from "./SelectField";
import { DayPicker, SaveButton } from "./interactions";
import { DateTimeField, invalidDateField } from "./DateTimeField";
import type { SaveState } from "./interactions";
import { useMotionPreference } from "../lib/motion-preference";
import {
  dayKey,
  timeKey,
  wallTime,
  addDays,
  minutesBetween,
} from "../domain/time";
import { habitIconNames } from "../domain/habit-icons";
import { projectIconNames } from "../domain/project-icons";
import { databaseFieldTypes } from "../domain/note-databases";
import type { DatabaseField, DatabaseValue } from "../domain/note-databases";
import type { NoteTarget } from "../domain/model";
import type { Command } from "../domain/commands";
import EmotionPicker from "./EmotionPicker";
import { useEditorDraft } from "../lib/drafts";
import type { DraftValues } from "../lib/drafts";
import FocusTaskButton from "./FocusTaskButton";
export default function Editor() {
  const {
    editor,
    edit,
    data,
    execute,
    busy,
    notify,
    zone,
    today,
    reload,
    scope,
  } = useOne();
  const { safely, moveTask } = useActions();
  const confirm = useConfirm();
  const kind = editor!.kind,
    id = editor!.id;
  const task = data.tasks.find((t) => t.id === id),
    project = data.projects.find((p) => p.id === id),
    thought = data.thoughts.find((t) => t.id === id),
    note = data.notes.find((n) => n.id === id),
    block = data.timeBlocks.find((b) => b.id === id),
    sleep = data.sleepRecords.find((s) => s.id === id),
    habit = data.habits.find((h) => h.id === id),
    database = data.noteDatabases.find(
      (db) => db.id === (kind === "database" ? id : editor!.databaseId),
    ),
    record = data.databaseRecords.find((r) => r.id === id);
  const entity =
    kind === "task"
      ? task
      : kind === "project"
        ? project
        : kind === "thought"
          ? thought
          : kind === "note"
            ? note
            : kind === "block"
              ? block
              : kind === "sleep"
                ? sleep
                : kind === "habit"
                  ? habit
                  : kind === "database"
                    ? database
                    : record;
  const [revision, setRevision] = useState(entity?.updatedAt);
  const [title, setTitle] = useState(
    entity && "title" in entity
      ? entity.title
      : editor!.taskId
        ? data.tasks.find((task) => task.id === editor!.taskId)?.title || ""
        : "",
  );
  const [description, setDescription] = useState(
    entity && "description" in entity ? entity.description : "",
  );
  const [content, setContent] = useState(
    entity && "content" in entity ? entity.content : "",
  );
  const [tags, setTags] = useState(
    entity && "tags" in entity ? entity.tags?.join(", ") || "" : "",
  );
  const [projectId, setProjectId] = useState(
    task?.projectId || editor!.projectId || "",
  );
  const [deadline, setDeadline] = useState(
    task?.deadline || editor!.date || "",
  );
  const [status, setStatus] = useState<"active" | "on_hold">(
    task?.workStatus || project?.workStatus || "active",
  );
  const [initialStage, setInitialStage] = useState<Stage>(
    editor!.initialStage || (kind === "project" ? "progress" : "todo"),
  );
  const [icon, setIcon] = useState<string>(
    habit?.icon || project?.icon || (kind === "habit" ? "repeat" : "folder"),
  );
  const [emotion, setEmotion] = useState(thought?.emotion || "");
  const [weekdays, setWeekdays] = useState(
    habit?.isoWeekdays || [1, 2, 3, 4, 5, 6, 7],
  );
  const [startsOn, setStartsOn] = useState(habit?.startsOn || today),
    [endsOn, setEndsOn] = useState(habit?.endsOn || "");
  const [neverEnd, setNeverEnd] = useState(!habit?.endsOn);
  const [start, setStart] = useState(
    block || sleep
      ? dayKey((block || sleep)!.startsAt, zone) +
          "T" +
          timeKey((block || sleep)!.startsAt, zone)
      : kind === "sleep"
        ? addDays(editor!.date || today, -1) + "T23:00"
        : editor!.startsAt
          ? dayKey(editor!.startsAt, zone) +
            "T" +
            timeKey(editor!.startsAt, zone)
          : (editor!.date || today) + "T09:00",
  );
  const [end, setEnd] = useState(
    block || sleep
      ? dayKey((block || sleep)!.endsAt, zone) +
          "T" +
          timeKey((block || sleep)!.endsAt, zone)
      : kind === "sleep"
        ? (editor!.date || today) + "T07:00"
        : editor!.endsAt
          ? dayKey(editor!.endsAt, zone) + "T" + timeKey(editor!.endsAt, zone)
          : (editor!.date || today) + "T10:00",
  );
  const [awake, setAwake] = useState(sleep?.awakeMinutes || 0),
    [sleepNote, setSleepNote] = useState(sleep?.note || "");
  const [taskIds, setTaskIds] = useState(
    id
      ? data.blockTaskLinks
          .filter((l) => l.timeBlockId === id)
          .map((l) => l.taskId)
      : editor!.taskId
        ? [editor!.taskId]
        : [],
  );
  const [fields, setFields] = useState<DatabaseField[]>(database?.fields || []);
  const [noteId, setNoteId] = useState(database?.noteId || "");
  const [values, setValues] = useState<Record<string, DatabaseValue>>(
    record?.values || {},
  );
  const [condition, setCondition] = useState("");
  const [newConditions, setNewConditions] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const mounted = useRef(true);
  const saving = useRef(false),
    saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reduced = useMotionPreference();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(saveTimer.current);
    };
  }, []);
  const signature = JSON.stringify({
    title,
    description,
    content,
    tags,
    projectId,
    deadline,
    status,
    initialStage,
    icon,
    emotion,
    weekdays,
    startsOn,
    endsOn,
    neverEnd,
    start,
    end,
    awake,
    sleepNote,
    taskIds,
    fields,
    noteId,
    values,
    newConditions,
    condition,
  });
  const baseline = useRef(signature);
  const dirty = baseline.current !== signature;
  const draft = useEditorDraft({
    scope,
    editor: editor!,
    revision,
    signature,
    dirty,
    restore: (v: DraftValues) => {
      setTitle(v.title);
      setDescription(v.description);
      setContent(v.content);
      setTags(v.tags);
      setProjectId(v.projectId);
      setDeadline(v.deadline);
      setStatus(v.status);
      setInitialStage(v.initialStage);
      setIcon(v.icon);
      setEmotion(v.emotion);
      setWeekdays(v.weekdays);
      setStartsOn(v.startsOn);
      setEndsOn(v.endsOn);
      setNeverEnd(v.neverEnd);
      setStart(v.start);
      setEnd(v.end);
      setAwake(v.awake);
      setSleepNote(v.sleepNote);
      setTaskIds(v.taskIds);
      setFields(v.fields);
      setNoteId(v.noteId);
      setValues(v.values);
      setNewConditions(v.newConditions);
      setCondition(v.condition);
    },
  });
  const conditions = data.conditions
    .filter((c) => c.taskId === id)
    .toSorted((a, b) => a.position - b.position);
  const projectTasks = data.tasks.filter((t) => t.projectId === id);
  const targets: NoteTarget[] = data.noteLinks
    .filter((l) => l.noteId === id || l.targetNoteId === id)
    .map((l) =>
      l.taskId
        ? { kind: "task", id: l.taskId }
        : l.projectId
          ? { kind: "project", id: l.projectId }
          : l.thoughtId
            ? { kind: "thought", id: l.thoughtId }
            : {
                kind: "note",
                id: l.noteId === id ? l.targetNoteId! : l.noteId,
              },
    );
  const tagList = () =>
    tags
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  const close = () => {
    if (!busy && !saving.current && draft.flush()) edit(null);
  };
  function timestamps() {
    const [a, b] = start.split("T"),
      [c, d] = end.split("T");
    const startsAt = wallTime(a, b, zone),
      endsAt = wallTime(c, d, zone);
    if (endsAt <= startsAt)
      throw new Error("The end needs to be after the start.");
    return { startsAt, endsAt, timeZone: zone };
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy || saving.current || saveState === "saved") return;
    setError("");
    const missing = Array.from(
      (event.currentTarget as HTMLFormElement).querySelectorAll<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >("[required]"),
    ).find((field) => !field.value.trim());
    if (missing) {
      const name =
        missing.getAttribute("aria-label") ||
        missing.closest("label")?.querySelector("span")?.textContent?.trim() ||
        "this field";
      const messages: Record<string, string> = {
        Title: "Enter a title.",
        Content: "Add some content before saving.",
        "Your thought": "Write a thought before saving.",
        "Starts on": "Choose a start date.",
        "End date": "Choose an end date or select Never end.",
        "Fell asleep": "Choose when you fell asleep.",
        "Woke up": "Choose when you woke up.",
        "Starts at": "Choose a start time.",
        "Ends at": "Choose an end time.",
        "Property name": "Give each property a name.",
      };
      setError(messages[name] || `Complete “${name}” to continue.`);
      setSaveState("error");
      missing.focus();
      return;
    }
    const invalidDate = invalidDateField(
      event.currentTarget as HTMLFormElement,
    );
    if (invalidDate) {
      setError(invalidDate.message);
      setSaveState("error");
      invalidDate.field
        .querySelector<HTMLElement>('[role="spinbutton"]')
        ?.focus();
      return;
    }
    saving.current = true;
    setSaveState("saving");
    try {
      if (kind === "habit" && !weekdays.length)
        throw new Error("Choose at least one repeat day.");
      let command: Command;
      switch (kind) {
        case "task":
          command = id
            ? {
                type: "task.update",
                id,
                expectedUpdatedAt: revision,
                patch: {
                  title,
                  description,
                  deadline: deadline || null,
                  projectId: projectId || null,
                  tags: tagList(),
                  workStatus: status,
                },
              }
            : {
                type: "task.create",
                input: {
                  initialStage,
                  title,
                  description,
                  deadline: deadline || null,
                  projectId: projectId || null,
                  tags: tagList(),
                  workStatus: status,
                  conditions: [
                    ...newConditions,
                    ...(condition.trim() ? [condition.trim()] : []),
                  ],
                },
              };
          break;
        case "project":
          command = id
            ? {
                type: "project.update",
                id,
                expectedUpdatedAt: revision,
                input: {
                  title,
                  description,
                  icon: icon as (typeof projectIconNames)[number],
                  tags: tagList(),
                  workStatus: status,
                },
              }
            : {
                type: "project.create",
                input: {
                  initialStage:
                    initialStage === "todo" ? "progress" : initialStage,
                  title,
                  description,
                  icon: icon as (typeof projectIconNames)[number],
                  tags: tagList(),
                  workStatus: status,
                },
              };
          break;
        case "thought":
          command = id
            ? {
                type: "thought.update",
                id,
                expectedUpdatedAt: revision,
                input: { title, content, emotion: emotion || null },
              }
            : {
                type: "thought.create",
                input: { title, content, emotion: emotion || null },
              };
          break;
        case "note":
          command = {
            type: "note.save",
            ...(id ? { id, expectedUpdatedAt: revision } : {}),
            input: { title, content, tags: tagList(), targets },
          };
          break;
        case "habit":
          if (!neverEnd && !endsOn)
            throw new Error("Choose an end date or select Never end.");
          command = id
            ? {
                type: "habit.update",
                id,
                expectedUpdatedAt: revision,
                input: {
                  title,
                  description,
                  icon: icon as (typeof habitIconNames)[number],
                  timeZone: habit?.timeZone || zone,
                  startsOn,
                  endsOn: neverEnd ? null : endsOn,
                  isoWeekdays: weekdays,
                },
              }
            : {
                type: "habit.create",
                input: {
                  title,
                  description,
                  icon: icon as (typeof habitIconNames)[number],
                  timeZone: zone,
                  startsOn,
                  endsOn: neverEnd ? null : endsOn,
                  isoWeekdays: weekdays,
                },
              };
          break;
        case "block":
          command = {
            type: "block.save",
            ...(id ? { id, expectedUpdatedAt: revision } : {}),
            input: {
              title,
              description,
              ...timestamps(),
              taskIds,
              occurrenceIds: data.blockOccurrenceLinks
                .filter((l) => l.timeBlockId === id)
                .map((l) => l.occurrenceId),
            },
          };
          break;
        case "sleep": {
          const times = timestamps();
          if (awake >= minutesBetween(times.startsAt, times.endsAt))
            throw new Error(
              "Time awake must be shorter than the sleep period.",
            );
          command = {
            type: "sleep.save",
            ...(id ? { id, expectedUpdatedAt: revision } : {}),
            input: { ...times, awakeMinutes: awake, note: sleepNote },
          };
          break;
        }
        case "database":
          command = {
            type: "database.save",
            ...(id ? { id, expectedUpdatedAt: revision } : {}),
            input: { title, description, noteId: noteId || null, fields },
          };
          break;
        case "record":
          if (!database) throw new Error("This database no longer exists.");
          command = {
            type: "database.record.save",
            ...(id ? { id, expectedUpdatedAt: revision } : {}),
            databaseRevision: database.updatedAt,
            input: { databaseId: database.id, title, content, values },
          };
          break;
      }
      await execute(command);
      if (!mounted.current) return;
      baseline.current = signature;
      draft.clear();
      setSaveState("saved");
      notify(id ? "Changes saved." : "A little space, made.");
      saveTimer.current = setTimeout(() => edit(null), reduced ? 120 : 480);
    } catch (cause) {
      if (!mounted.current) return;
      setError(cause instanceof Error ? cause.message : "Could not save.");
      setSaveState("error");
    } finally {
      saving.current = false;
    }
  }
  async function remove() {
    const label =
      kind === "block" ? "time block" : kind === "sleep" ? "sleep entry" : kind;
    if (
      !id ||
      !(await confirm({
        title: `Delete this ${label}?`,
        description:
          (title ? `“${title}” will be deleted. ` : "") +
          (kind === "database" ? "Its records will also be deleted. " : "") +
          "You can restore it from Trash in Settings.",
        confirmLabel: `Delete ${label}`,
      })) ||
      !mounted.current
    )
      return;
    const command: Command =
      kind === "task"
        ? { type: "task.delete", id }
        : kind === "project"
          ? { type: "project.delete", id }
          : kind === "thought"
            ? { type: "thought.delete", id }
            : kind === "note"
              ? { type: "note.delete", id, expectedUpdatedAt: revision }
              : kind === "habit"
                ? { type: "habit.delete", id, expectedUpdatedAt: revision }
                : kind === "block"
                  ? { type: "block.delete", id, expectedUpdatedAt: revision }
                  : kind === "sleep"
                    ? { type: "sleep.delete", id, expectedUpdatedAt: revision }
                    : kind === "database"
                      ? {
                          type: "database.delete",
                          id,
                          expectedUpdatedAt: revision!,
                        }
                      : {
                          type: "database.record.delete",
                          id,
                          expectedUpdatedAt: revision!,
                        };
    try {
      await execute(command);
      draft.clear();
      edit(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete.");
    }
  }
  async function updateCondition(conditionId: string, isMet: boolean) {
    try {
      const result = await execute({
        type: "condition.update",
        id: conditionId,
        patch: { isMet },
      });
      setRevision(result.snapshot.tasks.find((t) => t.id === id)?.updatedAt);
    } catch {}
  }
  async function addCondition() {
    if (!condition.trim()) return;
    if (id) {
      try {
        const result = await execute({
          type: "condition.add",
          taskId: id,
          description: condition.trim(),
        });
        setRevision(result.snapshot.tasks.find((t) => t.id === id)?.updatedAt);
        setCondition("");
      } catch {}
    } else {
      setNewConditions([...newConditions, condition.trim()]);
      setCondition("");
    }
  }
  function updateField(fieldId: string, patch: Partial<DatabaseField>) {
    setFields(fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)));
  }
  if (id && !entity)
    return (
      <Dialog title="Item unavailable" onClose={close}>
        <p className="empty">
          This item changed or was removed. Refresh your workspace to see the
          latest version.
        </p>
        <button
          className="primary-button"
          onClick={() => {
            edit(null);
            void reload();
          }}
        >
          Refresh workspace
        </button>
      </Dialog>
    );
  return (
    <Dialog
      title={
        (id ? "EDIT " : "NEW ") +
        (kind === "block"
          ? "TIME BLOCK"
          : kind === "record"
            ? "DATABASE RECORD"
            : kind.toUpperCase())
      }
      onClose={close}
      wide={kind === "note" || kind === "database"}
      dirty={false}
    >
      <form className="editor-form" onSubmit={save} noValidate>
        {draft.stored && (
          <div className="draft-banner" role="status">
            <span>A draft from an earlier version is available.</span>
            <button type="button" onClick={draft.resume}>
              Restore draft
            </button>
            <button type="button" onClick={draft.discard}>
              Discard
            </button>
          </div>
        )}
        {draft.status && (
          <div
            className={"draft-status" + (draft.problem ? " error" : "")}
            role="status"
          >
            {draft.status}
            {!draft.problem && dirty && (
              <button
                type="button"
                onClick={async () => {
                  if (
                    await confirm({
                      title: "Discard this draft?",
                      description: "Your saved item stays unchanged.",
                      confirmLabel: "Discard draft",
                    })
                  )
                    draft.discard();
                }}
              >
                Discard draft
              </button>
            )}
          </div>
        )}
        <fieldset
          className="editor-fields"
          disabled={saveState === "saving" || saveState === "saved"}
        >
          {kind !== "sleep" && (
            <input
              className="editor-title"
              aria-label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                kind === "thought"
                  ? "Give it a title, if you like"
                  : kind === "block"
                    ? "Make time for…"
                    : "A little " + kind + "…"
              }
              maxLength={300}
              required={kind !== "thought" && kind !== "block"}
            />
          )}
          {kind === "sleep" && (
            <div className="editor-sleep-heading">
              <MoonIcon />
              <h2>A little time to recharge.</h2>
              <p>Log your rest, without overthinking it.</p>
            </div>
          )}
          {(kind === "task" || kind === "project") && (
            <div className="form-grid editor-status-fields">
              <SelectField
                label="Status"
                value={id ? status : initialStage}
                onChange={(value) =>
                  id
                    ? setStatus(value as typeof status)
                    : setInitialStage(value as Stage)
                }
                options={
                  id
                    ? [
                        { value: "active", label: "Active" },
                        { value: "on_hold", label: "On hold" },
                      ]
                    : stages
                        .filter(
                          (stage) => kind === "task" || stage.id !== "todo",
                        )
                        .map((stage) => ({
                          value: stage.id,
                          label:
                            stage.id === "progress" && kind === "project"
                              ? "In motion"
                              : stage.title,
                        }))
                }
                disabled={
                  busy || saveState === "saving" || saveState === "saved"
                }
              />
              <Field label="Tags">
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Design, personal…"
                  maxLength={2000}
                />
              </Field>
            </div>
          )}
          {(kind === "task" ||
            kind === "project" ||
            kind === "habit" ||
            kind === "block" ||
            kind === "database") && (
            <textarea
              className="description-input"
              aria-label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A little context, if you need it…"
              maxLength={10000}
              rows={2}
            />
          )}
          {kind === "task" && (
            <div className="form-grid">
              <SelectField
                label="Project"
                value={projectId}
                onChange={setProjectId}
                options={[
                  { value: "", label: "No project" },
                  ...data.projects.map((p) => ({
                    value: p.id,
                    label: p.title,
                  })),
                ]}
                disabled={
                  busy || saveState === "saving" || saveState === "saved"
                }
              />
              <DateTimeField
                label="Due date"
                value={deadline}
                onChange={setDeadline}
                today={today}
                disabled={
                  busy || saveState === "saving" || saveState === "saved"
                }
              />
            </div>
          )}
          {(kind === "project" || kind === "habit") && (
            <div className="field-block">
              <span className="field-label">A LITTLE PERSONALITY</span>
              <div className="icon-picker">
                {(kind === "habit" ? habitIconNames : projectIconNames).map(
                  (name) => (
                    <button
                      type="button"
                      aria-label={name}
                      aria-pressed={icon === name}
                      className={icon === name ? "selected" : ""}
                      onClick={() => setIcon(name)}
                      key={name}
                    >
                      <EntityIcon name={name} />
                    </button>
                  ),
                )}
              </div>
            </div>
          )}
          {kind === "task" && (
            <>
              <div className="editor-section-title">
                <h3>Completion conditions</h3>
                <span>
                  {conditions.filter((c) => c.isMet).length} /{" "}
                  {conditions.length + newConditions.length}
                </span>
              </div>
              <p className="field-help">
                A task is done when these little things are, too.
              </p>
              <div className="conditions-list">
                {conditions.map((c) => (
                  <div key={c.id}>
                    <CheckButton
                      checked={c.isMet}
                      label={"Toggle " + c.description}
                      disabled={busy}
                      onClick={() => void updateCondition(c.id, !c.isMet)}
                    />
                    <span>{c.description}</span>
                    <IconButton
                      label={"Remove " + c.description}
                      disabled={busy}
                      onClick={() =>
                        safely(async () => {
                          const result = await execute({
                            type: "condition.delete",
                            id: c.id,
                          });
                          setRevision(
                            result.snapshot.tasks.find((t) => t.id === id)
                              ?.updatedAt,
                          );
                        })
                      }
                    >
                      <Trash2 size={13} />
                    </IconButton>
                  </div>
                ))}
                {newConditions.map((c, i) => (
                  <div key={i}>
                    <span className="check-placeholder" />
                    <span>{c}</span>
                    <IconButton
                      label="Remove condition"
                      onClick={() =>
                        setNewConditions(
                          newConditions.filter((_, index) => index !== i),
                        )
                      }
                    >
                      <Trash2 size={13} />
                    </IconButton>
                  </div>
                ))}
              </div>
              <div className="add-condition">
                <input
                  aria-label="New completion condition"
                  placeholder="Add a completion condition…"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  maxLength={10000}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void addCondition();
                    }
                  }}
                />
                <IconButton
                  label="Add condition"
                  onClick={() => void addCondition()}
                  disabled={busy || !condition.trim()}
                >
                  <Plus size={16} />
                </IconButton>
              </div>
              {task && (
                <div className="task-state-actions">
                  <span className="field-label">MOVE TASK</span>
                  <div>
                    {stages.map((stage) => (
                      <button
                        type="button"
                        disabled={busy || dirty || taskStage(task) === stage.id}
                        className={
                          "tiny-pill " +
                          (taskStage(task) === stage.id ? "selected" : "")
                        }
                        key={stage.id}
                        onClick={() =>
                          safely(async () => {
                            const result = await moveTask(task, stage.id);
                            setRevision(
                              data.tasks.find((t) => t.id === id)?.updatedAt,
                            );
                            edit(null);
                            return result;
                          })
                        }
                      >
                        {stage.title}
                      </button>
                    ))}
                  </div>
                  {dirty && (
                    <small>Save your changes before moving the task.</small>
                  )}
                </div>
              )}
            </>
          )}
          {kind === "project" && project && (
            <>
              <div className="editor-section-title">
                <h3>Small steps in this project</h3>
                <span>
                  {projectTasks.filter((t) => t.completedAt).length}/
                  {projectTasks.length}
                </span>
              </div>
              <div className="project-task-list">
                {projectTasks.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    onClick={async () => {
                      if (draft.flush()) edit({ kind: "task", id: t.id });
                    }}
                  >
                    <span
                      className={
                        "check-placeholder " + (t.completedAt ? "checked" : "")
                      }
                    >
                      {t.completedAt && <Check size={11} />}
                    </span>
                    {t.title}
                    <ArrowUpRight size={13} />
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="text-button"
                disabled={dirty}
                onClick={() => edit({ kind: "task", projectId: id })}
              >
                <Plus size={13} />
                Add a task
              </button>
              <button
                type="button"
                className="secondary-button project-complete"
                disabled={busy || dirty}
                onClick={() =>
                  safely(async () => {
                    await execute({
                      type: project.completedAt
                        ? "project.reopen"
                        : "project.complete",
                      id: project.id,
                    });
                    edit(null);
                    notify(
                      project.completedAt
                        ? "Project reopened."
                        : "A little chapter, completed.",
                    );
                  })
                }
              >
                {project.completedAt ? "Reopen project" : "Complete project"}
                <Check size={14} />
              </button>
            </>
          )}
          {kind === "habit" && (
            <>
              <DayPicker value={weekdays} onChange={setWeekdays} />
              <div className="form-grid habit-date-fields">
                <DateTimeField
                  label="Starts on"
                  value={startsOn}
                  onChange={setStartsOn}
                  required
                  today={today}
                  disabled={
                    busy || saveState === "saving" || saveState === "saved"
                  }
                />
                <SelectField
                  label="Ends"
                  value={neverEnd ? "never" : "date"}
                  onChange={(value) => setNeverEnd(value === "never")}
                  options={[
                    { value: "never", label: "Never end" },
                    { value: "date", label: "On a date" },
                  ]}
                  disabled={
                    busy || saveState === "saving" || saveState === "saved"
                  }
                />
                {!neverEnd && (
                  <div className="habit-end-date">
                    <DateTimeField
                      label="End date"
                      value={endsOn}
                      onChange={setEndsOn}
                      required
                      min={startsOn}
                      today={today}
                      disabled={
                        busy || saveState === "saving" || saveState === "saved"
                      }
                    />
                  </div>
                )}
              </div>
            </>
          )}
          {(kind === "block" || kind === "sleep") && (
            <>
              <div className="form-grid time-fields">
                <DateTimeField
                  label={kind === "sleep" ? "Fell asleep" : "Starts at"}
                  value={start}
                  onChange={setStart}
                  withTime
                  required
                  today={today}
                  disabled={
                    busy || saveState === "saving" || saveState === "saved"
                  }
                />
                <DateTimeField
                  label={kind === "sleep" ? "Woke up" : "Ends at"}
                  value={end}
                  onChange={setEnd}
                  withTime
                  required
                  today={today}
                  disabled={
                    busy || saveState === "saving" || saveState === "saved"
                  }
                />
              </div>
              <p className="field-help">Times are shown in {zone}.</p>
              {kind === "sleep" ? (
                <>
                  <Field label="Time awake · minutes">
                    <input
                      type="number"
                      min="0"
                      max="10080"
                      step="1"
                      value={awake}
                      onChange={(e) => setAwake(Number(e.target.value))}
                      required
                    />
                  </Field>
                  <Field label="A note about your rest">
                    <textarea
                      rows={3}
                      value={sleepNote}
                      onChange={(e) => setSleepNote(e.target.value)}
                      placeholder="How did it feel?"
                      maxLength={10000}
                    />
                  </Field>
                </>
              ) : (
                <div className="field-block">
                  <MultiSelectField
                    label="Linked tasks · optional"
                    placeholder="Choose tasks"
                    value={taskIds}
                    onChange={setTaskIds}
                    options={data.tasks
                      .filter((t) => !t.completedAt || taskIds.includes(t.id))
                      .map((t) => ({ value: t.id, label: t.title }))}
                    disabled={
                      busy || saveState === "saving" || saveState === "saved"
                    }
                  />
                  <p className="field-help">
                    Planning time does not complete a task.
                  </p>
                </div>
              )}
            </>
          )}
          {kind === "thought" && (
            <>
              <textarea
                className="thought-writing"
                aria-label="Your thought"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Whatever’s on your mind…"
                rows={7}
                required
                maxLength={500000}
              />
              <EmotionPicker value={emotion} onChange={setEmotion} />
            </>
          )}
          {(kind === "note" || kind === "record") && (
            <>
              <div className="markdown-toolbar">
                <span>
                  <FileText size={13} />A little room to write
                </span>
                <button type="button" onClick={() => setPreview(!preview)}>
                  {preview ? <PencilLine size={13} /> : <Eye size={13} />}{" "}
                  {preview ? "Write" : "Preview"}
                </button>
              </div>
              {preview ? (
                <div className="markdown-preview">
                  <ReactMarkdown>
                    {content || "*A fresh page. What would you like to keep?*"}
                  </ReactMarkdown>
                </div>
              ) : (
                <textarea
                  className="note-writing"
                  aria-label="Note content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="# A little clarity&#10;&#10;Start with a thought. See where it takes you."
                  rows={12}
                  maxLength={500000}
                />
              )}
              <p className="field-help">
                Markdown welcome. Use # for headings, - for lists, and **bold**
                for a little emphasis.
              </p>
              {kind === "note" && (
                <Field label="Tags">
                  <input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="Ideas, personal, inspiration…"
                    maxLength={2000}
                  />
                </Field>
              )}
            </>
          )}
          {kind === "database" && (
            <>
              <SelectField
                label="Keep with a note · optional"
                value={noteId}
                onChange={setNoteId}
                options={[
                  { value: "", label: "Standalone database" },
                  ...data.notes.map((n) => ({ value: n.id, label: n.title })),
                ]}
                disabled={
                  busy || saveState === "saving" || saveState === "saved"
                }
              />
              <div className="editor-section-title">
                <h3>Properties</h3>
                <span>{fields.length}/30</span>
              </div>
              <div className="database-fields">
                {fields.map((field) => (
                  <div className="database-field" key={field.id}>
                    <input
                      aria-label="Property name"
                      required
                      maxLength={80}
                      placeholder="Property name"
                      value={field.name}
                      onChange={(e) =>
                        updateField(field.id, { name: e.target.value })
                      }
                    />
                    <SelectField
                      hideLabel
                      label={"Type of " + field.name}
                      value={field.type}
                      disabled={
                        busy ||
                        saveState === "saving" ||
                        saveState === "saved" ||
                        !!database?.fields.some((f) => f.id === field.id)
                      }
                      onChange={(value) =>
                        updateField(field.id, {
                          type: value as DatabaseField["type"],
                        })
                      }
                      options={databaseFieldTypes.map((type) => ({
                        value: type,
                        label: type,
                      }))}
                    />
                    <IconButton
                      label="Remove property"
                      onClick={async () => {
                        if (
                          !database?.fields.some((f) => f.id === field.id) ||
                          (await confirm({
                            title: "Remove this property?",
                            description:
                              "Its values will be removed from every record when you save this database.",
                            confirmLabel: "Remove property",
                            cancelLabel: "Keep property",
                          }))
                        ) {
                          setFields((previous) =>
                            previous.filter((f) => f.id !== field.id),
                          );
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                    {field.type === "status" && (
                      <input
                        aria-label={"Options for " + field.name}
                        className="field-options"
                        placeholder="Options separated by commas"
                        value={field.options.join(", ")}
                        onChange={(e) =>
                          updateField(field.id, {
                            options: e.target.value
                              .split(",")
                              .map((v) => v.trim()),
                          })
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="text-button"
                disabled={fields.length >= 30}
                onClick={() =>
                  setFields([
                    ...fields,
                    {
                      id: crypto.randomUUID(),
                      name: "",
                      type: "text",
                      options: [],
                    },
                  ])
                }
              >
                <Plus size={14} />
                Add a property
              </button>
              <p className="field-help">
                Saved property types stay fixed to protect your data. Add a new
                property to use another type.
              </p>
            </>
          )}
          {kind === "record" && database && (
            <div className="record-properties">
              {database.fields.map((field) =>
                field.type === "date" ? (
                  <DateTimeField
                    key={field.id}
                    label={field.name}
                    value={String(values[field.id] ?? "")}
                    onChange={(value) =>
                      setValues({ ...values, [field.id]: value })
                    }
                    today={today}
                    disabled={
                      busy || saveState === "saving" || saveState === "saved"
                    }
                  />
                ) : field.type === "status" ? (
                  <SelectField
                    key={field.id}
                    label={field.name}
                    value={String(values[field.id] || "")}
                    onChange={(value) =>
                      setValues({ ...values, [field.id]: value })
                    }
                    options={[
                      { value: "", label: "Select a status" },
                      ...field.options.map((option) => ({
                        value: option,
                        label: option,
                      })),
                    ]}
                    disabled={
                      busy || saveState === "saving" || saveState === "saved"
                    }
                  />
                ) : (
                  <Field label={field.name} key={field.id}>
                    {field.type === "checkbox" ? (
                      <input
                        type="checkbox"
                        checked={!!values[field.id]}
                        onChange={(e) =>
                          setValues({ ...values, [field.id]: e.target.checked })
                        }
                      />
                    ) : (
                      <input
                        type={field.type === "number" ? "number" : "text"}
                        step={field.type === "number" ? "any" : undefined}
                        value={
                          Array.isArray(values[field.id])
                            ? (values[field.id] as string[]).join(", ")
                            : String(values[field.id] ?? "")
                        }
                        onChange={(e) =>
                          setValues({
                            ...values,
                            [field.id]:
                              field.type === "number" && e.target.value !== ""
                                ? Number(e.target.value)
                                : field.type === "tags"
                                  ? e.target.value
                                      .split(",")
                                      .map((v) => v.trim())
                                  : e.target.value,
                          })
                        }
                        placeholder={
                          field.type === "tags"
                            ? "Separate tags with commas"
                            : ""
                        }
                      />
                    )}
                  </Field>
                ),
              )}
            </div>
          )}
          {error && (
            <div className="editor-error" role="alert">
              <CircleAlert size={15} />
              <span>{error}</span>
              <button
                type="button"
                className="text-button"
                onClick={async () => {
                  if (draft.flush()) {
                    edit(null);
                    void reload();
                  }
                }}
              >
                Refresh workspace
              </button>
            </div>
          )}
          <footer className="editor-footer">
            {id && (
              <button
                type="button"
                className="delete-button"
                onClick={() => void remove()}
                disabled={busy}
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
            <span />
            {task && kind === "task" && (
              <FocusTaskButton task={task} onStarted={() => draft.flush()} />
            )}
            <button
              type="button"
              className="secondary-button"
              onClick={async () => {
                close();
              }}
              disabled={busy}
            >
              Close
            </button>
            <SaveButton
              state={saveState}
              disabled={busy || (kind === "habit" && !weekdays.length)}
              label={
                id
                  ? "Save changes"
                  : "Create " + (kind === "block" ? "time block" : kind)
              }
            />
          </footer>
        </fieldset>
      </form>
    </Dialog>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function MoonIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      <path d="M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z" />
    </svg>
  );
}
