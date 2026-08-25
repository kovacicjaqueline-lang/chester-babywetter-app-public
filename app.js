import { ClothingAssetStore } from "./ui/asset-store.js";
import {
  MOCK_CONTEXTS,
  MOCK_HOURLY,
  MOCK_PROFILE,
  MOCK_WEATHER,
  getMockRecommendation
} from "./ui/mock-data.js";
import {
  renderCatalog,
  renderHourly,
  renderOutfit,
  renderSituation,
  renderSituationContext,
  renderSituationOptions,
  renderWeather
} from "./ui/render.js";

const STORAGE_KEY = "babywetter.ui.v2";
const ALLOWED_MODES = new Set(["outdoor", "stroller", "carrier", "car", "sleep"]);
const ALLOWED_WARMTH = new Set(["cooler", "balanced", "warmer"]);
const ALLOWED_STYLES = new Set(["neutral", "soft_blue", "soft_rose", "mixed"]);
const ALLOWED_BIAS = new Set(["runs_cool", "neutral", "runs_warm"]);
const ENUM_FIELDS = {
  activity: new Set(["passive", "normal", "active"]),
  sunExposure: new Set(["shade", "partial", "direct", "unknown"]),
  windProtection: new Set(["none", "partial", "good", "unknown"]),
  externalInsulation: new Set(["none", "light", "medium", "warm"]),
  carrierCover: new Set(["none", "light", "warm"])
};
const NUMBER_FIELDS = new Set(["plannedMinutes", "cabinTempC", "outsideTransitionMinutes", "roomTempC"]);
const BOOLEAN_FIELDS = new Set(["wearerOuterLayerCoversBaby", "includeOutdoorTransition"]);

const defaultState = {
  profile: structuredClone(MOCK_PROFILE),
  location: structuredClone(MOCK_WEATHER.location),
  mode: "stroller",
  warmth: "balanced",
  styleTheme: "neutral",
  contexts: structuredClone(MOCK_CONTEXTS)
};

const assetStore = new ClothingAssetStore();
let state = loadState();
let toastTimer = null;

function sanitizeContext(mode, candidate) {
  const template = structuredClone(MOCK_CONTEXTS[mode]);
  if (!candidate || typeof candidate !== "object") return template;

  for (const key of Object.keys(template)) {
    if (key === "mode") continue;
    const value = candidate[key];
    if (ENUM_FIELDS[key]?.has(value)) template[key] = value;
    if (NUMBER_FIELDS.has(key) && (value === null || Number.isFinite(value))) template[key] = value;
    if (BOOLEAN_FIELDS.has(key) && typeof value === "boolean") template[key] = value;
    if (key === "selectedSleepBagId" && (value === null || typeof value === "string")) template[key] = value || null;
  }
  return template;
}

function sanitizedState(candidate) {
  const next = structuredClone(defaultState);
  if (!candidate || typeof candidate !== "object") return next;

  const profile = candidate.profile && typeof candidate.profile === "object" ? candidate.profile : {};
  next.profile.displayName = typeof profile.displayName === "string" ? profile.displayName.slice(0, 40) : next.profile.displayName;
  next.profile.birthDate = typeof profile.birthDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(profile.birthDate) ? profile.birthDate : null;
  next.profile.warmthBias = ALLOWED_BIAS.has(profile.warmthBias) ? profile.warmthBias : "neutral";

  const candidateLocation = candidate.location;
  if (typeof candidateLocation === "string" && candidateLocation.trim()) {
    next.location = {
      locationId: null,
      label: candidateLocation.trim().slice(0, 80),
      latitude: null,
      longitude: null,
      timezone: "Europe/Vienna"
    };
  } else if (candidateLocation && typeof candidateLocation === "object" && typeof candidateLocation.label === "string") {
    next.location = {
      locationId: typeof candidateLocation.locationId === "string" ? candidateLocation.locationId : null,
      label: candidateLocation.label.trim().slice(0, 80) || next.location.label,
      latitude: Number.isFinite(candidateLocation.latitude) ? candidateLocation.latitude : null,
      longitude: Number.isFinite(candidateLocation.longitude) ? candidateLocation.longitude : null,
      timezone: typeof candidateLocation.timezone === "string" ? candidateLocation.timezone : "Europe/Vienna"
    };
  }

  next.mode = ALLOWED_MODES.has(candidate.mode) ? candidate.mode : next.mode;
  next.warmth = ALLOWED_WARMTH.has(candidate.warmth) ? candidate.warmth : next.warmth;
  next.styleTheme = ALLOWED_STYLES.has(candidate.styleTheme ?? profile.styleTheme) ? (candidate.styleTheme ?? profile.styleTheme) : "neutral";
  next.profile.styleTheme = next.styleTheme;

  for (const mode of ALLOWED_MODES) {
    next.contexts[mode] = sanitizeContext(mode, candidate.contexts?.[mode]);
  }
  return next;
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return structuredClone(defaultState);
    return sanitizedState(JSON.parse(stored));
  } catch {
    return structuredClone(defaultState);
  }
}

function persistState() {
  state.profile.styleTheme = state.styleTheme;
  state.profile.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    showToast("Einstellungen konnten lokal nicht gespeichert werden.");
  }
}

function weatherView() {
  return {
    ...structuredClone(MOCK_WEATHER),
    location: structuredClone(state.location)
  };
}

function hourlyView() {
  return MOCK_HOURLY.map((entry) => ({
    ...structuredClone(entry),
    location: structuredClone(state.location)
  }));
}

function activeRecommendation() {
  return getMockRecommendation(state.mode, state.warmth, state.contexts[state.mode]);
}

function renderRecommendation() {
  renderOutfit({
    recommendation: activeRecommendation(),
    mode: state.mode,
    warmth: state.warmth,
    styleTheme: state.styleTheme
  }, assetStore);
}

function renderAll() {
  document.body.dataset.styleTheme = state.styleTheme;
  renderWeather(weatherView());
  renderHourly(hourlyView());
  renderSituation(state.mode);
  renderSituationOptions(state.mode);
  renderSituationContext(state.mode, state.contexts[state.mode]);
  renderRecommendation();
  renderCatalog(assetStore, state.styleTheme);
  syncForms();
}

function syncForms() {
  document.querySelector("#profileName").value = state.profile.displayName ?? "";
  document.querySelector("#profileBirthDate").value = state.profile.birthDate ?? "";
  document.querySelector("#locationInput").value = state.location.label;

  for (const input of document.querySelectorAll('input[name="warmthBias"]')) {
    input.checked = input.value === state.profile.warmthBias;
  }
  for (const input of document.querySelectorAll('input[name="styleTheme"]')) {
    input.checked = input.value === state.styleTheme;
  }
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2800);
}

function openDialog(id) {
  const target = document.getElementById(id);
  if (!(target instanceof HTMLDialogElement)) return;
  for (const dialog of document.querySelectorAll("dialog[open]")) {
    if (dialog !== target) dialog.close();
  }
  if (!target.open) target.showModal();
}

function closeDialog(id) {
  const target = document.getElementById(id);
  if (target instanceof HTMLDialogElement && target.open) target.close();
}

function updateConnectionState() {
  document.querySelector("#connectionBanner").hidden = navigator.onLine;
}

function bindGlobalActions() {
  document.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-open-dialog]");
    if (openButton) {
      openDialog(openButton.dataset.openDialog);
      return;
    }

    const closeButton = event.target.closest("[data-close-dialog]");
    if (closeButton) {
      closeDialog(closeButton.dataset.closeDialog);
      return;
    }

    const warmthButton = event.target.closest("[data-warmth]");
    if (warmthButton && !warmthButton.disabled && ALLOWED_WARMTH.has(warmthButton.dataset.warmth)) {
      state.warmth = warmthButton.dataset.warmth;
      persistState();
      renderRecommendation();
      return;
    }

    const situationButton = event.target.closest("[data-situation]");
    if (situationButton && ALLOWED_MODES.has(situationButton.dataset.situation)) {
      state.mode = situationButton.dataset.situation;
      state.warmth = "balanced";
      persistState();
      renderSituation(state.mode);
      renderSituationOptions(state.mode);
      renderSituationContext(state.mode, state.contexts[state.mode]);
      renderRecommendation();
      return;
    }

    if (event.target.closest("#applySituationButton")) {
      closeDialog("situationDialog");
      showToast(`Situation: ${document.querySelector("#situationLabel").textContent}`);
    }
  });
}

function bindSituationContext() {
  const host = document.querySelector("#situationContextFields");
  host.addEventListener("change", (event) => {
    const target = event.target;
    const field = target.dataset?.contextField;
    if (!field) return;

    const context = state.contexts[state.mode];
    if (target.type === "checkbox") {
      context[field] = target.checked;
    } else if (target.type === "number") {
      context[field] = target.value === "" ? null : Number(target.value);
    } else {
      context[field] = target.value || null;
    }

    state.warmth = "balanced";
    persistState();
    renderRecommendation();
  });
}

function bindProfile() {
  const dialog = document.querySelector("#profileDialog");
  dialog.addEventListener("close", () => {
    if (dialog.returnValue !== "save") return;
    const name = document.querySelector("#profileName").value.trim();
    const birthDate = document.querySelector("#profileBirthDate").value;
    const bias = document.querySelector('input[name="warmthBias"]:checked')?.value ?? "neutral";
    state.profile.displayName = name || null;
    state.profile.birthDate = birthDate || null;
    state.profile.warmthBias = ALLOWED_BIAS.has(bias) ? bias : "neutral";
    persistState();
    showToast("Babyprofil lokal gespeichert.");
  });
}

function bindLocation() {
  const dialog = document.querySelector("#locationDialog");
  dialog.addEventListener("close", () => {
    if (dialog.returnValue !== "save") return;
    const location = document.querySelector("#locationInput").value.trim();
    if (!location) {
      showToast("Bitte einen Ort oder eine PLZ eingeben.");
      return;
    }
    state.location = {
      locationId: null,
      label: location.slice(0, 80),
      latitude: null,
      longitude: null,
      timezone: "Europe/Vienna"
    };
    persistState();
    renderWeather(weatherView());
    renderHourly(hourlyView());
    showToast("Ort übernommen – Wetter bleibt im UI-Branch Mock.");
  });
}

function bindStyleSettings() {
  document.querySelectorAll('input[name="styleTheme"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked || !ALLOWED_STYLES.has(input.value)) return;
      state.styleTheme = input.value;
      persistState();
      renderAll();
      showToast("Kleidungsstil gespeichert.");
    });
  });
}

function exportSettings() {
  const envelope = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    payload: state
  };
  const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "babywetter-einstellungen.json";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  showToast("Einstellungen als JSON exportiert.");
}

async function importSettings(file) {
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (parsed?.schemaVersion !== 1 || !parsed?.payload) throw new Error("unsupported schema");
    state = sanitizedState(parsed.payload);
    persistState();
    renderAll();
    showToast("Einstellungen importiert.");
  } catch {
    showToast("Diese JSON-Datei konnte nicht importiert werden.");
  } finally {
    document.querySelector("#importSettingsInput").value = "";
  }
}

function bindImportExport() {
  document.querySelector("#exportSettingsButton").addEventListener("click", exportSettings);
  document.querySelector("#importSettingsInput").addEventListener("change", (event) => {
    importSettings(event.target.files?.[0]);
  });
}

function bindDialogBackdropClose() {
  for (const dialog of document.querySelectorAll("dialog")) {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  }
}

async function init() {
  bindGlobalActions();
  bindSituationContext();
  bindProfile();
  bindLocation();
  bindStyleSettings();
  bindImportExport();
  bindDialogBackdropClose();
  window.addEventListener("online", updateConnectionState);
  window.addEventListener("offline", updateConnectionState);
  updateConnectionState();
  renderAll();

  await assetStore.load();
  renderRecommendation();
  renderCatalog(assetStore, state.styleTheme);
}

init();
