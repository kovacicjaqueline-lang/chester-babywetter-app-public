export class WeatherDataError extends Error {
  constructor(code, message, userMessage, options = {}) {
    super(message, options);
    this.name = 'WeatherDataError';
    this.code = code;
    this.userMessage = userMessage;
  }
}

export const WEATHER_ERROR_MESSAGES = Object.freeze({
  offline: 'Du bist offline. Wetterdaten können gerade nicht aktualisiert werden.',
  geolocation_denied: 'Der Standortzugriff wurde abgelehnt. Bitte suche einen Ort oder eine PLZ manuell.',
  geolocation_unavailable: 'Dein Standort konnte nicht ermittelt werden. Bitte suche einen Ort oder eine PLZ manuell.',
  location_search_failed: 'Die Ortssuche ist gerade nicht verfügbar. Bitte versuche es erneut.',
  location_not_found: 'Für diese Suche wurde kein passender Ort gefunden.',
  weather_fetch_failed: 'Die Wetterdaten konnten gerade nicht geladen werden. Bitte versuche es erneut.',
  invalid_weather_response: 'Die Wetterdaten sind unvollständig oder ungültig und können nicht verwendet werden.',
  storage_failed: 'Der zuletzt verwendete Standort konnte nicht gespeichert werden.'
});

export function weatherError(code, message, options = {}) {
  return new WeatherDataError(
    code,
    message,
    WEATHER_ERROR_MESSAGES[code] ?? 'Die Wetterdaten sind gerade nicht verfügbar.',
    options
  );
}
