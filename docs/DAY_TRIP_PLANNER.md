# Tagesausflug-Planer – normative V1-Konzeption

Status: fachlich entschieden; Konzept- und Datenebene, noch keine große UI-/Runtime-Implementierung  
Scope: Planungs-/Vergleichsschicht oberhalb der bestehenden Outfit-Engine

Der Tagesausflug-Planer erzeugt **keine eigene Kleidungslogik**. Die bestehende Outfit-Engine bleibt allein zuständig für eine konkrete Empfehlung zu einem Zeitpunkt und in einer Situation. Der Planer orchestriert mehrere solcher Empfehlungen, vergleicht sie und verdichtet sie zu einem praktischen Plan.

## 1. Ergebnisprinzip

Ein Trip-Ergebnis besteht aus genau drei nutzerorientierten Ebenen:

1. **Start-Outfit** – konkrete Teile, mit denen das Baby zu Beginn losgeht.
2. **Mitnehmen** – möglichst wenige zusätzliche, später voraussichtlich benötigte Kleidungs-/Zubehörteile.
3. **Tagesverlauf / Wechselaktionen** – nur relevante Änderungen zum passenden Zeitpunkt.

Die internen Zeitpunktsempfehlungen sind fachliche Zwischenwerte. Sie werden nicht als vollständiges Stunden-Outfit-Raster zur primären Ausgabe.

## 2. Zeitbereich und Segmente

Ein Plan hat einen eindeutigen `startTime`- und `endTime`-Zeitpunkt mit `endTime > startTime`.

Ein normalisierter Plan deckt den gesamten Zeitraum lückenlos durch geordnete, nicht überlappende `TripSegment`s ab. Die UI darf dafür einfacher nur Situationswechsel erfassen, z. B.:

- 09:00 Kinderwagen,
- 11:00 draußen aktiv,
- 13:00 Autositz,
- 14:00 Kinderwagen,
- 18:00 Heimfahrt.

Die Integrationsschicht leitet daraus Segmentenden aus dem nächsten Wechsel bzw. aus `TripPlan.endTime` ab.

Wenn keine Wechsel erfasst werden, besteht der Plan aus genau einem Segment mit der gewählten Standardsituation.

## 3. Situationen

Jedes Segment verwendet einen bestehenden `SituationContext`, jedoch ohne einen vom Nutzer separat gepflegten `plannedMinutes`-Wert. Der Planzeitraum bzw. das jeweilige interne Auswertungsintervall ist die Zeitquelle.

Unverändert gelten insbesondere:

- `stroller`: `awake/asleep` und Aktivität bleiben getrennte Fachachsen; `asleep` hat die bestehende wärmere Kinderwagenlogik,
- `carrier`: Körperwärme und Platzierung zur Oberbekleidung bleiben wirksam,
- `car`: Gurtsicherheit hat Vorrang; voluminöse Jacke/Overall nie unter dem Gurt,
- `sleep`: nur bei ausdrücklich geplantem Schlafsegment; ausschließlich `roomTempC`/TOG-Logik, nie Außenwetter,
- Schlaf im Kinderwagen bleibt `strollerState: asleep` und wird **nicht** zu `sleep`,
- sämtliche bestehenden Safety-Regeln schlagen thermische und planerische Optimierung.

## 4. Interne Auswertungspunkte

Der Planer erzeugt intern `TripCheckpoint`s. Ein Checkpoint entsteht mindestens:

- am Trip-Start,
- an jedem Segmentstart,
- an jedem nutzbaren stündlichen Wetterpunkt innerhalb eines wetterabhängigen Segments.

Doppelte Zeitpunkte werden zusammengeführt. Der letzte Checkpoint endet bei `TripPlan.endTime`.

Für wetterabhängige Segmente muss ein Checkpoint auf einen realen nutzbaren Wetterpunkt auflösbar sein. Es werden keine Temperaturen interpoliert und keine Wetterzeitstempel erfunden oder umgeschrieben. Kann ein Segmentstart nicht ausreichend durch vorhandene Prognosedaten abgedeckt werden, wird die Abdeckung als unvollständig markiert statt stillschweigend zu extrapolieren.

`indoor` und `sleep` benötigen keinen Wetter-Checkpoint; ein Situationswechsel genügt, solange `roomTempC` vorhanden ist. `car/in_car` verwendet `cabinTempC`; nur eine optionale `outdoor_transition` ist wetterabhängig.

## 5. `plannedMinutes` im Planer

`plannedMinutes` ist im Tagesausflug-Modus **abgeleitet**, nicht zusätzlicher Nutzerinput.

Für jeden internen Engine-Request gilt:

- `plannedMinutes = Minuten vom aktuellen Checkpoint bis zum nächsten Checkpoint bzw. Segmentende`,
- bei `outdoor`, `stroller` und `carrier` wird dieser Wert in den vorhandenen SituationContext eingesetzt,
- bei `car` beschreibt er die Dauer des aktuellen Fahr-/Autosegments; `outsideTransitionMinutes` bleibt davon getrennt,
- `indoor` und `sleep` haben weiterhin kein `plannedMinutes`-Feld.

Damit bleibt die Bedeutung der bestehenden Engine erhalten: Wetterrisiken werden innerhalb des lokalen Auswertungsintervalls betrachtet, während der Planer spätere Intervalle separat auswertet.

## 6. Wetterfenster

Für jeden wetterabhängigen Checkpoint wird aus der unveränderten ursprünglichen `WeatherSeries` ein **nicht persistenter abgeleiteter Wetter-Slice** erstellt:

- `current` ist der für den Checkpoint verwendete reale `WeatherPoint`,
- `hourly` enthält nur relevante reale Punkte ab diesem Checkpoint bis vor den nächsten Planer-Checkpoint bzw. bis zum Segmentende,
- `weatherId`, Standort, Quelle, `fetchedAt`, `freshness` und alle echten Zeitstempel bleiben erhalten,
- die ursprüngliche `WeatherSeries` wird nicht mutiert.

So führt ein späterer Wetterwechsel nicht automatisch dazu, dass das Baby schon morgens die Kleidung für den ganzen Tag tragen soll. Stattdessen kann ein später benötigtes Teil in `Mitnehmen` erscheinen und erst zum relevanten Zeitpunkt angezogen werden.

Die bereits bestehende Semantik der auswählbaren Stundenprognose bleibt unverändert. Der Tagesplaner nutzt dasselbe Prinzip der abgeleiteten Wetterserie, verwaltet aber mehrere Checkpoints statt genau einer ausgewählten Startzeit.

## 7. Relevante Outfitwechsel

Zwei aufeinanderfolgende Checkpoints erzeugen nur dann eine sichtbare Wechselaktion, wenn der Nutzer praktisch etwas ändern muss.

Immer relevant sind:

- ein durch eine harte Safety-Regel erforderliches An-/Ausziehen, Entfernen oder Umpositionieren,
- Hinzufügen/Entfernen eines funktional erforderlichen Regen-, Wind- oder Sonnenschutzes,
- Hinzufügen/Entfernen einer thermisch relevanten Schicht,
- Austausch eines Teils, wenn das bisherige Teil für die neue Empfehlung nicht mehr als sichere und praktisch gleichwertige Alternative gilt,
- Änderung von `wearPosition`, wenn dadurch eine reale Handlung nötig wird, insbesondere beim Autositz.

Nicht als Outfitwechsel anzeigen:

- nur geänderte Reason-Codes oder Datenqualitätswerte,
- identische Item-Sets,
- reine Änderung der Engine-Hauptauswahl, wenn das bereits getragene Teil im neuen Ergebnis als `equivalent` zulässige Alternative weiterverwendet werden kann,
- kosmetische Style-/Asset-Variation ohne Änderung der fachlichen `itemId`.

Safety-Hinweise und Extremwetter-Hinweise können sichtbar bleiben, auch wenn kein Kleidungswechsel nötig ist.

## 8. Kontinuitäts- und Packlistenoptimierung

Der Planer darf aus den von der Engine gelieferten **gleichwertigen** Alternativen eine kontinuierlichere Variante auswählen. Er darf keine thermisch wärmere/kühlere Alternative nur zur Bequemlichkeit als gleichwertig behandeln.

Optimierungspriorität:

1. harte Safety-Regeln erfüllen,
2. erforderliche thermische sowie Wind-/Regen-/UV-Funktion erfüllen,
3. Zahl der **zusätzlichen unterschiedlichen** mitzunehmenden `itemId`s minimieren,
4. Zahl der realen Wechselaktionen minimieren,
5. bei Gleichstand die jeweilige Engine-Hauptauswahl bzw. die thermisch nächstliegende Alternative bevorzugen.

Dadurch darf z. B. ein bereits getragenes gleichwertiges Teil beibehalten werden, wenn die Engine am nächsten Checkpoint ein anderes, aber gleichwertiges Teil als Hauptauswahl nennt.

Der Planer verändert keine Kataloggewichte und erfindet keine neue Gleichwertigkeit. Grundlage sind ausschließlich Engine-Ausgabe, Alternativen, Safety und vorhandene Schutzfunktionen.

## 9. Packliste

`Mitnehmen` enthält nur Teile, die im optimierten Tagespfad später benötigt werden und **nicht bereits Teil des Start-Outfits bzw. der zu Beginn eingesetzten Situationsausrüstung** sind.

Regeln:

- ein Startteil wird nicht zusätzlich als Packteil dupliziert,
- wird ein Startteil später ausgezogen und danach wieder benötigt, bleibt es dasselbe mitgeführte Teil,
- ein später benötigtes Teil wird nur einmal gelistet, auch wenn es mehrfach an-/ausgezogen wird,
- eine einzelne geeignete Alternative wird bevorzugt, wenn sie mehrere spätere Anforderungen sicher und gleichwertig abdecken kann,
- redundant austauschbare Varianten werden nicht gleichzeitig eingepackt,
- situationsspezifisches Zubehör wie Regenverdeck oder Sonnensegel darf Packteil sein,
- Safety darf zusätzliche Teile erzwingen; Minimalpacken darf Safety nie umgehen.

Ohne Kleidungsinventar kann V1 keine Stückzahlverwaltung für identische Ersatzteile oder Verschmutzungsreserven leisten. Der Planer plant deshalb fachlich benötigte **unterschiedliche Items**, keine Reservewäsche.

## 10. Wetterwechsel

Wetterwechsel werden am ersten Checkpoint wirksam, dessen lokale Engine-Auswertung die neue thermische oder Schutzanforderung enthält.

Beispiele:

- wärmer → Fleece ausziehen, wenn die leichtere Empfehlung tatsächlich erforderlich wird,
- UV/Sonne → Sonnenhut/Sonnenschutz ergänzen,
- Regen → Regenjacke bzw. Kinderwagen-Regenverdeck verwenden,
- spätere Abkühlung → bereits mitgeführte Fleecejacke wieder anziehen.

Ein Wetterwechsel ohne praktische Outfitänderung erzeugt keine künstliche Aktion. Relevante Warn-/Safety-Hinweise bleiben davon unabhängig.

## 11. Fehlende oder unvollständige Prognosedaten

Der Planer extrapoliert Wetter nicht stillschweigend über nicht abgedeckte Zeiträume.

- Fehlt bereits für den Start eines wetterabhängigen Plans eine thermisch verwertbare Prognose, ist kein belastbares Start-Outfit möglich → `blocked`.
- Ist der Start auswertbar, aber ein späterer Zeitraum nicht ausreichend abgedeckt, wird der Plan `partial` und nennt den nicht abgedeckten Zeitraum.
- Bis zum letzten vollständig auswertbaren Checkpoint dürfen Start-Outfit, Packteile und Aktionen ausgegeben werden; für die Lücke werden keine erfundenen Wechsel erzeugt.
- Fehlende optionale Wetterfelder bleiben wie in der Einzel-Empfehlung `partial`/Unsicherheit und werden nie als `0` interpretiert.
- Ein kompletter Plan mit ausschließlich `ready_with_estimate`-Autosegmenten kann `ready_with_estimate` sein.

Ein später fehlender Forecast darf nicht durch einfaches Fortschreiben des letzten Outfits als scheinbar vollständiger Plan kaschiert werden.

## 12. Safety-Konflikte

Safety hat Vorrang vor Kontinuität und Packlistenminimalität.

Insbesondere:

- beim Wechsel in `car/in_car` muss eine verbotene voluminöse Schicht vor dem Anschnallen entfernt werden, auch wenn dadurch eine zusätzliche Wechselaktion entsteht,
- ein geeignetes Teil darf nur in einer für die Phase zulässigen `wearPosition` weiterverwendet werden,
- ein `sleep`-Segment darf niemals eine Mütze oder lose Bettware als Wärmeausgleich übernehmen,
- Kinderwagen-Sonnenschutz darf die Luftzirkulation nicht durch Deckenabdeckung ersetzen,
- Safety-Overrides werden als eigene relevante Aktion/Hinweis bis ins `TripResult` getragen.

## 13. Persistenz

Für die erste Planer-Implementierung gilt:

- aktiver `TripPlan`-Entwurf: flüchtiger Runtime-State,
- `TripResult`, Checkpoints, abgeleitete Wetter-Slices und Einzel-Empfehlungen: immer flüchtig, niemals als autoritative Empfehlung persistieren,
- kein Wetter-Snapshot im Trip speichern,
- keine Planer-Ergebnisse in den bestehenden V1-JSON-Export aufnehmen.

Eine spätere Funktion **„Ausflug speichern“** darf ausschließlich die nutzereigenen Planinputs (Zeitraum und Segmente) lokal speichern. Beim erneuten Öffnen muss mit aktuellem gültigem Wetter und der aktuellen Engine neu gerechnet werden. Gespeicherte Packlisten oder alte Safety-Ergebnisse dürfen nicht ungeprüft wiederverwendet werden.

Diese spätere Speicherfunktion ist nicht Teil des ersten Runtime-Scopes und erfordert vor Implementierung eine eigene Persistenz-/Exportentscheidung.

## 14. Abgrenzung zur Einzelzeit-Auswahl

Die normale stündliche Zeitwahl bleibt der schnelle Einzelfall:

- genau eine ausgewählte Startzeit,
- genau eine Situation,
- genau ein abgeleiteter Engine-Request,
- genau ein Hauptoutfit,
- `plannedMinutes` läuft ab dieser einen Startzeit,
- keine Packliste und keine Wechselaktionssequenz.

Der Tagesausflug-Planer dagegen hat:

- einen Zeitraum,
- optional mehrere Situationen,
- mehrere interne Engine-Requests,
- eine Vergleichs-/Optimierungsschicht,
- Start-Outfit + Mitnehmen + relevante Aktionen.

Die beiden Funktionen dürfen ihren flüchtigen Auswahlzustand nicht gegenseitig überschreiben. Gemeinsame reine Hilfslogik zur Ableitung einer `WeatherSeries` darf wiederverwendet werden.

## 15. Architekturgrenze

Empfohlene Schichten:

1. Wetteradapter liefert `WeatherSeries`.
2. Trip-Normalisierung bildet Zeitbereich und Segmente.
3. Trip-Checkpoint-Builder erzeugt lokale Auswertungsintervalle und abgeleitete Engine-Requests.
4. Bestehende Outfit-Engine erzeugt unabhängige `OutfitRecommendation`s.
5. Trip-Comparator/Optimizer bildet Kontinuität, Packliste und Wechselaktionen.
6. UI rendert ausschließlich das verdichtete `TripResult` und bei Bedarf Detailinformationen.

Der Comparator/Optimizer hat keine DOM-Zugriffe und keine direkten Wetter-API-Aufrufe. Die Outfit-Engine bleibt ebenfalls unverändert rein.