import { Repeat2 } from "lucide-react";
import { SelectField } from "./SelectField";
import { DateTimeField, TimeOfDayField } from "./DateTimeField";
import { useOne } from "../lib/workspace";
import { useConfirm } from "../lib/confirmation";
import { addDays, dateLabel } from "../domain/time";
import {
  recurrenceDates,
  recurrenceLabel,
  recurrenceRuleSchema,
} from "../domain/task-recurrence";
import type { RecurrenceRule, TaskRecurrence } from "../domain/task-recurrence";
import "./task-repeat.css";

export default function TaskRepeatField({
  value,
  onChange,
  startDate,
  series,
  disabled,
}: {
  value: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
  startDate: string;
  series?: TaskRecurrence;
  disabled: boolean;
}) {
  const { today, zone, execute } = useOne();
  const confirm = useConfirm();
  if (series)
    return (
      <section className="task-repeat-field" aria-label="Repeat schedule">
        <div className="task-repeat-heading">
          <Repeat2 size={16} />
          <strong>{recurrenceLabel(series.rule)}</strong>
          <span>{series.active ? "Repeating" : "Stopped"}</span>
        </div>
        <p>
          {series.rule.time
            ? `${series.rule.time} · ${series.rule.duration} min · ${series.rule.timeZone}`
            : "All-day task"}
          {series.rule.endsOn
            ? ` · Until ${dateLabel(series.rule.endsOn)}`
            : ""}
        </p>
        <p>Each occurrence can be edited and completed separately.</p>
        {series.active && (
          <button
            type="button"
            className="secondary-button"
            disabled={disabled}
            onClick={async () => {
              if (
                !(await confirm({
                  title: "Stop repeating?",
                  description:
                    "No new occurrences will be created. Tasks and time blocks already on your schedule will stay.",
                  confirmLabel: "Stop repeating",
                }))
              )
                return;
              try {
                await execute({
                  type: "task.recurrence.stop",
                  id: series.id,
                  expectedUpdatedAt: series.updatedAt,
                });
              } catch {
                /* Workspace reports the error. */
              }
            }}
          >
            Stop repeating
          </button>
        )}
      </section>
    );
  const set = (patch: Partial<RecurrenceRule>) =>
    value && onChange({ ...value, ...patch });
  const valid = value && recurrenceRuleSchema.safeParse(value).success;
  const dates = valid
    ? recurrenceDates(
        value,
        value.startsOn,
        addDays(value.startsOn, 366),
      ).slice(0, 3)
    : [];
  return (
    <section className="task-repeat-field" aria-label="Repeat schedule">
      <SelectField
        label="Repeat"
        value={value?.frequency || "none"}
        disabled={disabled}
        onChange={(frequency) => {
          if (frequency === "none") return onChange(null);
          onChange({
            ...(value || {
              interval: 1,
              startsOn: startDate,
              endsOn: null,
              monthDay: Number(startDate.slice(8)),
              time: null,
              duration: 30,
              timeZone: zone,
            }),
            frequency: frequency as RecurrenceRule["frequency"],
          });
        }}
        options={[
          { value: "none", label: "Does not repeat" },
          { value: "daily", label: "Daily" },
          { value: "weekly", label: "Weekly" },
          { value: "monthly", label: "Monthly" },
        ]}
      />
      {value && (
        <>
          <div className="form-grid">
            <SelectField
              label="Every"
              value={String(value.interval)}
              onChange={(v) => set({ interval: Number(v) })}
              disabled={disabled}
              options={Array.from({ length: 12 }, (_, i) => ({
                value: String(i + 1),
                label: `${i + 1} ${value.frequency === "daily" ? "day" : value.frequency === "weekly" ? "week" : "month"}${i ? "s" : ""}`,
              }))}
            />
            {value.frequency === "monthly" && (
              <SelectField
                label="On"
                value={String(value.monthDay)}
                onChange={(v) =>
                  set({ monthDay: v === "last" ? "last" : Number(v) })
                }
                disabled={disabled}
                options={[
                  { value: "last", label: "Last day of the month" },
                  ...Array.from({ length: 31 }, (_, i) => ({
                    value: String(i + 1),
                    label: `Day ${i + 1}`,
                  })),
                ]}
              />
            )}
          </div>
          <div className="form-grid">
            <DateTimeField
              label="Repeat starts"
              value={value.startsOn}
              onChange={(v) => set({ startsOn: v })}
              today={today}
              disabled={disabled}
            />
            <DateTimeField
              label="Repeat ends · optional"
              value={value.endsOn || ""}
              onChange={(v) => set({ endsOn: v || null })}
              today={today}
              disabled={disabled}
            />
          </div>
          <label className="task-repeat-timed">
            <input
              type="checkbox"
              checked={value.time !== null}
              disabled={disabled}
              onChange={(e) => set({ time: e.target.checked ? "09:00" : null })}
            />
            Add a time block for each occurrence
          </label>
          {value.time !== null && (
            <div className="form-grid">
              <TimeOfDayField
                label="Repeat time"
                value={value.time}
                onChange={(time) => set({ time })}
                required
                disabled={disabled}
              />
              <SelectField
                label="Duration"
                value={String(value.duration)}
                onChange={(v) => set({ duration: Number(v) })}
                disabled={disabled}
                options={[15, 30, 45, 60, 90, 120].map((n) => ({
                  value: String(n),
                  label: `${n} min`,
                }))}
              />
            </div>
          )}
          <div className="task-repeat-preview" aria-live="polite">
            <span>
              <Repeat2 size={14} />
              Next occurrences
            </span>
            {dates.length ? (
              <div>
                {dates.map((d) => (
                  <time dateTime={d} key={d}>
                    {dateLabel(d)}
                    {value.time ? ` · ${value.time}` : ""}
                  </time>
                ))}
              </div>
            ) : (
              <p>
                Choose a valid start and end date with at least one occurrence.
              </p>
            )}
          </div>
          <p>
            Each occurrence has its own completion. Dates follow{" "}
            {value.timeZone}.
            {value.frequency === "monthly" &&
            value.monthDay !== "last" &&
            value.monthDay > 28
              ? " Shorter months use their last day."
              : ""}
          </p>
        </>
      )}
    </section>
  );
}
