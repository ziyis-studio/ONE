import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { timeKey } from "../domain/time";

function ClockDigit({ value }: { value: string }) {
  const reduced = useReducedMotion();
  return (
    <span className="clock-second-digit">
      {reduced ? (
        value
      ) : (
        <AnimatePresence initial={false}>
          <motion.span
            key={value}
            initial={{ y: "65%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-65%", opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      )}
    </span>
  );
}
export default function LiveClock({ zone }: { zone: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(new Date());
      timer = setTimeout(tick, Math.max(10, 1000 - (Date.now() % 1000)));
    };
    const synchronize = () => {
      clearTimeout(timer);
      if (document.visibilityState !== "hidden") tick();
    };
    timer = setTimeout(tick, Math.max(10, 1000 - (Date.now() % 1000)));
    document.addEventListener("visibilitychange", synchronize);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", synchronize);
    };
  }, []);
  const minutes = timeKey(now, zone);
  const seconds = String(now.getUTCSeconds()).padStart(2, "0");
  return (
    <time
      className="clock-time"
      dateTime={now.toISOString()}
      aria-label={minutes + ":" + seconds}
    >
      <span className="clock-main" aria-hidden="true">
        {minutes}
      </span>
      <span className="clock-seconds" aria-hidden="true">
        <span className="clock-second-colon">:</span>
        <ClockDigit value={seconds[0]} />
        <ClockDigit value={seconds[1]} />
      </span>
    </time>
  );
}
