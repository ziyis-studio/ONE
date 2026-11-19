export interface WeatherLocation {
  name: string;
}
export const weatherLocations: Record<string, WeatherLocation> = {
  "Asia/Kuala_Lumpur": {
    name: "Kuala Lumpur",
  },
  "Asia/Singapore": {
    name: "Singapore",
  },
  "Asia/Shanghai": { name: "Shanghai" },
  "Asia/Hong_Kong": {
    name: "Hong Kong",
  },
  "Asia/Tokyo": { name: "Tokyo" },
  "Asia/Seoul": { name: "Seoul" },
  "Asia/Kolkata": { name: "Kolkata" },
  "Europe/London": { name: "London" },
  "Europe/Paris": { name: "Paris" },
  "America/New_York": {
    name: "New York",
  },
  "America/Los_Angeles": {
    name: "Los Angeles",
  },
  "Australia/Sydney": {
    name: "Sydney",
  },
};
export function weatherDescription(code: number) {
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95) return "Thunderstorms";
  return "Current conditions";
}
