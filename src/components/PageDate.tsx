import { useOne } from "../lib/workspace";
import { dateLabel } from "../domain/time";
export function PageDate() {
  const { today } = useOne();
  return (
    <p className="page-date">
      <time dateTime={today}>
        {dateLabel(today, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </time>
    </p>
  );
}
