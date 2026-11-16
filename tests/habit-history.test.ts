import { describe, expect, it } from "vitest";
import { emptyWorkspace } from "../src/domain/model";
import type { Habit, HabitOccurrence } from "../src/domain/model";
import {
  habitDay,
  habitRange,
  indexHabitHistory,
} from "../src/lib/habit-history";
const habit: Habit = {
  id: "habit",
  title: "Reading",
  description: "",
  startsOn: "2026-11-01",
  endsOn: null,
  isoWeekdays: [1, 2, 3, 4, 5, 6, 7],
  timeZone: "Asia/Kuala_Lumpur",
  createdAt: "",
  updatedAt: "",
};
function occurrence(
  id: string,
  scheduledOn: string,
  plannedOn = scheduledOn,
): HabitOccurrence {
  return {
    id,
    habitId: habit.id,
    scheduledOn,
    plannedOn,
    timeZone: habit.timeZone,
    note: "",
    createdAt: "",
    updatedAt: "",
  };
}
describe("habit activity ranges", () => {
  it("uses complete weeks, real calendar months including leap days, and a rolling 30-day window", () => {
    expect(habitRange("week", "2026-11-16").days).toEqual([
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
      "2026-11-21",
      "2026-11-22",
    ]);
    const month = habitRange("month", "2024-02-20");
    expect(month.days).toHaveLength(29);
    expect(month.days.at(-1)).toBe("2024-02-29");
    expect(month.calendarDays.length % 7).toBe(0);
    expect(habitRange("30days", "2026-11-16").days).toHaveLength(30);
    expect(habitRange("30days", "2026-11-16").from).toBe("2026-10-18");
  });
  it("shows the schedule rule without creating records or assuming a completion", () => {
    const state = emptyWorkspace();
    const day = habitDay(indexHabitHistory(state), habit, "2026-11-16");
    expect(day.planned).toBe(1);
    expect(day.completed).toBe(0);
    expect(day.needsMaterialization).toBe(true);
    expect(state.occurrences).toHaveLength(0);
    const bounded = { ...habit, endsOn: "2026-11-15" };
    expect(
      habitDay(indexHabitHistory(state), bounded, "2026-11-16").planned,
    ).toBe(0);
  });
  it("does not resurrect a rescheduled occurrence on its original date", () => {
    const state = emptyWorkspace();
    state.occurrences.push(occurrence("moved", "2026-11-16", "2026-11-18"));
    const index = indexHabitHistory(state);
    expect(habitDay(index, habit, "2026-11-16").planned).toBe(0);
    const destination = habitDay(index, habit, "2026-11-18");
    expect(destination.planned).toBe(2);
    expect(destination.needsMaterialization).toBe(true);
  });
  it("aggregates multiple occurrences and preserves actual recording dates", () => {
    const state = emptyWorkspace();
    state.occurrences.push(
      occurrence("one", "2026-11-16"),
      occurrence("two", "2026-11-15", "2026-11-16"),
    );
    state.executions.push({
      id: "execution",
      habitId: habit.id,
      occurrenceId: "one",
      performedOn: "2026-11-17",
      note: "",
      createdAt: "",
      updatedAt: "",
    });
    const result = habitDay(indexHabitHistory(state), habit, "2026-11-16");
    expect(result.planned).toBe(2);
    expect(result.completed).toBe(1);
    expect(result.level).toBe(2);
    expect(result.needsMaterialization).toBe(false);
    expect(state.executions[0].performedOn).toBe("2026-11-17");
  });
});
