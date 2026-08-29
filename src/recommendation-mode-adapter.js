import { recommendOutfit as recommendBase } from './outfit-engine-contract.js';

const INDOOR_HIDDEN_SLOTS = new Set(['outer', 'head', 'hands', 'footwear']);
const INDOOR_WEATHER_NOTICE_CODES = new Set([
  'WEATHER_DATA_STALE',
  'WEATHER_DATA_INCOMPLETE',
  'RAIN_PROTECTION_OPTIONAL',
  'STRONG_WIND_CAUTION',
  'UV_SHADE_AND_COVERAGE',
  'INFANT_UNDER_12M_AVOID_DIRECT_SUN',
  'AGE_UNKNOWN_DIRECT_SUN_CONSERVATIVE_RULE'
]);

function indoorBlockedResult(input) {
  const requestId = input?.requestId ?? 'request';
  const requestedAt = input?.requestedAt ?? '1970-01-01T00:00:00.000Z';
  const sessionId = input?.session?.sessionId ?? 'session_default';
  return {
    recommendationId:`recommendation:${requestId}`,
    requestId,
    generatedAt:requestedAt,
    sessionId,
    mode:'indoor',
    status:'blocked',
    phases:[{
      phase:'main',
      status:'blocked',
      thermalReferenceC:null,
      thermalReferenceSource:null,
      thermalBand:null,
      thermalAdjustment:0,
      missingFields:['context.roomTempC']
    }],
    slots:[],
    items:[],
    notices:[],
    ruleTrace:[],
    dataQuality:{
      weatherFreshness:null,
      missingFields:['context.roomTempC'],
      usedManualWeather:false,
      usedEstimatedCabinTemperature:false
    }
  };
}

function syntheticIndoorWeather(roomTempC, requestedAt) {
  const time = requestedAt ?? '1970-01-01T00:00:00.000Z';
  return {
    weatherId:'indoor_room_temperature',
    location:{ locationId:null, label:'Drinnen', latitude:null, longitude:null, timezone:null },
    origin:'api',
    source:'indoor_room_temperature',
    fetchedAt:time,
    freshness:'fresh',
    current:{
      time,
      airTempC:roomTempC,
      apparentTempC:null,
      apparentTempTrusted:false,
      apparentTempIncludes:[],
      windSpeedKmh:0,
      windGustKmh:0,
      precipProbabilityPct:0,
      precipMm:0,
      precipitationType:'none',
      uvIndex:0,
      cloudCoverPct:null,
      isDay:null
    },
    hourly:[]
  };
}

function adaptIndoorResult(result, roomTempC) {
  result.mode = 'indoor';
  result.slots = result.slots
    .filter((entry) => !INDOOR_HIDDEN_SLOTS.has(entry.slot))
    .map((entry) => ({
      ...entry,
      alternatives:entry.alternatives.map((alternative) => ({
        ...alternative,
        projectedChanges:alternative.projectedChanges.filter((change) => !INDOOR_HIDDEN_SLOTS.has(change.slot))
      }))
    }));
  result.items = result.items.filter((entry) => !INDOOR_HIDDEN_SLOTS.has(entry.slot));
  result.notices = result.notices.filter((notice) => !INDOOR_WEATHER_NOTICE_CODES.has(notice.code));
  result.ruleTrace = result.ruleTrace.filter((entry) => !entry.ruleId.startsWith('weather.') && !entry.ruleId.startsWith('situation.stroller.'));
  result.dataQuality.weatherFreshness = null;
  result.dataQuality.usedManualWeather = false;
  result.dataQuality.missingFields = result.dataQuality.missingFields.filter((field) => !field.startsWith('weather.'));
  for (const phase of result.phases) {
    phase.thermalReferenceC = roomTempC;
    phase.thermalReferenceSource = 'room_temp';
    phase.missingFields = phase.missingFields.filter((field) => !field.startsWith('weather.'));
  }
  return result;
}

export function recommendOutfit(input) {
  const context = input?.context ?? input?.situation;
  if (context?.mode !== 'indoor') return recommendBase(input);
  if (!Number.isFinite(context.roomTempC)) return indoorBlockedResult(input);

  const activity = context.activity === 'active' ? 'active' : 'normal';
  const outdoorContext = {
    mode:'outdoor',
    plannedMinutes:0,
    activity,
    activitySource:context.activitySource ?? 'user',
    sunExposure:'shade',
    groundContact:'none'
  };
  const baseInput = {
    ...input,
    context:outdoorContext,
    situation:undefined,
    weather:syntheticIndoorWeather(context.roomTempC, input?.requestedAt)
  };
  return adaptIndoorResult(recommendBase(baseInput), context.roomTempC);
}
