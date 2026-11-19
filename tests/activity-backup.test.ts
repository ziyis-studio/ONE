// @vitest-environment jsdom
import { beforeEach, test, expect, vi } from "vitest";
import { emptyWorkspace } from "../src/domain/model";
import { copyBackup, backupCopyId } from "./support/domain/recovery";
import {
  parsePortableBackup,
  restoreDrafts,
  completeBackup,
} from "../src/lib/backup";
import { readLogDrafts, saveLogDraft } from "../src/lib/activity";
vi.mock("../src/lib/auth", () => ({ supabase: { storage: {} } }));
beforeEach(() => localStorage.clear());
test("portable log drafts follow copied tasks with stable new entry identities and preserve current drafts", async () => {
  const task = crypto.randomUUID(),
    entry = crypto.randomUUID(),
    stamp = new Date().toISOString(),
    workspace = emptyWorkspace();
  workspace.tasks.push({
    id: task,
    title: "Task",
    description: "",
    projectId: null,
    deadline: null,
    startedAt: null,
    completedAt: null,
    createdAt: stamp,
    updatedAt: stamp,
  });
  const source = parsePortableBackup({
    app: "ONE",
    version: 2,
    id: crypto.randomUUID(),
    ownerId: "source",
    workspace,
    activity: [
      {
        id: crypto.randomUUID(),
        target_kind: "task",
        target_id: task,
        body: "Saved entry",
        created_at: stamp,
      },
    ],
    device: {
      logDrafts: [
        {
          kind: "task",
          targetId: task,
          entryId: entry,
          body: "Unsent draft",
          savedAt: stamp,
        },
      ],
    },
  });
  const { backup, idMap } = await copyBackup(source, "target", false);
  expect(backup.activity?.[0].target_id).toBe(idMap[task]);
  await restoreDrafts(source, "target", idMap);
  const restored = readLogDrafts("target")[0];
  expect(restored.targetId).toBe(idMap[task]);
  expect(restored.entryId).toBe(await backupCopyId("target", source.id, entry));
  expect(restored.entryId).not.toBe(entry);
  saveLogDraft("target", { ...restored, body: "Later local edit" });
  await restoreDrafts(source, "target", idMap);
  expect(readLogDrafts("target").map((d) => d.body)).toEqual([
    "Later local edit",
  ]);
  const exported = await completeBackup(backup, "target", {});
  expect(exported.activity?.[0].body).toBe("Saved entry");
  expect(exported.device.logDrafts?.[0].body).toBe("Later local edit");
});
