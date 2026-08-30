# Stündliche Outfit-Zeitwahl – normative V1-Ergänzung

Status: fachlich entschieden und für V1 verbindlich  
Scope: Interaktions- und Zeitsemantik zwischen `WeatherSeries`, App-Integration und unveränderter Outfit-Engine

Dieses Dokument konkretisiert die Wetter- und Interaktionsabschnitte aus `PRODUCT_CONCEPT.md`, den Wetterdatenvertrag aus `DATA_CONTRACT.md` und die bereits bestehenden Wetterfenster-Regeln aus `OUTFIT_RULES.md`. Es führt keine neue Kleidungs-, Temperatur- oder Sicherheitsregel ein.

## 1. Auswahlverhalten

- Die Standardauswahl ist `Jetzt`.
- Die vorhandene stündliche Wettervorschau ist horizontal scrollbar/wischbar und jede verwendbare zukünftige Stunde ist direkt antippbar.
- Ein Tap auf eine Stunde löst sofort eine neue Empfehlung aus. Es gibt keinen zusätzlichen Übernehmen-Button.
- Die aktive Auswahl ist visuell und semantisch eindeutig markiert (`aria-pressed`).
- Bei der Empfehlung steht sichtbar, für welchen Zeitpunkt gerechnet wird, z. B. `Für 14:00`; bei Standardauswahl `Für jetzt`.
- Die Zeitwahl ist flüchtiger UI-/Integrationszustand und wird in V1 nicht in `localStorage` oder Exportdaten persistiert. Nach einem neuen App-Start gilt wieder `Jetzt`.

## 2. Verwendbare Prognosepunkte

Ein stündlicher Prognosepunkt ist nur auswählbar, wenn:

- `time` ein gültiger ISO-8601-Zeitpunkt ist,
- `airTempC` eine endliche Zahl ist,
- der Zeitpunkt strikt nach der tatsächlichen Request-Zeit liegt.

Vergangene oder genau erreichte Prognosezeiten werden nicht als zukünftige Auswahl angeboten. Punkte mit fehlender oder unbrauchbarer thermischer Basis werden übersprungen. Wird eine zuvor ausgewählte Stunde durch Zeitfortschritt oder neue Wetterdaten ungültig, fällt die Auswahl automatisch auf `Jetzt` zurück.

## 3. Semantik der gewählten Startzeit

Für wetterabhängige Modi (`outdoor`, `stroller`, `carrier` sowie die Outdoor-Phase von `car`) wird eine gewählte Stunde als Startpunkt der Empfehlung interpretiert:

1. Der gewählte `WeatherPoint` wird für den abgeleiteten Engine-Request zum `weather.current`.
2. Seine `airTempC` bzw. vertrauenswürdige `apparentTempC` bestimmt damit die thermische Ausgangslage.
3. Spätere gültige Prognosepunkte bleiben in `weather.hourly` erhalten; frühere Punkte werden aus dem abgeleiteten Request entfernt.
4. Die ursprüngliche `WeatherSeries` wird nicht mutiert. `weatherId`, Standort, Quelle, `fetchedAt`, `freshness` und die echten Zeitstempel bleiben erhalten.
5. `requestedAt` bleibt der tatsächliche Berechnungszeitpunkt und wird nicht auf die gewählte Prognosezeit umgeschrieben.

Damit bleibt der Datenvertrag unverändert: Die Outfit-Engine erhält weiterhin genau einen `WeatherSeries`-kompatiblen Wetterinput und benötigt weder DOM-Zugriffe noch Wetter-API-Zugriffe.

## 4. `plannedMinutes` und Wetterrisikofenster

`plannedMinutes` beginnt fachlich an der gewählten Startzeit.

Beispiel:

- Auswahl `14:00`
- `plannedMinutes: 60`
- thermische Basis: Wetterpunkt `14:00`
- Wetterrisikofenster: ungefähr `14:00` bis `15:00`

Regen, Wind, Böen und UV werden weiterhin aus allen verwertbaren Wetterpunkten innerhalb dieses Fensters zusammengefasst. Ein späterer Risikopunkt innerhalb des Fensters darf daher auch dann Schutzanforderungen auslösen, wenn der Startpunkt selbst trocken, windarm oder UV-arm ist.

Bei stale Wetter kann die bestehende App-Integration das Risikozeitfenster für `Jetzt` um den Abstand zwischen altem `current.time` und tatsächlichem `requestedAt` verlängern. Wird anschließend bewusst eine zukünftige Stunde gewählt, wird ausschließlich diese technische `Jetzt`-Kompensation wieder entfernt, damit die vom Nutzer eingestellte Aufenthaltsdauer unverändert ab der gewählten Zukunftsstunde läuft. Die fachliche Dauer selbst wird nicht verändert.

## 5. Wetterunabhängige Modi

`indoor` und `sleep` bleiben vollständig unabhängig von der Außenwetter-Zeitwahl:

- die Stundenauswahl verändert dort keinen Engine-Request,
- die Stundenoptionen sind dort nicht interaktiv,
- die Empfehlung verwendet weiterhin ausschließlich `roomTempC` und die bestehenden Indoor-/Schlafregeln.

Eine zuvor gewählte Außenwetterstunde darf beim Wechsel zu `indoor` oder `sleep` weder Raumtemperatur noch Outfit beeinflussen.

## 6. Abgrenzung

Unverändert bleiben insbesondere:

- Temperaturbänder und thermische Schichtlogik,
- Aktivitäts-, Kinderwagen-, Trage- und Autositzlogik,
- Regen-, Wind-, Böen- und UV-Schwellen,
- Schlaf-/TOG-Regeln,
- sämtliche harten Sicherheitsregeln.
