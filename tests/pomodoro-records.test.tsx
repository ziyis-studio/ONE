// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
const mock = vi.hoisted(() => ({
  api: vi.fn(),
  accessToken: vi.fn().mockResolvedValue("owner-jwt"),
}));
vi.mock("../src/lib/api", () => mock);
import { usePomodoroRecords } from "../src/lib/pomodoro-records";
const record = {
  id: "00000000-0000-4000-8000-000000000002",
  mode: "focus" as const,
  startedAt: Date.parse("2026-11-17T00:00:00Z"),
  completedAt: Date.parse("2026-11-17T00:25:00Z"),
  durationSeconds: 1500,
};
const pending = [record],
  block = "00000000-0000-4000-8000-000000000003";
beforeEach(() => {
  mock.api.mockReset();
  mock.api.mockImplementation(async (_path, _token, options) =>
    options?.method === "POST"
      ? [{ time_block_id: block }]
      : [
          {
            id: record.id,
            mode: record.mode,
            started_at: new Date(record.startedAt).toISOString(),
            completed_at: new Date(record.completedAt).toISOString(),
            duration_seconds: 1500,
            time_block_id: block,
          },
        ],
  );
});
afterEach(cleanup);
test("synchronizes sessions only through Planner API, without a caller-supplied owner", async () => {
  const { result } = renderHook(() =>
    usePomodoroRecords(
      "owner",
      true,
      pending,
      "2026-11-17",
      "Asia/Kuala_Lumpur",
    ),
  );
  await waitFor(() => expect(result.current.status).toBe("saved"));
  expect(mock.api.mock.calls[0][0]).toBe("/v1/sessions");
  expect(mock.api.mock.calls[0][1]).toBe("owner-jwt");
  expect(JSON.parse(mock.api.mock.calls[0][2].body)).toEqual({
    timezone: "Asia/Kuala_Lumpur",
    records: [{ ...record, taskId: null, taskTitle: "" }],
  });
  expect(mock.api.mock.calls[1][0]).toBe(
    "/v1/sessions?day=2026-11-17&zone=Asia%2FKuala_Lumpur",
  );
  expect(result.current.records).toEqual([{ ...record, timeBlockId: block }]);
  expect(result.current.linkedBlocks).toEqual([block]);
});
test("sample mode skips account sync and reconnect reuses a stable completion identity", async () => {
  mock.api.mockRejectedValueOnce(new Error("Offline"));
  const { result, rerender } = renderHook(
    ({ enabled }) =>
      usePomodoroRecords(
        "owner",
        enabled,
        pending,
        "2026-11-17",
        "Asia/Kuala_Lumpur",
      ),
    { initialProps: { enabled: false } },
  );
  expect(mock.api).not.toHaveBeenCalled();
  rerender({ enabled: true });
  await waitFor(() => expect(result.current.status).toBe("offline"));
  act(() => window.dispatchEvent(new Event("online")));
  await waitFor(() => expect(result.current.status).toBe("saved"));
  expect(mock.api.mock.calls[0][2].body).toBe(mock.api.mock.calls[1][2].body);
  expect(pending).toEqual([record]);
});
