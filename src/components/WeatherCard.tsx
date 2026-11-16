import { useEffect, useState } from "react";
import { Sun, Cloud, CloudRain, RefreshCw } from "lucide-react";
import { useOne } from "../lib/workspace";
import { timeKey } from "../domain/time";
import { weatherLocations, weatherDescription } from "../lib/weather";
import { Card } from "./ui";
type CurrentWeather = { temperature: number; code: number; updatedAt: string };
export default function WeatherCard() {
  const { zone, now } = useOne();
  const location = weatherLocations[zone];
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [loading, setLoading] = useState(!!location);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!location) {
      setWeather(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setFailed(false);
    setWeather(null);
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const query = new URLSearchParams({
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      current: "temperature_2m,weather_code",
      timezone: zone,
    });
    void fetch("https://api.open-meteo.com/v1/forecast?" + query, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Weather unavailable");
        const result = await response.json();
        if (
          !Number.isFinite(result.current?.temperature_2m) ||
          !Number.isFinite(result.current?.weather_code)
        )
          throw new Error("Weather unavailable");
        if (active)
          setWeather({
            temperature: result.current.temperature_2m,
            code: result.current.weather_code,
            updatedAt: result.current.time,
          });
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [location, zone, attempt]);
  const WeatherIcon =
    weather && weather.code >= 51
      ? CloudRain
      : weather && weather.code > 1
        ? Cloud
        : Sun;
  return (
    <Card
      title="Time & weather"
      className="clock-card"
      meta={<WeatherIcon size={17} strokeWidth={1.5} />}
    >
      <div className="clock-zone">
        {location?.name || zone.split("/").at(-1)?.replaceAll("_", " ")}
      </div>
      <div className="time-weather-row">
        <time className="clock-time" dateTime={now.toISOString()}>
          {timeKey(now, zone)}
        </time>
        <div className="weather-readout" aria-live="polite">
          {weather ? (
            <>
              <strong>
                {Math.round(weather.temperature)}°<small>C</small>
              </strong>
              <span>{weatherDescription(weather.code)}</span>
            </>
          ) : loading ? (
            <span className="weather-loading">Getting weather…</span>
          ) : (
            <span className="weather-unavailable">
              {location
                ? "Weather unavailable"
                : "No weather for this time zone"}
            </span>
          )}
        </div>
      </div>
      <div className="clock-footer">
        <span>{zone.replaceAll("_", " ")}</span>
        {location && (
          <button
            aria-label="Refresh weather"
            disabled={loading}
            onClick={() => setAttempt((value) => value + 1)}
          >
            <RefreshCw size={12} />
            {failed ? "Retry" : "Refresh"}
          </button>
        )}
      </div>
    </Card>
  );
}
