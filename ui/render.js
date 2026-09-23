import { formatPrecipitation, formatTemperature, formatTemperatureC, formatUvIndex, precipitationLabelFor } from './weather-copy.js';
import { isCompositeSleepVisualItem, visualPartsForItem } from './sleep-visual-parts.js';

const MODE_COPY = Object.freeze({
  outdoor: { label: 'Draußen', icon: '☀', short: 'Wetter + Aktivität' },
  stroller: { label: 'Kinderwagen', icon: '◌', short: 'Wach oder schlafend' },
  carrier: { label: 'Trage', icon: '♡', short: 'Körperwärme einrechnen' },
  car: { label: 'Autositz', icon: '◇', short: 'Gurtsicherheit zuerst' },
  sleep: { label: 'Schlafen', icon: '☾', short: 'Raumtemperatur + TOG' }
});

const NOTICE_COPY = Object.freeze({
  CHECK_NECK: ['Nackentest', 'Nacken warm und trocken: passend. Heiß/schwitzig: Schicht reduzieren. Kühl: Schicht ergänzen.'],
  CAR_SEAT_NO_BULKY_LAYERS: ['Autositz: keine dicke Kleidung unter dem Gurt', 'Keine voluminöse Jacke und keinen Winteroverall unter dem Gurt verwenden.'],
  CAR_SEAT_BLANKET_OVER_HARNESS_ONLY: ['Zusätzliche Wärme über dem Gurt', 'Decke oder Überwurf nur über dem bereits korrekt geschlossenen Gurt verwenden.'],
  CAR_SEAT_REMOVE_COVER_WHEN_WARM: ['Im warmen Auto wieder entfernen', 'Decke oder Überwurf entfernen, sobald der Innenraum warm wird.'],
  CAR_SEAT_CONDITIONAL_LAYER_CHECK_FIT: ['Gurtpassform prüfen', 'Bei dieser dünnen Schicht prüfen, ob der Gurt weiterhin korrekt eng anliegt.'],
  SLEEP_NO_HAT: ['Beim Schlafen keine Mütze', 'In Innenräumen bleibt der Kopf beim Schlafen frei.'],
  SLEEP_NO_LOOSE_BEDDING: ['Keine lose Bettware im Schlafbereich', 'Keine lose Decke oder andere lose Bettware verwenden – auch wenn kein Schlafsack gewählt ist. Zusätzliche Wärme nur über körpernahe Schlafkleidung oder einen passenden Schlafsack ausgleichen.'],
  SLEEP_NO_WEIGHTED_PRODUCTS: ['Keine gewichteten Schlafprodukte', 'Keine beschwerten Schlafsäcke oder Decken verwenden.'],
  SLEEP_USE_ROOM_TEMPERATURE: ['Raumtemperatur ist maßgeblich', 'Für Schlafempfehlungen wird die Raumtemperatur verwendet, nicht das Außenwetter.'],
  SLEEP_GENERIC_TOG_ORIENTATION: ['TOG als Orientierung', 'Die TOG-Auswahl ist eine generische Orientierung und ersetzt nicht den Nackentest.'],
  STROLLER_DO_NOT_COVER_AIRFLOW: ['Kinderwagen nicht abdecken', 'Keine Decke oder kein Mulltuch luftstromhemmend über den Wagen spannen.'],
  STROLLER_RAIN_COVER: ['Regenschutz am Kinderwagen', 'Das Regenverdeck schützt vor Nässe; auf ausreichende Luftzirkulation achten.'],
  STROLLER_SUNSHADE: ['Sonnenschutz am Kinderwagen', 'Sonnensegel oder Sonnenschirm nutzen und Luftzirkulation erhalten.'],
  INFANT_UNDER_12M_AVOID_DIRECT_SUN: ['Direkte Sonne vermeiden', 'Bei Babys unter 12 Monaten Schatten priorisieren und direkte Sonne möglichst vermeiden.'],
  AGE_UNKNOWN_DIRECT_SUN_CONSERVATIVE_RULE: ['Schatten priorisieren', 'Ohne Altersangabe wird bei direkter Sonne konservativ wie unter 12 Monaten empfohlen.'],
  UV_SHADE_AND_COVERAGE: ['UV-Schutz', 'Schatten, Sonnenhut und leichte hautbedeckende Kleidung einplanen.'],
  WEATHER_DATA_STALE: ['Wetterdaten nicht aktuell', 'Die Empfehlung verwendet sichtbar gekennzeichnete gespeicherte Wetterdaten.'],
  WEATHER_DATA_INCOMPLETE: ['Wetterdaten unvollständig', 'Fehlende Wetterwerte werden nicht als null Grad oder null Risiko interpretiert.'],
  EXTREME_COLD_CAUTION: ['Sehr kalt', 'Exposition begrenzen und den Nacken engmaschiger kontrollieren.'],
  EXTREME_HEAT_CAUTION: ['Sehr warm', 'Überhitzung vermeiden, leicht anziehen und den Nacken häufiger kontrollieren.'],
  STRONG_WIND_CAUTION: ['Starker Wind', 'Exponierte Bereiche windgeschützt halten und die Situation regelmäßig prüfen.'],
  MANUAL_LOCK_OVERRIDDEN_FOR_SAFETY: ['Auswahl aus Sicherheitsgründen geändert', 'Eine manuelle Auswahl wurde von einer Sicherheitsregel überstimmt.'],
  MANUAL_LOCK_LIMITS_WEATHER_PROTECTION: ['Wetterschutz eingeschränkt', 'Die manuell gewählte Kombination deckt die aktuelle Wetteranforderung nicht vollständig ab.'],
  RAIN_PROTECTION_OPTIONAL: ['Regenschutz optional', 'Regen ist möglich; ein leichter Regenschutz kann sinnvoll sein.']
});

const REDUNDANT_NOTICE_CODES = new Set([
  'CHECK_NECK',
  'SLEEP_USE_ROOM_TEMPERATURE',
  'SLEEP_GENERIC_TOG_ORIENTATION',
  'WEATHER_DATA_STALE'
]);

const BODY_LAYER_SLOTS = new Set(['base_torso', 'top', 'legs', 'mid', 'outer', 'sleep_underlayer']);
const BODY_EXTREMITY_SLOTS = new Set(['feet', 'footwear', 'head', 'hands']);
const SLOT_ORDER = Object.freeze([
  'base_torso', 'top', 'legs', 'mid', 'outer', 'sleep_underlayer',
  'feet', 'footwear', 'head', 'hands', 'sleep_bag',
  'stroller_thermal_accessory', 'stroller_weather_accessory', 'carrier_accessory', 'car_thermal_accessory'
]);
const PHASE_COPY = Object.freeze({
  main: 'Jetzt',
  in_car: 'Im Autositz'
});

function weatherIcon(code, isDay) {
  if (!Number.isFinite(code)) return '◌';
  if ([95, 96, 99].includes(code)) return '⛈';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return '🌧';
  if ([45, 48].includes(code)) return '🌫';
  if (code === 0) return isDay === false ? '☾' : '☀';
  if ([1, 2].includes(code)) return '⛅';
  return '☁';
}

function weatherDescription(code) {
  if ([95, 96, 99].includes(code)) return 'Gewitter';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Schnee';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'Regen';
  if ([45, 48].includes(code)) return 'Nebel';
  if (code === 0) return 'Klar';
  if ([1, 2].includes(code)) return 'Leicht bewölkt';
  if (code === 3) return 'Bewölkt';
  return 'Wetterlage';
}

function imageFallback(shell, label) {
  shell.replaceChildren();
  const fallback = document.createElement('div');
  fallback.className = 'asset-placeholder';
  fallback.textContent = `Bild für ${label} nicht verfügbar`;
  shell.append(fallback);
}

function clothingCard({ slotResult = null, itemId, logicalItemId = null, asset, label, role = '', interactive = false, interactiveLabel = 'Alternativen anzeigen', contextLabel = '' }) {
  const element = document.createElement(interactive ? 'button' : 'article');
  if (interactive) element.type = 'button';
  element.className = `clothing-card${interactive ? ' clothing-card-button' : ''}`;
  element.dataset.itemId = itemId;
  if (logicalItemId) element.dataset.logicalItemId = logicalItemId;
  if (slotResult) {
    element.dataset.slot = slotResult.slot;
    element.dataset.phase = slotResult.phase;
    const accessibleContext = [contextLabel, role].filter(Boolean).join(' · ');
    element.setAttribute('aria-label', `${accessibleContext ? `${accessibleContext}: ` : ''}${label}${interactive ? ` – ${interactiveLabel}` : ''}`);
    if (interactive) element.dataset.openAlternatives = 'true';
  }

  const shell = document.createElement('div');
  shell.className = 'clothing-image-shell';
  if (asset) {
    const image = document.createElement('img');
    image.src = asset.src;
    image.alt = asset.alt || label;
    image.loading = 'eager';
    image.decoding = 'async';
    image.dataset.clothingImage = 'true';
    if (asset.visualVariantId) image.dataset.visualVariantId = asset.visualVariantId;
    image.addEventListener('error', () => imageFallback(shell, label), { once: true });
    shell.append(image);
  } else {
    imageFallback(shell, label);
  }

  const name = document.createElement('p');
  name.className = 'clothing-name';
  name.textContent = label;
  const roleText = document.createElement('p');
  roleText.className = 'clothing-role';
  roleText.textContent = role;
  element.append(shell, name, roleText);
  return element;
}

function slotRole(slot) {
  const labels = {
    base_torso: 'Basisschicht', top: 'Oberteil', legs: 'Beine', mid: 'Zwischenschicht', outer: 'Außenschicht', feet: 'Füße',
    head: 'Kopf', hands: 'Hände', footwear: 'Schuhe', stroller_thermal_accessory: 'Kinderwagen',
    stroller_weather_accessory: 'Wetterschutz', carrier_accessory: 'Trage', car_thermal_accessory: 'Über dem Gurt', sleep_bag: 'Schlafsack', sleep_underlayer: 'Darunter'
  };
  return labels[slot] ?? 'Kleidungsstück';
}


function contextLabelFor(context) {
  if (!context?.mode) return '';
  if (context.mode === 'outdoor') return `Draußen · ${context.activity === 'active' ? 'aktiv' : 'normal'}`;
  if (context.mode === 'stroller') return `Kinderwagen · ${context.strollerState === 'asleep' ? 'schlafend' : context.activity === 'active' ? 'sehr aktiv' : 'wach'}`;
  if (context.mode === 'carrier') return 'Trage · Körperkontakt';
  if (context.mode === 'car') return 'Autositz · Außenwetter + Gurtsicherheit';
  if (context.mode === 'indoor') return 'Drinnen · Raumtemperatur';
  if (context.mode === 'sleep') return 'Schlafen · Raumtemperatur + TOG';
  return '';
}

function statusDetail(recommendation) {
  const fields = new Set(recommendation?.dataQuality?.missingFields ?? []);
  const labels = [];
  if ([...fields].some((field) => field.includes('uvIndex'))) labels.push('UV-Wert fehlt');
  if ([...fields].some((field) => field.includes('windSpeedKmh'))) labels.push('Winddaten fehlen');
  if ([...fields].some((field) => field.includes('precipProbabilityPct') || field === 'weather.precipitation')) labels.push('Niederschlagsangabe fehlt');
  if ([...fields].some((field) => field.includes('hourly.coverage'))) labels.push('Wetterzeitraum unvollständig');
  if (fields.has('context.roomTempC')) labels.push('Raumtemperatur fehlt');
  if (fields.has('integration')) labels.push('Daten konnten nicht ausgewertet werden');
  if (labels.length) return labels.slice(0, 2).join(' · ');
  if (recommendation?.notices?.some((notice) => notice.code === 'MANUAL_LOCK_LIMITS_WEATHER_PROTECTION')) return 'Wetterschutz eingeschränkt';
  if (recommendation?.notices?.some((notice) => notice.code === 'WEATHER_DATA_STALE')) return 'Wetterdaten nicht aktuell';
  return recommendation?.status === 'blocked' ? 'Erforderliche Angaben fehlen' : 'Zusätzliche Angaben fehlen';
}

function statusTextFor(recommendation) {
  if (!recommendation || recommendation.status === 'ready') return '';
  return statusDetail(recommendation);
}

function groupKeyForSlot(slot) {
  if (BODY_LAYER_SLOTS.has(slot)) return 'body';
  if (BODY_EXTREMITY_SLOTS.has(slot)) return 'extremities';
  return 'situational';
}

function groupLabelFor(mode, groupKey) {
  if (groupKey === 'body') return 'Am Körper';
  if (groupKey === 'extremities') return 'Kopf, Hände & Füße';
  if (mode === 'stroller') return 'Zusätzlich im Kinderwagen';
  if (mode === 'carrier') return 'Zusätzlich in der Trage';
  if (mode === 'sleep') return 'Zusätzlich im Schlafbereich';
  return 'Situationsbezogen';
}

function phaseLabelFor(phase, context) {
  if (phase === 'main') return context?.mode === 'car' ? 'Autositz' : contextLabelFor(context);
  return PHASE_COPY[phase] ?? phase;
}

function renderGroup(slots, { mode, phase, context, assetStore, paletteMode, visual }) {
  if (!slots.length) return null;
  const groupKey = groupKeyForSlot(slots[0].slot);
  const group = document.createElement('div');
  group.className = 'outfit-group';
  group.dataset.outfitGroup = groupKey;
  const heading = document.createElement('h3');
  heading.className = 'outfit-group-heading';
  heading.textContent = groupLabelFor(mode, groupKey);
  const grid = document.createElement('div');
  grid.className = 'outfit-group-grid';
  const phaseLabel = phaseLabelFor(phase, context);
  let missingAssets = 0;
  for (const slotResult of slots) {
    const logicalItemId = slotResult.selected.itemId;
    const split = isCompositeSleepVisualItem(logicalItemId);
    for (const part of visualPartsForItem(logicalItemId)) {
      const itemGroup = assetStore.group(part.itemId);
      const asset = part.itemId === logicalItemId
        ? assetStore.resolveSlot(slotResult, visual.bySlot)
        : assetStore.resolve(part.itemId, paletteMode);
      if (!asset && itemGroup?.assetPath !== null) missingAssets += 1;
      grid.append(clothingCard({
        slotResult,
        itemId: part.itemId,
        logicalItemId: split ? logicalItemId : null,
        asset,
        label: itemGroup?.label ?? part.itemId.replaceAll('_', ' '),
        role: part.role ?? slotRole(slotResult.slot),
        interactive: slotResult.alternatives?.length > 0,
        interactiveLabel: split ? 'Kombination austauschen' : 'Alternativen anzeigen',
        contextLabel: phaseLabel
      }));
    }
  }
  group.append(heading, grid);
  return { element: group, missingAssets };
}

function phaseSlots(recommendation, phase) {
  return (recommendation?.slots ?? [])
    .filter((slot) => slot.phase === phase && !slot.selected.itemId.endsWith('_none'))
    .sort((left, right) => SLOT_ORDER.indexOf(left.slot) - SLOT_ORDER.indexOf(right.slot));
}

function renderPhase(recommendation, phaseEvaluation, context, assetStore, paletteMode, visual) {
  const phase = phaseEvaluation.phase;
  const section = document.createElement('section');
  section.className = `outfit-phase${phase === 'in_car' ? ' outfit-phase--in-car' : ''}`;
  section.dataset.outfitPhase = phase;
  if (phase !== 'main' || context?.mode === 'car') {
    const heading = document.createElement('h2');
    heading.className = 'outfit-phase-heading';
    heading.textContent = PHASE_COPY[phase] ?? contextLabelFor(context);
    section.append(heading);
  }

  const slots = phaseSlots(recommendation, phase);
  const grouped = new Map();
  for (const slot of slots) {
    const key = groupKeyForSlot(slot.slot);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(slot);
  }
  let missingAssets = 0;
  for (const groupKey of ['body', 'extremities', 'situational']) {
    const rendered = renderGroup(grouped.get(groupKey) ?? [], { mode: context?.mode, phase, context, assetStore, paletteMode, visual });
    if (!rendered) continue;
    missingAssets += rendered.missingAssets;
    section.append(rendered.element);
  }
  if (!slots.length) {
    const empty = document.createElement('div');
    empty.className = 'outfit-empty outfit-phase-empty';
    empty.innerHTML = phaseEvaluation.status === 'blocked'
      ? '<strong>Noch keine sichere Empfehlung</strong><p>Für diese Phase fehlen noch Angaben. Die App erfindet keine Kombination.</p>'
      : '<strong>Keine Kleidungsstücke vorgesehen</strong><p>Für diese Phase ist kein Kleidungsstück vorgesehen.</p>';
    section.append(empty);
  }
  return { element: section, missingAssets };
}

function orderedPhasesForDisplay(phases) {
  return phases;
}

function unavailableWeatherLabel(runtime) {
  if (runtime.weatherCacheStatus === 'expired') return 'Gespeichertes Wetter zu alt';
  if (runtime.weatherCacheStatus === 'location_mismatch') return 'Kein passender Wettercache';
  if (runtime.weatherLoading) return 'Wetter wird geladen …';
  return 'Wetter nicht verfügbar';
}

export function renderWeather(weather, location, runtime = {}, context = null) {
  document.querySelector('#locationLabel').textContent = location?.label || weather?.location?.label || 'Standort wählen';
  const current = weather?.current ?? null;
  const roomMode = ['indoor', 'sleep'].includes(context?.mode);
  const roomTemperature = Number.isFinite(context?.roomTempC) ? context.roomTempC : null;
  const hero = document.querySelector('.weather-hero');
  hero.classList.toggle('weather-hero--room', roomMode);
  document.querySelector('#weatherHeading').textContent = roomMode ? (context.mode === 'sleep' ? 'Schlafraum' : 'Drinnen') : 'Jetzt';
  document.querySelector('#temperatureValue').textContent = roomMode ? formatTemperature(roomTemperature) : formatTemperature(current?.airTempC);
  document.querySelector('#weatherSymbol').textContent = roomMode ? (context.mode === 'sleep' ? '☾' : '⌂') : (current ? weatherIcon(current.weatherCode, current.isDay) : '◌');
  document.querySelector('#weatherDescription').textContent = roomMode
    ? (roomTemperature == null ? 'Raumtemperatur fehlt' : context.mode === 'sleep' ? 'Raumtemperatur für Schlafen' : 'Raumtemperatur für drinnen')
    : current
      ? (runtime.weatherLoading ? 'Wetter und Standort werden aktualisiert …' : weatherDescription(current.weatherCode))
      : unavailableWeatherLabel(runtime);
  document.querySelector('#weatherAdjustRow').hidden = roomMode;

  const facts = document.querySelector('#weatherFacts');
  facts.replaceChildren();
  if (roomMode) {
    const secondaryLabel = document.createElement('div');
    secondaryLabel.id = 'weatherFactsLabel';
    secondaryLabel.className = 'weather-facts-label';
    secondaryLabel.textContent = 'Außenwetter · sekundär';
    facts.append(secondaryLabel);
  }
  const rows = current ? [
    ['Gefühlt', current.apparentTempC == null ? '–' : formatTemperature(current.apparentTempC)],
    ['Wind', current.windSpeedKmh == null ? '–' : `${Math.round(current.windSpeedKmh)} km/h`],
    [precipitationLabelFor(current), current.precipProbabilityPct == null ? '–' : `${Math.round(current.precipProbabilityPct)} %`],
    ['UV', formatUvIndex(current.uvIndex)]
  ] : [['Status', runtime.weatherCacheStatus === 'expired' ? 'Cache zu alt' : runtime.weatherCacheStatus === 'location_mismatch' ? 'Cache anderer Ort' : runtime.weatherError ? 'Fehler' : 'Keine Daten']];
  for (const [index, [nameText, valueText]] of rows.entries()) {
    const row = document.createElement('div');
    row.className = `weather-fact${index === 0 ? ' weather-fact--apparent' : ''}`;
    const name = document.createElement('span');
    name.textContent = nameText;
    const strong = document.createElement('strong');
    strong.textContent = valueText;
    row.append(name, strong);
    facts.append(row);
  }
}

export function renderHourly(weather) {
  const host = document.querySelector('#hourlyForecast');
  host.replaceChildren();
  const hourly = weather?.hourly?.slice(0, 12) ?? [];
  if (!hourly.length) {
    const empty = document.createElement('p');
    empty.className = 'hourly-empty';
    empty.textContent = 'Keine stündliche Vorschau verfügbar.';
    host.append(empty);
    return;
  }
  for (const point of hourly) {
    const card = document.createElement('div');
    card.className = 'hour-card';
    const time = document.createElement('span');
    time.textContent = new Intl.DateTimeFormat('de-AT', { hour: '2-digit', minute: '2-digit' }).format(new Date(point.time));
    const icon = document.createElement('span');
    icon.className = 'hour-symbol';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = weatherIcon(point.weatherCode, point.isDay);
    const temp = document.createElement('strong');
    temp.textContent = formatTemperature(point.airTempC);
    const rain = document.createElement('small');
    rain.textContent = formatPrecipitation(point);
    card.append(time, icon, temp, rain);
    host.append(card);
  }
}

export function renderSituation(mode) {
  const copy = MODE_COPY[mode];
  document.querySelector('#situationLabel').textContent = copy.label;
  document.querySelector('#situationIcon').textContent = copy.icon;
}

export function renderSituationOptions(selectedMode) {
  const host = document.querySelector('#situationOptions');
  host.replaceChildren();
  for (const [mode, copy] of Object.entries(MODE_COPY)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `situation-option${mode === selectedMode ? ' is-selected' : ''}`;
    button.dataset.situation = mode;
    button.setAttribute('aria-pressed', String(mode === selectedMode));
    button.innerHTML = `<span class="option-icon" aria-hidden="true">${copy.icon}</span><span><strong>${copy.label}</strong><small>${copy.short}</small></span><span aria-hidden="true">${mode === selectedMode ? '✓' : '›'}</span>`;
    host.append(button);
  }
}

function selectField(labelText, field, options, value) {
  const label = document.createElement('label');
  label.className = 'field compact-field';
  label.append(document.createTextNode(labelText));
  const select = document.createElement('select');
  select.dataset.contextField = field;
  for (const [optionValue, optionLabel] of options) {
    const option = document.createElement('option');
    option.value = optionValue;
    option.textContent = optionLabel;
    option.selected = optionValue === value;
    select.append(option);
  }
  label.append(select);
  return label;
}

function numberField(labelText, field, value, min, max, suffix) {
  const label = document.createElement('label');
  label.className = 'field compact-field';
  label.append(document.createTextNode(labelText));
  const row = document.createElement('span');
  row.className = 'input-with-suffix';
  const input = document.createElement('input');
  input.type = 'number';
  input.inputMode = 'decimal';
  input.min = String(min);
  input.max = String(max);
  input.step = '0.5';
  input.dataset.contextField = field;
  input.value = value ?? '';
  const unit = document.createElement('span');
  unit.textContent = suffix;
  row.append(input, unit);
  label.append(row);
  return label;
}

export function renderSituationContext(mode, context) {
  const host = document.querySelector('#situationContextFields');
  host.replaceChildren();
  const title = document.createElement('h3');
  title.textContent = 'Details für diese Situation';
  host.append(title);

  if (mode === 'outdoor') {
    host.append(
      selectField('Aktivität', 'activity', [['calm', 'Ruhig'], ['normal', 'Normal'], ['active', 'Aktiv']], context.activity),
      selectField('Sonne', 'sunExposure', [['shade', 'Schatten'], ['partial', 'Teilweise Sonne'], ['direct', 'Direkte Sonne'], ['unknown', 'Unbekannt']], context.sunExposure),
      selectField('Bodenkontakt', 'groundContact', [['none', 'Keiner'], ['standing', 'Steht'], ['walking', 'Läuft']], context.groundContact)
    );
  }
  if (mode === 'stroller') {
    const stateField = selectField('Zustand', 'strollerState', [['awake', 'Wach'], ['asleep', 'Schläft']], context.strollerState);
    const activityField = selectField('Aktivität wach', 'activity', [['calm', 'Ruhig'], ['normal', 'Normal'], ['active', 'Sehr aktiv']], context.activity);
    const syncActivityVisibility = (strollerState) => {
      const hidden = strollerState === 'asleep';
      activityField.hidden = hidden;
      activityField.style.display = hidden ? 'none' : '';
    };
    syncActivityVisibility(context.strollerState);
    stateField.querySelector('select').addEventListener('change', (event) => {
      syncActivityVisibility(event.target.value);
    });
    host.append(
      stateField,
      activityField,
      selectField('Sonne', 'sunExposure', [['shade', 'Schatten'], ['partial', 'Teilweise Sonne'], ['direct', 'Direkte Sonne'], ['unknown', 'Unbekannt']], context.sunExposure),
      selectField('Windschutz', 'windProtection', [['none', 'Kein Windschutz'], ['partial', 'Teilweise'], ['good', 'Gut'], ['unknown', 'Unbekannt']], context.windProtection)
    );
  }
  if (mode === 'carrier') {
    host.append(
      selectField('Sonne', 'sunExposure', [['shade', 'Schatten'], ['partial', 'Teilweise Sonne'], ['direct', 'Direkte Sonne'], ['unknown', 'Unbekannt']], context.sunExposure),
      selectField('Position', 'placement', [['over_wearer_outerwear', 'Über der Jacke'], ['under_wearer_outerwear', 'Unter der Jacke']], context.placement)
    );
  }
  if (mode === 'car') {
    const summary = document.createElement('div');
    summary.className = 'car-context-summary';
    summary.innerHTML = '<strong>Keine zusätzlichen Angaben nötig</strong><p>Die Empfehlung startet mit dem aktuellen Außenwetter und bleibt unter dem Gurt schlank.</p><p>Zusätzliche Wärme kommt erst über den korrekt geschlossenen Gurt. Sobald das Auto warm wird, Decke oder Überwurf entfernen.</p>';
    host.append(summary);
  }
  if (mode === 'sleep') {
    host.append(numberField('Raumtemperatur', 'roomTempC', context.roomTempC, 5, 35, '°C'));
  }
}

function renderNotices(recommendation, excludedCodes = new Set()) {
  const host = document.querySelector('#safetyNotice');
  const notices = recommendation?.notices?.filter((notice) => !REDUNDANT_NOTICE_CODES.has(notice.code) && !excludedCodes.has(notice.code)) ?? [];
  host.replaceChildren();
  host.hidden = notices.length === 0;
  for (const notice of notices) {
    const row = document.createElement('div');
    row.className = `notice-row notice-row--${notice.severity}`;
    row.dataset.noticeCode = notice.code;
    const marker = document.createElement('span');
    marker.className = 'notice-marker';
    marker.setAttribute('aria-hidden', 'true');
    marker.textContent = notice.severity === 'hard_rule' ? '!' : '✦';
    const copy = document.createElement('div');
    const title = document.createElement('strong');
    const mapped = NOTICE_COPY[notice.code] ?? [notice.code, ''];
    title.textContent = mapped[0];
    copy.append(title);
    if (notice.severity !== 'info' && mapped[1]) {
      const text = document.createElement('p');
      text.textContent = mapped[1];
      copy.append(text);
    }
    row.append(marker, copy);
    host.append(row);
  }
}

function reasonFor(context, recommendation) {
  if (recommendation.status === 'blocked') return 'Für eine sichere Empfehlung fehlen noch Angaben.';
  if (context.mode === 'stroller') return context.strollerState === 'asleep'
    ? 'Beim Schlafen im Kinderwagen wird thermisch wärmer bewertet; Outdoor-Wetter bleibt relevant.'
    : context.activity === 'active'
      ? 'Ein waches, sehr aktives Baby im Kinderwagen wird leichter bewertet als ein schlafendes Baby.'
      : null;
  if (context.mode === 'carrier') return 'Körperkontakt reduziert den Wärmebedarf am bedeckten Rumpf; exponierte Bereiche werden separat geschützt.';
  if (context.mode === 'car') return 'Ausgangspunkt ist das aktuelle Außenwetter. Unter dem Gurt bleibt die Kleidung schlank; zusätzliche Wärme kommt nur darüber und wird im warmen Auto entfernt.';
  if (context.mode === 'sleep') {
    const roomTemperature = Number.isFinite(context.roomTempC) ? formatTemperatureC(context.roomTempC) : 'der fehlenden';
    return `Die Schlafempfehlung basiert auf ${roomTemperature} Raumtemperatur, nicht auf dem Außenwetter.`;
  }
  return null;
}

export function renderOutfit({ recommendation, context, warmthDirection, paletteMode, visualSeed }, assetStore) {
  const grid = document.querySelector('#outfitGrid');
  grid.replaceChildren();
  const visual = assetStore.resolveLook(recommendation, paletteMode, visualSeed);
  const visibleSlots = (recommendation?.slots ?? []).filter((slot) => !slot.selected.itemId.endsWith('_none'));
  let missingAssets = 0;
  const phaseEvaluations = recommendation?.phases ?? [];
  for (const phaseEvaluation of orderedPhasesForDisplay(phaseEvaluations)) {
    const rendered = renderPhase(recommendation, phaseEvaluation, context, assetStore, paletteMode, visual);
    missingAssets += rendered.missingAssets;
    grid.append(rendered.element);
  }
  if (!phaseEvaluations.length || (!visibleSlots.length && !phaseEvaluations.length)) {
    const empty = document.createElement('div');
    empty.className = 'outfit-empty';
    empty.innerHTML = `<strong>${recommendation?.status === 'blocked' ? 'Noch keine sichere Empfehlung' : 'Empfehlung unvollständig'}</strong><p>Ergänze die fehlenden Angaben. Die App erfindet keine Kombination.</p>`;
    grid.append(empty);
  }

  const reason = reasonFor(context, recommendation);
  const reasonBox = document.querySelector('.reason-box');
  document.querySelector('#outfitReason').textContent = reason ?? '';
  reasonBox.hidden = !reason;
  reasonBox.style.display = reason ? '' : 'none';
  const pill = document.querySelector('#confidencePill');
  const statusLabel = { ready: 'Passend', ready_with_estimate: 'Mit Schätzung', partial: 'Teilweise', blocked: 'Angaben fehlen' };
  pill.textContent = statusLabel[recommendation?.status] ?? 'Prüfen';
  pill.dataset.status = recommendation?.status ?? 'blocked';
  const showStatus = recommendation?.status !== 'ready';
  pill.hidden = !showStatus;
  pill.style.display = showStatus ? '' : 'none';
  const contextLabel = document.querySelector('#outfitContextLabel');
  contextLabel.textContent = contextLabelFor(context);
  const statusText = document.querySelector('#outfitStatusText');
  statusText.textContent = statusTextFor(recommendation);
  statusText.hidden = !statusText.textContent;
  for (const button of document.querySelectorAll('[data-warmth]')) {
    const active = button.dataset.warmth === warmthDirection;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
    button.disabled = recommendation?.status === 'blocked';
  }
  document.querySelector('#changeLookButton').disabled = assetStore.status !== 'ready' || !visibleSlots.length || !visual.look?.hasAlternateLook;
  renderNotices(recommendation);
  const assetNotice = document.querySelector('#assetNotice');
  assetNotice.hidden = assetStore.status === 'ready' && missingAssets === 0;
  if (!assetNotice.hidden) {
    assetNotice.textContent = assetStore.status === 'missing'
      ? 'Kleidungsbilder konnten nicht geladen werden. Die Textempfehlung bleibt verfügbar.'
      : 'Ein empfohlenes Kleidungsbild fehlt im Asset-Katalog.';
  }
}

export function renderCatalog(assetStore, paletteMode) {
  const host = document.querySelector('#catalogGrid');
  host.replaceChildren();
  for (const group of assetStore.listGroups().filter((entry) => !isCompositeSleepVisualItem(entry.id) && (entry.assetPath || entry.variantPaths))) {
    const asset = assetStore.resolveCatalog(group.id, paletteMode);
    host.append(clothingCard({ itemId: group.id, asset, label: group.label ?? group.id, role: slotRole(group.slot) }));
  }
}

export function renderAlternatives(slotResult, assetStore, paletteMode) {
  const host = document.querySelector('#alternativeOptions');
  const title = document.querySelector('#alternativeTitle');
  host.replaceChildren();
  const selectedGroup = assetStore.group(slotResult.selected.itemId);
  title.textContent = `${selectedGroup?.label ?? 'Kleidungsstück'} austauschen`;
  for (const alternative of slotResult.alternatives ?? []) {
    const group = assetStore.group(alternative.itemId);
    const parts = visualPartsForItem(alternative.itemId);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'alternative-option';
    button.dataset.alternativeItemId = alternative.itemId;
    button.dataset.alternativeSlot = slotResult.slot;
    button.dataset.alternativePhase = slotResult.phase;
    const image = document.createElement('div');
    image.className = `alternative-image${parts.length > 1 ? ' alternative-image--parts' : ''}`;
    for (const part of parts) {
      const partGroup = assetStore.group(part.itemId);
      const asset = assetStore.resolve(part.itemId, paletteMode);
      if (!asset) continue;
      const img = document.createElement('img');
      img.src = asset.src;
      img.alt = asset.alt || partGroup?.label || part.itemId;
      img.dataset.clothingImage = 'true';
      image.append(img);
    }
    const copy = document.createElement('span');
    const strong = document.createElement('strong');
    strong.textContent = group?.label ?? alternative.itemId.replaceAll('_', ' ');
    const small = document.createElement('small');
    const relation = alternative.relation === 'warmer' ? 'wärmer' : alternative.relation === 'cooler' ? 'kühler' : 'ähnlich warm';
    const changed = Math.max(0, (alternative.projectedChanges?.length ?? 1) - 1);
    small.textContent = changed ? `${relation} · Outfit wird in ${changed} weiter${changed === 1 ? 'em Bereich' : 'en Bereichen'} angepasst` : relation;
    copy.append(strong, small);
    button.append(image, copy, document.createTextNode('›'));
    host.append(button);
  }
}
