# Product Concept – Baby Clothing Weather App

Status: Fachkonzept für Version 1  
Scope: Produkt- und Sicherheitslogik, noch keine UI- oder Asset-Spezifikation  
Branch: `docs/baby-clothing-concept`

## 1. Produktziel

Die App gibt für Babys von **0 bis einschließlich 24 Monaten** eine konkrete, nachvollziehbare Kleidungsempfehlung aus. Die Empfehlung besteht aus einzelnen Kleidungsstücken und gegebenenfalls externer Isolation wie Fußsack oder beaufsichtigter Decke außerhalb des Schlafbetts.

Sie berücksichtigt:

- Lufttemperatur und – nach Normalisierung durch den Wetteradapter – eine belastbare scheinbare/gefühlte Temperatur,
- Wind,
- Niederschlag,
- Sonne und UV-Index,
- tatsächliche Sonnenexposition der konkreten Situation,
- Aktivität,
- Situation,
- individuelle, bewusst gesetzte Wärmetendenz,
- Nackentest als Rückmeldung nach dem Anziehen.

Die App ist eine Entscheidungshilfe und keine medizinische Anwendung. Sie gibt keine Diagnose, keine Garantie für thermischen Komfort und keine Empfehlung zur Behandlung von Fieber, Unterkühlung oder Überhitzung.

Die Fachlogik ist vollständig geschlechtsneutral. Optionale Stilvarianten dürfen ausschließlich Farben, Muster und Darstellungsvarianten beeinflussen.

## 2. Normative Grundprinzipien

1. **Konkrete Einzelteile statt abstrakter Layer-Zahl.** Die Ausgabe soll z. B. `Langarmbody + Hose + dünner Pullover + Softshelljacke` lauten.
2. **Zwiebelprinzip.** Mehrere funktional getrennte, anpassbare Schichten werden gegenüber unnötig schweren Einzelschichten bevorzugt.
3. **Sicherheitsregel vor Komfortregel.** Keine thermische Optimierung darf Autositz-, Schlaf-, Sonnen- oder Kinderwagen-Sicherheitsregeln überstimmen.
4. **Situation vor Pauschalregel.** Kinderwagen, Trage, Auto und Schlafen werden fachlich getrennt bewertet.
5. **Keine blinde Nutzung von Provider-`feelsLike`.** Eine scheinbare Temperatur darf nur als thermische Referenz dienen, wenn der Wetteradapter ihre Semantik als für die App verwendbar markiert.
6. **Keine Doppelzählung.** Wind, Feuchte oder Sonne dürfen thermisch nicht erneut verrechnet werden, wenn sie bereits in einer vertrauenswürdigen scheinbaren Temperatur enthalten sind. Schutzfunktionen wie Winddichtigkeit bleiben trotzdem separat relevant.
7. **Nackentest als wichtigste reale Rückmeldung.** Warm und trocken bestätigt die Empfehlung; heiß oder schwitzig führt zu weniger Isolation; kühl führt zu mehr Isolation.
8. **Kalte Hände oder Füße allein sind kein ausreichender Friernachweis.**
9. **Schlafen wird nach Raumtemperatur, Schlafsystem und Herstellerangaben beurteilt, nicht nach Außentemperatur.**
10. **Keine universelle TOG-Tabelle in V1.** TOG wird nicht in eine vermeintlich exakte generische Kleidungsregel umgerechnet.
11. **Unter 12 Monaten direkte Sonne möglichst vermeiden und Schatten priorisieren.** Bei unbekanntem Alter gilt für direkte Sonne derselbe konservative Fallback.
12. **UV-Schutz und Wärmeschutz sind getrennte Dimensionen.** Bei Hitze wird ein leichtes bedeckendes Teil bevorzugt, nicht ein zusätzlicher schwerer Layer.

## 3. Zielgruppe und Scope von Version 1

Version 1 ist für Eltern und Betreuungspersonen von Babys im Alter von 0–24 Monaten gedacht.

Geplanter Funktionsumfang:

- ein lokal gespeichertes Babyprofil,
- automatische oder manuelle Wetterdaten,
- Situationsmodi `outdoor`, `stroller`, `carrier`, `car`, `sleep`,
- konkrete Outfitempfehlung,
- kurze Begründung der wichtigsten Modifikatoren,
- getrennte Auto-Empfehlung für Outdoor-Übergang und angeschnallte Fahrt,
- Nackentest-Rückmeldung und unmittelbare Anpassung der aktuellen Empfehlung,
- manuell gesetzte persönliche Wärmetendenz,
- lokale Einstellungen über `localStorage`,
- JSON-Export und JSON-Import.

Nicht Teil des Scopes von Version 1:

- medizinische Symptomprüfung,
- Diagnosen oder Gesundheitswarnsysteme,
- Benutzerkonto,
- Cloud-Synchronisation,
- Datenbank,
- kommerzielle Produktempfehlungen,
- automatische Langzeit-Personalisierung aus Nackentestdaten,
- generische TOG-zu-Kleidungs-Tabellen,
- Bild- oder UI-Gestaltung.

## 4. Hauptnutzerfluss

### 4.1 Ersteinrichtung

1. App öffnen.
2. Babyprofil anlegen oder Minimalprofil verwenden.
3. Geburtsdatum optional erfassen. Fehlt es, wird nur bei altersabhängiger Sonnensicherheit konservativ wie `<12 Monate` behandelt.
4. Standortfreigabe anbieten.
5. Bei Freigabe Wetter für den aktuellen Standort laden.
6. Bei abgelehnter oder nicht verfügbarer Standortfreigabe Ortssuche oder manuelle Wettereingabe anbieten.
7. Optional Stilvariante auswählen.
8. Optional Wärmetendenz `runs_cool | neutral | runs_warm` bewusst auswählen; Default `neutral`.
9. Standard-Situationsmodus auswählen.

### 4.2 Empfehlung erzeugen

1. Benötigte Daten für den gewählten Situationsmodus validieren.
2. Situationsmodus auswählen.
3. Situationsspezifische Daten erfassen, z. B. Sonnenexposition, Fußsack, Tragecover oder Innenraumtemperatur.
4. Wetterdaten über den normalisierten Wettervertrag bewerten.
5. Regelwerk anwenden.
6. Konkrete Outfitbestandteile ausgeben.
7. Sicherheitsrelevante Hinweise separat und höher priorisiert ausgeben.
8. Kurz erklären, welche Faktoren die Baseline verändert haben.

### 4.3 Rückmeldung nach dem Anziehen

Nach angemessener Eingewöhnung in die reale Situation kann die Betreuungsperson den Nackentest melden:

- `warm_dry`: warm und trocken → Outfit beibehalten,
- `hot_sweaty`: heiß oder schwitzig → Isolation reduzieren,
- `cool`: kühl → geeignete Isolation ergänzen.

V1 verwendet dieses Feedback **nur für die aktuelle Empfehlung**. Es verändert `warmthBias` nicht automatisch.

### 4.4 Wiederkehrende Nutzung

1. Gespeichertes Profil laden.
2. Wetter aktualisieren oder zulässigen Cache verwenden.
3. Situation bestätigen/ändern.
4. Kontext vervollständigen.
5. Outfit neu berechnen.
6. Optional Nackentest für die aktuelle Empfehlung anwenden.

## 5. Babyprofil

Das Babyprofil enthält nur Daten, die Fachlogik oder Darstellung tatsächlich benötigen.

V1-Felder:

- `profileId`: lokale stabile ID,
- `displayName`: optional,
- `birthDate`: optional; dient der Altersgruppe und Sonnensicherheit,
- `warmthBias`: `runs_cool | neutral | runs_warm`; standardmäßig `neutral`,
- `styleTheme`: rein visuell,
- `defaultActivity`: `passive | normal | active`,
- `sleepBagInventory`: optionale Schlafsäcke mit TOG als Produkteigenschaft und möglichst konkreten Hersteller-Temperatur-/Unterkleidungsangaben.

Nicht erforderlich für die Wärmelogik von Version 1:

- Geschlecht,
- Gewicht,
- Körpergröße,
- medizinische Diagnosen.

Eine spätere Auswahl `Junge / Mädchen / neutral` darf ausschließlich auf die Darstellungsvariante abgebildet werden und keine Outfitregel verändern.

## 6. Situationsmodi

### 6.1 Draußen (`outdoor`)

Generischer Modus für Aufenthalt im Freien ohne zusätzliche externe Wärmequelle.

Inputs:

- normalisierte Wetterdaten,
- Aktivität,
- geplante Dauer optional,
- tatsächliche Sonnenexposition `shade | partial | direct | unknown`.

### 6.2 Kinderwagen (`stroller`)

Das Baby ist typischerweise weniger aktiv und kann deshalb mehr Isolation benötigen. Fußsack oder beaufsichtigte Decke zählen als externe Isolation.

Sicherheitsregeln:

- Wagen/Buggy nicht mit Decke, Mulltuch oder anderer luftstromhemmender Abdeckung überdecken,
- geeigneten Sonnenschutz verwenden, der Luftzirkulation und Sichtkontrolle ermöglicht,
- in warmer Umgebung oder direkter Sonne keine pauschale zusätzliche Wärme wegen geringer Aktivität addieren.

### 6.3 Trage (`carrier`)

Körperwärme der tragenden Person und Trage wirken als zusätzliche Isolation am bedeckten Rumpf. Exponierte Bereiche wie Kopf, Unterschenkel und Füße werden separat betrachtet.

Die App muss erfassen können, ob Tragecover oder Jacke der tragenden Person das Baby zusätzlich bedecken.

### 6.4 Auto (`car`)

Der Automodus besteht fachlich aus zwei möglichen Phasen:

1. `outdoor_transition`: Weg zum/vom Auto,
2. `in_car`: angeschnallte Fahrt.

Für `in_car` ist nach Möglichkeit `cabinTempC` maßgeblich. Wetterdaten sind **nicht zwingend erforderlich**, wenn ausschließlich die Fahrt bewertet wird und eine Innenraumtemperatur vorliegt.

Wenn ein Outdoor-Übergang mitbewertet werden soll, werden dafür Außenwetterdaten benötigt. Fehlen sie, darf die App die sichere Fahrtempfehlung trotzdem ausgeben und nur den Übergang als unvollständig markieren.

Harte Sicherheitsregel:

- keine voluminöse Jacke,
- kein Winteroverall,
- keine stark komprimierbare dicke Polsterung unter dem Gurt.

Zusätzliche Wärme darf als geeignete dünne Schicht unter dem Gurt oder als Decke/Jacke **über** dem bereits korrekt geschlossenen Gurt erfolgen.

### 6.5 Schlafen (`sleep`)

Schlafen verwendet ein getrenntes Regelset.

Direkte thermische Inputs:

- `roomTempC`,
- ausgewähltes Schlafsystem,
- konkrete Herstellerangaben zum Schlafsack, sofern vorhanden,
- darunter getragene Schlafkleidung,
- Nackentest.

Nicht als direkter thermischer Input:

- Außentemperatur,
- Wind,
- Regen,
- UV.

Harte Sicherheitsregeln:

- keine Mütze beim Schlafen in Innenräumen,
- Kopf unbedeckt,
- keine lose Decke zusätzlich über einem Schlafsack,
- keine Wärmflasche oder Heizdecke beim Baby,
- Schlafsack passend sitzend und nach Herstellerangaben verwenden.

16–20 °C ist ein gebräuchlicher Safer-Sleep-Orientierungsbereich. Räume außerhalb dieses Bereichs werden nicht automatisch als Diagnose oder akute Gefahr klassifiziert.

V1 enthält **keine generische Tabelle `Raumtemperatur → TOG → exakte Unterkleidung`**. Wenn ein Schlafsack keine konkreten Herstellerangaben für den Temperaturbereich enthält, darf die App TOG nicht als alleinige Grundlage für eine exakte Kombination verwenden. Die Empfehlung muss dann als teilweise eingeschränkt gekennzeichnet werden.

## 7. Wetter- und Umgebungsdaten

### 7.1 Wetter-Rohdaten

Für Outdoor-relevante Situationen:

- `airTempC`,
- `apparentTempC` optional,
- Metadaten, ob `apparentTempC` für die App vertrauenswürdig ist,
- Metadaten, welche Faktoren bereits enthalten sind (`wind`, `humidity`, `sun`),
- `windSpeedKmh`,
- `windGustKmh` optional,
- `precipProbabilityPct` optional,
- `precipMm` optional,
- Niederschlagsart,
- `uvIndex` optional,
- `cloudCoverPct` optional,
- `isDay` optional,
- Zeitstempel,
- Quelle,
- Standort.

### 7.2 Thermische Referenz

Die Regelengine verwendet intern `thermalReferenceC`.

- Ist `apparentTempC` vorhanden **und** durch den Wetteradapter als vertrauenswürdig markiert, kann sie als `thermalReferenceC` dienen.
- Andernfalls ist `airTempC` die thermische Referenz und Wind kann separat thermisch wirken.
- Bereits in `apparentTempC` enthaltene Faktoren werden nicht thermisch doppelt gerechnet.
- Windgeschwindigkeit bleibt unabhängig davon für die Wahl windschützender Kleidung relevant.

### 7.3 Tatsächliche Sonnenexposition

`shade | partial | direct | unknown` gehört **nicht** zum Wetter-Snapshot, sondern zum Situationskontext. Das gleiche Wetter kann je nach Schatten, Sonnendach oder Aufenthaltsort zu unterschiedlicher tatsächlicher Exposition führen.

### 7.4 Schlafumgebung

Für `sleep`:

- `roomTempC` ist für eine vollständige Empfehlung erforderlich,
- Außentemperatur darf als Kontext angezeigt, aber nicht als direkter Schlaf-Outfitinput verwendet werden.

### 7.5 Datenqualität

Jeder Wetter-Snapshot braucht Zeitstempel und Quelle. Veraltete oder unvollständige Daten dürfen nicht stillschweigend als aktuell/vollständig behandelt werden.

### Offene Entscheidung P-02 – Wetteranbieter und Cache

**OFFEN / KALIBRIERUNG:** Wetteranbieter, API-Endpunkt, Adaptersemantik, erlaubte Cache-Dauer und Definition von `stale` sind noch festzulegen. Diese Entscheidung darf die oben definierte Provider-unabhängige Fachsemantik nicht verändern.

## 8. Kleidungskategorien

Der Katalog muss mindestens unterstützen:

### Basisschicht

- Kurzarmbody,
- Langarmbody,
- T-Shirt,
- Langarmshirt,
- Schlafanzug/Einteiler.

### Beinbekleidung

- Hose,
- leichte Hose,
- warme Hose,
- Leggings,
- Strumpfhose.

### Mittelschicht

- dünner Pullover,
- Sweatshirt,
- Fleecejacke.

### Außenschicht

- leichte Übergangsjacke,
- Softshelljacke,
- Regenjacke,
- Übergangsoverall,
- Winteroverall.

### Accessoires

- Socken,
- warme Socken/Booties,
- Sonnenhut,
- dünne Mütze,
- warme Mütze,
- Handschuhe.

### Externe Isolation

- Fußsack,
- leichte beaufsichtigte Decke außerhalb des Schlafbetts,
- warme beaufsichtigte Decke außerhalb des Schlafbetts.

Jedes Kleidungsstück erhält fachliche Eigenschaften wie `thermalWeight`, `windProtection`, `rainProtection`, `sunCoverage`, `bodyZones`, `carSeatCompatibility` und `sleepSafe`.

## 9. Sonne und Alterslogik

V1 unterstützt 0–24 Monate.

Normative Regeln:

- `<12 Monate`: direkte Sonne möglichst vermeiden, Schatten priorisieren.
- unbekanntes Alter: bei direkter Sonne konservativ wie `<12 Monate` behandeln.
- `uvIndex >= 3`: für alle Altersgruppen aktiven UV-Schutz einplanen – Schatten, Sonnenhut und leichte hautbedeckende Kleidung, soweit thermisch vertretbar.
- UV-Schutz darf bei Hitze nicht als zusätzliche schwere Isolationsschicht umgesetzt werden.
- direkte Sonne und UV-Index werden getrennt bewertet.

## 10. Geschlechtsneutrale Fachlogik und Stilvarianten

Die Empfehlung arbeitet ausschließlich mit fachlichen Kleidungs-IDs.

Erst die Präsentationsschicht darf Varianten auswählen, z. B.:

- neutral,
- sanfte Blau-/Grüntöne,
- sanfte Rosa-/Beerentöne,
- gemischte Farben,
- Tier-, Stern-, Streifen- oder Naturmuster.

Nicht erlaubt:

- unterschiedliche Wärmegrade nach Geschlecht,
- zusätzliche oder fehlende Schichten aufgrund des Stilthemas,
- unterschiedliche Sicherheitsregeln.

## 11. Laufzeit-, Offline- und Fehlerzustände

Ein einziger exklusiver `AppDataState` ist fachlich nicht ausreichend, weil Zustände gleichzeitig auftreten können. V1 modelliert mindestens getrennte Achsen:

### Konnektivität

- `online`
- `offline`
- `unknown`

### Standort

- `idle`
- `requesting`
- `available`
- `denied`
- `unavailable`
- `not_required`

### Wetter

- `idle`
- `loading`
- `fresh`
- `stale`
- `manual`
- `unavailable`
- `error`

### Empfehlung

- `idle`
- `ready`
- `partial`
- `blocked`

Beispiele:

- `offline + stale + partial` ist zulässig,
- `location denied + manual weather + ready` ist zulässig,
- `car in_car + weather unavailable + cabinTemp available + ready` ist zulässig,
- `sleep + roomTemp fehlt + blocked` ist zulässig.

Verhaltensregeln:

- Standortablehnung ist kein fataler Fehler; Ortssuche/manuelle Eingabe anbieten.
- Offline mit ausreichend frischem Cache: Empfehlung erlaubt, Cache sichtbar kennzeichnen.
- Staler Cache: nur sichtbar gekennzeichnet und mit eingeschränkter Datenqualität verwenden.
- Fehlende optionale Wetterfelder werden nie als `0` interpretiert.
- Ohne verwertbare thermische Daten wird die jeweilige wetterabhängige Phase `partial` oder `blocked`.

## 12. Nackentest und Personalisierung

Der Nackentest ist die wichtigste Rückmeldung nach dem Anziehen:

- warmer, trockener Nacken/Brustbereich → passend,
- heiß oder schwitzig → Isolation reduzieren,
- kühl → geeignete Isolation ergänzen.

Kalte Hände/Füße allein verändern die globale Wärmestufe nicht.

**V1 lernt nicht automatisch aus Feedback.** `warmthBias` wird bewusst durch die Betreuungsperson gesetzt. Nackentestdaten dürfen optional lokal protokolliert/exportiert werden, haben aber in V1 keine automatische langfristige Wirkung.

## 13. Schlaf- und TOG-Strategie

TOG bleibt als Eigenschaft eines Schlafsacks speicher- und anzeigbar, aber nicht als universeller Algorithmusschlüssel.

Priorität:

1. Raumtemperatur,
2. konkrete Herstellerangaben des gewählten Schlafsacks,
3. sichere Schlafkleidung darunter,
4. Nackentest.

Wenn konkrete Herstellerbänder vorhanden sind, können sie in strukturierter Form hinterlegt werden, einschließlich empfohlener Unterkleidung.

Fehlen sie:

- keine generische TOG-Tabelle erfinden,
- keine exakte TOG-basierte Kombination behaupten,
- Empfehlung als `partial` kennzeichnen,
- sichere Schlafgrundregeln und Nackentest weiterhin anzeigen.

## 14. Quellenregister für normative Sicherheitsregeln

Stand der Prüfung: 2026-08-25.

### SRC-WHO-UV-1

WHO – Radiation: Protecting against skin cancer  
https://www.who.int/news-room/questions-and-answers/item/radiation-protecting-against-skin-cancer

Verwendet für:

- Babys unter 12 Monaten im Schatten halten / direkte Sonne vermeiden.

### SRC-WHO-UV-2

WHO – Ultraviolet radiation  
https://www.who.int/news-room/fact-sheets/detail/ultraviolet-radiation

Verwendet für:

- aktive UV-Schutzmaßnahmen ab UV-Index 3.

### SRC-NHS-SUN

NHS – Safety in the sun  
https://www.nhs.uk/baby/first-aid-and-safety/safety/safety-in-the-sun/

Verwendet ergänzend für:

- konsequenten Schutz kleiner Babys vor direkter Sonne,
- leichte bedeckende Kleidung und Sonnenhut.

### SRC-LULLABY-ROOM

The Lullaby Trust – Room temperature  
https://www.lullabytrust.org.uk/baby-safety/safer-sleep-information/room-temperature/

Verwendet für:

- 16–20 °C als Safer-Sleep-Orientierungsbereich,
- Temperaturkontrolle an Brust/Nacken,
- keine universelle TOG/Kleidungs-Tabelle als sichere allgemeingültige Regel.

### SRC-LULLABY-DRESS

The Lullaby Trust – Dress your baby for sleep  
https://www.lullabytrust.org.uk/baby-safety/baby-product-information/dress-your-baby-for-sleep/

Verwendet für:

- leichte Schlafkleidung,
- Kopf beim Schlafen frei,
- Herstellerangaben für Schlafsäcke beachten.

### SRC-NHTSA-CARSEAT

NHTSA – Keep Your Little Ones Warm and Safe in Their Car Seats  
https://www.nhtsa.gov/keep-your-little-ones-warm-and-safe-their-car-seats

Verwendet für:

- keine voluminösen Winterjacken/Overalls unter dem Gurt,
- dünne Schichten als Alternative,
- zusätzliche Decke oder Jacke über dem bereits korrekt geschlossenen Gurt.

## 15. Noch offene Produkt-/Kalibrierungsentscheidungen

Die folgenden Punkte sind bewusst offen und dürfen bei der Implementierung nicht stillschweigend erfunden werden:

### P-02 – Wetteranbieter und Cache

Wetteranbieter, konkrete Adaptersemantik, Cache-Dauer und `stale`-Grenze.

### P-03 – Fußsack-/Deckenstärke

`light | medium | warm` benötigt noch eine fachlich getestete Zuordnung zu thermischen Schritten. Keine TOG-Umrechnung für Fußsäcke erfinden.

### P-04 – Extremwettergrenzen

Grenzen für Hitze, Kälte und Sturm, ab denen die App zusätzlich auf Expositionsbegrenzung hinweist, müssen kalibriert werden.

### P-05 – Materialmodell

Zu entscheiden ist, ob V1 Materialien nur über einzelne Kleidungsdefinitionen abbildet oder eine eigene Materialachse benötigt.

## 16. Bereits entschiedene ehemalige offene Punkte

Folgende Punkte gelten für V1 als **ENTSCHIEDEN** und dürfen nicht erneut stillschweigend geöffnet werden:

- Alters-Scope: `0–24 Monate`.
- Sonne: `<12 Monate` Schatten priorisieren; unbekanntes Alter konservativ gleich behandeln.
- UV: aktiver Schutz ab `UV >= 3`.
- TOG: keine generische TOG-Tabelle in V1.
- Auto: getrennte Phasen `outdoor_transition` und `in_car`.
- Autositz-Kompatibilität: `allowed | conditional | prohibited`, nicht Boolean.
- Laufzeitzustand: mehrere unabhängige Statusachsen.
- tatsächliche Sonnenexposition gehört in den Situationskontext.
- Nackentest verändert in V1 nicht automatisch den dauerhaften `warmthBias`.
