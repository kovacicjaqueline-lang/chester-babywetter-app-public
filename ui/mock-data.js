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
  defaultActivity: "normal"
};

export const MOCK_WEATHER = {
  location: "Salzburg",
  temperatureC: 18,
  apparentC: 17,
  description: "Wolkig mit Sonne",
  symbol: "⛅",
  windKmh: 17,
  rainPct: 20,
  uvIndex: 3,
  updatedLabel: "vor 5 Min.",
  hourly: [
    { time: "14:00", tempC: 18, symbol: "⛅", rainPct: 20 },
    { time: "15:00", tempC: 19, symbol: "🌤️", rainPct: 15 },
    { time: "16:00", tempC: 19, symbol: "🌤️", rainPct: 10 },
    { time: "17:00", tempC: 18, symbol: "⛅", rainPct: 15 },
    { time: "18:00", tempC: 17, symbol: "☁️", rainPct: 20 },
    { time: "19:00", tempC: 16, symbol: "☁️", rainPct: 20 }
  ]
};

const modes = {
  stroller: {
    label: "Kinderwagen",
    icon: "◌",
    short: "Wenig Eigenbewegung, externe Isolation möglich",
    reason: "Im Kinderwagen bewegt sich dein Baby wenig. Deshalb ist etwas mehr Isolation sinnvoll, ohne unnötig viele dicke Schichten zu stapeln.",
    safety: null,
    outfits: {
      cooler: ["long_sleeve_bodysuit", "leggings", "socks", "thin_sweater", "softshell_jacket"],
      balanced: ["long_sleeve_bodysuit", "leggings", "socks", "thin_sweater", "softshell_jacket", "light_footmuff"],
      warmer: ["long_sleeve_bodysuit", "leggings", "socks", "fleece_jacket", "softshell_jacket", "light_footmuff"]
    }
  },
  carrier: {
    label: "Trage",
    icon: "◉",
    short: "Körperwärme am Rumpf mitdenken",
    reason: "Körperkontakt und Trage wärmen den bedeckten Rumpf mit. Deshalb bleibt der Rumpf etwas leichter, während Beine, Füße und Kopf je nach Exposition separat geschützt werden.",
    safety: { title: "Tragewärme berücksichtigen", text: "Keine unnötig dicke Schicht zwischen Baby und tragender Person. Exponierte Bereiche separat prüfen." },
    outfits: {
      cooler: ["long_sleeve_bodysuit", "leggings", "socks"],
      balanced: ["long_sleeve_bodysuit", "leggings", "socks", "thin_hat"],
      warmer: ["long_sleeve_bodysuit", "leggings", "warm_socks", "thin_sweater", "thin_hat"]
    }
  },
  outdoor: {
    label: "Draußen",
    icon: "○",
    short: "Normale Aktivität ohne zusätzliche Wärmequelle",
    reason: "Für die Mock-Bedingungen ist eine leichte Basisschicht mit separater Mittel- und Windschutzschicht vorgesehen. So lässt sich das Outfit einfach anpassen.",
    safety: null,
    outfits: {
      cooler: ["long_sleeve_bodysuit", "leggings", "socks", "thin_sweater"],
      balanced: ["long_sleeve_bodysuit", "leggings", "socks", "thin_sweater", "softshell_jacket"],
      warmer: ["long_sleeve_bodysuit", "leggings", "socks", "fleece_jacket", "softshell_jacket", "thin_hat"]
    }
  },
  car: {
    label: "Auto",
    icon: "◇",
    short: "Dünne Schichten unter dem Gurt",
    reason: "Für die angeschnallte Fahrt zeigt die UI nur dünne, nicht voluminöse Mock-Schichten. Zusätzliche Wärme gehört über den bereits korrekt geschlossenen Gurt.",
    safety: { title: "Autositz-Regel", text: "Keine dicke Jacke und keinen Winteroverall unter dem Gurt. Zusätzliche Wärme nur sicher über dem geschlossenen Gurt." },
    outfits: {
      cooler: ["long_sleeve_bodysuit", "leggings", "socks"],
      balanced: ["long_sleeve_bodysuit", "leggings", "socks", "thin_sweater"],
      warmer: ["long_sleeve_bodysuit", "leggings", "warm_socks", "thin_sweater"]
    }
  },
  sleep: {
    label: "Schlafen",
    icon: "☾",
    short: "Raumtemperatur und Schlafsystem statt Außenwetter",
    reason: "Der Schlafmodus ist fachlich getrennt. Dieses UI-Mock zeigt keine generische TOG-Umrechnung; später entscheiden Raumtemperatur und konkrete Herstellerangaben des Schlafsystems.",
    safety: { title: "Sicher schlafen", text: "Keine Mütze im Innenraum und keine lose Decke über dem Schlafsack. Außenwetter ist kein direkter Schlaf-Outfitinput." },
    outfits: {
      cooler: ["long_sleeve_bodysuit"],
      balanced: ["long_sleeve_bodysuit", "pajamas"],
      warmer: ["long_sleeve_bodysuit", "pajamas"]
    }
  }
};

export const MOCK_SITUATIONS = modes;

export const MOCK_CATALOG_IDS = Object.keys(CLOTHING_LABELS);
