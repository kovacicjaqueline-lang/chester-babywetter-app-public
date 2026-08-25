import {
  CLOTHING_LABELS,
  MOCK_CATALOG_IDS,
  MOCK_HOURLY_UI,
  MOCK_NOTICE_UI,
  MOCK_UI_COPY,
  MOCK_WEATHER_UI
} from "./mock-data.js";

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

function localHour(isoString) {
  const match = isoString.match(/T(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "–";
}

export function renderWeather(weather) {
  document.querySelector("#locationLabel").textContent = weather.location.label;
  document.querySelector("#temperatureValue").textContent = `${Math.round(weather.airTempC)}°`;
  document.querySelector("#weatherSymbol").textContent = MOCK_WEATHER_UI.symbol;
  document.querySelector("#weatherDescription").textContent = MOCK_WEATHER_UI.description;

  const facts = document.querySelector("#weatherFacts");
  facts.replaceChildren();
  const rows = [
    ["Gefühlt", weather.apparentTempC == null ? "–" : `${Math.round(weather.apparentTempC)}°`],
    ["Wind", weather.windSpeedKmh == null ? "–" : `${weather.windSpeedKmh} km/h`],
    ["Regen", weather.precipProbabilityPct == null ? "–" : `${weather.precipProbabilityPct} %`],
    ["UV", weather.uvIndex == null ? "–" : String(weather.uvIndex)]
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

export function renderHourly(hourly) {
  const container = document.querySelector("#hourlyForecast");
  container.replaceChildren();
  for (const hour of hourly) {
    const card = document.createElement("div");
    card.className = "hour-card";
    const time = document.createElement("span");
    time.textContent = localHour(hour.observedAt);
    const symbol = document.createElement("span");
    symbol.className = "hour-symbol";
    symbol.setAttribute("aria-hidden", "true");
    symbol.textContent = MOCK_HOURLY_UI[hour.snapshotId]?.symbol ?? "☁️";
    const temp = document.createElement("strong");
    temp.textContent = `${Math.round(hour.airTempC)}°`;
    const rain = document.createElement("small");
    rain.textContent = hour.precipProbabilityPct == null ? "Regen –" : `Regen ${hour.precipProbabilityPct}%`;
    card.append(time, symbol, temp, rain);
    container.append(card);
  }
}

export function renderSituation(mode) {
  const config = MOCK_UI_COPY[mode];
  document.querySelector("#situationLabel").textContent = config.label;
  document.querySelector("#situationIcon").textContent = config.icon;
}

function renderEmptyOutfit(grid, recommendation) {
  const message = document.createElement("div");
  message.className = "outfit-empty";
  const strong = document.createElement("strong");
  const text = document.createElement("p");
  if (recommendation.status === "blocked") {
    strong.textContent = "Noch keine sichere Empfehlung";
    text.textContent = "Ergänze die fehlenden Angaben in der Situation. Die App erfindet dafür keine Kleidungskombination.";
  } else {
    strong.textContent = "Empfehlung noch unvollständig";
    text.textContent = "Die vorhandenen Angaben reichen noch nicht für eine konkrete Kombination.";
  }
  message.append(strong, text);
  grid.append(message);
}

function renderNotices(recommendation) {
  const noticeHost = document.querySelector("#safetyNotice");
  const notices = recommendation.notices.filter((entry) => entry.code !== "CHECK_NECK");
  noticeHost.replaceChildren();
  noticeHost.hidden = notices.length === 0;

  for (const notice of notices) {
    const item = document.createElement("div");
    item.className = `notice-row notice-row--${notice.severity}`;
    const marker = document.createElement("span");
    marker.className = "notice-marker";
    marker.setAttribute("aria-hidden", "true");
    marker.textContent = notice.severity === "hard_rule" ? "!" : "✦";
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = MOCK_NOTICE_UI[notice.code]?.title ?? notice.code;
    const text = document.createElement("p");
    text.textContent = MOCK_NOTICE_UI[notice.code]?.text ?? "";
    copy.append(title, text);
    item.append(marker, copy);
    noticeHost.append(item);
  }
}

export function renderOutfit({ recommendation, mode, warmth, styleTheme }, assetStore) {
  const config = MOCK_UI_COPY[mode];
  const grid = document.querySelector("#outfitGrid");
  grid.replaceChildren();

  if (recommendation.items.length) {
    grid.append(...recommendation.items.map((entry) => clothingCard(entry.itemId, assetStore, styleTheme)));
  } else {
    renderEmptyOutfit(grid, recommendation);
  }

  document.querySelector("#outfitReason").textContent = config.reason;

  const pill = document.querySelector("#confidencePill");
  const statusLabel = recommendation.status === "ready"
    ? warmth === "balanced" ? "Mock · passend" : warmth === "warmer" ? "Mock · wärmer" : "Mock · dünner"
    : recommendation.status === "partial" ? "Mock · teilweise" : "Mock · Angaben fehlen";
  pill.textContent = statusLabel;
  pill.dataset.status = recommendation.status;

  const warmthDisabled = recommendation.status !== "ready";
  for (const button of document.querySelectorAll("[data-warmth]")) {
    const active = button.dataset.warmth === warmth;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
    button.disabled = warmthDisabled;
  }

  renderNotices(recommendation);
  document.querySelector("#assetNotice").hidden = assetStore.status !== "missing";
}

export function renderSituationOptions(selectedMode) {
  const container = document.querySelector("#situationOptions");
  container.replaceChildren();
  for (const [mode, config] of Object.entries(MOCK_UI_COPY)) {
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

function selectField(labelText, field, options, value) {
  const label = document.createElement("label");
  label.className = "field compact-field";
  label.append(document.createTextNode(labelText));
  const select = document.createElement("select");
  select.dataset.contextField = field;
  for (const [optionValue, optionLabel] of options) {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionLabel;
    option.selected = optionValue === value;
    select.append(option);
  }
  label.append(select);
  return label;
}

function numberField(labelText, field, value, min, max, suffix) {
  const label = document.createElement("label");
  label.className = "field compact-field";
  label.append(document.createTextNode(labelText));
  const row = document.createElement("span");
  row.className = "input-with-suffix";
  const input = document.createElement("input");
  input.type = "number";
  input.inputMode = "decimal";
  input.min = String(min);
  input.max = String(max);
  input.step = "0.5";
  input.dataset.contextField = field;
  input.value = value ?? "";
  const unit = document.createElement("span");
  unit.textContent = suffix;
  row.append(input, unit);
  label.append(row);
  return label;
}

function checkboxField(labelText, field, checked) {
  const label = document.createElement("label");
  label.className = "check-field";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.dataset.contextField = field;
  input.checked = Boolean(checked);
  label.append(input, document.createTextNode(labelText));
  return label;
}

export function renderSituationContext(mode, context) {
  const host = document.querySelector("#situationContextFields");
  host.replaceChildren();

  const title = document.createElement("h3");
  title.textContent = "Details für diese Situation";
  host.append(title);

  if (mode === "outdoor") {
    host.append(
      selectField("Aktivität", "activity", [["passive", "Ruhig"], ["normal", "Normal"], ["active", "Aktiv"]], context.activity),
      selectField("Sonne", "sunExposure", [["shade", "Schatten"], ["partial", "Teilweise Sonne"], ["direct", "Direkte Sonne"], ["unknown", "Unbekannt"]], context.sunExposure)
    );
  }

  if (mode === "stroller") {
    host.append(
      selectField("Sonne", "sunExposure", [["shade", "Schatten"], ["partial", "Teilweise Sonne"], ["direct", "Direkte Sonne"], ["unknown", "Unbekannt"]], context.sunExposure),
      selectField("Windschutz", "windProtection", [["none", "Kein Windschutz"], ["partial", "Teilweise"], ["good", "Gut"], ["unknown", "Unbekannt"]], context.windProtection),
      selectField("Fußsack / externe Isolation", "externalInsulation", [["none", "Keine"], ["light", "Leicht"], ["medium", "Mittel"], ["warm", "Warm"]], context.externalInsulation)
    );
    const note = document.createElement("p");
    note.className = "dialog-note situation-note";
    note.textContent = "Bei Sonne Sonnensegel oder Parasol verwenden – nicht mit Decke oder Mulltuch abdecken.";
    host.append(note);
  }

  if (mode === "carrier") {
    host.append(
      selectField("Sonne", "sunExposure", [["shade", "Schatten"], ["partial", "Teilweise Sonne"], ["direct", "Direkte Sonne"], ["unknown", "Unbekannt"]], context.sunExposure),
      selectField("Tragecover", "carrierCover", [["none", "Keines"], ["light", "Leicht"], ["warm", "Warm"]], context.carrierCover),
      checkboxField("Jacke der tragenden Person bedeckt das Baby", "wearerOuterLayerCoversBaby", context.wearerOuterLayerCoversBaby)
    );
  }

  if (mode === "car") {
    const estimate = document.createElement("div");
    estimate.className = "estimate-card";
    const strong = document.createElement("strong");
    strong.textContent = `Innenraum geschätzt: ${context.cabinTempC ?? "–"} °C`;
    const text = document.createElement("p");
    text.textContent = "Die spätere Fachlogik schätzt die Innenraumtemperatur automatisch. Im UI-Mock ist der Schätzwert vorbereitet und klar als Schätzung gekennzeichnet.";
    estimate.append(strong, text);
    host.append(
      estimate,
      checkboxField("Weg zum/vom Auto mit berücksichtigen", "includeOutdoorTransition", context.includeOutdoorTransition),
      numberField("Dauer draußen", "outsideTransitionMinutes", context.outsideTransitionMinutes, 0, 60, "Min.")
    );
  }

  if (mode === "sleep") {
    host.append(numberField("Raumtemperatur", "roomTempC", context.roomTempC, 5, 35, "°C"));
    const sleepBag = document.createElement("label");
    sleepBag.className = "field compact-field";
    sleepBag.append(document.createTextNode("Schlafsack"));
    const select = document.createElement("select");
    select.dataset.contextField = "selectedSleepBagId";
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Noch keiner mit Herstellerangabe hinterlegt";
    select.append(option);
    sleepBag.append(select);
    const note = document.createElement("p");
    note.className = "dialog-note situation-note";
    note.textContent = "Ohne passenden Schlafsack mit Herstellerangaben bleibt die Empfehlung bewusst teilweise statt eine generische TOG-Tabelle zu erfinden.";
    host.append(sleepBag, note);
  }
}

export function renderCatalog(assetStore, styleTheme) {
  const container = document.querySelector("#catalogGrid");
  container.replaceChildren(...MOCK_CATALOG_IDS.map((id) => clothingCard(id, assetStore, styleTheme)));
}
