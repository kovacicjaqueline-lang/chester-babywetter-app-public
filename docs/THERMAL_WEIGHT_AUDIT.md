# V1-Audit: Katalogzuordnung und Thermal-Gewichte

Status: abgeschlossen für V1  
Audit-Basis: `main` bei `cacc65abb0e155db026d3cd31d9e5fe71e2aab85`  
Audit-Datum: 2026-08-28

## Ergebnis

Die offene V1-Entscheidung zur finalen Katalogzuordnung einzelner Assets zu `thermalWeight` kann geschlossen werden.

Die Katalogtrennung der Übergangsjacken wurde als fachliche Ergänzung umgesetzt: `light_transition_jacket` bleibt die ungefütterte leichte Windschutzstufe, `insulated_transition_jacket` bildet die wärmere Teddy-/Cord-Zwischenstufe mit nur leichtem Windschutz. Die Werte sind als relative Produktstufen intern konsistent. Sie sind ausdrücklich keine CLO-/TOG-Messwerte.

Die drei Wärmegrößen haben getrennte Aufgaben:

- `thermalWeight`: relative Wärmeklasse vergleichbarer Körper-/Kleidungsitems und Grundlage für Swap-/Rebalancing-Logik,
- `thermalStepCredit`: externe Isolation im Kinderwagen bzw. Tragecover; keine TOG-Einheit,
- `sleepWarmthWeight`: eigene Schlafskala für Schlafsack und Schlaf-Unterkleidung.

Wind-, Regen- und UV-Schutz werden zusätzlich über eigene Schutzattribute modelliert und nicht aus `thermalWeight` abgeleitet.

## Findings nach Schweregrad

### Blocker / High / Medium

Keine Findings.

### Low

1. **Kalibrierungsinvarianten waren über mehrere Tests verteilt.** Die Engine hatte bereits Regressionstests für Alternativen, Wärmeschritte, Situationen, Autositz und Schlaf; eine kompakte Kataloginvariante für sämtliche V1-Items fehlte jedoch. Das wird durch `test/catalog-thermal-invariants.test.js` geschlossen.

### Info

1. `light_long_sleeve_shirt` bleibt trotz langer Ärmel bei `thermalWeight: 1`. Das ist beabsichtigt: Es ist die leichte UV-Bedeckungsvariante und soll Sonnenschutz nicht automatisch als zusätzliche schwere Isolation modellieren.
2. `rain_jacket` bleibt bei `thermalWeight: 0`, obwohl `rainProtection` und `windProtection` hoch sind. Das ist die gewünschte Trennung von Wetterschutz und Wärme.
3. `softshell_jacket` und `transition_overall` liegen beide in der breiten Wärmeklasse `3`. Das ist kein Monotoniefehler: Sie sind unterschiedliche Funktions-/Abdeckungsvarianten derselben relativen Wärmeklasse; der Winteroverall bildet mit `4` die klar wärmere Stufe. Für Ganzkörper-Overalls wird zusätzlich `thermalWeightByZone.legs: 1` geführt: Die Außenschicht bedeckt die Beine, ersetzt aber nicht die gesamte körpernahe Beinbasis. Dadurch kann eine warme Hose bei einem Overall-Wechsel gezielt auf eine normale Hose zurückgestuft werden, ohne die Gesamtwärme des Overalls fälschlich dreifach zu zählen.
4. `stroller_warm_blanket` und `stroller_light_footmuff` haben beide `thermalStepCredit: 1`. Das ist eine bewusst gleichwertige externe Isolationsstufe bei unterschiedlicher Bauform.
5. `sleep_bag_2_5` und `sleep_bag_3_5` teilen wegen der allgemeinen `thermalWeight`-Skala den Wert `4`, werden im Schlafmodus aber korrekt über `sleepWarmthWeight: 4` bzw. `5` unterschieden.
6. Schuhwärme wird nicht zur globalen Körperwärme-Rebalancierung addiert. Die öffentliche Engine-Contract-Schicht kalibriert Schuhalternativen separat nach deren `thermalWeight`; warme Schuhe werden deshalb gegenüber leichten/wetterfesten Schuhen korrekt als wärmer bzw. die Gegenrichtung als kühler sortiert.
7. Autositz-Zusatzwärme liegt im eigenen Slot `car_thermal_accessory`: `car_blanket_over_harness` bildet mit `thermalWeight: 1`/`thermalStepCredit: 0.5` die leichte Stufe, `car_warm_blanket_over_harness` mit `2`/`1` die warme Stufe. Beide sind ausschließlich `over_harness`; `carSeatCompatibility: prohibited` verhindert eine Verwendung unter dem Gurt. Die Auswahlgrenzen 12 °C und 8 °C stammen aus den bestehenden Wechseln der Outdoor-Baseline und sind keine neue freie Temperaturschätzung.

## Audit der V1-Katalogstufen

### Basis Oberkörper

| Item | thermalWeight | Bewertung |
| --- | ---: | --- |
| Kurzarmbody | 1 | leicht |
| T-Shirt | 1 | leicht |
| leichtes Langarmshirt | 1 | leichte UV-Bedeckung |
| Langarmbody | 2 | wärmer als Kurzarmbody |

Die Abstände sind für den Slot plausibel. Das UV-Langarmshirt ist bewusst nicht als zusätzliche Wärmestufe modelliert.

### Beine

| Item | thermalWeight | Bewertung |
| --- | ---: | --- |
| leichte Hose | 1 | leicht |
| Leggings | 2 | normal |
| normale Hose | 2 | normal |
| Strumpfhose | 2 | normal, inklusive Fußabdeckung |
| warme Hose | 3 | warm |

Monotonie und Äquivalenzgruppen sind konsistent.

### Mittelschicht

| Item | thermalWeight | Bewertung |
| --- | ---: | --- |
| dünner Pullover | 2 | normal/moderat |
| Sweatshirt | 2 | gleichwertige Alternative |
| Fleecejacke | 3 | wärmer |

Keine widersprüchliche Reihenfolge.

### Außenschicht

| Item | thermalWeight | Zusatzfunktion |
| --- | ---: | --- |
| Regenjacke | 0 | hoher Regen-/Windschutz |
| leichte Übergangsjacke | 1 | leichter Windschutz |
| gefütterte Teddy-Übergangsjacke | 2 | leichter Windschutz, leichte Isolation |
| Softshelljacke | 3 | hoher Windschutz, etwas Regenschutz |
| Übergangsoverall | 3 | warme, stärker abdeckende Außenlage |
| Winteroverall | 4 | stärkste Outdoor-Isolation |

Die Regenjacke ist bewusst Schutzschicht statt Wärmeschicht. Die gefütterte Teddy-Übergangsjacke schließt die Wärmelücke zwischen leichter Übergangsjacke und Softshell, ohne einen zusätzlichen Mid-Layer vorauszusetzen; ab Windschutzstufe 2 ersetzt die Softshell-/Regenjacke sie als funktionale Außenschicht. Übergangsoverall und Softshell liegen in derselben breiten Wärmeklasse; der Winteroverall bleibt eindeutig wärmer.

### Füße, Kopf, Hände und Schuhe

- Socken `1` < warme Socken/Booties `2`.
- Sonnenhut `0` < dünne Mütze `1` < warme Mütze `2`.
- Handschuhe `1`; der Wetterschutz ist zusätzlich über `windProtection` beschrieben.
- leichte Schuhe `1` und wetterfeste Schuhe `1` sind thermisch gleich; wetterfeste Schuhe unterscheiden sich funktional über `rainProtection`.
- warme Schuhe `2` sind thermisch klar darüber.

### Kinderwagen

| Zubehör | thermalWeight | thermalStepCredit |
| --- | ---: | ---: |
| kein Wärmezubehör | 0 | 0 |
| leichte Decke | 1 | 0.5 |
| warme Decke | 2 | 1 |
| leichter Fußsack | 2 | 1 |
| warmer Fußsack | 4 | 2 |

Die Staffelung ist konsistent und stimmt mit der Engine-Nutzung überein. Regenverdeck und Sonnenschutz haben `thermalStepCredit: 0`; ihre Wirkung kommt aus `rainProtection`, `windProtection` bzw. `sunCoverage`.

### Trage

| Zubehör | thermalWeight | thermalStepCredit |
| --- | ---: | ---: |
| kein Tragecover | 0 | 0 |
| leichtes Tragecover | 1 | 0.5 |
| warmes Tragecover | 2 | 1 |

Die Cover-Credits sind von der separaten Körperwärme-/Platzierungslogik der Trage getrennt und werden von deren Gesamt-Cap begrenzt.

### Autositz

- dünne Basisschichten sind `allowed`,
- voluminösere bzw. sitzkritische Schichten werden unabhängig von ihrem Wärmegewicht als `conditional` oder `prohibited` markiert,
- Übergangs- und Winteroverall sind `prohibited`,
- die Sicherheitsprüfung hat Vorrang vor thermischer Optimierung und manuellen Locks.

Damit ist die Autositz-Sicherheit nicht aus `thermalWeight` abgeleitet.

### Schlaf

Schlaf verwendet ausschließlich `roomTempC`, generische TOG-Orientierung und `sleepWarmthWeight`.

Schlafsäcke:

- kein Schlafsack `0`,
- 0.5 TOG `1`,
- 1.0 TOG `2`,
- 1.5 TOG `3`,
- 2.5 TOG `4`,
- 3.5 TOG `5`.

Unterkleidung:

- nur Windel `0`,
- Kurzarmbody `1`,
- Langarmbody `2`,
- leichter Schlafanzug `2`,
- Kurzarmbody + leichter Schlafanzug `3`,
- Langarmbody + leichter Schlafanzug `4`.

Diese Werte werden nicht mit Outdoor-`thermalWeight` vermischt.

## Alternativen und Rebalancing

Geprüft wurde:

- Körperteil-Swaps nutzen relative `thermalWeight`-Differenzen und balancieren andere freigegebene Slots nach,
- Kinderwagen-/Tragezubehör wird über `thermalStepCredit` als externe Isolation berücksichtigt,
- Schlafalternativen werden über `sleepWarmthWeight` bewertet,
- Schuhalternativen werden separat nach Schuh-`thermalWeight` kalibriert und nicht in globale Torso-Wärme eingerechnet,
- Funktionsschutz-Shells werden nach Regen/Wind gewählt und anschließend thermisch rebalanciert,
- manuelle Locks bleiben erhalten, außer eine harte Sicherheitsregel muss sie überstimmen,
- `wärmer`/`dünner` arbeitet über die definierten thermischen Leitern und nicht über Stilvarianten.

## Asset-/Style-Zuordnung

Für den aktuellen Stand gilt:

- alle 50 fachlichen Katalog-IDs besitzen genau die erwartete `styleAssetGroup`-Zuordnung,
- `styleAssetGroup` entspricht in V1 jeweils der fachlichen `itemId`,
- Manifest-ID, Slot, Kategorie und erlaubte Situationen werden durch den neuen Katalogtest gegengeprüft,
- visuelle Theme-/Style-Auswahl findet nach der fachlichen Recommendation statt und verändert weder `itemId` noch Wärme-/Safety-Daten,
- seit den gemergten vollständigen visuellen Audits der Asset-Basis und der zusätzlichen Varianten wurden unter `assets/clothing/**` bis zur Audit-Basis keine Dateien verändert.

Damit gibt es für den aktuellen Assetbestand keinen Hinweis auf ein Item, das strukturell einer falschen fachlichen `itemId`/`styleAssetGroup` zugeordnet ist.

## Schlussfolgerung

Für die Übergangsjacken ist die fachliche Kalibrierung mit zwei eigenen Katalogitems geschlossen: leichte Windschutzschicht `1`, gefütterte Teddy-Übergangsschicht `2` mit nur leichtem Windschutz. Weitere Änderungen an diesen Werten sollten als bewusste Produktlogikänderung behandelt und durch Kataloginvarianten sowie Situations-/Alternativtests abgesichert werden.
