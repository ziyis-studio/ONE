import { logDraftSchema, readLogDrafts, saveLogDraft } from "./activity";
import type { LogDraft } from "./activity";
import { z } from "zod";
import { parseBackup, backupCopyId } from "../domain/recovery";
import type { Backup } from "../domain/recovery";
import { draftSchema, readDrafts, saveDraft, draftKey } from "./drafts";
import type { EditorDraft } from "./drafts";
import { parsePomodoro } from "./pomodoro";
import { imageReferences, imageKey, validateStoredImage } from "./image-store";
import { supabase } from "./auth";
export type DeviceData = {
  drafts: EditorDraft[];
  logDrafts?: LogDraft[];
  preferences: { primaryColor?: string; timeZone?: string };
};
export type PortableBackup = Backup & {
  device: DeviceData;
  images: { ref: string; type: string; base64: string }[];
};
export const BACKUP_LIMIT = 50 * 1024 * 1024;
export function parsePortableBackup(raw: unknown): PortableBackup {
  const core = parseBackup(raw);
  const extra = z
    .object({
      device: z
        .object({
          drafts: z.array(draftSchema).max(1000).default([]),
          logDrafts: z.array(logDraftSchema).max(1000).default([]),
          preferences: z
            .object({
              primaryColor: z.string().max(10).optional(),
              timeZone: z.string().max(100).optional(),
            })
            .default({}),
        })
        .default({ drafts: [], logDrafts: [], preferences: {} }),
      images: z
        .array(
          z
            .object({
              ref: z.string().refine((r) => !!imageKey(r)),
              type: z.string().max(40),
              base64: z.string().max(7_000_000),
            })
            .strict(),
        )
        .max(1000)
        .default([]),
    })
    .passthrough()
    .parse(raw);
  if (new Set(extra.images.map((i) => i.ref)).size !== extra.images.length)
    throw new Error("The backup contains duplicate image identities.");
  const wanted = new Set(
    imageReferences(
      JSON.stringify([
        core.workspace,
        core.trash,
        core.activity,
        extra.device.drafts,
        extra.device.logDrafts,
      ]),
    ),
  );
  if (extra.images.some((i) => !wanted.has(i.ref)))
    throw new Error("The backup contains unreferenced images.");
  // Legacy exports may contain external image URLs. Owned image references need their files.
  if ([...wanted].some((ref) => !extra.images.some((i) => i.ref === ref)))
    throw new Error(
      "This backup is missing an attached image. Export a new complete backup.",
    );
  return { ...core, device: extra.device, images: extra.images };
}
function encode(bytes: Uint8Array) {
  let raw = "";
  for (let i = 0; i < bytes.length; i += 8192)
    raw += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(raw);
}
function decode(base64: string) {
  let raw: string;
  try {
    raw = atob(base64);
  } catch {
    throw new Error("An attached image is invalid.");
  }
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
export async function completeBackup(
  core: Backup,
  scope: string,
  preferences: DeviceData["preferences"],
): Promise<PortableBackup> {
  const timer = parsePomodoro(
    localStorage.getItem("one-pomodoro-v1:" + scope),
    Date.now(),
  );
  const sessions = [...core.sessions];
  const known = new Set(sessions.map((s) => s.id));
  for (const r of timer.records)
    if (!known.has(r.id)) {
      sessions.push({
        id: r.id,
        mode: r.mode,
        started_at: new Date(r.startedAt).toISOString(),
        completed_at: new Date(r.completedAt).toISOString(),
        duration_seconds: r.durationSeconds,
        timezone: preferences.timeZone || "Asia/Kuala_Lumpur",
        time_block_id:
          core.workspace.timeBlocks.find((b) => b.sourceSessionId === r.id)
            ?.id ?? (scope === "demo" ? null : (r.timeBlockId ?? r.id)),
        task_id: r.taskId || null,
        task_snapshot_id: r.taskId || null,
        task_title: r.taskTitle || "",
      });
      known.add(r.id);
    }
  const result: PortableBackup = {
    ...core,
    sessions,
    device: {
      drafts: readDrafts(scope),
      logDrafts: readLogDrafts(scope),
      preferences,
    },
    images: [],
  };
  for (const ref of imageReferences(
    JSON.stringify([
      core.workspace,
      core.trash,
      core.activity,
      result.device.drafts,
      result.device.logDrafts,
    ]),
  )) {
    if (scope === "demo")
      throw new Error(
        "Attached cloud images cannot be exported from the sample workspace.",
      );
    const { data, error } = await supabase.storage
      .from("planner-images")
      .download(scope + "/" + imageKey(ref));
    if (error || !data)
      throw new Error(
        "An attached image could not be downloaded. Your backup was not created; retry when connected.",
      );
    await validateStoredImage(ref, data);
    result.images.push({
      ref,
      type: data.type,
      base64: encode(new Uint8Array(await data.arrayBuffer())),
    });
    if (JSON.stringify(result).length > BACKUP_LIMIT)
      throw new Error("This backup exceeds the 50 MB file limit.");
  }
  return result;
}
export async function restoreImages(backup: PortableBackup, scope: string) {
  if (scope === "demo" && backup.images.length)
    throw new Error("Sign in to restore a backup with attached cloud images.");
  // Validate all files before making any upload.
  const files = await Promise.all(
    backup.images.map(async (i) => {
      const blob = new Blob([decode(i.base64)], { type: i.type });
      await validateStoredImage(i.ref, blob);
      return { ...i, blob };
    }),
  );
  const hash = async (b: Blob) =>
    encode(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", await b.arrayBuffer()),
      ),
    );
  for (const file of files) {
    const path = scope + "/" + imageKey(file.ref);
    const { data, error } = await supabase.storage
      .from("planner-images")
      .download(path);
    if (data) {
      if ((await hash(data)) !== (await hash(file.blob)))
        throw new Error(
          "An image with this identity has different contents. Your current image was kept.",
        );
      continue;
    }
    if (
      error &&
      !["404", "400"].includes(
        String((error as any).statusCode ?? (error as any).status),
      )
    )
      throw new Error("Could not check attached images. Retry when connected.");
    const { error: upload } = await supabase.storage
      .from("planner-images")
      .upload(path, file.blob, { upsert: false, contentType: file.type });
    if (upload) {
      const { data: other } = await supabase.storage
        .from("planner-images")
        .download(path);
      if (!other || (await hash(other)) !== (await hash(file.blob)))
        throw new Error(
          "Could not restore an attached image. Retry the import.",
        );
    }
  }
}
export async function restoreDrafts(
  backup: PortableBackup,
  scope: string,
  map: Record<string, string>,
) {
  const refs = new Set(["id", "projectId", "taskId", "databaseId", "noteId"]);
  const remap = (v: any, key = ""): any =>
    Array.isArray(v)
      ? v.map((x) => remap(x, key === "taskIds" ? "taskId" : ""))
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.entries(v).map(([k, x]) => [
              key === "values" ? (map[k] ?? k) : k,
              remap(x, k),
            ]),
          )
        : typeof v === "string" && refs.has(key)
          ? (map[v] ?? v)
          : v;
  const known = new Set(readDrafts(scope).map((d) => d.key));
  let restored = 0;
  for (const source of backup.device.drafts) {
    const draft = remap(source) as EditorDraft;
    draft.key = draftKey(draft.editor);
    if (Object.keys(map).length) delete draft.revision;
    if (!known.has(draft.key)) {
      saveDraft(scope, draft);
      known.add(draft.key);
      restored++;
    }
  }
  const current = readLogDrafts(scope);
  for (const source of backup.device.logDrafts || []) {
    const draft = {
      ...source,
      targetId: map[source.targetId] ?? source.targetId,
      entryId:
        map[source.entryId] ??
        (Object.keys(map).length
          ? await backupCopyId(scope, backup.id, source.entryId)
          : source.entryId),
    };
    if (
      !current.some(
        (d) => d.kind === draft.kind && d.targetId === draft.targetId,
      )
    ) {
      saveLogDraft(scope, draft);
      current.push(draft);
      restored++;
    }
  }
  return restored;
}

export function restoreLocalHistory(
  backup: Backup,
  scope: string,
  map: Record<string, string>,
) {
  if (scope !== "demo") return;
  const key = "one-pomodoro-v1:" + scope;
  const state = parsePomodoro(localStorage.getItem(key), Date.now());
  const known = new Set(state.records.map((r) => r.id));
  const records = backup.sessions
    .filter((r) => !known.has(map[r.id] ?? r.id))
    .map((r) => ({
      id: map[r.id] ?? r.id,
      mode: r.mode,
      startedAt: Date.parse(r.started_at),
      completedAt: Date.parse(r.completed_at),
      durationSeconds: r.duration_seconds,
      timeBlockId: r.time_block_id
        ? (map[r.time_block_id] ?? r.time_block_id)
        : null,
      taskId: r.task_id ? (map[r.task_id] ?? r.task_id) : null,
      taskTitle: r.task_title,
    }));
  const all = [...state.records, ...records]
    .sort((a, b) => a.completedAt - b.completedAt)
    .slice(-128);
  const history = [
    ...new Set([
      ...state.focusHistory,
      ...records.filter((r) => r.mode === "focus").map((r) => r.completedAt),
    ]),
  ]
    .sort((a, b) => a - b)
    .slice(-128);
  localStorage.setItem(
    key,
    JSON.stringify({
      version: 1,
      state: {
        ...state,
        records: all,
        focusHistory: history,
        focusCount: Math.max(state.focusCount, history.length),
      },
    }),
  );
  window.dispatchEvent(new StorageEvent("storage", { key }));
}
