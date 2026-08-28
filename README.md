# Babywetter

Mobile-first Baby-Kleidungs-App für konkrete Outfit-Empfehlungen anhand von Wetter, Aktivität und Situation.

Aktuelle App-Version: **0.2.0**

## Architektur

Die App ist statisch und verwendet HTML, CSS und Vanilla JavaScript. Die Bereiche bleiben getrennt:

- `src/weather/`: Standortsuche und Open-Meteo-Adapter,
- `src/integration/weather-series.js`: Adapter auf den aktuellen `DATA_CONTRACT`,
- `src/outfit-engine*.js`: reine Outfit- und Sicherheitslogik ohne DOM- oder Wetter-API-Zugriff,
- `assets/clothing/`: Kleidungsbilder und visuelle Manifest-Dateien,
- `ui/` und `app.js`: Darstellung, lokale Einstellungen und Interaktion.

Profil und Einstellungen werden lokal im Browser gespeichert. Es gibt in V1 keine Anmeldung und keine Datenbank.

## Repository-Workflow

Coding-Aufträge richten sich nach `AGENTS.md` und `docs/AI_WORKFLOW.md`. Dort sind BASE_SHA-Arbeitsweise, scope-basierte Testmatrix, Pre-Push-Regeln, CI-Fehlerdiagnose und der Integrationscheck vor finalem Review festgelegt.

## Voraussetzungen

- Node.js 22 oder neuer
- npm

## Lokal starten

```bash
npm install
npm run dev
```

Die App läuft dann standardmäßig unter `http://127.0.0.1:8788`.

Für einen deterministischen Browser-/UI-Demomodus ohne externe Wetteranfrage kann `?demo=1` angehängt werden. Der normale App-Aufruf verwendet Open-Meteo für Ortssuche und Wetterdaten.

## Tests

Unit- und Regressionstests:

```bash
npm test
```

Die CI verwendet Node.js 22 als kanonische Node-Laufzeit für die Unit-Suite.

Gezielter Workflow-/CI-Regressionscheck:

```bash
npm run test:workflow
```

Playwright-Browsertests:

```bash
npx playwright install chromium
npm run test:browser
```

Die Browser-Suite prüft unter anderem Start ohne Console-Fehler, Standard-Outfit, Kinderwagen/Trage/Autositz/Schlaf, echte Kleidungsbilder, Standortwechsel, Offline-Verhalten, Persistenz und das 375×812-Mobile-Layout. In CI laufen die Testdateien mit bewusst begrenzten zwei Workern; für Diagnose kann mit `npm run test:browser -- --workers=1` seriell ausgeführt werden.

## Deployment prüfen

Ohne öffentlich zu deployen:

```bash
npm run verify:deploy
```

Das führt `wrangler deploy --dry-run` aus.

## Cloudflare Workers Assets

`wrangler.jsonc` verwendet Workers Static Assets und das Projekt-Root als Assets-Verzeichnis. `.assetsignore` verhindert, dass Entwicklungs-, Workflow- und Testdateien als öffentliche Assets hochgeladen werden.

Lokal:

```bash
wrangler dev
```

Öffentlich deployen – nur bewusst ausführen:

```bash
npm run deploy
```

## PWA und Offline

`manifest.webmanifest` enthält die PWA-Metadaten. `sw.js` cached den App-Shell und bereits verwendete Kleidungsbilder. Wetterdaten selbst werden nicht vom Service Worker erfunden oder als externe API-Antwort gecached; bei Verbindungsproblemen kann die App einen vorhandenen lokalen Wetter-Cache sichtbar als veraltet weiterverwenden.

Ein eigenes App-Icon ist in dieser Integrationsstufe noch nicht enthalten.

## Sicherheit

Die App ist eine Entscheidungshilfe, keine medizinische Anwendung. Harte Sicherheitsregeln der Outfit-Engine haben Vorrang, insbesondere für Autositz und Schlaf. Der Nackentest bleibt als praktische Rückmeldung sichtbar.
