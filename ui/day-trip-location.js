function ensureStyles() {
  if (document.querySelector('#dayTripLocationStyles')) return;
  const style = document.createElement('style');
  style.id = 'dayTripLocationStyles';
  style.textContent = `
    .trip-location-form{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:8px}.trip-location-field input{width:100%;min-height:44px;border:1px solid var(--line);border-radius:12px;background:#fff;color:var(--ink);padding:0 11px;font:inherit;font-size:.9rem}.trip-location-apply,.trip-location-reset{min-height:44px;border:1px solid var(--line);border-radius:12px;background:#fff;color:var(--accent);padding:0 12px;font-weight:800}.trip-location-apply{background:#fff7f1;border-color:rgba(155,109,85,.36)}.trip-location-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:7px}.trip-location-status{margin:0;color:var(--muted);font-size:.78rem;line-height:1.35}.trip-location-status[data-tone="error"]{color:#8a3d32}.trip-location-status[data-tone="success"]{color:#5b6541}.trip-location-reset{flex:0 0 auto;min-height:36px;padding:0 9px;font-size:.76rem}.trip-location-help{margin:6px 0 0}.trip-result-location{margin:4px 0 0;color:var(--muted);font-size:.78rem;font-weight:700}.trip-generate[aria-disabled="true"]{opacity:.68}
    @media(max-width:430px){.trip-location-form{grid-template-columns:1fr}.trip-location-apply{width:100%}.trip-location-meta{align-items:flex-start;flex-direction:column}.trip-location-reset{min-height:44px}}
  `;
  document.head.append(style);
}

function ensureUi() {
  ensureStyles();
  const builder = document.querySelector('#tripBuilderView');
  const resultHead = document.querySelector('#tripResultView .trip-result-head > div');
  if (!builder || !resultHead) return null;

  let section = document.querySelector('#tripLocationSection');
  if (!section) {
    section = document.createElement('section');
    section.id = 'tripLocationSection';
    section.className = 'trip-builder-section';
    section.setAttribute('aria-labelledby', 'tripLocationHeading');
    section.innerHTML = `
      <h3 id="tripLocationHeading">Ort</h3>
      <form id="tripLocationForm" class="trip-location-form">
        <label class="trip-field trip-location-field" for="tripLocationInput"><span>Ausflugsort</span><input id="tripLocationInput" type="search" autocomplete="address-level2" placeholder="z. B. Wien" aria-describedby="tripLocationStatus tripLocationHelp"></label>
        <button id="tripLocationApplyButton" class="trip-location-apply" type="submit">Wetter laden</button>
      </form>
      <div class="trip-location-meta">
        <p id="tripLocationStatus" class="trip-location-status" role="status" aria-live="polite"></p>
        <button id="tripLocationCurrentButton" class="trip-location-reset" type="button">Aktuellen Wetterort verwenden</button>
      </div>
      <p id="tripLocationHelp" class="trip-section-note trip-location-help">Der Ausflugsort gilt nur für diesen Tagesplan und ändert deinen normalen Wetterort nicht.</p>`;
    const timeSection = builder.querySelector('[aria-labelledby="tripTimeHeading"]');
    builder.insertBefore(section, timeSection ?? builder.querySelector('#tripGenerateButton'));
  }

  let resultLocation = document.querySelector('#tripResultLocation');
  if (!resultLocation) {
    resultLocation = document.createElement('p');
    resultLocation.id = 'tripResultLocation';
    resultLocation.className = 'trip-result-location';
    resultHead.append(resultLocation);
  }

  return {
    section,
    form: document.querySelector('#tripLocationForm'),
    input: document.querySelector('#tripLocationInput'),
    apply: document.querySelector('#tripLocationApplyButton'),
    reset: document.querySelector('#tripLocationCurrentButton'),
    status: document.querySelector('#tripLocationStatus'),
    resultLocation,
    generate: document.querySelector('#tripGenerateButton')
  };
}

export function bindDayTripLocation({
  loadWeatherForLocation,
  getActiveLocation,
  getBaseLocation,
  setTripWeatherOverride,
  clearTripWeatherOverride
}) {
  if (
    typeof loadWeatherForLocation !== 'function'
    || typeof getActiveLocation !== 'function'
    || typeof getBaseLocation !== 'function'
    || typeof setTripWeatherOverride !== 'function'
    || typeof clearTripWeatherOverride !== 'function'
  ) return;

  const entry = document.querySelector('#dayTripPlannerButton');
  const dialog = document.querySelector('#dayTripDialog');
  const ui = ensureUi();
  if (!entry || !dialog || !ui || ui.section.dataset.tripLocationBound === 'true') return;
  ui.section.dataset.tripLocationBound = 'true';

  let activeLocation = null;
  let dirty = false;
  let loading = false;

  const labelFor = (location) => typeof location?.label === 'string' ? location.label : '';
  const setStatus = (text, tone = '') => {
    ui.status.textContent = text;
    if (tone) ui.status.dataset.tone = tone;
    else delete ui.status.dataset.tone;
  };
  const syncGenerateGuard = () => {
    ui.generate.setAttribute('aria-disabled', String(dirty || loading));
  };
  const syncLocationUi = ({ preserveInput = false, statusText = null, statusTone = '' } = {}) => {
    activeLocation = getActiveLocation() ?? getBaseLocation();
    const label = labelFor(activeLocation);
    if (!preserveInput) ui.input.value = label;
    ui.resultLocation.textContent = label ? `Ort: ${label}` : 'Ort nicht verfügbar';
    dirty = ui.input.value.trim() !== label;
    syncGenerateGuard();
    if (statusText !== null) setStatus(statusText, statusTone);
    else setStatus(label ? `Wetterort: ${label}` : 'Bitte einen Ausflugsort eingeben.');
  };
  const setLoading = (value) => {
    loading = value;
    ui.apply.disabled = value;
    ui.reset.disabled = value;
    ui.input.setAttribute('aria-busy', String(value));
    syncGenerateGuard();
  };

  entry.addEventListener('click', () => syncLocationUi());

  ui.input.addEventListener('input', () => {
    const activeLabel = labelFor(activeLocation);
    dirty = ui.input.value.trim() !== activeLabel;
    syncGenerateGuard();
    setStatus(dirty ? 'Ort geändert – zuerst Wetter für diesen Ort laden.' : `Wetterort: ${activeLabel}`);
  });

  ui.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const query = ui.input.value.trim();
    if (query.length < 2) {
      dirty = true;
      syncGenerateGuard();
      setStatus('Bitte mindestens zwei Zeichen für den Ort eingeben.', 'error');
      ui.input.focus();
      return;
    }
    setLoading(true);
    setStatus('Wetter für den Ausflugsort wird geladen …');
    try {
      const result = await loadWeatherForLocation(query);
      if (!result?.location || !result?.weather) throw new Error('Wetter für diesen Ort ist nicht verfügbar.');
      setTripWeatherOverride(result);
      activeLocation = result.location;
      ui.input.value = labelFor(activeLocation);
      dirty = false;
      setLoading(false);
      entry.click();
      setStatus(`Wetter für ${labelFor(activeLocation)} geladen.`, 'success');
    } catch (error) {
      dirty = true;
      setLoading(false);
      syncGenerateGuard();
      setStatus(error?.message || 'Wetter für diesen Ort konnte nicht geladen werden.', 'error');
    }
  });

  ui.reset.addEventListener('click', () => {
    clearTripWeatherOverride();
    activeLocation = getBaseLocation();
    dirty = false;
    entry.click();
    setStatus(`Aktueller Wetterort: ${labelFor(activeLocation)}`, 'success');
  });

  ui.generate.addEventListener('click', (event) => {
    if (!dirty && !loading) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    setStatus(loading ? 'Wetter für den Ausflugsort wird noch geladen …' : 'Bitte zuerst Wetter für den eingegebenen Ort laden.', 'error');
    if (!loading) ui.input.focus();
  }, true);

  syncLocationUi();
}
