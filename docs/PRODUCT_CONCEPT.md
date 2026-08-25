# Product Concept – Baby Clothing Weather App

Status: Fachkonzept für Version 1  
Scope: Produkt- und Sicherheitslogik, noch keine UI- oder Asset-Spezifikation  
Branch: `docs/baby-clothing-concept`

## 1. Produktziel

Die App gibt für ein Baby eine konkrete, nachvollziehbare Kleidungsempfehlung aus. Die Empfehlung besteht aus einzelnen Kleidungsstücken und gegebenenfalls externer Isolation wie Fußsack oder Decke. Sie berücksichtigt:

- Wetter und gefühlte Temperatur,
- Wind,
- Niederschlag,
- Sonne und UV-Index,
- Aktivität,
- Situation,
- individuelle Rückmeldung über den Nackentest.

Die App ist eine Entscheidungshilfe und keine medizinische Anwendung. Sie gibt keine Diagnose, keine Garantie für thermischen Komfort und keine Empfehlung zur Behandlung von Fieber, Unterkühlung oder Überhitzung.

Die Fachlogik bleibt vollständig geschlechtsneutral. Optionale Stilvarianten dürfen ausschließlich Farben, Muster und Darstellungsvarianten beeinflussen.

## 2. Grundprinzipien

1. **Konkrete Einzelteile statt abstrakter Layer-Zahl.** Die Ausgabe soll z. B. `Langarmbody + Hose + dünner Pullover + Softshelljacke` lauten.
2. **Zwiebelprinzip.** Mehrere gezielt kombinierbare Schichten sind gegenüber einer unnötig schweren Einzelschicht zu bevorzugen.
3. **Gefühlte Temperatur als thermischer Ausgangspunkt.** Wind darf nicht doppelt berücksichtigt werden, wenn die Wetterquelle ihn bereits in `feelsLikeC` eingerechnet hat.
4. **Situation vor Pauschalregel.** Kinderwagen, Trage, Auto und Schlafen verändern die thermische und sicherheitsrelevante Bewertung.
5. **Sicherheitsregeln schlagen Komfortoptimierung.** Beispiel: kein dicker Overall unter einem Autositzgurt, auch wenn die Außentemperatur sehr niedrig ist.
6. **Nackentest schlägt Modellannahme.** Warm und trocken bestätigt die Empfehlung; heiß oder schwitzig führt zu weniger Isolation; kühl führt zu mehr Isolation.
7. **Kalte Hände oder Füße allein gelten nicht als ausreichender Friernachweis.**
8. **Schlafen wird nach Raumtemperatur und TOG beurteilt, nicht nach Außentemperatur.**

## 3. Zielgruppe und Scope von Version 1

Version 1 ist für Eltern und Betreuungspersonen gedacht, die für ein Baby schnell eine alltagstaugliche Kleidungskombination benötigen.

Geplanter Funktionsumfang:

- ein lokal gespeichertes Babyprofil,
- automatische oder manuelle Wetterdaten,
- Auswahl eines Situationsmodus,
- konkrete Outfitempfehlung,
- kurze Begründung der wichtigsten Modifikatoren,
- Nackentest-Rückmeldung und unmittelbare Anpassung,
- lokale Einstellungen über `localStorage`,
- JSON-Export und JSON-Import.

Nicht Teil des fachlichen Scopes von Version 1:

- medizinische Symptomprüfung,
- Diagnosen oder Gesundheitswarnsysteme,
- Benutzerkonto,
- Cloud-Synchronisation,
- Datenbank,
- kommerzielle Produktempfehlungen,
- exakte Marken- oder Materialbewertung einzelner Kleidungsstücke,
- Bild- oder UI-Gestaltung.

## 4. Hauptnutzerfluss

### 4.1 Ersteinrichtung

1. App öffnen.
2. Babyprofil anlegen oder Minimalprofil überspringen, soweit die Logik ohne Profil auskommt.
3. Standortfreigabe anbieten.
4. Bei Freigabe Wetter für den aktuellen Standort laden.
5. Bei abgelehnter oder nicht verfügbarer Standortfreigabe manuelle Ortssuche oder manuelle Wettereingabe anbieten.
6. Optional Stilvariante auswählen.
7. Standard-Situationsmodus auswählen.

### 4.2 Empfehlung erzeugen

1. Aktuelle Wetterdaten validieren.
2. Situationsmodus auswählen:
   - draußen,
   - Kinderwagen,
   - Trage,
   - Auto,
   - Schlafen.
3. Falls relevant Aktivitätsgrad und situationsspezifische Daten erfassen.
4. Regelwerk anwenden.
5. Konkrete Outfitbestandteile ausgeben.
6. Sicherheitsrelevante Hinweise separat und höher priorisiert ausgeben.
7. Kurz erklären, welche Faktoren die Baseline verändert haben, z. B. `windig → winddichte Außenschicht` oder `Trage → eine Wärmeschicht weniger am Rumpf`.

### 4.3 Rückmeldung nach dem Anziehen

Nach angemessener Eingewöhnung in die reale Situation kann die Betreuungsperson den Nackentest melden:

- `warm_dry`: warm und trocken → Outfit beibehalten,
- `hot_sweaty`: heiß oder schwitzig → eine isolierende Schicht reduzieren,
- `cool`: kühl → eine isolierende Schicht ergänzen.

Ein einzelnes Feedback verändert nur die aktuelle Empfehlung. Eine dauerhafte persönliche Wärmekorrektur darf erst aus wiederholten, konsistenten Rückmeldungen abgeleitet werden.

### 4.4 Wiederkehrende Nutzung

1. Gespeichertes Profil laden.
2. Wetter aktualisieren oder gültigen Cache verwenden.
3. Situation bestätigen/ändern.
4. Outfit neu berechnen.
5. Optional Nackentest protokollieren.

## 5. Babyprofil

Das Babyprofil soll nur Daten enthalten, die für die Fachlogik oder Darstellung tatsächlich benötigt werden.

Pflicht bzw. empfohlen:

- `profileId`: lokale UUID,
- `displayName`: optional,
- `birthDate`: optional; ermöglicht Altersgruppe ohne manuelle Pflege,
- `warmthBias`: `runs_cool | neutral | runs_warm`; standardmäßig `neutral`,
- `styleTheme`: rein visuell, z. B. `neutral | soft_blue | soft_rose | mixed`,
- `defaultActivity`: `passive | normal | active`,
- `sleepBagInventory`: optional verfügbare Schlafsäcke mit TOG-Wert und optional Herstellerhinweis.

Nicht erforderlich für die Wärmelogik von Version 1:

- Geschlecht,
- Gewicht,
- Körpergröße,
- medizinische Diagnosen.

Wenn später eine Auswahl `Junge / Mädchen / neutral` gewünscht wird, wird sie ausschließlich auf `styleTheme` abgebildet. Sie darf keine Regel in `OUTFIT_RULES.md` verändern.

### Offene Entscheidung P-01 – Altersbereich

**OFFEN:** Für Version 1 muss festgelegt werden, ob die App für `0–12 Monate`, `0–24 Monate` oder einen anderen Bereich freigegeben wird. Bis dahin darf die Fachlogik keine altersabhängigen Sonderregeln behaupten, die nicht explizit definiert sind.

## 6. Situationsmodi

### 6.1 Draußen

Generischer Modus für Aufenthalt im Freien ohne zusätzliche externe Wärmequelle. Wetter, Wind, Niederschlag, direkte Sonne, UV und Aktivität wirken unmittelbar.

### 6.2 Kinderwagen

Das Baby ist typischerweise weniger aktiv und kann deshalb mehr Isolation benötigen als bei eigener Aktivität. Fußsack oder Decke zählen als externe Isolation. Gleichzeitig kann ein Kinderwagen in Sonne oder mit zu geschlossener Abdeckung Wärme stauen.

Harte Sicherheitsregel: Kinderwagen oder Buggy nicht mit einer Decke, Mulltuch oder einer anderen luftstromhemmenden Abdeckung überdecken. Für Sonnenschutz soll ein geeigneter Sonnenschutz/Schirm verwendet werden, der Luftzirkulation und Sichtkontrolle ermöglicht.

### 6.3 Trage

Körperwärme der tragenden Person und die Trage selbst wirken als zusätzliche Isolation am bedeckten Rumpf. Dort darf die App nicht einfach dieselbe Schichtenzahl wie im Kinderwagen empfehlen. Exponierte Bereiche wie Kopf, Unterschenkel und Füße werden separat betrachtet.

### 6.4 Auto

Primäre Temperaturquelle ist nach Möglichkeit die erwartete Innenraumtemperatur, nicht die Außentemperatur.

Harte Sicherheitsregel: Keine dicke Jacke, kein voluminöser Winteroverall und keine stark komprimierbare Polsterung unter dem Autositzgurt. Wärme wird durch dünne, gut anliegende Schichten erzeugt. Zusätzliche Decke darf nur **über** dem korrekt geschlossenen Gurt liegen.

### 6.5 Schlafen

Die Schlafempfehlung ist ein eigenes Regelset. Sie verwendet:

- Raumtemperatur,
- vorhandenen Schlafsack und TOG,
- darunter getragene Schlafkleidung,
- Nackentest.

Sie verwendet **nicht** die Außentemperatur als direkten thermischen Input.

Harte Sicherheitsregeln:

- keine Mütze beim Schlafen in Innenräumen,
- Kopf unbedeckt lassen,
- keine lose Decke zusätzlich über einem Schlafsack,
- keine Wärmflasche oder Heizdecke beim Baby,
- Schlafsack muss passend sitzen und nach Herstellerangaben verwendet werden.

Ein komfortabler Zielbereich für den Schlafraum ist nach aktueller Safer-Sleep-Empfehlung etwa 16–20 °C. Die App muss trotzdem sichere, vorsichtige Hinweise für wärmere oder kühlere reale Räume liefern können.

## 7. Benötigte Wetter- und Umgebungsdaten

Für die Outdoor-Modi:

- `airTempC` – gemessene/prognostizierte Lufttemperatur,
- `feelsLikeC` – gefühlte Temperatur, falls von der Wetterquelle bereitgestellt,
- `windSpeedKmh`,
- `windGustKmh` optional,
- `precipProbabilityPct`,
- `precipMm` oder Intensitätsklasse optional,
- `weatherCode` / Niederschlagsart,
- `uvIndex`,
- `cloudCoverPct` optional,
- `isDay`,
- `observationTime`,
- `source`,
- `location`.

Für Schlafen:

- `roomTempC` – bevorzugt manuell bzw. von einem Raumthermometer übernommen,
- Außentemperatur darf nur als Kontext angezeigt werden, nicht als Regelinput für das Schlafoutfit.

### Regel zur Datenqualität

Jeder Wetter-Snapshot braucht Zeitstempel und Quelle. Ein Snapshot darf nicht stillschweigend als aktuell behandelt werden, wenn er veraltet ist.

### Offene Entscheidung P-02 – Wetteranbieter

**OFFEN:** Wetteranbieter, API-Endpunkt, erlaubte Cache-Dauer und Definition von `stale` sind noch festzulegen.

## 8. Kleidungskategorien

Der Katalog muss mindestens folgende fachliche Kategorien unterstützen:

### Basisschicht

- Kurzarmbody,
- Langarmbody,
- T-Shirt,
- Langarmshirt,
- Schlafanzug / Einteiler.

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
- wärmere Socken / Booties,
- Sonnenhut,
- dünne Mütze,
- warme Mütze,
- Handschuhe.

### Externe Isolation

- Fußsack,
- leichte Decke für beaufsichtigte Nutzung außerhalb des Schlafbetts,
- warme Decke für beaufsichtigte Nutzung außerhalb des Schlafbetts.

Jedes Kleidungsstück erhält fachliche Eigenschaften wie `thermalWeight`, `windProtection`, `rainProtection`, `sunCoverage`, `bodyZones` und `carSeatSafe`.

## 9. Geschlechtsneutrale Fachlogik und Stilvarianten

Die Empfehlung arbeitet ausschließlich mit fachlichen Kleidungs-IDs wie `long_sleeve_bodysuit` oder `softshell_jacket`.

Erst die Präsentationsschicht darf eine passende Variante auswählen, z. B.:

- neutrale Farben,
- sanfte Blau-/Grüntöne,
- sanfte Rosa-/Beerentöne,
- Tier-, Stern-, Streifen- oder Naturmuster.

Nicht erlaubt:

- unterschiedliche Wärmegrade nach Geschlecht,
- zusätzliche oder fehlende Schichten aufgrund des Stilthemas,
- unterschiedliche Sicherheitsregeln.

## 10. Lade-, Offline- und Fehlerzustände

### `loading`

Wetter wird geladen. Keine vermeintlich aktuelle Empfehlung aus unvollständigen Daten erzeugen. Ein vorhandener gültiger Cache darf mit sichtbarem Zeitstempel verwendet werden.

### `offline_with_cache`

Netzwerk nicht verfügbar, aber ein ausreichend frischer Snapshot ist vorhanden. Empfehlung ist erlaubt und muss als gecacht gekennzeichnet sein.

### `offline_without_cache`

Keine Wetterdaten verfügbar. App wechselt auf manuelle Eingabe von Temperatur und optional Wind/Regen/UV. Ohne mindestens einen verwertbaren Temperaturwert darf keine wetterbasierte Outfitempfehlung berechnet werden.

### `location_denied`

Standortfreigabe wurde abgelehnt oder entzogen. Das ist kein Fehlerzustand des Nutzers. App bietet Ortssuche oder manuelle Wettereingabe an.

### `location_unavailable`

Gerät kann keinen Standort bestimmen. Verhalten wie `location_denied`, aber technisch separat protokollierbar.

### `weather_api_error`

API hat Fehler geliefert. Gültigen Cache verwenden, falls vorhanden; sonst manuelle Eingabe anbieten.

### `weather_stale`

Daten sind älter als die definierte Gültigkeitsdauer. Die App darf sie nur mit deutlicher Kennzeichnung und bewusster Nutzerentscheidung verwenden.

### `sleep_missing_room_temperature`

Im Modus Schlafen fehlt die Raumtemperatur. Keine Schlafkleidung anhand der Außentemperatur ableiten; Raumtemperatur anfordern.

## 11. Sicherheit und Quellenbasis

Das Fachkonzept folgt insbesondere folgenden aktuellen Leitlinien als Sicherheitsbasis:

- NHS: Temperaturkontrolle über Brust bzw. Nacken; kühle Hände/Füße allein sind normal; bei Hitze/Schwitzen Schichten reduzieren.
- The Lullaby Trust: Schlafraum etwa 16–20 °C, Kopf unbedeckt, Überhitzung vermeiden, Schlafsack nach Hersteller-/TOG-Hinweisen verwenden.
- American Academy of Pediatrics / HealthyChildren: keine voluminösen Winterjacken oder Schneeanzüge unter Autositzgurten; dünne Schichten, zusätzliche Decke über dem Gurt.
- NHS / The Lullaby Trust: Kinderwagen im Sommer nicht mit Decken oder Tüchern abdecken, die Luftzirkulation behindern.
- WHO: ab UV-Index 3 Schutzmaßnahmen wie Schatten, Kleidung und Hut einplanen.

Diese Quellen begründen harte Sicherheitsregeln. Die konkreten Temperatur-Outfit-Bänder sind dagegen Produktheuristiken und werden in `OUTFIT_RULES.md` ausdrücklich als solche markiert.

## 12. Offene Produktentscheidungen

### P-03 – Persönliche Wärmetendenz

**OFFEN:** Soll `warmthBias` manuell wählbar sein, ausschließlich aus wiederholtem Nackentest entstehen oder beides? Empfehlung: in V1 manuell auswählbar, automatische Anpassung erst nach mehreren konsistenten Feedbacks.

### P-04 – Manuelle Wettereingabe

**OFFEN:** Minimal erforderlich ist Temperatur. Zu entscheiden ist, ob Nutzer Wind, Regen und UV komplett leer lassen dürfen und das System dann neutral annimmt oder die Unsicherheit explizit anzeigt.

### P-05 – Fußsack-/Deckenstärke

**OFFEN:** `light | medium | warm` braucht noch eine fachlich getestete Zuordnung zu thermischen Schritten. Keine pauschale TOG-Umrechnung erfinden.

### P-06 – TOG-Fallback

**OFFEN:** Bevor ein generischer TOG-Fallback produktiv verwendet wird, muss entschieden werden, ob V1 nur herstellerspezifische Empfehlungen abbildet oder zusätzlich eine klar als Orientierung markierte Standardtabelle anbietet.

### P-07 – Sehr kaltes / extremes Wetter

**OFFEN:** Für extreme Kälte, Sturm oder Hitze muss ein Grenzbereich definiert werden, in dem die App nicht weiter Schichten addiert, sondern zusätzlich auf Begrenzung der Exposition und engmaschigen Nackentest hinweist.
