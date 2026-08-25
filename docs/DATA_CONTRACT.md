# Data Contract – Baby Clothing Weather App

Status: Fachlicher Datenvertrag für Version 1  
Ziel: stabile, serialisierbare Datenstrukturen für Vanilla JavaScript, `localStorage` und JSON-Export/-Import

## 1. Grundsätze

- Alle dauerhaft gespeicherten Daten müssen JSON-serialisierbar sein.
- Keine `Date`, `Map`, `Set`, Klasseninstanzen oder Funktionen in persistenten Objekten.
- Zeitpunkte werden als ISO-8601-Strings gespeichert.
- Temperaturen werden intern ausschließlich in Grad Celsius gespeichert.
- Wind wird intern in km/h gespeichert.
- Prozentwerte liegen im Bereich 0–100.
- IDs sind stabile Strings; empfohlen werden UUIDs.
- Enums werden als lowercase `snake_case`-Strings gespeichert.
- Fachlogik verwendet keine UI-Texte als Schlüssel.
- Unbekannt ist nicht dasselbe wie `false` oder `0`. Fehlende optionale Daten werden mit `null` oder durch Abwesenheit des Felds dargestellt; pro Struktur soll genau eine Variante verwendet werden.
- Sicherheitswarnungen und Regelspuren werden strukturiert gespeichert, nicht nur als fertiger Text.

## 2. Versionsstrategie

Jedes Export-/Persistenzformat erhält eine Schema-Version.

```ts
interface DataEnvelope<T> {
  schemaVersion: 1;
  exportedAt: string;
  appVersion?: string;
  payload: T;
}
```

Bei inkompatiblen zukünftigen Änderungen wird `schemaVersion` erhöht. Import darf eine unbekannte höhere Version nicht stillschweigend interpretieren.

## 3. Enums

```ts
type SituationMode =
  | "outdoor"
  | "stroller"
  | "carrier"
  | "car"
  | "sleep";

type ActivityLevel = "passive" | "normal" | "active";

type WarmthBias = "runs_cool" | "neutral" | "runs_warm";

type StyleTheme = "neutral" | "soft_blue" | "soft_rose" | "mixed";

type NeckFeedback = "warm_dry" | "hot_sweaty" | "cool";

type WeatherFreshness = "fresh" | "stale" | "unknown";

type DataOrigin = "api" | "cache" | "manual";

type AppDataState =
  | "idle"
  | "loading"
  | "ready"
  | "offline_with_cache"
  | "offline_without_cache"
  | "location_denied"
  | "location_unavailable"
  | "weather_api_error"
  | "weather_stale"
  | "sleep_missing_room_temperature";

type ThermalWeight = 0 | 1 | 2 | 3 | 4;

type ProtectionLevel = 0 | 1 | 2 | 3;

type BodyZone =
  | "torso"
  | "arms"
  | "legs"
  | "feet"
  | "hands"
  | "head"
  | "neck";

type ClothingLayer = "base" | "legs" | "mid" | "outer" | "accessory" | "external";

type RecommendationSeverity = "info" | "caution" | "hard_rule";
```

## 4. Babyprofil

```ts
interface BabyProfile {
  profileId: string;
  displayName: string | null;
  birthDate: string | null; // YYYY-MM-DD
  warmthBias: WarmthBias;
  styleTheme: StyleTheme;
  defaultActivity: ActivityLevel;
  sleepBagInventory: SleepBag[];
  createdAt: string;
  updatedAt: string;
}
```

JSON-Beispiel:

```json
{
  "profileId": "baby_4bba29a0",
  "displayName": "Chester",
  "birthDate": "2026-01-24",
  "warmthBias": "neutral",
  "styleTheme": "mixed",
  "defaultActivity": "normal",
  "sleepBagInventory": [
    {
      "sleepBagId": "bag_25tog_01",
      "label": "Schlafsack 2.5 TOG",
      "tog": 2.5,
      "manufacturer": null,
      "manufacturerMinRoomTempC": null,
      "manufacturerMaxRoomTempC": null
    }
  ],
  "createdAt": "2026-08-25T09:40:00.000Z",
  "updatedAt": "2026-08-25T09:40:00.000Z"
}
```

### Fachliche Validierung

- `warmthBias` standardmäßig `neutral`.
- `styleTheme` darf keine thermische Regel beeinflussen.
- `birthDate` darf für Darstellung/Altersgruppe genutzt werden, aber nicht für noch nicht definierte Alters-Sonderregeln.
- Medizinische Felder gehören nicht in V1.

## 5. Schlafsack

```ts
interface SleepBag {
  sleepBagId: string;
  label: string;
  tog: number | null;
  manufacturer: string | null;
  manufacturerMinRoomTempC: number | null;
  manufacturerMaxRoomTempC: number | null;
}
```

Regeln:

- `tog` muss `>= 0` sein.
- Hersteller-Temperaturbereich hat Vorrang vor generischem TOG-Fallback.
- Das Datenmodell behauptet nicht, dass gleicher TOG bei allen Herstellern identische Kleidung erfordert.

## 6. Standort

```ts
interface WeatherLocation {
  locationId: string | null;
  label: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
}
```

JSON-Beispiel:

```json
{
  "locationId": "manual_berndorf",
  "label": "Berndorf bei Salzburg",
  "latitude": null,
  "longitude": null,
  "timezone": "Europe/Vienna"
}
```

Koordinaten sind optional, damit manuelle Orte ohne präzise Geodaten unterstützt werden können.

## 7. Wetter-Snapshot

```ts
interface WeatherSnapshot {
  snapshotId: string;
  location: WeatherLocation;
  origin: DataOrigin;
  source: string;
  observedAt: string;
  fetchedAt: string;
  freshness: WeatherFreshness;

  airTempC: number;
  feelsLikeC: number | null;
  feelsLikeIncludesWind: boolean | null;

  windSpeedKmh: number | null;
  windGustKmh: number | null;

  precipProbabilityPct: number | null;
  precipMm: number | null;
  precipitationType: "none" | "rain" | "snow" | "sleet" | "unknown";

  uvIndex: number | null;
  cloudCoverPct: number | null;
  isDay: boolean | null;
  directSunExposure: "none" | "partial" | "direct" | "unknown";
}
```

JSON-Beispiel:

```json
{
  "snapshotId": "weather_2026-08-25T09:30Z",
  "location": {
    "locationId": "geo_001",
    "label": "Salzburg",
    "latitude": 47.8095,
    "longitude": 13.055,
    "timezone": "Europe/Vienna"
  },
  "origin": "api",
  "source": "weather_provider_pending",
  "observedAt": "2026-08-25T09:30:00.000Z",
  "fetchedAt": "2026-08-25T09:31:10.000Z",
  "freshness": "fresh",
  "airTempC": 18.4,
  "feelsLikeC": 17.1,
  "feelsLikeIncludesWind": true,
  "windSpeedKmh": 17,
  "windGustKmh": 29,
  "precipProbabilityPct": 20,
  "precipMm": 0,
  "precipitationType": "none",
  "uvIndex": 3.2,
  "cloudCoverPct": 40,
  "isDay": true,
  "directSunExposure": "partial"
}
```

### Kritische Semantik

`feelsLikeIncludesWind` verhindert Doppelzählung.

- `true`: Wind darf nicht zusätzlich als Temperaturabschlag gerechnet werden.
- `false`: Windmodifikator darf angewendet werden.
- `null`: Herkunft unklar; Engine soll konservativ keinen mathematischen Doppelabschlag vornehmen und nur winddichte Kleidung priorisieren.

### Manuelle Wettereingabe

Minimal gültig:

```json
{
  "snapshotId": "manual_001",
  "location": {
    "locationId": null,
    "label": "Manuelle Eingabe",
    "latitude": null,
    "longitude": null,
    "timezone": "Europe/Vienna"
  },
  "origin": "manual",
  "source": "user",
  "observedAt": "2026-08-25T09:35:00.000Z",
  "fetchedAt": "2026-08-25T09:35:00.000Z",
  "freshness": "fresh",
  "airTempC": 19,
  "feelsLikeC": null,
  "feelsLikeIncludesWind": null,
  "windSpeedKmh": null,
  "windGustKmh": null,
  "precipProbabilityPct": null,
  "precipMm": null,
  "precipitationType": "unknown",
  "uvIndex": null,
  "cloudCoverPct": null,
  "isDay": null,
  "directSunExposure": "unknown"
}
```

Fehlende Wind-/UV-/Regendaten werden nicht als `0` interpretiert.

## 8. Kontext pro Situation

```ts
interface OutdoorContext {
  mode: "outdoor";
  activity: ActivityLevel;
  plannedMinutes: number | null;
}

interface StrollerContext {
  mode: "stroller";
  activity: "passive";
  plannedMinutes: number | null;
  windProtection: "none" | "partial" | "good" | "unknown";
  externalInsulation: "none" | "light" | "medium" | "warm";
}

interface CarrierContext {
  mode: "carrier";
  activity: "passive";
  plannedMinutes: number | null;
  carrierCover: "none" | "light" | "warm";
  wearerOuterLayerCoversBaby: boolean;
}

interface CarContext {
  mode: "car";
  activity: "passive";
  plannedMinutes: number | null;
  cabinTempC: number | null;
  outsideTransitionMinutes: number | null;
}

interface SleepContext {
  mode: "sleep";
  roomTempC: number | null;
  selectedSleepBagId: string | null;
}

type SituationContext =
  | OutdoorContext
  | StrollerContext
  | CarrierContext
  | CarContext
  | SleepContext;
```

### Kinderwagen-Beispiel

```json
{
  "mode": "stroller",
  "activity": "passive",
  "plannedMinutes": 60,
  "windProtection": "partial",
  "externalInsulation": "light"
}
```

### Trage-Beispiel

```json
{
  "mode": "carrier",
  "activity": "passive",
  "plannedMinutes": 45,
  "carrierCover": "none",
  "wearerOuterLayerCoversBaby": true
}
```

### Auto-Beispiel

```json
{
  "mode": "car",
  "activity": "passive",
  "plannedMinutes": 35,
  "cabinTempC": 21,
  "outsideTransitionMinutes": 4
}
```

### Schlaf-Beispiel

```json
{
  "mode": "sleep",
  "roomTempC": 19.2,
  "selectedSleepBagId": "bag_25tog_01"
}
```

## 9. Empfehlungs-Request

```ts
interface OutfitRecommendationRequest {
  requestId: string;
  requestedAt: string;
  profile: BabyProfile;
  context: SituationContext;
  weather: WeatherSnapshot | null;
  neckFeedback: NeckFeedback | null;
}
```

Regeln:

- Für `sleep` darf `weather` `null` sein.
- Für `sleep` ist `roomTempC` Pflicht für eine vollständige Empfehlung.
- Für die vier Nicht-Schlaf-Modi ist `weather.airTempC` Pflicht.
- `neckFeedback` kann für die Erstempfehlung `null` sein.

JSON-Beispiel:

```json
{
  "requestId": "req_001",
  "requestedAt": "2026-08-25T09:42:00.000Z",
  "profile": {
    "profileId": "baby_4bba29a0",
    "displayName": "Chester",
    "birthDate": "2026-01-24",
    "warmthBias": "neutral",
    "styleTheme": "mixed",
    "defaultActivity": "normal",
    "sleepBagInventory": [],
    "createdAt": "2026-08-25T09:40:00.000Z",
    "updatedAt": "2026-08-25T09:40:00.000Z"
  },
  "context": {
    "mode": "stroller",
    "activity": "passive",
    "plannedMinutes": 60,
    "windProtection": "partial",
    "externalInsulation": "light"
  },
  "weather": {
    "snapshotId": "weather_001",
    "location": {
      "locationId": "geo_001",
      "label": "Salzburg",
      "latitude": 47.8095,
      "longitude": 13.055,
      "timezone": "Europe/Vienna"
    },
    "origin": "api",
    "source": "weather_provider_pending",
    "observedAt": "2026-08-25T09:30:00.000Z",
    "fetchedAt": "2026-08-25T09:31:10.000Z",
    "freshness": "fresh",
    "airTempC": 18.4,
    "feelsLikeC": 17.1,
    "feelsLikeIncludesWind": true,
    "windSpeedKmh": 17,
    "windGustKmh": 29,
    "precipProbabilityPct": 20,
    "precipMm": 0,
    "precipitationType": "none",
    "uvIndex": 3.2,
    "cloudCoverPct": 40,
    "isDay": true,
    "directSunExposure": "partial"
  },
  "neckFeedback": null
}
```

## 10. Kleidungskatalog

```ts
interface ClothingItemDefinition {
  itemId: string;
  category: string;
  layer: ClothingLayer;
  labelKey: string;
  bodyZones: BodyZone[];
  thermalWeight: ThermalWeight;
  windProtection: ProtectionLevel;
  rainProtection: ProtectionLevel;
  sunCoverage: ProtectionLevel;
  carSeatSafe: boolean;
  sleepSafe: boolean;
  allowedSituations: SituationMode[];
  styleAssetGroup: string;
}
```

Beispiele:

```json
[
  {
    "itemId": "long_sleeve_bodysuit",
    "category": "bodysuit",
    "layer": "base",
    "labelKey": "clothing.long_sleeve_bodysuit",
    "bodyZones": ["torso", "arms"],
    "thermalWeight": 1,
    "windProtection": 0,
    "rainProtection": 0,
    "sunCoverage": 2,
    "carSeatSafe": true,
    "sleepSafe": true,
    "allowedSituations": ["outdoor", "stroller", "carrier", "car", "sleep"],
    "styleAssetGroup": "long_sleeve_bodysuit"
  },
  {
    "itemId": "fleece_jacket",
    "category": "jacket",
    "layer": "mid",
    "labelKey": "clothing.fleece_jacket",
    "bodyZones": ["torso", "arms"],
    "thermalWeight": 3,
    "windProtection": 1,
    "rainProtection": 0,
    "sunCoverage": 2,
    "carSeatSafe": false,
    "sleepSafe": false,
    "allowedSituations": ["outdoor", "stroller", "carrier"],
    "styleAssetGroup": "fleece_jacket"
  },
  {
    "itemId": "winter_overall",
    "category": "overall",
    "layer": "outer",
    "labelKey": "clothing.winter_overall",
    "bodyZones": ["torso", "arms", "legs"],
    "thermalWeight": 4,
    "windProtection": 3,
    "rainProtection": 2,
    "sunCoverage": 3,
    "carSeatSafe": false,
    "sleepSafe": false,
    "allowedSituations": ["outdoor", "stroller"],
    "styleAssetGroup": "winter_overall"
  },
  {
    "itemId": "sun_hat",
    "category": "hat",
    "layer": "accessory",
    "labelKey": "clothing.sun_hat",
    "bodyZones": ["head", "neck"],
    "thermalWeight": 0,
    "windProtection": 0,
    "rainProtection": 0,
    "sunCoverage": 3,
    "carSeatSafe": true,
    "sleepSafe": false,
    "allowedSituations": ["outdoor", "stroller", "carrier", "car"],
    "styleAssetGroup": "sun_hat"
  }
]
```

### Offene Entscheidung D-01 – `carSeatSafe`

**OFFEN:** Ein einfacher Boolean ist für V1 leicht nutzbar, kann aber bei dünnem vs. dickem Fleece zu grob sein. Mögliche spätere Erweiterung: `carSeatCompatibility: allowed | conditional | prohibited`.

## 11. Empfehlungsposition

```ts
interface RecommendedItem {
  itemId: string;
  quantity: number;
  role: ClothingLayer;
  reasonCodes: string[];
  wearPosition: "on_body" | "over_harness" | "external";
  optional: boolean;
}
```

JSON-Beispiel:

```json
{
  "itemId": "rain_jacket",
  "quantity": 1,
  "role": "outer",
  "reasonCodes": ["RAIN_PROTECTION_REQUIRED"],
  "wearPosition": "on_body",
  "optional": false
}
```

## 12. Strukturierte Hinweise

```ts
interface RecommendationNotice {
  code: string;
  severity: RecommendationSeverity;
  reasonCodes: string[];
  data: Record<string, string | number | boolean | null>;
}
```

Normative Codes für V1:

- `CHECK_NECK`
- `CAR_SEAT_NO_BULKY_LAYERS`
- `CAR_SEAT_BLANKET_OVER_HARNESS_ONLY`
- `SLEEP_NO_HAT`
- `SLEEP_NO_LOOSE_BLANKET_OVER_BAG`
- `SLEEP_USE_ROOM_TEMPERATURE`
- `STROLLER_DO_NOT_COVER_AIRFLOW`
- `UV_SHADE_AND_COVERAGE`
- `WEATHER_DATA_STALE`
- `WEATHER_DATA_INCOMPLETE`
- `EXTREME_COLD_CAUTION`
- `EXTREME_HEAT_CAUTION`

Beispiel:

```json
{
  "code": "CAR_SEAT_NO_BULKY_LAYERS",
  "severity": "hard_rule",
  "reasonCodes": ["CAR_HARNESS_SAFETY"],
  "data": {
    "prohibitedItemId": "winter_overall"
  }
}
```

## 13. Regelspur

Die Engine soll nachvollziehbar machen, wie die Empfehlung zustande kam.

```ts
interface RuleTraceEntry {
  ruleId: string;
  effect: "add" | "remove" | "replace" | "thermal_up" | "thermal_down" | "notice" | "no_change";
  target: string | null;
  delta: number | null;
  reasonCode: string;
}
```

Beispiel:

```json
[
  {
    "ruleId": "baseline.temp.16_20",
    "effect": "add",
    "target": "long_sleeve_bodysuit",
    "delta": null,
    "reasonCode": "BASELINE_COOL"
  },
  {
    "ruleId": "situation.stroller.passive",
    "effect": "thermal_up",
    "target": null,
    "delta": 1,
    "reasonCode": "STROLLER_LOW_ACTIVITY"
  },
  {
    "ruleId": "weather.feels_like.includes_wind",
    "effect": "no_change",
    "target": null,
    "delta": 0,
    "reasonCode": "WIND_ALREADY_IN_FEELS_LIKE"
  }
]
```

Diese Spur ist für Tests und Debugging wichtig und muss nicht vollständig in der späteren UI sichtbar sein.

## 14. Empfehlungsergebnis

```ts
interface OutfitRecommendation {
  recommendationId: string;
  requestId: string;
  generatedAt: string;
  mode: SituationMode;
  effectiveTempC: number | null;
  thermalBand: string | null;
  thermalAdjustment: number;
  items: RecommendedItem[];
  notices: RecommendationNotice[];
  ruleTrace: RuleTraceEntry[];
  dataQuality: {
    weatherFreshness: WeatherFreshness | null;
    missingFields: string[];
    usedManualFallback: boolean;
  };
}
```

JSON-Beispiel:

```json
{
  "recommendationId": "rec_001",
  "requestId": "req_001",
  "generatedAt": "2026-08-25T09:42:00.100Z",
  "mode": "stroller",
  "effectiveTempC": 17.1,
  "thermalBand": "16_to_20",
  "thermalAdjustment": 1,
  "items": [
    {
      "itemId": "long_sleeve_bodysuit",
      "quantity": 1,
      "role": "base",
      "reasonCodes": ["BASELINE_COOL"],
      "wearPosition": "on_body",
      "optional": false
    },
    {
      "itemId": "pants",
      "quantity": 1,
      "role": "legs",
      "reasonCodes": ["BASELINE_COOL"],
      "wearPosition": "on_body",
      "optional": false
    },
    {
      "itemId": "thin_sweater",
      "quantity": 1,
      "role": "mid",
      "reasonCodes": ["BASELINE_COOL"],
      "wearPosition": "on_body",
      "optional": false
    },
    {
      "itemId": "light_footmuff",
      "quantity": 1,
      "role": "external",
      "reasonCodes": ["STROLLER_LOW_ACTIVITY"],
      "wearPosition": "external",
      "optional": false
    },
    {
      "itemId": "sun_hat",
      "quantity": 1,
      "role": "accessory",
      "reasonCodes": ["UV_INDEX_GTE_3"],
      "wearPosition": "on_body",
      "optional": false
    }
  ],
  "notices": [
    {
      "code": "CHECK_NECK",
      "severity": "info",
      "reasonCodes": ["THERMAL_FEEDBACK_REQUIRED"],
      "data": {}
    },
    {
      "code": "STROLLER_DO_NOT_COVER_AIRFLOW",
      "severity": "hard_rule",
      "reasonCodes": ["HEAT_AND_AIRFLOW_SAFETY"],
      "data": {}
    }
  ],
  "ruleTrace": [],
  "dataQuality": {
    "weatherFreshness": "fresh",
    "missingFields": [],
    "usedManualFallback": false
  }
}
```

## 15. Nackentest-Feedback

```ts
interface NeckFeedbackEvent {
  feedbackId: string;
  profileId: string;
  recommendationId: string;
  recordedAt: string;
  feedback: NeckFeedback;
  mode: SituationMode;
  effectiveTempC: number | null;
  resultingAction: "keep" | "reduce_insulation" | "increase_insulation";
}
```

JSON-Beispiel:

```json
{
  "feedbackId": "feedback_001",
  "profileId": "baby_4bba29a0",
  "recommendationId": "rec_001",
  "recordedAt": "2026-08-25T10:05:00.000Z",
  "feedback": "hot_sweaty",
  "mode": "stroller",
  "effectiveTempC": 17.1,
  "resultingAction": "reduce_insulation"
}
```

Kalte Hände/Füße werden nicht als `NeckFeedback` codiert. Falls die UI dies später erfassen soll, braucht es ein separates Feld wie `extremityObservation`, das keine automatische globale Wärmekorrektur auslöst.

## 16. Anwendungszustand

```ts
interface AppRuntimeState {
  state: AppDataState;
  activeProfileId: string | null;
  activeMode: SituationMode;
  weather: WeatherSnapshot | null;
  lastRecommendation: OutfitRecommendation | null;
  error: AppError | null;
}

interface AppError {
  code: string;
  messageKey: string;
  retryable: boolean;
  details: Record<string, string | number | boolean | null>;
}
```

Beispiele:

### Standort abgelehnt

```json
{
  "state": "location_denied",
  "activeProfileId": "baby_4bba29a0",
  "activeMode": "outdoor",
  "weather": null,
  "lastRecommendation": null,
  "error": {
    "code": "GEOLOCATION_PERMISSION_DENIED",
    "messageKey": "errors.location_denied",
    "retryable": false,
    "details": {}
  }
}
```

### Offline mit Cache

```json
{
  "state": "offline_with_cache",
  "activeProfileId": "baby_4bba29a0",
  "activeMode": "stroller",
  "weather": {
    "snapshotId": "cached_weather_001",
    "location": {
      "locationId": "geo_001",
      "label": "Salzburg",
      "latitude": 47.8095,
      "longitude": 13.055,
      "timezone": "Europe/Vienna"
    },
    "origin": "cache",
    "source": "weather_provider_pending",
    "observedAt": "2026-08-25T09:00:00.000Z",
    "fetchedAt": "2026-08-25T09:01:00.000Z",
    "freshness": "fresh",
    "airTempC": 18,
    "feelsLikeC": 17,
    "feelsLikeIncludesWind": true,
    "windSpeedKmh": 15,
    "windGustKmh": null,
    "precipProbabilityPct": 10,
    "precipMm": 0,
    "precipitationType": "none",
    "uvIndex": 2.8,
    "cloudCoverPct": null,
    "isDay": true,
    "directSunExposure": "unknown"
  },
  "lastRecommendation": null,
  "error": null
}
```

### Schlafen ohne Raumtemperatur

```json
{
  "state": "sleep_missing_room_temperature",
  "activeProfileId": "baby_4bba29a0",
  "activeMode": "sleep",
  "weather": null,
  "lastRecommendation": null,
  "error": {
    "code": "ROOM_TEMPERATURE_REQUIRED",
    "messageKey": "errors.room_temperature_required",
    "retryable": true,
    "details": {}
  }
}
```

## 17. Persistenz in `localStorage`

Empfohlene Keys:

- `babyweather.v1.profile`
- `babyweather.v1.settings`
- `babyweather.v1.weatherCache`
- `babyweather.v1.feedback`

```ts
interface LocalSettings {
  defaultMode: SituationMode;
  temperatureUnit: "celsius";
  allowLocation: boolean | null;
  weatherCacheMaxAgeMinutes: number;
}
```

`weatherCacheMaxAgeMinutes` ist technisch speicherbar, der normative Default ist aber noch offen.

### Offene Entscheidung D-02 – Cache-Dauer

**OFFEN:** Gültigkeitsdauer für Wettercache muss zusammen mit dem späteren Wetteranbieter festgelegt werden. Kein Default soll im Code erfunden werden, bevor diese Entscheidung getroffen ist.

## 18. JSON-Export

```ts
interface ExportPayloadV1 {
  profile: BabyProfile | null;
  settings: LocalSettings;
  feedback: NeckFeedbackEvent[];
}
```

Beispiel:

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-08-25T10:30:00.000Z",
  "appVersion": "1.0.0",
  "payload": {
    "profile": {
      "profileId": "baby_4bba29a0",
      "displayName": "Chester",
      "birthDate": "2026-01-24",
      "warmthBias": "neutral",
      "styleTheme": "mixed",
      "defaultActivity": "normal",
      "sleepBagInventory": [],
      "createdAt": "2026-08-25T09:40:00.000Z",
      "updatedAt": "2026-08-25T09:40:00.000Z"
    },
    "settings": {
      "defaultMode": "stroller",
      "temperatureUnit": "celsius",
      "allowLocation": true,
      "weatherCacheMaxAgeMinutes": 30
    },
    "feedback": []
  }
}
```

Der Beispielwert `30` Minuten ist **kein freigegebener Produktdefault**, sondern nur ein gültiger Datenwert zur Demonstration des Formats.

## 19. Importvalidierung

Import muss vor Speicherung vollständig validieren:

1. JSON syntaktisch gültig.
2. `schemaVersion` unterstützt.
3. Enums enthalten nur bekannte Werte.
4. Pflichtfelder vorhanden.
5. Zahlenwerte endlich (`Number.isFinite`).
6. Prozentwerte 0–100.
7. TOG nicht negativ.
8. Datumsstrings parsbar.
9. Unbekannte Felder dürfen ignoriert werden, aber unbekannte sicherheitsrelevante Enum-Werte nicht.
10. Keine importierten UI-Texte als Regeldefinition interpretieren.

Fehlerhafter Import darf bestehende lokale Daten nicht teilweise überschreiben.

## 20. Fachliche Regel-IDs

Empfohlenes Schema:

- `baseline.temp.*`
- `activity.*`
- `weather.wind.*`
- `weather.rain.*`
- `weather.uv.*`
- `situation.stroller.*`
- `situation.carrier.*`
- `situation.car.*`
- `situation.sleep.*`
- `feedback.neck.*`
- `safety.*`

Beispiele:

- `baseline.temp.16_20`
- `weather.uv.gte_3`
- `situation.car.no_bulky_under_harness`
- `situation.sleep.no_hat`
- `feedback.neck.hot_sweaty`

Diese IDs sollen später direkt in Unit-Tests verwendbar sein.

## 21. Invarianten für Tests

Folgende Eigenschaften müssen unabhängig von konkreten Outfits immer gelten:

1. `styleTheme` verändert nie `thermalAdjustment`, `items[].itemId` auf fachlicher Ebene oder Sicherheitswarnungen; nur Asset-/Darstellungsvarianten dürfen sich unterscheiden.
2. `sleep` verwendet `roomTempC`, nicht `weather.airTempC`.
3. `winter_overall` darf im Modus `car` nie `wearPosition: "on_body"` unter dem Gurt erhalten.
4. `SLEEP_NO_HAT` gilt immer im Schlafmodus für Indoor-Schlaf.
5. Ein vorhandenes `feelsLikeC` mit `feelsLikeIncludesWind: true` darf keinen zweiten Wind-Temperaturabschlag auslösen.
6. `hot_sweaty` darf die Isolation nicht erhöhen.
7. `cool` darf die Isolation nicht verringern.
8. `warm_dry` ändert die thermische Stufe nicht.
9. Kühle Hände/Füße allein verändern die globale thermische Stufe nicht.
10. UV-Schutz darf bei Hitze nicht durch zusätzliche schwere Isolation umgesetzt werden.
11. Regen darf nicht automatisch einen zusätzlichen Wärme-Layer erzwingen.
12. Fehlende Wetterdaten dürfen nicht als Nullwerte ausgelegt werden.
13. `location_denied` muss manuelle Eingabe erlauben können; es ist kein fataler App-Zustand.
14. Ein ungültiger Import darf vorhandene lokale Daten nicht teilweise verändern.

## 22. Offene Datenentscheidungen

### D-03 – Kleidungswärme-Skala

**OFFEN:** `thermalWeight` 0–4 ist für V1 verständlich, aber noch nicht empirisch kalibriert. Vor Implementierung muss definiert werden, welche realen Kleidungsarten welchem Wert entsprechen.

### D-04 – Materialeigenschaften

**OFFEN:** V1 kann Material zunächst ignorieren oder grob über Varianten modellieren. Eine explizite Materialachse (`cotton`, `wool`, `fleece`, `synthetic_shell`) würde die Logik präziser, aber komplexer machen.

### D-05 – Ein oder mehrere Babyprofile

**OFFEN:** Das Datenmodell kann mehrere Profile tragen, Produktkonzept V1 geht derzeit von einem aktiven lokalen Profil aus. Zu entscheiden ist, ob Mehrprofil-Unterstützung schon in V1 benötigt wird.

### D-06 – Regelspur persistieren

**OFFEN:** `ruleTrace` ist für Tests und Debugging wertvoll. Es muss noch entschieden werden, ob sie nur zur Laufzeit existiert oder zusammen mit Feedbackereignissen gespeichert wird.

### D-07 – Stilthemen

**OFFEN:** Die finalen visuellen Themes werden erst im Asset-/UI-Arbeitsstrang festgelegt. Der Datenvertrag garantiert nur, dass Stil niemals Fachlogik beeinflusst.
