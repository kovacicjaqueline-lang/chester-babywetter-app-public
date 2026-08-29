const MODE_ORDER = ['outdoor', 'stroller', 'carrier', 'car', 'indoor', 'sleep'];
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
    <a href="#outfitCard"><span class="nav-icon" aria-hidden="true">⌂</span><span>Outfit</span></a>
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

function initSwipeControls() {
  createGestureStatus();
  createBottomNav();

  const situationStrip = document.querySelector('.situation-strip');
  bindHorizontalSwipe(situationStrip, (direction) => {
    cycleSituation(direction);
    flash(situationStrip);
    requestAnimationFrame(() => announce(`Situation: ${document.querySelector('#situationLabel')?.textContent ?? ''}`));
  });

  const outfitCard = document.querySelector('.outfit-card');
  const outfitSwipeSurface = outfitCard?.querySelector(':scope > .warmth-control');
  bindHorizontalSwipe(outfitSwipeSurface, (direction) => {
    triggerWarmth(direction);
    flash(outfitCard);
    announce(direction > 0 ? 'Outfit wärmer angepasst' : 'Outfit dünner angepasst');
  });

  document.querySelectorAll('dialog.sheet-dialog').forEach(bindSheetDismiss);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSwipeControls, { once: true });
else initSwipeControls();
