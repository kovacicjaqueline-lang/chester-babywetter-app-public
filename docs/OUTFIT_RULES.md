# Outfit Rules – V1 Fachliche Kleidungslogik

Status: fachlich kalibrierte V1-Produktheuristik  
Scope: thermische Baseline, Wettermodifikatoren, Situationslogik, Austausch/Rebalancing und harte Sicherheitsregeln

> Die konkreten Temperatur- und TOG-Bänder sind Produktheuristiken. Sie sind keine medizinische Norm und keine Garantie. Sicherheitsregeln und Nackentest haben Vorrang.

## 1. Regelpriorität

Die Engine wendet Regeln in dieser Reihenfolge an:

1. harte Sicherheitsregeln,
2. Modus/Situation,
3. thermische Baseline,
4. Wetter-Schutzanforderungen,
5. Aktivität und externe Isolation,
6. manuelle Wärmetendenz,
7. manuelle Item-Locks / Austausch,
8. `wärmer` / `dünner`,
9. Nackentest-Korrektur,
10. Stilvariante ausschließlich zur Darstellung.

Ein manuell fixiertes Teil darf nur dann entfernt werden, wenn es eine harte Sicherheitsregel verletzt. Die Engine erzeugt dann einen sichtbaren Override-Hinweis.

## 2. Thermisches Modell

### 2.1 `thermalReferenceC`

Für Outdoor-relevante Modi wird eine thermische Referenz bestimmt:

1. Ist `apparentTempC` vorhanden und vom Wetteradapter als vertrauenswürdig markiert, wird dieser Wert verwendet.
2. Andernfalls wird `airTempC` verwendet.
3. Faktoren, die bereits in `apparentTempC` enthalten sind, werden thermisch nicht erneut addiert.
4. Wind-, Regen- und UV-Schutz bleiben unabhängig davon als Funktionsanforderungen erhalten.

Für Open-Meteo kann `apparent_temperature` als bekannter Adapterwert mit `wind`, `humidity` und `sun` markiert werden, weil Open-Meteo diese Bestandteile dokumentiert.

### 2.2 `thermalStep`

Ein `thermalStep` ist eine relative Produktheuristik. Halbe Schritte sind erlaubt.

Beispiele für ungefähr `+1`:

- Kurzarmbody → Langarmbody,
- dünnes Shirt → dünner Pullover,
- dünne Hose → wärmere Hose,
- leichte Jacke → wärmere Außenschicht,
- im Kinderwagen leichte externe Isolation ergänzen.

Ein Schritt bedeutet nicht zwingend ein zusätzliches Kleidungsstück.

### 2.3 `thermalWeight`

`thermalWeight` dient primär zum Sortieren, Tauschen und Rebalancing innerhalb vergleichbarer Körperzonen/Slots. Er ist **kein additiver physikalischer TOG-Ersatz**.

- `0`: praktisch keine thermische Funktion; Schutz-/Shell-Funktion,
- `1`: leichte Schicht,
- `2`: normale/moderate Schicht,
- `3`: warme Schicht,
- `4`: stark isolierende Schicht/äußere Isolation.

Beispiele:

- Regenjacke ohne Futter: 0–1,
- Kurzarmbody/T-Shirt: 1,
- Langarmbody/Hose/dünner Pullover: 2,
- Fleece/warme Hose/isolierende Softshell: 3,
- Winteroverall/warmer Fußsack: 4.

## 3. Outdoor-Temperaturbaseline

Baseline: Modus `outdoor`, Aktivität `normal`, trocken, keine starke Windexposition, kein zusätzlicher Wärmekredit.

### `>= 30 °C` – sehr heiß

- so wenig Isolation wie möglich,
- Kurzarmbody oder leichtes T-Shirt; je nach Situation auch nur sehr leichte Bedeckung,
- leichte Beinbedeckung nur für Sonne/Bodenschutz,
- keine Mittelschicht,
- kein thermischer Outer-Layer,
- aktiver Hitzhinweis.

UV-/Sonnenregeln bleiben aktiv; Sonnenschutz wird durch leichte Bedeckung statt zusätzlicher Wärmeschicht erreicht.

### `28 bis <30 °C` – sehr warm

- Kurzarmbody oder T-Shirt,
- sehr leichte Hose/Leggings optional bzw. für Sonnenschutz,
- keine Mittelschicht,
- Sonnenhut bei relevanter Exposition.

### `24 bis <28 °C` – warm

- Kurzarmbody oder T-Shirt,
- leichte Hose/Leggings,
- Socken nur nach Bedarf,
- kein isolierender Mid-Layer.

### `20 bis <24 °C` – mild

- Langarmbody **oder** Kurzarmbody + dünnes Langarmshirt,
- leichte Hose/Leggings,
- Socken,
- funktionale Außenschicht nur bei Wind/Regen.

### `16 bis <20 °C` – kühl

- Langarmbody,
- Hose/Leggings,
- dünner Pullover/Sweatshirt,
- Socken,
- bei Wind leichte windschützende Außenschicht.

### `12 bis <16 °C` – deutlich kühl

- Langarmbody,
- Hose/wärmere Leggings,
- dünner Pullover oder Fleece,
- Übergangs-/Softshelljacke,
- Socken,
- dünne/warme Mütze je nach Wind und Exposition.

### `8 bis <12 °C` – kalt

- Langarmbody,
- warme Beinbekleidung bzw. Hose + zusätzliche dünne Beinlage nach Bedarf,
- Fleece/warmer Mid-Layer,
- windschützende warme Außenschicht oder Übergangsoverall,
- warme Socken/Booties,
- warme Mütze,
- Handschuhe bei längerer Exposition.

### `3 bis <8 °C` – sehr kalt

- Langarmbody,
- warme Beinlage,
- isolierende Mittelschicht,
- warme Jacke/Overall außerhalb des Autositzes,
- warme Füße,
- warme Mütze,
- Handschuhe.

### `0 bis <3 °C` – nahe Gefrierpunkt

Wie `3–8 °C`, aber mit stärkerer Isolation bzw. externer Isolation im Kinderwagen und häufigerer Kontrolle.

### `<0 °C` – Extremkälte-Schwelle der V1-Produktlogik

Die App gibt weiterhin ein Outfit aus, erzeugt aber `EXTREME_COLD_CAUTION`. Sie addiert nicht unbegrenzt Schichten und behauptet keine sichere Expositionsdauer.

## 4. Aktivität

### Outdoor

- `calm`: `+0.5 thermalStep`,
- `normal`: `0`,
- `active`: `-1 thermalStep`.

Die App schlägt Aktivität möglichst aus Kontext/Alter vor und fragt nur, wenn die Unterscheidung relevant ist.

### Kinderwagen

Kinderwagen ist **nicht automatisch passiv**.

- `awake + active`: `0` relativ zur Outdoor-Normalbaseline,
- `awake + normal/calm`: `+0.5`,
- `asleep`: `+1`; Aktivitätswert wird thermisch ignoriert.

Damit kann ein Baby, das im Kinderwagen stark strampelt/rockt, deutlich leichter angezogen werden als ein schlafendes Baby bei gleichem Wetter.

### Trage

Keine normale Aktivitätskorrektur. Körperkontakt wird über die Trage-Regeln abgebildet.

### Auto / Schlaf

Keine Aktivitätskorrektur.

## 5. Windkalibrierung

Die Schutzstufen orientieren sich an den Beaufort-Landbereichen. Sie sind eine Produktkalibrierung, keine Baby-spezifische medizinische Schwelle.

### 5.1 Windschutz-Anforderung

- `<20 km/h`: kein Wind-Layer allein wegen Wind erforderlich,
- `20–28 km/h` (moderate breeze): `windProtection >= 1`,
- `29–38 km/h` (fresh breeze): `windProtection >= 2`,
- `39–49 km/h` (strong breeze): `windProtection >= 3`,
- `>=50 km/h`: `windProtection >= 3` + `STRONG_WIND_CAUTION`.

Böen:

- Böen `>=39 km/h` erhöhen die geforderte Windschutzstufe mindestens auf 2,
- Böen `>=50 km/h` mindestens auf 3,
- Böen `>=60 km/h` erzeugen zusätzlich `STRONG_WIND_CAUTION`.

### 5.2 Thermischer Windeffekt

Wenn `apparentTempIncludes` bereits `wind` enthält:

- **kein** zusätzlicher thermischer Wind-Step,
- Windschutz-Anforderung bleibt bestehen.

Wenn keine vertrauenswürdige scheinbare Temperatur vorliegt und das Baby exponiert ist:

- `20–28 km/h`: `+0.5 thermalStep`,
- `29–38 km/h`: `+1`,
- `39–49 km/h`: `+1.5`,
- `>=50 km/h`: maximal `+2` plus Warnhinweis.

Die Engine rechnet Wind nicht in erfundene zusätzliche Celsiusgrade um.

### 5.3 Windschutz des Kinderwagens

- `none`: keine Reduktion,
- `partial`: thermischen Windmodifikator um maximal `0.5` reduzieren,
- `good`: um maximal `1` reduzieren.

Windschutz darf nicht als luftdichtes Verschließen umgesetzt werden.

## 6. Regenkalibrierung

Regen ist zunächst eine Schutzfunktion, keine Wärmestufe.

Die Engine betrachtet den geplanten Zeitraum; fehlt eine Dauer, wird ein Standardfenster von **2 Stunden** verwendet.

### 6.1 Trigger

**Regen-/Nässeschutz erforderlich**, wenn:

- aktueller Niederschlag `>0`, oder
- Niederschlagsart aktuell `rain | sleet | snow`, oder
- maximale Niederschlagswahrscheinlichkeit im relevanten Zeitfenster `>=60 %`.

**Optional / bereithalten**, wenn:

- Wahrscheinlichkeit `40–59 %`.

**Kein automatisches Regenelement**, wenn:

- Wahrscheinlichkeit `<40 %` und kein aktueller Niederschlag.

Diese Prozentgrenzen sind Produktheuristiken zur Vermeidung von zu vielen Fehlalarmen.

### 6.2 Outdoor

Bei exponiertem Baby/Bodenkontakt:

- Regenjacke oder geeignete Shell,
- thermische Schichten darunter bleiben nach Temperatur gewählt,
- Regenjacke ohne Futter zählt nicht automatisch als warme Schicht.

### 6.3 Kinderwagen

Bei erforderlichem Regenschutz wird standardmäßig **Regenverdeck** als Situationszubehör empfohlen, sofern das Baby im Wagen bleibt.

- Regenjacke ist dann nicht automatisch zusätzlich nötig.
- Wird Regenverdeck manuell entfernt/getauscht, muss der Körperschutz neu berechnet werden.
- Bei Wärme darf ein Regenverdeck nicht als verlässlicher Wärmekredit gerechnet werden; Belüftung/Überhitzung beachten.

## 7. Sonne und UV

### 7.1 Alter

`<12 Monate + direct sun`:

- Outfit weiterhin anzeigen,
- `INFANT_UNDER_12M_AVOID_DIRECT_SUN`,
- Schatten priorisieren.

Unbekanntes Alter + direkte Sonne:

- konservativer gleicher Hinweis.

### 7.2 UV

- `UV 0–2`: kein zusätzlicher UV-Layer allein wegen Index,
- `UV >=3`: Schutz aktiv einplanen,
- hohe UV-Anforderung wird bei Wärme durch leichte bedeckende Kleidung bzw. Austausch gelöst, nicht durch zusätzlichen schweren Layer.

### 7.3 Kinderwagen

Bei `direct sun` oder relevantem UV wird **Sonnensegel/Sonnenschirm** als bevorzugtes Zubehör empfohlen. Keine Decke/Mulltuch-Abdeckung über dem Wagen.

## 8. Modus `stroller`

### 8.1 Thermische externe Isolation

Externe Isolation erhält einen relativen Wärmekredit:

- leichte Decke: `+0.5 thermalStep`,
- leichter Fußsack: `+1`,
- warme Decke: `+1`,
- warmer Fußsack: `+2`.

Der Wärmekredit ersetzt bei Bedarf Kleidung am Körper. Er darf nie funktionale Wind-/Regen-/UV-Schutzanforderungen entfernen.

### 8.2 Standardempfehlung nach Temperatur und Zustand

#### `>=18 °C`

- keine thermische externe Isolation standardmäßig,
- bei direkter Sonne keine Decke/Fußsack nur wegen Kinderwagenmodus.

#### `14 bis <18 °C`

- `awake + active`: normalerweise keine externe Isolation,
- `awake + calm/normal`: leichte Decke optional,
- `asleep`: leichte Decke bevorzugt.

#### `10 bis <14 °C`

- `awake + active`: leichte Decke oder keine externe Isolation mit entsprechend wärmerer Körperkleidung,
- `awake + calm/normal`: leichter Fußsack bevorzugt,
- `asleep`: leichter Fußsack bevorzugt.

#### `5 bis <10 °C`

- `awake + active`: leichter Fußsack bevorzugt,
- `awake + calm/normal`: warmer Fußsack bevorzugt,
- `asleep`: warmer Fußsack bevorzugt.

#### `<5 °C`

- warmer Fußsack bevorzugt,
- warme Decke ist austauschbare Alternative und löst Rebalancing aus,
- unter `0 °C` zusätzlich Extremkälte-Hinweis.

### 8.3 Schlafen im Kinderwagen

`strollerState: asleep` bleibt fachlich `stroller`, nicht `sleep`.

- keine TOG-Logik,
- Outdoor-Wetter bleibt relevant,
- Schlafzustand erhöht den thermischen Bedarf,
- Hersteller-/Sicherheitsbedingungen des konkreten Kinderwagens bleiben außerhalb der Outfitengine zu beachten.

## 9. Modus `carrier`

### 9.1 Körperkontakt

Körperkontakt liefert am bedeckten Rumpf standardmäßig etwa `-1 thermalStep` gegenüber Outdoor-Normalbaseline.

Diese Reduktion gilt **nicht** automatisch für Kopf, Füße, Unterschenkel und Hände.

### 9.2 Position zur Jacke der tragenden Person

- `over_wearer_outerwear`: kein zusätzlicher Shared-Outer-Wärmekredit,
- `under_wearer_outerwear`: wenn die Jacke den Babyrumpf tatsächlich mit bedeckt, zusätzlich `-0.5 thermalStep`.

### 9.3 Tragecover

- `none`: 0 zusätzlich,
- `light`: `-0.5 thermalStep` am bedeckten Rumpf,
- `warm`: `-1 thermalStep`.

Überlappende Wärme durch Jacke + Cover wird nicht unbegrenzt addiert. Gesamt-Reduktion am Rumpf ist auf `-2 thermalSteps` begrenzt.

### 9.4 Hitze

- bei `thermalReferenceC >=24 °C` besonders zurückhaltend isolieren,
- bei `>=28 °C` im Carrier `EXTREME_HEAT_CAUTION`,
- Gesicht/Atemwege immer frei,
- Nackentest besonders wichtig.

## 10. Modus `car`

### 10.1 Phasen

- `outdoor_transition`: wetterbasierte Kleidung zum/vom Auto,
- `in_car`: Kleidung unter/über dem Gurt anhand einer bekannten oder geschätzten Innenraumtemperatur.

### 10.2 Innenraumtemperatur

Für V1 gelten drei Quellen mit klarer Semantik:

- `manual`: der Nutzer hat den Innenraumwert manuell korrigiert,
- `measured`: der Nutzer markiert einen tatsächlich gemessenen Innenraumwert ausdrücklich als gemessen,
- `estimated`: die Innenraumtemperatur ist unbekannt und wird durch die vorgelagerte Integrationslogik geschätzt.

Für `estimated` verwendet V1 **fix 20 °C als neutrale klima-kontrollierte Annahme**. Diese Zahl ist bewusst grob und keine Prognose des realen Fahrzeuginnenraums. Sie wird nicht aus `airTempC`, `apparentTempC`, Wind, Sonne oder Fahrtdauer berechnet.

Begründung: Die verfügbaren V1-Inputs enthalten weder tatsächlichen Innenraumzustand noch HVAC-/Heizungs-/Klimastatus, Vorheizen/Vorkühlen, Parkdauer oder solare Aufheizung. Eine außenwetterabhängige Formel würde deshalb Scheingenauigkeit erzeugen. Außenwetter gehört ausschließlich in `outdoor_transition`; `in_car` verwendet `cabinTempC`.

Bei `estimated` muss die App:

- `cabinTempSource: estimated` bis ins Ergebnis tragen,
- `CAR_CABIN_TEMPERATURE_ESTIMATED` sichtbar anzeigen,
- `ready_with_estimate` statt unmarkiertem `ready` verwenden,
- eine schnelle manuelle Korrektur erlauben,
- beim manuellen Ändern von `cabinTempC` auf `manual` wechseln,
- beim Zurückschalten auf `estimated` wieder 20 °C einsetzen,
- keine Gurtsicherheitsentscheidung aus der Schätzung oder der Temperaturquelle ableiten.

`measured` und `manual` verwenden den angegebenen Wert ohne Schätzkennzeichnung.

### 10.3 Gurtsicherheit

- `allowed`: darf automatisch `under_harness` gewählt werden,
- `conditional`: nur als Alternative mit Passform-/Gurthinweis,
- `prohibited`: nie unter dem Gurt.

Winteroverall/voluminöse Jacke:

- erlaubt in `outdoor_transition`,
- vor `in_car` explizit entfernen.

Zusätzliche Decke/Jacke:

- nur **über** dem bereits korrekt geschlossenen Gurt.

## 11. Schuhe / Bodenkontakt

- `groundContact: none`: keine Schuhe allein aus Temperaturgründen; Socken/Booties je Bedarf,
- `standing`: wettergerechte Schuhe abhängig von Untergrund/Wetter,
- `walking`: Schuhe als regulärer Outfit-Slot; Regen/Kälte beeinflussen die Variante.

Schuhe sind austauschbar und beeinflussen nicht die globale Rumpf-Wärmebewertung.

## 12. Schlafmodus – generische TOG-Orientierung

### 12.1 Sicherheitsrahmen

- Raumtemperatur, nicht Außentemperatur,
- keine Mütze,
- Kopf frei,
- keine lose Decke oder andere lose Bettware im Schlafbereich – unabhängig davon, ob ein Schlafsack gewählt ist,
- zusätzliche Wärme nur über geeignete körpernahe Schlafkleidung oder einen passenden Schlafsack,
- keine Wärmflasche/Heizdecke,
- keine gewichteten Schlafprodukte,
- Schlafsack passend sitzend,
- Nacken/Brust zur Kontrolle.

16–20 °C bleibt der Safer-Sleep-Orientierungsbereich.

### 12.2 Warum trotzdem eine generische Tabelle existiert

Der Lullaby Trust stellt bewusst keine universelle TOG/Kleidungs-Tabelle bereit, weil Material, Layer und Baby variieren. V1 braucht für die gewünschte Austauschfunktion dennoch eine generische Produktorientierung.

Die folgenden Bänder sind daher aus überlappenden Bereichen mehrerer Schlafsackanbieter kalibriert und werden in der UI als **Orientierung** gekennzeichnet.

### 12.3 Verfügbare Schlafsack-Slots

- `none`,
- `0.5`,
- `1.0`,
- `1.5`,
- `2.5`,
- `3.5 TOG`.

### 12.4 Schlaf-Wärmegewicht

Nur für die interne Austauschlogik:

- kein Schlafsack: `0`,
- 0.5 TOG: `1`,
- 1.0 TOG: `2`,
- 1.5 TOG: `3`,
- 2.5 TOG: `4`,
- 3.5 TOG: `5`.

Unterkleidung:

- nur Windel: `0`,
- Kurzarmbody: `1`,
- Langarmbody: `2`,
- leichter Pyjama/Schlafanzug: `2`,
- Kurzarmbody + leichter Pyjama: `3`,
- Langarmbody + leichter Pyjama: `4`.

Diese Punkte sind **keine TOG-Einheiten**; sie sind lediglich Rebalancing-Gewichte.

### 12.5 Kalibrierte Hauptempfehlungen

| Raumtemperatur | Hauptempfehlung | typische gleichwertige Alternative |
|---|---|---|
| `>=27 °C` | kein Schlafsack + Windel oder sehr leichter Kurzarmbody | 0.5 TOG + Windel, falls angenehm |
| `24–<27 °C` | 0.5 TOG + Kurzarmbody | kein Schlafsack + leichter Pyjama |
| `22–<24 °C` | 1.0 TOG + Kurzarmbody | 0.5 TOG + leichter Pyjama |
| `20–<22 °C` | 1.5 TOG + Kurzarmbody | 1.0 TOG + leichter Pyjama |
| `18–<20 °C` | 2.5 TOG + Kurzarmbody | 1.5 TOG + leichter Pyjama |
| `16–<18 °C` | 2.5 TOG + Langarmbody | 3.5 TOG + Kurzarmbody |
| `<16 °C` | 3.5 TOG + Langarmbody | 2.5 TOG + Kurzarmbody + leichter Pyjama |

Unter `16 °C` erscheint zusätzlich ein Hinweis, den Raum wenn möglich Richtung 16–20 °C zu bringen und nicht einfach lose Bettware als zusätzliche Wärme zu verwenden.

Bei sehr heißem Raum darf `kein Schlafsack` die klare Hauptempfehlung sein.

### 12.6 Dynamischer Schlafsacktausch

Beim Wechsel des Schlafsacks:

1. gewählten TOG für die aktuelle Empfehlung locken,
2. Ziel-Wärmegewicht des Temperaturbands bestimmen,
3. Unterkleidung neu auswählen,
4. möglichst wenige Teile ändern,
5. Nackentest-Hinweis behalten.

Beispiel bei 18–20 °C:

- Hauptset: `2.5 TOG + Kurzarmbody`,
- Nutzer wählt `1.0 TOG`,
- Engine ergänzt entsprechend mehr körpernahe Schlafkleidung statt loser Bettware.

### 12.7 `wärmer` / `dünner` im Schlafmodus

Die Schnellkorrektur verändert das interne Zielgewicht um ungefähr `+1` bzw. `-1`, bevorzugt durch Austausch **eines** Elements. Sicherheitsregeln bleiben unverändert.

## 13. Austausch- und Rebalancingregeln

### 13.1 Slots

Empfehlungen bestehen aus semantischen Slots, z. B.:

- `base_torso`,
- `legs`,
- `mid`,
- `outer`,
- `feet`,
- `head`,
- `hands`,
- `footwear`,
- `stroller_thermal_accessory`,
- `stroller_weather_accessory`,
- `sleep_bag`,
- `sleep_underlayer`.

### 13.2 Alternative wählen

Beim Tap auf ein Teil:

1. Alternativen aus demselben/kompatiblen Slot ermitteln,
2. `equivalent` zuerst,
3. danach `warmer`,
4. danach `cooler`,
5. Wahl locken,
6. gesamte Empfehlung neu berechnen.

### 13.3 Rebalancing

Die Engine verändert zuerst den kleinstmöglichen anderen Slot.

Beispiele:

- dünner Pullover → Fleece: Outer kann leichter/optional werden,
- warmer Fußsack → leichte Decke: Körperoutfit wird wärmer,
- Regenverdeck → kein Regenverdeck bei Regen: Regenjacke wird erforderlich,
- 2.5 TOG → 1.0 TOG: Schlaf-Unterkleidung wird wärmer.

### 13.4 Lock-Lebensdauer

Ein manueller Lock gilt nur für die aktuelle Recommendation-Session. Bei komplett neuem Wetter/Ort/Modus darf eine neue Empfehlung ohne alten Lock gestartet werden.

## 14. Nackentest

### `warm_dry`

- keine thermische Änderung.

### `hot_sweaty`

- `-1 thermalStep` bzw. nächstleichtere sinnvolle Kombination,
- funktionale Regen-/Wind-/UV-Schutzhülle erhalten und stattdessen darunter reduzieren.

### `cool`

- `+1 thermalStep` bzw. nächstwärmere sinnvolle Kombination,
- im Kinderwagen bevorzugt auch externe Isolation als Option,
- im Auto Gurtsicherheit erhalten.

Kalte Hände/Füße allein verändern die globale Wärmestufe nicht.

## 15. Wärmetendenz

- `runs_cool`: `+0.5 thermalStep`,
- `neutral`: `0`,
- `runs_warm`: `-0.5 thermalStep`.

V1 verwendet bewusst nur einen kleinen Bias. Er wird nicht automatisch gelernt.

## 16. Extremwetter-Hinweise

Produkt-Schwellen für zusätzliche Hinweise:

- `thermalReferenceC >=30 °C`: `EXTREME_HEAT_CAUTION`,
- Carrier oder direkte Sonne bei `>=28 °C`: ebenfalls Hitzhinweis,
- `thermalReferenceC <0 °C`: `EXTREME_COLD_CAUTION`,
- Wind `>=50 km/h` oder Böen `>=60 km/h`: `STRONG_WIND_CAUTION`.

Die Engine zeigt weiterhin ein Outfit, empfiehlt aber Exposition zu reduzieren/anzupassen und häufig zu kontrollieren. Keine garantierte Aufenthaltsdauer nennen.

## 17. Strukturierte Safety-/Reason-Codes

Mindestens:

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
- `WEATHER_DATA_INCOMPLETE`,
- `WEATHER_DATA_STALE`,
- `EXTREME_COLD_CAUTION`,
- `EXTREME_HEAT_CAUTION`,
- `STRONG_WIND_CAUTION`,
- `MANUAL_LOCK_OVERRIDDEN_FOR_SAFETY`.

## 18. Kalibrierungs-Invarianten für Tests

1. Kinderwagen setzt Aktivität nicht automatisch auf passiv.
2. `strollerState: asleep` ist thermisch wärmer als `awake + active` bei identischem Wetter.
3. Warmer Fußsack kann Körperkleidung ersetzen.
4. Austausch warmer Fußsack → leichte Decke muss Rebalancing auslösen.
5. Regenverdeck und Regenjacke werden im geschützten Kinderwagen nicht unnötig doppelt verlangt.
6. Sonnensegel/Sonnenschirm wird bei direkter Sonne im Kinderwagen bevorzugt.
7. Wind wird nicht thermisch doppelt gerechnet, wenn `apparentTempIncludes` Wind enthält.
8. Windschutz kann trotzdem trotz scheinbarer Temperatur verlangt werden.
9. `precipProbability <40` allein erzeugt kein Regenelement.
10. `precipProbability >=60` im relevanten Zeitraum erzeugt Regenschutz.
11. Trage reduziert Rumpfisolation, nicht automatisch Fuß-/Kopfschutz.
12. Jacke + Tragecover dürfen nicht unbegrenzt Wärmekredite stapeln.
13. Winteroverall ist nie `under_harness`.
14. Schlaf nutzt nie Außentemperatur.
15. Alle fünf TOGs plus `none` sind austauschbar.
16. TOG-Tausch rebalanciert Unterkleidung.
17. Schlafmodus empfiehlt nie lose Bettware – auch bei `sleep_bag_none`.
18. `styleTheme` verändert keine Fachentscheidung.
19. Manueller Item-Lock bleibt in derselben Session erhalten.
20. Sicherheitsregel darf Lock überstimmen und muss einen strukturierten Grund liefern.
21. `wärmer` / `dünner` verändert möglichst wenig Teile.
22. Nackentest lernt in V1 keinen permanenten Bias.
23. Schuhe werden ohne Bodenkontakt nicht automatisch empfohlen.
24. `cabinTempSource: estimated` bedeutet in V1 exakt die neutrale 20-°C-Annahme und wird nicht aus Außenwetter abgeleitet.
25. `manual` und `measured` verwenden den angegebenen Innenraumwert ohne Schätzkennzeichnung.
26. Manuelle Änderung der Innenraumtemperatur setzt die Quelle auf `manual`; Zurückschalten auf `estimated` setzt wieder 20 °C.
27. Gurtsicherheitsregeln sind für `manual | measured | estimated` identisch und unabhängig von der Schätzhöhe.