# AI Decision Register – Babywetter

Dieses Register hält nur dauerhafte, bereits geschlossene Produkt- und Architekturentscheidungen fest. Es dient dazu, bei späteren Aufgaben nicht erneut alte Chats oder vollständige Fachkonzepte durchsuchen zu müssen.

Die ausführlichen Fachregeln bleiben maßgeblich in den verlinkten Dokumenten. Dieses Register ist ein kompakter Index und darf keine abweichende Zweitregel einführen.

## Geltungsbereich

- V1 ist eine lokale mobile-first HTML/CSS/Vanilla-JS-App.
- V1 verwendet ein lokales Babyprofil, `localStorage` sowie JSON-Export/-Import.
- V1 hat keine Anmeldung, keine Datenbank und keine Cloud-Synchronisation.
- Wetterdatenbeschaffung, Outfit-Engine und UI bleiben getrennt.
- Die reine Outfit-Engine greift weder auf das DOM noch direkt auf Wetter-APIs zu.

Maßgebliche Detaildokumente: [`PRODUCT_CONCEPT.md`](PRODUCT_CONCEPT.md), [`OUTFIT_RULES.md`](OUTFIT_RULES.md), [`DATA_CONTRACT.md`](DATA_CONTRACT.md) und [`IMAGE_ASSET_GUIDELINES.md`](IMAGE_ASSET_GUIDELINES.md).

## Geschlossene Produktentscheidungen

### Empfehlung und Profil

- Die App zeigt ein konkretes Hauptoutfit aus einzelnen Kleidungsstücken und nicht zuerst eine gleichwertige Liste.
- Die App ist eine Entscheidungshilfe, keine medizinische Anwendung; sie gibt keine Diagnose und keine Garantie für thermischen Komfort.
- `birthDate` ist die einzige Altersquelle. Eine redundante gespeicherte Monatszahl wird nicht verwendet.
- `profile.mobilityStage` beschreibt die allgemeine Entwicklung. Es setzt weder `activity` noch `groundContact` automatisch und verändert bei identischem Situationskontext nicht allein die thermische Empfehlung.
- Unbekannt ist nicht `0` und nicht `false`.

### Wetter und Temperatur

- Die Engine arbeitet mit einer normalisierten thermischen Referenz und verrechnet Faktoren, die bereits in einem vertrauenswürdigen `apparentTempC` enthalten sind, nicht ein zweites Mal.
- `indoor` und `sleep` verwenden ausschließlich `roomTempC`; Außenwetter wird dort nicht in Kleidung umgerechnet.
- Wettercache älter als 120 Minuten gilt nicht mehr als aktueller Wetterinput.
- Temperatur-, Wind-, UV- und TOG-Bänder sind Produktheuristiken, keine medizinische Norm und keine Garantie.

### Situationen

- Kinderwagen bedeutet nicht automatisch passiv. Die verständlichen UI-Zustände sind `Schläft`, `Wach` und `Sehr aktiv`; die interne Modellierung bleibt situationsbezogen.
- `strollerState: asleep` bleibt fachlich Kinderwagen und wird nicht automatisch zu `sleep`.
- Trage berücksichtigt die Körperwärme der tragenden Person. Tragecover wird als empfehlbares/austauschbares Zubehör modelliert, nicht als Besitzvoraussetzung.
- Autositz verwendet die aktuelle Außenwetter-Referenz. Es wird keine Innenraumtemperatur geschätzt und keine separate `outdoor_transition`-Phase erzeugt.
- Für `car` gilt Gurtsicherheit: keine voluminöse Kleidung unter dem Gurt; zusätzliche Wärme wird über dem geschlossenen Gurt modelliert.

### Schlaf und Sicherheit

- Schlafkleidung wird nach Raumtemperatur und generischer TOG-Orientierung bewertet, nicht nach Außentemperatur.
- Im Schlafmodus keine Mütze und keine lose Decke oder sonstige lose Bettware.
- Der Nackentest bleibt als sichtbare zentrale Rückmeldung erhalten.
- Warmer und trockener Nacken bedeutet passend; heiß/schwitzig bedeutet eine Schicht reduzieren; kühl bedeutet eine Schicht ergänzen.
- Kalte Hände oder Füße allein sind kein ausreichender Beleg für Frieren.

### Austausch, UI und Assets

- Kleidungsalternativen werden thermisch neu bewertet; ein Austausch ist keine reine DOM-Manipulation.
- Fachliche Kleidungs-IDs und Safety-Codes werden durch Stilvarianten nicht verändert.
- Stil- und Geschlechtsvarianten beeinflussen Farben, Muster und Optik, nicht die thermische Logik.
- `neutral` beschreibt eine unisex Stilrichtung und ist nicht auf Beige oder andere einzelne Farben beschränkt.
- Neue oder ersetzte Kleidungs- und Zubehörbilder müssen der bestehenden Asset-Leitlinie entsprechen und visuell geprüft werden.
- Fachlogik wird nicht unnötig im UI-Code dupliziert.

## Änderungen an geschlossenen Entscheidungen

Eine Änderung an diesen Entscheidungen ist kein gewöhnlicher technischer Fix. Sie benötigt eine ausdrücklich dokumentierte fachliche Entscheidung, eine Anpassung des zuständigen Fachdokuments und passende Regressionstests. Dieses Register wird danach im selben Arbeitsstrang aktualisiert.
