import { z } from "zod";
import { activitySchema } from "../domain/activity";
import type { ActivityLog } from "../domain/activity";
export type LogKind = "task" | "project";
export const activityKey = (scope: string) => "one-activity-v1:" + scope;
export const logDraftKey = (scope: string) => "one-log-drafts-v1:" + scope;
export const logDraftSchema = z
  .object({
    kind: z.enum(["task", "project"]),
    targetId: z.uuid(),
    entryId: z.uuid(),
    body: z.string().max(10000),
    savedAt: z.string(),
  })
  .strict();
export type LogDraft = z.infer<typeof logDraftSchema>;
export function readActivities(scope: string): ActivityLog[] {
  try {
    return z
      .array(activitySchema)
      .parse(JSON.parse(localStorage.getItem(activityKey(scope)) || "[]"));
  } catch {
    return [];
  }
}
export function storeActivities(scope: string, items: ActivityLog[]) {
  localStorage.setItem(activityKey(scope), JSON.stringify(items));
}
export function readLogDrafts(scope: string): LogDraft[] {
  try {
    return z
      .array(logDraftSchema)
      .parse(JSON.parse(localStorage.getItem(logDraftKey(scope)) || "[]"));
  } catch {
    return [];
  }
}
export function saveLogDraft(scope: string, draft: LogDraft) {
  const others = readLogDrafts(scope).filter(
    (d) => !(d.kind === draft.kind && d.targetId === draft.targetId),
  );
  localStorage.setItem(logDraftKey(scope), JSON.stringify([...others, draft]));
}
export function clearLogDraft(
  scope: string,
  kind: LogKind,
  id: string,
  entryId?: string,
  body?: string,
) {
  const remaining = readLogDrafts(scope).filter(
    (d) =>
      !(
        d.kind === kind &&
        d.targetId === id &&
        (!entryId || d.entryId === entryId) &&
        (!body || d.body.trim() === body.trim())
      ),
  );
  localStorage.setItem(logDraftKey(scope), JSON.stringify(remaining));
}
export function compareLogs(a: ActivityLog, b: ActivityLog) {
  return (
    Date.parse(a.created_at) - Date.parse(b.created_at) ||
    a.id.localeCompare(b.id)
  );
}
export function mergeLogs(...groups: ActivityLog[][]) {
  return [...new Map(groups.flat().map((row) => [row.id, row])).values()].sort(
    compareLogs,
  );
}
