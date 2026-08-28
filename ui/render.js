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
  CAR_SEAT_REMOVE_OUTER_BEFORE_HARNESS: ['Vor dem Anschnallen ausziehen', 'Voluminöse Außenschichten für den Weg zum Auto vor dem Anschnallen entfernen.'],
  CAR_SEAT_BLANKET_OVER_HARNESS_ONLY: ['Zusätzliche Wärme über dem Gurt', 'Eine Decke oder Jacke nur über dem bereits korrekt geschlossenen Gurt verwenden.'],
  CAR_SEAT_CONDITIONAL_LAYER_CHECK_FIT: ['Gurtpassform prüfen', 'Bei dieser dünnen Schicht prüfen, ob der Gurt weiterhin korrekt eng anliegt.'],
  CAR_CABIN_TEMPERATURE_ESTIMATED: ['Innenraumtemperatur geschätzt', 'Die Innenraumtemperatur ist eine Schätzung und kann manuell angepasst werden.'],
  SLEEP_NO_HAT: ['Beim Schlafen keine Mütze', 'In Innenräumen bleibt der Kopf beim Schlafen frei.'],
  SLEEP_NO_LOOSE_BLANKET_OVER_BAG: ['Keine lose Decke im Bett', 'Keine lose Decke zusätzlich über dem Schlafsack verwenden.'],
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

function weatherIcon(code, isDay) {
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

function clothingCard({ slotResult = null, itemId, asset, label, role = '', interactive = false }) {
  const element = document.createElement(interactive ? 'button' : 'article');
  if (interactive) element.type = 'button';
  element.className = `clothing-card${interactive ? ' clothing-card-button' : ''}`;
  element.dataset.itemId = itemId;
  if (slotResult) {
    element.dataset.slot = slotResult.slot;
    element.dataset.phase = slotResult.phase;
    element.dataset.openAlternatives = 'true';
    element.setAttribute('aria-label', `${label} – Alternativen anzeigen`);
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
    base_torso: 'Basisschicht', legs: 'Beine', mid: 'Zwischenschicht', outer: 'Außenschicht', feet: 'Füße',
    head: 'Kopf', hands: 'Hände', footwear: 'Schuhe', stroller_thermal_accessory: 'Kinderwagen',
    stroller_weather_accessory: 'Wetterschutz', carrier_accessory: 'Trage', sleep_bag: 'Schlafsack', sleep_underlayer: 'Darunter'
  };
  return labels[slot] ?? 'Kleidungsstück';
}

function ageMinutesFromFetchedAt(fetchedAt) {
  const fetchedMs = Date.parse(fetchedAt);
  if (!Number.isFinite(fetchedMs)) return null;
  return Math.max(0, (Date.now() - fetchedMs) / 60000);
}

function formatWeatherAge(ageMinutes) {
  if (!Number.isFinite(ageMinutes)) return null;
  const rounded = Math.max(0, Math.round(ageMinutes));
  if (rounded < 1) return 'gerade eben';
  if (rounded < 60) return `vor ${rounded} Min.`;
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  return minutes ? `vor ${hours} Std. ${minutes} Min.` : `vor ${hours} Std.`;
}

function unavailableWeatherLabel(runtime) {
  if (runtime.weatherCacheStatus === 'expired') return 'Gespeichertes Wetter zu alt';
  if (runtime.weatherCacheStatus === 'location_mismatch') return 'Kein passender Wettercache';
  if (runtime.weatherLoading) return 'Wetter wird geladen …';
  return 'Wetter nicht verfügbar';
}

export function renderWeather(weather, location, runtime = {}) {
  document.querySelector('#locationLabel').textContent = location?.label || weather?.location?.label || 'Standort wählen';
  const current = weather?.current ?? null;
  const age = current ? formatWeatherAge(ageMinutesFromFetchedAt(weather.fetchedAt)) : null;
  const fromCache = weather?.origin === 'cache';
  const cacheSuffix = fromCache
    ? weather.freshness === 'stale'
      ? ` · ältere gespeicherte Daten${age ? ` (${age})` : ''}`
      : ` · gespeichert${age ? ` (${age})` : ''}`
    : '';
  document.querySelector('#temperatureValue').textContent = current ? `${Math.round(current.airTempC)}°` : '–';
  document.querySelector('#weatherSymbol').textContent = current ? weatherIcon(current.weatherCode, current.isDay) : '◌';
  document.querySelector('#weatherDescription').textContent = current
    ? `${weatherDescription(current.weatherCode)}${cacheSuffix}`
    : unavailableWeatherLabel(runtime);

  const facts = document.querySelector('#weatherFacts');
  facts.replaceChildren();
  const rows = current ? [
    ['Stand', fromCache ? `${weather.freshness === 'stale' ? 'älter gespeichert' : 'gespeichert'}${age ? ` · ${age}` : ''}` : age ?? 'frisch geladen'],
    ['Gefühlt', current.apparentTempC == null ? '–' : `${Math.round(current.apparentTempC)}°`],
    ['Wind', current.windSpeedKmh == null ? '–' : `${Math.round(current.windSpeedKmh)} km/h`],
    ['Regen', current.precipProbabilityPct == null ? '–' : `${Math.round(current.precipProbabilityPct)} %`],
    ['UV', current.uvIndex == null ? '–' : current.uvIndex.toFixed(1)]
  ] : [['Status', runtime.weatherCacheStatus === 'expired' ? 'Cache zu alt' : runtime.weatherCacheStatus === 'location_mismatch' ? 'Cache anderer Ort' : runtime.weatherError ? 'Fehler' : 'Keine Daten']];
  for (const [nameText, valueText] of rows) {
    const row = document.createElement('div');
    row.className = 'weather-fact';
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
    temp.textContent = `${Math.round(point.airTempC)}°`;
    const rain = document.createElement('small');
    rain.textContent = point.precipProbabilityPct == null ? 'Regen –' : `Regen ${Math.round(point.precipProbabilityPct)}%`;
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

function checkboxField(labelText, field, checked) {
  const label = document.createElement('label');
  label.className = 'check-field';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.dataset.contextField = field;
  input.checked = Boolean(checked);
  label.append(input, document.createTextNode(labelText));
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
    host.append(
      selectField('Zustand', 'strollerState', [['awake', 'Wach'], ['asleep', 'Schläft']], context.strollerState),
      selectField('Aktivität wach', 'activity', [['calm', 'Ruhig'], ['normal', 'Normal'], ['active', 'Sehr aktiv']], context.activity),
      selectField('Sonne', 'sunExposure', [['shade', 'Schatten'], ['partial', 'Teilweise Sonne'], ['direct', 'Direkte Sonne'], ['unknown', 'Unbekannt']], context.sunExposure),
      selectField('Windschutz', 'windProtection', [['none', 'Kein Windschutz'], ['partial', 'Teilweise'], ['good', 'Gut'], ['unknown', 'Unbekannt']], context.windProtection)
    );
    const note = document.createElement('p');
    note.className = 'dialog-note situation-note';
    note.textContent = 'Kinderwagen ist nicht automatisch passiv. Bei Schlaf wird die eigene wärmere Kinderwagenlogik verwendet.';
    host.append(note);
  }
  if (mode === 'carrier') {
    host.append(
      selectField('Sonne', 'sunExposure', [['shade', 'Schatten'], ['partial', 'Teilweise Sonne'], ['direct', 'Direkte Sonne'], ['unknown', 'Unbekannt']], context.sunExposure),
      selectField('Position', 'placement', [['over_wearer_outerwear', 'Über der Jacke'], ['under_wearer_outerwear', 'Unter der Jacke']], context.placement)
    );
    const note = document.createElement('p');
    note.className = 'dialog-note situation-note';
    note.textContent = 'Körperwärme wird am Rumpf berücksichtigt. Ein passendes Tragecover kann die Engine selbst empfehlen.';
    host.append(note);
  }
  if (mode === 'car') {
    host.append(
      numberField('Innenraumtemperatur', 'cabinTempC', context.cabinTempC, -10, 45, '°C'),
      selectField('Temperaturquelle', 'cabinTempSource', [['manual', 'Manuell'], ['measured', 'Gemessen'], ['estimated', 'Geschätzt']], context.cabinTempSource),
      checkboxField('Weg zum/vom Auto berücksichtigen', 'includeOutdoorTransition', context.includeOutdoorTransition),
      numberField('Dauer draußen', 'outsideTransitionMinutes', context.outsideTransitionMinutes, 0, 60, 'Min.')
    );
  }
  if (mode === 'sleep') {
    host.append(numberField('Raumtemperatur', 'roomTempC', context.roomTempC, 5, 35, '°C'));
    const note = document.createElement('p');
    note.className = 'dialog-note situation-note';
    note.textContent = 'Schlafen verwendet ausschließlich die Raumtemperatur als Umgebungs-Temperaturinput. TOG ist eine generische Orientierung.';
    host.append(note);
  }
}

function renderNotices(recommendation) {
  const host = document.querySelector('#safetyNotice');
  const notices = recommendation?.notices?.filter((notice) => notice.code !== 'CHECK_NECK') ?? [];
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
    const text = document.createElement('p');
    const mapped = NOTICE_COPY[notice.code] ?? [notice.code, ''];
    title.textContent = mapped[0];
    text.textContent = mapped[1];
    copy.append(title, text);
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
      : 'Kinderwagenzustand, Aktivität, Wetter und Windschutz werden gemeinsam bewertet.';
  if (context.mode === 'carrier') return 'Körperkontakt reduziert den Wärmebedarf am bedeckten Rumpf; exponierte Bereiche werden separat geschützt.';
  if (context.mode === 'car') return context.cabinTempSource === 'estimated'
    ? `Für die Fahrt werden vorläufig ${context.cabinTempC} °C Innenraumtemperatur angenommen. Gurtsicherheit hat Vorrang: nur geeignete dünne Schichten unter dem Gurt.`
    : `Für die Fahrt werden ${context.cabinTempC} °C Innenraumtemperatur verwendet. Gurtsicherheit hat Vorrang: nur geeignete dünne Schichten unter dem Gurt.`;
  if (context.mode === 'sleep') return `Die Schlafempfehlung basiert auf ${context.roomTempC ?? 'der fehlenden'} °C Raumtemperatur, nicht auf dem Außenwetter.`;
  return 'Temperatur, Wetter, Aktivität und Exposition bestimmen die Empfehlung gemeinsam.';
}

export function renderOutfit({ recommendation, context, warmthDirection, styleTheme, visualSeed }, assetStore) {
  const grid = document.querySelector('#outfitGrid');
  grid.replaceChildren();
  const visual = assetStore.resolveLook(recommendation, styleTheme, visualSeed);
  const visibleSlots = (recommendation?.slots ?? []).filter((slot) => !slot.selected.itemId.endsWith('_none'));
  let missingAssets = 0;
  for (const slotResult of visibleSlots) {
    const group = assetStore.group(slotResult.selected.itemId);
    const asset = assetStore.resolveSlot(slotResult, visual.bySlot);
    if (!asset && group?.assetPath !== null) missingAssets += 1;
    grid.append(clothingCard({
      slotResult,
      itemId: slotResult.selected.itemId,
      asset,
      label: group?.label ?? slotResult.selected.itemId.replaceAll('_', ' '),
      role: slotRole(slotResult.slot),
      interactive: slotResult.alternatives?.length > 0
    }));
  }
  if (!visibleSlots.length) {
    const empty = document.createElement('div');
    empty.className = 'outfit-empty';
    empty.innerHTML = `<strong>${recommendation?.status === 'blocked' ? 'Noch keine sichere Empfehlung' : 'Empfehlung unvollständig'}</strong><p>Ergänze die fehlenden Angaben. Die App erfindet keine Kombination.</p>`;
    grid.append(empty);
  }

  document.querySelector('#outfitReason').textContent = reasonFor(context, recommendation);
  const pill = document.querySelector('#confidencePill');
  const statusLabel = { ready: 'Passend', ready_with_estimate: 'Mit Schätzung', partial: 'Teilweise', blocked: 'Angaben fehlen' };
  pill.textContent = statusLabel[recommendation?.status] ?? 'Prüfen';
  pill.dataset.status = recommendation?.status ?? 'blocked';
  for (const button of document.querySelectorAll('[data-warmth]')) {
    const active = button.dataset.warmth === warmthDirection;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
    button.disabled = recommendation?.status === 'blocked';
  }
  const lookLabel = document.querySelector('#lookLabel');
  lookLabel.textContent = visual.look ? `Look: ${visual.look.themeLabel}` : 'Look wird geladen';
  document.querySelector('#changeLookButton').disabled = assetStore.status !== 'ready' || !visibleSlots.length;
  renderNotices(recommendation);
  const assetNotice = document.querySelector('#assetNotice');
  assetNotice.hidden = assetStore.status === 'ready' && missingAssets === 0;
  if (!assetNotice.hidden) {
    assetNotice.textContent = assetStore.status === 'missing'
      ? 'Kleidungsbilder konnten nicht geladen werden. Die Textempfehlung bleibt verfügbar.'
      : 'Ein empfohlenes Kleidungsbild fehlt im Asset-Katalog.';
  }
}

export function renderCatalog(assetStore, styleTheme) {
  const host = document.querySelector('#catalogGrid');
  host.replaceChildren();
  for (const group of assetStore.listGroups().filter((entry) => entry.assetPath || entry.variantPaths)) {
    const asset = assetStore.resolveCatalog(group.id, styleTheme);
    host.append(clothingCard({ itemId: group.id, asset, label: group.label ?? group.id, role: slotRole(group.slot) }));
  }
}

export function renderAlternatives(slotResult, assetStore, styleTheme) {
  const host = document.querySelector('#alternativeOptions');
  const title = document.querySelector('#alternativeTitle');
  host.replaceChildren();
  const selectedGroup = assetStore.group(slotResult.selected.itemId);
  title.textContent = `${selectedGroup?.label ?? 'Kleidungsstück'} austauschen`;
  for (const alternative of slotResult.alternatives ?? []) {
    const group = assetStore.group(alternative.itemId);
    const asset = assetStore.resolve(alternative.itemId, styleTheme);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'alternative-option';
    button.dataset.alternativeItemId = alternative.itemId;
    button.dataset.alternativeSlot = slotResult.slot;
    button.dataset.alternativePhase = slotResult.phase;
    const image = document.createElement('div');
    image.className = 'alternative-image';
    if (asset) {
      const img = document.createElement('img');
      img.src = asset.src;
      img.alt = asset.alt || group?.label || alternative.itemId;
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
