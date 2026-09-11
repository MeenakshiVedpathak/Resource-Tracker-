import { useQuery } from '@tanstack/react-query';

// Falls back to Pune, India whenever the browser can't/won't hand back a real location
// (permission denied, unsupported, timeout) — same default the banner always showed before
// live geolocation was added.
const FALLBACK_PLACE = { lat: 18.5204, lon: 73.8567, city: 'Pune', country: 'India' };

// Open-Meteo (weather) and BigDataCloud (reverse geocoding) are both free, key-less public APIs,
// so this calls them directly with `fetch` rather than through the app's axios instance (which is
// wired for our own backend's baseURL/auth, not third-party APIs).
const weatherUrl = (lat, lon) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;
const reverseGeocodeUrl = (lat, lon) =>
  `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;

// WMO weather codes → { label, icon }. https://open-meteo.com/en/docs
const WEATHER_CODES = {
  0: { label: 'Clear Sky', icon: '☀️' },
  1: { label: 'Mostly Clear', icon: '🌤️' },
  2: { label: 'Partly Cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Foggy', icon: '🌫️' },
  48: { label: 'Foggy', icon: '🌫️' },
  51: { label: 'Light Drizzle', icon: '🌦️' },
  53: { label: 'Drizzle', icon: '🌦️' },
  55: { label: 'Dense Drizzle', icon: '🌦️' },
  56: { label: 'Freezing Drizzle', icon: '🌦️' },
  57: { label: 'Freezing Drizzle', icon: '🌦️' },
  61: { label: 'Light Rain', icon: '🌧️' },
  63: { label: 'Rain', icon: '🌧️' },
  65: { label: 'Heavy Rain', icon: '🌧️' },
  66: { label: 'Freezing Rain', icon: '🌧️' },
  67: { label: 'Freezing Rain', icon: '🌧️' },
  71: { label: 'Light Snow', icon: '🌨️' },
  73: { label: 'Snow', icon: '🌨️' },
  75: { label: 'Heavy Snow', icon: '🌨️' },
  77: { label: 'Snow Grains', icon: '🌨️' },
  80: { label: 'Rain Showers', icon: '🌦️' },
  81: { label: 'Rain Showers', icon: '🌦️' },
  82: { label: 'Heavy Showers', icon: '🌧️' },
  85: { label: 'Snow Showers', icon: '🌨️' },
  86: { label: 'Snow Showers', icon: '🌨️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
  96: { label: 'Thunderstorm', icon: '⛈️' },
  99: { label: 'Thunderstorm', icon: '⛈️' },
};

// Anything wetter than "overcast" flips the banner into its rainy/stormy visual mode.
const RAINY_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99]);

// Wraps the callback-based geolocation API in a Promise that always resolves (never rejects) —
// permission denied, no geolocation support, or a slow GPS fix all just resolve `null` so the
// caller can fall back to Pune instead of the whole banner erroring out.
function getCurrentPosition() {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 },
    );
  });
}

async function reverseGeocode(lat, lon, signal) {
  try {
    const res = await fetch(reverseGeocodeUrl(lat, lon), { signal });
    if (!res.ok) throw new Error('Failed to reverse geocode');
    const data = await res.json();
    return {
      city: data.city || data.locality || FALLBACK_PLACE.city,
      country: data.countryName || FALLBACK_PLACE.country,
    };
  } catch {
    return { city: FALLBACK_PLACE.city, country: FALLBACK_PLACE.country };
  }
}

async function fetchWeather({ signal }) {
  const pos = await getCurrentPosition();
  const lat = pos?.lat ?? FALLBACK_PLACE.lat;
  const lon = pos?.lon ?? FALLBACK_PLACE.lon;

  const [weatherRes, place] = await Promise.all([
    fetch(weatherUrl(lat, lon), { signal }),
    pos ? reverseGeocode(lat, lon, signal) : Promise.resolve(FALLBACK_PLACE),
  ]);
  if (!weatherRes.ok) throw new Error('Failed to load weather');
  const data = await weatherRes.json();
  const code = data?.current?.weather_code ?? 0;
  const meta = WEATHER_CODES[code] ?? WEATHER_CODES[0];
  return {
    tempC: Math.round(Number(data?.current?.temperature_2m ?? 0)),
    code,
    label: meta.label,
    icon: meta.icon,
    isRainy: RAINY_CODES.has(code),
    city: place.city,
    country: place.country,
    // false when the browser wouldn't hand back a real fix (permission denied, unsupported,
    // timed out) — the card still shows weather for the Pune fallback, but callers should hide
    // the city/location line rather than presenting that fallback as the user's real location.
    hasLocation: !!pos,
  };
}

// Polled every 15 min — current conditions don't need to be any fresher than that for a dashboard
// banner, and it keeps this well clear of Open-Meteo's/BigDataCloud's rate limits. The browser
// caches an already-granted geolocation permission, so this doesn't re-prompt on every refetch.
export const useWeather = () =>
  useQuery({
    queryKey: ['weather', 'current-location'],
    queryFn: fetchWeather,
    staleTime: 15 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
    retry: 1,
  });
