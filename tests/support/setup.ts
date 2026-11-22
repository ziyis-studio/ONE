import { vi } from "vitest";
vi.mock("../../src/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/lib/api")>();
  const { createDemo } = await import("./demo");
  const { applyCommand } = await import("./domain/commands");
  const {
    recoveryPatch,
    restorePatch,
    parseBackup,
    copyBackup,
    mergeWorkspace,
  } = await import("./domain/recovery");
  return {
    ...original,
    api: async (path: string, token: string, options: RequestInit = {}) => {
      if (path.startsWith("/v1/weather"))
        return { temperature: 28, code: 2, updatedAt: "2026-11-19T12:00" };
      if (path === "/v1/sample/tag-graph") {
        const { tagGraph, tagGraphQuery } = await import("./tag-graph");
        const input = JSON.parse(String(options.body));
        return tagGraph(input.workspace, tagGraphQuery.parse(input.query));
      }
      if (path === "/v1/sample/activity-feed") {
        const { sampleActivityPage } = await import("./activity-feed");
        const input = JSON.parse(String(options.body));
        return sampleActivityPage(input.workspace, input.items, input.query);
      }
      if (path === "/v1/sample/meals") {
        const { mealDay } = await import("./meals");
        const input = JSON.parse(String(options.body));
        return mealDay(input.workspace, input.query);
      }
      if (path === "/v1/sample/insights") {
        const { workspaceInsights } = await import("./insights");
        const input = JSON.parse(String(options.body));
        return workspaceInsights(input.workspace, input.query);
      }
      if (!path.startsWith("/v1/sample"))
        return original.api(path, token, options);
      if (path.startsWith("/v1/sample?"))
        return createDemo(new URLSearchParams(path.split("?")[1]).get("zone")!);
      const input = JSON.parse(String(options.body));
      if (path.endsWith("/restore"))
        return { snapshot: restorePatch(input.workspace, input.patch) };
      if (path.endsWith("/import")) {
        const { backup, idMap } = await copyBackup(
          parseBackup(input.backup),
          "demo",
          input.asCopy ?? false,
        );
        return {
          snapshot: mergeWorkspace(input.workspace, backup.workspace),
          backup,
          idMap,
        };
      }
      if (path.endsWith("/activity")) {
        const e = input.entry;
        return {
          id: e.id,
          target_kind: e.kind,
          target_id: e.targetId,
          body: e.body.trim(),
          created_at: new Date().toISOString(),
        };
      }
      if (path.endsWith("/sessions")) return { snapshot: input.workspace };
      const result = applyCommand(input.workspace, input.command);
      return {
        ...result,
        patch: input.command.type.endsWith(".delete")
          ? recoveryPatch(input.workspace, result.snapshot)
          : null,
      };
    },
  };
});
