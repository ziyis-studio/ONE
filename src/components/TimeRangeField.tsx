import { Clock3 } from "lucide-react";
import { DateTimeField, TimeOfDayField } from "./DateTimeField";
/** Direct editing keeps both ends visible; the command validates the zoned interval. */
export default function TimeRangeField({
  start,
  end,
  onStart,
  onEnd,
  today,
  disabled,
}: {
  start: string;
  end: string;
  onStart: (v: string) => void;
  onEnd: (v: string) => void;
  today: string;
  disabled: boolean;
}) {
  const date = start.slice(0, 10),
    sameDay = end.slice(0, 10) === date;
  return (
    <section className="time-range-field" aria-label="Time range">
      <div className="time-range-heading">
        <Clock3 size={16} />
        <strong>When</strong>
        <span>Set both times here</span>
      </div>
      <DateTimeField
        label="Date"
        value={date}
        today={today}
        disabled={disabled}
        required
        onChange={(next) => {
          onStart(next + "T" + start.slice(11));
          if (sameDay) onEnd(next + "T" + end.slice(11));
        }}
      />
      <div className="time-range-inputs">
        <TimeOfDayField
          label="Starts at"
          value={start.slice(11, 16)}
          required
          disabled={disabled}
          onChange={(time) => onStart(date + "T" + time)}
        />
        <span aria-hidden="true" className="time-range-arrow">
          →
        </span>
        <TimeOfDayField
          label="Ends at"
          value={end.slice(11, 16)}
          required
          disabled={disabled}
          onChange={(time) => onEnd(end.slice(0, 10) + "T" + time)}
        />
      </div>
      <details open={!sameDay}>
        <summary>Ends on a different date</summary>
        <DateTimeField
          label="End date"
          value={end.slice(0, 10)}
          today={today}
          disabled={disabled}
          required
          onChange={(next) => onEnd(next + "T" + end.slice(11))}
        />
      </details>
      <div className="time-duration-options" aria-label="Duration presets">
        {[30, 60, 90, 120].map((minutes) => (
          <button
            type="button"
            key={minutes}
            disabled={
              disabled || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(start)
            }
            onClick={() => {
              const next = new Date(start + ":00Z");
              next.setUTCMinutes(next.getUTCMinutes() + minutes);
              onEnd(next.toISOString().slice(0, 16));
            }}
          >
            {minutes < 60 ? minutes + " min" : minutes / 60 + " hr"}
          </button>
        ))}
      </div>
    </section>
  );
}
