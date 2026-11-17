// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { createDemo } from "../src/lib/demo";
import { WorkspaceProvider, useOne } from "../src/lib/workspace";
import type { Session } from "@supabase/supabase-js";
const api = vi.hoisted(() => ({
  load: vi.fn(),
  send: vi.fn(),
  synced: undefined as undefined | ((ids: string[]) => void),
}));
vi.mock("../src/lib/api", () => ({
  loadWorkspace: api.load,
  sendCommand: api.send,
}));
vi.mock("../src/lib/auth", () => ({
  supabase: {
    auth: {
      getSession: async () => ({
        data: { session: { access_token: "test-token" } },
        error: null,
      }),
    },
  },
}));
vi.mock("../src/lib/pomodoro-context", () => ({
  PomodoroProvider: ({
    children,
    onSyncedBlocks,
  }: {
    children: ReactNode;
    onSyncedBlocks: (ids: string[]) => void;
  }) => {
    api.synced = onSyncedBlocks;
    return children;
  },
}));
function Observer() {
  const { data, loading, execute } = useOne();
  return (
    <>
      <output aria-label="Title">{data.tasks[0]?.title}</output>
      <output aria-label="Count">{data.timeBlocks.length}</output>
      <output aria-label="Loading">{String(loading)}</output>
      <button
        onClick={() =>
          void execute({
            type: "block.delete",
            id: data.timeBlocks[0].id,
            expectedUpdatedAt: data.timeBlocks[0].updatedAt,
          })
        }
      >
        Command
      </button>
    </>
  );
}
const session = {
  user: { id: "00000000-0000-4000-8000-000000000001" },
} as Session;
function snapshot() {
  return { ...createDemo("Asia/Kuala_Lumpur"), habits: [] };
}
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  location.hash = "/";
});
afterEach(cleanup);
describe("quiet Pomodoro schedule refresh", () => {
  it("loads new timeline blocks without showing the full loading view and skips already known links", async () => {
    const old = snapshot(),
      block = { ...old.timeBlocks[0], id: "new-pomodoro" },
      fresh = { ...old, timeBlocks: [...old.timeBlocks, block] };
    let finish!: (value: typeof fresh) => void;
    api.load
      .mockResolvedValueOnce(old)
      .mockImplementationOnce(
        () => new Promise((resolve) => (finish = resolve)),
      );
    render(
      <WorkspaceProvider demo={false} session={session}>
        <Observer />
      </WorkspaceProvider>,
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Loading").textContent).toBe("false"),
    );
    act(() => api.synced!([block.id]));
    await waitFor(() => expect(api.load).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText("Loading").textContent).toBe("false");
    await act(async () => finish(fresh));
    await waitFor(() =>
      expect(screen.getByLabelText("Count").textContent).toBe(
        String(fresh.timeBlocks.length),
      ),
    );
    act(() => api.synced!([block.id]));
    expect(api.load).toHaveBeenCalledTimes(2);
  });
  it("never replaces an in-flight user command with an older background snapshot", async () => {
    const old = snapshot(),
      block = { ...old.timeBlocks[0], id: "new-pomodoro" };
    const fresh = { ...old, timeBlocks: [...old.timeBlocks, block] },
      edited = {
        ...fresh,
        tasks: fresh.tasks.map((t, i) =>
          i === 0 ? { ...t, title: "User edit" } : t,
        ),
      };
    let finishRead!: (value: typeof fresh) => void,
      finishWrite!: (value: unknown) => void;
    api.load
      .mockResolvedValueOnce(old)
      .mockImplementationOnce(
        () => new Promise((resolve) => (finishRead = resolve)),
      );
    api.send.mockImplementationOnce(
      () => new Promise((resolve) => (finishWrite = resolve)),
    );
    render(
      <WorkspaceProvider demo={false} session={session}>
        <Observer />
      </WorkspaceProvider>,
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Loading").textContent).toBe("false"),
    );
    act(() => api.synced!([block.id]));
    await waitFor(() => expect(api.load).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole("button", { name: "Command" }));
    await waitFor(() => expect(api.send).toHaveBeenCalledTimes(1));
    await act(async () => finishWrite({ snapshot: edited }));
    await waitFor(() =>
      expect(screen.getByLabelText("Title").textContent).toBe("User edit"),
    );
    await act(async () => finishRead(fresh));
    expect(screen.getByLabelText("Title").textContent).toBe("User edit");
  });
});
