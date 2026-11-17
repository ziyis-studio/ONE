import { test, expect, vi } from "vitest";
import { api } from "../src/lib/api";
test("preserves recovery pagination through the same-origin route allowlist", async () => {
  const fetch = vi.fn(async (_input:RequestInfo|URL,_options?:RequestInit) => Response.json({ data: [] }));
  vi.stubGlobal("fetch", fetch);
  try {
    await api("/v1/recovery?offset=50", "token");
    const url = new URL(String(fetch.mock.calls[0][0]), "http://localhost");
    expect(url.searchParams.get("path")).toBe("/v1/recovery");
    expect(url.searchParams.get("offset")).toBe("50");
  } finally {
    vi.unstubAllGlobals();
  }
});
