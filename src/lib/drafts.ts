import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { z } from "zod";
import { mealKinds, mealPhotoSchema, nutrientKeys } from "../domain/meals";
import type { Editor } from "./workspace";
import {
  databaseFieldTypes,
  databaseValuesSchema,
} from "../domain/note-databases";
const text = z.string().max(500_000);
export const draftValuesSchema = z
  .object({
    title: text,
    description: text,
    content: text,
    tags: text,
    projectId: z.string(),
    deadline: z.string(),
    status: z.enum(["active", "on_hold"]),
    initialStage: z.enum(["todo", "progress", "hold", "done"]),
    icon: z.string(),
    emotion: z.string(),
    weekdays: z.array(z.number().int().min(1).max(7)).max(7),
    startsOn: z.string(),
    endsOn: z.string(),
    neverEnd: z.boolean(),
    start: z.string(),
    end: z.string(),
    awake: z.number().finite(),
    sleepNote: text,
    mealKind: z.enum(mealKinds).optional(),
    mealPhotos: z.array(mealPhotoSchema).max(6).optional(),
    mealNutrients: z
      .record(z.enum(nutrientKeys), z.string().max(30))
      .optional(),
    nutritionSource: z.enum(["manual", "external"]).optional(),
    taskIds: z.array(z.string()).max(10000),
    fields: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          type: z.enum(databaseFieldTypes),
          options: z.array(z.string()),
        }),
      )
      .max(30),
    noteId: z.string(),
    values: databaseValuesSchema,
    newConditions: z.array(text).max(1000),
    condition: text,
  })
  .strict();
export type DraftValues = z.infer<typeof draftValuesSchema>;
export const editorSchema = z
  .object({
    kind: z.enum([
      "task",
      "project",
      "block",
      "habit",
      "sleep",
      "meal",
      "thought",
      "note",
      "database",
      "record",
    ]),
    id: z.uuid().optional(),
    projectId: z.uuid().optional(),
    returnProjectId: z.uuid().optional(),
    taskId: z.uuid().optional(),
    databaseId: z.uuid().optional(),
    date: z.string().optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    initialStage: z.enum(["todo", "progress", "hold", "done"]).optional(),
  })
  .strict();
export const draftSchema = z
  .object({
    key: z.string().max(1000),
    editor: editorSchema,
    revision: z.string().optional(),
    savedAt: z.string(),
    values: draftValuesSchema,
  })
  .strict();
export type EditorDraft = z.infer<typeof draftSchema>;
export const draftStorageKey = (scope: string) => "one-drafts-v1:" + scope;
export function draftKey(editor: Editor) {
  return editor.id
    ? editor.kind + ":" + editor.id
    : JSON.stringify(
        Object.entries(editor).sort(([a], [b]) => a.localeCompare(b)),
      );
}
export function readDrafts(scope: string): EditorDraft[] {
  try {
    const raw = localStorage.getItem(draftStorageKey(scope));
    if (!raw) return [];
    const entries = JSON.parse(raw);
    if (!Array.isArray(entries)) return [];
    return entries.flatMap((r) => {
      const v = draftSchema.safeParse(r);
      return v.success ? [v.data] : [];
    });
  } catch {
    return [];
  }
}
export function saveDraft(scope: string, draft: EditorDraft) {
  const entries = readDrafts(scope).filter((e) => e.key !== draft.key);
  localStorage.setItem(
    draftStorageKey(scope),
    JSON.stringify([draft, ...entries]),
  );
  window.dispatchEvent(new Event("one-drafts"));
}
export function removeDraft(scope: string, key: string) {
  localStorage.setItem(
    draftStorageKey(scope),
    JSON.stringify(readDrafts(scope).filter((e) => e.key !== key)),
  );
  window.dispatchEvent(new Event("one-drafts"));
}
export function useEditorDraft(options: {
  scope: string;
  editor: Editor;
  revision?: string;
  signature: string;
  dirty: boolean;
  restore: (value: DraftValues) => void;
}) {
  const { scope, editor, revision, signature, dirty, restore } = options;
  const key = draftKey(editor);
  const [stored, setStored] = useState(() =>
    readDrafts(scope).find((e) => e.key === key),
  );
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState(false);
  const cleared = useRef(false),
    mounted = useRef(true),
    restoring = useRef(false);
  const latest = useRef({ signature, dirty, editor, revision });
  latest.current = { signature, dirty, editor, revision };
  const original = useRef(draftValuesSchema.parse(JSON.parse(signature)));
  function resume() {
    if (!stored) return;
    restoring.current = true;
    restore(stored.values);
    setStored(undefined);
    setStatus("Draft restored · saved on this device");
  }
  useLayoutEffect(() => {
    if (stored && stored.revision === revision) resume();
  }, []);
  const flushRef = useRef<() => boolean>(() => true);
  flushRef.current = () => {
    if (cleared.current || restoring.current || !latest.current.dirty)
      return true;
    try {
      const current = latest.current;
      saveDraft(scope, {
        key,
        editor: current.editor,
        revision: current.revision,
        savedAt: new Date().toISOString(),
        values: draftValuesSchema.parse(JSON.parse(current.signature)),
      });
      if (mounted.current) {
        setStatus("Draft saved on this device");
        setProblem(false);
      }
      return true;
    } catch {
      if (mounted.current) {
        setStatus(
          "Draft could not be saved. Keep this window open or save your changes.",
        );
        setProblem(true);
      }
      return false;
    }
  };
  useEffect(() => {
    restoring.current = false;
    if (!dirty || cleared.current) return;
    const timer = setTimeout(() => flushRef.current(), 450);
    return () => clearTimeout(timer);
  }, [signature, dirty]);
  useEffect(() => {
    mounted.current = true;
    const flush = () => flushRef.current();
    const visible = () => {
      if (document.hidden) flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", visible);
    return () => {
      mounted.current = false;
      flush();
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [scope, key]);
  const clear = () => {
    cleared.current = true;
    try {
      removeDraft(scope, key);
    } catch {}
    setStored(undefined);
  };
  const discard = () => {
    clear();
    cleared.current = false;
    restore(original.current);
    setStatus("");
  };
  return {
    stored,
    status,
    problem,
    resume,
    discard,
    clear,
    flush: () => flushRef.current(),
  };
}
