import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Moon } from "lucide-react";
import { useOne } from "../lib/workspace";
import { useMotionPreference } from "../lib/motion-preference";
import { addDays, dateLabel, timeKey } from "../domain/time";
import { sleepByDay, sleepDuration } from "../lib/sleep-history";
import { Card, Empty } from "./ui";
import { useSettle } from "./interactions";
export default function OverviewSleepCard() {
  const { data, today, zone, edit, navigate } = useOne();
  const transition = useSettle(),
    reduced = useMotionPreference();
  const [hover, setHover] = useState<string | null>(null),
    [focus, setFocus] = useState<string | null>(null);
  const history = sleepByDay(data.sleepRecords, zone),
    days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const recent = [...history.keys()]
    .filter((d) => d <= today)
    .sort()
    .at(-1);
  const active = hover || focus || recent || today,
    day = history.get(active),
    minutes = day?.minutes;
  const record = day?.records.length === 1 ? day.records[0] : undefined;
  return (
    <Card title="Sleep" action={() => navigate("sleep")} className="sleep-card">
      {recent ? (
        <>
          <div className="sleep-readout" data-sleep-day={active}>
            <Moon size={17} aria-hidden="true" />
            <AnimatePresence initial={false} mode="popLayout">
              <motion.strong
                key={minutes ?? "empty"}
                initial={{ opacity: 0, y: reduced ? 0 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduced ? 0 : -6 }}
                transition={{ duration: reduced ? 0 : 0.17 }}
              >
                {minutes === undefined ? (
                  "—"
                ) : (
                  <>
                    {Math.floor(minutes / 60)}
                    <small>h</small> {minutes % 60}
                    <small>m</small>
                  </>
                )}
              </motion.strong>
            </AnimatePresence>
          </div>
          <p className="sleep-caption">
            <span className="sleep-selected-date">
              {active === today
                ? "Today"
                : dateLabel(active, { month: "short", day: "numeric" })}
            </span>{" "}
            ·{" "}
            {record
              ? `${timeKey(record.startsAt, zone)} – ${timeKey(record.endsAt, zone)}`
              : day
                ? `${day.records.length} entries`
                : "No sleep logged"}
            {day && <span> · net sleep</span>}
          </p>
          <div
            className="sleep-chart"
            role="group"
            aria-label="Your recent sleep durations"
            onPointerLeave={() => setHover(null)}
          >
            {days.map((date) => {
              const value = history.get(date);
              return (
                <button
                  key={date}
                  type="button"
                  data-today={date === today || undefined}
                  data-active={date === active || undefined}
                  aria-label={
                    dateLabel(date, {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    }) +
                    " · " +
                    (value
                      ? sleepDuration(value.minutes) + " net sleep"
                      : "No sleep logged")
                  }
                  onPointerEnter={(e) => {
                    if (e.pointerType !== "touch") setHover(date);
                  }}
                  onFocus={() => setFocus(date)}
                  onBlur={() => setFocus(null)}
                  onClick={() =>
                    edit(
                      value
                        ? { kind: "sleep", id: value.records.at(-1)!.id }
                        : { kind: "sleep", date },
                    )
                  }
                >
                  <motion.i
                    initial={false}
                    transition={transition}
                    className={date === today ? "latest" : ""}
                    animate={{
                      height: value
                        ? Math.max(10, Math.min(76, value.minutes / 7.5))
                        : 4,
                    }}
                  />
                  <span>{dateLabel(date, { weekday: "narrow" })}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <Empty
          title="No sleep logged"
          detail="Log your rest to see it here."
          action={() => edit({ kind: "sleep", date: today })}
          label="Log sleep"
        />
      )}
    </Card>
  );
}
