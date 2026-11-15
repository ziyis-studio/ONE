import { describe, it, expect, vi } from "vitest";
import { handleProxy } from "../api/proxy";
function request(
  path: string,
  method = "GET",
  body?: string,
  extra: Record<string, string> = {},
) {
  return new Request(
    "https://one.example/api/proxy?path=" + encodeURIComponent(path),
    {
      method,
      headers: {
        Authorization: "Bearer user-jwt",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...extra,
      },
      body,
    },
  );
}
describe("ONE authenticated transport", () => {
  it("forwards only the user token, command, revision, and fixed API destination", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json(
          { data: { snapshot: { tasks: [] } } },
          { headers: { ETag: "revision-2" } },
        ),
      );
    const response = await handleProxy(
      request(
        "/v1/commands",
        "POST",
        JSON.stringify({
          type: "task.update",
          id: "uuid",
          expectedUpdatedAt: "revision-1",
          patch: { title: "New title" },
        }),
        {
          Origin: "https://one.example",
          "If-Match": "revision-1",
          Cookie: "private-cookie=hidden",
        },
      ),
      transport,
    );
    expect(response.status).toBe(200);
    const [target, init] = transport.mock.calls[0];
    expect(String(target)).toBe(
      "https://planner-api-ziyis-studio.vercel.app/v1/commands",
    );
    const headers = new Headers(init?.headers);
    expect(headers.get("authorization")).toBe("Bearer user-jwt");
    expect(headers.get("if-match")).toBe("revision-1");
    expect(headers.has("cookie")).toBe(false);
    expect(headers.has("origin")).toBe(false);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("etag")).toBe("revision-2");
    expect(
      JSON.parse(new TextDecoder().decode(init?.body as ArrayBuffer))
        .expectedUpdatedAt,
    ).toBe("revision-1");
  });
  it("rejects foreign origins, arbitrary URLs, traversal, and missing identity before contacting the API", async () => {
    const transport = vi.fn<typeof fetch>();
    expect(
      (
        await handleProxy(
          request("/v1/commands", "POST", "{}", {
            Origin: "https://other.example",
          }),
          transport,
        )
      ).status,
    ).toBe(403);
    for (const path of [
      "https://evil.example",
      "/v1/tasks/../../admin",
      "/v1//tasks",
      "/auth/v1/admin/users",
    ])
      expect((await handleProxy(request(path), transport)).status).toBe(404);
    expect(
      (
        await handleProxy(
          new Request("https://one.example/api/proxy?path=/v1/workspace"),
          transport,
        )
      ).status,
    ).toBe(401);
    expect(transport).not.toHaveBeenCalled();
  });
  it("preserves conflicts and never retries an ambiguous write", async () => {
    const conflict = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json(
          { error: { code: "conflict", message: "Reload first." } },
          { status: 409 },
        ),
      );
    expect(
      (await handleProxy(request("/v1/commands", "POST", "{}"), conflict))
        .status,
    ).toBe(409);
    const failed = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("Connection interrupted after commit"));
    const response = await handleProxy(
      request("/v1/commands", "POST", "{}"),
      failed,
    );
    expect(response.status).toBe(503);
    expect(failed).toHaveBeenCalledTimes(1);
    expect((await response.json()).error.message).toContain(
      "refresh before retrying",
    );
  });
  it("bounds request sizes and keeps username login separate from business data", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ access_token: "user", refresh_token: "refresh" }),
      );
    expect(
      (
        await handleProxy(
          request("/v1/commands", "POST", "x".repeat(1_048_577)),
          transport,
        )
      ).status,
    ).toBe(413);
    const response = await handleProxy(
      request(
        "/username-login",
        "POST",
        JSON.stringify({ username: "test", password: "password" }),
      ),
      transport,
    );
    expect(response.status).toBe(200);
    const [target, init] = transport.mock.calls[0];
    expect(String(target)).toBe(
      "https://dwzwlqzsdozcsrrauggi.supabase.co/functions/v1/username-login",
    );
    expect(new Headers(init?.headers).get("apikey")).toMatch(
      /^sb_publishable_/,
    );
    expect(new Headers(init?.headers).has("authorization")).toBe(false);
  });
});
