# Babywetter Repository Rules

Diese Regeln gelten für alle Coding-, Review-, Test- und CI-Arbeiten in diesem Repository.

## 1. Source of Truth

Bei Widersprüchen gilt in dieser Reihenfolge:

1. tatsächlicher aktueller Repository-Stand,
2. diese `AGENTS.md`,
3. `docs/AI_WORKFLOW.md`,
4. die für den Scope relevante aktuelle Fachdokumentation,
5. der konkrete aktuelle Arbeitsauftrag,
6. ältere Chats, Prompts, SHAs oder Projektchroniken nur als Kontext.

Maßgebliche Fachdokumente sind je nach Scope insbesondere:

- `docs/PRODUCT_CONCEPT.md` für Produkt- und Interaktionssemantik,
- `docs/OUTFIT_RULES.md` für Outfit-, Temperatur-, Situations- und Sicherheitslogik,
- `docs/DATA_CONTRACT.md` für Schnittstellen und persistente Datenformen,
- `docs/IMAGE_ASSET_GUIDELINES.md` für Generierung, technische Qualität und Sichtaudit von Kleidungs- und Zubehörbildern.

Fachdokumente nicht vorsorglich vollständig laden. Nur die für den Auftrag tatsächlich relevanten Dokumente und Abschnitte lesen.

## 2. Start eines Arbeitsstrangs

Zu Beginn genau einmal den tatsächlichen `remote/main` prüfen und dessen Commit-SHA als `BASE_SHA` des Arbeitsstrangs festhalten.

Danach:

1. diese `AGENTS.md` lesen,
2. `docs/AI_WORKFLOW.md` lesen,
3. nur die für den Scope relevanten Dateien und Fachdokumente lesen,
4. auf Basis von `BASE_SHA` weiterarbeiten.

Ein zwischenzeitlich fortgeschrittener `main` ist allein kein Grund für erneutes Synchronisieren, Rebase, Merge oder Wiederholen bereits grüner Tests.

Erst genau einmal vor finalem Review bzw. Merge den aktuellen `main` erneut prüfen. Nur bei relevanter Überschneidung oder Merge-Konflikt integrieren und danach nur die dadurch betroffenen Tests erneut ausführen. Details stehen in `docs/AI_WORKFLOW.md`.

## 3. Technische Grenzen

Die Zielarchitektur bleibt:

- statische mobile-first HTML/CSS/Vanilla-JS-App,
- Cloudflare Workers Static Assets über `wrangler.jsonc`,
- Projekt-Root als Assets-Verzeichnis,
- `wrangler dev` / `wrangler deploy`,
- Node-Tests plus Playwright-Browsertests,
- `localStorage` für lokale Einstellungen,
- JSON-Export/-Import,
- keine Datenbank und keine Anmeldung in V1.

Wetterdatenbeschaffung, Outfit-Engine und UI bleiben getrennt. Die reine Outfit-Engine hat keine DOM-Zugriffe und keine direkten Wetter-API-Aufrufe. `docs/DATA_CONTRACT.md` ist die Schnittstelle zwischen Wetterdaten und Fachlogik.

Produkt-, Thermo- und Sicherheitslogik niemals im Rahmen reiner Workflow-/CI-Arbeit verändern.

## 4. Scope und Entscheidungen

Klar entschiedene technische Arbeiten direkt umsetzen. Keine zusätzliche Freigabeschleife für:

- freigegebene UI-Fixes,
- klar definierte Regressionen,
- Workflow-/CI-/Dokumentationspflege,
- rein technische Umsetzung bereits entschiedener Produktsemantik.

Neue fachliche Freigabe ist erforderlich, wenn neue Produktsemantik entsteht, insbesondere neue Outfit-, Temperatur-, Wind-, UV-, Safety- oder noch nicht entschiedene UX-Regeln.

Technisch eng zusammenhängende Änderungen dürfen in einem Arbeitsstrang gebündelt werden. Eine fachliche Freigabe für eine Änderung gilt niemals automatisch für weitere Änderungen.

## 5. Tests

Die verbindliche scope-basierte Testmatrix steht in `docs/AI_WORKFLOW.md`.

Grundsatz:

`kleinster betroffener Test -> erforderlicher Bereichs-Gate -> Full-Gate nur bei echtem Querschnitt`

Vor Pushes mit Code-, Test- oder Konfigurationsänderungen lokal zuerst den direkt betroffenen Test und anschließend nur die laut Testmatrix erforderlichen zusätzlichen Gates ausführen. Verfügbare lokale Tests nicht mit dem Hinweis auf CI überspringen.

Wenn ein Test lokal technisch nicht möglich ist, das ausdrücklich dokumentieren und den CI-Lauf nach dem Push tatsächlich prüfen.

Nie behaupten, ein Test oder CI sei erfolgreich gewesen, wenn er nicht tatsächlich ausgeführt bzw. geprüft wurde.

## 6. Browser-Tests

- Keine festen Wartezeiten wie `waitForTimeout(...)` als Standard-Stabilisierung.
- Auf beobachtbare Zustände warten: Element, Text, DOM-Zustand, Request/Response, Event, aktivierter Zustand oder abgeschlossene Transition.
- CI-Parallelität bewusst begrenzen; für Diagnose darf seriell mit `--workers=1` ausgeführt werden.
- Failure-Artefakte wie Trace, Screenshot und HTML-Report erhalten.

## 7. Git, Branches und Pull Requests

- Nur in `kovacicjaqueline-lang/chester-babywetter-app-public` arbeiten.
- Für unabhängige Arbeitsstränge getrennte Branches verwenden; Arbeiten an denselben Komponenten möglichst bündeln.
- Fremde Branch-Änderungen nicht ungefragt übernehmen.
- Einen laufenden Branch nicht nur wegen eines neueren `main` rebasen oder mergen.
- Wenn ein echter lokaler Worktree verfügbar ist, Änderungen, Tests und lokale Commits dort durchführen.
- Remote-Aktionen wie Push/Ref-Update, Branch-/PR-Abgleich, PR-Erstellung und CI-Status bevorzugt über den authentifizierten GitHub-Connector ausführen, sobald lokale GitHub-Authentifizierung nicht nachweislich funktioniert oder der Connector ausdrücklich verlangt wurde.
- Kein direktes `git push` nur als Authentifizierungsprobe versuchen. Ist die lokale Remote-Authentifizierung in der aktuellen Umgebung nicht bereits verifiziert, direkt den GitHub-Connector verwenden statt einen erwartbar fehlschlagenden Push vorzuschalten.
- Direktes `git push` nur verwenden, wenn die lokale Remote-Authentifizierung in der aktuellen Umgebung tatsächlich verfügbar ist.
- Innerhalb eines beauftragten Branches dürfen Scope-Dateien geändert, gestaged, committet und gepusht sowie ein Draft-PR gegen `main` erstellt oder aktualisiert werden.
- Nicht ohne ausdrückliche Freigabe mergen oder Auto-Merge aktivieren.

Ein abgeschlossener Arbeitsstrang nennt kurz:

- `BASE_SHA`,
- Branch,
- Änderungen,
- tatsächlich ausgeführte Tests,
- Commit-SHA,
- Draft-PR,
- geprüften CI-Status,
- offene Abhängigkeiten.

## 8. Effiziente AI-Arbeit

- Klar spezifizierte technische Aufträge in einem Arbeitsdurchgang bearbeiten.
- Wenn Analyse und Umsetzung ausdrücklich gemeinsam beauftragt sind, keine zusätzliche Freigabeschleife dazwischen einfügen.
- Nur die für den Scope relevanten Dateien, Dokumente und Tests lesen; bereits geprüfte unveränderte Inhalte nicht ohne Anlass erneut analysieren.
- Eng zusammenhängende Änderungen bündeln, statt für jeden kleinen Teilauftrag einen eigenen Branch, PR und Full-Gate zu erzeugen.
- Vor dem Abschluss in derselben Arbeitsrunde den kleinstmöglichen relevanten Test, das erforderliche Gate, das Diff-Selbstreview sowie Commit und Draft-PR erledigen.
- „Weiter“ bedeutet, im bestehenden Scope fortzufahren; den Auftrag nicht ohne neue Information neu planen.
- Dauerhafte fachliche Entscheidungen im kompakten Register `docs/AI_DECISIONS.md` nachschlagen. Die dortigen Verweise auf die maßgeblichen Fachdokumente bleiben bindend; das Register darf keine abweichende Zweitregel definieren.
- Für einen Chatwechsel `docs/AI_HANDOFF_TEMPLATE.md` verwenden. Flüchtiger Branch-/PR-Status gehört in die Übergabe oder PR-Beschreibung, nicht in `AGENTS.md`.
- Unnötige Fortschritts- und Wiederholungsberichte vermeiden. Der Abschlussbericht enthält die tatsächlich ausgeführten Arbeiten, Tests, Commit-/PR-Daten und offenen Punkte.
