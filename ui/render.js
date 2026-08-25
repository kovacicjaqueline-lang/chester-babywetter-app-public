import { CLOTHING_LABELS, MOCK_CATALOG_IDS, MOCK_SITUATIONS } from "./mock-data.js";

function clothingMeta(itemId) {
  return CLOTHING_LABELS[itemId] ?? { label: itemId.replaceAll("_", " "), role: "Kleidungsstück" };
}

function imageFallback(shell, label) {
  shell.replaceChildren();
  const fallback = document.createElement("div");
  fallback.className = "asset-placeholder";
  fallback.textContent = `Bild aus Asset-Manifest: ${label}`;
  shell.append(fallback);
}

function clothingCard(itemId, assetStore, styleTheme) {
  const meta = clothingMeta(itemId);
  const article = document.createElement("article");
  article.className = "clothing-card";

  const shell = document.createElement("div");
  shell.className = "clothing-image-shell";
  const asset = assetStore.resolve(itemId, styleTheme);

  if (asset) {
    const image = document.createElement("img");
    image.src = asset.src;
    image.alt = asset.alt || `${meta.label} – Kleidungsstück`;
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", () => imageFallback(shell, meta.label), { once: true });
    shell.append(image);
  } else {
    imageFallback(shell, meta.label);
  }

  const name = document.createElement("p");
  name.className = "clothing-name";
  name.textContent = meta.label;
  const role = document.createElement("p");
  role.className = "clothing-role";
  role.textContent = meta.role;

  article.append(shell, name, role);
  return article;
}

export function renderWeather(weather) {
  document.querySelector("#locationLabel").textContent = weather.location;
  document.querySelector("#temperatureValue").textContent = `${Math.round(weather.temperatureC)}°`;
  document.querySelector("#weatherSymbol").textContent = weather.symbol;
  document.querySelector("#weatherDescription").textContent = weather.description;

  const facts = document.querySelector("#weatherFacts");
  facts.replaceChildren();
  const rows = [
    ["Gefühlt", `${Math.round(weather.apparentC)}°`],
    ["Wind", `${weather.windKmh} km/h`],
    ["Regen", `${weather.rainPct} %`],
    ["UV", String(weather.uvIndex)]
  ];
  for (const [label, value] of rows) {
    const row = document.createElement("div");
    row.className = "weather-fact";
    const name = document.createElement("span");
    name.textContent = label;
    const strong = document.createElement("strong");
    strong.textContent = value;
    row.append(name, strong);
    facts.append(row);
  }
}

export function renderHourly(weather) {
  const container = document.querySelector("#hourlyForecast");
  container.replaceChildren();
  for (const hour of weather.hourly) {
    const card = document.createElement("div");
    card.className = "hour-card";
    const time = document.createElement("span");
    time.textContent = hour.time;
    const symbol = document.createElement("span");
    symbol.className = "hour-symbol";
    symbol.setAttribute("aria-hidden", "true");
    symbol.textContent = hour.symbol;
    const temp = document.createElement("strong");
    temp.textContent = `${hour.tempC}°`;
    const rain = document.createElement("small");
    rain.textContent = `Regen ${hour.rainPct}%`;
    card.append(time, symbol, temp, rain);
    container.append(card);
  }
}

export function renderSituation(mode) {
  const config = MOCK_SITUATIONS[mode];
  document.querySelector("#situationLabel").textContent = config.label;
  document.querySelector("#situationIcon").textContent = config.icon;
}

export function renderOutfit({ mode, warmth, styleTheme }, assetStore) {
  const config = MOCK_SITUATIONS[mode];
  const grid = document.querySelector("#outfitGrid");
  grid.replaceChildren(...config.outfits[warmth].map((id) => clothingCard(id, assetStore, styleTheme)));
  document.querySelector("#outfitReason").textContent = config.reason;

  const pill = document.querySelector("#confidencePill");
  pill.textContent = warmth === "balanced" ? "Mock · passend" : warmth === "warmer" ? "Mock · wärmer" : "Mock · dünner";

  for (const button of document.querySelectorAll("[data-warmth]")) {
    const active = button.dataset.warmth === warmth;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }

  const notice = document.querySelector("#safetyNotice");
  if (config.safety) {
    notice.hidden = false;
    notice.replaceChildren();
    const marker = document.createElement("span");
    marker.setAttribute("aria-hidden", "true");
    marker.textContent = "!";
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = config.safety.title;
    const text = document.createElement("p");
    text.textContent = config.safety.text;
    copy.append(title, text);
    notice.append(marker, copy);
  } else {
    notice.hidden = true;
    notice.replaceChildren();
  }

  document.querySelector("#assetNotice").hidden = assetStore.status === "ready";
}

export function renderSituationOptions(selectedMode) {
  const container = document.querySelector("#situationOptions");
  container.replaceChildren();
  for (const [mode, config] of Object.entries(MOCK_SITUATIONS)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `situation-option${mode === selectedMode ? " is-selected" : ""}`;
    button.dataset.situation = mode;
    button.setAttribute("aria-pressed", String(mode === selectedMode));

    const icon = document.createElement("span");
    icon.className = "option-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = config.icon;
    const copy = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = config.label;
    const sub = document.createElement("small");
    sub.textContent = config.short;
    copy.append(title, sub);
    const check = document.createElement("span");
    check.setAttribute("aria-hidden", "true");
    check.textContent = mode === selectedMode ? "✓" : "›";
    button.append(icon, copy, check);
    container.append(button);
  }
}

export function renderCatalog(assetStore, styleTheme) {
  const container = document.querySelector("#catalogGrid");
  container.replaceChildren(...MOCK_CATALOG_IDS.map((id) => clothingCard(id, assetStore, styleTheme)));
}
