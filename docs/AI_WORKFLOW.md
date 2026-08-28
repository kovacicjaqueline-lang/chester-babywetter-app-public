# AI Workflow – Babywetter

Diese Datei ist die verbindliche Arbeits- und Testanleitung für Coding-Aufträge in diesem Repository. Sie ergänzt `AGENTS.md` und ist bewusst auf die kleine Vanilla-JS-/Node-/Playwright-Struktur dieser App zugeschnitten.

## 1. Arbeitsstrang starten

### 1.1 BASE_SHA genau einmal festlegen

Zu Beginn des Arbeitsstrangs:

```bash
git fetch origin main
BASE_SHA=$(git rev-parse origin/main)
```

`BASE_SHA` dokumentieren und während der normalen Umsetzung beibehalten.

Danach `AGENTS.md`, diese Datei und nur die für den Scope relevanten Dateien/Fachdokumente lesen. Nicht vorsorglich das gesamte Repository oder alle Fachdocs analysieren.

Der eingefrorene `BASE_SHA` beantwortet nur die Frage, was sich seit Beginn des Arbeitsstrangs auf `main` verändert hat und ob davon etwas für den eigenen Scope relevant ist. Er ist **nicht automatisch die Diffbasis für Scope-Prüfungen vor einem Push**. Dafür ist die tatsächliche PR-Basis bzw. der aktuelle relevante `main`-Ref maßgeblich; siehe Abschnitt 5.

### 1.2 Welche Fachdokumente sind relevant?

- Outfit-/Temperatur-/Situation-/Safety-Änderung: `docs/OUTFIT_RULES.md` und relevante Teile von `docs/DATA_CONTRACT.md`; bei Produktverhalten zusätzlich `docs/PRODUCT_CONCEPT.md`.
- Wetteradapter, Cache, manuelles Wetter oder Datenform: `docs/DATA_CONTRACT.md`; bei sichtbarer Produktsemantik zusätzlich `docs/PRODUCT_CONCEPT.md`.
- UI/Interaktion ohne neue Fachlogik: relevante Teile von `docs/PRODUCT_CONCEPT.md`; `OUTFIT_RULES` nur wenn die Darstellung fachliche Empfehlungen oder Safety berührt.
- Workflow/CI/reine Repository-Dokumentation: `AGENTS.md` und diese Datei; Fachdocs nur, wenn die Änderung Produktgrenzen berühren könnte.

## 2. Während der Umsetzung nicht permanent mit main synchronisieren

Ein neuer Commit auf `main` ist kein automatischer Handlungsbedarf.

Während der normalen Umsetzung nicht allein wegen paralleler Merges:

- `main` erneut prüfen,
- Branch aktualisieren,
- rebasen oder mergen,
- bereits grüne Tests wiederholen.

Der Arbeitsstrang bleibt auf seinem `BASE_SHA`, solange keine konkrete Integrationsnotwendigkeit besteht.

## 3. Genau ein Integrationscheck vor finalem Review/Merge

Vor finalem Review bzw. Merge den aktuellen `origin/main` genau einmal erneut prüfen und gegen `BASE_SHA` vergleichen.

Relevant sind Änderungen an:

- denselben Dateien,
- denselben Funktionen oder Modulen,
- gemeinsam verwendeten zentralen Utilities,
- denselben fachlichen Verträgen,
- derselben Test-, Runner- oder CI-Infrastruktur.

### Keine relevante Überschneidung

Branch unverändert lassen. Kein Rebase/Merge und keine erneuten Tests nur wegen eines neueren `main`.

### Relevante Überschneidung oder Merge-Konflikt

Nur dann auf den notwendigen Integrationsstand bringen. Anschließend nur die durch die Integration betroffenen Tests erneut ausführen.

## 4. Scope-basierte Testmatrix

Immer mit dem kleinsten direkt betroffenen Test beginnen. Danach nur den erforderlichen Bereichs-Gate ausführen.

| Änderungs-Scope | Direkt betroffener Test | Erforderlicher Bereichs-Gate | Zusätzlicher Gate nur wenn nötig |
| --- | --- | --- | --- |
| Nur Markdown/Fachdoku/README ohne ausführbaren Einfluss | keiner | keiner | keiner |
| `AGENTS.md`, `docs/AI_WORKFLOW.md`, CI-/Runner-Regeln | `npm run test:workflow` wenn ausführbare Workflow-/Runner-Dateien betroffen sind | keiner bei reiner Doku | `npm test` nur wenn Testentdeckung oder npm-Scripts geändert wurden |
| Repository-Guard / Pre-Push-Schutz | `npm run test:repository-guard` | `npm test`, wenn npm-Scripts oder Testentdeckung geändert wurden | `npm run test:workflow` nur bei zusätzlicher CI-/Runner-Änderung |
| einzelne Engine-/Utility-/Datenfunktion | passendes `node --test <testdatei>` | `npm test` | Browser nur bei sichtbarer Integration |
| Wetter-/Integration-/Import-Code | passende Datei unter `test/weather/` bzw. `test/integration/` | `npm test` | relevante Playwright-Spec bei UI-/Persistenzwirkung |
| Outfit-/Safety-/Schlaflogik | kleinstmöglicher Outfit-/TOG-Test | `npm test` | relevante Situations-Specs; bei breitem Verhalten `npm run test:browser` |
| UI-/Interaktionsänderung | betroffene `e2e/*.spec.js` | `npm run test:browser` | `npm test`, wenn gemeinsame Fach-/Datenmodule geändert wurden |
| Kleidungsmanifest/Asset-Auflösung | passende Manifest-/Asset-Unit-Tests | `npm test` | `e2e/catalog-quality.spec.js` bzw. betroffene Browser-Spec |
| `sw.js`, PWA-/Offline-Verhalten | passender statischer Test + `e2e/service-worker-upgrade.spec.js` | betroffener Browser-Gate | vollständiger Browser-Gate bei breiter Cache-Wirkung |
| `wrangler.jsonc`, `.assetsignore`, Deploy-Konfiguration | `node --test test/integration/static-config.test.js` | `npm run verify:deploy` | Browser nur wenn ausgelieferte Runtime-Assets betroffen sind |
| `.github/workflows/*`, `playwright.config.js`, Test-Scripts | `npm run test:workflow` | keiner zusätzlich, wenn nur CI/Runner betroffen | `npm test`/Browser/Deploy nur wenn deren ausführbare Konfiguration selbst funktional geändert wurde |
| Querschnitt, Release oder mehrere gekoppelte Bereiche | jeweils kleinste Tests zuerst | `npm test` + `npm run test:browser` + `npm run verify:deploy` | — |

Ein Full-Gate ist keine Standardreaktion auf kleine Änderungen.

## 5. Pre-Push-Regel und Scope-Sanity-Check

Vor einem Push mit Code-, Test- oder Konfigurationsänderungen:

1. kleinsten direkt betroffenen Test lokal ausführen,
2. nur die laut Matrix nötigen weiteren Gates ausführen,
3. den technischen Pre-Push-Guard mit der **tatsächlichen PR-Basis** ausführen,
4. erst dann pushen.

Beispiel:

```bash
npm run guard:pre-push -- \
  --base-ref origin/main \
  --allow package.json \
  --allow scripts/repository-guard.mjs \
  --allow test/repository-guard.test.js \
  --allow docs/AI_WORKFLOW.md
```

Der Guard blockiert mindestens:

- dirty/uncommitted Working Tree,
- untracked Dateien,
- PR-eigene Dateien außerhalb aller explizit über `--allow` freigegebenen Pfade bzw. `verzeichnis/**`-Präfixe,
- versehentlich erzeugte 0-Byte-Dateien.

Eine absichtlich leere Datei ist nur mit einer eigenen expliziten Ausnahme zulässig, zum Beispiel `--allow-empty docs/ABSICHTLICH_LEER.md`. `--allow-empty` ersetzt nicht die normale Scope-Freigabe über `--allow`.

### PR-Diffbasis ist nicht der Start-BASE_SHA

Für den Scope-Check darf der eingefrorene Start-`BASE_SHA` nicht automatisch als Diffbasis verwendet werden. Standard ist `origin/main`; bei einer anders basierten PR ist der entsprechende tatsächliche Base-Ref anzugeben.

Der Guard verwendet Triple-Dot-Semantik (`<base-ref>...HEAD`) und damit die Merge-Base der tatsächlichen PR-Basis. Beispiel:

1. Branch enthält eigene Änderung A.
2. `main` schreitet fort und erhält Änderung B.
3. B überlappt relevant und wird deshalb bewusst in den Branch integriert.
4. Der PR-Diff enthält weiterhin nur A.
5. Der Pre-Push-Guard bewertet ebenfalls nur A; ein Diff gegen den ursprünglichen Start-`BASE_SHA` wäre hier falsch, weil es A+B sehen würde.

CI soll deterministische Fehler bestätigen, nicht erstmals entdecken.

Ist ein lokaler Test technisch nicht möglich, muss im Arbeitsbericht stehen:

- welcher Test nicht lief,
- warum er lokal nicht möglich war,
- welcher CI-Job ihn stattdessen abdeckt.

Nach dem Push diesen CI-Job tatsächlich prüfen.

## 6. CI-Design dieser App

Die Standard-CI besteht aus drei voneinander unabhängigen Bereichen:

1. Node-Matrix,
2. Playwright-Browsertests auf Chromium,
3. Wrangler Deploy-Dry-Run.

Die Node-Matrix hat zwei klar getrennte Aufgaben:

- Node 22 führt die vollständige Unit-/Regression-Suite genau einmal aus.
- Node 24 führt nur `npm run check:node-compat` aus. Dieser leichte Kompatibilitätscheck prüft die Syntax der ausgelieferten JavaScript-Runtime-Dateien mit Node 24 und ist kein zweiter Unit-Gate.

Browser, Deploy und die Node-Matrix laufen parallel, weil sie keine erfolgreichen Ergebnisse voneinander als technische Vorbedingung benötigen.

Die vollständige Unit-Suite läuft pro CI-Lauf genau einmal. Ein zweiter Node-Major ist kein Grund, dieselbe Suite erneut auszuführen. Zusätzliche Runtime-Kompatibilitätschecks müssen einen eigenen, klar abgegrenzten Zweck haben und dürfen den Unit-Gate nicht duplizieren.

CI läuft für Pull Requests gegen `main` und nach Pushes auf `main`. Feature-Branch-Pushes mit offenem PR sollen nicht zusätzlich denselben Workflow doppelt auslösen.

PR-Metadatenaktionen wie Draft → Ready, Labels, Reviewstatus, CI-Abfragen oder Merge-Vorbereitung dürfen den Branch-HEAD nicht verändern und dadurch keinen neuen CI-Lauf erzeugen.

## 7. Playwright

Die Suite bleibt Playwright-nativ:

- Testdateien dürfen parallel über Worker laufen,
- Tests innerhalb einer Datei bleiben standardmäßig geordnet,
- CI verwendet bewusst höchstens zwei Worker,
- für Diagnose: `npm run test:browser -- --workers=1`,
- keine eigene Spezial-Sharding-Infrastruktur, solange die Suite klein bleibt.

Keine festen Wartezeiten mit `waitForTimeout(...)` als Stabilisierung. Stattdessen auf beobachtbare Zustände warten.

Failure-Artefakte bleiben aktiviert:

- Trace bei Fehler,
- Screenshot bei Fehler,
- HTML-Report,
- Upload von `test-results` und `playwright-report` auch bei fehlgeschlagenem Browserjob.

## 8. Rotes CI: Evidence first, fix second

Bei einem fehlgeschlagenen lokalen Test oder CI-Lauf nicht sofort Code ändern.

Zuerst:

1. fehlgeschlagenen Workflow-Run bestimmen,
2. fehlgeschlagenen Job bestimmen,
3. vollständiges Joblog lesen,
4. ersten tatsächlichen Fehler isolieren,
5. Folgefehler und Warnungen davon trennen,
6. mit dem kleinstmöglichen Test reproduzieren oder eingrenzen.

### Failure Packet

```text
SHA:
Run/Job/Test:
Erster echter Fehler:
Log-Evidenz:
Ursachenklasse: Produkt/Test | Infrastruktur/Umgebung | unbekannt
Hypothese:
Nächster Prüfschritt:
```

Erst danach den kleinsten durch Evidenz gestützten Fix durchführen und zuerst den kleinsten relevanten Test starten.

Keinen zweiten spekulativen Fix ohne neue Evidenz. Bei erneutem Fehler prüfen, ob dieselbe Fehlersignatur oder ein neuer Fehler vorliegt. Reines Rerun nur bei begründetem transienten oder Infrastrukturproblem.

Wenn Kontext oder Arbeitszeit knapp wird, haben Joblog und Failure Packet Vorrang vor einem weiteren spekulativen Patch.

## 9. Fast Path

Keine zusätzliche Plan-/Freigabeschleife, wenn fachliche Entscheidungen bereits getroffen sind und nur klar spezifizierte technische Umsetzung fehlt.

Direkt umsetzbar sind insbesondere:

- freigegebene UI-Fixes,
- klar beschriebene Regressionen,
- Workflow-/CI-/Dokumentationspflege,
- technische Umsetzung bereits beschlossener Darstellung.

Nicht ohne neue fachliche Freigabe einführen:

- neue Outfit-Regeln,
- neue Temperatur-/Wind-/UV-Semantik,
- neue Safety-Regeln,
- neue noch nicht entschiedene UX-Semantik.

## 10. Branches und Bündelung

Technisch eng zusammenhängende Änderungen gemeinsam bearbeiten. Nicht für jede kleine Änderung einen neuen Branch, PR und Full-Gate erzeugen.

Unabhängige Arbeiten dürfen parallel auf getrennten Branches laufen. Arbeiten an denselben Komponenten, Dateien oder derselben Kernlogik möglichst im selben Arbeitsstrang bündeln.

Fremde Branch-Änderungen nicht ungefragt übernehmen.

## 11. Finalisierung und Repository-Write-Lock

### Implementierungs-/Reparaturphase

In der Implementierungs-/Reparaturphase dürfen Repository-Inhalte innerhalb des beauftragten Scopes geändert, getestet, committet und gepusht werden.

### Finalisierungsphase

Sobald der finale inhaltliche Commit feststeht und nur noch Diff-/CI-Prüfung, Draft → Ready, Labels, Reviewstatus oder Merge-Vorbereitung anstehen, beginnt die Finalisierungsphase.

Vor diesen Metadatenaktionen bei sauberem Working Tree den finalen HEAD lokal sperren:

```bash
npm run workflow:finalize
```

Der Lock wird ausschließlich als Git-interne Arbeitsmetadatei gespeichert und gehört nicht zum Repository-Tree. Ab dann gilt ein Repository-Write-Lock:

- keine Datei-, Blob-, Tree-, Commit- oder Branch-Ref-Schreibaktion allein wegen einer PR-Metadatenaktion,
- Draft → Ready, CI-/Statusabfragen, Labels, Reviews und Merge-Vorbereitung sind metadata-only,
- der Branch-HEAD muss unverändert bleiben,
- `npm run guard:pre-push` blockiert einen Push, falls sich der gelockte HEAD dennoch geändert hat.

Eine PR-Metadatenaktion darf niemals allein einen neuen Commit, Push oder CI-Lauf verursachen.

Wenn nach Beginn der Finalisierungsphase ein tatsächlicher inhaltlicher Fix nötig wird, zuerst bewusst in die Reparaturphase zurückkehren:

```bash
npm run workflow:repair
```

Danach den Fix durchführen, die laut Matrix betroffenen Tests erneut ausführen, Diff erneut reviewen und erst mit dem neuen finalen HEAD wieder `npm run workflow:finalize` ausführen.

### Abschlussablauf

Vor Abschluss:

1. Scope-Diff prüfen,
2. genau einmal aktuellen `main` gegen `BASE_SHA` auf relevante Überschneidung prüfen,
3. nur bei relevanter Integration betroffene Tests wiederholen,
4. finalen inhaltlichen Commit erstellen,
5. diesen finalen HEAD mit `npm run workflow:finalize` sperren,
6. Pre-Push-Guard gegen die tatsächliche PR-Basis ausführen,
7. Branch pushen und Draft-PR gegen `main` erstellen oder aktualisieren,
8. tatsächliche CI-Ergebnisse am finalen Head-SHA prüfen,
9. ab jetzt nur noch metadata-only handeln; für einen inhaltlichen Fix zuerst `npm run workflow:repair`,
10. nicht mergen ohne ausdrückliche Freigabe.

Arbeitsbericht:

```text
BASE_SHA:
Branch:
Änderungen:
Tests:
Commit:
Draft-PR:
CI:
Offene Abhängigkeiten:
```
