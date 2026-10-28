import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOTHING_CATALOG, TEMPERATURE_BANDS, createSession, recommendOutfit
} from '../src/index.js';

const PROFILE = Object.freeze({
  profileId:'thermal_audit_baby',
  displayName:'Baby',
  birthDate:'2025-10-28',
  warmthBias:'neutral',
  styleTheme:'neutral',
  defaultMode:'outdoor',
  createdAt:'2026-10-28T10:00:00.000Z',
  updatedAt:'2026-10-28T10:00:00.000Z'
});

const MODES = Object.freeze(['outdoor','stroller','carrier']);
const MAX_OUTER_WARMTH_DELTA = 1.5;

function contextFor(mode) {
  if (mode === 'stroller') {
    return {
      mode,
      plannedMinutes:60,
      strollerState:'awake',
      activity:'normal',
      activitySource:'user',
      sunExposure:'shade',
      windProtection:'none'
    };
  }
  if (mode === 'carrier') {
    return {
      mode,
      plannedMinutes:60,
      sunExposure:'shade',
      placement:'over_wearer_outerwear'
    };
  }
  return {
    mode,
    plannedMinutes:60,
    activity:'normal',
    activitySource:'user',
    sunExposure:'shade',
    groundContact:'none'
  };
}

function requestFor(mode,temp,bandId) {
  const requestId = `thermal_audit_${mode}_${bandId}_${String(temp).replaceAll('.','_')}`;
  return {
    requestId,
    requestedAt:'2026-10-28T10:00:00.000Z',
    profile:PROFILE,
    context:contextFor(mode),
    weather:{
      weatherId:'thermal_audit_weather',
      location:{ locationId:'thermal_audit_location',label:'Testort',latitude:47.8,longitude:13,timezone:'Europe/Vienna' },
      origin:'api',
      source:'test',
      fetchedAt:'2026-10-28T10:00:00.000Z',
      freshness:'fresh',
      current:{
        time:'2026-10-28T12:00:00+02:00',
        airTempC:temp,
        apparentTempC:null,
        apparentTempTrusted:false,
        apparentTempIncludes:[],
        windSpeedKmh:5,
        windGustKmh:8,
        precipProbabilityPct:0,
        precipMm:0,
        precipitationType:'none',
        uvIndex:1,
        cloudCoverPct:20,
        isDay:true
      },
      hourly:[]
    },
    session:createSession(requestId),
    neckFeedback:null
  };
}

function temperatureSamples() {
  return TEMPERATURE_BANDS.flatMap((band) => {
    const lower = Number.isFinite(band.min) ? band.min : -5;
    const upper = Number.isFinite(band.max) ? band.max - 0.01 : band.min + 5;
    return [
      { bandId:band.id,temp:lower },
      { bandId:band.id,temp:upper }
    ];
  });
}

test('offered outerwear stays within the warmth margin at every temperature-band edge',() => {
  for (const { bandId,temp } of temperatureSamples()) {
    for (const mode of MODES) {
      const result = recommendOutfit(requestFor(mode,temp,bandId));
      const outer = result.slots.find((entry) => entry.phase === 'main' && entry.slot === 'outer');
      const addableOuter = result.addableSlots.find((entry) => entry.phase === 'main' && entry.slot === 'outer');
      const alternatives = outer?.alternatives ?? addableOuter?.alternatives ?? [];

      for (const option of alternatives) {
        const item = CLOTHING_CATALOG[option.itemId];
        assert.ok(item, `${mode} at ${temp} °C offered unknown item ${option.itemId}`);
        assert.ok(item.allowedSituations.includes(mode), `${mode} at ${temp} °C offered disallowed item ${option.itemId}`);
        assert.ok(Number.isFinite(option.relativeThermalDelta), `${mode} at ${temp} °C has no projected thermal delta for ${option.itemId}`);
        assert.ok(
          option.relativeThermalDelta < MAX_OUTER_WARMTH_DELTA,
          `${mode} at ${temp} °C still offers ${option.itemId} at +${option.relativeThermalDelta} thermal points`
        );
      }
    }
  }
});
