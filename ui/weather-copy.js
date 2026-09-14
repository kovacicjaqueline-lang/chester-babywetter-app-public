export function formatTemperature(value) {
  if (!Number.isFinite(value)) return '–';
  return `${Number.isInteger(value) ? value : value.toFixed(1)}°`;
}

export function precipitationLabelFor(point = null) {
  if (point?.precipitationType === 'rain') return 'Regen';
  if (point?.precipitationType === 'snow') return 'Schnee';
  if (point?.precipitationType === 'sleet') return 'Schneeregen';
  return 'Niederschlag';
}

export function formatPrecipitation(point = null) {
  const label = precipitationLabelFor(point);
  return Number.isFinite(point?.precipProbabilityPct)
    ? `${label} ${Math.round(point.precipProbabilityPct)}%`
    : `${label} –`;
}
