import { expect, test } from "vitest";
import {
  initialPomodoro,
  focusTaskPomodoro,
  pausePomodoro,
  settlePomodoro,
  parsePomodoro,
  startPomodoro,
} from "../src/lib/pomodoro";
const now = Date.parse("2026-11-17T02:00:00Z");
test("task focus resumes the same session and stores an immutable task title snapshot", () => {
  const task = { id: crypto.randomUUID(), title: "Finish exam" };
  let state = focusTaskPomodoro(initialPomodoro(), task, now);
  const id = state.sessionId;
  state = pausePomodoro(state, now + 60000);
  state = focusTaskPomodoro(
    state,
    { ...task, title: "Finish Telus exam" },
    now + 120000,
  );
  expect(state.sessionId).toBe(id);
  expect(state.remainingMs).toBe(24 * 60000);
  state = settlePomodoro(state, state.endsAt!);
  expect(state.records).toHaveLength(1);
  expect(state.records[0]).toMatchObject({
    id,
    taskId: task.id,
    taskTitle: "Finish Telus exam",
  });
  state = startPomodoro(state, now + 30 * 60000);
  expect(state.mode).toBe("short");
  state = settlePomodoro(state, state.endsAt!);
  expect(state.records[1]).toMatchObject({ taskId: null, taskTitle: "" });
  expect(
    parsePomodoro(JSON.stringify({ version: 1, state }), now + 40 * 60000)
      .records[0].taskId,
  ).toBe(task.id);
});
