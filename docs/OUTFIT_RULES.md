# Outfit Rules – V1 Fachliche Kleidungslogik

Status: fachlich kalibrierte V1-Produktheuristik  
Scope: thermische Baseline, Wettermodifikatoren, Situationslogik, Austausch/Rebalancing und harte Sicherheitsregeln

> Die konkreten Temperatur- und TOG-Bänder sind Produktheuristiken. Sie sind keine medizinische Norm und keine Garantie. Sicherheitsregeln und Nackentest haben Vorrang.

## 1. Regelpriorität

Die Engine wendet Regeln in dieser Reihenfolge an:

1. harte Sicherheitsregeln,
2. Modus/Situation,
3. thermische Baseline,
4. Wetter-Schutzanforderungen,
5. Aktivität und externe Isolation,
6. Alter in den ersten Lebensmonaten und manuelle Wärmetendenz,
7. manuelle Item-Locks / Austausch,
8. `wärmer` / `dünner`,
9. Nackentest-Korrektur,
10. Stilvariante ausschließlich zur Darstellung.

Ein manuell fixiertes Teil darf nur dann entfernt werden, wenn es eine harte Sicherheitsregel verletzt. Die Engine erzeugt dann einen sichtbaren Override-Hinweis.

## 2. Thermisches Modell

### 2.1 `thermalReferenceC`

Für Outdoor-relevante Modi wird eine thermische Referenz bestimmt:

1. Ist `apparentTempC` vorhanden und vom Wetteradapter als vertrauenswürdig markiert, wird dieser Wert verwendet.
2. Andernfalls wird `airTempC` verwendet.
3. Faktoren, die bereits in `apparentTempC` enthalten sind, werden thermisch nicht erneut addiert.
4. Wind-, Regen- und UV-Schutz bleiben unabhängig davon als Funktionsanforderungen erhalten.

Für `indoor` wird ausschließlich `roomTempC` verwendet. Außenwetter, Wind, Regen und UV fließen dort nicht in die thermische Empfehlung ein. Für `sleep` gilt ebenfalls `roomTempC`, jedoch mit eigener TOG-/Schlaflogik.

Für Open-Meteo kann `apparent_temperature` als bekannter Adapterwert mit `wind`, `humidity` und `sun` markiert werden, weil Open-Meteo diese Bestandteile dokumentiert. Die Engine zerlegt einen solchen kombinierten Wert nicht nachträglich in einzelne Celsius-Anteile; ein Kinderwagen-Windschutz darf daher nicht die gesamte Differenz zwischen `apparentTempC` und `airTempC` als reinen Windeffekt behandeln.

### 2.2 `thermalStep`

Ein `thermalStep` ist eine relative Produktheuristik. Halbe Schritte sind erlaubt.

Beispiele für ungefähr `+1`:

- Kurzarmbody → Langarmbody,
- dünnes Shirt → dünner Pullover,
- dünne Hose → wärmere Hose,
- leichte Jacke → wärmere Außenschicht,
- im Kinderwagen leichte externe Isolation ergänzen.

Ein Schritt bedeutet nicht zwingend ein zusätzliches Kleidungsstück.

### 2.3 `thermalWeight`

`thermalWeight` dient primär zum Sortieren, Tauschen und Rebalancing innerhalb vergleichbarer Körperzonen/Slots. Er ist **kein additiver physikalischer TOG-Ersatz**.

- `0`: praktisch keine thermische Funktion; Schutz-/Shell-Funktion,
- `1`: leichte Schicht,
- `2`: normale/moderate Schicht,
- `3`: warme Schicht,
- `4`: stark isolierende Schicht/äußere Isolation.

Beispiele:

- Regenjacke ohne Futter: 0–1,
- Kurzarmbody/T-Shirt: 1,
- Langarmbody/Hose/dünner Pullover: 2,
- Fleece/warme Hose/isolierende Softshell: 3,
- Winteroverall/warmer Fußsack: 4.

## 3. Outdoor-Temperaturbaseline

Baseline: Modus `outdoor`, Aktivität `normal`, trocken, keine starke Windexposition, kein zusätzlicher Wärmekredit.

### `>= 30 °C` – sehr heiß

- so wenig Isolation wie möglich,
- Kurzarmbody oder leichtes T-Shirt; je nach Situation auch nur sehr leichte Bedeckung,
- leichte Beinbedeckung nur für Sonne/Bodenschutz,
- keine Mittelschicht,
- kein thermischer Outer-Layer,
- aktiver Hitzhinweis.

UV-/Sonnenregeln bleiben aktiv; Sonnenschutz wird durch leichte Bedeckung statt zusätzlicher Wärmeschicht erreicht.

### `28 bis <30 °C` – sehr warm

- Kurzarmbody oder T-Shirt,
- sehr leichte Hose/Leggings optional bzw. für Sonnenschutz,
- keine Mittelschicht,
- Sonnenhut bei relevanter Exposition.

### `24 bis <28 °C` – warm

- Kurzarmbody oder T-Shirt,
- leichte Hose/Leggings,
- Socken nur nach Bedarf,
- kein isolierender Mid-Layer.

### `20 bis <24 °C` – mild

- Langarmbody **oder** Kurzarmbody + dünnes Langarmshirt,
- leichte Hose/Leggings,
- Socken,
- funktionale Außenschicht nur bei Wind/Regen.

### `16 bis <20 °C` – kühl

- Langarmbody,
- Hose/Leggings,
- dünner Pullover/Sweatshirt,
- Socken,
- bei Wind leichte windschützende Außenschicht.

### `12 bis <16 °C` – deutlich kühl

- Langarmbody,
- Hose/wärmere Leggings,
- dünner Pullover oder Fleece,
- Übergangs-/Softshelljacke,
- Socken,
- dünne/warme Mütze je nach Wind und Exposition.

### `8 bis <12 °C` – kalt

- Langarmbody,
- warme Beinbekleidung bzw. Hose + zusätzliche dünne Beinlage nach Bedarf,
- Fleece/warmer Mid-Layer,
- windschützende warme Außenschicht oder Übergangsoverall,
- warme Socken/Booties,
- warme Mütze,
- Handschuhe bei längerer Exposition.

### `3 bis <8 °C` – sehr kalt

- Langarmbody,
- warme Beinlage,
- isolierende Mittelschicht,
- warme Jacke/Overall außerhalb des Autositzes,
- warme Füße,
- warme Mütze,
- Handschuhe.

### `0 bis <3 °C` – nahe Gefrierpunkt

Wie `3–8 °C`, aber mit stärkerer Isolation bzw. externer Isolation im Kinderwagen und häufigerer Kontrolle.

### `<0 °C` – Extremkälte-Schwelle der V1-Produktlogik

Die App gibt weiterhin ein Outfit aus, erzeugt aber `EXTREME_COLD_CAUTION`. Sie addiert nicht unbegrenzt Schichten und behauptet keine sichere Expositionsdauer.

## 4. Aktivität

### Outdoor

Die sichtbare V1-Auswahl unterscheidet nur:

- `normal`: `0`,
- `active`: `-1 thermalStep`.

`calm` bleibt als Legacy-Wert im Datenvertrag lesbar, wird von der App-Integration aber auf `normal` migriert und nicht mehr separat angeboten. Damit unterscheiden sich „ruhig“ und „normal“ in neu erzeugten App-Requests nicht.

### Kinderwagen

Kinderwagen ist **nicht automatisch passiv**. Die UI bietet genau `Schläft`, `Wach`, `Sehr aktiv` und mappt dies intern auf die bestehenden Achsen. Die thermische Zustandskorrektur ist bewusst temperaturabhängig, damit ein Zustand bei warmem Wetter keine unnötige Isolationsschicht erzeugt:

#### `>=20 °C`

- `Schläft` → `asleep`: `0`; Aktivitätswert wird thermisch ignoriert,
- `Wach` → `awake + normal`: `0`,
- `Sehr aktiv` → `awake + active`: `-0.5 thermalStep`, soweit noch eine sinnvolle leichtere Kombination existiert.

Ab 20 °C wird also nicht allein wegen des Kinderwagen-Zustands zusätzliche Körperisolation ergänzt. Ein sehr aktives Baby kann weiterhin leichter angezogen werden.

#### `18 bis <20 °C`

- `Schläft`: `+0.5 thermalStep`, kombiniert mit einer bevorzugten leichten Decke als entfernbarer externer Isolation,
- `Wach`: `0`,
- `Sehr aktiv`: `-0.5 thermalStep`.

Der Wärmekredit der leichten Decke wird beim Körperoutfit gegengerechnet; Schlafen soll hier nicht automatisch einen zusätzlichen Pullover oder warme Booties erzeugen.

#### `<18 °C`

- `Schläft`: `+1 thermalStep`; Aktivitätswert wird thermisch ignoriert,
- `Wach`: `+0.5 thermalStep` relativ zur Outdoor-Normalbaseline,
- `Sehr aktiv`: `0` relativ zur Outdoor-Normalbaseline.

Damit kann ein Baby, das im Kinderwagen stark strampelt/rockt, leichter angezogen werden als ein schlafendes Baby bei gleichem Wetter, ohne dass warme Temperaturen pauschal aufgeschichtet werden.

### Drinnen

- `normal`: `0`,
- `active`: `-1 thermalStep`.

Ruhiges Wachsein fällt unter `normal` und ist kein eigener thermischer Zustand.

### Trage

Keine normale Aktivitätskorrektur. Körperkontakt wird über die Trage-Regeln abgebildet.

### Auto / Schlaf

Keine Aktivitätskorrektur.

### 4.1 Mobilitätsstand und aktuelle Aktivität

`BabyProfile.mobilityStage` beschreibt die allgemeine Entwicklung und ist **keine thermische Aktivitätsstufe**:

- `low_mobility` → wenig mobil,
- `crawling` → krabbelt,
- `walking` → läuft.

Der Mobilitätsstand erzeugt selbst `0 thermalSteps`. Insbesondere gilt:

- `walking + activity: normal` hat dieselbe Aktivitätskorrektur wie `low_mobility + activity: normal`,
- ein laufendes Kind wird erst über `activity: active` thermisch leichter bewertet,
- auch ein noch nicht laufendes Kind kann bei starkem Strampeln/Krabbeln `activity: active` sein,
- `strollerState: asleep` ignoriert die Aktivitätswirkung weiterhin unabhängig vom Mobilitätsstand.

Der Mobilitätsstand darf in der UI als Entwicklungsinformation verwendet werden, um passende situative Optionen anzubieten oder vorzuschlagen. Er setzt `activity` oder `groundContact` aber niemals automatisch und ersetzt diese Angaben nicht.

### 4.2 Alter als thermische Feinjustierung

Das Alter wird aus `BabyProfile.birthDate` zum `requestedAt` der Empfehlung berechnet. Es gibt keinen separaten dauerhaft gespeicherten Alterswert.

Für Wachkleidung gilt als vorsichtige V1-Produktheuristik:

- `0 bis <3 vollendete Monate`: `+0.5 thermalStep`, sofern die jeweilige thermische Referenz `<28 °C` ist,
- `>=3 Monate`: `0`,
- unbekanntes/ungültiges Alter: `0` thermische Alterskorrektur.

Die Korrektur gilt für `outdoor`, `stroller`, `carrier`, `indoor` sowie für sichere körpernahe Kleidung in `car/in_car`. Die Autositz-Gurtsicherheitsregeln bleiben dabei immer vorrangig. `outdoor_transition` übernimmt dieselbe Outdoor-Regel.

Ab `28 °C` wird **keine zusätzliche Isolation allein wegen jungen Alters** ergänzt. Sonnen-/UV-Schutz und Hitzewarnungen bleiben unabhängig davon aktiv.

Der Altersfaktor ist absichtlich klein: Er bedeutet nicht pauschal „eine zusätzliche Schicht“. Aktivität, Situation, externe Isolation, `warmthBias`, Wetter und Nackentest werden weiterhin separat berücksichtigt. Ein sieben Monate altes Baby erhält deshalb bei identischen übrigen Inputs keinen Altersaufschlag, während ein einmonatiges Baby moderat wärmer kalibriert wird.

Für `sleep` gibt es **keine** thermische Alterskorrektur; Schlafkleidung bleibt ausschließlich an Raumtemperatur, generischer TOG-Orientierung, Wärmetendenz und Nackentest ausgerichtet.

## 5. Windkalibrierung

Die Schutzstufen orientieren sich an den Beaufort-Landbereichen. Sie sind eine Produktkalibrierung, keine Baby-spezifische medizinische Schwelle.

### 5.1 Windschutz-Anforderung

- `<20 km/h`: kein Wind-Layer allein wegen Wind erforderlich,
- `20–28 km/h` (moderate breeze): `windProtection >= 1`,
- `29–38 km/h` (fresh breeze): `windProtection >= 2`,
- `39–49 km/h` (strong breeze): `windProtection >= 3`,
- `>=50 km/h`: `windProtection >= 3` + `STRONG_WIND_CAUTION`.

Böen:

- Böen `>=39 km/h` erhöhen die geforderte Windschutzstufe mindestens auf 2,
- Böen `>=50 km/h` mindestens auf 3,
- Böen `>=60 km/h` erzeugen zusätzlich `STRONG_WIND_CAUTION`.

### 5.2 Thermischer Windeffekt

Wenn `apparentTempIncludes` bereits `wind` enthält:

- **kein** zusätzlicher thermischer Wind-Step,
- Windschutz-Anforderung bleibt bestehen,
- die vertrauenswürdige `apparentTempC` bleibt die thermische Referenz; V1 versucht nicht, den Windanteil aus einem kombinierten Feels-like-Wert herauszurechnen.

Wenn keine vertrauenswürdige scheinbare Temperatur vorliegt oder Wind dort nicht als enthalten markiert ist und das Baby exponiert ist:

- `20–28 km/h`: `+0.5 thermalStep`,
- `29–38 km/h`: `+1`,
- `39–49 km/h`: `+1.5`,
- `>=50 km/h`: maximal `+2` plus Warnhinweis.

Die Engine rechnet Wind nicht in erfundene zusätzliche Celsiusgrade um.

### 5.3 Windschutz des Kinderwagens

- `none`: keine Reduktion,
- `partial`: einen **separat berechneten** thermischen Windmodifikator um maximal `0.5` reduzieren,
- `good`: einen **separat berechneten** thermischen Windmodifikator um maximal `1` reduzieren,
- `unknown`: keine thermische Schutzreduktion annehmen.

Ist Wind bereits Bestandteil einer vertrauenswürdigen `apparentTempC`, verändert `windProtection` diese Referenz nicht. Der kombinierte Wert enthält neben Wind ggf. auch Luftfeuchte und Sonne und kann mit dem V1-Datenvertrag nicht sauber in einzelne Temperaturanteile zerlegt werden. Funktionale Windschutzanforderungen bleiben unabhängig davon aktiv.

Neue Kinderwagen-Kontexte starten mit `windProtection: unknown`. Alte unversionierte UI-Zustände aus der früheren Default-Semantik (`partial`) werden einmalig konservativ auf `unknown` migriert. Danach bleibt eine vom Nutzer ausdrücklich gewählte versionierte Einstellung `none | partial | good | unknown` erhalten.

Windschutz darf nicht als luftdichtes Verschließen umgesetzt werden.

## 6. Regenkalibrierung

Regen ist zunächst eine Schutzfunktion, keine Wärmestufe.

Die Engine betrachtet den geplanten Zeitraum; fehlt eine Dauer, wird ein Standardfenster von **2 Stunden** verwendet.

### 6.1 Trigger

**Regen-/Nässeschutz erforderlich**, wenn:

- aktueller Niederschlag `>0`, oder
- Niederschlagsart aktuell `rain | sleet | snow`, oder
- maximale Niederschlagswahrscheinlichkeit im relevanten Zeitfenster `>=60 %`.

**Optional / bereithalten**, wenn:

- Wahrscheinlichkeit `40–59 %`.

**Kein automatisches Regenelement**, wenn:

- Wahrscheinlichkeit `<40 %` und kein aktueller Niederschlag.

Diese Prozentgrenzen sind Produktheuristiken zur Vermeidung von zu vielen Fehlalarmen.

### 6.2 Outdoor

Bei exponiertem Baby/Bodenkontakt:

- Regenjacke oder geeignete Shell,
- thermische Schichten darunter bleiben nach Temperatur gewählt,
- Regenjacke ohne Futter zählt nicht automatisch als warme Schicht.

### 6.3 Kinderwagen

Bei erforderlichem Regenschutz wird standardmäßig **Regenverdeck** als Situationszubehör empfohlen, sofern das Baby im Wagen bleibt.

- Regenjacke ist dann nicht automatisch zusätzlich nötig.
- Wird Regenverdeck manuell entfernt/getauscht, muss der Körperschutz neu berechnet werden.
- Bei Wärme darf ein Regenverdeck nicht als verlässlicher Wärmekredit gerechnet werden; Belüftung/Überhitzung beachten.

## 7. Sonne und UV

### 7.1 Alter

`<12 Monate + direct sun`:

- Outfit weiterhin anzeigen,
- `INFANT_UNDER_12M_AVOID_DIRECT_SUN`,
- Schatten priorisieren.

Unbekanntes Alter + direkte Sonne:

- konservativer gleicher Hinweis.

### 7.2 UV

- `UV 0–2`: kein zusätzlicher UV-Layer allein wegen Index,
- `UV >=3`: Schutz aktiv einplanen,
- hohe UV-Anforderung wird bei Wärme durch leichte bedeckende Kleidung bzw. Austausch gelöst, nicht durch zusätzlichen schweren Layer.

Für neue Outdoor-, Kinderwagen- und Trage-Kontexte ist `sunExposure: unknown` der sichere UI-Ausgangswert. Alte unversionierte UI-Zustände mit dem früher automatisch gesetzten `shade` werden einmalig konservativ auf `unknown` migriert, weil die App bei diesen Legacy-Daten nicht unterscheiden kann, ob `shade` bewusst gewählt oder nur der frühere Default war. Nach der Migration/versionierten Speicherung bleibt ein ausdrücklich gewähltes `shade | partial | direct | unknown` erhalten.

### 7.3 Kinderwagen

Bei `direct sun` oder relevantem UV wird **Sonnensegel/Sonnenschirm** als bevorzugtes Zubehör empfohlen. Keine Decke/Mulltuch-Abdeckung über dem Wagen.

## 8. Modus `stroller`

### 8.1 Thermische externe Isolation

Externe Isolation erhält einen relativen Wärmekredit:

- leichte Decke: `+0.5 thermalStep`,
- leichter Fußsack: `+1`,
- warme Decke: `+1`,
- warmer Fußsack: `+2`.

Der Wärmekredit ersetzt bei Bedarf Kleidung am Körper. Er darf nie funktionale Wind-/Regen-/UV-Schutzanforderungen entfernen.

### 8.2 Standardempfehlung nach Temperatur und Zustand

#### `>=20 °C`

- keine thermische externe Isolation standardmäßig,
- `Schläft` erhält keine zusätzliche Körperisolation allein wegen des Schlafzustands,
- `Wach` bleibt auf der Outdoor-Normalbaseline,
- `Sehr aktiv` darf um `-0.5 thermalStep` leichter werden, soweit noch eine sinnvolle leichtere Kombination existiert,
- ab `24 °C` darf eine automatische thermische Zustands-/Rebalance-Korrektur keine isolierende `mid`- oder thermische `outer`-Schicht erzeugen,
- funktionale Wind-/Regen-Shells bleiben davon ausdrücklich ausgenommen,
- bei direkter Sonne keine Decke/Fußsack nur wegen Kinderwagenmodus.

#### `18 bis <20 °C`

- `Sehr aktiv`: keine externe Isolation und `-0.5 thermalStep`,
- `Wach`: keine externe Isolation, keine zusätzliche Zustandswärme,
- `Schläft`: leichte Decke bevorzugt; ihr `+0.5` Wärmekredit gleicht den `+0.5` Schlafzustand am Körper wieder aus.

#### `14 bis <18 °C`

- `Sehr aktiv` (`awake + active`): normalerweise keine externe Isolation,
- `Wach` (`awake + normal`): leichte Decke optional,
- `Schläft` (`asleep`): leichte Decke bevorzugt.

#### `10 bis <14 °C`

- `Sehr aktiv`: leichte Decke oder keine externe Isolation mit entsprechend wärmerer Körperkleidung,
- `Wach`: leichter Fußsack bevorzugt,
- `Schläft`: leichter Fußsack bevorzugt.

#### `5 bis <10 °C`

- `Sehr aktiv`: leichter Fußsack bevorzugt,
- `Wach`: warmer Fußsack bevorzugt,
- `Schläft`: warmer Fußsack bevorzugt.

#### `<5 °C`

- warmer Fußsack bevorzugt,
- warme Decke ist austauschbare Alternative und löst Rebalancing aus,
- unter `0 °C` zusätzlich Extremkälte-Hinweis.

### 8.3 Schlafen im Kinderwagen

`strollerState: asleep` bleibt fachlich `stroller`, nicht `sleep`.

- keine TOG-Logik,
- Outdoor-Wetter bleibt relevant,
- unter 20 °C kann der Schlafzustand den thermischen Bedarf erhöhen,
- ab 20 °C wird nicht allein wegen `asleep` zusätzliche Körperisolation oder ein Fußsack erzeugt,
- Hersteller-/Sicherheitsbedingungen des konkreten Kinderwagens bleiben außerhalb der Outfitengine zu beachten.

## 9. Modus `carrier`

### 9.1 Körperkontakt

Körperkontakt liefert am bedeckten Rumpf standardmäßig etwa `-1 thermalStep` gegenüber Outdoor-Normalbaseline.

Diese Reduktion gilt **nicht** automatisch für Kopf, Füße, Unterschenkel und Hände.

### 9.2 Position zur Jacke der tragenden Person

- `over_wearer_outerwear`: kein zusätzlicher Shared-Outer-Wärmekredit,
- `under_wearer_outerwear`: wenn die Jacke den Babyrumpf tatsächlich mit bedeckt, zusätzlich `-0.5 thermalStep`.

### 9.3 Tragecover

- `none`: 0 zusätzlich,
- `light`: `-0.5 thermalStep` am bedeckten Rumpf,
- `warm`: `-1 thermalStep`.

Überlappende Wärme durch Jacke + Cover wird nicht unbegrenzt addiert. Gesamt-Reduktion am Rumpf ist auf `-2 thermalSteps` begrenzt.

### 9.4 Hitze

- bei `thermalReferenceC >=24 °C` besonders zurückhaltend isolieren,
- bei `>=28 °C` im Carrier `EXTREME_HEAT_CAUTION`,
- Gesicht/Atemwege immer frei,
- Nackentest besonders wichtig.

## 10. Modus `car`

### 10.1 Phasen

- `outdoor_transition`: wetterbasierte Kleidung zum/vom Auto,
- `in_car`: Kleidung unter/über dem Gurt anhand einer bekannten oder geschätzten Innenraumtemperatur.

### 10.2 Innenraumtemperatur

Für V1 gelten drei Quellen mit klarer Semantik:

- `manual`: der Nutzer hat den Innenraumwert manuell korrigiert,
- `measured`: der Nutzer markiert einen tatsächlich gemessenen Innenraumwert ausdrücklich als gemessen,
- `estimated`: die Innenraumtemperatur ist unbekannt und wird durch die vorgelagerte Integrationslogik geschätzt.

Für `estimated` verwendet V1 **fix 20 °C als neutrale klima-kontrollierte Annahme**. Diese Zahl ist bewusst grob und keine Prognose des realen Fahrzeuginnenraums. Sie wird nicht aus `airTempC`, `apparentTempC`, Wind, Sonne oder Fahrtdauer berechnet.

Begründung: Die verfügbaren V1-Inputs enthalten weder tatsächlichen Innenraumzustand noch HVAC-/Heizungs-/Klimastatus, Vorheizen/Vorkühlen, Parkdauer oder solare Aufheizung. Eine außenwetterabhängige Formel würde deshalb Scheingenauigkeit erzeugen. Außenwetter gehört ausschließlich in `outdoor_transition`; `in_car` verwendet `cabinTempC`.

Bei `estimated` muss die App:

- `cabinTempSource: estimated` bis ins Ergebnis tragen,
- `CAR_CABIN_TEMPERATURE_ESTIMATED` sichtbar anzeigen,
- `ready_with_estimate` statt unmarkiertem `ready` verwenden,
- eine schnelle manuelle Korrektur erlauben,
- beim manuellen Ändern von `cabinTempC` auf `manual` wechseln,
- beim Zurückschalten auf `estimated` wieder 20 °C einsetzen,
- keine Gurtsicherheitsentscheidung aus der Schätzung oder der Temperaturquelle ableiten.

`measured` und `manual` verwenden den angegebenen Wert ohne Schätzkennzeichnung.

### 10.3 Gurtsicherheit

- `allowed`: darf automatisch `under_harness` gewählt werden,
- `conditional`: nur als Alternative mit Passform-/Gurthinweis,
- `prohibited`: nie unter dem Gurt.

Winteroverall/voluminöse Jacke:

- erlaubt in `outdoor_transition`,
- vor `in_car` explizit entfernen.

Zusätzliche Decke/Jacke:

- nur **über** dem bereits korrekt geschlossenen Gurt.

## 11. Modus `indoor`

`indoor` ist normale Wachkleidung anhand der Raumtemperatur und nicht Schlafkleidung.

- thermische Referenz: ausschließlich `roomTempC`,
- `normal`: keine Aktivitätskorrektur,
- `active`: `-1 thermalStep`,
- keine Wind-, Regen- oder UV-Regeln,
- keine wetterbedingte Außenschicht,
- keine Mütze oder Handschuhe allein aus der Raumtemperaturbaseline,
- keine TOG-/Schlafsacklogik.

Für die körpernahen Slots wird dieselbe kalibrierte Temperaturstaffel als Ausgangspunkt verwendet; reine Außenschutzslots werden im Drinnenmodus entfernt. Damit bleiben Body, Hose, Mittelschicht und Füße konsistent zur bestehenden Kalibrierung, ohne Außenwetter zu simulieren oder anzuzeigen.

## 12. Schuhe / Bodenkontakt

- `groundContact: none`: keine Schuhe allein aus Temperaturgründen; Socken/Booties je Bedarf,
- `standing`: wettergerechte Schuhe abhängig von Untergrund/Wetter,
- `walking`: Schuhe als regulärer Outfit-Slot; Regen/Kälte beeinflussen die Variante.

`groundContact` beschreibt die aktuelle Draußensituation. `profile.mobilityStage: walking` darf deshalb nicht automatisch `groundContact: walking` setzen; ein Kind, das laufen kann, kann aktuell trotzdem getragen werden, sitzen oder ohne Bodenkontakt unterwegs sein.

Schuhe sind austauschbar und beeinflussen nicht die globale Rumpf-Wärmebewertung.

## 13. Schlafmodus – generische TOG-Orientierung

### 13.1 Sicherheitsrahmen

- Raumtemperatur, nicht Außentemperatur,
- keine Mütze,
- Kopf frei,
- keine lose Decke oder andere lose Bettware im Schlafbereich – unabhängig davon, ob ein Schlafsack gewählt ist,
- zusätzliche Wärme nur über geeignete körpernahe Schlafkleidung oder einen passenden Schlafsack,
- keine Wärmflasche/Heizdecke,
- keine gewichteten Schlafprodukte,
- Schlafsack passend sitzend,
- Nacken/Brust zur Kontrolle.

16–20 °C bleibt der Safer-Sleep-Orientierungsbereich.

### 13.2 Warum trotzdem eine generische Tabelle existiert

Der Lullaby Trust stellt bewusst keine universelle TOG/Kleidungs-Tabelle bereit, weil Material, Layer und Baby variieren. V1 braucht für die gewünschte Austauschfunktion dennoch eine generische Produktorientierung.

Die folgenden Bänder sind daher aus überlappenden Bereichen mehrerer Schlafsackanbieter kalibriert und werden in der UI als **Orientierung** gekennzeichnet.

### 13.3 Verfügbare Schlafsack-Slots

- `none`,
- `0.5`,
- `1.0`,
- `1.5`,
- `2.5`,
- `3.5 TOG`.

### 13.4 Schlaf-Wärmegewicht

Nur für die interne Austauschlogik:

- kein Schlafsack: `0`,
- 0.5 TOG: `1`,
- 1.0 TOG: `2`,
- 1.5 TOG: `3`,
- 2.5 TOG: `4`,
- 3.5 TOG: `5`.

Unterkleidung:

- nur Windel: `0`,
- Kurzarmbody: `1`,
- Langarmbody: `2`,
- leichter Pyjama/Schlafanzug: `2`,
- Kurzarmbody + leichter Pyjama: `3`,
- Langarmbody + leichter Pyjama: `4`.

Diese Punkte sind **keine TOG-Einheiten**; sie sind lediglich Rebalancing-Gewichte.

### 13.5 Kalibrierte Hauptempfehlungen

| Raumtemperatur | Hauptempfehlung | typische gleichwertige Alternative |
|---|---|---|
| `>=27 °C` | kein Schlafsack + Windel oder sehr leichter Kurzarmbody | 0.5 TOG + Windel, falls angenehm |
| `24–<27 °C` | 0.5 TOG + Kurzarmbody | kein Schlafsack + leichter Pyjama |
| `22–<24 °C` | 1.0 TOG + Kurzarmbody | 0.5 TOG + leichter Pyjama |
| `20–<22 °C` | 1.5 TOG + Kurzarmbody | 1.0 TOG + leichter Pyjama |
| `18–<20 °C` | 2.5 TOG + Kurzarmbody | 1.5 TOG + leichter Pyjama |
| `16–<18 °C` | 2.5 TOG + Langarmbody | 3.5 TOG + Kurzarmbody |
| `<16 °C` | 3.5 TOG + Langarmbody | 2.5 TOG + Kurzarmbody + leichter Pyjama |

Unter `16 °C` erscheint zusätzlich ein Hinweis, den Raum wenn möglich Richtung 16–20 °C zu bringen und nicht einfach lose Bettware als zusätzliche Wärme zu verwenden.

Bei sehr heißem Raum darf `kein Schlafsack` die klare Hauptempfehlung sein.

### 13.6 Dynamischer Schlafsacktausch

Beim Wechsel des Schlafsacks:

1. gewählten TOG für die aktuelle Empfehlung locken,
2. Ziel-Wärmegewicht des Temperaturbands bestimmen,
3. Unterkleidung neu auswählen,
4. möglichst wenige Teile ändern,
5. Nackentest-Hinweis behalten.

Beispiel bei 18–20 °C:

- Hauptset: `2.5 TOG + Kurzarmbody`,
- Nutzer wählt `1.0 TOG`,
- Engine ergänzt entsprechend mehr körpernahe Schlafkleidung statt loser Bettware.

### 13.7 `wärmer` / `dünner` im Schlafmodus

Die Schnellkorrektur verändert das interne Zielgewicht um ungefähr `+1` bzw. `-1`, bevorzugt durch Austausch **eines** Elements. Sicherheitsregeln bleiben unverändert.

## 14. Austausch- und Rebalancingregeln

### 14.1 Slots

Empfehlungen bestehen aus semantischen Slots, z. B.:

- `base_torso`,
- `legs`,
- `mid`,
- `outer`,
- `feet`,
- `head`,
- `hands`,
- `footwear`,
- `stroller_thermal_accessory`,
- `stroller_weather_accessory`,
- `sleep_bag`,
- `sleep_underlayer`.

### 14.2 Alternative wählen

Beim Tap auf ein Teil:

1. Alternativen aus demselben/kompatiblen Slot ermitteln,
2. `equivalent` zuerst,
3. danach `warmer`,
4. danach `cooler`,
5. Wahl locken,
6. gesamte Empfehlung neu berechnen.

### 14.3 Rebalancing

Die Engine verändert zuerst den kleinstmöglichen anderen Slot.

Beispiele:

- dünner Pullover → Fleece: Outer kann leichter/optional werden,
- warmer Fußsack → leichte Decke: Körperoutfit wird wärmer,
- Regenverdeck → kein Regenverdeck bei Regen: Regenjacke wird erforderlich,
- 2.5 TOG → 1.0 TOG: Schlaf-Unterkleidung wird wärmer.

### 14.4 Lock-Lebensdauer

Ein manueller Lock gilt nur für die aktuelle Recommendation-Session. Bei komplett neuem Wetter/Ort/Modus darf eine neue Empfehlung ohne alten Lock gestartet werden.

## 15. Nackentest

### `warm_dry`

- keine thermische Änderung.

### `hot_sweaty`

- `-1 thermalStep` bzw. nächstleichtere sinnvolle Kombination,
- funktionale Regen-/Wind-/UV-Schutzhülle erhalten und stattdessen darunter reduzieren.

### `cool`

- `+1 thermalStep` bzw. nächstwärmere sinnvolle Kombination,
- im Kinderwagen bevorzugt auch externe Isolation als Option,
- im Auto Gurtsicherheit erhalten.

Kalte Hände/Füße allein verändern die globale Wärmestufe nicht.

## 16. Wärmetendenz

- `runs_cool`: `+0.5 thermalStep`,
- `neutral`: `0`,
- `runs_warm`: `-0.5 thermalStep`.

V1 verwendet bewusst nur einen kleinen Bias. Er wird nicht automatisch gelernt.

## 17. Extremwetter-Hinweise

Produkt-Schwellen für zusätzliche Hinweise:

- `thermalReferenceC >=30 °C`: `EXTREME_HEAT_CAUTION`,
- Carrier oder direkte Sonne bei `>=28 °C`: ebenfalls Hitzhinweis,
- `thermalReferenceC <0 °C`: `EXTREME_COLD_CAUTION`,
- Wind `>=50 km/h` oder Böen `>=60 km/h`: `STRONG_WIND_CAUTION`.

Die Engine zeigt weiterhin ein Outfit, empfiehlt aber Exposition zu reduzieren/anzupassen und häufig zu kontrollieren. Keine garantierte Aufenthaltsdauer nennen.

## 18. Strukturierte Safety-/Reason-Codes

Mindestens:

- `CHECK_NECK`,
- `CAR_SEAT_NO_BULKY_LAYERS`,
- `CAR_SEAT_REMOVE_OUTER_BEFORE_HARNESS`,
- `CAR_SEAT_BLANKET_OVER_HARNESS_ONLY`,
- `CAR_SEAT_CONDITIONAL_LAYER_CHECK_FIT`,
- `CAR_CABIN_TEMPERATURE_ESTIMATED`,
- `SLEEP_NO_HAT`,
- `SLEEP_NO_LOOSE_BEDDING`,
- `SLEEP_NO_WEIGHTED_PRODUCTS`,
- `SLEEP_USE_ROOM_TEMPERATURE`,
- `SLEEP_GENERIC_TOG_ORIENTATION`,
- `STROLLER_DO_NOT_COVER_AIRFLOW`,
- `STROLLER_RAIN_COVER`,
- `STROLLER_SUNSHADE`,
- `INFANT_UNDER_12M_AVOID_DIRECT_SUN`,
- `AGE_UNKNOWN_DIRECT_SUN_CONSERVATIVE_RULE`,
- `UV_SHADE_AND_COVERAGE`,
- `WEATHER_DATA_INCOMPLETE`,
- `WEATHER_DATA_STALE`,
- `EXTREME_COLD_CAUTION`,
- `EXTREME_HEAT_CAUTION`,
- `STRONG_WIND_CAUTION`,
- `MANUAL_LOCK_OVERRIDDEN_FOR_SAFETY`.

## 19. Kalibrierungs-Invarianten für Tests

1. Kinderwagen setzt Aktivität nicht automatisch auf passiv.
2. Unter `20 °C` ist `strollerState: asleep` thermisch wärmer als `awake + active` bei identischem Wetter; ab `20 °C` erzeugt Schlafen allein keine zusätzliche Körperisolation.
3. Die UI bildet Kinderwagen genau auf `Schläft | Wach | Sehr aktiv` ab; `Ruhig` ist kein eigener Zustand.
4. Warmer Fußsack kann Körperkleidung ersetzen.
5. Austausch warmer Fußsack → leichte Decke muss Rebalancing auslösen.
6. Regenverdeck und Regenjacke werden im geschützten Kinderwagen nicht unnötig doppelt verlangt.
7. Sonnensegel/Sonnenschirm wird bei direkter Sonne im Kinderwagen bevorzugt.
8. Wind wird nicht thermisch doppelt gerechnet, wenn `apparentTempIncludes` Wind enthält.
9. Windschutz kann trotzdem trotz scheinbarer Temperatur verlangt werden.
10. `precipProbability <40` allein erzeugt kein Regenelement.
11. `precipProbability >=60` im relevanten Zeitraum erzeugt Regenschutz.
12. Trage reduziert Rumpfisolation, nicht automatisch Fuß-/Kopfschutz.
13. Jacke + Tragecover dürfen nicht unbegrenzt Wärmekredite stapeln.
14. Winteroverall ist nie `under_harness`.
15. `indoor` verwendet ausschließlich `roomTempC` und keine Wetterdaten.
16. `indoor` empfiehlt keine reinen Außenschutzslots wie Outer, Mütze, Handschuhe oder Schuhe allein aus der Temperaturbaseline.
17. `indoor + active` ist thermisch leichter als `indoor + normal`.
18. Schlaf nutzt nie Außentemperatur.
19. Alle fünf TOGs plus `none` sind austauschbar.
20. TOG-Tausch rebalanciert Unterkleidung.
21. Schlafmodus empfiehlt nie lose Bettware – auch bei `sleep_bag_none`.
22. `styleTheme` verändert keine Fachentscheidung.
23. Manueller Item-Lock bleibt in derselben Session erhalten.
24. Sicherheitsregel darf Lock überstimmen und muss einen strukturierten Grund liefern.
25. `wärmer` / `dünner` verändert möglichst wenig Teile.
26. Nackentest lernt in V1 keinen permanenten Bias.
27. Schuhe werden ohne Bodenkontakt nicht automatisch empfohlen.
28. `cabinTempSource: estimated` bedeutet in V1 exakt die neutrale 20-°C-Annahme und wird nicht aus Außenwetter abgeleitet.
29. `manual` und `measured` verwenden den angegebenen Innenraumwert ohne Schätzkennzeichnung.
30. Manuelle Änderung der Innenraumtemperatur setzt die Quelle auf `manual`; Zurückschalten auf `estimated` setzt wieder 20 °C.
31. Gurtsicherheitsregeln sind für `manual | measured | estimated` identisch und unabhängig von der Schätzhöhe.
32. Ein Baby unter drei vollendeten Monaten erhält bei thermischer Referenz `<28 °C` in Wachkleidungsmodi `+0.5 thermalStep`; ab drei Monaten entfällt dieser Altersaufschlag.
33. Unbekanntes Alter erzeugt keinen thermischen Altersaufschlag; die konservative direkte-Sonne-Regel bleibt davon unabhängig.
34. Schlafempfehlungen ändern sich durch den thermischen Altersfaktor nicht.
35. `mobilityStage` allein verändert keine thermische Stufe und keine fachliche Item-Auswahl bei identischen übrigen Inputs.
36. `walking + activity: normal` ist thermisch identisch zu `low_mobility + activity: normal`; eine leichtere Empfehlung entsteht erst durch `activity: active`.
37. `mobilityStage: walking` setzt weder `activity: active` noch `groundContact: walking` automatisch.
38. Ab `20 °C` erzeugt `strollerState: asleep` allein keine zusätzliche Körperisolation und keinen thermischen Fußsack.
39. `awake + active` darf im warmen Kinderwagen gegenüber `awake + normal` leichter ausfallen; bei `>=20 °C` beträgt die Zustandskorrektur `-0.5 thermalStep`, soweit eine leichtere Kombination existiert.
40. Eine vertrauenswürdige `apparentTempC` bleibt auch bei `windProtection: partial | good` thermische Referenz; V1 behandelt die gesamte Differenz zu `airTempC` nicht als Windanteil.
41. Kinderwagen-Windschutz reduziert nur einen separat berechneten thermischen Windmodifikator, wenn Wind nicht bereits in der vertrauenswürdigen `apparentTempC` enthalten ist.
42. Ab `24 °C` erzeugt eine automatische thermische Kinderwagen-Rebalance keine isolierende Mid-/Outer-Schicht; funktionale Wind-/Regenschutz-Shells bleiben zulässig.
43. Neue Outdoor-, Kinderwagen- und Trage-Kontexte starten mit `sunExposure: unknown`; neue Kinderwagen-Kontexte zusätzlich mit `windProtection: unknown`. Alte unversionierte `shade`-/`partial`-Defaults werden einmalig auf `unknown` migriert; danach bleiben ausdrücklich gewählte versionierte Werte erhalten.
