import { useEffect, useState } from "react";
import { api } from "./api";
import { useOne } from "./workspace";
import type { HabitInsights, SleepInsights } from "../domain/insights";
type Results = { sleep: SleepInsights; habits: HabitInsights };
export function useInsights<K extends keyof Results>(
  kind: K,
  from: string,
  to: string,
) {
  const { data, demo, zone, scope, session } = useOne();
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    value: Results[K];
  } | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const key = JSON.stringify([kind, from, to, zone, scope]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const query = { kind, from, to, zone };
    void api<Results[K]>(
      demo ? "/v1/sample/insights" : "/v1/insights",
      session?.access_token || "",
      {
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify(demo ? { workspace: data, query } : query),
      },
    )
      .then((value) => {
        if (!controller.signal.aborted) setResult({ key, value });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "Could not load insights.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [
    kind,
    from,
    to,
    zone,
    scope,
    demo,
    session?.access_token,
    data,
    version,
    key,
  ]);
  return {
    insights: result?.key === key ? result.value : null,
    loading,
    error,
    reload: () => setVersion((v) => v + 1),
  };
}
