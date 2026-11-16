import { useState, useRef } from "react";
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
import { useOne } from "../lib/workspace";
import { useActions, stages, taskStage } from "../lib/actions";
import { Dialog, IconButton, CheckButton, Spinner, EntityIcon } from "./ui";
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
export default function Editor() {
  const { editor, edit, data, execute, busy, notify, zone, today, reload } =
    useOne();
  const { safely, moveTask } = useActions();
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
    entity && "title" in entity ? entity.title : "",
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
  const [icon, setIcon] = useState<string>(
    habit?.icon || project?.icon || (kind === "habit" ? "repeat" : "folder"),
  );
  const [emotion, setEmotion] = useState(thought?.emotion || "");
  const [weekdays, setWeekdays] = useState(
    habit?.isoWeekdays || [1, 2, 3, 4, 5, 6, 7],
  );
  const [startsOn, setStartsOn] = useState(habit?.startsOn || today),
    [endsOn, setEndsOn] = useState(habit?.endsOn || "");
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
    data.blockTaskLinks
      .filter((l) => l.timeBlockId === id)
      .map((l) => l.taskId),
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
  const signature = JSON.stringify({
    title,
    description,
    content,
    tags,
    projectId,
    deadline,
    status,
    icon,
    emotion,
    weekdays,
    startsOn,
    endsOn,
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
    if (!busy) edit(null);
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
    setError("");
    try {
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
                  endsOn: endsOn || null,
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
                  endsOn: endsOn || null,
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
      edit(null);
      notify(id ? "Changes saved." : "A little space, made.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save.");
    }
  }
  async function remove() {
    if (
      !id ||
      !window.confirm(
        "Delete this " +
          kind +
          "?" +
          (kind === "database" ? " Its records will also be deleted." : "") +
          " This cannot be undone.",
      )
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
      edit(null);
      notify("Deleted. A little more breathing room.");
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
      dirty={dirty}
    >
      <form className="editor-form" onSubmit={save}>
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
        {(kind === "task" || kind === "project") && (
          <div className="form-grid">
            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
              >
                <option value="active">Active</option>
                <option value="on_hold">On hold</option>
              </select>
            </Field>
            <Field label="Tags">
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Design, personal…"
                maxLength={2000}
              />
            </Field>
            {kind === "task" && (
              <>
                <Field label="Project">
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                  >
                    <option value="">No project</option>
                    {data.projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Due date">
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </Field>
              </>
            )}
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
                  onClick={() => {
                    if (
                      !dirty ||
                      window.confirm("Discard your unsaved changes?")
                    )
                      edit({ kind: "task", id: t.id });
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
            <div className="field-block">
              <span className="field-label">MAKE IT A RITUAL</span>
              <div className="weekday-picker">
                {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                  <button
                    type="button"
                    key={i}
                    aria-label={
                      [
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                        "Sunday",
                      ][i]
                    }
                    aria-pressed={weekdays.includes(i + 1)}
                    className={weekdays.includes(i + 1) ? "selected" : ""}
                    onClick={() =>
                      setWeekdays(
                        weekdays.includes(i + 1)
                          ? weekdays.filter((d) => d !== i + 1)
                          : [...weekdays, i + 1].sort(),
                      )
                    }
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-grid">
              <Field label="Starts on">
                <input
                  type="date"
                  value={startsOn}
                  onChange={(e) => setStartsOn(e.target.value)}
                  required
                />
              </Field>
              <Field label="Ends on · optional">
                <input
                  type="date"
                  min={startsOn}
                  value={endsOn}
                  onChange={(e) => setEndsOn(e.target.value)}
                />
              </Field>
            </div>
            <p className="field-help">
              Scheduled in {habit?.timeZone || zone}. Past executions stay
              exactly where they happened.
            </p>
          </>
        )}
        {(kind === "block" || kind === "sleep") && (
          <>
            <div className="form-grid time-fields">
              <Field label={kind === "sleep" ? "Fell asleep" : "Starts at"}>
                <input
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  required
                />
              </Field>
              <Field label={kind === "sleep" ? "Woke up" : "Ends at"}>
                <input
                  type="datetime-local"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  required
                />
              </Field>
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
              <Field label="Linked tasks · optional">
                <select
                  multiple
                  value={taskIds}
                  onChange={(e) =>
                    setTaskIds(
                      Array.from(e.target.selectedOptions, (o) => o.value),
                    )
                  }
                  size={Math.min(4, Math.max(2, data.tasks.length))}
                >
                  {data.tasks
                    .filter((t) => !t.completedAt || taskIds.includes(t.id))
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                </select>
                <span className="field-help">
                  Hold Ctrl / ⌘ to select more than one. Planning time does not
                  complete a task.
                </span>
              </Field>
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
            <Field label="How does it feel?">
              <select
                value={emotion}
                onChange={(e) => setEmotion(e.target.value)}
              >
                <option value="">Just a thought</option>
                {[
                  ...new Set([
                    "Curious",
                    "Inspired",
                    "Grateful",
                    "Calm",
                    "Excited",
                    "Unsure",
                    "Overwhelmed",
                    "Reflective",
                    ...(emotion ? [emotion] : []),
                  ]),
                ].map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </select>
            </Field>
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
            <Field label="Keep with a note · optional">
              <select
                value={noteId}
                onChange={(e) => setNoteId(e.target.value)}
              >
                <option value="">Standalone database</option>
                {data.notes.map((n) => (
                  <option value={n.id} key={n.id}>
                    {n.title}
                  </option>
                ))}
              </select>
            </Field>
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
                  <select
                    aria-label={"Type of " + field.name}
                    value={field.type}
                    disabled={!!database?.fields.some((f) => f.id === field.id)}
                    onChange={(e) =>
                      updateField(field.id, {
                        type: e.target.value as DatabaseField["type"],
                      })
                    }
                  >
                    {databaseFieldTypes.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <IconButton
                    label="Remove property"
                    onClick={() => {
                      if (
                        !database?.fields.some((f) => f.id === field.id) ||
                        window.confirm(
                          "Remove this property and its values from every record?",
                        )
                      ) {
                        setFields(fields.filter((f) => f.id !== field.id));
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
            {database.fields.map((field) => (
              <Field label={field.name} key={field.id}>
                {field.type === "checkbox" ? (
                  <input
                    type="checkbox"
                    checked={!!values[field.id]}
                    onChange={(e) =>
                      setValues({ ...values, [field.id]: e.target.checked })
                    }
                  />
                ) : field.type === "status" ? (
                  <select
                    value={String(values[field.id] || "")}
                    onChange={(e) =>
                      setValues({ ...values, [field.id]: e.target.value })
                    }
                  >
                    <option value="">Select a status</option>
                    {field.options.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={
                      field.type === "number"
                        ? "number"
                        : field.type === "date"
                          ? "date"
                          : "text"
                    }
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
                              ? e.target.value.split(",").map((v) => v.trim())
                              : e.target.value,
                      })
                    }
                    placeholder={
                      field.type === "tags" ? "Separate tags with commas" : ""
                    }
                  />
                )}
              </Field>
            ))}
          </div>
        )}
        {error && (
          <div className="editor-error" role="alert">
            <CircleAlert size={15} />
            <span>{error}</span>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                if (
                  !dirty ||
                  window.confirm("Discard changes and reload this item?")
                ) {
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
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              if (!dirty || window.confirm("Discard your unsaved changes?"))
                close();
            }}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            className="primary-button"
            disabled={busy || (kind === "habit" && !weekdays.length)}
          >
            {busy ? <Spinner /> : <Check size={14} />}{" "}
            {id
              ? "Save changes"
              : "Create " + (kind === "block" ? "time block" : kind)}
          </button>
        </footer>
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
