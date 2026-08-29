# Product Concept – Baby Clothing Weather App

Status: V1-Produktkonzept, fachlich kalibriert  
Scope: Produkt-, Sicherheits- und Interaktionslogik; keine UI- oder Asset-Implementierung  
Altersbereich: 0 bis einschließlich 24 Monate

## 1. Produktziel

Die App gibt eine konkrete, nachvollziehbare Kleidungsempfehlung für ein Baby aus. Die Empfehlung besteht aus einzelnen sichtbaren Teilen und situationsabhängigem Zubehör. Sie berücksichtigt:

- Lufttemperatur und eine normalisierte thermische Referenz,
- Wind und Böen,
- Regen bzw. Niederschlagswahrscheinlichkeit,
- Sonne und UV-Index,
- tatsächliche Sonnenexposition,
- Aktivität,
- Situation,
- manuell gesetzte Wärmetendenz,
- Nackentest als reale Rückmeldung.

Die App ist eine Entscheidungshilfe und keine medizinische Anwendung. Sie gibt keine Diagnose und keine Garantie für thermischen Komfort.

## 2. Normative Produktprinzipien

1. **Ein konkretes Hauptoutfit.** Die App zeigt nicht zuerst eine Liste gleichwertiger Möglichkeiten, sondern eine klare Empfehlung aus Einzelteilen.
2. **Jedes relevante Teil ist austauschbar.** Ein Tap auf ein Teil zeigt passende Alternativen.
3. **Austausch löst Neuberechnung aus.** Wird ein Teil geändert, wird das gesamte Outfit neu ausbalanciert.
4. **Manuell gewählte Teile bleiben für die aktuelle Empfehlung fixiert.** Andere Teile passen sich daran an. Nur eine harte Sicherheitsregel darf einen Lock überstimmen; dann muss die App den Grund sichtbar erklären.
5. **Alternativen werden nach Nähe sortiert.** Zuerst thermisch möglichst gleichwertig, danach etwas wärmer bzw. kühler.
6. **Schnellkorrektur `wärmer` / `dünner`.** Die App verändert selbst die kleinste sinnvolle Kombination und zeigt sichtbar, was sich geändert hat.
7. **Kein Lernsystem in V1.** Weder Kleidungspräferenzen noch Nackentestdaten verändern langfristig automatisch die Fachlogik.
8. **Sicherheitsregeln schlagen Komfortoptimierung und manuelle Locks.**
9. **Kalte Hände oder Füße allein sind kein ausreichender Friernachweis.**
10. **Geschlecht beeinflusst nie Wärme- oder Sicherheitslogik.**

## 3. Festgelegter V1-Scope

V1 unterstützt genau ein lokales Babyprofil und keine Anmeldung, Cloud-Synchronisation oder Datenbank.

Enthalten:

- automatische Wetterermittlung über Standort,
- manuelle Ortswahl und manuelle Wetterüberschreibung,
- Empfehlung auch bei teilweise fehlenden optionalen Wetterdaten mit sichtbarer Unsicherheit,
- Modi `outdoor`, `stroller`, `carrier`, `car`, `sleep`,
- austauschbare Outfit- und Zubehörteile,
- `wärmer` / `dünner`,
- Nackentest-Button,
- lokale Einstellungen,
- JSON-Export/-Import.

Nicht enthalten:

- vollständiges Inventar der Kleidung zu Hause,
- gespeicherte Marken-/Hersteller-Schlafsäcke,
- Hersteller-TOG-Tabellen,
- mehrere Babyprofile,
- automatische Langzeit-Personalisierung,
- kommerzielle Produktempfehlungen,
- medizinische Diagnosen.

## 4. Hauptnutzerfluss

### 4.1 Start

1. App öffnet das lokale Babyprofil.
2. Wetter wird möglichst automatisch für den gespeicherten/aktuellen Standort geladen.
3. Der Nutzer kann Temperatur und Wetterdaten jederzeit manuell überschreiben.
4. Die zuletzt verwendete Situation wird angeboten.
5. Die App erzeugt unmittelbar ein konkretes Hauptoutfit.

### 4.2 Outfit anpassen

Jedes Teil ist auswählbar. Beispiel:

`Langarmbody + Hose + dünner Pullover + Softshelljacke + Socken`

Beim Tap auf `dünner Pullover` werden z. B. angezeigt:

1. thermisch ähnliche Alternative,
2. etwas wärmere Alternative,
3. etwas kühlere Alternative.

Wird `dünner Pullover` durch `Fleecejacke` ersetzt, bleibt dieser Wechsel für die aktuelle Empfehlung fixiert. Die Engine darf daraufhin z. B. die Softshelljacke leichter machen oder entfernen.

### 4.3 Schnellkorrektur

`etwas wärmer` und `etwas dünner` verändern das Gesamtoutfit um eine kleine sinnvolle thermische Stufe. Die App hebt die Änderung hervor, etwa `Fleece ergänzt` oder `Pullover entfernt`.

### 4.4 Nackentest

Der Nackentest wird nicht automatisch nach einem Timer aufgedrängt. Er ist jederzeit über einen sichtbaren Button erreichbar.

- `warm_dry` → Empfehlung beibehalten,
- `hot_sweaty` → Isolation reduzieren,
- `cool` → Isolation erhöhen.

Die Korrektur betrifft nur die aktuelle Empfehlung.

## 5. Babyprofil

V1-Felder:

- `profileId`,
- optional `displayName`,
- optional `birthDate`,
- `warmthBias: runs_cool | neutral | runs_warm`,
- `styleTheme: neutral | boy | girl`,
- `defaultMode`,
- Zeitstempel.

Nicht benötigt:

- Geschlecht als Fachparameter,
- Gewicht/Körpergröße für die Wärmelogik,
- medizinische Diagnosen,
- Kleidungsinventar,
- Schlafsackinventar.

### 5.1 Wärmetendenz

Die Wärmetendenz wird bewusst vom Nutzer gesetzt. Sie darf die Empfehlung höchstens moderat verschieben und niemals Sicherheitsregeln überschreiben.

### 5.2 Stil

`neutral`, `boy` und `girl` steuern ausschließlich Farben, Muster und Asset-Varianten. Die fachlichen `itemId`s bleiben identisch.

## 6. Wetterverhalten

### 6.1 Automatisch mit Override

Standard ist automatische Wetterermittlung. Manuelle Überschreibung ist jederzeit möglich.

### 6.2 Unvollständige Daten

Fehlen optionale Werte wie UV, Wind oder Regenwahrscheinlichkeit, darf die App weiterhin eine konkrete Empfehlung erzeugen, wenn eine thermisch verwertbare Temperatur vorhanden ist. Sie zeigt die Unsicherheit strukturiert an und interpretiert fehlende Werte niemals als `0`.

### 6.3 Thermische Referenz

Provider-`feelsLike` wird nicht blind verwendet. Die Wetterdaten-Schicht normalisiert ihn als `apparentTempC` und markiert bekannte enthaltene Faktoren. Die Engine berechnet daraus `thermalReferenceC`.

Für den vorgesehenen Open-Meteo-Adapter kann `apparent_temperature` als bekannt interpretiert werden: Open-Meteo dokumentiert Windchill, relative Feuchte und Solarstrahlung als Bestandteile. Diese Faktoren dürfen dann thermisch nicht doppelt verrechnet werden.

### 6.4 Cache, Freshness und Offline-Verwendung

Die Freshness eines gespeicherten `WeatherSeries` wird ausschließlich aus `fetchedAt` berechnet. `current.time` bzw. `observedAt` ersetzt diesen Abrufzeitpunkt nicht.

Normative V1-Grenzen:

- `0 bis 30 Minuten` seit `fetchedAt` → `fresh`,
- `> 30 bis einschließlich 120 Minuten` → `stale`, aber noch sinnvoll weiterverwendbar,
- `> 120 Minuten` → zu alt; nicht mehr als Wetterinput für eine neue Outdoor-Empfehlung verwenden.

Zusätzliche Regeln:

- Cache darf nur für denselben Wetterstandort wiederverwendet werden. Ein Cache eines anderen Orts wird verworfen.
- Ungültiges oder deutlich in der Zukunft liegendes `fetchedAt` wird nicht als frischer Cache akzeptiert; bis zu fünf Minuten lokale Uhrabweichung dürfen als Alter `0` behandelt werden.
- Automatisch geladene Wetterdaten erhalten bei Wiederverwendung aus dem Cache `origin: "cache"`. Manuell eingegebene bzw. manuell überschriebene Wetterdaten behalten zur Nachvollziehbarkeit `origin: "manual"` bzw. `origin: "api_with_manual_override"`. Für beide gelten dieselben Freshness- und Ablaufgrenzen.
- `stale` Wetter bleibt sichtbar als älter/gespeichert markiert und führt gemäß Outfit-Regeln zu `partial` plus `WEATHER_DATA_STALE`.
- Zu alter, ungültiger oder standortfremder Cache wird nicht mit Temperatur-/Wind-/Regenwerten als aktuelles Wetter dargestellt. Für wetterabhängige Modi fehlt dann der erforderliche Wetterinput und die Empfehlung wird entsprechend blockiert oder teilweise verfügbar.
- Bei fehlgeschlagenem Online-Refresh gelten dieselben Alters- und Standortgrenzen wie im Offline-Fall.
- Solange automatische Wetterdaten online verwendet werden, versucht die App beim Übergang zu `stale` einen neuen Abruf; ein nutzbarer stale Datensatz bleibt nur Fallback, wenn die Aktualisierung nicht gelingt.
- Bei einem stale automatischen Datensatz darf ein bereits erreichter stündlicher Prognosepunkt als thermischer Referenzpunkt verwendet werden. Das Wetterrisikofenster für Wind, Regen und UV muss trotzdem den tatsächlich ab jetzt geplanten Aufenthaltszeitraum abdecken und darf nicht an einem älteren Prognosezeitpunkt enden.
- `weatherCacheMaxAgeMinutes` ist in V1 standardmäßig `120`. Eine lokale/importierte Einstellung darf die Wiederverwendung strenger machen, aber die harte 120-Minuten-Grenze nicht erweitern.
- Schlafmodus bleibt davon vollständig unabhängig: Schlafempfehlungen verwenden ausschließlich `roomTempC`; Außenwetter oder Wettercache werden nicht in Schlafkleidung umgerechnet.

Die 120-Minuten-Obergrenze entspricht dem bereits verwendeten Standard-Wetterrisikofenster der Engine. Jenseits dieses Fensters darf ein alter „Current“-Wert nicht als belastbare Beschreibung der aktuellen Situation fortgeschrieben werden.

## 7. Situationen

### 7.1 Draußen (`outdoor`)

Die App berücksichtigt:

- thermische Referenz,
- Aktivität,
- geplante Dauer optional,
- Wind,
- Regen,
- UV/Sonne,
- Bodenkontakt.

Aktivität wird möglichst aus Kontext und Alter vorgeschlagen; der Nutzer muss sie nicht bei jedem Start einstellen. Bei Bedarf kann sie korrigiert werden.

### 7.2 Kinderwagen (`stroller`)

Kinderwagen bedeutet **nicht automatisch passiv**.

Erfasst bzw. ableitbar:

- `wach` oder `schläft`,
- Aktivität bei Wachsein (`ruhig/normal/aktiv`),
- Sonnenexposition,
- Windschutz des Wagens,
- Wetter.

Die App empfiehlt Kinderwagen-Zubehör selbst. Es wird nicht als Besitz-Inventar vorab abgefragt.

Mögliche empfehlbare und austauschbare Teile:

- leichte Decke,
- warme Decke,
- leichter Fußsack,
- warmer Fußsack,
- Regenverdeck,
- Sonnensegel/Sonnenschirm.

Wird z. B. `warmer Fußsack` gegen `Decke` getauscht, passt die Engine die Kleidung am Körper neu an.

Harte Regel: Kinderwagen nicht mit Decke/Mulltuch so abdecken, dass Luftzirkulation behindert wird. Sonnensegel/Sonnenschirm wird als geeignetes Schutzelement modelliert.

### 7.3 Trage (`carrier`)

Die App fragt einfach:

- Baby **unter** der Jacke/Oberbekleidung der tragenden Person,
- oder **über** der Jacke/Oberbekleidung.

Optional kann ein `Tragecover` gewählt/empfohlen werden.

Körperwärme der tragenden Person und Trage zählen als zusätzliche Wärme am bedeckten Rumpf. Exponierte Beine, Füße, Hände und Kopf bleiben separat zu bewerten. Gesicht und Atemwege müssen frei bleiben.

### 7.4 Auto (`car`)

Die App zeigt zwei klar getrennte Sets:

1. **Zum Auto / vom Auto** (`outdoor_transition`),
2. **Im Autositz** (`in_car`).

Für die Fahrt wird eine Innenraumtemperatur verwendet. Ist sie nicht bekannt, verwendet V1 bewusst eine **neutrale, klima-kontrollierte Schätzannahme von 20 °C** und kennzeichnet sie sichtbar als `estimated`. Die Schätzung wird **nicht** aus der Außentemperatur abgeleitet.

Eine dynamische Ableitung wäre mit den V1-Inputs scheinpräzise: Es fehlen insbesondere tatsächlicher Innenraumzustand, Heizung/Klimaanlage, Vorheizen/Vorkühlen, Parkdauer und solare Aufheizung. Das Außenwetter bleibt deshalb ausschließlich für `outdoor_transition` maßgeblich; `in_car` nutzt die bekannte oder geschätzte Innenraumtemperatur.

Die 20-°C-Annahme ist jederzeit schnell korrigierbar. Eine Änderung des Temperaturwerts gilt als `manual`; `measured` wird nur verwendet, wenn ein tatsächlich gemessener Wert ausdrücklich so markiert wird. Beim Zurückschalten auf `estimated` wird wieder die neutrale 20-°C-Annahme eingesetzt. Keine Gurtsicherheitsregel darf von dieser Schätzung oder ihrer Höhe abgeleitet werden.

Voluminöse Jacken und Winteroveralls dürfen nicht unter dem Gurt empfohlen werden. Ein für draußen empfohlener Overall muss beim Wechsel in die Fahrphase explizit entfernt werden. Zusätzliche Decke/Jacke nur über dem korrekt geschlossenen Gurt.

### 7.5 Schlafen (`sleep`)

Schlafen verwendet ausschließlich Raumtemperatur als thermischen Umgebungsinput; Außentemperatur wird nicht zur Schlafkleidung umgerechnet.

Der Schlafsack ist das zentrale austauschbare Element. V1 kennt folgende generischen Optionen:

- kein Schlafsack,
- 0.5 TOG,
- 1.0 TOG,
- 1.5 TOG,
- 2.5 TOG,
- 3.5 TOG.

Darunter wird konkrete Kleidung empfohlen. Tauscht der Nutzer den Schlafsack, wird die Unterkleidung neu berechnet.

**Es wird kein eigener Schlafsack zu Hause hinterlegt und keine Marke/Hersteller-Tabelle gespeichert.**

Die TOG-Logik ist deshalb ausdrücklich eine vorsichtige **Produkt-Orientierung**, nicht eine universell sichere Herstellertabelle. Grundlage sind überlappende Bereiche mehrerer Schlafsackanbieter; Lullaby Trust weist ausdrücklich darauf hin, dass Materialien, Layer und Babys variieren.

Harte Schlafregeln:

- keine Mütze in Innenräumen beim Schlafen,
- Kopf frei,
- keine lose Decke oder andere lose Bettware im Schlafbereich – unabhängig davon, ob ein Schlafsack gewählt ist,
- keine Wärmflasche/Heizdecke,
- keine gewichteten Schlafprodukte,
- Schlafsack muss passend sitzen.

Zusätzliche Wärme wird im `sleep`-Modus ausschließlich über geeignete körpernahe Schlafkleidung oder einen passenden Schlafsack ausgeglichen.

## 8. Aktivität

Die App soll Aktivität so selten wie möglich abfragen.

Grundprinzip:

- `carrier`: thermische Sonderlogik über Körperkontakt; keine normale Aktivitätsfrage,
- `stroller`: `wach/schläft` plus bei Wachsein Aktivität; ein Baby kann im Wagen sehr aktiv sein,
- `outdoor`: Standard `normal`; bei offensichtlich mobilem/spielendem Kind kann `active` vorgeschlagen werden,
- `car` und `sleep`: keine normale Aktivitätskorrektur.

## 9. Bodenkontakt und Schuhe

Schuhe werden nur empfohlen, wenn draußen tatsächlicher Bodenkontakt geplant ist:

- `none` → Socken/Booties,
- `standing` → geeignete Schuhe optional/erforderlich je Untergrund/Wetter,
- `walking` → wettergerechte Schuhe.

## 10. Sonne und UV

V1 unterstützt 0–24 Monate.

- `<12 Monate`: direkte Sonne möglichst vermeiden, Schatten priorisieren.
- unbekanntes Alter + direkte Sonne: konservativ wie `<12 Monate` behandeln.
- `UV >= 3`: aktiven Schutz einplanen.
- Bei direkter Sonne zeigt die App trotzdem ein Outfit; sie blockiert nicht, sondern zeigt den Schattenhinweis prominent.
- UV-Schutz bei Hitze wird durch leichte bedeckende Kleidung bzw. Ersatz eines Teils gelöst, nicht durch zusätzliche schwere Isolation.
- Im Kinderwagen Sonnensegel/Sonnenschirm statt luftstromhemmender Abdeckung.

## 11. Regen

Die App unterscheidet zwischen aktuellem/nahem Regen und bloßer Möglichkeit.

Kinderwagen:

- bei relevantem Regen bevorzugt Regenverdeck als Situationszubehör,
- eine Regenjacke fürs Baby ist nicht automatisch nötig, wenn das Baby geschützt im Wagen bleibt,
- wird das Regenverdeck ausgetauscht/abgewählt, muss die Engine den Körperschutz neu bewerten.

Outdoor mit Bodenkontakt bzw. exponiertem Baby:

- geeignete Regenaußenschicht statt unnötiger zusätzlicher Wärmeschicht.

## 12. Extremwetter

Die App zeigt auch bei Hitze, Frost oder starkem Wind weiterhin eine konkrete, bestmögliche Kleidungsempfehlung. Zusätzlich erscheint ein auffälliger Hinweis, Exposition zu begrenzen bzw. Situation anzupassen.

Sie behauptet keine absolute sichere Aufenthaltsdauer.

## 13. Zustandsmodell

Mehrere Zustände können gleichzeitig gelten. Deshalb bleiben getrennte Achsen für:

- Konnektivität,
- Standort,
- Wetterqualität,
- Empfehlungsstatus.

Beispiele:

- `offline + stale + partial`,
- `location denied + manual weather + ready`,
- `car/in_car + geschätzte Innenraumtemperatur + ready_with_estimate`,
- `sleep + roomTemp fehlt + blocked`.

## 14. Quellenbasis und Kalibrierungsstatus

Stand der fachlichen Prüfung: 2026-08-25.

### Sicherheits-/Gesundheitsquellen

- WHO, Protecting against skin cancer: https://www.who.int/news-room/questions-and-answers/item/radiation-protecting-against-skin-cancer
  - Babys unter 12 Monaten im Schatten halten.
- WHO, Ultraviolet radiation / UV Index: https://www.who.int/news-room/fact-sheets/detail/ultraviolet-radiation
  - Schutzmaßnahmen ab UVI 3.
- NHS, Keeping your baby safe in the sun: https://www.nhs.uk/baby/first-aid-and-safety/safety/safety-in-the-sun/
  - kleine Babys aus direkter Sonne; leichte Kleidung; Sonnenschutz am Kinderwagen; keine Decke über dem Wagen.
- The Lullaby Trust, How to dress your baby for sleep: https://www.lullabytrust.org.uk/baby-safety/baby-product-information/dress-your-baby-for-sleep/
  - 16–20 °C Orientierung; Nacken/Brust prüfen; keine universelle TOG/Kleidungs-Tabelle.
- The Lullaby Trust, Cold weather: https://www.lullabytrust.org.uk/baby-safety/travel-and-weather/cold-weather/
  - bei kühlerem Raum körpernahe Schicht oder höheren TOG wählen, nicht überwickeln.
- HealthyChildren/AAP, Cold Weather Safety: https://www.healthychildren.org/English/safety-prevention/at-play/Pages/Cold-Weather-Safety.aspx
  - mehrere dünne Schichten; Plus-one-Regel nur als grobe Plausibilitätskontrolle.
- NHTSA, Keep Your Little Ones Warm and Safe in Their Car Seats: https://www.nhtsa.gov/keep-your-little-ones-warm-and-safe-their-car-seats
  - keine voluminösen Schichten unter dem Gurt; dünnes Fleece möglich; Decke/Jacke über dem Gurt.
- Baby Carrier Industry Alliance, Safety Brochure: https://babycarrierindustryalliance.org/wp-content/uploads/2019/02/BCIA-Safety-Brochure-2016-US.pdf
  - zusätzliche Körperwärme in der Trage; nicht überkleiden; Gesicht frei.

### Wetter-/Kalibrierungsquellen

- Open-Meteo API docs: https://open-meteo.com/en/docs
  - `apparent_temperature` enthält Windchill, relative Feuchte und Solarstrahlung.
- Royal Meteorological Society, Beaufort Wind Scale: https://www.rmets.org/metmatters/beaufort-wind-scale
  - 20–28 km/h moderate, 29–38 km/h fresh, 39–49 km/h strong breeze.

### TOG-Vergleichsquellen

Diese Quellen werden **nur** verwendet, um eine generische Produkt-Orientierung zu kalibrieren; sie ersetzen keine Herstellerangaben eines realen Produkts:

- Love to Dream TOG guide: https://lovetodream.com/blogs/baby-sleep/what-is-a-tog-rating
- Slumbersac TOG guide/FAQ: https://www.slumbersac.co.uk/pages/faq
- ergoPouch What to Wear guide: https://www.ergopouch.com/pages/what-to-wear-guide
- Tommee Tippee Groegg/Grobag quick guide: https://www.tommeetippee.com/media/PDFs/491359_TT_GROEGG_GLOBAL_WEB_LEAFLET.pdf

## 15. Technischer Entscheidungsstatus

Die V1-Entscheidung für `cabinTempSource: estimated` ist geschlossen: unbekannte Autoinnenraumtemperatur wird als transparente neutrale 20-°C-Klimaannahme modelliert und nicht aus Außentemperatur abgeleitet.

Die V1-Entscheidung zur finalen Katalogzuordnung und relativen `thermalWeight`-Kalibrierung ist ebenfalls geschlossen. Der vollständige Audit vom 2026-08-28 ist in `docs/THERMAL_WEIGHT_AUDIT.md` dokumentiert. Die aktuellen `thermalWeight`-, `thermalStepCredit`- und `sleepWarmthWeight`-Werte sind intern konsistent und werden durch gezielte Kataloginvarianten abgesichert.

Damit sind die wesentlichen **Produkt- und Kalibrierungsentscheidungen für V1 geschlossen**. Spätere Mehrprofil-, Inventar- oder Präferenzlern-Funktionen bleiben ausdrücklich außerhalb des V1-Scopes und sind keine offenen V1-Entscheidungen.
