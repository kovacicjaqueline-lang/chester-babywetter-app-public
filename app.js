import { ClothingAssetStore } from "./ui/asset-store.js";
import { MOCK_PROFILE, MOCK_WEATHER } from "./ui/mock-data.js";
import {
  renderCatalog,
  renderHourly,
  renderOutfit,
  renderSituation,
  renderSituationOptions,
  renderWeather
} from "./ui/render.js";

const STORAGE_KEY = "babywetter.ui.v1";
const ALLOWED_MODES = new Set(["outdoor", "stroller", "carrier", "car", "sleep"]);
const ALLOWED_WARMTH = new Set(["cooler", "balanced", "warmer"]);
const ALLOWED_STYLES = new Set(["neutral", "soft_blue", "soft_rose", "mixed"]);
const ALLOWED_BIAS = new Set(["runs_cool", "neutral", "runs_warm"]);

const defaultState = {
  profile: { ...MOCK_PROFILE },
  location: MOCK_WEATHER.location,
  mode: "stroller",
  warmth: "balanced",
  styleTheme: "neutral"
};

const assetStore = new ClothingAssetStore();
let state = loadState();
let toastTimer = null;

function sanitizedState(candidate) {
  const next = structuredClone(defaultState);
  if (!candidate || typeof candidate !== "object") return next;

  const profile = candidate.profile && typeof candidate.profile === "object" ? candidate.profile : {};
  next.profile.displayName = typeof profile.displayName === "string" ? profile.displayName.slice(0, 40) : next.profile.displayName;
  next.profile.birthDate = typeof profile.birthDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(profile.birthDate) ? profile.birthDate : null;
  next.profile.warmthBias = ALLOWED_BIAS.has(profile.warmthBias) ? profile.warmthBias : "neutral";

  next.location = typeof candidate.location === "string" && candidate.location.trim() ? candidate.location.trim().slice(0, 80) : next.location;
  next.mode = ALLOWED_MODES.has(candidate.mode) ? candidate.mode : next.mode;
  next.warmth = ALLOWED_WARMTH.has(candidate.warmth) ? candidate.warmth : next.warmth;
  next.styleTheme = ALLOWED_STYLES.has(candidate.styleTheme ?? profile.styleTheme) ? (candidate.styleTheme ?? profile.styleTheme) : "neutral";
  next.profile.styleTheme = next.styleTheme;
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    showToast("Einstellungen konnten lokal nicht gespeichert werden.");
  }
}

function weatherView() {
  return {
    ...MOCK_WEATHER,
    location: state.location,
    hourly: MOCK_WEATHER.hourly.map((entry) => ({ ...entry }))
  };
}

function renderAll() {
  document.body.dataset.styleTheme = state.styleTheme;
  renderWeather(weatherView());
  renderHourly(weatherView());
  renderSituation(state.mode);
  renderSituationOptions(state.mode);
  renderOutfit(state, assetStore);
  renderCatalog(assetStore, state.styleTheme);
  syncForms();
}

function syncForms() {
  document.querySelector("#profileName").value = state.profile.displayName ?? "";
  document.querySelector("#profileBirthDate").value = state.profile.birthDate ?? "";
  document.querySelector("#locationInput").value = state.location;

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
    if (warmthButton && ALLOWED_WARMTH.has(warmthButton.dataset.warmth)) {
      state.warmth = warmthButton.dataset.warmth;
      persistState();
      renderOutfit(state, assetStore);
      return;
    }

    const situationButton = event.target.closest("[data-situation]");
    if (situationButton && ALLOWED_MODES.has(situationButton.dataset.situation)) {
      state.mode = situationButton.dataset.situation;
      state.warmth = "balanced";
      persistState();
      renderSituation(state.mode);
      renderSituationOptions(state.mode);
      renderOutfit(state, assetStore);
      closeDialog("situationDialog");
      showToast(`Situation: ${situationButton.querySelector("strong")?.textContent ?? "geändert"}`);
    }
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
    state.location = location.slice(0, 80);
    persistState();
    renderWeather(weatherView());
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
  renderOutfit(state, assetStore);
  renderCatalog(assetStore, state.styleTheme);
}

init();
