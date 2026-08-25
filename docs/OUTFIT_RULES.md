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
8. **Stilvariante** – ausschließlich Darstellung

Eine niedrigere Priorität darf eine höhere nicht aufheben.

Beispiel: Sehr kaltes Wetter darf im Auto nie zu einem Winteroverall unter dem Autositzgurt führen.

## 2. Geltungsbereich

V1 gilt für Babys im Alter von **0 bis einschließlich 24 Monaten**.

Altersabhängig ist in V1 vor allem die Sonnen-Sicherheitsregel:

- `<12 Monate`: direkte Sonne möglichst vermeiden und Schatten priorisieren,
- Alter unbekannt: bei direkter Sonne konservativ wie `<12 Monate` behandeln.

Die Wärmelogik selbst bleibt innerhalb des V1-Altersbereichs grundsätzlich geschlechtsneutral und wird nicht allein aus dem Alter abgeleitet.

## 3. Begriffe

### 3.1 Thermischer Schritt

Ein `thermalStep` ist eine interne Produktheuristik, mit der eine Empfehlung ungefähr um eine leichte Isolationsstufe wärmer oder kühler verschoben wird.

Ein Schritt bedeutet nicht automatisch ein zusätzliches Kleidungsstück. Die Engine kann zum Beispiel:

- Kurzarmbody gegen Langarmbody tauschen,
- T-Shirt gegen Langarmshirt tauschen,
- einen dünnen Pullover ergänzen,
- eine Jacke durch eine wärmere ersetzen,
- im Kinderwagen externe Isolation statt zusätzlicher Körperkleidung verwenden.

`thermalStep` ist kein medizinischer Messwert.

### 3.2 Schichten

- `base`: körpernahe Basisschicht
- `legs`: Beinbekleidung
- `mid`: isolierende Mittelschicht
- `outer`: Wind-/Regen-/Kälteschutz außen
- `accessory`: Mütze, Sonnenhut, Handschuhe, Socken
- `external`: Fußsack oder beaufsichtigte Decke außerhalb des Schlafbetts

### 3.3 Thermische Referenz

Die Regelengine verwendet `thermalReferenceC`.

1. Ist ein normalisierter `apparentTempC` vorhanden und vom Wetteradapter als `apparentTempTrusted: true` markiert, kann er `thermalReferenceC` liefern.
2. Andernfalls wird `airTempC` verwendet.
3. Metadaten `apparentTempIncludes` geben an, welche Faktoren bereits enthalten sind: `wind`, `humidity`, `sun`.
4. Ein bereits enthaltener Faktor darf thermisch nicht ein zweites Mal verrechnet werden.
5. Schutzfunktion und thermische Wirkung sind getrennt: Auch wenn Wind bereits in `apparentTempC` steckt, kann eine winddichte Außenschicht nötig sein.

Es gibt **keine generelle Regel**, dass jeder Providerwert namens `feelsLike` automatisch vertrauenswürdig oder baby-spezifisch ist.

## 4. Zwiebelprinzip

Die Engine bevorzugt funktional getrennte Schichten:

1. atmungsaktive Basisschicht,
2. bei Bedarf isolierende Mittelschicht,
3. nur bei Bedarf wind- oder wasserschützende Außenschicht,
4. gezielte Accessoires,
5. situationsabhängige externe Isolation.

Regeln:

- Regenjacke ist primär Nässeschutz und zählt nicht automatisch als starke Wärmeschicht.
- Softshell ist typischerweise windschützend und leicht bis mittel isolierend; konkrete Katalogeigenschaften entscheiden.
- Fleece isoliert, ist aber nicht automatisch winddicht.
- Winteroverall ist eine starke Außenschicht und unter dem Autositzgurt verboten.
- Fußsack zählt als externe Isolation und kann im Kinderwagen Körperkleidung teilweise ersetzen.
- Bei Hitze darf UV-Schutz durch Ersatz leichter Kleidungsstücke erfolgen statt durch zusätzliche schwere Schichten.

## 5. Thermische Baseline nach Temperaturbereich

Die folgenden Bänder sind **Produktheuristiken**, keine medizinische oder universelle Bekleidungsnorm. Sie sind Startpunkte für `outdoor`, normale Aktivität, trockenes Wetter und keine starke direkte Sonne.

### >= 28 °C – sehr warm

Ziel: Überhitzung vermeiden.

Mögliche Baseline:

- Kurzarmbody **oder** leichtes T-Shirt,
- Windel; optional sehr leichte, luftige Hose/Shorts je nach Sonnenschutz,
- Socken nur bei Bedarf,
- Sonnenhut bei relevanter Sonne/UV.

Keine thermische Mittelschicht und keine isolierende Außenschicht.

### 24 bis < 28 °C – warm

Mögliche Baseline:

- Kurzarmbody oder T-Shirt,
- leichte Hose/Leggings,
- dünne Socken optional,
- Sonnenhut bei Sonne/UV.

Leichte langärmelige Bedeckung kann ein kurzärmeliges Teil **ersetzen**, wenn UV-Schutz nötig ist.

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
- dünner Pullover oder Fleece,
- Übergangs-/Softshelljacke,
- Socken,
- dünne oder wärmere Mütze je nach Wind/Exposition.

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

Im Kinderwagen ist zusätzliche externe Isolation oft sinnvoller als immer mehr Kleidung am Körper.

### < 3 °C – Modell-Grenzbereich

Mögliche Baseline:

- warme Basisschicht,
- isolierende Mittelschicht,
- geeignete Winter-Außenschicht außerhalb des Autositzes,
- warme Mütze,
- Handschuhe,
- warme Fußisolation,
- im Kinderwagen geeigneter Fußsack/externe Isolation.

Die Engine soll hier nicht unbegrenzt Schichten addieren. Zusätzlich sind engmaschiger Nackentest und ein Hinweis auf begrenzte Exposition sinnvoll.

### Offene Kalibrierung R-01 – Temperaturband-Grenzen

**OFFEN:** Die Bandgrenzen müssen vor Produktfreigabe anhand konkreter Testfälle validiert werden. Änderungen an diesen Grenzen ändern keine harte Sicherheitsregel.

## 6. Aktivität

### `passive`

Beispiele: ruhiges Liegen/Sitzen draußen.  
Startheuristik: `+1 thermalStep`, sofern die Situation denselben Effekt nicht bereits enthält.

### `normal`

Keine Korrektur.

### `active`

Beispiele: viel Bewegung bei mobilem älteren Baby.  
Startheuristik: `-1 thermalStep`.

Keine Doppelzählung:

- `stroller` modelliert geringe Aktivität bereits situationsspezifisch,
- `carrier` modelliert Körperwärme primär über die Situation,
- Alter allein setzt keine Aktivitätsstufe.

## 7. Wind

Wind beeinflusst Wärmeverlust und den Bedarf nach windschützender Kleidung.

### Wenn vertrauenswürdige scheinbare Temperatur Wind bereits enthält

- kein zusätzlicher thermischer Windabschlag,
- Windstärke bleibt für die Wahl winddichter Kleidung relevant.

### Wenn Wind thermisch noch nicht enthalten ist

V1-Startheuristik:

- `<15 km/h`: kein pauschaler thermischer Schritt,
- `15–29 km/h`: bei exponiertem Baby `+1 thermalStep` **oder** winddichte Außenschicht abhängig von vorhandenen Layers,
- `>=30 km/h`: winddichte Außenschicht für exponierte Bereiche priorisieren; zusätzlicher thermischer Schritt möglich.

Kinderwagen-Windschutz reduziert direkte Exposition, darf aber nicht luftdicht schließen.

### Offene Kalibrierung R-02 – Windschwellen

**OFFEN:** Schwellen müssen mit Wetteranbieter, Testfällen und konkreten Katalogeigenschaften abgestimmt werden.

## 8. Regen und Nässe

Regen verändert primär Nässeschutz, nicht automatisch Wärmestufe.

Regeln:

- bei relevantem Regen wasserschützende Außenschicht ergänzen,
- bei warmem Wetter keine unnötig isolierende Regenkleidung erzeugen,
- bei kühlem Wetter nasse Kleidung vermeiden bzw. Wechselkleidung empfehlen,
- Regenjacke kann über einer thermisch passenden Kombination liegen,
- Softshell zählt nur dann als ausreichender Regenschutz, wenn die konkrete Katalogdefinition dies zulässt.

Mögliche Trigger:

- `precipProbabilityPct >= 50` und geplanter Aufenthalt im Freien,
- `precipMm > 0`,
- Wettercode meldet Regen/Schneeregen/Schnee.

### Offene Kalibrierung R-03 – Niederschlagsgrenze

**OFFEN:** Die produktive Wahrscheinlichkeitsschwelle muss noch festgelegt werden.

## 9. Sonne und UV

UV-Schutz und Wärmeschutz werden getrennt bewertet.

### 9.1 Altersregel

Für Babys `<12 Monate`:

- direkte Sonne möglichst vermeiden,
- Schatten priorisieren,
- dies gilt unabhängig davon, ob der UV-Index gerade unter 3 liegt.

Bei unbekanntem Alter und `sunExposure: direct` gilt derselbe konservative Fallback.

### 9.2 UV-Index 0–2

Kein zusätzlicher UV-Layer allein aufgrund des Index. Die Altersregel und tatsächliche direkte Sonne können trotzdem Schatten und Schutz erfordern.

### 9.3 UV-Index >= 3

Aktiven Schutz einplanen:

- Schatten priorisieren,
- Sonnenhut,
- leichte hautbedeckende Kleidung, wenn thermisch vertretbar,
- keine zusätzliche schwere Schicht nur für UV-Schutz.

Bei warmem Wetter wird bevorzugt ein leichtes langärmeliges Teil **anstelle** eines zusätzlichen Layers verwendet.

### 9.4 Kinderwagen in Sonne

- Sonnenschutz/Parasol statt Decke oder Mulltuch über dem Wagen,
- Luftzirkulation erhalten,
- Brust/Nacken häufiger prüfen,
- bei Wärme keine pauschale zusätzliche Kinderwagen-Isolation.

## 10. Situation `outdoor`

Reihenfolge:

1. `thermalReferenceC`,
2. Aktivität,
3. Wind,
4. Regen,
5. Sonne/UV,
6. persönlicher Bias,
7. Nackentest.

Es gibt keine Algorithmusregel `Baby immer eine Schicht mehr als Erwachsene`.

## 11. Situation `stroller`

Der Kinderwagen kombiniert geringe Eigenaktivität mit optionalem Windschutz und externer Isolation.

### Baseline

- typischerweise `+1 thermalStep` gegenüber aktivem Outdoor-Aufenthalt,
- `passive +1` nicht zusätzlich rechnen, wenn `stroller` diesen Effekt bereits enthält.

### Fußsack / Decke

V1-Modell:

- `none`: 0 externe Schritte,
- `light`: vorläufig +1 externer Isolationsschritt,
- `medium`: offen,
- `warm`: offen.

Keine TOG-Werte für Fußsäcke erfinden.

### Wärme-/Sonnenregel

- bei `thermalReferenceC >= 24 °C` Kinderwagen-Wärmemodifikator auf maximal neutral begrenzen,
- bei direkter Sonne Isolation reduzieren,
- Kinderwagen nicht mit luftstromhemmender Abdeckung überdecken.

### Schlaf im Kinderwagen

Einschlafen im Kinderwagen macht den Modus nicht automatisch zu `sleep`. Für regulären/längeren Schlaf gelten zusätzlich Herstellerangaben und sichere Schlafbedingungen des konkreten Wagens.

### Offene Kalibrierung R-04 – externe Isolation

**OFFEN:** `medium` und `warm` müssen fachlich kalibriert werden.

## 12. Situation `carrier`

Die tragende Person und die Trage liefern zusätzliche Wärme am bedeckten Rumpf.

### Baseline

- am Rumpf `-1 thermalStep` gegenüber `outdoor` als Startheuristik,
- keine unnötige dicke Schicht zwischen Baby und tragender Person,
- Tragecover oder Jacke der tragenden Person zählt als zusätzliche äußere Isolation.

### Exponierte Körperzonen

Separat schützen:

- Kopf,
- Unterschenkel,
- Füße,
- gegebenenfalls Hände.

### Hitze

Bei warmem Wetter erhöht Körperkontakt die Überhitzungsgefahr. Am Rumpf eher weniger isolieren und Nackentest häufiger einplanen.

### Offene Kalibrierung R-05 – Tragecover

**OFFEN:** thermische Bewertung `light | warm` muss anhand konkreter Produkte/Testfälle kalibriert werden.

## 13. Situation `car`

Der Automodus hat zwei Phasen.

### 13.1 `outdoor_transition`

Optionaler Weg zum/vom Auto.

- nutzt Außenwetter, wenn vorhanden,
- darf draußen Winteroverall/warme Jacke empfehlen,
- muss beim Wechsel zu `in_car` explizit anzeigen, welche voluminöse Schicht vor dem Anschnallen auszuziehen ist.

### 13.2 `in_car`

Für die angeschnallte Fahrt wird `cabinTempC` verwendet, wenn bekannt.

Wenn nur die Fahrt bewertet wird und `cabinTempC` vorhanden ist, sind Außenwetterdaten nicht Pflicht.

Wenn Außenwetter für den Übergang fehlt:

- `in_car` kann `ready` sein,
- `outdoor_transition` wird `partial`/nicht berechnet.

### 13.3 Autositz-Kompatibilität

Jedes relevante Kleidungsstück hat:

- `allowed`: darf unter dem Gurt automatisch empfohlen werden,
- `conditional`: nicht automatisch unter dem Gurt auswählen; nur als bedingte Alternative mit Hinweis, dass der Gurt weiterhin korrekt eng anliegen muss,
- `prohibited`: nie unter dem Gurt.

Beispiele:

- dünner körpernaher Body: `allowed`,
- dünne, konkret als nicht voluminös definierte Fleecevariante: kann `allowed` sein,
- nicht genauer spezifizierte Fleecejacke: `conditional`,
- voluminöse Daunenjacke/Winteroverall: `prohibited`.

### 13.4 Harte Gurtsicherheitsregeln

Unter dem Gurt verboten:

- Winteroverall,
- voluminöse Daunen-/Steppjacke,
- stark komprimierbare dicke Polsterschicht.

Zusätzliche Wärme:

- dünne zugelassene Schichten unter dem Gurt,
- Decke oder Jacke **über** dem bereits korrekt geschlossenen Gurt,
- niemals zusätzliche dicke Schicht unter den geschlossenen Gurt stopfen.

## 14. Situation `sleep`

Schlafen verwendet ein separates Modell.

### 14.1 Pflichtinput

- `roomTempC` für eine vollständige Empfehlung.

Optional:

- ausgewählter Schlafsack,
- TOG als Produkteigenschaft,
- konkrete Hersteller-Temperatur-/Unterkleidungsangaben,
- Nackentest.

Nicht als direkter thermischer Regelinput:

- Außentemperatur,
- Wind,
- UV,
- Regen.

### 14.2 Harte Schlafregeln

- keine Mütze in Innenräumen beim Schlafen,
- Kopf frei,
- keine lose Decke über einem Schlafsack,
- keine Wärmflasche oder Heizdecke,
- keine dicke Outdoor-Außenschicht,
- Schlafsack passend und nach Herstellerangabe verwenden.

### 14.3 Raumtemperatur

16–20 °C ist der Safer-Sleep-Orientierungsbereich. Außerhalb dieses Bereichs darf die App nicht automatisch eine Diagnose oder akute Gefährdung behaupten.

### 14.4 TOG-Logik – normative V1-Entscheidung

**V1 enthält keine generische TOG-zu-Temperatur-Tabelle.**

Priorität:

1. Raumtemperatur,
2. konkrete Herstellerangaben des gewählten Schlafsacks,
3. dort empfohlene sichere Unterkleidung,
4. Nackentest.

Wenn strukturierte Herstellerangaben vorhanden sind, darf die App daraus eine konkrete Kombination ableiten.

Wenn nur ein TOG-Wert vorliegt:

- TOG darf angezeigt werden,
- TOG darf nicht allein in eine exakte Unterkleidungs-Kombination umgerechnet werden,
- Ergebnis muss `partial` sein,
- keine lose Decke als Ausgleich empfehlen.

Damit entfällt die frühere offene Entscheidung zu einer generischen TOG-Tabelle.

## 15. Nackentest und Feedback

Der Nackentest ist die wichtigste reale Rückmeldung nach dem Anziehen.

### `warm_dry`

- Nacken/Brust angenehm warm und trocken,
- Outfit beibehalten.

### `hot_sweaty`

1. isolierende Komponente entfernen oder leichter ersetzen,
2. Schutzfunktion erhalten – z. B. Regenjacke nicht einfach entfernen, sondern thermische Schicht darunter reduzieren,
3. erneut prüfen.

### `cool`

1. geeignete isolierende Komponente ergänzen oder wärmer ersetzen,
2. Situation beachten – Kinderwagen kann externe Isolation nutzen; Auto muss Gurtsicherheit erhalten,
3. erneut prüfen.

### Hände/Füße

Kalte Hände/Füße allein verändern die globale thermische Stufe nicht. Gezielte Socken/Booties/Handschuhe sind möglich.

### Persistenz und Lernen

**V1 führt keine automatische langfristige Wärmeanpassung aus Nackentestereignissen durch.**

- Ein Feedback ändert nur die aktuelle Empfehlung.
- `warmthBias` bleibt manuell gesetzt.
- Feedback darf optional gespeichert/exportiert werden, hat aber keine automatische Lernwirkung.

## 16. Persönlicher Wärme-Bias

`runs_cool`:

- maximal `+1 thermalStep`.

`neutral`:

- keine Änderung.

`runs_warm`:

- maximal `-1 thermalStep`.

Der Bias darf nie:

- Autositz-Sicherheitsregeln umgehen,
- Schlafregeln umgehen,
- altersabhängigen Sonnenschutz entfernen,
- notwendigen UV-Schutz entfernen,
- extreme Wettergrenzen stillschweigend normalisieren.

## 17. Strukturierte Sicherheitswarnungen

Mindestens folgende Codes:

- `CAR_SEAT_NO_BULKY_LAYERS`
- `CAR_SEAT_REMOVE_OUTER_BEFORE_HARNESS`
- `CAR_SEAT_BLANKET_OVER_HARNESS_ONLY`
- `SLEEP_NO_HAT`
- `SLEEP_NO_LOOSE_BLANKET_OVER_BAG`
- `SLEEP_USE_ROOM_TEMPERATURE`
- `SLEEP_MANUFACTURER_GUIDANCE_REQUIRED`
- `STROLLER_DO_NOT_COVER_AIRFLOW`
- `INFANT_UNDER_12M_AVOID_DIRECT_SUN`
- `UV_SHADE_AND_COVERAGE`
- `CHECK_NECK`
- `EXTREME_COLD_CAUTION`
- `EXTREME_HEAT_CAUTION`

Die UI darf Texte variieren, aber nicht die fachliche Bedeutung verändern.

## 18. Regelkonflikte

### Kalt + Auto

Outdoor wäre Winteroverall plausibel. Ergebnis:

- `outdoor_transition`: Overall möglich,
- vor dem Anschnallen entfernen,
- `in_car`: zugelassene dünne Schichten + bei Bedarf Decke über dem Gurt.

### Warm + hoher UV

UV verlangt Bedeckung, Hitze wenige Schichten. Ergebnis: leichte, luftige, hautbedeckende Einzelteile **anstelle** zusätzlicher isolierender Layers.

### Baby <12 Monate + UV 1 + direkte Sonne

Niedriger UV-Index hebt Altersregel nicht auf. Ergebnis: Schatten priorisieren, direkte Sonne möglichst vermeiden.

### Kalt + Trage

Kälte verlangt Isolation, Körperwärme reduziert Rumpfbedarf. Ergebnis: Rumpf leichter, exponierte Beine/Füße/Kopf gezielt schützen.

### Regen + mild

Nässeschutz ergänzen, ohne automatische zusätzliche Wärmestufe.

### Schlafen + kalte Außentemperatur

Außentemperatur wird als direkter Outfitinput ignoriert. Raumtemperatur und Schlafsystem entscheiden.

### TOG bekannt, Herstellerangaben fehlen

Keine generische TOG-Tabelle anwenden. Ergebnis `partial` + sichere Grundregeln + Hinweis auf Herstellerangabe.

## 19. Quellenzuordnung

Normative Sicherheitsregeln beziehen sich auf das Quellenregister in `PRODUCT_CONCEPT.md`:

- Sonne unter 12 Monaten: `SRC-WHO-UV-1`, ergänzend `SRC-NHS-SUN`
- UV ab Index 3: `SRC-WHO-UV-2`
- Schlafraum/Nackentest/keine universelle TOG-Tabelle: `SRC-LULLABY-ROOM`, `SRC-LULLABY-DRESS`
- Autositz ohne voluminöse Kleidung: `SRC-NHTSA-CARSEAT`

Die Temperaturbänder, Windschwellen sowie Fußsack-/Tragecover-Schritte sind Produktheuristiken und ausdrücklich keine aus diesen Quellen abgeleiteten medizinischen Grenzwerte.

## 20. Verbleibende offene Kalibrierungen

- `R-01`: Temperaturband-Grenzen validieren.
- `R-02`: Windschwellen mit Wetteradapter und Testfällen validieren.
- `R-03`: Niederschlagswahrscheinlichkeit als Trigger festlegen.
- `R-04`: thermische Schritte für `medium`/`warm` Fußsack oder Decke testen.
- `R-05`: thermische Bewertung von Tragecovern testen.
- `R-06`: Grenzwerte für extreme Hitze/Kälte/Sturm und Expositionshinweise festlegen.

Nicht mehr offen:

- Altersbereich,
- `<12 Monate`-Sonnenregel,
- UV-Trigger `>=3`,
- generische TOG-Strategie,
- automatische Feedback-Lernschwelle,
- Autositz-Kompatibilitätsmodell,
- Auto-Phasenmodell.
