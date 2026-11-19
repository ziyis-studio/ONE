import { test, expect } from "vitest";
import { plannedTaskIds } from "../src/lib/schedule";
import { emptyWorkspace } from "../src/domain/model";
const now = Date.parse("2026-11-19T04:00:00Z");
test("due dates, expired plans and actual focus do not count as an upcoming plan", () => {
  const state = emptyWorkspace();
  const base = {
    id: crypto.randomUUID(),
    title: "",
    description: "",
    startsAt: "2026-11-19T03:00:00Z",
    endsAt: "2026-11-19T05:00:00Z",
    timeZone: "Asia/Kuala_Lumpur",
    createdAt: "2026-11-19T00:00:00Z",
    updatedAt: "2026-11-19T00:00:00Z",
  };
  expect(plannedTaskIds(state, now).size).toBe(0);
  state.timeBlocks.push({ ...base, endsAt: "2026-11-19T03:30:00Z" });
  state.blockTaskLinks.push({ timeBlockId: base.id, taskId: "task" });
  expect(plannedTaskIds(state, now).has("task")).toBe(false);
  state.timeBlocks[0] = { ...base, recordedType: "focus" };
  expect(plannedTaskIds(state, now).has("task")).toBe(false);
  state.timeBlocks[0] = { ...base };
  expect(plannedTaskIds(state, now).has("task")).toBe(true);
  expect(plannedTaskIds(state, new Date(now)).has("task")).toBe(true);
});
