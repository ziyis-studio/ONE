import { expect, test, vi, afterEach } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { api } from "../src/lib/api";
afterEach(() => vi.unstubAllGlobals());
test("frontend uses declarative routing and ships no API function", () => {
  const config = JSON.parse(
    readFileSync(new URL("../vercel.json", import.meta.url), "utf8"),
  );
  expect(config.functions).toBeUndefined();
  expect(config.rewrites).toContainEqual({
    source: "/api/:path*",
    destination: "https://planner-api-ziyis-studio.vercel.app/:path*",
  });
  expect(existsSync(new URL("../api/proxy.ts", import.meta.url))).toBe(false);
});
test("keeps collection queries and the caller's bearer token", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ data: [] }));
  vi.stubGlobal("fetch", fetch);
  await api("/v1/tasks?q=hello&limit=2", "user-token");
  expect(fetch.mock.calls[0][0]).toBe("/api/v1/tasks?q=hello&limit=2");
  expect(new Headers(fetch.mock.calls[0][1].headers).get("Authorization")).toBe(
    "Bearer user-token",
  );
});

test("production frontend has no database calls or business command implementation", () => {
  const scan = (dir: URL): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? scan(new URL(entry.name + "/", dir))
        : /\.tsx?$/.test(entry.name)
          ? [readFileSync(new URL(entry.name, dir), "utf8")]
          : [],
    );
  const code = scan(new URL("../src/", import.meta.url)).join("\n");
  expect(code).not.toMatch(/supabase\s*\.\s*(from|rpc|storage)\b/);
  expect(code).not.toMatch(
    /(function|const)\s+(applyCommand|recoveryPatch|restorePatch|mergeWorkspace|copyBackup|reconcileHabitStarts)\b/,
  );
});
