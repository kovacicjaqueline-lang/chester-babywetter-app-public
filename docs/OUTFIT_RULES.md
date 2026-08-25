# Outfit Rules – Fachliche Kleidungslogik

Status: Fachkonzept für Version 1  
Geltung: thermische Outfitlogik, Situationsmodifikatoren und harte Sicherheitsregeln  
Nicht enthalten: UI, Bilder, konkrete Wetter-API-Implementierung

## 1. Regelprioritäten

Die Engine bewertet Regeln in folgender Reihenfolge:

1. **Harte Sicherheitsregel**
2. **Situationsregel**
3. **Thermische Baseline**
4. **Wettermodifikator**
5. **Aktivitätsmodifikator**
6. **Persönlicher Wärme-Bias**
7. **Nackentest-Korrektur**
8. **Stilvariante** – ausschließlich Darstellung, niemals Fachlogik

Eine niedrigere Priorität darf eine höhere nicht aufheben.

Beispiel: Sehr kaltes Wetter darf im Auto nicht dazu führen, dass ein dicker Winteroverall unter dem Autositzgurt empfohlen wird.

## 2. Begriffe

### 2.1 Thermischer Schritt

Ein `thermalStep` ist eine interne Heuristik, mit der die Engine eine Empfehlung um ungefähr eine leichte Isolationsstufe wärmer oder kühler verschiebt.

Ein Schritt bedeutet **nicht** automatisch ein zusätzliches Kleidungsstück. Die Engine kann zum Beispiel:

- von T-Shirt auf Langarmshirt wechseln,
- einen dünnen Pullover ergänzen,
- eine leichte Jacke gegen eine wärmere ersetzen,
- im Kinderwagen externe Isolation statt zusätzlicher Kleidung verwenden.

### 2.2 Schichten

- `base`: körpernahe Basisschicht
- `legs`: Beinbekleidung
- `mid`: isolierende Mittelschicht
- `outer`: Wind-/Regen-/Kälteschutz außen
- `accessory`: Mütze, Sonnenhut, Handschuhe, Socken
- `external`: Fußsack oder beaufsichtigte Decke außerhalb des Schlafbetts

### 2.3 Temperaturgrundlage

`effectiveTempC` wird folgendermaßen bestimmt:

1. Wenn die Wetterquelle einen belastbaren `feelsLikeC`-Wert liefert, wird dieser als thermische Baseline verwendet.
2. Andernfalls wird `airTempC` verwendet und Wind kann als eigener Kältemodifikator wirken.
3. Wind darf nicht ein zweites Mal als zusätzlicher Temperaturabschlag gerechnet werden, wenn `feelsLikeC` ihn bereits enthält.

Direkte Sonne wird nicht pauschal in Grad Celsius umgerechnet. Sie kann die Überhitzungsgefahr erhöhen und verändert vor allem die Auswahl von Sonnenschutz und Isolation.

## 3. Zwiebelprinzip

Die Engine bevorzugt mehrere funktional getrennte Schichten:

1. atmungsaktive Basisschicht,
2. bei Bedarf isolierende Mittelschicht,
3. nur bei Bedarf wind- oder wasserschützende Außenschicht,
4. gezielte Accessoires,
5. situationsabhängige externe Isolation.

Regeln:

- Eine Regenjacke ist primär Nässeschutz und darf nicht automatisch als warme Schicht zählen.
- Eine Softshelljacke ist windschützend und leicht bis mittel isolierend.
- Fleece ist stark isolierend, aber allein nicht zuverlässig winddicht.
- Ein Winteroverall ist eine starke Außenschicht und darf nicht unter dem Autositzgurt verwendet werden.
- Ein Fußsack zählt als externe Isolation und darf im Kinderwagen zusätzliche Kleidung teilweise ersetzen.

## 4. Thermische Baseline nach Temperaturbereich

Die folgende Tabelle ist eine **Produktheuristik**, keine medizinische oder universelle Bekleidungsnorm. Sie ist der Startpunkt für ein durchschnittlich wärmeempfindliches Baby im Modus `outdoor`, bei normaler Aktivität, trockenem Wetter und ohne starke direkte Sonne.

### >= 28 °C – sehr warm

Ziel: Überhitzung vermeiden, Sonnenschutz durch leichte Bedeckung statt zusätzliche Isolation.

Mögliche Baseline:

- Kurzarmbody **oder** leichtes T-Shirt,
- Windel; optional sehr leichte, luftige Hose/Shorts abhängig von Sonnenschutz und Situation,
- leichte Socken nur bei Bedarf,
- Sonnenhut bei relevanter Sonnen-/UV-Exposition.

Keine thermische Mittelschicht und keine isolierende Außenschicht.

### 24 bis < 28 °C – warm

Mögliche Baseline:

- Kurzarmbody oder T-Shirt,
- leichte Hose/Leggings,
- dünne Socken,
- Sonnenhut bei Sonne/UV.

Eine Langarmschicht kann als leichter UV-Schutz statt einer zusätzlichen Wärmeschicht sinnvoll sein; Material und Luftigkeit müssen dafür geeignet sein.

### 20 bis < 24 °C – mild

Mögliche Baseline:

- Kurzarmbody plus dünnes Langarmshirt **oder** Langarmbody,
- leichte Hose/Leggings,
- Socken,
- leichte Außenschicht nur bei Wind/Regen.

### 16 bis < 20 °C – kühl

Mögliche Baseline:

- Langarmbody,
- Hose/Leggings,
- dünner Pullover oder Sweatshirt,
- Socken,
- leichte windschützende Jacke bei Bedarf.

### 12 bis < 16 °C – deutlich kühl

Mögliche Baseline:

- Langarmbody,
- Hose oder wärmere Leggings,
- dünner Pullover oder Fleece als Mittelschicht,
- Übergangs-/Softshelljacke,
- Socken,
- dünne oder wärmere Mütze abhängig von Wind und Exposition.

### 8 bis < 12 °C – kalt

Mögliche Baseline:

- Langarmbody,
- Hose plus bei Bedarf Leggings/Strumpfhose,
- Pullover/Fleece,
- windschützende wärmere Außenschicht oder Übergangsoverall,
- warme Socken/Booties,
- warme Mütze,
- Handschuhe bei längerer Exposition.

### 3 bis < 8 °C – sehr kalt

Mögliche Baseline:

- Langarmbody,
- warme Beinlage,
- isolierende Mittelschicht,
- warmer Overall oder warme Jacke außerhalb des Autositzes,
- warme Socken/Booties,
- warme Mütze,
- Handschuhe.

Im Kinderwagen ist zusätzliche externe Isolation häufig sinnvoller als immer mehr Kleidung am Körper.

### < 3 °C – extreme Kälte für das V1-Regelmodell

Mögliche Baseline:

- warme Basisschicht,
- isolierende Mittelschicht,
- geeignete Winter-Außenschicht außerhalb des Autositzes,
- warme Mütze,
- Handschuhe,
- warme Fußisolation,
- im Kinderwagen geeigneter Fußsack bzw. externe Isolation.

Die Engine soll hier zusätzlich einen Hinweis auf begrenzte Expositionsdauer, häufige Temperaturkontrolle und Nackentest geben, statt unbegrenzt weitere Schichten zu addieren.

### Offene Entscheidung R-01 – Temperaturband-Grenzen

**OFFEN:** Die Bandgrenzen sind eine initiale Produktheuristik und müssen vor produktiver Freigabe mit realen Testfällen geprüft werden. Besonders 20–24 °C und 16–20 °C können je nach Aktivität, Material und Situation unterschiedliche Kombinationen benötigen.

## 5. Aktivität

Aktivität verändert die Wärmeproduktion.

### `passive`

Beispiele: ruhiges Liegen/Sitzen draußen.  
Wirkung: `+1 thermalStep`, sofern nicht bereits ein situationsspezifischer Modus denselben Effekt abbildet.

### `normal`

Keine Korrektur.

### `active`

Beispiele: viel Bewegung bei einem mobilen älteren Baby.  
Wirkung: `-1 thermalStep` als Ausgangspunkt.

Die Engine darf Aktivität nicht doppelt berücksichtigen. Im Kinderwagen ist `passive` typischerweise implizit; in der Trage wird der Wärmeeffekt primär über Körperwärme modelliert.

### Offene Entscheidung R-02 – Altersabhängige Aktivität

**OFFEN:** Solange der freigegebene Altersbereich nicht feststeht, gibt es keine automatische Aktivitätsannahme aus dem Alter allein.

## 6. Wind

Wind beeinflusst Wärmeverlust und die Notwendigkeit einer winddichten Außenschicht.

### Wenn `feelsLikeC` Wind bereits berücksichtigt

- keine zusätzliche Temperaturabsenkung,
- trotzdem bei deutlich spürbarem Wind windschützende Außenschicht priorisieren.

### Wenn nur `airTempC` vorliegt

V1-Heuristik:

- < 15 km/h: kein pauschaler thermischer Schritt,
- 15–29 km/h: bei exponiertem Baby `+1 thermalStep` oder winddichte Außenschicht,
- >= 30 km/h: winddichte Außenschicht verpflichtend für exponierte Bereiche; zusätzlich `+1 thermalStep` möglich.

Kinderwagen mit wirksamem Windschutz reduziert die direkte Windwirkung, darf aber nicht luftdicht geschlossen werden.

### Offene Entscheidung R-03 – Windschwellen

**OFFEN:** Die Schwellen dienen der Produktlogik und müssen gegen den gewählten Wetteranbieter sowie dessen Definition von `feelsLike` geprüft werden.

## 7. Regen und Nässe

Regen verändert zunächst den Nässeschutz, nicht automatisch die Wärmestufe.

Regeln:

- bei relevantem Regen eine wasserschützende Außenschicht ergänzen,
- bei warmem Wetter keine unnötig isolierende Regenkleidung erzeugen,
- bei kühlem Wetter nasse Kleidung vermeiden bzw. Wechselkleidung empfehlen,
- `Regenjacke` kann über einer passenden thermischen Kombination liegen,
- `Softshell` reicht nur dann als Regenschutz, wenn die konkrete Katalogvariante dafür vorgesehen ist.

Mögliche Auslöser:

- `precipProbabilityPct >= 50` und Aufenthalt im Freien geplant,
- `precipMm > 0`,
- Wettercode meldet Regen/Schneeregen/Schnee.

### Offene Entscheidung R-04 – Niederschlagsgrenze

**OFFEN:** Ob 50 % Wahrscheinlichkeit oder eine andere Schwelle produktiv verwendet wird, ist noch festzulegen.

## 8. Sonne und UV

UV-Schutz und Wärmeschutz sind getrennte Dimensionen.

### UV-Index 0–2

Kein automatischer zusätzlicher UV-Layer allein aufgrund des Index. Direkte starke Sonne, Alter und Aufenthaltsdauer können trotzdem Sonnenschutz erfordern.

### UV-Index >= 3

Die Engine soll Schutzmaßnahmen aktiv einplanen:

- Schatten priorisieren,
- Sonnenhut,
- leichte hautbedeckende Kleidung, wenn thermisch vertretbar,
- keine zusätzliche schwere Schicht nur für UV-Schutz.

Bei warmem Wetter soll eher ein leichtes langärmeliges Teil anstelle eines zusätzlichen Layers verwendet werden.

Bei starker Sonne im Kinderwagen:

- Sonnenschutz/Parasol statt Decke oder Mulltuch über dem Wagen,
- Luftzirkulation erhalten,
- häufige Kontrolle von Brust/Nacken.

Für sehr junge Babys muss direkte Sonne besonders konsequent vermieden werden. Die genaue Alterskommunikation wird erst nach Festlegung des unterstützten Altersbereichs finalisiert.

### Offene Entscheidung R-05 – Altersgrenzen Sonnenlogik

**OFFEN:** NHS und WHO formulieren teilweise unterschiedliche Altersgrenzen für besonders strikten Schatten. Vor Produktfreigabe ist festzulegen, welche Leitlinie für die App normativ verwendet wird.

## 9. Situation `outdoor`

`outdoor` ist die Baseline-Situation.

Thermische Reihenfolge:

1. `effectiveTempC`,
2. Aktivität,
3. Wind,
4. Regen,
5. Sonne/UV,
6. persönlicher Bias,
7. Nackentest.

Es gibt keine pauschale Regel `Baby immer eine Schicht mehr als Erwachsene`. Eine solche Faustregel ist zu ungenau für die App und wird höchstens als Hintergrundwissen, nicht als Algorithmus verwendet.

## 10. Situation `stroller`

Der Kinderwagen kombiniert geringe Eigenaktivität mit optionalem Windschutz und externer Isolation.

### Baseline

- typischerweise `+1 thermalStep` gegenüber aktivem Aufenthalt im Freien,
- nicht zusätzlich `passive +1` rechnen, wenn `stroller` diesen Effekt bereits enthält.

### Fußsack / Decke

Externe Isolation zählt in die Gesamtwärme ein und soll Körperkleidung ersetzen können.

V1-Modell:

- `none`: 0 externe Schritte,
- `light`: +1 externer Isolationsschritt,
- `medium`: noch offen,
- `warm`: noch offen.

Keine TOG-Werte für Fußsäcke erfinden.

### Hitze-/Sonnenregel

Bei warmer Witterung und direkter Sonne kann der Wagen Wärme stauen. Daher:

- keine pauschale `+1`-Erwärmung bei bereits heißer Umgebung,
- bei `effectiveTempC >= 24 °C` Kinderwagenmodifikator auf maximal neutral begrenzen,
- bei starker direkter Sonne Isolation reduzieren,
- Wagen nicht mit luftstromhemmender Decke/Tuch abdecken.

### Schlaf im Kinderwagen

Wenn ein Baby im Kinderwagen einschläft, bleibt der Modus fachlich `stroller`, solange es sich nicht um den regulären Indoor-Schlafplatz handelt. Für längeren bzw. regulären Schlaf gelten zusätzlich sichere Schlafbedingungen und Herstellerangaben des Wagens.

## 11. Situation `carrier`

Die tragende Person und die Trage liefern zusätzliche Wärme am bedeckten Körper.

### Baseline

- am Rumpf `-1 thermalStep` gegenüber `outdoor` als Startheuristik,
- keine dicke isolierende Schicht zwischen Baby und tragender Person, wenn beide bereits durch Trage/Körperkontakt ausreichend isoliert sind,
- Jacke oder Tragecover der tragenden Person zählt als zusätzliche äußere Isolation.

### Exponierte Körperzonen

Separat schützen:

- Kopf,
- Unterschenkel,
- Füße,
- gegebenenfalls Hände.

Eine Mütze kann trotz reduzierter Rumpfschichten notwendig sein.

### Hitze

Bei warmem Wetter erhöht Körperkontakt die Überhitzungsgefahr. Nackentest häufiger einplanen und am Rumpf eher weniger als mehr isolieren.

### Offene Entscheidung R-06 – Tragecover

**OFFEN:** Tragecover sollen später als eigenes Katalogelement mit `thermalWeight` erfasst werden. Bis dahin darf die Engine nur `none | light | warm` als manuelle Angabe verwenden.

## 12. Situation `car`

### Temperaturquelle

Wenn bekannt, wird `cabinTempC` verwendet. Außentemperatur dient nur zum Übergang vom Haus zum Auto bzw. vom Auto nach draußen.

Wenn `cabinTempC` unbekannt ist, muss die Empfehlung zwei Phasen unterscheiden können:

1. Weg zum Auto,
2. Fahrt im angeschnallten Autositz.

### Harte Gurtsicherheitsregeln

Unter dem Gurt nicht zulässig:

- dicker Winteroverall,
- voluminöse Daunen-/Steppjacke,
- stark komprimierbare dicke Fleece-/Polsterschicht, sofern sie den korrekten Gurtverlauf beeinträchtigt.

Bevorzugt:

- dünne körpernahe Schichten,
- dünner Pullover,
- dünne Fleecejacke nur wenn Gurt weiterhin korrekt eng anliegt,
- Mütze, Socken/Booties bei Bedarf.

Zusätzliche Wärme:

- Decke oder Jacke **über** dem bereits korrekt geschlossenen Gurt,
- niemals unter den Gurt stopfen.

Die App darf `winter_overall` im `car`-Outfit nicht als `under_harness` ausgeben.

## 13. Situation `sleep`

Schlafen verwendet ein getrenntes Modell.

### 13.1 Eingaben

Pflicht:

- `roomTempC`.

Optional:

- vorhandene Schlafsäcke mit TOG,
- Schlafkleidungsinventar,
- Nackentest.

Nicht als direkter Regelinput:

- Außentemperatur,
- Wind,
- UV,
- Regen.

### 13.2 Harte Schlafregeln

- keine Mütze in Innenräumen beim Schlafen,
- Kopf frei,
- keine lose Decke über einem Schlafsack,
- keine Wärmflasche oder Heizdecke,
- keine zusätzliche dicke Außenschicht,
- Schlafsack passend und nach Herstellerangabe verwenden.

### 13.3 Raumtemperatur

16–20 °C ist der bevorzugte Safer-Sleep-Orientierungsbereich. Die App soll Räume außerhalb dieses Bereichs nicht als automatisch gefährlich deklarieren, sondern die Kleidung anpassen und bei starken Abweichungen vorsichtige Hinweise zeigen.

### 13.4 TOG-Logik

TOG beschreibt die Wärmeleistung eines Schlafsacks, ist aber kein allein ausreichender Sicherheitswert. Herstellerangaben haben Vorrang.

Normatives V1-Prinzip:

1. Wenn für einen Schlafsack ein Hersteller-Temperaturbereich gespeichert ist, **diesen** verwenden.
2. Wenn nur ein TOG-Wert bekannt ist, darf die App nur einen klar als Orientierung markierten Fallback verwenden.
3. Nackentest bleibt Kontrollmechanismus.
4. Nicht `hoher TOG + zusätzliche lose Decke` kombinieren.

### 13.5 Vorläufiger TOG-Fallback – nicht final freigegeben

**OFFENE HEURISTIK, NICHT PRODUKTIV NORMATIV:**

- `>= 24 °C`: 0–0.5 TOG oder sehr leichte Schlafbekleidung; Herstellerangabe beachten,
- `20–<24 °C`: ungefähr 0.5–1.0 TOG,
- `16–<20 °C`: ungefähr 1.5–2.5 TOG,
- `<16 °C`: keine automatische Hochskalierung über 2.5 TOG; Raum-/Herstellerhinweis und zusätzliche körpernahe Kleidung statt loser Decken prüfen.

Diese Bereiche dürfen erst nach Entscheidung R-07 als produktive Defaults verwendet werden.

### Offene Entscheidung R-07 – TOG-Standard

**OFFEN:** Es gibt keine einzige universelle TOG-Tabelle, die für alle Schlafsackhersteller und Kleidungssets identisch gilt. Vor V1-Freigabe ist eine der folgenden Varianten festzulegen:

- nur Hersteller-Tabellen zulassen,
- generischen, deutlich als Orientierung gekennzeichneten Fallback verwenden,
- oder eine kuratierte Liste unterstützter Schlafsacktypen pflegen.

## 14. Nackentest und Feedback

Der Nackentest ist die wichtigste Rückmeldung nach dem Anziehen.

### `warm_dry`

Bedeutung: Nacken bzw. Brust angenehm warm und trocken.  
Aktion: Empfehlung bestätigen, keine Schicht ändern.

### `hot_sweaty`

Bedeutung: heiß, feucht oder schwitzig.  
Aktion:

1. eine isolierende Komponente entfernen oder leichter ersetzen,
2. harte Schutzfunktion erhalten – z. B. Regenjacke nicht einfach entfernen, sondern thermische Schicht darunter reduzieren,
3. erneut kontrollieren.

### `cool`

Bedeutung: Nacken/Brust spürbar kühl.  
Aktion:

1. eine geeignete isolierende Komponente ergänzen oder wärmer ersetzen,
2. Situation beachten – im Kinderwagen kann externe Isolation sinnvoller sein, im Auto muss Gurtsicherheit erhalten bleiben,
3. erneut kontrollieren.

### Hände und Füße

`cold_hands_or_feet` allein verändert die thermische Gesamtstufe **nicht**. Die App darf gezielt Socken/Booties/Handschuhe empfehlen, aber nicht daraus ableiten, dass der ganze Körper friert.

### Persistente Personalisierung

Ein einzelnes Feedback speichert keinen dauerhaften `warmthBias`.

Vorschlag für spätere Automatik:

- mindestens 3 vergleichbare Situationen,
- konsistente Rückmeldung in dieselbe Richtung,
- keine Schlaf-/Auto-Sicherheitsregel darf dadurch verändert werden.

### Offene Entscheidung R-08 – Feedback-Lernschwelle

**OFFEN:** Anzahl und Vergleichbarkeit der Ereignisse für automatische Personalisierung sind noch festzulegen.

## 15. Persönlicher Wärme-Bias

`runs_cool`:

- maximal `+1 thermalStep`.

`neutral`:

- keine Änderung.

`runs_warm`:

- maximal `-1 thermalStep`.

Der Bias darf nicht:

- Autositz-Sicherheitsregeln umgehen,
- Schlafregeln umgehen,
- Sonnenschutz entfernen, wenn er fachlich erforderlich ist,
- extreme Wettergrenzen stillschweigend normalisieren.

## 16. Sicherheitswarnungen als strukturierte Ergebnisse

Die Engine soll keine Sicherheitslogik nur als Freitext implementieren. Sie erzeugt strukturierte Hinweise, z. B.:

- `CAR_SEAT_NO_BULKY_LAYERS`,
- `SLEEP_NO_HAT`,
- `SLEEP_NO_LOOSE_BLANKET_OVER_BAG`,
- `STROLLER_DO_NOT_COVER_AIRFLOW`,
- `UV_SHADE_AND_COVERAGE`,
- `CHECK_NECK`,
- `EXTREME_COLD_CAUTION`,
- `EXTREME_HEAT_CAUTION`.

Die spätere UI entscheidet nur über Darstellung und Text, nicht über die fachliche Bedeutung.

## 17. Regelkonflikte

Beispiele:

### Kalt + Auto

Thermisch wäre Winteroverall plausibel, Sicherheitsregel verbietet ihn unter dem Gurt. Ergebnis: dünne Schichten + Decke über dem Gurt.

### Warm + hoher UV

UV verlangt Bedeckung, Hitze verlangt wenige Schichten. Ergebnis: leichte, luftige, hautbedeckende Einzelteile statt zusätzlicher isolierender Schicht.

### Kalt + Trage

Kälte verlangt Isolation, Körperwärme reduziert Rumpfbedarf. Ergebnis: Rumpf leichter, exponierte Beine/Füße/Kopf gezielt wärmer.

### Regen + mild

Regen verlangt Nässeschutz, Temperatur keine zusätzliche Wärme. Ergebnis: leichte Regenaußenschicht über mildem Basisset.

### Schlafen + kalte Außentemperatur

Außentemperatur wird ignoriert. Nur Raumtemperatur und Schlafsystem bestimmen das Outfit.

## 18. Fachliche offene Entscheidungen – Zusammenfassung

- `R-01`: Temperaturband-Grenzen validieren.
- `R-02`: Altersbezug der Aktivität erst nach Alters-Scope.
- `R-03`: Windschwellen mit Wetteranbieter abstimmen.
- `R-04`: Niederschlagswahrscheinlichkeit als Trigger festlegen.
- `R-05`: normative Altersgrenze für besonders strikten Sonnenschutz festlegen.
- `R-06`: thermische Bewertung von Tragecovern definieren.
- `R-07`: generische oder herstellerspezifische TOG-Strategie entscheiden.
- `R-08`: Lernschwelle für personalisierten Wärme-Bias entscheiden.
- `R-09`: thermische Schritte für `medium` und `warm` Fußsack/Decke fachlich testen.
- `R-10`: Grenzwerte für extreme Hitze/Kälte und zugehörige Expositionshinweise festlegen.
