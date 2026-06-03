// Open-Meteo weather (no API key needed)
// Geocoding via open-meteo geocoding-api, weather via api.open-meteo.com

export interface WeatherData {
  temp: number;
  condition: string;
  code: number;
  city?: string;
}

// WMO weather code → human readable condition
// Reference: https://open-meteo.com/en/docs (Weather variable documentation)
export function codeToCondition(code: number): string {
  if (code === 0) return 'Clear';
  if ([1, 2].includes(code)) return 'Partly Cloudy';
  if (code === 3) return 'Cloudy';
  if ([45, 48].includes(code)) return 'Foggy';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
  if ([95, 96, 99].includes(code)) return 'Thunderstorm';
  return 'Clear';
}

async function geocode(city: string): Promise<{ lat: number; lon: number; name: string } | null> {
  try {
    const r = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
    );
    if (!r.ok) return null;
    const j = await r.json();
    const hit = j?.results?.[0];
    if (!hit) return null;
    return { lat: hit.latitude, lon: hit.longitude, name: hit.name };
  } catch { return null; }
}

async function fetchWeatherByCoords(lat: number, lon: number, city?: string): Promise<WeatherData | null> {
  try {
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`
    );
    if (!r.ok) return null;
    const j = await r.json();
    const c = j?.current;
    if (!c) return null;
    return {
      temp: Math.round(c.temperature_2m),
      condition: codeToCondition(c.weather_code),
      code: c.weather_code,
      city,
    };
  } catch { return null; }
}

/** Try GPS first, fall back to city name from preferences. */
export async function getWeather(fallbackCity?: string): Promise<WeatherData | null> {
  // Try GPS
  if ('geolocation' in navigator) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, maximumAge: 600000 });
      });
      const w = await fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
      if (w) return w;
    } catch { /* permission denied or timeout — fall through */ }
  }

  if (fallbackCity) {
    const geo = await geocode(fallbackCity);
    if (geo) return fetchWeatherByCoords(geo.lat, geo.lon, geo.name);
  }
  return null;
}
