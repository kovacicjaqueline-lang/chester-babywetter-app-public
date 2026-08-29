# Data Contract – Baby Clothing Weather App V1

Status: fachlicher Datenvertrag für Vanilla JavaScript, `localStorage`, JSON-Export/-Import und testbare Outfitengine

## 1. Grundsätze

- persistente Daten sind vollständig JSON-serialisierbar,
- Zeitpunkte sind ISO-8601-Strings,
- Temperaturen intern in °C,
- Wind intern in km/h,
- Prozentwerte 0–100,
- Enums als lowercase `snake_case`,
- unbekannt ist nicht `0` und nicht `false`,
- Sicherheitslogik wird über Codes/Enums modelliert, nicht über UI-Freitext,
- Stil darf Fachlogik nie beeinflussen,
- Outfit-Austausch wird als erneuter Engine-Request modelliert, nicht als DOM-Manipulation.

## 2. Versionierung

```ts
interface DataEnvelope<T> {
  schemaVersion: 1;
  exportedAt: string;
  appVersion?: string;
  payload: T;
}
```

Unbekannte höhere Schema-Versionen dürfen nicht stillschweigend importiert werden.

## 3. Kern-Enums

```ts
type SituationMode = "outdoor" | "stroller" | "carrier" | "car" | "indoor" | "sleep";
type ActivityLevel = "calm" | "normal" | "active";
type ActivitySource = "default" | "inferred" | "user";
type WarmthBias = "runs_cool" | "neutral" | "runs_warm";
type StyleTheme = "neutral" | "boy" | "girl";
type NeckFeedback = "warm_dry" | "hot_sweaty" | "cool";
type SunExposure = "shade" | "partial" | "direct" | "unknown";
type GroundContact = "none" | "standing" | "walking";
type StrollerState = "awake" | "asleep";
type StrollerWindProtection = "none" | "partial" | "good" | "unknown";
type CarrierPlacement = "under_wearer_outerwear" | "over_wearer_outerwear";
type CarTemperatureSource = "measured" | "manual" | "estimated";
type DataOrigin = "api" | "cache" | "manual" | "api_with_manual_override";
type WeatherFreshness = "fresh" | "stale" | "unknown";
type ApparentTempFactor = "wind" | "humidity" | "sun";
type ThermalWeight = 0 | 1 | 2 | 3 | 4;
type ProtectionLevel = 0 | 1 | 2 | 3;
type CarSeatCompatibility = "allowed" | "conditional" | "prohibited";
type RecommendationSeverity = "info" | "caution" | "hard_rule";
type RecommendationStatus = "idle" | "ready" | "ready_with_estimate" | "partial" | "blocked";
type RecommendationPhase = "main" | "outdoor_transition" | "in_car";
type AlternativeRelation = "equivalent" | "warmer" | "cooler";
type WearPosition = "on_body" | "under_harness" | "over_harness" | "external";
type ItemSelectionSource = "engine" | "manual_lock" | "safety_override";
type ItemKind =
  | "clothing"
  | "footwear"
  | "stroller_accessory"
  | "carrier_accessory"
  | "sleep_bag";
```

`calm` bleibt in Schema V1 aus Rückwärtskompatibilitätsgründen lesbar. Die aktuelle App erzeugt für normale/ruhige Wachaktivität `normal`; vorhandenes `calm` wird beim Laden der UI-Kontexte auf `normal` normalisiert. Sichtbar unterschieden werden nur `normal` und `active` bzw. im Kinderwagen `Schläft | Wach | Sehr aktiv`.

## 4. Babyprofil

V1 hat genau ein aktives lokales Profil.

```ts
interface BabyProfile {
  profileId: string;
  displayName: string | null;
  birthDate: string | null; // YYYY-MM-DD
  warmthBias: WarmthBias;
  styleTheme: StyleTheme;
  defaultMode: SituationMode;
  createdAt: string;
  updatedAt: string;
}
```

Beispiel:

```json
{
  "profileId": "baby_001",
  "displayName": "Baby",
  "birthDate": "2026-01-24",
  "warmthBias": "neutral",
  "styleTheme": "neutral",
  "defaultMode": "stroller",
  "createdAt": "2026-08-25T12:00:00.000Z",
  "updatedAt": "2026-08-25T12:00:00.000Z"
}
```

Regeln:

- V1-Scope: 0–24 Monate,
- `birthDate` bleibt optional,
- bei unbekanntem Alter + direkter Sonne gilt konservativ die `<12 Monate`-Sonnenregel,
- kein Kleidungsinventar,
- kein Schlafsackinventar,
- keine Hersteller-/Markenfelder für Schlafsäcke,
- `warmthBias` ist manuell und wird nicht automatisch gelernt.

## 5. Wetterdaten

### 5.1 Wetterpunkt

```ts
interface WeatherPoint {
  time: string;
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

### 5.2 Wetterserie

```ts
interface WeatherLocation {
  locationId: string | null;
  label: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
}

interface WeatherSeries {
  weatherId: string;
  location: WeatherLocation;
  origin: DataOrigin;
  source: string;
  fetchedAt: string;
  freshness: WeatherFreshness;
  current: WeatherPoint;
  hourly: WeatherPoint[];
}
```

Die `hourly`-Werte werden benötigt, damit Regen-/Wind-/UV-Regeln den geplanten Aufenthaltszeitraum statt nur einen einzelnen Moment bewerten können.

### 5.3 Open-Meteo-Mapping

Für den Open-Meteo-Adapter gilt nach dokumentierter Semantik:

```json
{
  "apparentTempTrusted": true,
  "apparentTempIncludes": ["wind", "humidity", "sun"]
}
```

Open-Meteo beschreibt `apparent_temperature` als Kombination von Windchill, relativer Feuchte und Solarstrahlung. Der Adapter darf diese Faktoren deshalb als bereits enthalten markieren.

### 5.4 Beispiel

```json
{
  "weatherId": "weather_001",
  "location": {
    "locationId": "geo_001",
    "label": "Salzburg",
    "latitude": 47.8095,
    "longitude": 13.055,
    "timezone": "Europe/Vienna"
  },
  "origin": "api",
  "source": "open_meteo",
  "fetchedAt": "2026-08-25T12:15:00.000Z",
  "freshness": "fresh",
  "current": {
    "time": "2026-08-25T14:00:00+02:00",
    "airTempC": 23.8,
    "apparentTempC": 24.4,
    "apparentTempTrusted": true,
    "apparentTempIncludes": ["wind", "humidity", "sun"],
    "windSpeedKmh": 18,
    "windGustKmh": 28,
    "precipProbabilityPct": 30,
    "precipMm": 0,
    "precipitationType": "none",
    "uvIndex": 5.8,
    "cloudCoverPct": 35,
    "isDay": true
  },
  "hourly": []
}
```

### 5.5 Manuelle Überschreibung

Die UI darf API-Werte überschreiben. Der normalisierte Datensatz erhält dann `origin: "api_with_manual_override"` bzw. `manual`.

Fehlende optionale Wetterwerte sind `null` und werden nie als 0 interpretiert.

### 5.6 Wettercache und Freshness

`fetchedAt` ist für Cache-Alter und Freshness normativ. `current.time`/Provider-Beobachtungszeit darf dafür nicht als Ersatz verwendet werden.

V1-Grenzen:

- Alter `<= 30 Minuten`: `fresh`,
- Alter `> 30` und `<= 120 Minuten`: `stale`, weiterhin nutzbar,
- Alter `> 120 Minuten`: abgelaufen und nicht mehr als `WeatherSeries` an die Outfitengine geben.

`expired` ist bewusst **kein** Wert von `WeatherFreshness`: zu alte Daten sind kein nutzbarer Wetterdatensatz mehr, sondern ein Integrations-/Runtime-Zustand. Bei automatisch geladenen Wetterdaten erhält ein wiederverwendeter Cache `origin: "cache"`. Manuell eingegebene bzw. manuell überschriebene Wetterdaten behalten dagegen `origin: "manual"` bzw. `origin: "api_with_manual_override"`, damit ihre Provenienz nicht verloren geht. Für alle Ursprünge bleiben die Freshness- und Ablaufgrenzen identisch.

Zusätzliche Invarianten:

- Cache darf nur für denselben Wetterstandort wiederverwendet werden.
- Ungültiges `fetchedAt` macht einen Cache unbrauchbar.
- Liegt `fetchedAt` mehr als fünf Minuten in der Zukunft, ist der Cache unbrauchbar; bis zu fünf Minuten lokale Uhrabweichung dürfen als Alter `0` behandelt werden.
- `stale` Wetter führt in wetterabhängigen Phasen zu sichtbarer Unsicherheit (`partial` plus `WEATHER_DATA_STALE`).
- Abgelaufene, ungültige oder standortfremde Cachewerte dürfen nicht als aktuelle Temperatur, Wind-, Regen- oder UV-Werte angezeigt werden.
- Dieselben Grenzen gelten bei Offline-Nutzung und als Fallback nach fehlgeschlagenem Online-Refresh.
- Bei automatischen Wetterdaten löst der Übergang zu `stale` online einen erneuten Abruf aus; ein stale Datensatz bleibt nur als zeitlich begrenzter Fallback erhalten, wenn die Aktualisierung nicht gelingt.
- Wenn bei stale automatischem Wetter ein bereits erreichter stündlicher Prognosepunkt als neuer Referenzpunkt verwendet wird, muss das Wetterrisikofenster für Wind, Regen und UV weiterhin den ab tatsächlicher Request-Zeit geplanten Zeitraum abdecken. Zeitstempel der Wetterpunkte werden dafür nicht umgeschrieben.
- `sleep` und `indoor` verwenden keinen Wettercache als thermischen Input; maßgeblich bleibt ausschließlich `roomTempC`.

## 6. Abgeleitete Wetter-/Thermalwerte

Diese Strukturen müssen nicht persistent gespeichert werden.

```ts
interface ThermalEnvironment {
  thermalReferenceC: number;
  referenceSource: "air_temp" | "apparent_temp" | "room_temp" | "cabin_temp";
  alreadyIncludedFactors: ApparentTempFactor[];
}

interface WeatherWindowSummary {
  startTime: string;
  endTime: string;
  maxPrecipProbabilityPct: number | null;
  totalPrecipMm: number | null;
  maxWindSpeedKmh: number | null;
  maxWindGustKmh: number | null;
  maxUvIndex: number | null;
  missingFields: string[];
}
```

Wenn `plannedMinutes` fehlt, verwendet die Engine für Wetterrisiken ein 2-Stunden-Fenster.

## 7. Situationskontexte

### 7.1 Outdoor

```ts
interface OutdoorContext {
  mode: "outdoor";
  plannedMinutes: number | null;
  activity: ActivityLevel;
  activitySource: ActivitySource;
  sunExposure: SunExposure;
  groundContact: GroundContact;
}
```

Für neu erzeugte UI-Kontexte gilt `activity: "normal" | "active"`; `calm` ist nur noch ein lesbarer Legacy-Wert und wird beim Laden auf `normal` normalisiert.

### 7.2 Kinderwagen

```ts
interface StrollerContext {
  mode: "stroller";
  plannedMinutes: number | null;
  strollerState: StrollerState;
  activity: ActivityLevel;
  activitySource: ActivitySource;
  sunExposure: SunExposure;
  windProtection: StrollerWindProtection;
}
```

Invariante:

- `strollerState: "asleep"` überschreibt die Aktivitätswirkung thermisch,
- `strollerState: "awake"` darf `activity: "active"` haben,
- Kinderwagen ist nie automatisch gleichbedeutend mit passiv,
- die UI zeigt keine zwei getrennten Felder mehr, sondern mappt `Schläft` → `asleep + normal`, `Wach` → `awake + normal`, `Sehr aktiv` → `awake + active`,
- `calm` wird bei geladenen UI-Kontexten wie `normal` behandelt.

### 7.3 Trage

```ts
interface CarrierContext {
  mode: "carrier";
  plannedMinutes: number | null;
  sunExposure: SunExposure;
  placement: CarrierPlacement;
}
```

Tragecover wird nicht als Besitz-Eingabe benötigt. Es kann als empfehlbares/austauschbares Item im Outfit erscheinen.

### 7.4 Auto

```ts
interface CarContext {
  mode: "car";
  plannedMinutes: number | null;
  includeOutdoorTransition: boolean;
  outsideTransitionMinutes: number | null;
  cabinTempC: number;
  cabinTempSource: CarTemperatureSource;
}
```

Ist die Innenraumtemperatur nicht bekannt, liefert die vorgelagerte Integrationslogik einen geschätzten Wert mit `cabinTempSource: "estimated"`. Die Outfitengine muss diesen Ursprung bis ins Ergebnis tragen.

Normative V1-Schätzpolicy:

```ts
const V1_ESTIMATED_CABIN_TEMP_C = 20;

function estimateCabinTemperature(): Pick<CarContext, "cabinTempC" | "cabinTempSource"> {
  return {
    cabinTempC: V1_ESTIMATED_CABIN_TEMP_C,
    cabinTempSource: "estimated"
  };
}
```

Regeln:

- die Funktion gehört zur Integrationslogik und nicht in die Outfitengine oder den DOM-Code,
- sie nimmt in V1 bewusst **keine Wetterwerte** als Eingabe; insbesondere wird `airTempC` nicht in eine Innenraumtemperatur umgerechnet,
- 20 °C ist eine grobe neutrale Annahme für einen klima-kontrollierten Fahrzeuginnenraum, keine Messung und keine Vorhersage,
- mit den vorhandenen V1-Inputs fehlen HVAC-Status, Vorheizen/Vorkühlen, Parkdauer, solare Aufheizung und tatsächlicher Startzustand; eine dynamische Formel wäre deshalb scheinpräzise,
- manuelle Änderung von `cabinTempC` setzt `cabinTempSource: "manual"`,
- `cabinTempSource: "measured"` wird nur verwendet, wenn der Nutzer einen tatsächlich gemessenen Wert ausdrücklich so markiert,
- Zurückschalten auf `estimated` setzt `cabinTempC` wieder auf 20 °C,
- `outdoor_transition` verwendet weiterhin Außenwetter; `in_car` verwendet ausschließlich `cabinTempC`,
- Gurtsicherheitsregeln sind unabhängig von `cabinTempSource` und vom geschätzten Temperaturwert.

### 7.5 Drinnen

```ts
interface IndoorContext {
  mode: "indoor";
  roomTempC: number | null;
  activity: ActivityLevel;
  activitySource: ActivitySource;
}
```

Invarianten:

- `roomTempC` ist der einzige thermische Umgebungsinput,
- `weather` wird für `indoor` nicht benötigt und darf `null` sein,
- die aktuelle UI erzeugt nur `activity: "normal" | "active"`,
- `calm` wird beim Laden wie `normal` behandelt,
- `indoor` verwendet keine TOG-/Schlafsacklogik und keine Outdoor-Wetterrisiken.

### 7.6 Schlaf

```ts
interface SleepContext {
  mode: "sleep";
  roomTempC: number | null;
}
```

Kein Feld für eigenen Schlafsack oder Herstellerdaten. Lose Bettware ist im `sleep`-Modus unabhängig von der gewählten Schlafsackoption kein zulässiger Wärmeausgleich; zusätzliche Wärme wird nur über geeignete körpernahe Schlafkleidung oder einen passenden Schlafsack modelliert.

```ts
type SituationContext =
  | OutdoorContext
  | StrollerContext
  | CarrierContext
  | CarContext
  | IndoorContext
  | SleepContext;
```

## 8. Outfit-Katalog

### 8.1 Körperzonen und Slots

```ts
type BodyZone = "torso" | "arms" | "legs" | "feet" | "hands" | "head" | "neck";

type OutfitSlot =
  | "base_torso"
  | "legs"
  | "mid"
  | "outer"
  | "feet"
  | "head"
  | "hands"
  | "footwear"
  | "stroller_thermal_accessory"
  | "stroller_weather_accessory"
  | "carrier_accessory"
  | "sleep_bag"
  | "sleep_underlayer";
```

### 8.2 Schlafsack-TOG

```ts
type SleepBagTog = 0.5 | 1.0 | 1.5 | 2.5 | 3.5;
```

`kein Schlafsack` wird als eigenes Katalogitem `sleep_bag_none` dargestellt.

### 8.3 Itemdefinition

```ts
interface OutfitItemDefinition {
  itemId: string;
  kind: ItemKind;
  slot: OutfitSlot;
  category: string;
  labelKey: string;
  bodyZones: BodyZone[];

  thermalWeight: ThermalWeight;
  thermalStepCredit: number; // externe Isolation/Carrier-Zubehör; sonst 0
  sleepWarmthWeight: number | null;
  tog: SleepBagTog | null;

  windProtection: ProtectionLevel;
  rainProtection: ProtectionLevel;
  sunCoverage: ProtectionLevel;

  carSeatCompatibility: CarSeatCompatibility;
  sleepSafe: boolean;
  allowedSituations: SituationMode[];
  styleAssetGroup: string;
}
```

`thermalStepCredit` ist eine relative Produktheuristik und keine TOG-Einheit.

## 9. Kalibrierte Zubehördefinitionen

Beispiele:

```json
[
  {
    "itemId": "stroller_light_blanket",
    "kind": "stroller_accessory",
    "slot": "stroller_thermal_accessory",
    "category": "blanket",
    "labelKey": "gear.stroller_light_blanket",
    "bodyZones": ["torso", "legs", "feet"],
    "thermalWeight": 1,
    "thermalStepCredit": 0.5,
    "sleepWarmthWeight": null,
    "tog": null,
    "windProtection": 0,
    "rainProtection": 0,
    "sunCoverage": 0,
    "carSeatCompatibility": "prohibited",
    "sleepSafe": false,
    "allowedSituations": ["stroller"],
    "styleAssetGroup": "stroller_light_blanket"
  },
  {
    "itemId": "stroller_light_footmuff",
    "kind": "stroller_accessory",
    "slot": "stroller_thermal_accessory",
    "category": "footmuff",
    "labelKey": "gear.stroller_light_footmuff",
    "bodyZones": ["torso", "legs", "feet"],
    "thermalWeight": 2,
    "thermalStepCredit": 1,
    "sleepWarmthWeight": null,
    "tog": null,
    "windProtection": 1,
    "rainProtection": 0,
    "sunCoverage": 0,
    "carSeatCompatibility": "prohibited",
    "sleepSafe": false,
    "allowedSituations": ["stroller"],
    "styleAssetGroup": "stroller_light_footmuff"
  },
  {
    "itemId": "stroller_warm_footmuff",
    "kind": "stroller_accessory",
    "slot": "stroller_thermal_accessory",
    "category": "footmuff",
    "labelKey": "gear.stroller_warm_footmuff",
    "bodyZones": ["torso", "legs", "feet"],
    "thermalWeight": 4,
    "thermalStepCredit": 2,
    "sleepWarmthWeight": null,
    "tog": null,
    "windProtection": 2,
    "rainProtection": 0,
    "sunCoverage": 0,
    "carSeatCompatibility": "prohibited",
    "sleepSafe": false,
    "allowedSituations": ["stroller"],
    "styleAssetGroup": "stroller_warm_footmuff"
  },
  {
    "itemId": "stroller_rain_cover",
    "kind": "stroller_accessory",
    "slot": "stroller_weather_accessory",
    "category": "rain_cover",
    "labelKey": "gear.stroller_rain_cover",
    "bodyZones": [],
    "thermalWeight": 0,
    "thermalStepCredit": 0,
    "sleepWarmthWeight": null,
    "tog": null,
    "windProtection": 2,
    "rainProtection": 3,
    "sunCoverage": 0,
    "carSeatCompatibility": "prohibited",
    "sleepSafe": false,
    "allowedSituations": ["stroller"],
    "styleAssetGroup": "stroller_rain_cover"
  },
  {
    "itemId": "stroller_sunshade",
    "kind": "stroller_accessory",
    "slot": "stroller_weather_accessory",
    "category": "sunshade",
    "labelKey": "gear.stroller_sunshade",
    "bodyZones": [],
    "thermalWeight": 0,
    "thermalStepCredit": 0,
    "sleepWarmthWeight": null,
    "tog": null,
    "windProtection": 0,
    "rainProtection": 0,
    "sunCoverage": 3,
    "carSeatCompatibility": "prohibited",
    "sleepSafe": false,
    "allowedSituations": ["stroller"],
    "styleAssetGroup": "stroller_sunshade"
  }
]
```

## 10. Generische Schlafsackdefinitionen

```json
[
  {"itemId":"sleep_bag_none","kind":"sleep_bag","slot":"sleep_bag","tog":null,"sleepWarmthWeight":0},
  {"itemId":"sleep_bag_0_5","kind":"sleep_bag","slot":"sleep_bag","tog":0.5,"sleepWarmthWeight":1},
  {"itemId":"sleep_bag_1_0","kind":"sleep_bag","slot":"sleep_bag","tog":1.0,"sleepWarmthWeight":2},
  {"itemId":"sleep_bag_1_5","kind":"sleep_bag","slot":"sleep_bag","tog":1.5,"sleepWarmthWeight":3},
  {"itemId":"sleep_bag_2_5","kind":"sleep_bag","slot":"sleep_bag","tog":2.5,"sleepWarmthWeight":4},
  {"itemId":"sleep_bag_3_5","kind":"sleep_bag","slot":"sleep_bag","tog":3.5,"sleepWarmthWeight":5}
]
```

Die vollständigen Katalogobjekte müssen zusätzlich `sleepSafe`, `allowedSituations`, Label/Assets usw. enthalten. Die Kurzform zeigt nur die normative TOG-/Gewichtszuordnung.

## 11. Schlaf-Unterkleidung

Empfohlene interne Gewichte:

```ts
type SleepUnderlayerPreset =
  | "nappy_only"
  | "short_sleeve_bodysuit"
  | "long_sleeve_bodysuit"
  | "light_pajamas"
  | "short_bodysuit_plus_light_pajamas"
  | "long_bodysuit_plus_light_pajamas";
```

Zuordnung:

```json
{
  "nappy_only": 0,
  "short_sleeve_bodysuit": 1,
  "long_sleeve_bodysuit": 2,
  "light_pajamas": 2,
  "short_bodysuit_plus_light_pajamas": 3,
  "long_bodysuit_plus_light_pajamas": 4
}
```

Diese Werte sind Rebalancing-Gewichte, keine TOG-Werte.

## 12. Recommendation-Session und Locks

### 12.1 Lock

```ts
interface ItemLock {
  phase: RecommendationPhase;
  slot: OutfitSlot;
  itemId: string;
  lockedAt: string;
}
```

### 12.2 Session

```ts
interface RecommendationSessionState {
  sessionId: string;
  manualLocks: ItemLock[];
  warmthOffset: -1 | 0 | 1;
}
```

- ein Tap-Austausch erzeugt/ersetzt einen Lock für den Slot,
- Locks gelten nur für die aktuelle Session,
- neue Wetter-/Ort-/Modus-Session kann ohne alte Locks starten,
- harte Safety-Regeln dürfen einen Lock überstimmen und müssen das Ergebnis kennzeichnen.

## 13. Empfehlungs-Request

```ts
interface OutfitRecommendationRequest {
  requestId: string;
  requestedAt: string;
  profile: BabyProfile;
  context: SituationContext;
  weather: WeatherSeries | null;
  session: RecommendationSessionState;
  neckFeedback: NeckFeedback | null;
}
```

Validierung:

- `sleep`: `weather` darf `null` sein; `roomTempC` wird für vollständige Empfehlung benötigt,
- `indoor`: `weather` darf `null` sein; `roomTempC` wird für vollständige Empfehlung benötigt,
- `outdoor/stroller/carrier`: aktuelle Außentemperatur erforderlich; weitere fehlende Wetterwerte erlauben `partial`/Unsicherheit,
- abgelaufener/ungültiger/standortfremder Wettercache gilt für den Engine-Request als fehlendes Wetter und wird nicht als `WeatherSeries` weitergereicht,
- `car`: `cabinTempC` ist Pflicht, darf aber `estimated` sein,
- `car` mit Outdoor-Transition braucht Wetter nur für die Transition-Phase.

## 14. Alternative und projizierte Änderungen

```ts
interface ProjectedChange {
  phase: RecommendationPhase;
  slot: OutfitSlot;
  fromItemId: string | null;
  toItemId: string | null;
  reasonCode: string;
}

interface AlternativeOption {
  itemId: string;
  relation: AlternativeRelation;
  relativeThermalDelta: number;
  projectedChanges: ProjectedChange[];
}
```

Sortierung:

1. `equivalent`,
2. `warmer`,
3. `cooler`,

innerhalb der Gruppe nach kleinstem Gesamteingriff.

## 15. Empfehlungs-Slots

```ts
interface RecommendedItem {
  itemId: string;
  selectionSource: ItemSelectionSource;
  wearPosition: WearPosition;
  reasonCodes: string[];
}

interface RecommendationSlotResult {
  phase: RecommendationPhase;
  slot: OutfitSlot;
  selected: RecommendedItem;
  alternatives: AlternativeOption[];
}
```

Die UI zeigt pro Slot das Bild des ausgewählten Items und öffnet `alternatives` beim Tap.

## 16. Phasenweise Auswertung

```ts
interface RecommendationPhaseEvaluation {
  phase: RecommendationPhase;
  status: "ready" | "ready_with_estimate" | "partial" | "blocked";
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

Nicht-Auto-Modi einschließlich `indoor` verwenden `main`. Auto verwendet `in_car` und optional `outdoor_transition`.

## 17. Hinweise / Safety Codes

```ts
interface RecommendationNotice {
  code: string;
  severity: RecommendationSeverity;
  phase: RecommendationPhase | null;
  reasonCodes: string[];
  data: Record<string, string | number | boolean | null>;
}
```

Normative Codes mindestens:

- `CHECK_NECK`,
- `CAR_SEAT_NO_BULKY_LAYERS`,
- `CAR_SEAT_REMOVE_OUTER_BEFORE_HARNESS`,
- `CAR_SEAT_BLANKET_OVER_HARNESS_ONLY`,
- `CAR_SEAT_CONDITIONAL_LAYER_CHECK_FIT`,
- `CAR_CABIN_TEMPERATURE_ESTIMATED`,
- `SLEEP_NO_HAT`,
- `SLEEP_NO_LOOSE_BEDDING`,
- `SLEEP_NO_WEIGHTED_PRODUCTS`,
- `SLEEP_USE_ROOM_TEMPERATURE`,
- `SLEEP_GENERIC_TOG_ORIENTATION`,
- `STROLLER_DO_NOT_COVER_AIRFLOW`,
- `STROLLER_RAIN_COVER`,
- `STROLLER_SUNSHADE`,
- `INFANT_UNDER_12M_AVOID_DIRECT_SUN`,
- `AGE_UNKNOWN_DIRECT_SUN_CONSERVATIVE_RULE`,
- `UV_SHADE_AND_COVERAGE`,
- `WEATHER_DATA_STALE`,
- `WEATHER_DATA_INCOMPLETE`,
- `EXTREME_COLD_CAUTION`,
- `EXTREME_HEAT_CAUTION`,
- `STRONG_WIND_CAUTION`,
- `MANUAL_LOCK_OVERRIDDEN_FOR_SAFETY`.

`SLEEP_NO_LOOSE_BEDDING` gilt für den gesamten `sleep`-Modus: keine lose Decke oder andere lose Bettware im Schlafbereich, unabhängig davon, ob `sleep_bag_none` oder ein TOG-Schlafsack gewählt ist.

## 18. Regelspur

```ts
interface RuleTraceEntry {
  ruleId: string;
  phase: RecommendationPhase;
  effect:
    | "add"
    | "remove"
    | "replace"
    | "thermal_up"
    | "thermal_down"
    | "protect"
    | "lock"
    | "override_lock"
    | "notice"
    | "no_change";
  target: string | null;
  delta: number | null;
  reasonCode: string;
}
```

## 19. Empfehlungsergebnis

```ts
interface OutfitRecommendation {
  recommendationId: string;
  requestId: string;
  generatedAt: string;
  sessionId: string;
  mode: SituationMode;
  status: RecommendationStatus;
  phases: RecommendationPhaseEvaluation[];
  slots: RecommendationSlotResult[];
  notices: RecommendationNotice[];
  ruleTrace: RuleTraceEntry[];
  dataQuality: {
    weatherFreshness: WeatherFreshness | null;
    missingFields: string[];
    usedManualWeather: boolean;
    usedEstimatedCabinTemperature: boolean;
  };
}
```

## 20. Kinderwagen-Beispiel

```json
{
  "context": {
    "mode": "stroller",
    "plannedMinutes": 90,
    "strollerState": "awake",
    "activity": "active",
    "activitySource": "user",
    "sunExposure": "partial",
    "windProtection": "partial"
  },
  "session": {
    "sessionId": "session_001",
    "manualLocks": [],
    "warmthOffset": 0
  }
}
```

In der UI entspricht dieses Beispiel `Sehr aktiv`. Bei 8 °C könnte die Engine z. B. einen leichten Fußsack statt des warmen Fußsacks wählen, weil `awake + active` thermisch leichter bewertet wird als `asleep`.

## 21. Austausch-Beispiel Fußsack → Decke

Vorher:

```json
{
  "phase": "main",
  "slot": "stroller_thermal_accessory",
  "selected": {
    "itemId": "stroller_warm_footmuff",
    "selectionSource": "engine",
    "wearPosition": "external",
    "reasonCodes": ["STROLLER_COLD_EXTERNAL_INSULATION"]
  }
}
```

Nutzer wählt warme Decke:

```json
{
  "sessionId": "session_001",
  "manualLocks": [
    {
      "phase": "main",
      "slot": "stroller_thermal_accessory",
      "itemId": "stroller_warm_blanket",
      "lockedAt": "2026-08-25T12:30:00.000Z"
    }
  ],
  "warmthOffset": 0
}
```

Die nächste Engine-Ausgabe muss diesen Lock respektieren und bei Bedarf Körperkleidung ändern.

## 22. Schlaf-Beispiel und TOG-Tausch

Ausgangslage:

```json
{
  "context": {
    "mode": "sleep",
    "roomTempC": 18.5
  },
  "session": {
    "sessionId": "sleep_session_001",
    "manualLocks": [],
    "warmthOffset": 0
  }
}
```

Hauptempfehlung kann `sleep_bag_2_5 + short_sleeve_bodysuit` sein.

Wählt der Nutzer `sleep_bag_1_0`, wird gespeichert:

```json
{
  "phase": "main",
  "slot": "sleep_bag",
  "itemId": "sleep_bag_1_0",
  "lockedAt": "2026-08-25T20:00:00.000Z"
}
```

Danach muss die Engine die Unterkleidung auf ein wärmeres Preset umstellen. Sie darf keine lose Bettware als thermischen Ausgleich erzeugen; dieselbe Regel gilt ausdrücklich auch bei `sleep_bag_none`.

## 23. Auto-Beispiel mit Schätzung

```json
{
  "mode": "car",
  "plannedMinutes": 30,
  "includeOutdoorTransition": true,
  "outsideTransitionMinutes": 5,
  "cabinTempC": 20,
  "cabinTempSource": "estimated"
}
```

Die `20` ist in V1 die feste neutrale Integrationsannahme und keine aus dem Außenwetter errechnete Temperatur.

Ergebnis muss enthalten:

- eigene Phase `outdoor_transition`,
- eigene Phase `in_car`,
- `CAR_CABIN_TEMPERATURE_ESTIMATED`,
- keine voluminöse Schicht `under_harness`.

## 24. Drinnen-Beispiel

```json
{
  "context": {
    "mode": "indoor",
    "roomTempC": 20,
    "activity": "normal",
    "activitySource": "user"
  },
  "weather": null
}
```

Die Empfehlung verwendet `thermalReferenceSource: "room_temp"`. `activity: "active"` wird thermisch leichter bewertet; Außenwetterrisiken und TOG-Schlaflogik bleiben inaktiv.

## 25. Nackentest

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

Feedback kann optional lokal gespeichert/exportiert werden, wird in V1 aber nicht für automatisches Langzeitlernen verwendet.

## 26. Runtime-State

```ts
type ConnectivityStatus = "online" | "offline" | "unknown";
type LocationStatus = "idle" | "requesting" | "available" | "denied" | "unavailable" | "not_required";
type WeatherStatus = "idle" | "loading" | "fresh" | "stale" | "manual" | "unavailable" | "error";
type WeatherCacheStatus = "fresh" | "stale" | "expired" | "invalid" | "location_mismatch" | null;

interface AppRuntimeState {
  connectivity: ConnectivityStatus;
  locationStatus: LocationStatus;
  weatherStatus: WeatherStatus;
  weatherCacheStatus: WeatherCacheStatus;
  weatherCacheAgeMinutes: number | null;
  recommendationStatus: RecommendationStatus;
  activeProfileId: string | null;
  activeMode: SituationMode;
  weather: WeatherSeries | null;
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

Die Achsen sind unabhängig. `offline + stale + partial` ist gültig. `offline + expired + weather:null + blocked` ist für wetterabhängige Modi ebenfalls gültig; in `sleep` und `indoor` kann trotz `weather:null` eine vollständige Empfehlung aus `roomTempC` entstehen.

## 27. Einstellungen

```ts
interface LocalSettings {
  defaultMode: SituationMode;
  temperatureUnit: "celsius";
  weatherMode: "auto_with_override";
  allowLocation: boolean | null;
  weatherCacheMaxAgeMinutes: number;
}
```

`weatherCacheMaxAgeMinutes` ist in V1 standardmäßig `120`. Ein gespeicherter oder importierter Wert darf die Wiederverwendung strenger machen, wird aber auf `30..120` Minuten begrenzt; die harte 120-Minuten-Grenze darf nicht erweitert werden.

## 28. Persistenz

Empfohlene Keys:

- `babyweather.v1.profile`,
- `babyweather.v1.settings`,
- `babyweather.v1.feedback`,
- `babyweather.v1.weatherCache`.

Aktuelle Recommendation-Sessions/Locks müssen nicht über App-Neustarts persistiert werden. Das verhindert, dass alte manuelle Outfitentscheidungen auf neues Wetter übertragen werden.

## 29. JSON-Export

```ts
interface ExportPayloadV1 {
  profile: BabyProfile | null;
  settings: LocalSettings;
  feedback: NeckFeedbackEvent[];
}
```

Keine Schlafsack-/Kleidungsinventare in V1 exportieren. Der Wettercache selbst ist Laufzeit-/Offline-Datenbestand und wird nicht exportiert.

## 30. Importvalidierung

Vor Speicherung vollständig prüfen:

1. gültiges JSON,
2. unterstützte `schemaVersion`,
3. bekannte Enums einschließlich `indoor`,
4. Pflichtfelder,
5. endliche Zahlen,
6. Prozentwerte 0–100,
7. gültige Datumsstrings,
8. Geburtsdatum nicht in der Zukunft,
9. V1-Altersbereich sauber behandeln,
10. `apparentTempTrusted: true` nur mit `apparentTempC != null`,
11. `SleepBagTog` nur aus `{0.5,1.0,1.5,2.5,3.5}`,
12. `cabinTempSource: estimated` muss als Schätzung bis ins Ergebnis gelangen,
13. `weatherCacheMaxAgeMinutes`: Legacy-`null` aus älteren Schema-V1-Exports wird auf den V1-Standard `120` migriert; andere Werte müssen endliche Zahlen sein und werden auf `30..120` begrenzt,
14. unbekannte Safety-Enums ablehnen,
15. ungültiger Import überschreibt lokale Daten nicht teilweise.

## 31. Regel-ID-Schema

Empfohlen:

- `baseline.temp.*`,
- `activity.*`,
- `weather.apparent.*`,
- `weather.wind.*`,
- `weather.rain.*`,
- `weather.uv.*`,
- `situation.stroller.*`,
- `situation.carrier.*`,
- `situation.car.*`,
- `situation.indoor.*`,
- `situation.sleep.*`,
- `swap.*`,
- `feedback.neck.*`,
- `safety.*`.

## 32. Testinvarianten

1. `styleTheme` ändert keine Fach-Item-IDs oder Safety-Codes.
2. Kinderwagen erzwingt nicht `activity: calm/passive`.
3. Die Kinderwagen-UI bietet genau `Schläft | Wach | Sehr aktiv` und mappt diese Werte deterministisch auf `strollerState`/`activity`.
4. `awake + active` und `asleep` im Kinderwagen dürfen unterschiedliche Empfehlungen erzeugen.
5. Fußsack/Decke werden von der App empfohlen und nicht als Besitz vorausgesetzt.
6. Zubehörtausch löst vollständiges Rebalancing aus.
7. Manueller Lock bleibt innerhalb der Session bestehen.
8. Safety darf Lock überstimmen und erzeugt `MANUAL_LOCK_OVERRIDDEN_FOR_SAFETY`.
9. Regenverdeck kann Regenjacke im geschützten Kinderwagen ersetzen.
10. Sonnensegel/Sonnenschirm ist als Kinderwagen-Zubehör modellierbar.
11. `apparentTempIncludes: wind` verhindert doppelten thermischen Windmodifikator.
12. Windschutz-Anforderung bleibt trotzdem aktiv.
13. Fehlende Wetterfelder sind nie automatisch 0.
14. `precipProbability >=60` im relevanten Fenster löst Regenschutz aus.
15. `precipProbability <40` allein löst keinen Regenschutz aus.
16. Trage-Körperwärme wirkt primär am bedeckten Rumpf.
17. Tragecover/Jacke stapeln Wärmekredit nur bis zum definierten Cap.
18. Winteroverall ist in `car/in_car` nie `under_harness`.
19. geschätzte Autotemperatur wird sichtbar als Schätzung markiert.
20. `indoor` verwendet ausschließlich `roomTempC` und funktioniert mit `weather:null`.
21. `indoor + active` ist thermisch leichter als `indoor + normal`.
22. `indoor` erzeugt keine wetterbezogenen Außenschutzslots allein aus der Raumtemperatur.
23. Schlaf verwendet ausschließlich `roomTempC` als Umgebungs-Temperaturinput.
24. `sleep_bag_none`, 0.5, 1.0, 1.5, 2.5 und 3.5 TOG sind austauschbar.
25. TOG-Tausch verändert bei Bedarf `sleep_underlayer`.
26. Schlafmodus erzeugt nie lose Bettware als Wärmeausgleich – auch nicht bei `sleep_bag_none`.
27. `wärmer` / `dünner` verändert möglichst wenige Slots.
28. `hot_sweaty` erhöht Isolation nie.
29. `cool` reduziert Isolation nie.
30. kalte Hände/Füße allein ändern die globale Wärmestufe nicht.
31. Schuhe werden nur bei `standing|walking` bzw. tatsächlichem Bodenkontakt empfohlen.
32. Nackentest/Swap-Historie verändert V1 nicht automatisch dauerhaft den `warmthBias`.
33. Wettercache ist bis einschließlich 30 Minuten `fresh`, danach bis einschließlich 120 Minuten `stale` und erst danach abgelaufen.
34. Abgelaufener, ungültiger oder standortfremder Cache wird nicht als aktuelles Wetter an die Engine gegeben oder mit alten Wetterwerten dargestellt.
35. `stale` Wetter erzeugt `partial` plus `WEATHER_DATA_STALE`.
36. Schlaf und Drinnen bleiben auch bei abgelaufenem/fehlendem Wettercache ausschließlich von `roomTempC` abhängig.
37. Wiederverwendete manuelle Wetterwerte behalten ihre manuelle Provenienz und werden nicht durch ältere automatische Stundenwerte als `current` ersetzt.
38. Bei stale automatischem Wetter deckt das Risikozeitfenster weiterhin den ab Request-Zeit geplanten Zeitraum ab.
39. `cabinTempSource: estimated` wird von der Integrationslogik mit exakt 20 °C erzeugt und nie aus Außenwetter berechnet.
40. `manual | measured | estimated` verändern keine Autositz-Gurtsicherheitsregeln.
41. manuelle Änderung von `cabinTempC` setzt `cabinTempSource: manual`; Zurückschalten auf `estimated` setzt wieder 20 °C.
42. `outdoor_transition` verwendet Außenwetter, während `in_car` ausschließlich `cabinTempC` als Temperaturreferenz verwendet.
43. `calm` wird von der aktuellen App-Integration bei geladenen Outdoor-/Kinderwagenkontexten auf `normal` normalisiert.

## 33. Noch offene technische Datenentscheidungen

Die V1-Entscheidung für `cabinTempSource: estimated` ist geschlossen: die Integrationslogik verwendet die neutrale, transparent gekennzeichnete 20-°C-Annahme ohne Außenwetter-Ableitung.

Keine wesentlichen Produktentscheidungen sind mehr offen. Technisch noch festzulegen:

- vollständige statische Katalogzuordnung aller konkreten Kleidungs- und Asset-IDs,
- ob `ruleTrace` nur Laufzeitdaten bleibt oder in Debug-Exports aufgenommen wird.
