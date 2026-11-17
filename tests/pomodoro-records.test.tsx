// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
const api = vi.hoisted(() => ({
  from: vi.fn(),
  write: vi.fn(),
  read: vi.fn(),
  upsert: vi.fn(),
  eq: vi.fn(),
  gte: vi.fn(),
  lt: vi.fn(),
}));
vi.mock("../src/lib/auth", () => ({ supabase: { from: api.from } }));
import { usePomodoroRecords } from "../src/lib/pomodoro-records";
const owner = "00000000-0000-4000-8000-000000000001";
const record = {
  id: "00000000-0000-4000-8000-000000000002",
  mode: "focus" as const,
  startedAt: Date.parse("2026-11-17T00:00:00Z"),
  completedAt: Date.parse("2026-11-17T00:25:00Z"),
  durationSeconds: 1500,
};
const pending = [record];
beforeEach(() => {
  vi.clearAllMocks();
  api.write.mockResolvedValue({
    error: null,
    data: [{ time_block_id: "00000000-0000-4000-8000-000000000003" }],
  });
  api.read.mockResolvedValue({
    error: null,
    data: [
      {
        id: record.id,
        mode: record.mode,
        started_at: new Date(record.startedAt).toISOString(),
        completed_at: new Date(record.completedAt).toISOString(),
        duration_seconds: 1500,
        time_block_id: "00000000-0000-4000-8000-000000000003",
      },
    ],
  });
  const query: any = {};
  for (const name of ["eq", "gte", "lt"] as const) {
    api[name].mockImplementation(() => query);
    query[name] = api[name];
  }
  query.order = () => query;
  query.limit = () => query;
  query.abortSignal = () => api.read();
  api.upsert.mockImplementation(() => ({
    select: () => ({ abortSignal: () => api.write() }),
  }));
  api.from.mockReturnValue({ upsert: api.upsert, select: () => query });
});
afterEach(cleanup);
describe("Pomodoro account records", () => {
  it("saves stable session IDs idempotently and reads only the owner's workspace day", async () => {
    const { result } = renderHook(() =>
      usePomodoroRecords(
        owner,
        true,
        pending,
        "2026-11-17",
        "Asia/Kuala_Lumpur",
      ),
    );
    await waitFor(() => expect(result.current.status).toBe("saved"));
    expect(api.upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          owner_id: owner,
          id: record.id,
          duration_seconds: 1500,
        }),
      ],
      { onConflict: "owner_id,id", ignoreDuplicates: true },
    );
    expect(api.eq).toHaveBeenCalledWith("owner_id", owner);
    expect(api.gte).toHaveBeenCalledWith(
      "completed_at",
      "2026-11-16T16:00:00.000Z",
    );
    expect(api.lt).toHaveBeenCalledWith(
      "completed_at",
      "2026-11-17T16:00:00.000Z",
    );
    expect(result.current.records).toEqual([
      { ...record, timeBlockId: "00000000-0000-4000-8000-000000000003" },
    ]);
    expect(result.current.linkedBlocks).toEqual([
      "00000000-0000-4000-8000-000000000003",
    ]);
  });
  it("keeps demo local and retries the same completion after a network failure", async () => {
    api.write.mockResolvedValueOnce({ error: new Error("Offline") });
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        usePomodoroRecords(
          owner,
          enabled,
          pending,
          "2026-11-17",
          "Asia/Kuala_Lumpur",
        ),
      { initialProps: { enabled: false } },
    );
    expect(result.current.status).toBe("local");
    expect(api.from).not.toHaveBeenCalled();
    rerender({ enabled: true });
    await waitFor(() => expect(result.current.status).toBe("offline"));
    act(() => window.dispatchEvent(new Event("online")));
    await waitFor(() => expect(result.current.status).toBe("saved"));
    expect(api.upsert).toHaveBeenCalledTimes(2);
    expect(api.upsert.mock.calls[0]).toEqual(api.upsert.mock.calls[1]);
    expect(pending).toEqual([record]);
  });
});
