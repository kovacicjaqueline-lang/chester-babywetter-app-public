export const CLOTHING_LABELS = {
  short_sleeve_bodysuit: { label: "Kurzarmbody", role: "Basisschicht" },
  long_sleeve_bodysuit: { label: "Langarmbody", role: "Basisschicht" },
  t_shirt: { label: "T-Shirt", role: "Basisschicht" },
  long_sleeve_shirt: { label: "Langarmshirt", role: "Basisschicht" },
  light_trousers: { label: "Leichte Hose", role: "Beine" },
  trousers: { label: "Hose", role: "Beine" },
  leggings: { label: "Leggings", role: "Beine" },
  tights: { label: "Strumpfhose", role: "Beine" },
  socks: { label: "Socken", role: "Accessoire" },
  warm_socks: { label: "Warme Socken", role: "Accessoire" },
  thin_sweater: { label: "Dünner Pullover", role: "Mittelschicht" },
  fleece_jacket: { label: "Fleecejacke", role: "Mittelschicht" },
  softshell_jacket: { label: "Softshelljacke", role: "Außenschicht" },
  rain_jacket: { label: "Regenjacke", role: "Außenschicht" },
  transition_overall: { label: "Übergangsoverall", role: "Außenschicht" },
  winter_overall: { label: "Winteroverall", role: "Außenschicht" },
  sun_hat: { label: "Sonnenhut", role: "Accessoire" },
  thin_hat: { label: "Dünne Mütze", role: "Accessoire" },
  warm_hat: { label: "Warme Mütze", role: "Accessoire" },
  gloves: { label: "Handschuhe", role: "Accessoire" },
  light_footmuff: { label: "Leichter Fußsack", role: "Externe Isolation" },
  warm_footmuff: { label: "Warmer Fußsack", role: "Externe Isolation" },
  pajamas: { label: "Schlafanzug", role: "Schlafkleidung" }
};

export const MOCK_PROFILE = {
  profileId: "baby_mock_001",
  displayName: "Baby",
  birthDate: null,
  warmthBias: "neutral",
  styleTheme: "neutral",
  defaultActivity: "normal",
  sleepBagInventory: [],
  createdAt: "2026-08-25T11:30:00.000Z",
  updatedAt: "2026-08-25T11:30:00.000Z"
};

export const MOCK_WEATHER = {
  snapshotId: "weather_mock_2026-08-25T12:00Z",
  location: {
    locationId: "geo_mock_salzburg",
    label: "Salzburg",
    latitude: 47.8095,
    longitude: 13.055,
    timezone: "Europe/Vienna"
  },
  origin: "api",
  source: "mock_provider",
  observedAt: "2026-08-25T12:00:00.000Z",
  fetchedAt: "2026-08-25T12:01:00.000Z",
  freshness: "fresh",
  airTempC: 18,
  apparentTempC: 17,
  apparentTempTrusted: true,
  apparentTempIncludes: ["wind", "humidity"],
  windSpeedKmh: 17,
  windGustKmh: 29,
  precipProbabilityPct: 20,
  precipMm: 0,
  precipitationType: "none",
  uvIndex: 3,
  cloudCoverPct: 45,
  isDay: true
};

export const MOCK_WEATHER_UI = {
  description: "Wolkig mit Sonne",
  symbol: "⛅",
  updatedLabel: "vor 5 Min."
};

function hourlySnapshot(id, observedAt, airTempC, rainPct) {
  return {
    snapshotId: id,
    location: { ...MOCK_WEATHER.location },
    origin: "api",
    source: "mock_provider",
    observedAt,
    fetchedAt: MOCK_WEATHER.fetchedAt,
    freshness: "fresh",
    airTempC,
    apparentTempC: null,
    apparentTempTrusted: false,
    apparentTempIncludes: [],
    windSpeedKmh: null,
    windGustKmh: null,
    precipProbabilityPct: rainPct,
    precipMm: null,
    precipitationType: "unknown",
    uvIndex: null,
    cloudCoverPct: null,
    isDay: true
  };
}

export const MOCK_HOURLY = [
  hourlySnapshot("hour_14", "2026-08-25T14:00:00+02:00", 18, 20),
  hourlySnapshot("hour_15", "2026-08-25T15:00:00+02:00", 19, 15),
  hourlySnapshot("hour_16", "2026-08-25T16:00:00+02:00", 19, 10),
  hourlySnapshot("hour_17", "2026-08-25T17:00:00+02:00", 18, 15),
  hourlySnapshot("hour_18", "2026-08-25T18:00:00+02:00", 17, 20),
  hourlySnapshot("hour_19", "2026-08-25T19:00:00+02:00", 16, 20)
];

export const MOCK_HOURLY_UI = {
  hour_14: { symbol: "⛅" },
  hour_15: { symbol: "🌤️" },
  hour_16: { symbol: "🌤️" },
  hour_17: { symbol: "⛅" },
  hour_18: { symbol: "☁️" },
  hour_19: { symbol: "☁️" }
};

export const MOCK_CONTEXTS = {
  outdoor: {
    mode: "outdoor",
    activity: "normal",
    plannedMinutes: 60,
    sunExposure: "partial"
  },
  stroller: {
    mode: "stroller",
    activity: "passive",
    plannedMinutes: 60,
    sunExposure: "partial",
    windProtection: "partial",
    externalInsulation: "light"
  },
  carrier: {
    mode: "carrier",
    activity: "passive",
    plannedMinutes: 60,
    sunExposure: "partial",
    carrierCover: "none",
    wearerOuterLayerCoversBaby: false
  },
  car: {
    mode: "car",
    activity: "passive",
    plannedMinutes: 35,
    cabinTempC: 21,
    includeOutdoorTransition: true,
    outsideTransitionMinutes: 4
  },
  sleep: {
    mode: "sleep",
    roomTempC: null,
    selectedSleepBagId: null
  }
};

export const MOCK_UI_COPY = {
  outdoor: {
    label: "Draußen",
    icon: "○",
    short: "Normale Aktivität ohne zusätzliche Wärmequelle",
    reason: "Bei 17 °C gefühlt und etwas Wind helfen getrennte, leichte Schichten. Wegen UV 3 kommt Sonnenschutz dazu."
  },
  stroller: {
    label: "Kinderwagen",
    icon: "◌",
    short: "Wenig Eigenbewegung, externe Isolation möglich",
    reason: "Im Kinderwagen bewegt sich dein Baby wenig. Eine leichte externe Isolation kann sinnvoll sein; bei UV 3 zusätzlich Schatten und Sonnenhut einplanen."
  },
  carrier: {
    label: "Trage",
    icon: "◉",
    short: "Körperwärme am Rumpf mitdenken",
    reason: "Körperkontakt und Trage wärmen den Rumpf mit. Deshalb bleibt er leichter, während exponierte Bereiche und UV-Schutz separat berücksichtigt werden."
  },
  car: {
    label: "Auto",
    icon: "◇",
    short: "Innenraumtemperatur wird geschätzt",
    reason: "Für die Fahrt wird im Mock eine Innenraumtemperatur von 21 °C geschätzt. Unter dem Gurt bleiben nur dünne, nicht voluminöse Schichten."
  },
  sleep: {
    label: "Schlafen",
    icon: "☾",
    short: "Raumtemperatur und Schlafsystem statt Außenwetter",
    reason: "Für Schlafen reicht Außenwetter nicht. Ohne Raumtemperatur und passende Herstellerangabe gibt die UI bewusst keine exakte Kombination als passend aus."
  }
};

export const MOCK_NOTICE_UI = {
  CHECK_NECK: {
    title: "Nackentest",
    text: "Warm und trocken passt; heiß oder schwitzig bedeutet weniger Isolation, kühl bedeutet mehr."
  },
  UV_SHADE_AND_COVERAGE: {
    title: "UV-Schutz",
    text: "UV 3: Schatten bevorzugen, Sonnenhut und leichte hautbedeckende Kleidung einplanen."
  },
  STROLLER_DO_NOT_COVER_AIRFLOW: {
    title: "Sonnensegel statt Abdeckung",
    text: "Im Kinderwagen Sonnensegel oder Parasol nutzen. Keine Decke oder kein Mulltuch über den Wagen spannen; Luftzirkulation frei lassen."
  },
  CAR_SEAT_NO_BULKY_LAYERS: {
    title: "Autositz-Regel",
    text: "Keine dicke Jacke und keinen Winteroverall unter dem Gurt. Zusätzliche Wärme nur sicher über dem bereits geschlossenen Gurt."
  },
  SLEEP_USE_ROOM_TEMPERATURE: {
    title: "Raumtemperatur fehlt",
    text: "Schlafempfehlungen richten sich nach der Raumtemperatur, nicht nach dem Außenwetter."
  },
  SLEEP_MANUFACTURER_GUIDANCE_REQUIRED: {
    title: "Schlafsack-Angabe erforderlich",
    text: "Für eine konkrete Kombination braucht die App einen ausgewählten Schlafsack mit passenden Herstellerangaben."
  }
};

function notice(code, severity, reasonCodes = []) {
  return {
    code,
    severity,
    reasonCodes,
    data: {}
  };
}

function recommendedItem(itemId, role, reasonCodes, wearPosition = "on_body", phase = "main") {
  return {
    itemId,
    quantity: 1,
    role,
    reasonCodes,
    phase,
    wearPosition,
    optional: false
  };
}

function item(itemId, role = "base", reason = "MOCK_BASELINE", wearPosition = "on_body", phase = "main") {
  return recommendedItem(itemId, role, [reason], wearPosition, phase);
}

function phaseEvaluation({
  phase = "main",
  status = "ready",
  thermalReferenceC = 17,
  source = "apparent_temp",
  thermalBand = "16_to_20",
  adjustment = 0,
  missingFields = []
} = {}) {
  return {
    phase,
    status,
    thermalReferenceC,
    thermalReferenceSource: source,
    thermalBand,
    thermalAdjustment: adjustment,
    missingFields
  };
}

function recommendation(mode, warmth, items, notices, options = {}) {
  const status = options.status ?? "ready";
  const phases = options.phases ?? [phaseEvaluation({ adjustment: options.adjustment ?? 0 })];
  return {
    recommendationId: `mock_${mode}_${warmth}`,
    requestId: `mock_request_${mode}`,
    generatedAt: "2026-08-25T12:02:00.000Z",
    mode,
    status,
    phases,
    items,
    notices,
    ruleTrace: [],
    dataQuality: {
      weatherFreshness: mode === "sleep" ? null : "fresh",
      missingFields: options.missingFields ?? [],
      usedManualFallback: false
    }
  };
}

const neck = notice("CHECK_NECK", "info", ["THERMAL_FEEDBACK_REQUIRED"]);
const uv = notice("UV_SHADE_AND_COVERAGE", "caution", ["UV_INDEX_AT_LEAST_3"]);
const strollerShade = notice("STROLLER_DO_NOT_COVER_AIRFLOW", "hard_rule", ["STROLLER_AIRFLOW_SAFETY"]);
const carSeat = notice("CAR_SEAT_NO_BULKY_LAYERS", "hard_rule", ["CAR_HARNESS_SAFETY"]);

export const MOCK_RECOMMENDATIONS = {
  outdoor: {
    cooler: recommendation("outdoor", "cooler", [
      item("long_sleeve_bodysuit", "base"),
      item("leggings", "legs"),
      item("socks", "accessory"),
      item("thin_sweater", "mid"),
      item("sun_hat", "accessory", "UV_INDEX_AT_LEAST_3")
    ], [uv, neck], { adjustment: -1 }),
    balanced: recommendation("outdoor", "balanced", [
      item("long_sleeve_bodysuit", "base"),
      item("leggings", "legs"),
      item("socks", "accessory"),
      item("thin_sweater", "mid"),
      item("softshell_jacket", "outer", "WIND_PROTECTION"),
      item("sun_hat", "accessory", "UV_INDEX_AT_LEAST_3")
    ], [uv, neck]),
    warmer: recommendation("outdoor", "warmer", [
      item("long_sleeve_bodysuit", "base"),
      item("leggings", "legs"),
      item("socks", "accessory"),
      item("fleece_jacket", "mid"),
      item("softshell_jacket", "outer", "WIND_PROTECTION"),
      item("sun_hat", "accessory", "UV_INDEX_AT_LEAST_3")
    ], [uv, neck], { adjustment: 1 })
  },
  stroller: {
    cooler: recommendation("stroller", "cooler", [
      item("long_sleeve_bodysuit", "base"),
      item("leggings", "legs"),
      item("socks", "accessory"),
      item("thin_sweater", "mid"),
      item("softshell_jacket", "outer", "WIND_PROTECTION"),
      item("sun_hat", "accessory", "UV_INDEX_AT_LEAST_3")
    ], [strollerShade, uv, neck]),
    balanced: recommendation("stroller", "balanced", [
      item("long_sleeve_bodysuit", "base"),
      item("leggings", "legs"),
      item("socks", "accessory"),
      item("thin_sweater", "mid"),
      item("softshell_jacket", "outer", "WIND_PROTECTION"),
      item("light_footmuff", "external", "STROLLER_LOW_ACTIVITY", "external"),
      item("sun_hat", "accessory", "UV_INDEX_AT_LEAST_3")
    ], [strollerShade, uv, neck], { adjustment: 1 }),
    warmer: recommendation("stroller", "warmer", [
      item("long_sleeve_bodysuit", "base"),
      item("leggings", "legs"),
      item("socks", "accessory"),
      item("fleece_jacket", "mid"),
      item("softshell_jacket", "outer", "WIND_PROTECTION"),
      item("light_footmuff", "external", "STROLLER_LOW_ACTIVITY", "external"),
      item("sun_hat", "accessory", "UV_INDEX_AT_LEAST_3")
    ], [strollerShade, uv, neck], { adjustment: 2 })
  },
  carrier: {
    cooler: recommendation("carrier", "cooler", [
      item("long_sleeve_bodysuit", "base"),
      item("leggings", "legs"),
      item("socks", "accessory"),
      item("sun_hat", "accessory", "UV_INDEX_AT_LEAST_3")
    ], [uv, neck], { adjustment: -2 }),
    balanced: recommendation("carrier", "balanced", [
      item("long_sleeve_bodysuit", "base"),
      item("leggings", "legs"),
      item("socks", "accessory"),
      item("sun_hat", "accessory", "UV_INDEX_AT_LEAST_3")
    ], [uv, neck], { adjustment: -1 }),
    warmer: recommendation("carrier", "warmer", [
      item("long_sleeve_bodysuit", "base"),
      item("leggings", "legs"),
      item("warm_socks", "accessory"),
      item("thin_sweater", "mid"),
      item("sun_hat", "accessory", "UV_INDEX_AT_LEAST_3")
    ], [uv, neck])
  },
  car: {
    cooler: recommendation("car", "cooler", [
      item("long_sleeve_bodysuit", "base", "IN_CAR_THERMAL_BASELINE", "under_harness", "in_car"),
      item("leggings", "legs", "IN_CAR_THERMAL_BASELINE", "under_harness", "in_car"),
      item("socks", "accessory", "IN_CAR_THERMAL_BASELINE", "under_harness", "in_car")
    ], [carSeat, neck], {
      phases: [
        phaseEvaluation({ phase: "outdoor_transition", thermalReferenceC: 17, source: "apparent_temp", thermalBand: "16_to_20" }),
        phaseEvaluation({ phase: "in_car", thermalReferenceC: 21, source: "cabin_temp", thermalBand: null })
      ]
    }),
    balanced: recommendation("car", "balanced", [
      item("long_sleeve_bodysuit", "base", "IN_CAR_THERMAL_BASELINE", "under_harness", "in_car"),
      item("leggings", "legs", "IN_CAR_THERMAL_BASELINE", "under_harness", "in_car"),
      item("socks", "accessory", "IN_CAR_THERMAL_BASELINE", "under_harness", "in_car"),
      item("thin_sweater", "mid", "IN_CAR_THERMAL_BASELINE", "under_harness", "in_car")
    ], [carSeat, neck], {
      phases: [
        phaseEvaluation({ phase: "outdoor_transition", thermalReferenceC: 17, source: "apparent_temp", thermalBand: "16_to_20" }),
        phaseEvaluation({ phase: "in_car", thermalReferenceC: 21, source: "cabin_temp", thermalBand: null })
      ]
    }),
    warmer: recommendation("car", "warmer", [
      item("long_sleeve_bodysuit", "base", "IN_CAR_THERMAL_BASELINE", "under_harness", "in_car"),
      item("leggings", "legs", "IN_CAR_THERMAL_BASELINE", "under_harness", "in_car"),
      item("warm_socks", "accessory", "IN_CAR_THERMAL_BASELINE", "under_harness", "in_car"),
      item("thin_sweater", "mid", "IN_CAR_THERMAL_BASELINE", "under_harness", "in_car")
    ], [carSeat, neck], {
      phases: [
        phaseEvaluation({ phase: "outdoor_transition", thermalReferenceC: 17, source: "apparent_temp", thermalBand: "16_to_20" }),
        phaseEvaluation({ phase: "in_car", thermalReferenceC: 21, source: "cabin_temp", thermalBand: null, adjustment: 1 })
      ]
    })
  }
};

const sleepMissingRoomTemp = recommendation("sleep", "balanced", [], [
  notice("SLEEP_USE_ROOM_TEMPERATURE", "hard_rule", ["ROOM_TEMPERATURE_REQUIRED"]),
  neck
], {
  status: "blocked",
  phases: [phaseEvaluation({
    status: "blocked",
    thermalReferenceC: null,
    source: null,
    thermalBand: null,
    missingFields: ["context.roomTempC"]
  })],
  missingFields: ["context.roomTempC"]
});

const sleepNeedsGuidance = (roomTempC) => recommendation("sleep", "balanced", [], [
  notice("SLEEP_MANUFACTURER_GUIDANCE_REQUIRED", "caution", ["SLEEP_BAG_GUIDANCE_MISSING"]),
  neck
], {
  status: "partial",
  phases: [phaseEvaluation({
    status: "partial",
    thermalReferenceC: roomTempC,
    source: "room_temp",
    thermalBand: null,
    missingFields: ["context.selectedSleepBagId"]
  })],
  missingFields: ["context.selectedSleepBagId"]
});

export function getMockRecommendation(mode, warmth, context) {
  if (mode === "sleep") {
    if (context?.roomTempC == null) return structuredClone(sleepMissingRoomTemp);
    return structuredClone(sleepNeedsGuidance(context.roomTempC));
  }
  const selected = MOCK_RECOMMENDATIONS[mode]?.[warmth] ?? MOCK_RECOMMENDATIONS.stroller.balanced;
  return structuredClone(selected);
}

export const MOCK_CATALOG_IDS = Object.keys(CLOTHING_LABELS);
