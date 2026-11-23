import { useEffect, useRef } from "react";
import { useOne } from "./workspace";
import { recurrenceDates } from "../domain/task-recurrence";
import { addDays } from "../domain/time";

export function useRecurringTaskRange(from: string, to: string) {
  const { data, execute, busy, loading, error } = useOne();
  const attempted = useRef("");
  const revision = data.taskRecurrences
    .map((r) => r.id + r.updatedAt)
    .join(":");
  useEffect(() => {
    if (busy || loading || error || !data.taskRecurrences.length) return;
    const key = `${from}:${to}:${revision}`;
    if (attempted.current === key) return;
    const known = new Set(
      data.tasks
        .filter((t) => t.recurrenceId)
        .map((t) => `${t.recurrenceId}:${t.scheduledOn}`),
    );
    const missing = data.taskRecurrences.some(
      (r) =>
        r.active &&
        !data.projects.some((p) => p.id === r.projectId && p.completedAt) &&
        recurrenceDates(r.rule, from, to).some(
          (day) => !r.skippedOn.includes(day) && !known.has(`${r.id}:${day}`),
        ),
    );
    if (!missing) return;
    attempted.current = key;
    void execute({ type: "tasks.materialize", from, to }).catch((cause) => {
      // Another loader may have acquired the workspace lock in this render.
      if (
        cause instanceof Error &&
        cause.message === "Please wait for your previous change to finish."
      )
        attempted.current = "";
    });
  }, [
    from,
    to,
    revision,
    busy,
    loading,
    error,
    data.taskRecurrences,
    data.tasks,
    data.projects,
    execute,
  ]);
}
export function RecurringTasksLoader() {
  const { today } = useOne();
  useRecurringTaskRange(addDays(today, -14), addDays(today, 35));
  return null;
}
