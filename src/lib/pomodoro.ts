export const POMODORO_MODES = {
  focus: { label: "Focus", seconds: 25 * 60 },
  short: { label: "Short break", seconds: 5 * 60 },
  long: { label: "Long break", seconds: 15 * 60 },
} as const;
export type PomodoroMode = keyof typeof POMODORO_MODES;
export type PomodoroState = {
  mode: PomodoroMode;
  status: "ready" | "running" | "paused" | "complete";
  remainingMs: number;
  endsAt: number | null;
  completedAt: number | null;
  focusCount: number;
  focusHistory: number[];
};
export function initialPomodoro(mode: PomodoroMode = "focus"): PomodoroState {
  return {
    mode,
    status: "ready",
    remainingMs: POMODORO_MODES[mode].seconds * 1000,
    endsAt: null,
    completedAt: null,
    focusCount: 0,
    focusHistory: [],
  };
}
export function remainingPomodoro(state: PomodoroState, now: number) {
  return state.status === "running" && state.endsAt !== null
    ? Math.max(
        0,
        Math.min(POMODORO_MODES[state.mode].seconds * 1000, state.endsAt - now),
      )
    : state.remainingMs;
}
export function settlePomodoro(
  state: PomodoroState,
  now: number,
): PomodoroState {
  if (state.status !== "running" || state.endsAt === null || state.endsAt > now)
    return state;
  return {
    ...state,
    status: "complete",
    remainingMs: 0,
    completedAt: state.endsAt,
    endsAt: null,
    focusCount: state.focusCount + (state.mode === "focus" ? 1 : 0),
    focusHistory:
      state.mode === "focus"
        ? [...state.focusHistory, state.endsAt].slice(-128)
        : state.focusHistory,
  };
}
export function nextPomodoroMode(state: PomodoroState): PomodoroMode {
  return state.mode !== "focus"
    ? "focus"
    : state.focusCount > 0 && state.focusCount % 4 === 0
      ? "long"
      : "short";
}
export function changePomodoroMode(
  state: PomodoroState,
  mode: PomodoroMode,
  now: number,
): PomodoroState {
  const settled = settlePomodoro(state, now);
  return {
    ...initialPomodoro(mode),
    focusCount: settled.focusCount,
    focusHistory: settled.focusHistory,
  };
}
export function startPomodoro(
  state: PomodoroState,
  now: number,
): PomodoroState {
  const settled = settlePomodoro(state, now);
  if (settled.status === "running") return settled;
  const next =
    settled.status === "complete"
      ? changePomodoroMode(settled, nextPomodoroMode(settled), now)
      : settled;
  return {
    ...next,
    status: "running",
    completedAt: null,
    endsAt: now + next.remainingMs,
  };
}
export function pausePomodoro(
  state: PomodoroState,
  now: number,
): PomodoroState {
  const settled = settlePomodoro(state, now);
  return settled.status === "running"
    ? {
        ...settled,
        status: "paused",
        remainingMs: remainingPomodoro(settled, now),
        endsAt: null,
      }
    : settled;
}
export function parsePomodoro(raw: string | null, now: number): PomodoroState {
  try {
    if (!raw || raw.length > 16000) return initialPomodoro();
    const saved = JSON.parse(raw),
      state = saved.state as PomodoroState;
    if (
      saved.version !== 1 ||
      !state ||
      !Object.hasOwn(POMODORO_MODES, state.mode) ||
      !["ready", "running", "paused", "complete"].includes(state.status)
    )
      return initialPomodoro();
    const duration = POMODORO_MODES[state.mode].seconds * 1000;
    if (
      !Number.isFinite(state.remainingMs) ||
      state.remainingMs < 0 ||
      state.remainingMs > duration ||
      !Number.isSafeInteger(state.focusCount) ||
      state.focusCount < 0 ||
      !Array.isArray(state.focusHistory) ||
      state.focusHistory.length > 128 ||
      state.focusHistory.length > state.focusCount ||
      !state.focusHistory.every(
        (time) => Number.isFinite(time) && time > 0 && time <= now + 60_000,
      )
    )
      return initialPomodoro();
    if (
      state.status === "running"
        ? !Number.isFinite(state.endsAt) ||
          state.endsAt! <= 0 ||
          state.endsAt! > now + duration + 60_000
        : state.endsAt !== null
    )
      return initialPomodoro();
    if (
      state.status === "complete"
        ? state.remainingMs !== 0 ||
          !Number.isFinite(state.completedAt) ||
          state.completedAt! <= 0
        : state.completedAt !== null
    )
      return initialPomodoro();
    if (state.status === "paused" && state.remainingMs === 0)
      return initialPomodoro();
    if (state.status === "ready" && state.remainingMs !== duration)
      return initialPomodoro();
    return state;
  } catch {
    return initialPomodoro();
  }
}
export function pomodoroTime(milliseconds: number) {
  const seconds = Math.ceil(milliseconds / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
