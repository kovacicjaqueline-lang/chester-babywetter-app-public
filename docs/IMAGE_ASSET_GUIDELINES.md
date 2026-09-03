# Bildleitlinie für Kleidung und Zubehör

Diese Datei ist die verbindliche technische und visuelle Source of Truth für alle Kleidungs- und Zubehörbilder unter `assets/clothing/`.

Sie ergänzt `docs/PRODUCT_CONCEPT.md`: Produkt-, Wärme- und Safety-Semantik bleiben dort bzw. in `docs/OUTFIT_RULES.md`. Diese Leitlinie definiert ausschließlich die Bildproduktion, technische Asset-Qualität und den Sichtaudit.

## 1. Geltungsbereich

Die Regeln gelten für jedes physische Runtime-Bild, das über eine der folgenden Quellen erreichbar ist:

- `assets/clothing/manifest.json`, einschließlich `assetPath` und aller `variantPaths`,
- `assets/clothing/visual-manifest.json`, insbesondere `additionalVariants`,
- alle daraus im Katalog, Hauptoutfit oder in Alternativen erreichbaren Kleidungs- und Zubehörbilder.

Ein Kontaktbogen, Moodboard oder Asset-Sheet ist nur ein Audit-Hilfsmittel und niemals eine zulässige Quelle für zugeschnittene Runtime-Assets. Jedes physische Runtime-Bild muss als eigenes hochauflösendes Motiv mit Bildgenerierungs-KI erzeugt werden.

Verwaiste `.webp`-Dateien, die nachweislich weder über Haupt- noch Visual-Manifest erreichbar sind, sollen entfernt werden, statt unnötig neu erzeugt zu werden.

## 2. Technische Master-Spezifikation

### Generierungsquelle

- quadratische Canvas, Seitenverhältnis `1:1`,
- echte Generierungsquelle mindestens `1024 × 1024 px` pro physischem Runtime-Motiv,
- keine Ausschnitte aus Kontaktbögen oder Collagen als Runtime-Quelle,
- niemals ein kleines altes Asset hochskalieren, schärfen oder nur neu encodieren und als Neugenerierung ausgeben,
- sichtbarer Kleidungs-/Zubehörinhalt muss tatsächlich neu mit Bildgenerierungs-KI erzeugt werden.

### Runtime-Datei

Standard für V1:

- `512 × 512 px`,
- WebP mit Alpha-Kanal,
- hohe visuelle Qualität; Zielwert beim Encoding etwa Qualität 88–92,
- Metadaten entfernen,
- keine aggressive Kompression und keine sichtbaren Block-, Ringing- oder Banding-Artefakte.

`1024 × 1024 px` als finale Runtime-Datei ist zulässig, wenn ein konkreter Performance-Audit den Mehrverbrauch rechtfertigt. Ohne einen solchen Befund bleibt `512 × 512 px` der Standard.

## 3. Kanonischer Hintergrund

Runtime-Kleidungsbilder werden als sauber freigestellte Motive mit transparentem Hintergrund gespeichert.

Der sichtbare Hintergrund kommt aus der UI. Der kanonische Hintergrund der Kleidungskachel ist:

```css
#faf7f4
```

Damit ist der Hintergrund exakt reproduzierbar und nicht von kleinen Abweichungen einzelner KI-Generierungen abhängig.

Nicht zulässig ist ein Mix aus transparenten Assets und eingebrannten weißen, grauen, beigen oder sonst unterschiedlich gefärbten Studioflächen.

Falls ein einzelnes Motiv technisch nicht sauber freigestellt werden kann, darf nicht nur dieses Asset auf einen eingebrannten Hintergrund wechseln. Eine solche Ausnahme erfordert entweder erneute Generierung/Freistellung oder eine bewusste Migration des gesamten Runtime-Asset-Systems auf exakt denselben Hintergrund.

## 4. Komposition

Für jedes Motiv gilt:

- vollständiges Kleidungsstück bzw. Zubehör sichtbar,
- keine angeschnittenen Ärmel, Hosenbeine, Mützenränder, Schuhe, Gurte oder Zubehörteile,
- horizontal exakt und vertikal optisch zentriert,
- Ziel: mindestens etwa 10 % sicherer transparenter Rand auf allen vier Seiten,
- Hauptmotiv soll ungefähr 70–80 % des sinnvoll nutzbaren Bildbereichs einnehmen,
- vergleichbare Kleidungsarten haben einen vergleichbaren optischen Maßstab,
- frontale oder konsistent leicht dreidimensionale Produktansicht,
- keine zufälligen Perspektivwechsel,
- bei Paaren wie Socken, Schuhen, Booties oder Handschuhen beide Teile vollständig und als zusammengehöriges Paar zeigen.

Der automatische Randtest darf wegen Antialiasing und sehr weichen Randpixeln eine kleine technische Toleranz verwenden; Zielwert für die Gestaltung bleibt trotzdem rund 10 %.

## 5. Gemeinsamer visueller Stil

Alle Assets bilden ein zusammenhängendes System:

- hochwertige, süße Babybekleidung,
- clean, modern, weich und freundlich,
- leicht realistische Premium-Produkt-/Editorial-Illustration,
- erkennbare, aber subtile Stoffstruktur,
- konsistente Produktperspektive,
- weiches diffuses Licht aus derselben neutralen Richtung,
- sehr weicher oder kein sichtbarer Objektschatten,
- kein harter Schlagschatten.

Nicht zulässig:

- billige Clipart,
- Pixel-Art,
- Comic-Outlines,
- wechselnde Foto-/Illustrationsstile,
- Babys, Erwachsene oder andere Models,
- Hände,
- Mannequins,
- Kleiderbügel,
- Text,
- Buchstaben,
- Logos,
- Markenkennzeichen,
- Wasserzeichen,
- zusätzliche nicht angeforderte Kleidungsstücke.

## 6. Neutral, Boy und Girl

`neutral`, `boy` und `girl` verändern ausschließlich Farbe, Muster und kleine dekorative Details.

Unverändert bleiben müssen:

- Kleidungsart,
- Silhouette und Schnitt,
- Ärmel- bzw. Beinlänge,
- erkennbare Materialdicke,
- Verschlussart und fachlich relevante Konstruktion,
- thermische Bedeutung des Items.

Varianten eines Items müssen deshalb erkennbar dasselbe Grundmodell darstellen.

Empfohlene Palette:

- `neutral`: Creme, Oatmeal, warmes Beige, Sage, Taupe und gedämpfte Naturtöne,
- `boy`: Dusty Blue, Sage, gedecktes Blau/Grün und dezente kleine Muster,
- `girl`: Dusty Rose, Mauve, warmes Rosé und gedeckte florale oder feine Muster.

Keine klischeehafte Überzeichnung und keine fachlich relevante Materialänderung durch eine Stilvariante.

## 7. Master-Prompt

Für neue Runtime-Assets wird ein gemeinsamer Prompt-Kern verwendet. Nur Objektbeschreibung, Palette/Muster und bei Bedarf ein fachlich notwendiges Konstruktionsmerkmal werden ausgetauscht.

```text
Single baby clothing or baby accessory product: [OBJECT DESCRIPTION].
One isolated product only, centered, complete object fully visible, square 1:1 composition,
generous 10–15% safe margin on every side, object occupies about 70–80% of the usable canvas,
clean frontal premium product view with the same consistent slight three-dimensional depth,
soft diffuse neutral studio lighting, subtle realistic fabric texture,
premium soft baby-clothing editorial illustration, cute but modern, calm high-end muted palette,
transparent background, clean alpha edges, no baked background panel, no hard cast shadow,
no baby, no person, no model, no mannequin, no hanger, no hands,
no text, no letters, no logo, no brand mark, no watermark,
no cropped edges, no extra garments, no duplicate objects, no unrelated props.
For neutral/boy/girl variants keep exactly the same garment category, silhouette,
construction and apparent material thickness; change only color, pattern and minor decoration.
```

Zusätzliche Objektbeschreibung muss die tatsächliche Fachkategorie eindeutig machen, zum Beispiel sichtbarer Body-Verschluss beim Langarmbody oder klar erkennbare leichte Outdoor-Konstruktion bei einer Softshelljacke.

## 8. Kategoriegenauigkeit

Ein Bild darf nicht nur ungefähr ähnlich aussehen. Insbesondere:

- Kurzarmbody ist kein T-Shirt,
- Langarmbody zeigt einen klaren Body-Schnitt mit Verschluss,
- Leggings unterscheiden sich sichtbar von normaler Hose,
- dünner Pullover, Sweatshirt und Fleecejacke bleiben unterschiedliche Kategorien,
- Softshelljacke wirkt wie leichte Outdoorjacke,
- Regenjacke wirkt nicht wie Winterjacke,
- Übergangsoverall wirkt leichter als Winteroverall,
- Sonnenhut hat eine erkennbare Sonnenhutform,
- dünne und warme Mütze sind visuell unterscheidbar,
- warme Booties sind keine normalen Socken,
- leichter und warmer Fußsack unterscheiden sich plausibel in ihrer Isolationswirkung,
- Kinderwagendecken dürfen nicht wie lose Bettdecken dargestellt werden,
- Schlafsack ist klar ein Babyschlafsack und kein Overall,
- Tragecover ist eindeutig Zubehör und keine Babyjacke,
- die Autositz-Decke darf keine Darstellung erzeugen, die eine Decke unter dem Gurt oder einen falsch geschlossenen Gurt nahelegt.

Diese Bildregeln ändern keine Fach- oder Safety-Logik; im Zweifel sind die aktuellen Fachdocs und die bestehenden Item-IDs maßgeblich.

## 9. Technische Nachbearbeitung

Nach der echten KI-Generierung sind ausschließlich technische Schritte zulässig, die das Motiv nicht durch ein anderes künstliches Ersatzmotiv ersetzen:

- sauberes Freistellen,
- transparente Randpixel bereinigen,
- Canvas auf exakt `1:1` setzen,
- Alpha-Bounds bestimmen und optisch zentrieren,
- vom mindestens 1024-px-Original auf 512 px verkleinern,
- WebP-Encoding,
- Metadaten entfernen,
- verlustarme bzw. hochwertige Dateigrößenoptimierung.

Nicht als Neugenerierung zählen:

- Hochskalieren alter kleiner WebPs/PNGs,
- bloßes Schärfen,
- bloßes Umformatieren,
- Kopieren bestehender Motive,
- programmatisch erzeugte SVG-Pfade,
- CSS-, Emoji- oder Icon-Library-Ersatzbilder.

## 10. Sichtaudit

Ein Asset gilt erst nach tatsächlicher visueller Prüfung als fertig. Dateimaße und Metadaten allein genügen nicht.

Für jedes Runtime-Bild prüfen:

- Schärfe und erkennbare Stoffdetails,
- keine Pixel-/Kompressionsartefakte,
- vollständiges Motiv ohne Beschnitt,
- korrekte optische Zentrierung,
- sinnvoller Maßstab und sicherer Rand,
- transparenter Hintergrund ohne Halos,
- gleiche Perspektive und Lichtwirkung wie das System,
- korrekte Kleidungs-/Zubehörkategorie,
- keine Objekt- oder Anatomieartefakte,
- keine zusätzlichen Kleidungsstücke,
- keine Buchstaben, Logos oder Marken,
- keine unerwünschten Dubletten,
- kein Stilbruch,
- Neutral/Boy/Girl als dasselbe Grundmodell,
- gute Erkennbarkeit im tatsächlichen Mobile-Katalog und im Outfit,
- auf HiDPI/Retina keine sichtbare Unschärfe gegenüber den übrigen Assets.

Fehlerhafte Generierungen werden neu erzeugt. Ein grüner automatischer Test ersetzt diesen Sichtaudit nicht.

## 11. Automatischer Qualitäts-Gate

Die automatischen Tests sollen mindestens sicherstellen:

- jede referenzierte Datei existiert,
- jede referenzierte Datei ist ein valides, nicht leeres WebP,
- alle physischen `.webp`-Dateien sind referenziert oder bewusst entfernt,
- jedes Runtime-Bild ist quadratisch und mindestens 512 px groß,
- Haupt- und Visual-Manifest werden vollständig traversiert,
- keine alten 128-/256-px-Dateien bleiben im Runtime-Pfad,
- alle Bilder laden im Browser,
- Katalog, Outfit und Alternativen lösen weiterhin gültige Assets auf,
- bei transparentem Standard berühren sichtbare Motivpixel nicht den äußeren Sicherheitsbereich.

Die Tests dürfen keine einzelne handverlesene Vier-Dateien-Liste als Ersatz für die vollständige Runtime-Inventur verwenden.

## 12. Cache und Austausch bestehender Assets

Werden Runtime-Bilder unter unveränderten Pfaden ersetzt, muss die Service-Worker-Cache-Version erhöht werden. Dadurch dürfen bestehende PWA-Installationen nicht dauerhaft alte Bildbytes aus einem vorherigen Cache weiterverwenden.

Der zugehörige Service-Worker-Upgrade-Test wird zusammen mit dem Cache-Bump aktualisiert.
