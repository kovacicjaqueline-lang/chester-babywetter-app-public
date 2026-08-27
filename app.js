import { createSession, lockItem, nextVisualSeed, recommendOutfit, setWarmthOffset } from './src/index.js';
import { createWeatherService } from './src/weather/index.js';
import { WEATHER_CACHE_MAX_AGE_MINUTES, WEATHER_FRESH_MAX_AGE_MINUTES, assessCachedWeatherSeries, normalizeWeatherBundle } from './src/integration/weather-series.js';
import { APP_VERSION } from './src/version.js';
import { ClothingAssetStore } from './ui/asset-store.js';
import { renderAlternatives, renderCatalog, renderHourly, renderOutfit, renderSituation, renderSituationContext, renderSituationOptions, renderWeather } from './ui/render.js';

const PROFILE_KEY = 'babyweather.v1.profile';
const SETTINGS_KEY = 'babyweather.v1.settings';
const UI_STATE_KEY = 'babyweather.v1.uiState';
const WEATHER_CACHE_KEY = 'babyweather.v1.weatherCache';
const DEMO_MODE = new URLSearchParams(location.search).get('demo') === '1';
const MODES = new Set(['outdoor', 'stroller', 'carrier', 'car', 'sleep']);
const STYLES = new Set(['neutral', 'boy', 'girl']);
const BIASES = new Set(['runs_cool', 'neutral', 'runs_warm']);
const DEFAULT_LOCATION = Object.freeze({ locationId: 'default:salzburg', label: 'Salzburg, Österreich', latitude: 47.8095, longitude: 13.055, timezone: 'Europe/Vienna' });
const DEMO_LOCATIONS = Object.freeze({
  wien: { locationId: 'demo:wien', label: 'Wien, Österreich', latitude: 48.2082, longitude: 16.3738, timezone: 'Europe/Vienna' },
  vienna: { locationId: 'demo:wien', label: 'Wien, Österreich', latitude: 48.2082, longitude: 16.3738, timezone: 'Europe/Vienna' },
  salzburg: DEFAULT_LOCATION,
  linz: { locationId: 'demo:linz', label: 'Linz, Österreich', latitude: 48.3069, longitude: 14.2858, timezone: 'Europe/Vienna' }
});

function nowIso() { return new Date().toISOString(); }
function defaultProfile() {
  const now = nowIso();
  return { profileId: 'baby_local', displayName: 'Baby', birthDate: null, warmthBias: 'neutral', styleTheme: 'neutral', defaultMode: 'stroller', createdAt: now, updatedAt: now };
}
const DEFAULT_CONTEXTS = Object.freeze({
  outdoor: { mode: 'outdoor', plannedMinutes: 60, activity: 'normal', activitySource: 'user', sunExposure: 'shade', groundContact: 'none' },
  stroller: { mode: 'stroller', plannedMinutes: 60, strollerState: 'awake', activity: 'normal', activitySource: 'user', sunExposure: 'shade', windProtection: 'partial' },
  carrier: { mode: 'carrier', plannedMinutes: 60, sunExposure: 'shade', placement: 'over_wearer_outerwear' },
  car: { mode: 'car', plannedMinutes: 30, includeOutdoorTransition: true, outsideTransitionMinutes: 5, cabinTempC: 20, cabinTempSource: 'estimated' },
  sleep: { mode: 'sleep', roomTempC: 18.5 }
});
function sanitizeWeatherCacheMaxAgeMinutes(value) {
  if (!Number.isFinite(value)) return WEATHER_CACHE_MAX_AGE_MINUTES;
  return Math.min(WEATHER_CACHE_MAX_AGE_MINUTES, Math.max(WEATHER_FRESH_MAX_AGE_MINUTES, Math.round(value)));
}
function defaultSettings() { return { defaultMode: 'stroller', temperatureUnit: 'celsius', weatherMode: 'auto_with_override', allowLocation: null, weatherCacheMaxAgeMinutes: WEATHER_CACHE_MAX_AGE_MINUTES }; }
function safeParse(key) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; } }
function loadProfile() {
  const fallback = defaultProfile(); const stored = safeParse(PROFILE_KEY); if (!stored || typeof stored !== 'object') return fallback;
  return { ...fallback, profileId: typeof stored.profileId === 'string' ? stored.profileId : fallback.profileId, displayName: typeof stored.displayName === 'string' ? stored.displayName.slice(0, 40) : null, birthDate: typeof stored.birthDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(stored.birthDate) ? stored.birthDate : null, warmthBias: BIASES.has(stored.warmthBias) ? stored.warmthBias : 'neutral', styleTheme: STYLES.has(stored.styleTheme) ? stored.styleTheme : 'neutral', defaultMode: MODES.has(stored.defaultMode) ? stored.defaultMode : 'stroller', createdAt: typeof stored.createdAt === 'string' ? stored.createdAt : fallback.createdAt, updatedAt: typeof stored.updatedAt === 'string' ? stored.updatedAt : fallback.updatedAt };
}
function loadSettings(profile) {
  const fallback = defaultSettings(); const stored = safeParse(SETTINGS_KEY); if (!stored || typeof stored !== 'object') return { ...fallback, defaultMode: profile.defaultMode };
  return { ...fallback, defaultMode: MODES.has(stored.defaultMode) ? stored.defaultMode : profile.defaultMode, allowLocation: typeof stored.allowLocation === 'boolean' ? stored.allowLocation : null, weatherCacheMaxAgeMinutes: sanitizeWeatherCacheMaxAgeMinutes(stored.weatherCacheMaxAgeMinutes) };
}
function sanitizeContexts(candidate) {
  const contexts = structuredClone(DEFAULT_CONTEXTS); if (!candidate || typeof candidate !== 'object') return contexts;
  for (const mode of MODES) {
    if (!candidate[mode] || typeof candidate[mode] !== 'object') continue; const source = candidate[mode];
    if (mode === 'outdoor') { if (['calm','normal','active'].includes(source.activity)) contexts.outdoor.activity = source.activity; if (['shade','partial','direct','unknown'].includes(source.sunExposure)) contexts.outdoor.sunExposure = source.sunExposure; if (['none','standing','walking'].includes(source.groundContact)) contexts.outdoor.groundContact = source.groundContact; }
    if (mode === 'stroller') { if (['awake','asleep'].includes(source.strollerState)) contexts.stroller.strollerState = source.strollerState; if (['calm','normal','active'].includes(source.activity)) contexts.stroller.activity = source.activity; if (['shade','partial','direct','unknown'].includes(source.sunExposure)) contexts.stroller.sunExposure = source.sunExposure; if (['none','partial','good','unknown'].includes(source.windProtection)) contexts.stroller.windProtection = source.windProtection; }
    if (mode === 'carrier') { if (['shade','partial','direct','unknown'].includes(source.sunExposure)) contexts.carrier.sunExposure = source.sunExposure; if (['under_wearer_outerwear','over_wearer_outerwear'].includes(source.placement)) contexts.carrier.placement = source.placement; }
    if (mode === 'car') { if (Number.isFinite(source.cabinTempC)) contexts.car.cabinTempC = source.cabinTempC; if (['manual','measured','estimated'].includes(source.cabinTempSource)) contexts.car.cabinTempSource = source.cabinTempSource; if (typeof source.includeOutdoorTransition === 'boolean') contexts.car.includeOutdoorTransition = source.includeOutdoorTransition; if (source.outsideTransitionMinutes === null || Number.isFinite(source.outsideTransitionMinutes)) contexts.car.outsideTransitionMinutes = source.outsideTransitionMinutes; }
    if (mode === 'sleep' && (source.roomTempC === null || Number.isFinite(source.roomTempC))) contexts.sleep.roomTempC = source.roomTempC;
  }
  return contexts;
}
const profile = loadProfile(); const settings = loadSettings(profile); const storedUi = safeParse(UI_STATE_KEY);
const state = { profile, settings, mode: MODES.has(storedUi?.mode) ? storedUi.mode : settings.defaultMode, contexts: sanitizeContexts(storedUi?.contexts), visualSeed: Number.isSafeInteger(storedUi?.visualSeed) ? storedUi.visualSeed : 0, location: null, weather: null, runtime: { weatherLoading: true, weatherError: null, weatherCacheStatus: null, weatherCacheAgeMinutes: null }, warmthDirection: 'balanced' };
let session = createSession(`ui:${Date.now()}`); let lastRecommendation = null; let alternativeSlot = null; let toastTimer = null;
const assetStore = new ClothingAssetStore(); const weatherService = createWeatherService({ onStorageError: () => showToast('Standort konnte lokal nicht gespeichert werden.') });
function persistProfile() { state.profile.defaultMode = state.settings.defaultMode; state.profile.updatedAt = nowIso(); localStorage.setItem(PROFILE_KEY, JSON.stringify(state.profile)); }
function persistSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings)); localStorage.setItem(UI_STATE_KEY, JSON.stringify({ mode: state.mode, contexts: state.contexts, visualSeed: state.visualSeed })); }
function cacheWeather(series) { try { localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(series)); } catch { showToast('Wetterdaten konnten nicht lokal gespeichert werden.'); } }
function cachedWeather(location) {
  const options = { location, maxAgeMinutes: state.settings.weatherCacheMaxAgeMinutes };
  const storedAssessment = assessCachedWeatherSeries(safeParse(WEATHER_CACHE_KEY), options);
  const memoryAssessment = assessCachedWeatherSeries(state.weather, options);
  const usable = [storedAssessment, memoryAssessment]
    .filter((assessment) => assessment.series)
    .sort((left, right) => (left.ageMinutes ?? Infinity) - (right.ageMinutes ?? Infinity))[0] ?? null;
  const assessment = usable
    ?? [storedAssessment, memoryAssessment].find((candidate) => candidate.status === 'expired')
    ?? [storedAssessment, memoryAssessment].find((candidate) => candidate.status === 'location_mismatch')
    ?? storedAssessment;
  state.runtime.weatherCacheStatus = assessment.status;
  state.runtime.weatherCacheAgeMinutes = assessment.ageMinutes;
  return assessment.series;
}
function clearCacheRuntime() { state.runtime.weatherCacheStatus = null; state.runtime.weatherCacheAgeMinutes = null; }
function resetSession() { session = createSession(`ui:${Date.now()}:${Math.random().toString(36).slice(2)}`); state.warmthDirection = 'balanced'; }
function requestForCurrentState() { return { requestId: `ui:${state.mode}`, requestedAt: nowIso(), profile: structuredClone(state.profile), context: structuredClone(state.contexts[state.mode]), weather: state.mode === 'sleep' ? null : state.weather, session, neckFeedback: null }; }
function computeRecommendation() {
  try { return recommendOutfit(requestForCurrentState()); } catch (error) {
    state.runtime.weatherError = state.runtime.weatherError ?? error?.message ?? 'Empfehlung nicht verfügbar';
    return { recommendationId: 'ui:blocked', requestId: 'ui:blocked', generatedAt: nowIso(), sessionId: session.sessionId, mode: state.mode, status: 'blocked', phases: [], slots: [], items: [], notices: [], ruleTrace: [], dataQuality: { weatherFreshness: state.weather?.freshness ?? null, missingFields: ['integration'], usedManualWeather: false, usedEstimatedCabinTemperature: false } };
  }
}
function renderCurrentRecommendation() {
  if (!lastRecommendation) return;
  renderOutfit({ recommendation: lastRecommendation, context: state.contexts[state.mode], warmthDirection: state.warmthDirection, styleTheme: state.profile.styleTheme, visualSeed: state.visualSeed }, assetStore);
}
function renderRecommendation() { lastRecommendation = computeRecommendation(); renderCurrentRecommendation(); }
function cacheAgeLabel() {
  const age = state.runtime.weatherCacheAgeMinutes;
  if (!Number.isFinite(age)) return '';
  const rounded = Math.max(0, Math.round(age));
  return rounded < 60 ? `vor ${rounded} Min.` : `vor ${Math.floor(rounded / 60)} Std. ${rounded % 60} Min.`;
}
function updateConnectionBanner() {
  const banner = document.querySelector('#connectionBanner');
  const cacheAge = cacheAgeLabel();
  if (!navigator.onLine) {
    banner.hidden = false;
    if (state.weather) {
      const quality = state.weather.freshness === 'stale' ? 'ältere gespeicherte Wetterdaten' : 'gespeicherte Wetterdaten';
      banner.textContent = `Offline – ${quality}${cacheAge ? ` (${cacheAge})` : ''} werden sichtbar gekennzeichnet weiterverwendet.`;
    } else if (state.runtime.weatherCacheStatus === 'expired') {
      banner.textContent = `Offline – gespeichertes Wetter ist älter als ${state.settings.weatherCacheMaxAgeMinutes} Minuten und wird nicht für die Empfehlung verwendet.`;
    } else if (state.runtime.weatherCacheStatus === 'location_mismatch') {
      banner.textContent = 'Offline – gespeichertes Wetter gehört zu einem anderen Standort und wird nicht verwendet.';
    } else {
      banner.textContent = 'Offline – Wetter kann gerade nicht aktualisiert werden.';
    }
    return;
  }
  if (state.runtime.weatherError) {
    banner.hidden = false;
    if (state.weather) {
      const quality = state.weather.freshness === 'stale' ? 'ältere gespeicherte Daten' : 'gespeicherte Daten';
      banner.textContent = `Wetter-Aktualisierung fehlgeschlagen – ${quality}${cacheAge ? ` (${cacheAge})` : ''} werden verwendet.`;
    } else if (state.runtime.weatherCacheStatus === 'expired') {
      banner.textContent = 'Wetter-Aktualisierung fehlgeschlagen – der vorhandene Wettercache ist zu alt und wird nicht verwendet.';
    } else if (state.runtime.weatherCacheStatus === 'location_mismatch') {
      banner.textContent = 'Wetter-Aktualisierung fehlgeschlagen – für diesen Standort gibt es keinen passenden Cache.';
    } else {
      banner.textContent = 'Wetter nicht verfügbar – Standort ändern oder später erneut versuchen.';
    }
    return;
  }
  banner.hidden = true;
}
function renderAll() { document.body.dataset.styleTheme = state.profile.styleTheme; renderWeather(state.weather, state.location, state.runtime); renderHourly(state.weather); renderSituation(state.mode); renderSituationOptions(state.mode); renderSituationContext(state.mode, state.contexts[state.mode]); renderRecommendation(); renderCatalog(assetStore, state.profile.styleTheme); syncForms(); updateConnectionBanner(); }
function syncForms() { document.querySelector('#profileName').value = state.profile.displayName ?? ''; document.querySelector('#profileBirthDate').value = state.profile.birthDate ?? ''; document.querySelector('#locationInput').value = state.location?.label ?? ''; for (const input of document.querySelectorAll('input[name="warmthBias"]')) input.checked = input.value === state.profile.warmthBias; for (const input of document.querySelectorAll('input[name="styleTheme"]')) input.checked = input.value === state.profile.styleTheme; document.querySelector('#appVersion').textContent = APP_VERSION; }
function showToast(message) { const toast = document.querySelector('#toast'); toast.textContent = message; toast.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; }, 3200); }
function openDialog(id) { const dialog = document.getElementById(id); if (!(dialog instanceof HTMLDialogElement)) return; for (const open of document.querySelectorAll('dialog[open]')) if (open !== dialog) open.close(); if (!dialog.open) dialog.showModal(); }
function closeDialog(id) { const dialog = document.getElementById(id); if (dialog instanceof HTMLDialogElement && dialog.open) dialog.close(); }
async function refreshWeather(location, { persistLocation = true } = {}) {
  state.runtime.weatherLoading = true; state.runtime.weatherError = null; state.location = location; renderWeather(state.weather, state.location, state.runtime); updateConnectionBanner();
  if (!navigator.onLine) { state.weather = cachedWeather(location); state.runtime.weatherLoading = false; state.runtime.weatherError = 'offline'; resetSession(); renderAll(); return; }
  try { const bundle = persistLocation ? await weatherService.useLocation(location, { demoMode: DEMO_MODE }) : await weatherService.loadWeather(location, { demoMode: DEMO_MODE }); state.weather = normalizeWeatherBundle(bundle, location); state.location = state.weather.location; cacheWeather(state.weather); clearCacheRuntime(); }
  catch (error) { state.weather = cachedWeather(location); state.runtime.weatherError = error?.code ?? error?.message ?? 'weather_error'; }
  finally { state.runtime.weatherLoading = false; resetSession(); renderAll(); }
}
async function changeLocation(query) {
  const normalized = String(query ?? '').trim(); if (normalized.length < 2) { showToast('Bitte mindestens zwei Zeichen für den Ort eingeben.'); return false; }
  try { let locationResult; if (DEMO_MODE) { const key = normalized.toLowerCase().split(',')[0].trim(); locationResult = DEMO_LOCATIONS[key] ?? { ...DEFAULT_LOCATION, locationId: `demo:${key}`, label: normalized }; } else { const results = await weatherService.search(normalized, { language: 'de', count: 8 }); locationResult = results[0] ?? null; } if (!locationResult) throw new Error('Kein passender Ort gefunden.'); await refreshWeather(locationResult); showToast(`Wetterort: ${state.location?.label ?? normalized}`); return true; }
  catch (error) { showToast(error?.message || 'Standort konnte nicht geladen werden.'); return false; }
}
function bindGlobalActions() {
  document.addEventListener('click', (event) => {
    const open = event.target.closest('[data-open-dialog]'); if (open) { openDialog(open.dataset.openDialog); return; }
    const close = event.target.closest('[data-close-dialog]'); if (close) { closeDialog(close.dataset.closeDialog); return; }
    const warmth = event.target.closest('[data-warmth]'); if (warmth && !warmth.disabled) { state.warmthDirection = warmth.dataset.warmth; session = setWarmthOffset(session, state.warmthDirection); renderRecommendation(); return; }
    const situation = event.target.closest('[data-situation]'); if (situation && MODES.has(situation.dataset.situation)) { state.mode = situation.dataset.situation; state.settings.defaultMode = state.mode; persistSettings(); persistProfile(); resetSession(); renderSituation(state.mode); renderSituationOptions(state.mode); renderSituationContext(state.mode, state.contexts[state.mode]); renderRecommendation(); return; }
    const outfitCard = event.target.closest('[data-open-alternatives="true"]'); if (outfitCard && lastRecommendation) { alternativeSlot = lastRecommendation.slots.find((slot) => slot.phase === outfitCard.dataset.phase && slot.slot === outfitCard.dataset.slot) ?? null; if (alternativeSlot?.alternatives?.length) { renderAlternatives(alternativeSlot, assetStore, state.profile.styleTheme); openDialog('alternativeDialog'); } return; }
    const alternative = event.target.closest('[data-alternative-item-id]'); if (alternative) { session = lockItem(session, { phase: alternative.dataset.alternativePhase, slot: alternative.dataset.alternativeSlot, itemId: alternative.dataset.alternativeItemId, lockedAt: nowIso() }); closeDialog('alternativeDialog'); renderRecommendation(); showToast('Alternative gewählt – Outfit wurde neu bewertet.'); return; }
    if (event.target.closest('#changeLookButton')) { state.visualSeed = nextVisualSeed(state.visualSeed); persistSettings(); renderCurrentRecommendation(); return; }
    if (event.target.closest('#applySituationButton')) { closeDialog('situationDialog'); showToast(`Situation: ${document.querySelector('#situationLabel').textContent}`); }
  });
}
function bindSituationContext() { document.querySelector('#situationContextFields').addEventListener('change', (event) => { const target = event.target; const field = target.dataset?.contextField; if (!field) return; const context = state.contexts[state.mode]; if (target.type === 'checkbox') context[field] = target.checked; else if (target.type === 'number') context[field] = target.value === '' ? null : Number(target.value); else context[field] = target.value || null; if (field === 'activity') context.activitySource = 'user'; if (field === 'cabinTempC') context.cabinTempSource = 'manual'; persistSettings(); resetSession(); renderRecommendation(); }); }
function bindProfile() { const dialog = document.querySelector('#profileDialog'); dialog.addEventListener('close', () => { if (dialog.returnValue !== 'save') return; const name = document.querySelector('#profileName').value.trim(); const birthDate = document.querySelector('#profileBirthDate').value; const bias = document.querySelector('input[name="warmthBias"]:checked')?.value ?? 'neutral'; state.profile.displayName = name ? name.slice(0,40) : null; state.profile.birthDate = birthDate || null; state.profile.warmthBias = BIASES.has(bias) ? bias : 'neutral'; persistProfile(); resetSession(); renderRecommendation(); showToast('Babyprofil lokal gespeichert.'); }); }
function bindLocation() {
  const form = document.querySelector('#locationForm'); form.addEventListener('submit', async (event) => { event.preventDefault(); const query = document.querySelector('#locationInput').value; const success = await changeLocation(query); if (success) closeDialog('locationDialog'); });
  document.querySelector('#useBrowserLocationButton').addEventListener('click', async () => { if (DEMO_MODE) { await refreshWeather(DEFAULT_LOCATION); closeDialog('locationDialog'); return; } try { state.settings.allowLocation = true; persistSettings(); const bundle = await weatherService.useBrowserLocation(); state.weather = normalizeWeatherBundle(bundle); state.location = state.weather.location; cacheWeather(state.weather); clearCacheRuntime(); resetSession(); renderAll(); closeDialog('locationDialog'); showToast('Aktueller Standort übernommen.'); } catch (error) { state.settings.allowLocation = error?.code === 'geolocation_denied' ? false : state.settings.allowLocation; persistSettings(); showToast(error?.code === 'geolocation_denied' ? 'Standortfreigabe abgelehnt – Ortssuche bleibt verfügbar.' : 'Aktueller Standort konnte nicht ermittelt werden.'); } });
}
function bindStyleSettings() { document.querySelectorAll('input[name="styleTheme"]').forEach((input) => { input.addEventListener('change', () => { if (!input.checked || !STYLES.has(input.value)) return; state.profile.styleTheme = input.value; persistProfile(); renderAll(); showToast('Kleidungsstil gespeichert.'); }); }); }
function exportSettings() { const envelope = { schemaVersion: 1, exportedAt: nowIso(), appVersion: APP_VERSION, payload: { profile: state.profile, settings: state.settings, feedback: [] } }; const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'babywetter-einstellungen.json'; document.body.append(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url); showToast('Einstellungen als JSON exportiert.'); }
async function importSettings(file) { if (!file) return; try { const parsed = JSON.parse(await file.text()); if (parsed?.schemaVersion !== 1 || !parsed?.payload?.profile || !parsed?.payload?.settings) throw new Error('unsupported schema'); const importedProfile = parsed.payload.profile; const importedSettings = parsed.payload.settings; if (!STYLES.has(importedProfile.styleTheme) || !BIASES.has(importedProfile.warmthBias) || !MODES.has(importedSettings.defaultMode)) throw new Error('invalid enum'); state.profile = { ...loadProfile(), ...importedProfile, updatedAt: nowIso() }; state.settings = { ...defaultSettings(), ...importedSettings, weatherCacheMaxAgeMinutes: sanitizeWeatherCacheMaxAgeMinutes(importedSettings.weatherCacheMaxAgeMinutes) }; state.mode = state.settings.defaultMode; persistProfile(); persistSettings(); resetSession(); renderAll(); showToast('Einstellungen importiert.'); } catch { showToast('Diese JSON-Datei konnte nicht importiert werden. Bestehende Einstellungen bleiben erhalten.'); } finally { document.querySelector('#importSettingsInput').value = ''; } }
function bindImportExport() { document.querySelector('#exportSettingsButton').addEventListener('click', exportSettings); document.querySelector('#importSettingsInput').addEventListener('change', (event) => importSettings(event.target.files?.[0])); }
function bindDialogs() { for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); }); }
async function registerServiceWorker() { if (!('serviceWorker' in navigator)) return; try { await navigator.serviceWorker.register('./sw.js'); } catch { } }
async function init() {
  bindGlobalActions(); bindSituationContext(); bindProfile(); bindLocation(); bindStyleSettings(); bindImportExport(); bindDialogs();
  window.addEventListener('online', () => refreshWeather(state.location ?? DEFAULT_LOCATION));
  window.addEventListener('offline', () => { state.weather = cachedWeather(state.location ?? DEFAULT_LOCATION); state.runtime.weatherError = 'offline'; resetSession(); renderAll(); });
  state.location = weatherService.getSavedLocation() ?? DEFAULT_LOCATION; state.weather = cachedWeather(state.location); renderAll(); await assetStore.load(); renderAll(); await refreshWeather(state.location, { persistLocation: true }); registerServiceWorker();
}
init();