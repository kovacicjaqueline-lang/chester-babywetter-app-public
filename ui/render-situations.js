import './background-scene.js';

const MODE_COPY = Object.freeze({
  outdoor: { label: 'Draußen', icon: '☀', short: 'Wetter + Aktivität' },
  stroller: { label: 'Kinderwagen', icon: '◌', short: 'Schläft, wach oder sehr aktiv' },
  carrier: { label: 'Trage', icon: '♡', short: 'Körperwärme einrechnen' },
  car: { label: 'Autositz', icon: '◇', short: 'Gurtsicherheit zuerst' },
  indoor: { label: 'Drinnen', icon: '⌂', short: 'Raumtemperatur + Aktivität' },
  sleep: { label: 'Schlafen', icon: '☾', short: 'Raumtemperatur + TOG' }
});

function ensureTemperatureControl() {
  const current = document.querySelector('#temperatureValue');
  if (!current || current instanceof HTMLButtonElement) return current;
  const button = document.createElement('button');
  button.type = 'button';
  button.id = current.id;
  button.className = `${current.className} temperature-control`.trim();
  button.textContent = current.textContent;
  button.setAttribute('aria-label', 'Temperatur bearbeiten');
  button.style.minWidth = '44px';
  button.style.minHeight = '44px';
  button.style.padding = '0';
  button.style.border = '0';
  button.style.borderRadius = '10px';
  button.style.background = 'transparent';
  button.style.appearance = 'none';
  current.replaceWith(button);
  return button;
}

function focusRoomTemperatureEditor() {
  requestAnimationFrame(() => {
    const input = document.querySelector('#situationDialog [data-context-field="roomTempC"]');
    if (!(input instanceof HTMLInputElement)) return;
    input.scrollIntoView({ block: 'center', behavior: 'instant' });
    input.focus({ preventScroll: true });
  });
}

function bindTemperatureUx() {
  document.addEventListener('click', (event) => {
    const roomStep = event.target.closest('[data-room-temp-step]');
    if (roomStep) {
      const input = roomStep.closest('.room-temperature-editor')?.querySelector('[data-context-field="roomTempC"]');
      if (!(input instanceof HTMLInputElement)) return;
      if (roomStep.dataset.roomTempStep === 'down') input.stepDown();
      else input.stepUp();
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    const temperature = event.target.closest('#temperatureValue.temperature-control');
    if (!temperature) return;
    const mode = document.querySelector('#situationLabel')?.dataset.situationMode;
    const roomMode = mode === 'indoor' || mode === 'sleep';
    const trigger = document.querySelector(roomMode
      ? '[data-open-dialog="situationDialog"]'
      : '[data-open-dialog="weatherOverrideDialog"]');
    if (!(trigger instanceof HTMLButtonElement)) return;
    trigger.click();
    if (roomMode) focusRoomTemperatureEditor();
  });
}

bindTemperatureUx();

export function renderSituation(mode) {
  const copy = MODE_COPY[mode];
  const label = document.querySelector('#situationLabel');
  label.textContent = copy.label;
  label.dataset.situationMode = mode;
  document.querySelector('#situationIcon').textContent = copy.icon;

  const temperature = ensureTemperatureControl();
  const roomMode = mode === 'indoor' || mode === 'sleep';
  if (temperature) {
    temperature.dataset.situationMode = mode;
    temperature.setAttribute('aria-label', roomMode ? 'Raumtemperatur bearbeiten' : 'Wettertemperatur bearbeiten');
  }
  const description = document.querySelector('#weatherDescription');
  if (description) description.hidden = roomMode;
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

function selectField(labelText, field, options, value, { secondary = false } = {}) {
  const label = document.createElement('label');
  label.className = `field compact-field${secondary ? ' secondary-context-field' : ''}`;
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

function roomTemperatureField(value) {
  const editor = document.createElement('div');
  editor.className = 'room-temperature-editor';
  editor.style.margin = '4px 0 16px';

  const label = document.createElement('div');
  label.id = 'roomTemperatureLabel';
  label.textContent = 'Raumtemperatur';
  label.style.marginBottom = '8px';
  label.style.fontSize = '.8rem';
  label.style.fontWeight = '800';

  const row = document.createElement('div');
  row.className = 'temperature-stepper';
  row.style.gridTemplateColumns = '56px minmax(0, 1fr) auto 56px';
  row.style.minHeight = '72px';

  const decrease = document.createElement('button');
  decrease.type = 'button';
  decrease.dataset.roomTempStep = 'down';
  decrease.setAttribute('aria-label', 'Raumtemperatur um 0,5 Grad senken');
  decrease.textContent = '−';

  const input = document.createElement('input');
  input.type = 'number';
  input.inputMode = 'decimal';
  input.min = '5';
  input.max = '35';
  input.step = '0.5';
  input.dataset.contextField = 'roomTempC';
  input.value = value ?? '';
  input.setAttribute('aria-labelledby', label.id);
  input.style.minHeight = '70px';
  input.style.fontSize = '2rem';
  input.style.lineHeight = '1';

  const unit = document.createElement('span');
  unit.setAttribute('aria-hidden', 'true');
  unit.textContent = '°C';
  unit.style.fontSize = '1rem';

  const increase = document.createElement('button');
  increase.type = 'button';
  increase.dataset.roomTempStep = 'up';
  increase.setAttribute('aria-label', 'Raumtemperatur um 0,5 Grad erhöhen');
  increase.textContent = '+';

  row.append(decrease, input, unit, increase);
  editor.append(label, row);
  return editor;
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

function carrierPlacementField(value) {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'choice-fieldset carrier-placement-fieldset';
  const legend = document.createElement('legend');
  legend.textContent = 'Baby wird getragen …';
  fieldset.append(legend);

  const options = [
    ['under_wearer_outerwear', 'Unter meiner Jacke'],
    ['over_wearer_outerwear', 'Über meiner Jacke']
  ];
  for (const [optionValue, optionLabel] of options) {
    const label = document.createElement('label');
    label.className = 'carrier-placement-option';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'carrierPlacement';
    input.value = optionValue;
    input.dataset.contextField = 'placement';
    input.checked = optionValue === value;
    const text = document.createElement('span');
    text.textContent = optionLabel;
    label.append(input, text);
    fieldset.append(label);
  }
  return fieldset;
}

export function renderSituationContext(mode, context) {
  const host = document.querySelector('#situationContextFields');
  host.replaceChildren();

  if (mode === 'indoor' || mode === 'sleep') {
    host.append(roomTemperatureField(context.roomTempC));
    if (mode === 'indoor') {
      host.append(selectField('Aktivität', 'activity', [['normal', 'Normal'], ['active', 'Sehr aktiv']], context.activity === 'active' ? 'active' : 'normal'));
    }
    return;
  }

  const title = document.createElement('h3');
  title.textContent = 'Details für diese Situation';
  host.append(title);

  if (mode === 'outdoor') {
    host.append(
      selectField('Aktivität', 'activity', [['normal', 'Normal'], ['active', 'Sehr aktiv']], context.activity === 'active' ? 'active' : 'normal'),
      selectField('Sonne', 'sunExposure', [['shade', 'Schatten'], ['partial', 'Teilweise Sonne'], ['direct', 'Direkte Sonne'], ['unknown', 'Unbekannt']], context.sunExposure, { secondary: true }),
      selectField('Am Boden', 'groundContact', [['none', 'Keiner'], ['standing', 'Steht'], ['walking', 'Läuft']], context.groundContact, { secondary: true })
    );
  }
  if (mode === 'stroller') {
    const behavior = context.strollerState === 'asleep'
      ? 'asleep'
      : context.activity === 'active' ? 'very_active' : 'awake';
    host.append(
      selectField('Baby gerade', 'strollerBehavior', [['asleep', 'Schläft'], ['awake', 'Wach'], ['very_active', 'Sehr aktiv']], behavior),
      selectField('Sonne', 'sunExposure', [['shade', 'Schatten'], ['partial', 'Teilweise Sonne'], ['direct', 'Direkte Sonne'], ['unknown', 'Unbekannt']], context.sunExposure, { secondary: true }),
      selectField('Windschutz am Wagen', 'windProtection', [['none', 'Kein Windschutz'], ['partial', 'Teilweise'], ['good', 'Gut'], ['unknown', 'Unbekannt']], context.windProtection, { secondary: true })
    );
  }
  if (mode === 'carrier') {
    host.append(
      carrierPlacementField(context.placement),
      selectField('Sonne', 'sunExposure', [['shade', 'Schatten'], ['partial', 'Teilweise Sonne'], ['direct', 'Direkte Sonne'], ['unknown', 'Unbekannt']], context.sunExposure, { secondary: true })
    );
  }
  if (mode === 'car') {
    host.append(carSafetySummary());
  }
}
