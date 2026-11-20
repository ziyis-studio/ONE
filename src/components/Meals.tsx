import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  RefreshCw,
  Utensils,
  Camera,
  Flame,
} from "lucide-react";
import { useOne } from "../lib/workspace";
import { useViewState } from "../lib/view-state";
import { accessToken, api } from "../lib/api";
import type { MealDay } from "../domain/meals";
import { mealLabels, nutrientLabels, nutritionText } from "../lib/meals";
import { addDays, dateLabel, timeKey } from "../domain/time";
import { ChartEntrance } from "../lib/chart-entrance";
import { Card, Empty, IconButton } from "./ui";
import { DateTimeField } from "./DateTimeField";
import { PageDate } from "./PageDate";
import { MealPhotoImage } from "./MealPhotos";
import "./meals.css";
export default function Meals() {
  const { data, demo, zone, today, edit, reload, busy, notify } = useOne();
  const [date, setDate] = useViewState<string>("meals.date", today);
  const [version, setVersion] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [result, setResult] = useState<{ key: string; value: MealDay } | null>(
    null,
  );
  const key = `${date}:${zone}`;
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void (async () => {
      const value = await api<MealDay>(
        demo
          ? "/v1/sample/meals"
          : "/v1/meals?" + new URLSearchParams({ date, zone }),
        demo ? "" : await accessToken(),
        demo
          ? {
              method: "POST",
              signal: controller.signal,
              body: JSON.stringify({ workspace: data, query: { date, zone } }),
            }
          : { signal: controller.signal },
      );
      if (!controller.signal.aborted) setResult({ key, value });
    })()
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "Could not load meals.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [date, zone, demo, data, key, version]);
  const day = !error && result?.key === key ? result.value : null;
  const meals = day?.meals || [];
  const max = Math.max(1, ...(day?.history.map((d) => d.calories || 0) || []));
  function select(value: string) {
    if (!value) return;
    if (value > today) {
      notify("Choose today or an earlier day.", true);
      return;
    }
    setDate(value);
  }
  return (
    <div className="meals-page">
      <div className="page-intro">
        <div>
          <PageDate />
          <h1>Meals.</h1>
          <p>A little record of what nourishes you.</p>
        </div>
        <button
          className="primary-button"
          onClick={() => edit({ kind: "meal", date })}
        >
          <Plus size={15} />
          Log a meal
        </button>
      </div>
      <div className="meal-date-toolbar">
        <div className="meal-date-controls">
          <div
            className="meal-date-navigation"
            role="group"
            aria-label="Meal day navigation"
          >
            <IconButton
              label="Previous meal day"
              onClick={() => select(addDays(date, -1))}
            >
              <ArrowLeft size={16} />
            </IconButton>
            <DateTimeField
              label="Meal date"
              value={date}
              onChange={select}
              today={today}
              hideLabel
            />
            <IconButton
              label="Next meal day"
              disabled={date >= today}
              onClick={() => select(addDays(date, 1))}
            >
              <ArrowRight size={16} />
            </IconButton>
          </div>
          <button
            className="meal-today-button"
            onClick={() => setDate(today)}
            disabled={date === today}
          >
            Today
          </button>
        </div>
        <div className="meal-toolbar-meta">
          <span className="fine">{zone.replaceAll("_", " ")}</span>
          <IconButton
            label="Refresh meals"
            disabled={busy || loading}
            onClick={() => void reload()}
          >
            <RefreshCw size={15} />
          </IconButton>
        </div>
      </div>
      <div
        className="meal-summary"
        aria-label="Daily nutrition"
        aria-busy={loading}
      >
        <Card
          title="Recorded energy"
          meta={<Flame size={17} />}
          className="meal-energy-card"
        >
          <div className="meal-energy-value">
            <strong>
              {nutritionText(day?.totals.calories.amount)}
              <small> kcal</small>
            </strong>
            <span>
              {day
                ? `${meals.length} ${meals.length === 1 ? "meal" : "meals"}`
                : "—"}
            </span>
          </div>
          <p className="meal-coverage">
            {!day
              ? error
                ? "Daily summary unavailable."
                : "Loading your daily summary…"
              : day.totals.calories.recorded
                ? `${day.totals.calories.recorded} of ${meals.length} meals with calories recorded`
                : "Calories can be added whenever you’re ready."}
          </p>
          <ChartEntrance
            className="meal-energy-history"
            ready={!!day && !loading}
            replayKey={key}
            role="group"
            aria-label="Recorded calories over seven days"
          >
            {day?.history.map((d) => (
              <button
                key={d.date}
                type="button"
                data-active={d.date === date || undefined}
                data-chart-title={dateLabel(d.date)}
                data-chart-detail={
                  d.calories == null
                    ? "Calories not recorded"
                    : `${nutritionText(d.calories)} kcal · ${d.recorded} of ${d.meals} meals recorded`
                }
                aria-label={`${dateLabel(d.date)}: ${d.calories == null ? "calories not recorded" : nutritionText(d.calories) + " kcal"}`}
                onClick={() => select(d.date)}
              >
                <span>
                  <i
                    data-chart-enter="bar-y"
                    className={d.calories == null ? "is-unknown" : ""}
                    style={{
                      height:
                        d.calories == null
                          ? 3
                          : Math.max(3, (d.calories / max) * 52),
                    }}
                  />
                </span>
                <small>{dateLabel(d.date, { weekday: "narrow" })}</small>
              </button>
            ))}
          </ChartEntrance>
          <span className="meal-history-caption">
            Last 7 days · recorded values only
          </span>
        </Card>
        <Card
          title="Daily nutrients"
          meta={<Utensils size={17} />}
          className="meal-macros-card"
        >
          <div className="meal-macros">
            {(["protein", "carbs", "fat", "fiber"] as const).map((n) => (
              <div key={n}>
                <span>{nutrientLabels[n]}</span>
                <strong>
                  {nutritionText(day?.totals[n].amount)}
                  <small> g</small>
                </strong>
                <small>
                  {!day
                    ? error
                      ? "Unavailable"
                      : "Loading…"
                    : day.totals[n].recorded
                      ? `${day.totals[n].recorded} / ${meals.length} meals`
                      : "Not recorded"}
                </small>
              </div>
            ))}
          </div>
          <p className="meal-coverage">
            Totals cover only the values entered. A blank value means unknown.
          </p>
        </Card>
      </div>
      <div className="meal-list-heading">
        <h2>
          {date === today
            ? "Today’s meals"
            : dateLabel(date, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
        </h2>
        <span className="fine">
          {day
            ? `${meals.length} ${meals.length === 1 ? "entry" : "entries"}`
            : error
              ? "Unavailable"
              : "Loading…"}
        </span>
      </div>
      {error ? (
        <div className="meal-load-error" role="alert">
          <p>{error}</p>
          <button
            className="secondary-button"
            onClick={() => setVersion((v) => v + 1)}
          >
            Try again
          </button>
        </div>
      ) : loading && !day ? (
        <p className="fine" role="status">
          Loading meals…
        </p>
      ) : meals.length ? (
        <div className="meal-grid">
          {meals.map((meal) => (
            <article
              className={"meal-card" + (meal.photos.length ? " has-photo" : "")}
              key={meal.id}
            >
              <button
                className="meal-card-open"
                onClick={() => edit({ kind: "meal", id: meal.id })}
                aria-label={`Edit meal ${meal.title || mealLabels[meal.kind]}`}
              >
                {meal.photos.length > 0 && (
                  <div className="meal-card-photo">
                    <MealPhotoImage photo={meal.photos[0]} />
                    {meal.photos.length > 1 && (
                      <span>
                        <Camera size={13} />
                        {meal.photos.length} photos
                      </span>
                    )}
                  </div>
                )}
                <div className="meal-card-body">
                  <div className="meal-card-meta">
                    <span className="tag">{mealLabels[meal.kind]}</span>
                    <time dateTime={meal.ateAt}>
                      {timeKey(meal.ateAt, zone)}
                    </time>
                  </div>
                  <h3>{meal.title || mealLabels[meal.kind]}</h3>
                  {meal.description && (
                    <p className="meal-description">{meal.description}</p>
                  )}
                  <footer>
                    <strong>
                      {meal.calories == null
                        ? "Calories not recorded"
                        : `${nutritionText(meal.calories)} kcal`}
                    </strong>
                    {meal.nutritionSource === "external" && (
                      <span>Externally updated</span>
                    )}
                  </footer>
                  <div className="meal-card-nutrients">
                    {(["protein", "carbs", "fat", "fiber"] as const).map((n) =>
                      meal[n] != null ? (
                        <span key={n}>
                          {nutrientLabels[n]} <b>{nutritionText(meal[n])}g</b>
                        </span>
                      ) : null,
                    )}
                  </div>
                </div>
              </button>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="A little room for your next meal"
          detail="Write what you ate, add a photo, or record the nutrition you know."
          label="Log a meal"
          action={() => edit({ kind: "meal", date })}
        />
      )}
    </div>
  );
}
