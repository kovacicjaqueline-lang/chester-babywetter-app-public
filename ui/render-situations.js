import './background-scene.js';

const MODE_COPY = Object.freeze({
  outdoor: { label: 'Draußen', icon: '☀', short: 'Wetter + Aktivität' },
  stroller: { label: 'Kinderwagen', icon: '◌', short: 'Schläft, wach oder sehr aktiv' },
  carrier: { label: 'Trage', icon: '♡', short: 'Körperwärme einrechnen' },
  car: { label: 'Autositz', icon: '◇', short: 'Gurtsicherheit zuerst' },
  indoor: { label: 'Drinnen', icon: '⌂', short: 'Raumtemperatur + Aktivität' },
  sleep: { label: 'Schlafen', icon: '☾', short: 'Raumtemperatur + TOG' }
});

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

function carSafetySummary() {
  const summary = document.createElement('div');
  summary.className = 'car-context-summary';
  const title = document.createElement('strong');
  title.textContent = 'Keine zusätzlichen Angaben nötig';
  const weather = document.createElement('p');
  weather.textContent = 'Die Empfehlung startet mit dem aktuellen Außenwetter und bleibt unter dem Gurt schlank.';
  const cover = document.createElement('p');
  cover.textContent = 'Zusätzliche Wärme kommt erst über den korrekt geschlossenen Gurt. Sobald das Auto warm wird, Decke oder Überwurf entfernen.';
  summary.append(title, weather, cover);
  return summary;
}

export function renderSituationContext(mode, context) {
  const host = document.querySelector('#situationContextFields');
  host.replaceChildren();
  const title = document.createElement('h3');
  title.textContent = 'Details für diese Situation';
  host.append(title);

  if (mode === 'outdoor') {
    host.append(
      selectField('Aktivität', 'activity', [['normal', 'Normal'], ['active', 'Sehr aktiv']], context.activity === 'active' ? 'active' : 'normal'),
      selectField('Sonne', 'sunExposure', [['shade', 'Schatten'], ['partial', 'Teilweise Sonne'], ['direct', 'Direkte Sonne'], ['unknown', 'Unbekannt']], context.sunExposure),
      selectField('Bodenkontakt', 'groundContact', [['none', 'Keiner'], ['standing', 'Steht'], ['walking', 'Läuft']], context.groundContact)
    );
  }
  if (mode === 'stroller') {
    const behavior = context.strollerState === 'asleep'
      ? 'asleep'
      : context.activity === 'active' ? 'very_active' : 'awake';
    host.append(
      selectField('Baby gerade', 'strollerBehavior', [['asleep', 'Schläft'], ['awake', 'Wach'], ['very_active', 'Sehr aktiv']], behavior),
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
    host.append(carSafetySummary());
  }
  if (mode === 'indoor') {
    host.append(
      numberField('Raumtemperatur', 'roomTempC', context.roomTempC, 5, 35, '°C'),
      selectField('Aktivität', 'activity', [['normal', 'Normal'], ['active', 'Sehr aktiv']], context.activity === 'active' ? 'active' : 'normal')
    );
  }
  if (mode === 'sleep') {
    host.append(numberField('Raumtemperatur', 'roomTempC', context.roomTempC, 5, 35, '°C'));
  }
}
