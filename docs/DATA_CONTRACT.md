# Data Contract – Baby Clothing Weather App

Status: Fachlicher Datenvertrag für Version 1  
Ziel: stabile, serialisierbare Datenstrukturen für Vanilla JavaScript, `localStorage` und JSON-Export/-Import

## 1. Grundsätze

- Alle dauerhaft gespeicherten Daten sind JSON-serialisierbar.
- Keine `Date`, `Map`, `Set`, Klasseninstanzen oder Funktionen in persistenten Objekten.
- Zeitpunkte werden als ISO-8601-Strings gespeichert.
- Temperaturen werden intern in Grad Celsius gespeichert.
- Wind wird intern in km/h gespeichert.
- Prozentwerte liegen im Bereich 0–100.
- IDs sind stabile Strings; UUIDs sind empfohlen.
- Enums werden als lowercase `snake_case`-Strings gespeichert.
- Fachlogik verwendet keine UI-Texte als Schlüssel.
- Unbekannt ist nicht dasselbe wie `false` oder `0`.
- Sicherheitswarnungen und Regelspuren werden strukturiert gespeichert.
- Rohdaten des Wetterproviders und von der App normalisierte Fachsemantik werden getrennt gedacht.
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

Eine unbekannte höhere `schemaVersion` darf beim Import nicht stillschweigend interpretiert werden.

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

type SunExposure = "shade" | "partial" | "direct" | "unknown";

type ApparentTempFactor = "wind" | "humidity" | "sun";

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

type ClothingLayer =
  | "base"
  | "legs"
  | "mid"
  | "outer"
  | "accessory"
  | "external";

type RecommendationSeverity = "info" | "caution" | "hard_rule";

type CarSeatCompatibility = "allowed" | "conditional" | "prohibited";

type RecommendationPhase = "main" | "outdoor_transition" | "in_car";

type WearPosition =
  | "on_body"
  | "under_harness"
  | "over_harness"
  | "external";

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

type RecommendationStatus = "idle" | "ready" | "partial" | "blocked";
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
  "sleepBagInventory": [],
  "createdAt": "2026-08-25T09:40:00.000Z",
  "updatedAt": "2026-08-25T09:40:00.000Z"
}
```

### Fachliche Validierung

- `birthDate` ist optional.
- Liegt ein gültiges Geburtsdatum vor, muss das Baby für V1 am Nutzungstag zwischen 0 und 24 Monaten alt sein.
- Fehlt `birthDate`, darf die Wärmelogik trotzdem arbeiten.
- Bei unbekanntem Alter gilt für direkte Sonne der konservative `<12 Monate`-Fallback.
- `warmthBias` ist in V1 manuell gesetzt; Nackentest verändert ihn nicht automatisch.
- `styleTheme` beeinflusst nie Fachlogik.

## 5. Schlafsack und Herstellerangaben

TOG ist eine Produkteigenschaft, aber in V1 kein universeller Algorithmusschlüssel.

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

Beispiel:

```json
{
  "sleepBagId": "bag_25tog_01",
  "label": "Schlafsack 2.5 TOG",
  "tog": 2.5,
  "manufacturer": "example_manufacturer",
  "guidanceBands": [
    {
      "minRoomTempC": 16,
      "maxRoomTempC": 20,
      "recommendedUnderlayers": [
        "long_sleeve_bodysuit",
        "sleep_suit"
      ],
      "sourceLabel": "Hersteller-Temperaturguide",
      "sourceUrl": "https://example.invalid/manufacturer-guide"
    }
  ]
}
```

Der Beispiel-URL ist nur Schema-Demonstration und keine Fachquelle.

Regeln:

- `tog >= 0`, wenn vorhanden.
- Herstellerbänder haben Vorrang vor jeder allgemeinen Orientierung.
- Wenn nur `tog` bekannt ist und `guidanceBands` leer sind, darf daraus keine exakte TOG-basierte Unterkleidung erzeugt werden.
- Eine Empfehlung mit ausgewähltem Schlafsack, aber ohne passende Herstellerangabe, ist `partial`.

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

Beispiel:

```json
{
  "locationId": "manual_salzburg",
  "label": "Salzburg",
  "latitude": null,
  "longitude": null,
  "timezone": "Europe/Vienna"
}
```

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

### Kritische Semantik

`apparentTempTrusted` bedeutet nicht, dass der Wert medizinisch oder speziell für Babys validiert ist. Es bedeutet nur, dass der **App-Wetteradapter** die Providersemantik kennt und den Wert für die definierte Produktheuristik verwenden darf.

Regeln:

- `apparentTempTrusted: true` setzt voraus, dass `apparentTempC` nicht `null` ist.
- `apparentTempIncludes` darf nur Faktoren enthalten, deren Einrechnung durch den Adapter bekannt ist.
- Bei `apparentTempTrusted: false` dient `airTempC` als thermische Referenz.
- Fehlende Wind-/UV-/Regendaten werden nie als `0` interpretiert.
- Tatsächliche Sonnenexposition wird hier bewusst **nicht** gespeichert.

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

## 8. Abgeleitete thermische Umgebung

`thermalReferenceC` wird nicht zwingend persistent gespeichert. Sie wird für die Empfehlung aus dem Wetter-Snapshot abgeleitet.

```ts
interface ThermalEnvironment {
  thermalReferenceC: number;
  referenceSource: "air_temp" | "apparent_temp";
  alreadyIncludedFactors: ApparentTempFactor[];
}
```

Beispiel:

```json
{
  "thermalReferenceC": 17.1,
  "referenceSource": "apparent_temp",
  "alreadyIncludedFactors": ["wind", "humidity"]
}
```

In diesem Beispiel darf Wind thermisch nicht erneut als Temperaturabschlag gerechnet werden, kann aber weiterhin winddichte Kleidung auslösen.

## 9. Kontext pro Situation

### Gemeinsame Sonnenexposition

`SunExposure` beschreibt die tatsächliche Situation des Babys, nicht das Wetter allgemein.

### Outdoor

```ts
interface OutdoorContext {
  mode: "outdoor";
  activity: ActivityLevel;
  plannedMinutes: number | null;
  sunExposure: SunExposure;
}
```

### Kinderwagen

```ts
interface StrollerContext {
  mode: "stroller";
  activity: "passive";
  plannedMinutes: number | null;
  sunExposure: SunExposure;
  windProtection: "none" | "partial" | "good" | "unknown";
  externalInsulation: "none" | "light" | "medium" | "warm";
}
```

### Trage

```ts
interface CarrierContext {
  mode: "carrier";
  activity: "passive";
  plannedMinutes: number | null;
  sunExposure: SunExposure;
  carrierCover: "none" | "light" | "warm";
  wearerOuterLayerCoversBaby: boolean;
}
```

### Auto

```ts
interface CarContext {
  mode: "car";
  activity: "passive";
  plannedMinutes: number | null;
  cabinTempC: number | null;
  includeOutdoorTransition: boolean;
  outsideTransitionMinutes: number | null;
}
```

### Schlaf

```ts
interface SleepContext {
  mode: "sleep";
  roomTempC: number | null;
  selectedSleepBagId: string | null;
}
```

```ts
type SituationContext =
  | OutdoorContext
  | StrollerContext
  | CarrierContext
  | CarContext
  | SleepContext;
```

JSON-Beispiele:

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

```json
{
  "mode": "sleep",
  "roomTempC": 19.2,
  "selectedSleepBagId": "bag_25tog_01"
}
```

## 10. Empfehlungs-Request

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

### Validierung nach Modus

- `sleep`: `weather` darf `null` sein; `roomTempC` ist für `ready` erforderlich.
- `outdoor`, `stroller`, `carrier`: `weather.airTempC` ist für eine vollständige wetterbasierte Empfehlung erforderlich.
- `car` nur `in_car`: Wenn `cabinTempC` vorhanden ist, darf `weather` `null` sein.
- `car` mit `includeOutdoorTransition: true`: Außenwetter ist für die **Übergangsphase** erforderlich. Fehlt es, darf `in_car` trotzdem `ready` sein und der Gesamtrecommendation-Status wird mindestens `partial`.
- `neckFeedback` kann bei Erstempfehlung `null` sein.

## 11. Kleidungskatalog

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
    "carSeatCompatibility": "allowed",
    "sleepSafe": false,
    "allowedSituations": ["outdoor", "stroller", "carrier", "car"],
    "styleAssetGroup": "sun_hat"
  }
]
```

### Autositz-Regel

- `allowed`: darf bei passender thermischer Logik automatisch als `under_harness` empfohlen werden.
- `conditional`: Engine darf es **nicht automatisch** als `under_harness` auswählen; nur als bedingte Alternative mit Safety-Hinweis.
- `prohibited`: darf in `in_car` nie `under_harness` sein.

Ein `winter_overall` darf im Automodus für `outdoor_transition` vorkommen, aber nicht für `in_car` unter dem Gurt.

## 12. Empfehlungsposition und Phase

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

Normaler Outdoor-Fall:

```json
{
  "itemId": "rain_jacket",
  "quantity": 1,
  "role": "outer",
  "reasonCodes": ["RAIN_PROTECTION_REQUIRED"],
  "phase": "main",
  "wearPosition": "on_body",
  "optional": false
}
```

Auto-Übergang:

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

Angeschnallte Fahrt:

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

## 13. Strukturierte Hinweise

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

Beispiel:

```json
{
  "code": "CAR_SEAT_REMOVE_OUTER_BEFORE_HARNESS",
  "severity": "hard_rule",
  "reasonCodes": ["CAR_HARNESS_SAFETY"],
  "data": {
    "itemId": "winter_overall"
  }
}
```

## 14. Regelspur

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

Beispiel:

```json
[
  {
    "ruleId": "baseline.temp.16_20",
    "effect": "add",
    "target": "long_sleeve_bodysuit",
    "phase": "main",
    "delta": null,
    "reasonCode": "BASELINE_COOL"
  },
  {
    "ruleId": "weather.apparent.includes_wind",
    "effect": "no_change",
    "target": null,
    "phase": "main",
    "delta": 0,
    "reasonCode": "WIND_ALREADY_IN_THERMAL_REFERENCE"
  }
]
```

## 15. Empfehlungsergebnis

```ts
interface RecommendationPhaseStatus {
  phase: RecommendationPhase;
  status: "ready" | "partial" | "blocked";
  missingFields: string[];
}

interface OutfitRecommendation {
  recommendationId: string;
  requestId: string;
  generatedAt: string;
  mode: SituationMode;
  status: "ready" | "partial" | "blocked";
  thermalReferenceC: number | null;
  thermalReferenceSource: "air_temp" | "apparent_temp" | "room_temp" | "cabin_temp" | null;
  thermalBand: string | null;
  thermalAdjustment: number;
  phaseStatus: RecommendationPhaseStatus[];
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

Kinderwagen-Beispiel:

```json
{
  "recommendationId": "rec_001",
  "requestId": "req_001",
  "generatedAt": "2026-08-25T09:42:00.100Z",
  "mode": "stroller",
  "status": "ready",
  "thermalReferenceC": 17.1,
  "thermalReferenceSource": "apparent_temp",
  "thermalBand": "16_to_20",
  "thermalAdjustment": 1,
  "phaseStatus": [
    {
      "phase": "main",
      "status": "ready",
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
      "itemId": "pants",
      "quantity": 1,
      "role": "legs",
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

Auto-Beispiel mit fehlendem Außenwetter:

```json
{
  "recommendationId": "rec_car_001",
  "requestId": "req_car_001",
  "generatedAt": "2026-08-25T10:00:00.000Z",
  "mode": "car",
  "status": "partial",
  "thermalReferenceC": 21,
  "thermalReferenceSource": "cabin_temp",
  "thermalBand": null,
  "thermalAdjustment": 0,
  "phaseStatus": [
    {
      "phase": "outdoor_transition",
      "status": "blocked",
      "missingFields": ["weather.airTempC"]
    },
    {
      "phase": "in_car",
      "status": "ready",
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

Beispiel:

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

V1 verwendet gespeicherte Feedbackereignisse **nicht** für automatische Langzeit-Personalisierung. Deshalb ist kein Vergleichbarkeits-/Lernkontext erforderlich. Falls eine spätere Version automatisch lernen soll, benötigt sie ein versioniertes Kontext-Snapshot-Modell und darf bestehende V1-Ereignisse nicht stillschweigend als ausreichend interpretieren.

Kalte Hände/Füße werden nicht als `NeckFeedback` codiert.

## 17. Laufzeitzustand

Ein einzelner exklusiver Status ist nicht ausreichend. Mehrere Achsen dürfen gleichzeitig unterschiedliche Zustände haben.

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

### Standort abgelehnt, manuelle Eingabe noch nicht erfolgt

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

### Offline mit altem Cache

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

### Schlafen ohne Raumtemperatur

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

## 18. Zustandsregeln

- `locationStatus: denied` ist kein fataler Appzustand; manuelle Ort-/Wettereingabe muss möglich bleiben.
- `connectivity: offline` und `weatherStatus: stale` können gleichzeitig gelten.
- `weatherStatus: error` kann mit vorhandenem Cache kombiniert werden; die Datenqualität entscheidet, ob eine Empfehlung `ready` oder `partial` ist.
- `sleep` benötigt weder Standort noch Wetter.
- `car` nur für `in_car` kann ohne Wetter `ready` sein, wenn `cabinTempC` vorhanden ist.
- Fehlende optionale Wetterfelder werden nicht als Nullwerte interpretiert.

## 19. Persistenz in `localStorage`

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
  weatherCacheMaxAgeMinutes: number | null;
}
```

`weatherCacheMaxAgeMinutes` darf `null` sein, solange der normative Cache-Default noch nicht beschlossen ist.

### Offene Entscheidung D-01 – Cache-Dauer

**OFFEN / KALIBRIERUNG:** Cache-Gültigkeit muss mit dem Wetteranbieter festgelegt werden. Kein Default im Code erfinden.

## 20. JSON-Export

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
      "weatherCacheMaxAgeMinutes": null
    },
    "feedback": []
  }
}
```

## 21. Importvalidierung

Import muss vor Speicherung vollständig validieren:

1. JSON syntaktisch gültig.
2. `schemaVersion` unterstützt.
3. Enums enthalten nur bekannte Werte.
4. Pflichtfelder vorhanden.
5. Zahlenwerte endlich (`Number.isFinite`).
6. Prozentwerte 0–100.
7. TOG nicht negativ.
8. Datumsstrings parsbar.
9. Geburtsdatum liegt nicht in der Zukunft.
10. Bei vorhandenem Geburtsdatum liegt das Alter für V1 im Bereich 0–24 Monate; andernfalls Import als Profil außerhalb des V1-Scopes ablehnen oder explizit markieren – keine stillschweigende Anwendung der Outfitlogik.
11. `apparentTempTrusted: true` nur mit vorhandenem `apparentTempC`.
12. `guidanceBands` dürfen keine unbekannten Kleidungs-IDs als normative Unterkleidung aktivieren.
13. Unbekannte sicherheitsrelevante Enum-Werte führen zu Validierungsfehler.
14. Fehlerhafter Import überschreibt bestehende lokale Daten nicht teilweise.
15. Importierte Texte werden nie als Regeldefinition interpretiert.

## 22. Fachliche Regel-IDs

Empfohlenes Schema:

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

## 23. Invarianten für Tests

Folgende Eigenschaften müssen unabhängig von konkreten Outfits gelten:

1. `styleTheme` verändert nie Fach-Item-IDs, Wärmestufe oder Sicherheitswarnungen.
2. `sleep` verwendet `roomTempC`, nicht `weather.airTempC`.
3. Eine generische TOG-Tabelle wird in V1 nicht verwendet.
4. Ein Schlafsack ohne passende `guidanceBands` darf nicht allein aufgrund seines TOG eine exakte Unterkleidungs-Kombination erzeugen.
5. `winter_overall` darf in `car/in_car` nie `wearPosition: "under_harness"` erhalten.
6. `winter_overall` darf in `car/outdoor_transition` vorkommen.
7. `carSeatCompatibility: prohibited` darf nie `under_harness` sein.
8. `carSeatCompatibility: conditional` darf nicht automatisch als `under_harness` gewählt werden.
9. `car` mit `cabinTempC` und ohne Outdoor-Übergang kann ohne Wetter `ready` sein.
10. `car` mit fehlendem Outdoor-Wetter darf die `in_car`-Phase nicht unnötig blockieren.
11. Bei `apparentTempTrusted: true` darf kein Faktor aus `apparentTempIncludes` thermisch doppelt gerechnet werden.
12. Wind kann trotz bereits eingerechneter thermischer Wirkung winddichte Kleidung auslösen.
13. `SunExposure` gehört zum Kontext, nicht zum `WeatherSnapshot`.
14. `<12 Monate + direct` erzeugt unabhängig vom UV-Index einen Sonnen-Safety-Hinweis.
15. `birthDate: null + direct` erzeugt den konservativen Alters-unbekannt-Hinweis.
16. `uvIndex >= 3` löst UV-Schutz aus, ohne automatisch schwere Isolation zu addieren.
17. `hot_sweaty` erhöht Isolation nie.
18. `cool` verringert Isolation nie.
19. `warm_dry` ändert die thermische Stufe nicht.
20. Kalte Hände/Füße allein verändern die globale thermische Stufe nicht.
21. Nackentest verändert in V1 `warmthBias` nicht automatisch.
22. Regen erzwingt nicht automatisch einen zusätzlichen Wärme-Layer.
23. Fehlende Wetterdaten werden nicht als `0` ausgelegt.
24. `locationStatus: denied` muss manuelle Eingabe erlauben können.
25. Zustandsachsen dürfen kombiniert werden, z. B. `offline + stale + partial`.
26. Ungültiger Import verändert bestehende lokale Daten nicht teilweise.

## 24. Verbleibende offene Datenentscheidungen

### D-01 – Cache-Dauer

Wetteranbieter und `stale`-Grenze festlegen.

### D-02 – Kleidungswärme-Skala

`thermalWeight` 0–4 ist eine V1-Arbeitsskala, aber noch nicht empirisch kalibriert. Konkrete Kleidungsarten müssen vor Implementierungsfreigabe zugeordnet und getestet werden.

### D-03 – Materialeigenschaften

V1 kann Material zunächst über konkrete Kleidungsdefinitionen modellieren. Eine eigene Materialachse (`cotton`, `wool`, `fleece`, `synthetic_shell`) bleibt eine spätere Entscheidung.

### D-04 – Ein oder mehrere Babyprofile

Produktkonzept V1 geht von einem aktiven lokalen Profil aus. Mehrprofil-Unterstützung ist nicht erforderlich, solange sie nicht separat beschlossen wird.

### D-05 – Regelspur persistieren

`ruleTrace` ist für Tests/Debugging vorgesehen. Ob sie persistiert oder nur zur Laufzeit existiert, ist offen.

### D-06 – Stilthemen

Finale visuelle Themes werden erst im Asset-/UI-Arbeitsstrang festgelegt. Stil beeinflusst nie Fachlogik.

## 25. Bereits entschiedene Datenentscheidungen

Für V1 nicht mehr offen:

- Alters-Scope `0–24 Monate`.
- tatsächliche Sonnenexposition im Situationskontext.
- konservative Sonnenregel bei unbekanntem Alter.
- `apparentTempTrusted` + `apparentTempIncludes` statt `feelsLikeIncludesWind`.
- abgeleitete `thermalReferenceC` statt blindem Provider-`feelsLike`.
- `CarSeatCompatibility = allowed | conditional | prohibited` statt Boolean.
- Auto-Phasen `outdoor_transition` und `in_car`.
- Wetter ist für reine `in_car`-Empfehlung mit `cabinTempC` nicht Pflicht.
- mehrere unabhängige Runtime-Statusachsen statt exklusivem `AppDataState`.
- keine generische TOG-Tabelle in V1.
- strukturierte Herstellerbänder für Schlafsäcke.
- keine automatische Langzeit-Personalisierung aus Nackentestfeedback in V1.
