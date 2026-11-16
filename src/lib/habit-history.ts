import type {
  Habit,
  HabitExecution,
  HabitOccurrence,
  Workspace,
} from "../domain/model";
import { addDays, addMonths, isoWeekday, weekDays } from "../domain/time";

export type HabitRangePreset = "week" | "month" | "30days";
export function habitRange(preset: HabitRangePreset, today: string) {
  const from =
    preset === "week"
      ? weekDays(today)[0]
      : preset === "month"
        ? today.slice(0, 7) + "-01"
        : addDays(today, -29);
  const to =
    preset === "week"
      ? weekDays(today)[6]
      : preset === "month"
        ? addDays(addMonths(from, 1), -1)
        : today;
  const count = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
  const days = Array.from({ length: count }, (_, index) =>
    addDays(from, index),
  );
  const start = weekDays(from)[0],
    end = weekDays(to)[6];
  const calendarCount =
    Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
  return {
    from,
    to,
    days,
    calendarDays: Array.from({ length: calendarCount }, (_, index) =>
      addDays(start, index),
    ),
  };
}
export function indexHabitHistory(workspace: Workspace) {
  const planned = new Map<string, HabitOccurrence[]>();
  const scheduled = new Set<string>();
  const executions = new Map<string, HabitExecution>();
  for (const occurrence of workspace.occurrences) {
    const key = occurrence.habitId + ":" + occurrence.plannedOn;
    planned.set(key, [...(planned.get(key) || []), occurrence]);
    scheduled.add(occurrence.habitId + ":" + occurrence.scheduledOn);
  }
  for (const execution of workspace.executions)
    executions.set(execution.occurrenceId, execution);
  return { planned, scheduled, executions };
}
export function habitDay(
  index: ReturnType<typeof indexHabitHistory>,
  habit: Habit,
  date: string,
) {
  const key = habit.id + ":" + date;
  const occurrences = index.planned.get(key) || [];
  const followsRule =
    date >= habit.startsOn &&
    (!habit.endsOn || date <= habit.endsOn) &&
    habit.isoWeekdays.includes(isoWeekday(date));
  // A moved occurrence must not reappear on its original date. Unmaterialized
  // dates can display the schedule rule; actual completion always uses the API.
  const needsMaterialization = followsRule && !index.scheduled.has(key);
  const planned = occurrences.length + Number(needsMaterialization);
  const completed = occurrences.filter((occurrence) =>
    index.executions.has(occurrence.id),
  ).length;
  const level = !planned ? 0 : !completed ? 1 : completed < planned ? 2 : 3;
  return { date, occurrences, planned, completed, needsMaterialization, level };
}
