// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Session } from "@supabase/supabase-js";
import { WorkspaceProvider, useOne } from "../src/lib/workspace";
import { emptyWorkspace } from "../src/domain/model";
const { getSession } = vi.hoisted(() => ({
  getSession: vi.fn(async () => ({
    data: { session: { access_token: "current-user-token" } },
    error: null,
  })),
}));
vi.mock("../src/lib/auth", () => ({ supabase: { auth: { getSession } } }));
const session = {
  access_token: "current-user-token",
  user: { id: "user-id" },
} as Session;
function Harness() {
  const { data, loading, error, execute, notice } = useOne();
  return (
    <div>
      <span>{loading ? "Loading" : error || "Loaded"}</span>
      <span data-testid="tasks">
        {data.tasks.map((t) => t.title).join(",")}
      </span>
      <button
        onClick={() =>
          void execute({
            type: "task.create",
            input: { title: "Cloud task" },
          }).catch(() => {})
        }
      >
        Add cloud task
      </button>
      {notice && <p role="alert">{notice.message}</p>}
    </div>
  );
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});
describe("authenticated workspace boundary", () => {
  it("sends a bearer token and renders the authoritative snapshot after a command", async () => {
    const next = emptyWorkspace();
    next.tasks.push({
      id: crypto.randomUUID(),
      title: "Cloud task",
      description: "",
      projectId: null,
      completedAt: null,
      createdAt: "2026-11-16T00:00:00Z",
      updatedAt: "2026-11-16T00:00:00Z",
    });
    const transport = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ data: emptyWorkspace() }))
      .mockResolvedValueOnce(Response.json({ data: { snapshot: next } }));
    vi.stubGlobal("fetch", transport);
    render(
      <WorkspaceProvider session={session} demo={false}>
        <Harness />
      </WorkspaceProvider>,
    );
    await screen.findByText("Loaded");
    await userEvent.click(
      screen.getByRole("button", { name: "Add cloud task" }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("tasks").textContent).toBe("Cloud task"),
    );
    expect(
      new Headers(transport.mock.calls[0][1].headers).get("Authorization"),
    ).toBe("Bearer current-user-token");
    expect(JSON.parse(transport.mock.calls[1][1].body)).toEqual({
      type: "task.create",
      input: { title: "Cloud task" },
    });
    expect(localStorage.getItem("one-demo-v1")).toBe(null);
  });
  it("shows cloud failures without loading or persisting sample data", async () => {
    const transport = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { error: { code: "unauthorized", message: "Please sign in again." } },
          { status: 401 },
        ),
      );
    vi.stubGlobal("fetch", transport);
    render(
      <WorkspaceProvider session={session} demo={false}>
        <Harness />
      </WorkspaceProvider>,
    );
    await screen.findByText("Please sign in again.");
    expect(screen.getByTestId("tasks").textContent).toBe("");
    expect(localStorage.getItem("one-demo-v1")).toBe(null);
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("keeps the existing snapshot after an uncertain write and does not retry it", async () => {
    const transport = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ data: emptyWorkspace() }))
      .mockRejectedValueOnce(
        new Error("Network interrupted. Refresh before retrying."),
      );
    vi.stubGlobal("fetch", transport);
    render(
      <WorkspaceProvider session={session} demo={false}>
        <Harness />
      </WorkspaceProvider>,
    );
    await screen.findByText("Loaded");
    await userEvent.click(
      screen.getByRole("button", { name: "Add cloud task" }),
    );
    await screen.findByRole("alert");
    expect(screen.getByTestId("tasks").textContent).toBe("");
    expect(transport).toHaveBeenCalledTimes(2);
  });
});
