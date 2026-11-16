export interface WeatherLocation {
  name: string;
  latitude: number;
  longitude: number;
}
export const weatherLocations: Record<string, WeatherLocation> = {
  "Asia/Kuala_Lumpur": {
    name: "Kuala Lumpur",
    latitude: 3.139,
    longitude: 101.6869,
  },
  "Asia/Singapore": {
    name: "Singapore",
    latitude: 1.3521,
    longitude: 103.8198,
  },
  "Asia/Shanghai": { name: "Shanghai", latitude: 31.2304, longitude: 121.4737 },
  "Asia/Hong_Kong": {
    name: "Hong Kong",
    latitude: 22.3193,
    longitude: 114.1694,
  },
  "Asia/Tokyo": { name: "Tokyo", latitude: 35.6762, longitude: 139.6503 },
  "Asia/Seoul": { name: "Seoul", latitude: 37.5665, longitude: 126.978 },
  "Asia/Kolkata": { name: "Kolkata", latitude: 22.5726, longitude: 88.3639 },
  "Europe/London": { name: "London", latitude: 51.5074, longitude: -0.1278 },
  "Europe/Paris": { name: "Paris", latitude: 48.8566, longitude: 2.3522 },
  "America/New_York": {
    name: "New York",
    latitude: 40.7128,
    longitude: -74.006,
  },
  "America/Los_Angeles": {
    name: "Los Angeles",
    latitude: 34.0522,
    longitude: -118.2437,
  },
  "Australia/Sydney": {
    name: "Sydney",
    latitude: -33.8688,
    longitude: 151.2093,
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
