import { useCallback, useEffect, useState } from "react";
import { supabase } from "./auth";
import { dayBounds } from "../domain/time";
import type { PomodoroRecord } from "./pomodoro";

export type RecordSyncStatus = "local" | "syncing" | "saved" | "offline";
type Row = {
  id: string;
  mode: PomodoroRecord["mode"];
  started_at: string;
  completed_at: string;
  duration_seconds: number;
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
        if (pending.length) {
          const { error } = await supabase
            .from("pomodoro_sessions")
            .upsert(
              pending.map((record) => ({
                owner_id: owner,
                id: record.id,
                mode: record.mode,
                started_at: new Date(record.startedAt).toISOString(),
                completed_at: new Date(record.completedAt).toISOString(),
                duration_seconds: record.durationSeconds,
              })),
              { onConflict: "owner_id,id", ignoreDuplicates: true },
            )
            .abortSignal(controller.signal);
          if (error) throw error;
        }
        const [start, end] = dayBounds(day, zone);
        const { data, error } = await supabase
          .from("pomodoro_sessions")
          .select("id,mode,started_at,completed_at,duration_seconds")
          .eq("owner_id", owner)
          .gte("completed_at", new Date(start).toISOString())
          .lt("completed_at", new Date(end).toISOString())
          .order("completed_at")
          .limit(1000)
          .abortSignal(controller.signal);
        if (error) throw error;
        if (!controller.signal.aborted) {
          setRecords(
            (data as Row[]).map((row) => ({
              id: row.id,
              mode: row.mode,
              startedAt: Date.parse(row.started_at),
              completedAt: Date.parse(row.completed_at),
              durationSeconds: row.duration_seconds,
            })),
          );
          setStatus("saved");
        }
      } catch {
        if (!controller.signal.aborted) setStatus("offline");
      }
    };
    void sync();
    return () => controller.abort();
  }, [owner, enabled, pending, day, zone, revision]);
  return { records, status, refresh };
}
