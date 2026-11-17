import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { dayKey } from "../domain/time";
import {
  changePomodoroMode,
  initialPomodoro,
  nextPomodoroMode,
  parsePomodoro,
  pausePomodoro,
  POMODORO_MODES,
  remainingPomodoro,
  settlePomodoro,
  startPomodoro,
} from "./pomodoro";
import type { PomodoroMode, PomodoroState, PomodoroRecord } from "./pomodoro";
import { usePomodoroRecords } from "./pomodoro-records";
import type { RecordSyncStatus } from "./pomodoro-records";
type Timer = {
  state: PomodoroState;
  remainingMs: number;
  completedToday: number;
  syncStatus: RecordSyncStatus;
  refreshRecords: () => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  selectMode: (mode: PomodoroMode) => void;
};
const Context = createContext<Timer | null>(null);
export function PomodoroProvider({
  children,
  scope,
  cloud = false,
  zone,
  today,
  notify,
  onDemoRecords,
  onSyncedBlocks,
}: {
  children: ReactNode;
  scope: string;
  cloud?: boolean;
  zone: string;
  today: string;
  notify: (message: string) => void;
  onDemoRecords?: (records: PomodoroRecord[]) => boolean;
  onSyncedBlocks?: (ids: string[]) => void;
}) {
  const key = "one-pomodoro-v1:" + scope;
  const [state, setState] = useState(() => {
    try {
      return parsePomodoro(localStorage.getItem(key), Date.now());
    } catch {
      return initialPomodoro();
    }
  });
  const [now, setNow] = useState(Date.now);
  const {
    records: cloudRecords,
    status: syncStatus,
    refresh: refreshRecords,
    linkedBlocks,
  } = usePomodoroRecords(scope, cloud, state.records, today, zone);
  useEffect(() => {
    if (cloud && linkedBlocks.length) onSyncedBlocks?.(linkedBlocks);
  }, [cloud, linkedBlocks, onSyncedBlocks]);
  useEffect(() => {
    if (cloud || !onDemoRecords) return;
    const pending = state.records.filter((record) => !record.timeBlockId);
    if (!pending.length || !onDemoRecords(pending)) return;
    const ids = new Set(pending.map((record) => record.id));
    setState((current) => ({
      ...current,
      records: current.records.map((record) =>
        ids.has(record.id) ? { ...record, timeBlockId: record.id } : record,
      ),
    }));
  }, [cloud, onDemoRecords, state.records]);
  const announced = useRef(
    state.status === "complete" ? state.completedAt : null,
  );
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify({ version: 1, state }));
    } catch {
      /* Timer remains usable for this visit. */
    }
  }, [key, state]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === key || event.key === null) {
        let raw = null;
        try {
          raw = localStorage.getItem(key);
        } catch {}
        setState(parsePomodoro(raw, Date.now()));
        setNow(Date.now());
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [key]);
  useEffect(() => {
    if (state.status !== "running") return;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      setState((current) => settlePomodoro(current, time));
    };
    const visible = () => {
      if (document.visibilityState !== "hidden") tick();
    };
    tick();
    const interval = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("focus", tick);
    };
  }, [state.status, state.endsAt]);
  useEffect(() => {
    if (state.status !== "complete" || announced.current === state.completedAt)
      return;
    announced.current = state.completedAt;
    notify(
      state.mode === "focus"
        ? `Focus complete. Time for a ${POMODORO_MODES[nextPomodoroMode(state)].label.toLowerCase()}.`
        : "Break complete. Ready for your next focus?",
    );
  }, [state, notify]);
  const start = useCallback(() => {
    const time = Date.now();
    const id = crypto.randomUUID();
    setNow(time);
    setState((current) => startPomodoro(current, time, id));
  }, []);
  const pause = useCallback(() => {
    const time = Date.now();
    setNow(time);
    setState((current) => pausePomodoro(current, time));
  }, []);
  const reset = useCallback(() => {
    setNow(Date.now());
    setState((current) =>
      changePomodoroMode(current, current.mode, Date.now()),
    );
  }, []);
  const selectMode = useCallback((mode: PomodoroMode) => {
    setNow(Date.now());
    setState((current) =>
      current.mode === mode
        ? current
        : changePomodoroMode(current, mode, Date.now()),
    );
  }, []);
  const remainingMs = remainingPomodoro(state, now);
  const completedToday = useMemo(
    () =>
      [
        ...new Set([
          ...state.focusHistory,
          ...cloudRecords
            .filter((record) => record.mode === "focus")
            .map((record) => record.completedAt),
        ]),
      ].filter((time) => dayKey(new Date(time), zone) === today).length,
    [state.focusHistory, cloudRecords, zone, today],
  );
  return (
    <Context.Provider
      value={{
        state,
        remainingMs,
        completedToday,
        syncStatus,
        refreshRecords,
        start,
        pause,
        reset,
        selectMode,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePomodoro() {
  const value = useContext(Context);
  if (!value) throw new Error("PomodoroProvider is required.");
  return value;
}
