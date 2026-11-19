import { useCallback, useEffect, useState } from "react";
import { api, accessToken } from "./api";
import type { PomodoroRecord } from "./pomodoro";

export type RecordSyncStatus = "local" | "syncing" | "saved" | "offline";
type Row = {
  id: string;
  mode: PomodoroRecord["mode"];
  started_at: string;
  completed_at: string;
  duration_seconds: number;
  time_block_id: string | null;
  task_id?: string | null;
  task_title?: string;
};

export function usePomodoroRecords(
  owner: string,
  enabled: boolean,
  pending: PomodoroRecord[],
  day: string,
  zone: string,
) {
  const [records, setRecords] = useState<PomodoroRecord[]>([]);
  const [status, setStatus] = useState<RecordSyncStatus>(
    enabled ? "syncing" : "local",
  );
  const [revision, setRevision] = useState(0);
  const [linkedBlocks, setLinkedBlocks] = useState<string[]>([]);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (!enabled) return;
    const visible = () => {
      if (!document.hidden) refresh();
    };
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [enabled, refresh]);
  useEffect(() => {
    if (!enabled) {
      setStatus("local");
      setRecords([]);
      return;
    }
    const controller = new AbortController();
    const sync = async () => {
      setStatus("syncing");
      try {
        let createdBlocks: string[] = [];
        if (pending.length) {
          const inserted = await api<{ time_block_id: string | null }[]>(
            "/v1/sessions",
            await accessToken(),
            {
              method: "POST",
              body: JSON.stringify({
                timezone: zone,
                records: pending.map((r) => ({
                  id: r.id,
                  mode: r.mode,
                  startedAt: r.startedAt,
                  completedAt: r.completedAt,
                  durationSeconds: r.durationSeconds,
                  taskId: r.taskId || null,
                  taskTitle: r.taskTitle || "",
                })),
              }),
              signal: controller.signal,
            },
          );
          createdBlocks = (inserted || [])
            .map((row: { time_block_id: string | null }) => row.time_block_id)
            .filter((id): id is string => !!id);
          if (!controller.signal.aborted && createdBlocks.length)
            setLinkedBlocks(createdBlocks);
        }
        const data = await api<Row[]>(
          "/v1/sessions?" + new URLSearchParams({ day, zone }),
          await accessToken(),
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) {
          setRecords(
            (data as Row[]).map((row) => ({
              id: row.id,
              mode: row.mode,
              startedAt: Date.parse(row.started_at),
              completedAt: Date.parse(row.completed_at),
              durationSeconds: row.duration_seconds,
              timeBlockId: row.time_block_id,
              ...(row.task_id ? { taskId: row.task_id } : {}),
              ...(row.task_title ? { taskTitle: row.task_title } : {}),
            })),
          );
          setLinkedBlocks([
            ...new Set([
              ...createdBlocks,
              ...(data as Row[])
                .map((row) => row.time_block_id)
                .filter((id): id is string => !!id),
            ]),
          ]);
          setStatus("saved");
        }
      } catch {
        if (!controller.signal.aborted) setStatus("offline");
      }
    };
    void sync();
    return () => controller.abort();
  }, [owner, enabled, pending, day, zone, revision]);
  return { records, status, refresh, linkedBlocks };
}
