import { planDayTrip } from '../src/day-trip-planner.js';
import { formatPrecipitation, formatTemperature } from './weather-copy.js';

const MODE_COPY = Object.freeze({
  outdoor: { label: 'Draußen' },
  stroller: { label: 'Kinderwagen' },
  carrier: { label: 'Trage' },
  car: { label: 'Autositz' },
  indoor: { label: 'Drinnen' },
  sleep: { label: 'Schlafen' }
});

const MODE_ICON_MARKUP = Object.freeze({
  outdoor: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"></path>',
  stroller: '<path d="M5 5h2l2.3 10.5h8.9l2-7H8.1"></path><circle cx="10.5" cy="19" r="1.4"></circle><circle cx="17.5" cy="19" r="1.4"></circle>',
  carrier: '<path d="M7 8a5 5 0 0 1 10 0"></path><path d="M5 21c0-4.4 3.1-7.5 7-7.5s7 3.1 7 7.5"></path><path d="M9 9.5h6"></path>',
  car: '<path d="M5 16l1.7-5h10.6l1.7 5"></path><path d="M4 16h16v4H4z"></path><path d="M7 16v2M17 16v2"></path><circle cx="7" cy="20" r="1"></circle><circle cx="17" cy="20" r="1"></circle>',
  indoor: '<path d="M4 10.5L12 4l8 6.5V20H4z"></path><path d="M9 20v-5h6v5"></path>',
  sleep: '<path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.8 7.8 0 1 0 10 10z"></path>'
});

function createModeIcon(mode) {
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.classList.add('trip-mode-icon');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('focusable', 'false');
  icon.innerHTML = MODE_ICON_MARKUP[mode] ?? '';
  return icon;
}

const NOTICE_COPY = Object.freeze({
  CHECK_NECK: ['Nackentest', 'Nacken warm und trocken: passend. Heiß/schwitzig: Schicht reduzieren. Kühl: Schicht ergänzen.'],
  CAR_SEAT_NO_BULKY_LAYERS: ['Autositz: keine dicken Schichten unter dem Gurt', 'Keine voluminöse Jacke und keinen Winteroverall unter dem Autositzgurt verwenden.'],
  CAR_SEAT_BLANKET_OVER_HARNESS_ONLY: ['Zusätzliche Wärme nur über dem Gurt', 'Decke oder Überwurf nur über dem bereits korrekt geschlossenen Gurt verwenden.'],
  CAR_SEAT_REMOVE_COVER_WHEN_WARM: ['Im warmen Auto wieder entfernen', 'Decke oder Überwurf entfernen, sobald der Innenraum warm wird.'],
  CAR_SEAT_CONDITIONAL_LAYER_CHECK_FIT: ['Gurtpassform prüfen', 'Bei dieser dünnen Schicht prüfen, ob der Gurt weiterhin korrekt eng anliegt.'],
  STROLLER_DO_NOT_COVER_AIRFLOW: ['Kinderwagen nicht luftdicht abdecken', 'Sonnen- oder Regenschutz so verwenden, dass die Luftzirkulation erhalten bleibt.'],
  STROLLER_RAIN_COVER: ['Regenverdeck verwenden', 'Das Regenverdeck schützt im Kinderwagen vor Nässe; auf Luftzirkulation achten.'],
  STROLLER_SUNSHADE: ['Sonnenschutz am Kinderwagen', 'Sonnensegel oder Sonnenschirm verwenden, nicht mit einer Decke abdecken.'],
  INFANT_UNDER_12M_AVOID_DIRECT_SUN: ['Direkte Sonne vermeiden', 'Bei Babys unter 12 Monaten Schatten priorisieren.'],
  AGE_UNKNOWN_DIRECT_SUN_CONSERVATIVE_RULE: ['Schatten priorisieren', 'Ohne Altersangabe wird bei direkter Sonne vorsichtig wie unter 12 Monaten empfohlen.'],
  UV_SHADE_AND_COVERAGE: ['UV-Schutz einplanen', 'Schatten, Sonnenhut und leichte hautbedeckende Kleidung berücksichtigen.'],
  SLEEP_NO_HAT: ['Beim Schlafen keine Mütze', 'Beim Schlafen in Innenräumen bleibt der Kopf frei.'],
  SLEEP_NO_LOOSE_BEDDING: ['Keine lose Bettware', 'Im Schlafbereich keine lose Decke oder andere lose Bettware verwenden.'],
  SLEEP_NO_WEIGHTED_PRODUCTS: ['Keine gewichteten Schlafprodukte', 'Keine beschwerten Schlafsäcke oder Decken verwenden.'],
  SLEEP_USE_ROOM_TEMPERATURE: ['Raumtemperatur ist maßgeblich', 'Schlafempfehlungen werden ausschließlich aus der angegebenen Raumtemperatur und der TOG-Logik abgeleitet, nicht aus dem Außenwetter.'],
  SLEEP_GENERIC_TOG_ORIENTATION: ['TOG als Orientierung', 'Die TOG-Auswahl ist eine allgemeine Orientierung und ersetzt nicht den Nackentest.'],
  SLEEP_ROOM_BELOW_ORIENTATION_RANGE: ['Raumtemperatur unter 16 °C', 'Die Raumtemperatur liegt unter dem üblichen Orientierungsbereich. Nacken regelmäßig kontrollieren und die Schlafumgebung prüfen.'],
  WEATHER_DATA_STALE: ['Wetterdaten nicht aktuell', 'Der Plan verwendet sichtbar gekennzeichnete ältere Wetterdaten.'],
  WEATHER_DATA_INCOMPLETE: ['Prognose unvollständig', 'Fehlende Wetterwerte werden nicht als null Risiko interpretiert.'],
  EXTREME_COLD_CAUTION: ['Sehr kalt', 'Exposition begrenzen und den Nacken häufiger kontrollieren.'],
  EXTREME_HEAT_CAUTION: ['Sehr warm', 'Überhitzung vermeiden und den Nacken häufiger kontrollieren.'],
  STRONG_WIND_CAUTION: ['Starker Wind', 'Exponierte Bereiche windgeschützt halten und die Situation regelmäßig prüfen.']
});

const COVERAGE_COPY = Object.freeze({
  missing_thermal_forecast: 'Für diesen Startzeitpunkt fehlt eine belastbare Temperaturprognose.',
  forecast_gap: 'Die Prognose deckt den ganzen Ausflug noch nicht ab.',
  missing_room_temperature: 'Für einen Drinnen- oder Schlafabschnitt fehlt die Raumtemperatur.',
  invalid_segment: 'Die geplanten Abschnitte sind noch nicht vollständig gültig.',
  weather_unavailable: 'Für einen wetterabhängigen Abschnitt fehlen Wetterdaten.'
});

const PRIMARY_NEXT_MODE = Object.freeze({
  outdoor: 'stroller',
  stroller: 'outdoor',
  carrier: 'outdoor',
  car: 'outdoor',
  indoor: 'outdoor',
  sleep: 'outdoor'
});

function clone(value) {
  return structuredClone(value);
}

function parseTime(value) {
  const parsed = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatTime(value) {
  if (!value) return '–';
  return new Intl.DateTimeFormat('de-AT', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function weatherPoints(weather) {
  if (!weather || typeof weather !== 'object') return [];
  const byTime = new Map();
  for (const point of [weather.current, ...(Array.isArray(weather.hourly) ? weather.hourly : [])]) {
    if (!point || parseTime(point.time) === null || !finiteNumber(point.airTempC)) continue;
    if (!byTime.has(point.time)) byTime.set(point.time, clone(point));
  }
  return [...byTime.values()].sort((left, right) => parseTime(left.time) - parseTime(right.time));
}

function planningTimePoints(weather, requestedAt) {
  const requestedMs = parseTime(requestedAt) ?? Date.now();
  const nowTime = new Date(requestedMs).toISOString();
  const byTime = new Map([[nowTime, { time: nowTime, kind: 'now' }]]);
  for (const point of weatherPoints(weather)) {
    if (parseTime(point.time) > requestedMs) byTime.set(point.time, point);
  }
  if (byTime.size >= 2) return [...byTime.values()].sort((left, right) => parseTime(left.time) - parseTime(right.time));
  for (let index = 1; index <= 12; index += 1) {
    const time = new Date(requestedMs + index * 60 * 60 * 1000).toISOString();
    if (!byTime.has(time)) byTime.set(time, { time });
  }
  return [...byTime.values()].sort((left, right) => parseTime(left.time) - parseTime(right.time));
}

function contextForMode(snapshot, mode) {
  const stored = snapshot?.contexts?.[mode] ? clone(snapshot.contexts[mode]) : { mode };
  stored.mode = mode;
  delete stored.plannedMinutes;

  if (mode === 'outdoor') {
    stored.activity = stored.activity === 'active' ? 'active' : 'normal';
    stored.activitySource = 'user';
    stored.sunExposure = ['shade', 'partial', 'direct', 'unknown'].includes(stored.sunExposure) ? stored.sunExposure : 'shade';
    stored.groundContact = ['none', 'standing', 'walking'].includes(stored.groundContact) ? stored.groundContact : 'none';
  }
  if (mode === 'stroller') {
    stored.strollerState = stored.strollerState === 'asleep' ? 'asleep' : 'awake';
    stored.activity = stored.strollerState === 'asleep' ? 'normal' : stored.activity === 'active' ? 'active' : 'normal';
    stored.activitySource = 'user';
    stored.sunExposure = ['shade', 'partial', 'direct', 'unknown'].includes(stored.sunExposure) ? stored.sunExposure : 'shade';
    stored.windProtection = ['none', 'partial', 'good', 'unknown'].includes(stored.windProtection) ? stored.windProtection : 'partial';
  }
  if (mode === 'carrier') {
    stored.sunExposure = ['shade', 'partial', 'direct', 'unknown'].includes(stored.sunExposure) ? stored.sunExposure : 'shade';
    stored.placement = ['under_wearer_outerwear', 'over_wearer_outerwear'].includes(stored.placement)
      ? stored.placement
      : 'over_wearer_outerwear';
  }
  if (mode === 'car') {
    delete stored.cabinTempC;
    delete stored.cabinTempSource;
    delete stored.includeOutdoorTransition;
    delete stored.outsideTransitionMinutes;
  }
  if (mode === 'indoor') {
    stored.roomTempC = finiteNumber(stored.roomTempC) ? stored.roomTempC : null;
    stored.activity = stored.activity === 'active' ? 'active' : 'normal';
    stored.activitySource = 'user';
  }
  if (mode === 'sleep') stored.roomTempC = finiteNumber(stored.roomTempC) ? stored.roomTempC : null;
  return stored;
}

function initialDraft(snapshot) {
  const requestedAt = new Date().toISOString();
  const points = planningTimePoints(snapshot.weather, requestedAt);
  const startTime = points[0]?.time ?? null;
  const endTime = points[Math.min(points.length - 1, 5)]?.time ?? null;
  const mode = MODE_COPY[snapshot.mode] ? snapshot.mode : 'stroller';
  return {
    requestedAt,
    points,
    startTime,
    endTime,
    segments: startTime ? [{ segmentId: 'trip-segment-1', startTime, mode, context: contextForMode(snapshot, mode) }] : []
  };
}

function normalizeDraft(draft) {
  if (!draft.startTime || !draft.endTime || parseTime(draft.endTime) <= parseTime(draft.startTime)) return null;
  const ordered = draft.segments
    .filter((segment) => parseTime(segment.startTime) !== null)
    .filter((segment) => parseTime(segment.startTime) >= parseTime(draft.startTime) && parseTime(segment.startTime) < parseTime(draft.endTime))
    .sort((left, right) => parseTime(left.startTime) - parseTime(right.startTime));
  if (!ordered.length) return null;
  ordered[0].startTime = draft.startTime;
  const unique = ordered.filter((segment, index) => index === 0 || segment.startTime !== ordered[index - 1].startTime);
  return unique.map((segment, index) => ({
    segmentId: segment.segmentId,
    startTime: segment.startTime,
    endTime: unique[index + 1]?.startTime ?? draft.endTime,
    context: (() => {
      const context = clone(segment.context);
      delete context.plannedMinutes;
      return context;
    })()
  }));
}

function setHidden(element, hidden) {
  if (!element) return;
  element.hidden = hidden;
  element.style.display = hidden ? 'none' : '';
}

function makeOption(value, label, selected = false) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  option.selected = selected;
  return option;
}

function makeSelect(labelText, field, options, value) {
  const label = document.createElement('label');
  label.className = 'trip-field';
  const caption = document.createElement('span');
  caption.textContent = labelText;
  const select = document.createElement('select');
  select.dataset.tripContextField = field;
  for (const [optionValue, optionLabel] of options) select.append(makeOption(optionValue, optionLabel, optionValue === value));
  label.append(caption, select);
  return label;
}

function makeNumber(labelText, field, value, min, max, suffix) {
  const label = document.createElement('label');
  label.className = 'trip-field';
  const caption = document.createElement('span');
  caption.textContent = labelText;
  const row = document.createElement('span');
  row.className = 'trip-number-row';
  const input = document.createElement('input');
  input.type = 'number';
  input.inputMode = 'decimal';
  input.min = String(min);
  input.max = String(max);
  input.step = '0.5';
  input.value = value ?? '';
  input.dataset.tripContextField = field;
  const unit = document.createElement('span');
  unit.textContent = suffix;
  row.append(input, unit);
  label.append(caption, row);
  return label;
}

function makeChoiceGroup(labelText, field, options, value) {
  const group = document.createElement('div');
  group.className = 'trip-choice-field';
  const label = document.createElement('span');
  label.className = 'trip-choice-label';
  label.textContent = labelText;
  const buttons = document.createElement('div');
  buttons.className = 'trip-choice-buttons';
  buttons.setAttribute('role', 'group');
  buttons.setAttribute('aria-label', labelText);
  for (const [optionValue, optionLabel] of options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.tripContextChoice = field;
    button.dataset.tripContextValue = optionValue;
    button.className = optionValue === value ? 'is-selected' : '';
    button.setAttribute('aria-pressed', String(optionValue === value));
    button.textContent = optionLabel;
    buttons.append(button);
  }
  group.append(label, buttons);
  return group;
}

function appendContextFields(host, segment) {
  const context = segment.context;
  const mode = segment.mode;
  if (mode === 'outdoor') {
    host.append(
      makeChoiceGroup('Aktivität', 'activity', [['normal', 'Normal'], ['active', 'Sehr aktiv']], context.activity === 'active' ? 'active' : 'normal'),
      makeSelect('Sonne', 'sunExposure', [['shade', 'Schatten'], ['partial', 'Teilweise Sonne'], ['direct', 'Direkte Sonne'], ['unknown', 'Unbekannt']], context.sunExposure),
      makeSelect('Bodenkontakt', 'groundContact', [['none', 'Keiner'], ['standing', 'Steht'], ['walking', 'Läuft']], context.groundContact)
    );
  }
  if (mode === 'stroller') {
    const behavior = context.strollerState === 'asleep' ? 'asleep' : context.activity === 'active' ? 'very_active' : 'awake';
    host.append(
      makeChoiceGroup('Baby gerade', 'strollerBehavior', [['asleep', 'Schläft'], ['awake', 'Wach'], ['very_active', 'Sehr aktiv']], behavior),
      makeSelect('Sonne', 'sunExposure', [['shade', 'Schatten'], ['partial', 'Teilweise Sonne'], ['direct', 'Direkte Sonne'], ['unknown', 'Unbekannt']], context.sunExposure),
      makeSelect('Windschutz', 'windProtection', [['none', 'Keiner'], ['partial', 'Teilweise'], ['good', 'Gut'], ['unknown', 'Unbekannt']], context.windProtection)
    );
  }
  if (mode === 'carrier') {
    host.append(
      makeChoiceGroup('Position', 'placement', [['over_wearer_outerwear', 'Über Jacke'], ['under_wearer_outerwear', 'Unter Jacke']], context.placement),
      makeSelect('Sonne', 'sunExposure', [['shade', 'Schatten'], ['partial', 'Teilweise Sonne'], ['direct', 'Direkte Sonne'], ['unknown', 'Unbekannt']], context.sunExposure)
    );
  }
  if (mode === 'car') {
    const safety = document.createElement('div');
    safety.className = 'trip-inline-safety';
    safety.textContent = 'Autositz: aktuelles Außenwetter als Startpunkt. Keine voluminöse Jacke und keinen dicken Overall unter dem Gurt. Decke oder Überwurf nur über dem geschlossenen Gurt und entfernen, sobald das Auto warm wird.';
    host.append(safety);
  }
  if (mode === 'indoor') {
    host.append(
      makeNumber('Raumtemperatur', 'roomTempC', context.roomTempC, 5, 35, '°C'),
      makeChoiceGroup('Aktivität', 'activity', [['normal', 'Normal'], ['active', 'Sehr aktiv']], context.activity === 'active' ? 'active' : 'normal')
    );
  }
  if (mode === 'sleep') {
    const safety = document.createElement('div');
    safety.className = 'trip-inline-safety';
    safety.textContent = 'Schlafen: Raumtemperatur und TOG sind maßgeblich. Keine Mütze und keine lose Decke im Bett.';
    host.append(safety, makeNumber('Raumtemperatur', 'roomTempC', context.roomTempC, 5, 35, '°C'));
  }
}

function ensureStyles() {
  if (document.querySelector('#dayTripPlannerStyles')) return;
  const style = document.createElement('style');
  style.id = 'dayTripPlannerStyles';
  style.textContent = `
    .trip-entry-row{display:flex;justify-content:flex-end;margin:8px 0 2px}.trip-entry-button{min-height:44px;border:1px solid rgba(155,109,85,.24);border-radius:999px;background:#fff8f2;color:var(--accent);padding:0 16px;font-weight:800;box-shadow:0 3px 14px rgba(85,57,43,.06)}
    .trip-sheet{max-width:680px;max-height:min(92dvh,860px);overflow:auto;scroll-behavior:auto}.trip-sheet-header{position:sticky;top:0;z-index:3;background:rgba(255,250,246,.96);backdrop-filter:blur(10px)}.trip-sheet-header .eyebrow{margin:0 0 2px}.trip-sheet-header h2{margin:0}
    .trip-intro{margin:0 0 15px;color:var(--muted);line-height:1.4;max-width:42rem}.trip-builder-section{margin:0 0 16px}.trip-builder-section>h3,.trip-section-heading h3{margin:0;font-size:1rem}.trip-section-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:7px}.trip-section-note{margin:4px 0 10px;color:var(--muted);font-size:.82rem;line-height:1.4}
    .trip-time-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.trip-field{display:grid;gap:5px;color:var(--muted);font-size:.75rem;font-weight:700}.trip-field select,.trip-field input,.trip-segment-time{width:100%;min-height:44px;border:1px solid var(--line);border-radius:12px;background:#fff;color:var(--ink);padding:0 11px;font:inherit;font-size:.9rem}.trip-number-row{display:grid;grid-template-columns:1fr auto;align-items:center;border:1px solid var(--line);border-radius:12px;background:#fff;padding-right:10px}.trip-number-row input{border:0;min-width:0}.trip-number-row>span{font-size:.75rem;color:var(--muted)}
    .trip-segments{display:grid;gap:10px}.trip-segment-card{border:1px solid var(--line);border-radius:18px;background:rgba(255,255,255,.72);padding:12px}.trip-segment-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}.trip-segment-time-label{font-size:.8rem;font-weight:800;color:var(--accent)}.trip-segment-time{max-width:126px}.trip-remove-segment{min-height:44px;min-width:44px;border:0;background:transparent;color:var(--muted);font-size:1.2rem;border-radius:12px}.trip-mode-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.trip-mode-button{position:relative;min-height:52px;border:1px solid transparent;border-radius:13px;background:var(--surface-soft,#f6f0eb);color:var(--ink);padding:7px 5px;font-size:.875rem;font-weight:750;display:grid;place-items:center;gap:2px}.trip-mode-icon{width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.trip-mode-button.is-selected{border-color:rgba(155,109,85,.65);background:#fff7f1;color:var(--accent);box-shadow:0 0 0 2px rgba(155,109,85,.12)}.trip-mode-button.is-selected::after{content:'✓';position:absolute;top:5px;right:7px;font-size:.7rem;font-weight:900;line-height:1;color:var(--accent)}
    .trip-segment-details{margin-top:10px;border-top:0;padding-top:0}.trip-segment-details summary{min-height:44px;display:flex;align-items:center;cursor:pointer;color:var(--accent);font-size:.875rem;font-weight:800;border:1px solid var(--line);border-radius:12px;background:#fff;padding:0 11px;list-style:none}.trip-segment-details summary::-webkit-details-marker{display:none}.trip-segment-details summary::after{content:'⌄';margin-left:auto;font-size:1rem;line-height:1}.trip-segment-details[open] summary::after{content:'⌃'}.trip-context-fields{display:grid;gap:10px;padding:10px 0 2px}.trip-choice-field{display:grid;gap:5px}.trip-choice-label{font-size:.75rem;color:var(--muted);font-weight:700}.trip-choice-buttons{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:6px}.trip-choice-buttons button{min-height:44px;border:1px solid var(--line);border-radius:11px;background:#fff;color:var(--ink);font-size:.875rem;font-weight:700}.trip-choice-buttons button.is-selected{border-color:rgba(155,109,85,.5);background:#fff7f1;color:var(--accent)}.trip-check-field{min-height:44px;display:flex;align-items:center;gap:9px;font-size:.875rem;font-weight:700}.trip-check-field input{width:20px;height:20px}.trip-inline-safety{border-radius:13px;background:#fff3e5;padding:10px 12px;color:#6c4d32;font-size:.875rem;font-weight:700;line-height:1.4}
    .trip-add-button{min-height:44px;border:1px solid var(--line);border-radius:12px;background:#fff;color:var(--accent);padding:0 12px;font-weight:800}.trip-add-button:disabled{opacity:.66}.trip-generate{width:100%;min-height:52px}.trip-error{border-radius:14px;background:#fff0ed;color:#8a3d32;padding:11px 13px;margin-bottom:14px;font-size:.84rem;font-weight:700}.trip-error[hidden]{display:none!important}
    .trip-result-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:14px}.trip-result-head h3{margin:2px 0 0;font-size:1.1rem}.trip-status-pill{display:inline-flex;align-items:center;min-height:30px;border-radius:999px;background:#f3ece6;padding:0 10px;font-size:.75rem;font-weight:800}.trip-status-pill[data-status="partial"],.trip-status-pill[data-status="blocked"]{background:#fff0ed;color:#8a3d32}.trip-status-pill[data-status="ready_with_estimate"]{background:#fff4df;color:#74531e}
    .trip-safety-list{display:grid;gap:8px;margin:0 0 16px}.trip-safety-notice{border-left:4px solid #c77f4c;border-radius:12px;background:#fff6e9;padding:10px 12px}.trip-safety-notice strong{display:block;font-size:.875rem}.trip-safety-notice p{margin:3px 0 0;color:#6b574a;font-size:.75rem;line-height:1.4}.trip-safety-notice[data-severity="hard_rule"]{border-left-color:#b24b3d;background:#fff0ed}.trip-notice-summary{margin:0 0 18px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.62);overflow:hidden}.trip-notice-toggle{width:100%;min-height:48px;display:flex;align-items:center;gap:8px;border:0;background:transparent;color:var(--accent);padding:0 13px;text-align:left;font:inherit;font-size:.875rem;font-weight:800}.trip-notice-toggle::after{content:'⌄';margin-left:auto;font-size:1rem}.trip-notice-toggle[aria-expanded="true"]::after{content:'⌃'}.trip-notice-details{padding:0 10px 10px}.trip-notice-details[hidden]{display:none!important}.trip-notice-details .trip-safety-list{margin:0}.trip-notice-details .trip-safety-notice{background:#fff;border-left-color:#c9ad99}.trip-notice-details .trip-safety-notice[data-severity="caution"]{background:#fff6e9}
    .trip-result-section{margin:0 0 18px}.trip-result-section h4{margin:0 0 9px;font-size:.98rem}.trip-outfit-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(94px,1fr));gap:8px}.trip-item-card{min-width:0;border:1px solid var(--line);border-radius:15px;background:#fff;padding:8px;text-align:center}.trip-item-image{height:78px;display:grid;place-items:center;overflow:hidden}.trip-item-image img{max-width:100%;max-height:100%;object-fit:contain}.trip-item-card strong{display:block;margin-top:5px;font-size:.875rem;line-height:1.2}.trip-item-card small{display:block;margin-top:2px;color:var(--muted);font-size:.75rem}
    .trip-pack-list{display:grid;gap:7px}.trip-pack-item{display:grid;grid-template-columns:44px minmax(0,1fr);align-items:start;gap:10px;min-height:58px;border:1px solid var(--line);border-radius:14px;background:#fff;padding:7px 10px}.trip-pack-thumb{width:44px;height:44px;display:grid;place-items:center;overflow:hidden}.trip-pack-thumb img{max-width:100%;max-height:100%;object-fit:contain}.trip-pack-copy{min-width:0;padding:2px 0}.trip-pack-item strong{display:block;font-size:.875rem;line-height:1.25;overflow-wrap:anywhere;word-break:break-word}.trip-pack-item small{display:block;margin-top:3px;color:var(--muted);font-size:.75rem;line-height:1.25}.trip-empty{margin:0;border:1px dashed var(--line);border-radius:14px;padding:12px;color:var(--muted);font-size:.875rem}
    .trip-timeline{display:grid;gap:0;margin-left:8px}.trip-time-group{position:relative;border-left:2px solid var(--line);padding:0 0 14px 17px}.trip-time-group:last-child{padding-bottom:0}.trip-time-group::before{content:"";position:absolute;left:-6px;top:5px;width:10px;height:10px;border-radius:50%;background:#b58b72;border:2px solid #fff}.trip-time-group[data-has-safety="true"]::before{background:#b24b3d}.trip-time-group-head{display:flex;align-items:center;gap:7px;flex-wrap:wrap;min-height:24px}.trip-time-group-title{margin:0;color:var(--accent);font-size:.875rem;line-height:1.25}.trip-time-group-title time{font-weight:900}.trip-time-group-count{font-weight:700}.trip-time-group-list{display:grid;gap:7px;margin:8px 0 0;padding:0;list-style:none}.trip-action,.trip-segment-marker{position:relative;padding:0}.trip-segment-marker{color:var(--muted)}.trip-segment-marker strong{display:block;font-size:.875rem;color:var(--ink)}.trip-action-meta{display:flex;align-items:center;gap:7px;flex-wrap:wrap;color:var(--muted);font-size:.75rem}.trip-action strong{display:block;font-size:.875rem;line-height:1.3}.trip-action[data-safety-critical="true"] strong{color:#8a3d32}.trip-action-priority{display:inline-flex;align-items:center;width:max-content;border-radius:999px;background:#fff0ed;color:#8a3d32;padding:2px 7px;font-size:.75rem;font-weight:800}.trip-weather-chip{border-radius:999px;background:#f4eee9;padding:2px 7px}.trip-coverage{border-radius:13px;background:#fff4df;color:#74531e;padding:10px 12px;margin-bottom:14px;font-size:.875rem;font-weight:700}.trip-result-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:18px}.trip-result-actions button{min-height:48px}
    @media(max-width:430px){.trip-sheet{max-height:96dvh}.trip-time-grid{grid-template-columns:1fr 1fr}.trip-mode-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.trip-outfit-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.trip-result-actions{grid-template-columns:1fr}.trip-entry-row{justify-content:stretch}.trip-entry-button{width:100%}}
  `;
  document.head.append(style);
}

function ensureUi() {
  ensureStyles();
  let entry = document.querySelector('#dayTripPlannerButton');
  if (!entry) {
    const row = document.createElement('div');
    row.className = 'trip-entry-row';
    entry = document.createElement('button');
    entry.id = 'dayTripPlannerButton';
    entry.className = 'trip-entry-button';
    entry.type = 'button';
    entry.textContent = 'Tagesausflug planen';
    row.append(entry);
    document.querySelector('.hourly-card .section-heading')?.insertAdjacentElement('afterend', row);
  }

  let dialog = document.querySelector('#dayTripDialog');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'dayTripDialog';
    dialog.className = 'sheet-dialog';
    dialog.setAttribute('aria-labelledby', 'dayTripTitle');
    dialog.innerHTML = `
      <div class="sheet trip-sheet">
        <header class="sheet-header trip-sheet-header">
          <div><p class="eyebrow">Plan für unterwegs</p><h2 id="dayTripTitle">Tagesausflug planen</h2></div>
          <button class="icon-button" id="dayTripCloseButton" type="button" aria-label="Tagesausflug schließen">×</button>
        </header>
        <div id="tripBuilderView">
          <p class="trip-intro">Start und Ende festlegen. Eine weitere Situation brauchst du nur, wenn ihr später wechselt.</p>
          <div id="tripPlannerError" class="trip-error" role="status" hidden></div>
          <section class="trip-builder-section" aria-labelledby="tripTimeHeading">
            <h3 id="tripTimeHeading">Zeitraum</h3>
            <div class="trip-time-grid">
              <label class="trip-field"><span>Start</span><select id="tripStartTime" aria-label="Startzeit"></select></label>
              <label class="trip-field"><span>Ende</span><select id="tripEndTime" aria-label="Endzeit"></select></label>
            </div>
          </section>
          <section class="trip-builder-section" aria-labelledby="tripSegmentsHeading">
            <div class="trip-section-heading"><h3 id="tripSegmentsHeading">Situationen</h3><button id="tripAddSegmentButton" class="trip-add-button" type="button">+ Wechsel hinzufügen</button></div>
            <p id="tripSegmentsNote" class="trip-section-note">Pro Abschnitt eine Situation wählen. Weitere Abschnitte nur hinzufügen, wenn ihr später wechselt.</p>
            <div id="tripSegments" class="trip-segments"></div>
          </section>
          <button id="tripGenerateButton" class="primary-button trip-generate" type="button">Ausflug planen</button>
        </div>
        <div id="tripResultView" hidden>
          <div class="trip-result-head"><div><span id="tripResultStatus" class="trip-status-pill"></span><h3 id="tripResultTitle" tabindex="-1">Dein Tagesplan</h3></div><span id="tripResultRange" class="trip-segment-time-label"></span></div>
          <div id="tripSafetyNotices" class="trip-safety-list" aria-label="Sicherheitshinweise"></div>
          <section class="trip-result-section" aria-labelledby="tripStartOutfitHeading"><h4 id="tripStartOutfitHeading">Start-Outfit</h4><div id="tripStartOutfit" class="trip-outfit-grid" data-testid="trip-start-outfit"></div></section>
          <div id="tripCoverageNotice" class="trip-coverage" hidden></div>
          <div id="tripHintSummary" class="trip-notice-summary" hidden></div>
          <section class="trip-result-section" aria-labelledby="tripPackHeading"><h4 id="tripPackHeading">Mitnehmen</h4><div id="tripPackList" class="trip-pack-list" data-testid="trip-pack-list"></div></section>
          <section class="trip-result-section" aria-labelledby="tripTimelineHeading"><h4 id="tripTimelineHeading">Tagesverlauf</h4><div id="tripTimeline" class="trip-timeline" data-testid="trip-timeline"></div></section>
          <div class="trip-result-actions"><button id="tripEditButton" class="secondary-button" type="button">Plan bearbeiten</button><button id="tripDoneButton" class="primary-button" type="button">Fertig</button></div>
        </div>
      </div>`;
    document.body.append(dialog);
  }
  return { entry, dialog };
}

function itemLabel(assetStore, itemId) {
  if (!itemId) return 'Kleidungsstück';
  return assetStore.group(itemId)?.label ?? itemId.replaceAll('_', ' ');
}

function itemRole(slot) {
  const copy = {
    base_torso: 'Basisschicht', legs: 'Beine', mid: 'Zwischenschicht', outer: 'Außenschicht', feet: 'Füße', head: 'Kopf', hands: 'Hände',
    footwear: 'Schuhe', stroller_thermal_accessory: 'Kinderwagen', stroller_weather_accessory: 'Wetterschutz', carrier_accessory: 'Trage', car_thermal_accessory: 'Über dem Gurt', sleep_bag: 'Schlafsack', sleep_underlayer: 'Darunter'
  };
  return copy[slot] ?? 'Kleidungsstück';
}

function imageFor(assetStore, itemId, styleTheme, className) {
  const shell = document.createElement('div');
  shell.className = className;
  const asset = assetStore.resolve(itemId, styleTheme);
  if (!asset) return shell;
  const image = document.createElement('img');
  image.src = asset.src;
  image.alt = asset.alt || itemLabel(assetStore, itemId);
  image.loading = 'eager';
  image.decoding = 'async';
  shell.append(image);
  return shell;
}

function outfitItemCard(assetStore, styleTheme, item) {
  const card = document.createElement('article');
  card.className = 'trip-item-card';
  card.dataset.tripItemId = item.itemId;
  const label = document.createElement('strong');
  label.textContent = itemLabel(assetStore, item.itemId);
  const role = document.createElement('small');
  role.textContent = itemRole(item.slot);
  card.append(imageFor(assetStore, item.itemId, styleTheme, 'trip-item-image'), label, role);
  return card;
}

function packItemRow(assetStore, styleTheme, item) {
  const row = document.createElement('article');
  row.className = 'trip-pack-item';
  row.dataset.tripPackItem = item.itemId;
  const copy = document.createElement('div');
  copy.className = 'trip-pack-copy';
  const label = document.createElement('strong');
  label.textContent = itemLabel(assetStore, item.itemId);
  const meta = document.createElement('small');
  meta.textContent = `Ab ${formatTime(item.firstNeededAt)}`;
  copy.append(label, meta);
  row.append(imageFor(assetStore, item.itemId, styleTheme, 'trip-pack-thumb'), copy);
  return row;
}

function actionText(action, assetStore, segmentMode) {
  const from = itemLabel(assetStore, action.fromItemId);
  const to = itemLabel(assetStore, action.toItemId);
  if (action.kind === 'safety_instruction') {
    return segmentMode === 'car' ? 'Autositz-Sicherheitsregel beachten' : 'Sicherheitshinweis beachten';
  }
  if (action.kind === 'add') {
    if (action.toItemId === 'stroller_rain_cover') return 'Regenverdeck verwenden';
    if (action.toItemId === 'stroller_sunshade') return 'Sonnensegel / Sonnenschirm verwenden';
    if (action.toItemId?.startsWith('carrier_cover_')) return `${to} verwenden`;
    if (['car_blanket_over_harness','car_warm_blanket_over_harness'].includes(action.toItemId)) return 'Decke über dem geschlossenen Autositzgurt verwenden';
    return `${to} anziehen`;
  }
  if (action.kind === 'remove') {
    if (action.fromItemId === 'stroller_rain_cover') return 'Regenverdeck wieder entfernen';
    if (action.fromItemId === 'stroller_sunshade') return 'Sonnensegel / Sonnenschirm wieder entfernen';
    return `${from} ausziehen`;
  }
  if (action.kind === 'replace') return `${from} gegen ${to} tauschen`;
  if (action.kind === 'reposition') {
    if (action.toWearPosition === 'over_harness') return `${to} über dem geschlossenen Gurt verwenden`;
    return `${to} neu positionieren`;
  }
  return 'Outfit anpassen';
}

function weatherAt(snapshot, at) {
  return weatherPoints(snapshot.weather).find((point) => point.time === at) ?? null;
}

function noticeRow(notice) {
  const mapped = NOTICE_COPY[notice.code] ?? [notice.code.replaceAll('_', ' '), ''];
  const row = document.createElement('div');
  row.className = 'trip-safety-notice';
  row.dataset.tripNoticeCode = notice.code;
  row.dataset.severity = notice.severity ?? 'info';
  const title = document.createElement('strong');
  title.textContent = mapped[0];
  row.append(title);
  if (mapped[1]) {
    const text = document.createElement('p');
    text.textContent = mapped[1];
    row.append(text);
  }
  return row;
}

function renderNotices(result) {
  const hardHost = document.querySelector('#tripSafetyNotices');
  hardHost.replaceChildren();
  const notices = result.notices ?? [];
  const hardNotices = notices.filter((notice) => notice.severity === 'hard_rule');
  const otherNotices = notices.filter((notice) => notice.severity !== 'hard_rule');
  for (const notice of hardNotices) hardHost.append(noticeRow(notice));
  setHidden(hardHost, hardHost.children.length === 0);

  const summary = document.querySelector('#tripHintSummary');
  summary.replaceChildren();
  if (!otherNotices.length) {
    setHidden(summary, true);
    return;
  }

  const detailsId = 'tripHintDetails';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'trip-notice-toggle';
  toggle.id = 'tripHintToggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', detailsId);
  toggle.textContent = `${otherNotices.length} ${otherNotices.length === 1 ? 'Hinweis' : 'Hinweise'}`;

  const details = document.createElement('div');
  details.id = detailsId;
  details.className = 'trip-notice-details';
  details.hidden = true;
  details.setAttribute('role', 'region');
  details.setAttribute('aria-labelledby', toggle.id);
  const list = document.createElement('div');
  list.className = 'trip-safety-list';
  for (const notice of otherNotices) list.append(noticeRow(notice));
  details.append(list);

  const updateToggleLabel = (expanded) => {
    const action = expanded ? 'ausblenden' : 'anzeigen';
    toggle.setAttribute('aria-label', `${otherNotices.length} weitere ${otherNotices.length === 1 ? 'Hinweis' : 'Hinweise'} ${action}`);
  };
  updateToggleLabel(false);
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(expanded));
    details.hidden = !expanded;
    updateToggleLabel(expanded);
  });
  summary.append(toggle, details);
  setHidden(summary, false);
}

function renderCoverage(result) {
  const host = document.querySelector('#tripCoverageNotice');
  const issue = result.coverage?.issues?.[0] ?? null;
  if (!issue) {
    setHidden(host, true);
    return;
  }
  const copy = COVERAGE_COPY[issue.code] ?? 'Der Ausflug ist nur teilweise abgedeckt.';
  const covered = result.coverage?.coveredUntil ? ` Sicher geplant bis ${formatTime(result.coverage.coveredUntil)}.` : '';
  host.textContent = `${copy}${covered}`;
  setHidden(host, false);
}

function appendTimelineWeather(meta, snapshot, at) {
  const point = weatherAt(snapshot, at);
  if (!point) return;
  const weather = document.createElement('span');
  weather.className = 'trip-weather-chip';
  const precipitation = Number.isFinite(point.precipProbabilityPct) ? ` · ${formatPrecipitation(point)}` : '';
  weather.textContent = `${formatTemperature(point.airTempC)}${precipitation}`;
  meta.append(weather);
}

function timelineActionRow(action, assetStore, segmentModes) {
  const row = document.createElement('li');
  row.className = 'trip-action';
  row.dataset.tripAction = action.actionId;
  row.dataset.safetyCritical = String(Boolean(action.safetyCritical));
  if (action.safetyCritical) {
    const priority = document.createElement('span');
    priority.className = 'trip-action-priority';
    priority.textContent = 'Sicherheitsaktion';
    row.append(priority);
  }
  const text = document.createElement('strong');
  text.textContent = actionText(action, assetStore, segmentModes.get(action.segmentId));
  row.append(text);
  return row;
}

function timelineSegmentRow(segment) {
  const row = document.createElement('li');
  row.className = 'trip-segment-marker';
  row.dataset.tripSegmentMarker = segment.segmentId;
  const meta = document.createElement('div');
  meta.className = 'trip-action-meta';
  meta.textContent = 'Situationswechsel';
  const text = document.createElement('strong');
  text.textContent = `Situation: ${MODE_COPY[segment.mode]?.label ?? segment.mode}`;
  row.append(meta, text);
  return row;
}

function groupTimelineEntries(entries) {
  const groups = [];
  const byTime = new Map();
  entries.forEach((entry, index) => {
    const parsed = parseTime(entry.at);
    const key = parsed ?? entry.at;
    let group = byTime.get(key);
    if (!group) {
      group = { at: entry.at, entries: [] };
      byTime.set(key, group);
      groups.push(group);
    }
    group.entries.push({ ...entry, index });
  });
  return groups
    .sort((left, right) => parseTime(left.at) - parseTime(right.at))
    .map((group) => ({
      ...group,
      entries: group.entries.sort((left, right) => {
        const leftPriority = left.kind === 'action' && left.action.safetyCritical ? 0 : left.kind === 'action' ? 1 : 2;
        const rightPriority = right.kind === 'action' && right.action.safetyCritical ? 0 : right.kind === 'action' ? 1 : 2;
        return leftPriority - rightPriority || left.index - right.index;
      })
    }));
}

function timelineGroupRow(group, snapshot, assetStore, segmentModes, groupIndex) {
  const actions = group.entries.filter((entry) => entry.kind === 'action').map((entry) => entry.action);
  const hasSafety = actions.some((action) => action.safetyCritical);
  const row = document.createElement('section');
  row.className = 'trip-time-group';
  row.dataset.tripTimeGroup = group.at;
  row.dataset.tripActionCount = String(actions.length);
  row.dataset.hasSafety = String(hasSafety);
  const headingId = `trip-time-group-${groupIndex + 1}`;
  row.setAttribute('aria-labelledby', headingId);

  const header = document.createElement('div');
  header.className = 'trip-time-group-head';
  const heading = document.createElement('h5');
  heading.id = headingId;
  heading.className = 'trip-time-group-title';
  const time = document.createElement('time');
  time.dateTime = group.at;
  time.textContent = formatTime(group.at);
  heading.append(time, document.createTextNode(' – '));
  const count = document.createElement('span');
  count.className = 'trip-time-group-count';
  count.textContent = actions.length === 0
    ? 'Situationswechsel'
    : `${actions.length} ${actions.length === 1 ? 'Änderung' : 'Änderungen'}`;
  heading.append(count);
  header.append(heading);
  appendTimelineWeather(header, snapshot, group.at);
  row.append(header);

  const list = document.createElement('ol');
  list.className = 'trip-time-group-list';
  list.setAttribute('aria-label', actions.length
    ? `${actions.length} ${actions.length === 1 ? 'Änderung' : 'Änderungen'} um ${formatTime(group.at)}`
    : `Situationswechsel um ${formatTime(group.at)}`);
  for (const entry of group.entries) {
    list.append(entry.kind === 'segment'
      ? timelineSegmentRow(entry.segment)
      : timelineActionRow(entry.action, assetStore, segmentModes));
  }
  row.append(list);
  return row;
}

function renderResult(result, draft, snapshot, assetStore) {
  const status = document.querySelector('#tripResultStatus');
  const statusCopy = { ready: 'Plan bereit', ready_with_estimate: 'Mit Schätzung', partial: 'Teilweise geplant', blocked: 'Plan nicht möglich' };
  status.textContent = statusCopy[result.status] ?? 'Plan prüfen';
  status.dataset.status = result.status;
  document.querySelector('#tripResultRange').textContent = `${formatTime(draft.startTime)}–${formatTime(draft.endTime)}`;
  renderCoverage(result);
  renderNotices(result);

  const outfitHost = document.querySelector('#tripStartOutfit');
  outfitHost.replaceChildren();
  if (result.startOutfit?.items?.length) {
    for (const item of result.startOutfit.items) outfitHost.append(outfitItemCard(assetStore, snapshot.profile.paletteMode, item));
  } else {
    const empty = document.createElement('p');
    empty.className = 'trip-empty';
    empty.textContent = 'Für den Start fehlen noch Angaben. Es wird kein Outfit erfunden.';
    outfitHost.append(empty);
  }

  const packHost = document.querySelector('#tripPackList');
  packHost.replaceChildren();
  if (result.packList?.length) {
    for (const item of result.packList) packHost.append(packItemRow(assetStore, snapshot.profile.paletteMode, item));
  } else {
    const empty = document.createElement('p');
    empty.className = 'trip-empty';
    empty.textContent = result.startOutfit ? 'Nichts zusätzlich nötig.' : 'Noch keine belastbare Packliste.';
    packHost.append(empty);
  }

  const segmentModes = new Map(draft.segments.map((segment) => [segment.segmentId, segment.mode]));
  const timeline = document.querySelector('#tripTimeline');
  timeline.replaceChildren();
  const timelineEntries = [
    ...draft.segments.slice(1).map((segment) => ({ kind: 'segment', at: segment.startTime, segment })),
    ...(result.actions ?? []).map((action) => ({ kind: 'action', at: action.at, action }))
  ].sort((left, right) => parseTime(left.at) - parseTime(right.at)
    || (left.kind === 'segment' ? 0 : 1) - (right.kind === 'segment' ? 0 : 1));
  const timelineGroups = groupTimelineEntries(timelineEntries);
  if (timelineGroups.length) {
    timelineGroups.forEach((group, index) => timeline.append(timelineGroupRow(group, snapshot, assetStore, segmentModes, index)));
  } else {
    const empty = document.createElement('p');
    empty.className = 'trip-empty';
    empty.textContent = result.startOutfit ? 'Keine Wechsel nötig – das Start-Outfit passt für den abgedeckten Zeitraum.' : 'Noch kein Tagesverlauf verfügbar.';
    timeline.append(empty);
  }
}

function renderTimeControls(draft) {
  const start = document.querySelector('#tripStartTime');
  const end = document.querySelector('#tripEndTime');
  start.replaceChildren();
  end.replaceChildren();
  const points = draft.points;
  points.slice(0, -1).forEach((point, index) => start.append(makeOption(point.time, index === 0 ? `Jetzt · ${formatTime(point.time)}` : formatTime(point.time), point.time === draft.startTime)));
  points.filter((point) => parseTime(point.time) > parseTime(draft.startTime)).forEach((point) => end.append(makeOption(point.time, formatTime(point.time), point.time === draft.endTime)));
  start.disabled = points.length < 2;
  end.disabled = points.length < 2;
}

function availableInteriorTimes(draft, currentSegmentId = null) {
  const occupied = new Set(draft.segments.filter((segment) => segment.segmentId !== currentSegmentId).map((segment) => segment.startTime));
  return draft.points.filter((point) => parseTime(point.time) > parseTime(draft.startTime) && parseTime(point.time) < parseTime(draft.endTime) && !occupied.has(point.time));
}

function renderSegments(draft) {
  const host = document.querySelector('#tripSegments');
  host.replaceChildren();
  const ordered = [...draft.segments].sort((left, right) => parseTime(left.startTime) - parseTime(right.startTime));
  ordered.forEach((segment, index) => {
    const card = document.createElement('article');
    card.className = 'trip-segment-card';
    card.dataset.tripSegmentId = segment.segmentId;
    const top = document.createElement('div');
    top.className = 'trip-segment-top';
    if (index === 0) {
      const start = document.createElement('span');
      start.className = 'trip-segment-time-label';
      start.textContent = `Ab Start · ${formatTime(draft.startTime)}`;
      top.append(start);
    } else {
      const select = document.createElement('select');
      select.className = 'trip-segment-time';
      select.dataset.tripSegmentTime = segment.segmentId;
      select.setAttribute('aria-label', `Startzeit für Abschnitt ${index + 1}`);
      const options = [...availableInteriorTimes(draft, segment.segmentId), { time: segment.startTime }]
        .filter((point, optionIndex, array) => array.findIndex((candidate) => candidate.time === point.time) === optionIndex)
        .sort((left, right) => parseTime(left.time) - parseTime(right.time));
      for (const point of options) select.append(makeOption(point.time, `Ab ${formatTime(point.time)}`, point.time === segment.startTime));
      top.append(select);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'trip-remove-segment';
      remove.dataset.tripRemoveSegment = segment.segmentId;
      remove.setAttribute('aria-label', `Abschnitt ab ${formatTime(segment.startTime)} entfernen`);
      remove.textContent = '×';
      top.append(remove);
    }
    card.append(top);

    const modeGrid = document.createElement('div');
    modeGrid.className = 'trip-mode-grid';
    modeGrid.setAttribute('role', 'group');
    modeGrid.setAttribute('aria-label', `Situation für Abschnitt ${index + 1}`);
    for (const [mode, copy] of Object.entries(MODE_COPY)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `trip-mode-button${mode === segment.mode ? ' is-selected' : ''}`;
      button.dataset.tripSegmentMode = mode;
      button.dataset.tripSegmentId = segment.segmentId;
      button.setAttribute('aria-pressed', String(mode === segment.mode));
      const icon = createModeIcon(mode);
      const label = document.createElement('strong');
      label.textContent = copy.label;
      button.append(icon, label);
      modeGrid.append(button);
    }
    card.append(modeGrid);

    const details = document.createElement('details');
    details.className = 'trip-segment-details';
    const summary = document.createElement('summary');
    summary.textContent = 'Details anpassen';
    summary.setAttribute('aria-label', `Details für ${MODE_COPY[segment.mode].label} anpassen`);
    const fields = document.createElement('div');
    fields.className = 'trip-context-fields';
    appendContextFields(fields, segment);
    details.append(summary, fields);
    card.append(details);
    host.append(card);
  });
  document.querySelector('#tripAddSegmentButton').disabled = availableInteriorTimes(draft).length === 0;
}

function renderBuilder(draft) {
  renderTimeControls(draft);
  renderSegments(draft);
  const error = document.querySelector('#tripPlannerError');
  if (draft.points.length < 2) {
    error.textContent = 'Für einen Tagesausflug werden mindestens zwei nutzbare Planzeitpunkte benötigt.';
    setHidden(error, false);
    document.querySelector('#tripGenerateButton').disabled = true;
  } else {
    error.textContent = '';
    setHidden(error, true);
    document.querySelector('#tripGenerateButton').disabled = false;
  }
}

function showBuilder() {
  setHidden(document.querySelector('#tripBuilderView'), false);
  setHidden(document.querySelector('#tripResultView'), true);
}

function showResult() {
  setHidden(document.querySelector('#tripBuilderView'), true);
  setHidden(document.querySelector('#tripResultView'), false);
  requestAnimationFrame(() => document.querySelector('#tripResultTitle')?.focus());
}

function findSegment(draft, segmentId) {
  return draft.segments.find((segment) => segment.segmentId === segmentId) ?? null;
}

export function bindDayTripPlanner({ getSnapshot, assetStore, showToast = () => {} }) {
  if (typeof getSnapshot !== 'function' || !assetStore) return;
  const { entry, dialog } = ensureUi();
  if (entry.dataset.tripBound === 'true') return;
  entry.dataset.tripBound = 'true';

  let snapshot = null;
  let draft = null;
  let segmentSequence = 1;

  const resetTripScroll = () => {
    const sheet = dialog.querySelector('.trip-sheet');
    if (sheet) sheet.scrollTop = 0;
  };

  entry.addEventListener('click', () => {
    snapshot = getSnapshot();
    draft = initialDraft(snapshot);
    segmentSequence = 1;
    showBuilder();
    renderBuilder(draft);
    if (!dialog.open) dialog.showModal();
    resetTripScroll();
    requestAnimationFrame(() => document.querySelector('#dayTripCloseButton')?.focus({ preventScroll: true }));
  });

  document.querySelector('#dayTripCloseButton').addEventListener('click', () => dialog.close());
  document.querySelector('#tripDoneButton').addEventListener('click', () => dialog.close());
  document.querySelector('#tripEditButton').addEventListener('click', () => {
    showBuilder();
    resetTripScroll();
    requestAnimationFrame(() => document.querySelector('#dayTripCloseButton')?.focus({ preventScroll: true }));
  });

  document.querySelector('#tripStartTime').addEventListener('change', (event) => {
    if (!draft) return;
    draft.startTime = event.target.value;
    if (parseTime(draft.endTime) <= parseTime(draft.startTime)) draft.endTime = draft.points.at(-1)?.time ?? null;
    const first = [...draft.segments].sort((left, right) => parseTime(left.startTime) - parseTime(right.startTime))[0];
    draft.segments = draft.segments.filter((segment) => segment === first || (parseTime(segment.startTime) > parseTime(draft.startTime) && parseTime(segment.startTime) < parseTime(draft.endTime)));
    if (first) first.startTime = draft.startTime;
    renderBuilder(draft);
  });

  document.querySelector('#tripEndTime').addEventListener('change', (event) => {
    if (!draft) return;
    draft.endTime = event.target.value;
    draft.segments = draft.segments.filter((segment, index) => index === 0 || parseTime(segment.startTime) < parseTime(draft.endTime));
    renderBuilder(draft);
  });

  document.querySelector('#tripAddSegmentButton').addEventListener('click', () => {
    if (!draft || !snapshot) return;
    const candidates = availableInteriorTimes(draft);
    if (!candidates.length) return;
    const midpoint = (parseTime(draft.startTime) + parseTime(draft.endTime)) / 2;
    const point = candidates.find((candidate) => parseTime(candidate.time) >= midpoint) ?? candidates[0];
    const previous = [...draft.segments].sort((left, right) => parseTime(left.startTime) - parseTime(right.startTime)).at(-1);
    const mode = PRIMARY_NEXT_MODE[previous?.mode] ?? 'outdoor';
    segmentSequence += 1;
    draft.segments.push({ segmentId: `trip-segment-${segmentSequence}`, startTime: point.time, mode, context: contextForMode(snapshot, mode) });
    draft.segments.sort((left, right) => parseTime(left.startTime) - parseTime(right.startTime));
    renderSegments(draft);
  });

  document.querySelector('#tripSegments').addEventListener('click', (event) => {
    if (!draft || !snapshot) return;
    const remove = event.target.closest('[data-trip-remove-segment]');
    if (remove) {
      draft.segments = draft.segments.filter((segment) => segment.segmentId !== remove.dataset.tripRemoveSegment);
      renderSegments(draft);
      return;
    }
    const modeButton = event.target.closest('[data-trip-segment-mode]');
    if (modeButton) {
      const segment = findSegment(draft, modeButton.dataset.tripSegmentId);
      const mode = modeButton.dataset.tripSegmentMode;
      if (!segment || !MODE_COPY[mode]) return;
      segment.mode = mode;
      segment.context = contextForMode(snapshot, mode);
      renderSegments(draft);
      return;
    }
    const choice = event.target.closest('[data-trip-context-choice]');
    if (!choice) return;
    const card = choice.closest('[data-trip-segment-id]');
    const segment = findSegment(draft, card?.dataset.tripSegmentId);
    if (!segment) return;
    const field = choice.dataset.tripContextChoice;
    const value = choice.dataset.tripContextValue;
    if (field === 'strollerBehavior') {
      segment.context.strollerState = value === 'asleep' ? 'asleep' : 'awake';
      segment.context.activity = value === 'very_active' ? 'active' : 'normal';
      segment.context.activitySource = 'user';
    } else {
      segment.context[field] = value;
      if (field === 'activity') segment.context.activitySource = 'user';
    }
    renderSegments(draft);
  });

  document.querySelector('#tripSegments').addEventListener('change', (event) => {
    if (!draft) return;
    const timeSelect = event.target.closest('[data-trip-segment-time]');
    if (timeSelect) {
      const segment = findSegment(draft, timeSelect.dataset.tripSegmentTime);
      if (!segment) return;
      segment.startTime = timeSelect.value;
      draft.segments.sort((left, right) => parseTime(left.startTime) - parseTime(right.startTime));
      renderSegments(draft);
      return;
    }
    const fieldTarget = event.target.closest('[data-trip-context-field]');
    if (!fieldTarget) return;
    const card = fieldTarget.closest('[data-trip-segment-id]');
    const segment = findSegment(draft, card?.dataset.tripSegmentId);
    if (!segment) return;
    const field = fieldTarget.dataset.tripContextField;
    if (fieldTarget.type === 'checkbox') segment.context[field] = fieldTarget.checked;
    else if (fieldTarget.type === 'number') segment.context[field] = fieldTarget.value === '' ? null : Number(fieldTarget.value);
    else segment.context[field] = fieldTarget.value || null;
    if (field === 'activity') segment.context.activitySource = 'user';
    renderSegments(draft);
  });

  document.querySelector('#tripGenerateButton').addEventListener('click', () => {
    if (!draft || !snapshot) return;
    const normalizedSegments = normalizeDraft(draft);
    const error = document.querySelector('#tripPlannerError');
    if (!normalizedSegments) {
      error.textContent = 'Bitte Start, Ende und die Abschnitte prüfen.';
      setHidden(error, false);
      return;
    }
    try {
      const request = {
        requestId: `trip-ui:${Date.now()}`,
        requestedAt: draft.requestedAt,
        profile: clone(snapshot.profile),
        plan: {
          tripId: `trip-ui-plan:${Date.now()}`,
          startTime: draft.startTime,
          endTime: draft.endTime,
          segments: normalizedSegments
        },
        weather: snapshot.weather ? clone(snapshot.weather) : null
      };
      const result = planDayTrip(request);
      renderResult(result, draft, snapshot, assetStore);
      showResult();
    } catch {
      error.textContent = 'Der Tagesplan konnte nicht erzeugt werden. Bitte die Angaben prüfen.';
      setHidden(error, false);
      showToast('Tagesausflug konnte nicht geplant werden.');
    }
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}
