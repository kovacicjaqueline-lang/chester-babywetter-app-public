const WIND_PRESETS = Object.freeze({
  calm: Object.freeze({ windSpeedKmh: 0, windGustKmh: 0 }),
  light: Object.freeze({ windSpeedKmh: 10, windGustKmh: 18 }),
  windy: Object.freeze({ windSpeedKmh: 29, windGustKmh: 38 }),
  strong: Object.freeze({ windSpeedKmh: 39, windGustKmh: 49 }),
  very_strong: Object.freeze({ windSpeedKmh: 50, windGustKmh: 60 }),
  unknown: Object.freeze({ windSpeedKmh: null, windGustKmh: null })
});

const PRECIPITATION_PRESETS = Object.freeze({
  dry: Object.freeze({ precipProbabilityPct: 0, precipMm: 0, precipitationType: 'none' }),
  rain: Object.freeze({ precipProbabilityPct: 70, precipMm: 1, precipitationType: 'rain' }),
  snow: Object.freeze({ precipProbabilityPct: 70, precipMm: 1, precipitationType: 'snow' }),
  sleet: Object.freeze({ precipProbabilityPct: 70, precipMm: 1, precipitationType: 'sleet' }),
  unknown: Object.freeze({ precipProbabilityPct: null, precipMm: null, precipitationType: 'unknown' })
});

const SUN_PRESETS = Object.freeze({
  cloudy: 1,
  bright: 3,
  sunny: 6,
  unknown: null
});

function finiteOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

export function windPresetForWeather(current = null) {
  const speed = finiteOrNull(current?.windSpeedKmh);
  const gust = finiteOrNull(current?.windGustKmh);
  if (speed === null && gust === null) return 'unknown';
  if ((speed ?? 0) >= 50 || (gust ?? 0) >= 60) return 'very_strong';
  if ((speed ?? 0) >= 39 || (gust ?? 0) >= 50) return 'strong';
  if ((speed ?? 0) >= 29 || (gust ?? 0) >= 39) return 'windy';
  if ((speed ?? 0) > 0 || (gust ?? 0) > 0) return 'light';
  return 'calm';
}

export function precipitationPresetForWeather(current = null) {
  const type = current?.precipitationType;
  if (type === 'rain') return 'rain';
  if (type === 'snow') return 'snow';
  if (type === 'sleet') return 'sleet';
  if (type === 'none' && (current?.precipMm > 0 || current?.precipProbabilityPct >= 60)) return 'rain';
  if (type === 'none') return 'dry';
  if (current?.precipMm > 0 || current?.precipProbabilityPct >= 60) return 'rain';
  return 'unknown';
}

export function sunPresetForWeather(current = null) {
  const uv = finiteOrNull(current?.uvIndex);
  if (uv === null) return 'unknown';
  if (uv >= 6) return 'sunny';
  if (uv >= 3) return 'bright';
  return 'cloudy';
}

export function manualWeatherValuesFromPresets({ temperatureC, wind = 'unknown', precipitation = 'unknown', sun = 'unknown' } = {}) {
  const windValues = WIND_PRESETS[wind] ?? WIND_PRESETS.unknown;
  const precipitationValues = PRECIPITATION_PRESETS[precipitation] ?? PRECIPITATION_PRESETS.unknown;
  return {
    airTempC: temperatureC,
    ...windValues,
    ...precipitationValues,
    uvIndex: SUN_PRESETS[sun] ?? null
  };
}

export const MANUAL_WEATHER_PRESET_IDS = Object.freeze({
  wind: Object.freeze(Object.keys(WIND_PRESETS)),
  precipitation: Object.freeze(Object.keys(PRECIPITATION_PRESETS)),
  sun: Object.freeze(Object.keys(SUN_PRESETS))
});
