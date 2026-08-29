import { getHourlySelectionSnapshot, setHourlySelectionStart } from '../src/integration/hourly-selection.js';

const MODE_ORDER = ['outdoor', 'stroller', 'carrier', 'car', 'indoor', 'sleep'];
const WEATHER_SELECTION_MODES = new Set(['outdoor', 'stroller', 'carrier', 'car']);
const HORIZONTAL_THRESHOLD = 54;
const SHEET_CLOSE_THRESHOLD = 86;

function selectedSituationMode() {
  return document.querySelector('#situationOptions [data-situation][aria-pressed="true"]')?.dataset.situation ?? null;
}

function flash(element) {
  element.classList.add('is-swipe-changing');
  window.setTimeout(() => element.classList.remove('is-swipe-changing'), 180);
}

function cycleSituation(direction) {
  const current = selectedSituationMode();
  const index = Math.max(0, MODE_ORDER.indexOf(current));
  const nextIndex = (index + direction + MODE_ORDER.length) % MODE_ORDER.length;
  const next = document.querySelector(`#situationOptions [data-situation="${MODE_ORDER[nextIndex]}"]`);
  next?.click();
}

function triggerWarmth(direction) {
  const value = direction > 0 ? 'warmer' : 'cooler';
  const button = document.querySelector(`[data-warmth="${value}"]`);
  if (button && !button.disabled) button.click();
}

function bindHorizontalSwipe(element, onSwipe) {
  if (!element) return;
  let start = null;

  element.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    start = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
  });

  element.addEventListener('pointerup', (event) => {
    if (!start || start.pointerId !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    start = null;
    if (Math.abs(dx) < HORIZONTAL_THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.35) return;
    onSwipe(dx < 0 ? 1 : -1);
  });

  element.addEventListener('pointercancel', () => { start = null; });
}

function bindSheetDismiss(dialog) {
  const header = dialog.querySelector('.sheet-header');
  if (!header) return;
  let start = null;

  header.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button, input, select, textarea, a')) return;
    start = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
  });

  header.addEventListener('pointerup', (event) => {
    if (!start || start.pointerId !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    start = null;
    if (dy > SHEET_CLOSE_THRESHOLD && dy > Math.abs(dx) * 1.25) dialog.close();
  });

  header.addEventListener('pointercancel', () => { start = null; });
}

function createBottomNav() {
  if (document.querySelector('.bottom-nav')) return;
  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';
  nav.setAttribute('aria-label', 'Schnellnavigation');
  nav.innerHTML = `
    <a href="#outfitHeading"><span class="nav-icon" aria-hidden="true">⌂</span><span>Outfit</span></a>
    <button type="button" data-open-dialog="situationDialog"><span class="nav-icon" aria-hidden="true">◌</span><span>Situation</span></button>
    <button type="button" data-open-dialog="catalogDialog"><span class="nav-icon" aria-hidden="true">▦</span><span>Kleidung</span></button>
    <button type="button" data-open-dialog="settingsDialog"><span class="nav-icon" aria-hidden="true">•••</span><span>Mehr</span></button>`;
  document.body.append(nav);
}

function createGestureStatus() {
  if (document.querySelector('#gestureStatus')) return;
  const status = document.createElement('div');
  status.id = 'gestureStatus';
  status.className = 'visually-hidden';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  document.body.append(status);
}

function announce(text) {
  const host = document.querySelector('#gestureStatus');
  if (!host) return;
  host.textContent = '';
  requestAnimationFrame(() => { host.textContent = text; });
}

function weatherIcon(code, isDay) {
  if ([95, 96, 99].includes(code)) return '⛈';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return '🌧';
  if ([45, 48].includes(code)) return '🌫';
  if (code === 0) return isDay === false ? '☾' : '☀';
  if ([1, 2].includes(code)) return '⛅';
  return '☁';
}

function formattedHour(value) {
  if (!value) return 'Jetzt';
  return new Intl.DateTimeFormat('de-AT', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function ensureHourlySelectionStyles() {
  if (document.querySelector('#hourlySelectionStyles')) return;
  const style = document.createElement('style');
  style.id = 'hourlySelectionStyles';
  style.textContent = `
    #hourlyForecast.hourly-scroll--selectable { grid-auto-columns: 72px; gap: 8px; padding: 2px 0 7px; }
    .hour-choice { width: 100%; min-height: 72px; padding: 7px 4px; border: 1px solid transparent; border-radius: 14px; background: rgba(255,255,255,.64); color: var(--ink); scroll-snap-align: start; display: grid; justify-items: center; align-content: center; gap: 3px; appearance: none; }
    .hour-choice .hour-symbol { font-size: 1.1rem; }
    .hour-choice strong { font-size: .8rem; }
    .hour-choice small { color: var(--muted); font-size: .56rem; }
    .hour-choice.is-selected { border-color: rgba(155,109,85,.55); background: #fff7f1; box-shadow: 0 0 0 2px rgba(155,109,85,.10); }
    .hour-choice.is-selected > span:first-child { color: var(--accent); font-weight: 820; }
    .hour-choice:disabled { cursor: default; opacity: .52; }
    .recommendation-time-label { margin: 6px 0 0; color: var(--accent); font-size: .72rem; font-weight: 780; }
  `;
  document.head.append(style);
}

function ensureRecommendationTimeLabel() {
  let label = document.querySelector('#outfitTimeLabel');
  if (label) return label;
  const heading = document.querySelector('.outfit-card > .section-heading');
  if (!heading) return null;
  label = document.createElement('p');
  label.id = 'outfitTimeLabel';
  label.className = 'recommendation-time-label';
  label.setAttribute('aria-live', 'polite');
  heading.insertAdjacentElement('afterend', label);
  return label;
}

function updateRecommendationTime(snapshot) {
  const heading = document.querySelector('#outfitHeading');
  const label = ensureRecommendationTimeLabel();
  if (!heading || !label) return;
  const weatherDriven = WEATHER_SELECTION_MODES.has(snapshot.mode);
  label.hidden = !weatherDriven;
  if (!weatherDriven) {
    heading.textContent = 'So passt es jetzt';
    return;
  }
  heading.textContent = snapshot.selectedTime ? 'So passt es' : 'So passt es jetzt';
  label.textContent = snapshot.selectedTime ? `Für ${formattedHour(snapshot.selectedTime)}` : 'Für jetzt';
}

function hourlyChoice(option, snapshot, disabled) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `hour-choice${option.time === snapshot.selectedTime ? ' is-selected' : ''}`;
  button.dataset.hourlyChoice = option.kind;
  if (option.time) button.dataset.hourlyStartTime = option.time;
  button.disabled = disabled;
  button.setAttribute('aria-pressed', String(option.time === snapshot.selectedTime));

  const time = document.createElement('span');
  time.textContent = formattedHour(option.time);
  const icon = document.createElement('span');
  icon.className = 'hour-symbol';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = weatherIcon(option.point.weatherCode, option.point.isDay);
  const temp = document.createElement('strong');
  temp.textContent = `${Math.round(option.point.airTempC)}°`;
  const rain = document.createElement('small');
  rain.textContent = option.point.precipProbabilityPct == null ? 'Regen –' : `Regen ${Math.round(option.point.precipProbabilityPct)}%`;
  button.setAttribute('aria-label', `${formattedHour(option.time)}, ${Math.round(option.point.airTempC)} Grad, ${rain.textContent}`);
  button.append(time, icon, temp, rain);
  return button;
}

function renderHourlySelection(host) {
  const snapshot = getHourlySelectionSnapshot();
  updateRecommendationTime(snapshot);
  if (!WEATHER_SELECTION_MODES.has(snapshot.mode)) {
    host.classList.remove('hourly-scroll--selectable');
    host.setAttribute('aria-label', 'Stündliche Wettervorschau');
    return;
  }
  if (!snapshot.options.length) return;
  host.classList.add('hourly-scroll--selectable');
  host.setAttribute('aria-label', 'Stündliche Wettervorschau, Zeitpunkt für Empfehlung wählen');
  host.replaceChildren(...snapshot.options.map((option) => hourlyChoice(option, snapshot, false)));
}

function triggerRecommendationRecalculation() {
  const activeSituation = document.querySelector('#situationOptions [data-situation][aria-pressed="true"]');
  activeSituation?.click();
}

function bindHourlySelection() {
  const host = document.querySelector('#hourlyForecast');
  if (!host) return;
  ensureHourlySelectionStyles();
  ensureRecommendationTimeLabel();

  host.addEventListener('click', (event) => {
    const choice = event.target.closest('[data-hourly-choice]');
    if (!(choice instanceof HTMLButtonElement) || choice.disabled) return;
    const next = choice.dataset.hourlyChoice === 'now' ? null : choice.dataset.hourlyStartTime;
    if (!setHourlySelectionStart(next)) return;
    announce(next ? `Outfit für ${formattedHour(next)} wird berechnet` : 'Outfit für jetzt wird berechnet');
    triggerRecommendationRecalculation();
  });

  const observer = new MutationObserver(() => {
    const hasAppRenderedCards = [...host.children].some((child) => !child.matches('[data-hourly-choice]'));
    if (hasAppRenderedCards || !host.children.length) renderHourlySelection(host);
  });
  observer.observe(host, { childList: true });
  renderHourlySelection(host);
}

function initSwipeControls() {
  createGestureStatus();
  createBottomNav();
  bindHourlySelection();

  const situationStrip = document.querySelector('.situation-strip');
  bindHorizontalSwipe(situationStrip, (direction) => {
    cycleSituation(direction);
    flash(situationStrip);
    requestAnimationFrame(() => announce(`Situation: ${document.querySelector('#situationLabel')?.textContent ?? ''}`));
  });

  const outfitCard = document.querySelector('.outfit-card');
  const outfitSwipeSurface = outfitCard?.querySelector(':scope > .section-heading');
  bindHorizontalSwipe(outfitSwipeSurface, (direction) => {
    triggerWarmth(direction);
    flash(outfitCard);
    announce(direction > 0 ? 'Outfit wärmer angepasst' : 'Outfit dünner angepasst');
  });

  document.querySelectorAll('dialog.sheet-dialog').forEach(bindSheetDismiss);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSwipeControls, { once: true });
else initSwipeControls();
