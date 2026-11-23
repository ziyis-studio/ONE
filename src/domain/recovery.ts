import { activitySchema } from "./activity.js";
import type { ActivityLog } from "./activity.js";
import type { Workspace } from "./model.js";
import { parseWorkspace } from "./validation.js";
import { z } from "zod";
export const collections = [
  "tagCatalog",
  "projects",
  "taskRecurrences",
  "tasks",
  "conditions",
  "thoughts",
  "notes",
  "noteDatabases",
  "databaseRecords",
  "sleepRecords",
  "meals",
  "noteLinks",
  "habits",
  "occurrences",
  "executions",
  "timeBlocks",
  "thoughtTaskLinks",
  "thoughtProjectLinks",
  "blockTaskLinks",
  "blockOccurrenceLinks",
] as const;
const field = z
  .object({
    key: z
      .string()
      .regex(/^[a-z][A-Za-z0-9]*$/)
      .refine(
        (k) =>
          ![
            "__proto__",
            "constructor",
            "prototype",
            "id",
            "createdAt",
            "updatedAt",
          ].includes(k),
      ),
    hadBefore: z.boolean(),
    hadAfter: z.boolean(),
    before: z.unknown(),
    after: z.unknown(),
  })
  .strict();
export const recoveryPatchSchema = z
  .object({
    removed: z
      .record(z.string(), z.array(z.record(z.string(), z.unknown())).max(10000))
      .refine((v) =>
        Object.keys(v).every((k) =>
          (collections as readonly string[]).includes(k),
        ),
      ),
    changed: z
      .array(
        z
          .object({
            collection: z.enum(collections),
            key: z.string().max(1000),
            fields: z.array(field).max(100),
          })
          .strict(),
      )
      .max(10000),
  })
  .strict();
export type RecoveryPatch = z.infer<typeof recoveryPatchSchema>;
export type RecoveryEntry = {
  id: string;
  kind: string;
  title: string;
  deletedAt: string;
  restoredAt: string | null;
  patch?: RecoveryPatch;
};
export const sessionSchema = z
  .object({
    id: z.uuid(),
    mode: z.enum(["focus", "short", "long"]),
    started_at: z.iso.datetime({ offset: true }),
    completed_at: z.iso.datetime({ offset: true }),
    duration_seconds: z.number().int(),
    timezone: z.string().max(100).default("Asia/Kuala_Lumpur"),
    time_block_id: z.uuid().nullable().optional(),
    task_id: z.uuid().nullable().optional(),
    task_snapshot_id: z.uuid().nullable().optional(),
    task_title: z.string().max(300).default(""),
  })
  .strict()
  .refine(
    (r) =>
      r.duration_seconds === { focus: 1500, short: 300, long: 900 }[r.mode] &&
      Date.parse(r.completed_at) - Date.parse(r.started_at) >=
        r.duration_seconds * 1000,
    "Invalid focus duration",
  );
export type Backup = {
  app: "ONE";
  version: 2;
  id: string;
  ownerId: string;
  exportedAt: string;
  workspace: Workspace;
  sessions: z.infer<typeof sessionSchema>[];
  trash: RecoveryEntry[];
  activity?: ActivityLog[];
};
export function parseBackup(raw: unknown): Backup {
  const base = z
    .object({
      app: z.literal("ONE"),
      version: z.literal(2).optional(),
      id: z.uuid().optional(),
      ownerId: z.string().max(100).optional(),
      exportedAt: z.string().optional(),
      workspace: z.unknown(),
      activity: z.array(activitySchema).max(20000).default([]),
      sessions: z.array(sessionSchema).max(20000).default([]),
      trash: z
        .array(
          z
            .object({
              id: z.uuid(),
              kind: z.string().max(80),
              title: z.string().max(500),
              deletedAt: z.string(),
              restoredAt: z.string().nullable(),
              patch: recoveryPatchSchema,
            })
            .strict(),
        )
        .max(1000)
        .default([]),
    })
    .passthrough()
    .parse(raw);
  return {
    sessions: base.sessions,
    activity: base.activity,
    trash: base.trash,
    app: "ONE",
    version: 2,
    id: base.id ?? "00000000-0000-4000-8000-000000000000",
    ownerId: base.ownerId ?? "",
    exportedAt: base.exportedAt ?? new Date().toISOString(),
    workspace: parseWorkspace(base.workspace),
  };
}
export async function backupCopyId(
  owner: string,
  backupId: string,
  id: string,
) {
  const hash = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(owner + ":" + backupId + ":" + id),
    ),
  );
  hash[6] = (hash[6] & 15) | 64;
  hash[8] = (hash[8] & 63) | 128;
  const h = [...hash.slice(0, 16)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
