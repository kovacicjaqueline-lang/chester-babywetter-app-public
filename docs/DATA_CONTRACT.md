# Data Contract – Baby Clothing Weather App

Status: Fachlicher Datenvertrag für Version 1  
Ziel: stabile, serialisierbare Datenstrukturen für Vanilla JavaScript, `localStorage` und JSON-Export/-Import

## 1. Grundsätze

- Alle persistenten Daten sind JSON-serialisierbar.
- Keine `Date`, `Map`, `Set`, Klasseninstanzen oder Funktionen in persistenten Objekten.
- Zeitpunkte: ISO-8601-Strings.
- Temperaturen intern: Grad Celsius.
- Wind intern: km/h.
- Prozentwerte: 0–100.
- IDs: stabile Strings, vorzugsweise UUIDs.
- Enums: lowercase `snake_case`.
- Fachlogik verwendet keine UI-Texte als Schlüssel.
- Unbekannt ist nicht `false` und nicht `0`.
- Sicherheitsregeln und Regelspuren sind strukturiert.
- Tatsächliche Sonnenexposition gehört zum Situationskontext, nicht zum Wetter-Snapshot.
- V1 unterstützt Babys von 0 bis einschließlich 24 Monaten.

## 2. Versionsstrategie

```ts
interface DataEnvelope<T> {
  schemaVersion: 1;
  exportedAt: string;
  appVersion?: string;
  payload: T;
}
```

Eine unbekannte höhere `schemaVersion` darf nicht stillschweigend importiert werden.

## 3. Enums

```ts
type SituationMode = "outdoor" | "stroller" | "carrier" | "car" | "sleep";
type ActivityLevel = "passive" | "normal" | "active";
type WarmthBias = "runs_cool" | "neutral" | "runs_warm";
type StyleTheme = "neutral" | "soft_blue" | "soft_rose" | "mixed";
type NeckFeedback = "warm_dry" | "hot_sweaty" | "cool";
type WeatherFreshness = "fresh" | "stale" | "unknown";
type DataOrigin = "api" | "cache" | "manual";
type SunExposure = "shade" | "partial" | "direct" | "unknown";
type ApparentTempFactor = "wind" | "humidity" | "sun";
type ThermalWeight = 0 | 1 | 2 | 3 | 4;
type ProtectionLevel = 0 | 1 | 2 | 3;
type RecommendationSeverity = "info" | "caution" | "hard_rule";
type CarSeatCompatibility = "allowed" | "conditional" | "prohibited";
type RecommendationPhase = "main" | "outdoor_transition" | "in_car";
type RecommendationStatus = "idle" | "ready" | "partial" | "blocked";
type ConnectivityStatus = "online" | "offline" | "unknown";
type LocationStatus =
  | "idle"
  | "requesting"
  | "available"
  | "denied"
  | "unavailable"
  | "not_required";
type WeatherStatus =
  | "idle"
  | "loading"
  | "fresh"
  | "stale"
  | "manual"
  | "unavailable"
  | "error";
type BodyZone = "torso" | "arms" | "legs" | "feet" | "hands" | "head" | "neck";
type ClothingLayer = "base" | "legs" | "mid" | "outer" | "accessory" | "external";
type WearPosition = "on_body" | "under_harness" | "over_harness" | "external";
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

```json
{
  "profileId": "baby_4bba29a0",
  "displayName": "Chester",
  "birthDate": "2026-01-24",
  "warmthBias": "neutral",
  "styleTheme": "mixed",
  "defaultActivity": "normal",
  "sleepBagInventory": [],
  "createdAt": "2026-08-25T09:40:00.000Z",
  "updatedAt": "2026-08-25T09:40:00.000Z"
}
```

Regeln:

- `birthDate` ist optional.
- Mit Geburtsdatum wird der V1-Scope 0–24 Monate validiert.
- Ohne Geburtsdatum darf die Wärmelogik arbeiten; bei direkter Sonne gilt der konservative `<12 Monate`-Fallback.
- `warmthBias` ist in V1 manuell; Nackentest verändert ihn nicht automatisch.
- `styleTheme` beeinflusst nie Fachlogik.

## 5. Schlafsack und Herstellerangaben

TOG ist eine Produkteigenschaft, aber kein universeller Algorithmusschlüssel.

```ts
interface SleepBagGuidanceBand {
  minRoomTempC: number | null;
  maxRoomTempC: number | null;
  recommendedUnderlayers: string[]; // ClothingItemDefinition.itemId
  sourceLabel: string | null;
  sourceUrl: string | null;
}

interface SleepBag {
  sleepBagId: string;
  label: string;
  tog: number | null;
  manufacturer: string | null;
  guidanceBands: SleepBagGuidanceBand[];
}
```

Regeln:

- `tog >= 0`, wenn vorhanden.
- Herstellerangaben haben Vorrang.
- Nur TOG ohne passendes Herstellerband darf keine exakte Unterkleidungs-Kombination erzeugen.
- Ein solcher Schlaf-Output ist `partial`.

## 6. Standort und Wetter

```ts
interface WeatherLocation {
  locationId: string | null;
  label: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
}

interface WeatherSnapshot {
  snapshotId: string;
  location: WeatherLocation;
  origin: DataOrigin;
  source: string;
  observedAt: string;
  fetchedAt: string;
  freshness: WeatherFreshness;

  airTempC: number;
  apparentTempC: number | null;
  apparentTempTrusted: boolean;
  apparentTempIncludes: ApparentTempFactor[];

  windSpeedKmh: number | null;
  windGustKmh: number | null;
  precipProbabilityPct: number | null;
  precipMm: number | null;
  precipitationType: "none" | "rain" | "snow" | "sleet" | "unknown";
  uvIndex: number | null;
  cloudCoverPct: number | null;
  isDay: boolean | null;
}
```

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
  "apparentTempC": 17.1,
  "apparentTempTrusted": true,
  "apparentTempIncludes": ["wind", "humidity"],
  "windSpeedKmh": 17,
  "windGustKmh": 29,
  "precipProbabilityPct": 20,
  "precipMm": 0,
  "precipitationType": "none",
  "uvIndex": 3.2,
  "cloudCoverPct": 40,
  "isDay": true
}
```

### Semantik

`apparentTempTrusted: true` bedeutet nur, dass der App-Wetteradapter die Providersemantik kennt und den Wert für die Produktheuristik verwenden darf. Es ist keine medizinische oder baby-spezifische Validierung.

- `true` setzt `apparentTempC != null` voraus.
- `apparentTempIncludes` enthält nur bekannte bereits eingerechnete Faktoren.
- Bei `false` wird `airTempC` thermische Referenz.
- Ein bereits enthaltener Faktor darf thermisch nicht doppelt verrechnet werden.
- Wind kann trotzdem winddichte Kleidung auslösen.
- Fehlende Wind-/UV-/Regendaten werden nie als `0` interpretiert.
- `SunExposure` ist bewusst kein Feld des Wetter-Snapshots.

### Manuelle Eingabe

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
  "apparentTempC": null,
  "apparentTempTrusted": false,
  "apparentTempIncludes": [],
  "windSpeedKmh": null,
  "windGustKmh": null,
  "precipProbabilityPct": null,
  "precipMm": null,
  "precipitationType": "unknown",
  "uvIndex": null,
  "cloudCoverPct": null,
  "isDay": null
}
```

## 7. Abgeleitete thermische Referenz

```ts
interface ThermalEnvironment {
  thermalReferenceC: number;
  referenceSource: "air_temp" | "apparent_temp" | "room_temp" | "cabin_temp";
  alreadyIncludedFactors: ApparentTempFactor[];
}
```

Beispiel Outdoor:

```json
{
  "thermalReferenceC": 17.1,
  "referenceSource": "apparent_temp",
  "alreadyIncludedFactors": ["wind", "humidity"]
}
```

Diese Struktur wird pro Empfehlungsphase berechnet; sie muss nicht persistent gespeichert werden.

## 8. Situationskontexte

```ts
interface OutdoorContext {
  mode: "outdoor";
  activity: ActivityLevel;
  plannedMinutes: number | null;
  sunExposure: SunExposure;
}

interface StrollerContext {
  mode: "stroller";
  activity: "passive";
  plannedMinutes: number | null;
  sunExposure: SunExposure;
  windProtection: "none" | "partial" | "good" | "unknown";
  externalInsulation: "none" | "light" | "medium" | "warm";
}

interface CarrierContext {
  mode: "carrier";
  activity: "passive";
  plannedMinutes: number | null;
  sunExposure: SunExposure;
  carrierCover: "none" | "light" | "warm";
  wearerOuterLayerCoversBaby: boolean;
}

interface CarContext {
  mode: "car";
  activity: "passive";
  plannedMinutes: number | null;
  cabinTempC: number | null;
  includeOutdoorTransition: boolean;
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

```json
{
  "mode": "stroller",
  "activity": "passive",
  "plannedMinutes": 60,
  "sunExposure": "partial",
  "windProtection": "partial",
  "externalInsulation": "light"
}
```

```json
{
  "mode": "car",
  "activity": "passive",
  "plannedMinutes": 35,
  "cabinTempC": 21,
  "includeOutdoorTransition": true,
  "outsideTransitionMinutes": 4
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

Validierung:

- `sleep`: Wetter optional; `roomTempC` erforderlich für `ready`.
- `outdoor`, `stroller`, `carrier`: Außenwetter erforderlich für `ready`.
- `car` nur `in_car`: mit `cabinTempC` darf Wetter fehlen.
- `car` mit Outdoor-Übergang: Wetter ist nur für `outdoor_transition` erforderlich. Fehlt es, kann `in_car` trotzdem `ready` sein.

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
  carSeatCompatibility: CarSeatCompatibility;
  sleepSafe: boolean;
  allowedSituations: SituationMode[];
  styleAssetGroup: string;
}
```

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
    "carSeatCompatibility": "allowed",
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
    "carSeatCompatibility": "conditional",
    "sleepSafe": false,
    "allowedSituations": ["outdoor", "stroller", "carrier", "car"],
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
    "carSeatCompatibility": "prohibited",
    "sleepSafe": false,
    "allowedSituations": ["outdoor", "stroller", "car"],
    "styleAssetGroup": "winter_overall"
  }
]
```

Autositz-Invariante:

- `allowed`: kann automatisch `under_harness` gewählt werden.
- `conditional`: darf nicht automatisch `under_harness` gewählt werden; nur bedingte Alternative mit Passform-/Gurthinweis.
- `prohibited`: nie `under_harness`.
- `winter_overall` darf in `car/outdoor_transition` vorkommen, aber nicht unter dem Gurt in `car/in_car`.

## 11. Empfehlungsposition

```ts
interface RecommendedItem {
  itemId: string;
  quantity: number;
  role: ClothingLayer;
  reasonCodes: string[];
  phase: RecommendationPhase;
  wearPosition: WearPosition;
  optional: boolean;
}
```

```json
{
  "itemId": "winter_overall",
  "quantity": 1,
  "role": "outer",
  "reasonCodes": ["OUTDOOR_TRANSITION_COLD"],
  "phase": "outdoor_transition",
  "wearPosition": "on_body",
  "optional": false
}
```

```json
{
  "itemId": "thin_sweater",
  "quantity": 1,
  "role": "mid",
  "reasonCodes": ["IN_CAR_THERMAL_BASELINE"],
  "phase": "in_car",
  "wearPosition": "under_harness",
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

Normative Codes:

- `CHECK_NECK`
- `CAR_SEAT_NO_BULKY_LAYERS`
- `CAR_SEAT_REMOVE_OUTER_BEFORE_HARNESS`
- `CAR_SEAT_BLANKET_OVER_HARNESS_ONLY`
- `CAR_SEAT_CONDITIONAL_LAYER_CHECK_FIT`
- `SLEEP_NO_HAT`
- `SLEEP_NO_LOOSE_BLANKET_OVER_BAG`
- `SLEEP_USE_ROOM_TEMPERATURE`
- `SLEEP_MANUFACTURER_GUIDANCE_REQUIRED`
- `STROLLER_DO_NOT_COVER_AIRFLOW`
- `INFANT_UNDER_12M_AVOID_DIRECT_SUN`
- `AGE_UNKNOWN_DIRECT_SUN_CONSERVATIVE_RULE`
- `UV_SHADE_AND_COVERAGE`
- `WEATHER_DATA_STALE`
- `WEATHER_DATA_INCOMPLETE`
- `EXTREME_COLD_CAUTION`
- `EXTREME_HEAT_CAUTION`

## 13. Regelspur

```ts
interface RuleTraceEntry {
  ruleId: string;
  effect:
    | "add"
    | "remove"
    | "replace"
    | "thermal_up"
    | "thermal_down"
    | "notice"
    | "no_change";
  target: string | null;
  phase: RecommendationPhase;
  delta: number | null;
  reasonCode: string;
}
```

## 14. Phasenweise Auswertung

Ein Auto-Resultat kann unterschiedliche thermische Referenzen für draußen und Innenraum besitzen. Deshalb werden thermische Werte **nicht** als einzelner globaler Wert modelliert.

```ts
interface RecommendationPhaseEvaluation {
  phase: RecommendationPhase;
  status: "ready" | "partial" | "blocked";
  thermalReferenceC: number | null;
  thermalReferenceSource:
    | "air_temp"
    | "apparent_temp"
    | "room_temp"
    | "cabin_temp"
    | null;
  thermalBand: string | null;
  thermalAdjustment: number;
  missingFields: string[];
}
```

Für Nicht-Auto-Modi existiert genau eine `main`-Auswertung. Für `car` existiert mindestens `in_car` und optional `outdoor_transition`.

## 15. Empfehlungsergebnis

```ts
interface OutfitRecommendation {
  recommendationId: string;
  requestId: string;
  generatedAt: string;
  mode: SituationMode;
  status: "ready" | "partial" | "blocked";
  phases: RecommendationPhaseEvaluation[];
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

### Kinderwagen-Beispiel

```json
{
  "recommendationId": "rec_001",
  "requestId": "req_001",
  "generatedAt": "2026-08-25T09:42:00.100Z",
  "mode": "stroller",
  "status": "ready",
  "phases": [
    {
      "phase": "main",
      "status": "ready",
      "thermalReferenceC": 17.1,
      "thermalReferenceSource": "apparent_temp",
      "thermalBand": "16_to_20",
      "thermalAdjustment": 1,
      "missingFields": []
    }
  ],
  "items": [
    {
      "itemId": "long_sleeve_bodysuit",
      "quantity": 1,
      "role": "base",
      "reasonCodes": ["BASELINE_COOL"],
      "phase": "main",
      "wearPosition": "on_body",
      "optional": false
    },
    {
      "itemId": "light_footmuff",
      "quantity": 1,
      "role": "external",
      "reasonCodes": ["STROLLER_LOW_ACTIVITY"],
      "phase": "main",
      "wearPosition": "external",
      "optional": false
    }
  ],
  "notices": [
    {
      "code": "CHECK_NECK",
      "severity": "info",
      "reasonCodes": ["THERMAL_FEEDBACK_REQUIRED"],
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

### Auto-Beispiel: Innenraum bekannt, Außenwetter fehlt

```json
{
  "recommendationId": "rec_car_001",
  "requestId": "req_car_001",
  "generatedAt": "2026-08-25T10:00:00.000Z",
  "mode": "car",
  "status": "partial",
  "phases": [
    {
      "phase": "outdoor_transition",
      "status": "blocked",
      "thermalReferenceC": null,
      "thermalReferenceSource": null,
      "thermalBand": null,
      "thermalAdjustment": 0,
      "missingFields": ["weather.airTempC"]
    },
    {
      "phase": "in_car",
      "status": "ready",
      "thermalReferenceC": 21,
      "thermalReferenceSource": "cabin_temp",
      "thermalBand": null,
      "thermalAdjustment": 0,
      "missingFields": []
    }
  ],
  "items": [
    {
      "itemId": "long_sleeve_bodysuit",
      "quantity": 1,
      "role": "base",
      "reasonCodes": ["IN_CAR_THERMAL_BASELINE"],
      "phase": "in_car",
      "wearPosition": "under_harness",
      "optional": false
    }
  ],
  "notices": [
    {
      "code": "CAR_SEAT_NO_BULKY_LAYERS",
      "severity": "hard_rule",
      "reasonCodes": ["CAR_HARNESS_SAFETY"],
      "data": {}
    },
    {
      "code": "WEATHER_DATA_INCOMPLETE",
      "severity": "caution",
      "reasonCodes": ["OUTDOOR_TRANSITION_NOT_EVALUATED"],
      "data": {}
    }
  ],
  "ruleTrace": [],
  "dataQuality": {
    "weatherFreshness": null,
    "missingFields": ["weather.airTempC"],
    "usedManualFallback": false
  }
}
```

## 16. Nackentest-Feedback

```ts
interface NeckFeedbackEvent {
  feedbackId: string;
  profileId: string;
  recommendationId: string;
  recordedAt: string;
  feedback: NeckFeedback;
  mode: SituationMode;
  resultingAction: "keep" | "reduce_insulation" | "increase_insulation";
}
```

```json
{
  "feedbackId": "feedback_001",
  "profileId": "baby_4bba29a0",
  "recommendationId": "rec_001",
  "recordedAt": "2026-08-25T10:05:00.000Z",
  "feedback": "hot_sweaty",
  "mode": "stroller",
  "resultingAction": "reduce_insulation"
}
```

V1 nutzt Feedback nicht zum automatischen dauerhaften Lernen. Eine spätere Lernversion benötigt ein eigenes versioniertes Kontext-Snapshot-Modell.

## 17. Laufzeitzustand

```ts
interface AppRuntimeState {
  connectivity: ConnectivityStatus;
  locationStatus: LocationStatus;
  weatherStatus: WeatherStatus;
  recommendationStatus: RecommendationStatus;
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

Die Achsen sind unabhängig. Zusätzlich trägt ein vorhandener `WeatherSnapshot` seine eigene `freshness`, sodass z. B. `weatherStatus: "error"` zusammen mit einem stale Cache-Snapshot darstellbar ist.

Beispiele:

```json
{
  "connectivity": "offline",
  "locationStatus": "available",
  "weatherStatus": "stale",
  "recommendationStatus": "partial",
  "activeProfileId": "baby_4bba29a0",
  "activeMode": "stroller",
  "weather": null,
  "lastRecommendation": null,
  "error": null
}
```

```json
{
  "connectivity": "online",
  "locationStatus": "denied",
  "weatherStatus": "unavailable",
  "recommendationStatus": "blocked",
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

```json
{
  "connectivity": "offline",
  "locationStatus": "not_required",
  "weatherStatus": "unavailable",
  "recommendationStatus": "blocked",
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

Regeln:

- Standortablehnung ist kein fataler Appzustand; manuelle Eingabe bleibt möglich.
- `sleep` benötigt weder Standort noch Außenwetter.
- `car/in_car` kann mit `cabinTempC` ohne Wetter `ready` sein.
- Offline, Cache-Freshness und Recommendation-Status dürfen unabhängig kombiniert werden.

## 18. Persistenz

Empfohlene `localStorage`-Keys:

- `babyweather.v1.profile`
- `babyweather.v1.settings`
- `babyweather.v1.weatherCache`
- `babyweather.v1.feedback`

```ts
interface LocalSettings {
  defaultMode: SituationMode;
  temperatureUnit: "celsius";
  allowLocation: boolean | null;
  weatherCacheMaxAgeMinutes: number | null;
}
```

`weatherCacheMaxAgeMinutes` bleibt `null`, solange kein normativer Cache-Default beschlossen ist.

## 19. JSON-Export

```ts
interface ExportPayloadV1 {
  profile: BabyProfile | null;
  settings: LocalSettings;
  feedback: NeckFeedbackEvent[];
}
```

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
      "weatherCacheMaxAgeMinutes": null
    },
    "feedback": []
  }
}
```

## 20. Importvalidierung

Vor Speicherung vollständig validieren:

1. syntaktisch gültiges JSON,
2. unterstützte `schemaVersion`,
3. nur bekannte Enum-Werte,
4. Pflichtfelder vorhanden,
5. Zahlen endlich,
6. Prozentwerte 0–100,
7. TOG nicht negativ,
8. Datumsstrings parsbar,
9. Geburtsdatum nicht in der Zukunft,
10. vorhandenes Geburtsdatum im V1-Alters-Scope oder Import klar ablehnen/markieren,
11. `apparentTempTrusted: true` nur mit `apparentTempC`,
12. Herstellerbänder dürfen keine unbekannten Kleidungs-IDs normativ aktivieren,
13. unbekannte sicherheitsrelevante Enum-Werte sind Fehler,
14. ungültiger Import überschreibt bestehende Daten nicht teilweise,
15. importierte Texte werden nie als Regeldefinition interpretiert.

## 21. Regel-ID-Schema

- `baseline.temp.*`
- `activity.*`
- `weather.apparent.*`
- `weather.wind.*`
- `weather.rain.*`
- `weather.uv.*`
- `situation.stroller.*`
- `situation.carrier.*`
- `situation.car.transition.*`
- `situation.car.in_car.*`
- `situation.sleep.*`
- `feedback.neck.*`
- `safety.*`

Beispiele:

- `baseline.temp.16_20`
- `weather.uv.gte_3`
- `safety.sun.under_12m.direct`
- `situation.car.transition.remove_bulky_layer`
- `situation.car.in_car.no_bulky_under_harness`
- `situation.sleep.no_hat`
- `feedback.neck.hot_sweaty`

## 22. Invarianten für Tests

1. `styleTheme` verändert nie Fach-Item-IDs, Wärmestufe oder Safety Notices.
2. `sleep` verwendet `roomTempC`, nicht Außenwetter.
3. V1 verwendet keine generische TOG-Tabelle.
4. Schlafsack ohne passendes Herstellerband erzeugt nicht allein aus TOG eine exakte Unterkleidung.
5. `winter_overall` ist in `car/in_car` nie `under_harness`.
6. `winter_overall` darf in `car/outdoor_transition` vorkommen.
7. `carSeatCompatibility: prohibited` ist nie `under_harness`.
8. `conditional` wird nicht automatisch als `under_harness` gewählt.
9. `car/in_car` kann mit `cabinTempC` und ohne Wetter `ready` sein.
10. Fehlendes Outdoor-Wetter blockiert nicht unnötig `in_car`.
11. Auto-Phasen besitzen getrennte `RecommendationPhaseEvaluation`-Objekte.
12. Bereits in `apparentTempIncludes` enthaltene Faktoren werden thermisch nicht doppelt gerechnet.
13. Wind kann trotzdem Windschutz auslösen.
14. `SunExposure` ist Teil des Kontextes, nicht des Wetter-Snapshots.
15. `<12 Monate + direct` erzeugt unabhängig vom UV-Index einen Sonnen-Safety-Hinweis.
16. `birthDate: null + direct` erzeugt konservativen Sonnenhinweis.
17. `uvIndex >= 3` löst UV-Schutz aus, ohne automatisch schwere Isolation hinzuzufügen.
18. `hot_sweaty` erhöht Isolation nie.
19. `cool` verringert Isolation nie.
20. `warm_dry` ändert die Wärmestufe nicht.
21. Kalte Hände/Füße allein verändern die globale Wärmestufe nicht.
22. Nackentest verändert in V1 `warmthBias` nicht automatisch.
23. Regen erzwingt nicht automatisch einen Wärme-Layer.
24. Fehlende Wetterfelder werden nicht als `0` behandelt.
25. Standortablehnung muss manuelle Eingabe erlauben.
26. Zustandsachsen können kombiniert werden.
27. Ungültiger Import verändert bestehende lokale Daten nicht teilweise.

## 23. Verbleibende offene Datenentscheidungen

### D-01 – Wettercache

Wetteranbieter, Cache-Dauer und `stale`-Grenze festlegen.

### D-02 – Kleidungswärme-Skala

`thermalWeight` 0–4 muss anhand konkreter Kleidungsstücke/Testfälle kalibriert werden.

### D-03 – Materialmodell

Eigene Materialachse oder nur konkrete Kleidungsdefinitionen.

### D-04 – Mehrere Babyprofile

V1 benötigt nur ein aktives lokales Profil; Mehrprofil ist nicht beschlossen.

### D-05 – Regelspur persistieren

Offen, ob `ruleTrace` nur zur Laufzeit oder dauerhaft gespeichert wird.

### D-06 – Stilthemen

Finale visuelle Themes sind UI-/Asset-Scope und verändern keine Fachlogik.

## 24. Bereits entschiedene Datenentscheidungen

Für V1 nicht mehr offen:

- Alters-Scope `0–24 Monate`.
- Sonnenexposition im Situationskontext.
- konservative Sonnenregel bei unbekanntem Alter.
- `apparentTempTrusted` + `apparentTempIncludes` statt `feelsLikeIncludesWind`.
- normalisierte thermische Referenz statt blindem Provider-`feelsLike`.
- `CarSeatCompatibility = allowed | conditional | prohibited`.
- Auto-Phasen `outdoor_transition` und `in_car`.
- phasenweise thermische Ergebniswerte.
- Wetter für reine `in_car`-Empfehlung mit `cabinTempC` nicht Pflicht.
- unabhängige Runtime-Statusachsen statt exklusivem `AppDataState`.
- keine generische TOG-Tabelle.
- strukturierte Herstellerbänder für Schlafsäcke.
- keine automatische Langzeit-Personalisierung aus Nackentestfeedback.
