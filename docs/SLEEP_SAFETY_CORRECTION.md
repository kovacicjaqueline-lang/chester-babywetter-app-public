# Sleep Safety Correction – Loose Bedding

Status: fachliche V1-Korrektur, noch in die maßgeblichen Source-of-Truth-Dokumente und die technische Umsetzung einzuziehen  
Scope: `sleep`-Modus; keine Änderung der TOG-Kalibrierung

## Normative Entscheidung

Im Schlafmodus empfiehlt die App **keine lose Decke und keine sonstige lose Bettware im Schlafbereich**.

Diese Regel gilt unabhängig davon, ob als Schlafsackoption

- `sleep_bag_none`,
- `0.5 TOG`,
- `1.0 TOG`,
- `1.5 TOG`,
- `2.5 TOG` oder
- `3.5 TOG`

ausgewählt ist.

Wenn zusätzliche Wärme benötigt wird, darf die Outfitlogik ausschließlich geeignete körpernahe Schlafkleidung bzw. einen wärmeren Schlafsack wählen. Eine lose Decke ist im `sleep`-Modus **kein thermischer Ausgleich und keine Alternative**.

## Abgrenzung zum Kinderwagen

Diese Korrektur betrifft ausschließlich `mode: sleep`.

Eine als Kinderwagen-Zubehör empfohlene Decke bleibt im `stroller`-Modus entsprechend `OUTFIT_RULES.md` zulässig und thermisch modelliert. `strollerState: asleep` bleibt fachlich `stroller` und wird nicht in den Bett-Schlafmodus umgedeutet.

## Bestehende enge Formulierung

Die aktuelle Formulierung „keine lose Decke über einem Schlafsack“ ist zu eng. Sie darf nicht so interpretiert werden, dass bei `sleep_bag_none` eine lose Decke empfohlen werden könnte.

Der bestehende interne Code `SLEEP_NO_LOOSE_BLANKET_OVER_BAG` ist eine technische Kompatibilitätsfrage. Die fachliche Semantik dieses Dokuments ist unabhängig davon, ob der technische Strang den Code beibehält oder in einen allgemeineren Namen wie `SLEEP_NO_LOOSE_BEDDING` migriert.

## Erforderliche Folgewirkung vor Merge

Vor dem Merge dieser fachlichen Korrektur müssen mindestens konsistent angepasst bzw. geprüft werden:

1. `docs/PRODUCT_CONCEPT.md` – harte Schlafregel allgemein auf lose Bettware formulieren.
2. `docs/OUTFIT_RULES.md` – Sicherheitsrahmen, Beispiele und Testinvariante unabhängig vom Schlafsack formulieren.
3. `docs/DATA_CONTRACT.md` – Safety-Code-Semantik bzw. eine eventuelle Code-Migration eindeutig festlegen.
4. Outfit-Engine – sicherstellen, dass auch bei `sleep_bag_none` nie lose Bettware als Wärmeausgleich entsteht.
5. UI/Tests – nutzerseitiger Hinweis darf die Regel nicht auf „über dem Schlafsack“ verengen.

## Nicht geändert

- generische TOG-Bänder,
- Schlaf-Unterkleidungsgewichte,
- Raumtemperatur als alleinige thermische Umweltgröße im Schlafmodus,
- `sleep_bag_none` als zulässige Option,
- Kinderwagen-Deckenlogik.

## Fachliche Grundlage

Die Korrektur folgt dem bereits im Projekt festgelegten Safer-Sleep-Grundsatz eines freien Schlafbereichs ohne lose Bettware. Sie präzisiert eine bestehende Safety-Anforderung und führt keine neue Komfort- oder Thermologik ein.
