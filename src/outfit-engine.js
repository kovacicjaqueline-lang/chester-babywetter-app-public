import { CLOTHING_CATALOG } from './clothing-catalog.js';

export const TEMPERATURE_BANDS = Object.freeze([
  Object.freeze({ id: 'below_3', min: -Infinity, max: 3, label: '< 3 °C' }),
  Object.freeze({ id: '3_to_8', min: 3, max: 8, label: '3 bis < 8 °C' }),
  Object.freeze({ id: '8_to_12', min: 8, max: 12, label: '8 bis < 12 °C' }),
  Object.freeze({ id: '12_to_16', min: 12, max: 16, label: '12 bis < 16 °C' }),
  Object.freeze({ id: '16_to_20', min: 16, max: 20, label: '16 bis < 20 °C' }),
  Object.freeze({ id: '20_to_24', min: 20, max: 24, label: '20 bis < 24 °C' }),
  Object.freeze({ id: '24_to_28', min: 24, max: 28, label: '24 bis < 28 °C' }),
  Object.freeze({ id: '28_plus', min: 28, max: Infinity, label: '≥ 28 °C' })
]);

const BASELINE_BY_BAND = Object.freeze({
  below_3: ['long_sleeve_bodysuit', 'fleece_jacket', 'winter_overall', 'warm_socks_booties', 'warm_hat', 'gloves'],
  '3_to_8': ['long_sleeve_bodysuit', 'warm_trousers', 'fleece_jacket', 'softshell_jacket', 'warm_socks_booties', 'warm_hat', 'gloves'],
  '8_to_12': ['long_sleeve_bodysuit', 'trousers', 'fleece_jacket', 'softshell_jacket', 'warm_socks_booties', 'warm_hat'],
  '12_to_16': ['long_sleeve_bodysuit', 'trousers', 'thin_sweater', 'softshell_jacket', 'socks'],
  '16_to_20': ['long_sleeve_bodysuit', 'trousers', 'thin_sweater', 'socks'],
  '20_to_24': ['long_sleeve_bodysuit', 'light_trousers', 'socks'],
  '24_to_28': ['short_sleeve_bodysuit', 'light_trousers'],
  '28_plus': ['short_sleeve_bodysuit']
});

const SLEEP_BANDS = Object.freeze([
  { id: 'sleep_below_16', min: -Infinity, max: 16, label: '< 16 °C' },
  { id: 'sleep_16_to_20', min: 16, max: 20, label: '16 bis < 20 °C' },
  { id: 'sleep_20_to_24', min: 20, max: 24, label: '20 bis < 24 °C' },
  { id: 'sleep_24_plus', min: 24, max: Infinity, label: '≥ 24 °C' }
]);

const DEFAULT_PREFERENCES = Object.freeze({
  preferOverall: false,
  preferredLegwear: null,
  preferredBase: null
});

/**
 * Pure outfit evaluator. It performs no I/O, DOM access, API calls, storage access,
 * clock reads or random-ID generation. The same input always returns the same output.
 *
 * @param {object} input
 * @param {object|null} input.weather WeatherSnapshot or null where allowed by the situation.
 * @param {object} input.profile BabyProfile.
 * @param {object} input.situation SituationContext.
 * @param {object} [input.preferences] Optional clothing preferences.
 * @param {'warm_dry'|'hot_sweaty'|'cool'|null} [input.neckFeedback]
 * @returns {object} deterministic recommendation result
 */
export function recommendOutfit({ weather = null, profile, situation, preferences = {}, neckFeedback = null }) {
  const normalizedPreferences = { ...DEFAULT_PREFERENCES, ...preferences };

  if (!profile || typeof profile !== 'object') {
    throw new TypeError('profile is required');
  }
  if (!situation || typeof situation !== 'object' || !situation.mode) {
    throw new TypeError('situation.mode is required');
  }

  if (situation.mode === 'sleep') {
    return evaluateSleep({ profile, situation, neckFeedback });
  }
  if (situation.mode === 'car') {
    return evaluateCar({ weather, profile, situation, preferences: normalizedPreferences, neckFeedback });
  }
  if (!['outdoor', 'stroller', 'carrier'].includes(situation.mode)) {
    throw new RangeError(`unsupported situation mode: ${situation.mode}`);
  }

  return evaluateOutdoorLike({
    weather,
    profile,
    situation,
    preferences: normalizedPreferences,
    neckFeedback,
    phase: 'main'
  });
}

function evaluateOutdoorLike({ weather, profile, situation, preferences, neckFeedback, phase }) {
  const result = createResult(situation.mode, weather);

  if (!weather || !isFiniteNumber(weather.airTempC)) {
    const missing = ['weather.airTempC'];
    result.status = 'blocked';
    result.phases.push(blockedPhase(phase, missing));
    addNotice(result, 'WEATHER_DATA_INCOMPLETE', 'caution', ['OUTDOOR_WEATHER_REQUIRED'], {});
    result.dataQuality.missingFields.push(...missing);
    result.confidence = confidence('low', ['REQUIRED_WEATHER_MISSING']);
    result.explanation = 'Für diese Situation fehlen die nötigen Außentemperaturdaten; eine thermische Empfehlung wird nicht geraten.';
    return result;
  }

  const thermal = thermalEnvironmentFromWeather(weather);
  const baseBand = temperatureBandFor(thermal.thermalReferenceC);
  let thermalAdjustment = 0;
  const adjustmentReasons = [];

  const activityAdjustment = activityAdjustmentFor(situation);
  if (activityAdjustment !== 0) {
    thermalAdjustment += activityAdjustment;
    adjustmentReasons.push(activityAdjustment > 0 ? 'LOW_ACTIVITY_WARMER' : 'ACTIVE_BABY_COOLER');
    traceThermal(result, 'activity.level', activityAdjustment, phase, adjustmentReasons.at(-1));
  }

  if (situation.mode === 'stroller' && thermal.thermalReferenceC < 24) {
    thermalAdjustment += 1;
    adjustmentReasons.push('STROLLER_LOW_ACTIVITY');
    traceThermal(result, 'situation.stroller.low_activity', 1, phase, 'STROLLER_LOW_ACTIVITY');
  }

  if (situation.mode === 'carrier') {
    thermalAdjustment -= 1;
    adjustmentReasons.push('CARRIER_BODY_HEAT');
    traceThermal(result, 'situation.carrier.body_heat', -1, phase, 'CARRIER_BODY_HEAT');
  }

  const wind = evaluateWind(weather, situation, thermal);
  if (wind.thermalAdjustment) {
    thermalAdjustment += wind.thermalAdjustment;
    adjustmentReasons.push('WIND_THERMAL_EFFECT');
    traceThermal(result, 'weather.wind.thermal', wind.thermalAdjustment, phase, 'WIND_THERMAL_EFFECT');
  }

  const biasAdjustment = warmthBiasAdjustment(profile.warmthBias);
  if (biasAdjustment !== 0) {
    thermalAdjustment += biasAdjustment;
    adjustmentReasons.push(biasAdjustment > 0 ? 'BABY_RUNS_COOL' : 'BABY_RUNS_WARM');
    traceThermal(result, 'profile.warmth_bias', biasAdjustment, phase, adjustmentReasons.at(-1));
  }

  const neckAdjustment = neckFeedbackAdjustment(neckFeedback);
  if (neckAdjustment !== 0) {
    thermalAdjustment += neckAdjustment;
    adjustmentReasons.push(neckAdjustment > 0 ? 'NECK_COOL' : 'NECK_HOT_SWEATY');
    traceThermal(result, 'feedback.neck', neckAdjustment, phase, adjustmentReasons.at(-1));
  } else if (neckFeedback === 'warm_dry') {
    addTrace(result, 'feedback.neck', 'no_change', null, phase, 0, 'NECK_WARM_DRY_KEEP');
  }

  let bodyAdjustment = thermalAdjustment;
  if (situation.mode === 'stroller' && situation.externalInsulation === 'light') {
    bodyAdjustment -= 1;
    addItem(result, 'light_footmuff', phase, 'external', false, ['STROLLER_EXTERNAL_INSULATION']);
    addTrace(result, 'situation.stroller.external.light', 'add', 'light_footmuff', phase, -1, 'STROLLER_EXTERNAL_REPLACES_BODY_STEP');
  } else if (situation.mode === 'stroller' && ['medium', 'warm'].includes(situation.externalInsulation)) {
    bodyAdjustment -= 1;
    addItem(result, 'footmuff', phase, 'external', false, ['STROLLER_EXTERNAL_INSULATION_UNCALIBRATED']);
    result.uncertainty.push('STROLLER_EXTERNAL_INSULATION_NOT_CALIBRATED');
  }

  if (situation.mode === 'stroller' && thermal.thermalReferenceC >= 24 && bodyAdjustment > 0) {
    bodyAdjustment = 0;
    addTrace(result, 'situation.stroller.warm_cap', 'thermal_down', null, phase, null, 'STROLLER_WARMTH_CAP_AT_24C');
  }

  const effectiveBand = shiftedBand(baseBand, bodyAdjustment);
  for (const itemId of BASELINE_BY_BAND[effectiveBand.id]) {
    addItem(result, itemId, phase, wearPositionForPhase(phase), false, [`BASELINE_${effectiveBand.id.toUpperCase()}`]);
  }

  if (situation.mode === 'carrier') {
    applyCarrierRules(result, thermal, situation, phase);
  }

  if (wind.needsWindProtection) {
    applyWindProtection(result, situation, phase);
  }

  const rain = isRelevantRain(weather);
  if (rain) {
    addItem(result, 'rain_jacket', phase, wearPositionForPhase(phase), false, ['RAIN_PROTECTION']);
    addNotice(result, 'RAIN_PROTECTION_RECOMMENDED', 'info', ['RAIN_PROTECTION'], {
      precipProbabilityPct: weather.precipProbabilityPct ?? null,
      precipMm: weather.precipMm ?? null
    });
  }

  applySunAndUvRules(result, { weather, profile, situation, thermal, phase });
  applyPreferences(result, preferences, phase, effectiveBand, situation.mode);
  addOverallAlternative(result, phase, effectiveBand, situation.mode);

  if (situation.mode === 'stroller') {
    addNotice(result, 'STROLLER_DO_NOT_COVER_AIRFLOW', 'hard_rule', ['STROLLER_AIRFLOW_SAFETY'], {});
  }
  if (situation.mode === 'carrier') {
    addNotice(result, 'CARRIER_BODY_HEAT_COUNTS_AS_INSULATION', 'info', ['CARRIER_BODY_HEAT'], {});
    addNotice(result, 'CARRIER_PROTECT_EXPOSED_AREAS', 'info', ['CARRIER_EXPOSED_HEAD_LEGS_FEET'], {});
  }

  addNotice(result, 'CHECK_NECK', 'info', ['THERMAL_FEEDBACK_REQUIRED'], {});
  applyWeatherDataQuality(result, weather);

  if (thermal.thermalReferenceC < 3) {
    addNotice(result, 'EXTREME_COLD_CAUTION', 'caution', ['EXTREME_COLD_MODEL_BOUNDARY'], { thermalReferenceC: thermal.thermalReferenceC });
    result.uncertainty.push('EXTREME_COLD_EXPOSURE_LIMITS_NOT_CALIBRATED');
  }
  if (thermal.thermalReferenceC >= 30) {
    addNotice(result, 'EXTREME_HEAT_CAUTION', 'caution', ['EXTREME_HEAT_MODEL_BOUNDARY'], { thermalReferenceC: thermal.thermalReferenceC });
    result.uncertainty.push('EXTREME_HEAT_EXPOSURE_LIMITS_NOT_CALIBRATED');
  }

  const phaseStatus = result.status === 'partial' ? 'partial' : 'ready';
  result.phases.push({
    phase,
    status: phaseStatus,
    thermalReferenceC: thermal.thermalReferenceC,
    thermalReferenceSource: thermal.referenceSource,
    thermalBand: baseBand.id,
    effectiveThermalBand: effectiveBand.id,
    thermalAdjustment,
    bodyThermalAdjustment: bodyAdjustment,
    missingFields: [...result.dataQuality.missingFields]
  });

  result.uncertainty.unshift('TEMPERATURE_BANDS_ARE_PRODUCT_HEURISTICS');
  result.confidence = computeConfidence(result);
  result.explanation = buildOutdoorExplanation({ thermal, baseBand, effectiveBand, thermalAdjustment, situation, wind, rain, weather });
  return result;
}

function evaluateCar({ weather, profile, situation, preferences, neckFeedback }) {
  const result = createResult('car', weather);
  addNotice(result, 'CAR_SEAT_NO_BULKY_LAYERS', 'hard_rule', ['CAR_HARNESS_SAFETY'], {});

  if (situation.includeOutdoorTransition) {
    if (!weather || !isFiniteNumber(weather.airTempC)) {
      result.phases.push(blockedPhase('outdoor_transition', ['weather.airTempC']));
      result.status = 'partial';
      result.dataQuality.missingFields.push('weather.airTempC');
      addNotice(result, 'WEATHER_DATA_INCOMPLETE', 'caution', ['OUTDOOR_TRANSITION_NOT_EVALUATED'], {});
    } else {
      const outdoorSituation = {
        mode: 'outdoor',
        activity: 'passive',
        plannedMinutes: situation.outsideTransitionMinutes ?? null,
        sunExposure: 'unknown'
      };
      const transition = evaluateOutdoorLike({
        weather,
        profile,
        situation: outdoorSituation,
        preferences,
        neckFeedback,
        phase: 'outdoor_transition'
      });
      mergeSubResult(result, transition, 'outdoor_transition');
      if (transition.items.some((entry) => {
        const definition = CLOTHING_CATALOG[entry.itemId];
        return definition && definition.carSeatCompatibility !== 'allowed' && entry.phase === 'outdoor_transition';
      })) {
        addNotice(result, 'CAR_SEAT_REMOVE_OUTER_BEFORE_HARNESS', 'hard_rule', ['CAR_HARNESS_SAFETY'], {});
      }
    }
  }

  if (!isFiniteNumber(situation.cabinTempC)) {
    result.phases.push(blockedPhase('in_car', ['situation.cabinTempC']));
    result.status = 'blocked';
    result.dataQuality.missingFields.push('situation.cabinTempC');
    result.confidence = confidence('low', ['CABIN_TEMPERATURE_MISSING']);
    result.explanation = 'Für die angeschnallte Fahrt fehlt die Innenraumtemperatur. Die Gurt-Sicherheitsregeln gelten trotzdem.';
    return dedupeResult(result);
  }

  const baseBand = temperatureBandFor(situation.cabinTempC);
  let adjustment = warmthBiasAdjustment(profile.warmthBias) + neckFeedbackAdjustment(neckFeedback);
  const effectiveBand = shiftedBand(baseBand, adjustment);

  const carSafeIds = BASELINE_BY_BAND[effectiveBand.id]
    .map((itemId) => carSafeReplacement(itemId))
    .filter(Boolean);
  for (const itemId of carSafeIds) {
    addItem(result, itemId, 'in_car', 'under_harness', false, ['IN_CAR_THERMAL_BASELINE']);
  }

  if (situation.cabinTempC < 18) {
    addItem(result, 'blanket_over_harness', 'in_car', 'over_harness', true, ['IN_CAR_EXTRA_WARMTH_OVER_HARNESS']);
    addNotice(result, 'CAR_SEAT_BLANKET_OVER_HARNESS_ONLY', 'hard_rule', ['CAR_HARNESS_SAFETY'], {});
  }

  result.phases.push({
    phase: 'in_car',
    status: 'ready',
    thermalReferenceC: situation.cabinTempC,
    thermalReferenceSource: 'cabin_temp',
    thermalBand: baseBand.id,
    effectiveThermalBand: effectiveBand.id,
    thermalAdjustment: adjustment,
    bodyThermalAdjustment: adjustment,
    missingFields: []
  });

  if (result.phases.some((phase) => phase.status === 'blocked')) {
    result.status = 'partial';
  } else if (result.status !== 'partial') {
    result.status = 'ready';
  }
  result.uncertainty.push('TEMPERATURE_BANDS_ARE_PRODUCT_HEURISTICS');
  result.confidence = computeConfidence(result);
  result.explanation = `Im Auto zählt die Innenraumtemperatur von ${formatTemp(situation.cabinTempC)}. Unter dem Gurt werden nur dünne, zulässige Schichten empfohlen; voluminöse Außenschichten bleiben draußen bzw. werden vor dem Anschnallen ausgezogen.`;
  return dedupeResult(result);
}

function evaluateSleep({ profile, situation, neckFeedback }) {
  const result = createResult('sleep', null);
  addNotice(result, 'SLEEP_NO_HAT', 'hard_rule', ['SAFE_SLEEP_HEAD_UNCOVERED'], {});
  addNotice(result, 'SLEEP_NO_LOOSE_BLANKET_OVER_BAG', 'hard_rule', ['SAFE_SLEEP_NO_LOOSE_BLANKET'], {});
  addNotice(result, 'SLEEP_USE_ROOM_TEMPERATURE', 'hard_rule', ['SLEEP_ROOM_TEMP_ONLY'], {});
  addNotice(result, 'CHECK_NECK', 'info', ['THERMAL_FEEDBACK_REQUIRED'], {});

  if (!isFiniteNumber(situation.roomTempC)) {
    result.status = 'blocked';
    result.phases.push(blockedPhase('main', ['situation.roomTempC']));
    result.dataQuality.missingFields.push('situation.roomTempC');
    result.confidence = confidence('low', ['ROOM_TEMPERATURE_MISSING']);
    result.explanation = 'Zum Schlafen wird die Raumtemperatur benötigt; Außentemperatur, Wind, Regen und UV werden dafür nicht als thermische Eingaben verwendet.';
    return result;
  }

  const sleepBand = rangeBandFor(situation.roomTempC, SLEEP_BANDS);
  const selectedBag = profile.sleepBagInventory?.find((bag) => bag.sleepBagId === situation.selectedSleepBagId) ?? null;
  let status = 'ready';
  let explanationSuffix = '';

  if (situation.selectedSleepBagId) {
    if (!selectedBag) {
      status = 'partial';
      addNotice(result, 'SLEEP_MANUFACTURER_GUIDANCE_REQUIRED', 'caution', ['SLEEP_BAG_NOT_FOUND'], {});
      result.uncertainty.push('SELECTED_SLEEP_BAG_NOT_FOUND');
      explanationSuffix = ' Der ausgewählte Schlafsack ist im Profil nicht vorhanden, daher wird keine exakte Unterkleidung geraten.';
    } else {
      const guidance = findSleepBagGuidance(selectedBag, situation.roomTempC);
      addDynamicSleepBag(result, selectedBag.sleepBagId, ['SELECTED_SLEEP_BAG']);
      if (guidance && Array.isArray(guidance.recommendedUnderlayers) && guidance.recommendedUnderlayers.length > 0) {
        let validUnderlayers = 0;
        for (const itemId of guidance.recommendedUnderlayers) {
          if (CLOTHING_CATALOG[itemId]?.sleepSafe && CLOTHING_CATALOG[itemId].allowedSituations.includes('sleep')) {
            addItem(result, itemId, 'main', 'on_body', false, ['SLEEP_MANUFACTURER_GUIDANCE']);
            validUnderlayers += 1;
          }
        }
        if (validUnderlayers > 0) {
          explanationSuffix = ` Die Unterkleidung folgt dem hinterlegten Herstellerband für „${selectedBag.label}“.`;
        } else {
          status = 'partial';
          addNotice(result, 'SLEEP_MANUFACTURER_GUIDANCE_REQUIRED', 'caution', ['SLEEP_BAG_GUIDANCE_INVALID_ITEMS'], { tog: selectedBag.tog ?? null });
          result.uncertainty.push('MANUFACTURER_GUIDANCE_HAS_NO_VALID_SLEEP_SAFE_ITEMS');
          explanationSuffix = ' Die hinterlegte Herstellerangabe enthält keine nutzbaren schlafsicheren Kleidungs-IDs.';
        }
      } else {
        status = 'partial';
        addNotice(result, 'SLEEP_MANUFACTURER_GUIDANCE_REQUIRED', 'caution', ['SLEEP_BAG_GUIDANCE_MISSING'], { tog: selectedBag.tog ?? null });
        result.uncertainty.push('NO_MATCHING_MANUFACTURER_SLEEP_BAG_GUIDANCE');
        explanationSuffix = ' Ein TOG-Wert allein wird nicht in eine exakte Unterkleidungs-Kombination umgerechnet.';
      }
    }
  } else {
    status = 'partial';
    addGenericSleepwear(result, situation.roomTempC);
    addNotice(result, 'SLEEP_MANUFACTURER_GUIDANCE_REQUIRED', 'caution', ['SLEEP_SYSTEM_UNSPECIFIED'], {});
    result.uncertainty.push('SLEEP_SYSTEM_NOT_SPECIFIED');
    explanationSuffix = ' Ohne konkretes Schlafsystem bleibt die Empfehlung bewusst allgemein und teilweise eingeschränkt.';
  }

  if (neckFeedback === 'hot_sweaty') {
    addTrace(result, 'feedback.neck', 'thermal_down', null, 'main', -1, 'NECK_HOT_SWEATY');
    result.uncertainty.push('NECK_FEEDBACK_REQUIRES_REAL_WORLD_RECHECK');
  } else if (neckFeedback === 'cool') {
    addTrace(result, 'feedback.neck', 'thermal_up', null, 'main', 1, 'NECK_COOL');
    result.uncertainty.push('NECK_FEEDBACK_REQUIRES_REAL_WORLD_RECHECK');
  }

  result.status = status;
  result.phases.push({
    phase: 'main',
    status,
    thermalReferenceC: situation.roomTempC,
    thermalReferenceSource: 'room_temp',
    thermalBand: sleepBand.id,
    effectiveThermalBand: sleepBand.id,
    thermalAdjustment: 0,
    bodyThermalAdjustment: 0,
    missingFields: []
  });
  result.confidence = computeConfidence(result, status === 'ready' ? 'high' : undefined);
  result.explanation = `Zum Schlafen zählt die Raumtemperatur von ${formatTemp(situation.roomTempC)} (${sleepBand.label}); Außenwetter wird nicht eingerechnet.${explanationSuffix}`;
  return result;
}

function addGenericSleepwear(result, roomTempC) {
  if (roomTempC >= 24) {
    addItem(result, 'short_sleeve_bodysuit', 'main', 'on_body', true, ['SLEEP_GENERIC_LIGHTWEIGHT_BASE']);
  } else if (roomTempC >= 20) {
    addItem(result, 'long_sleeve_bodysuit', 'main', 'on_body', true, ['SLEEP_GENERIC_BASE']);
  } else {
    addItem(result, 'long_sleeve_bodysuit', 'main', 'on_body', true, ['SLEEP_GENERIC_BASE']);
    addItem(result, 'sleep_suit', 'main', 'on_body', true, ['SLEEP_GENERIC_SLEEPWEAR']);
  }
}

function applyCarrierRules(result, thermal, situation, phase) {
  removeItem(result, 'winter_overall', phase, 'CARRIER_AVOID_BULKY_TORSO_LAYER');
  removeItem(result, 'transition_overall', phase, 'CARRIER_AVOID_BULKY_TORSO_LAYER');
  removeItem(result, 'softshell_jacket', phase, 'CARRIER_AVOID_LAYER_BETWEEN_BABY_AND_WEARER');
  if (removeItem(result, 'fleece_jacket', phase, 'CARRIER_REDUCE_TORSO_INSULATION')) {
    addItem(result, 'thin_sweater', phase, 'on_body', false, ['CARRIER_LIGHTER_TORSO_LAYER']);
  }

  if (thermal.thermalReferenceC < 16) {
    addItem(result, 'warm_socks_booties', phase, 'on_body', false, ['CARRIER_EXPOSED_FEET']);
    addItem(result, thermal.thermalReferenceC < 12 ? 'warm_hat' : 'thin_hat', phase, 'on_body', false, ['CARRIER_EXPOSED_HEAD']);
  } else if (thermal.thermalReferenceC < 22) {
    addItem(result, 'socks', phase, 'on_body', false, ['CARRIER_EXPOSED_FEET']);
  }

  if (situation.carrierCover !== 'none' || situation.wearerOuterLayerCoversBaby) {
    result.uncertainty.push('CARRIER_COVER_THERMAL_VALUE_NOT_CALIBRATED');
  }
}

function applyWindProtection(result, situation, phase) {
  if (situation.mode === 'carrier') {
    addNotice(result, 'WIND_PROTECTION_RECOMMENDED', 'info', ['WIND_EXPOSED_AREAS'], { carrier: true });
    return;
  }
  addItem(result, 'softshell_jacket', phase, wearPositionForPhase(phase), false, ['WIND_PROTECTION']);
  addNotice(result, 'WIND_PROTECTION_RECOMMENDED', 'info', ['WIND_PROTECTION'], {});
}

function applySunAndUvRules(result, { weather, profile, situation, thermal, phase }) {
  const exposure = situation.sunExposure ?? 'unknown';
  const ageMonths = ageMonthsAtObservation(profile.birthDate, weather?.observedAt ?? profile.updatedAt ?? null);
  const under12OrUnknown = ageMonths === null || ageMonths < 12;

  if (exposure === 'direct' && under12OrUnknown) {
    const code = ageMonths === null ? 'AGE_UNKNOWN_DIRECT_SUN_CONSERVATIVE_RULE' : 'INFANT_UNDER_12M_AVOID_DIRECT_SUN';
    addNotice(result, code, 'caution', ['DIRECT_SUN_AVOIDANCE'], { ageMonths });
  }

  if (isFiniteNumber(weather.uvIndex) && weather.uvIndex >= 3 && exposure !== 'shade') {
    addNotice(result, 'UV_SHADE_AND_COVERAGE', 'caution', ['UV_INDEX_3_PLUS'], { uvIndex: weather.uvIndex });
    addItem(result, 'sun_hat', phase, wearPositionForPhase(phase), false, ['UV_INDEX_3_PLUS']);

    if (thermal.thermalReferenceC >= 24) {
      replaceItem(result, 'short_sleeve_bodysuit', 'light_long_sleeve_shirt', phase, 'UV_COVERAGE_WITHOUT_EXTRA_HEAVY_LAYER');
      addItem(result, 'light_trousers', phase, wearPositionForPhase(phase), false, ['UV_LIGHT_SKIN_COVERAGE']);
    }
  }
}

function applyPreferences(result, preferences, phase, effectiveBand, mode) {
  if (preferences.preferredLegwear === 'leggings') {
    if (replaceItem(result, 'trousers', 'leggings', phase, 'PREFERENCE_LEGGINGS')) {
      addTrace(result, 'preference.legwear', 'replace', 'leggings', phase, null, 'PREFERENCE_LEGGINGS');
    } else {
      replaceItem(result, 'light_trousers', 'leggings', phase, 'PREFERENCE_LEGGINGS');
    }
  } else if (preferences.preferredLegwear === 'tights' && effectiveBand.max <= 16) {
    replaceItem(result, 'trousers', 'tights', phase, 'PREFERENCE_TIGHTS');
  }

  if (preferences.preferredBase === 'shirt' && effectiveBand.min >= 20) {
    replaceItem(result, 'short_sleeve_bodysuit', 't_shirt', phase, 'PREFERENCE_SHIRT');
  }

  if (preferences.preferOverall && !['carrier', 'car'].includes(mode)) {
    const alternative = overallAlternativeForBand(effectiveBand);
    if (alternative) {
      applyAlternative(result, alternative, phase, 'PREFERENCE_OVERALL');
    }
  }
}

function addOverallAlternative(result, phase, band, mode) {
  if (['carrier', 'sleep'].includes(mode) || phase === 'in_car') return;
  const alternative = overallAlternativeForBand(band);
  if (!alternative) return;
  result.alternatives.push({
    alternativeId: `overall_${band.id}`,
    phase,
    replacesItemIds: [...alternative.replaces],
    items: alternative.items.map((itemId) => recommendedItem(itemId, phase, wearPositionForPhase(phase), false, ['ALTERNATIVE_OVERALL'])),
    reasonCodes: ['ALTERNATIVE_OVERALL_INSTEAD_OF_SEPARATES']
  });
}

function overallAlternativeForBand(band) {
  if (band.id === 'below_3' || band.id === '3_to_8') {
    return { replaces: ['warm_trousers', 'softshell_jacket', 'fleece_jacket'], items: ['fleece_jacket', 'winter_overall'] };
  }
  if (['8_to_12', '12_to_16'].includes(band.id)) {
    return { replaces: ['trousers', 'softshell_jacket'], items: ['transition_overall'] };
  }
  return null;
}

function applyAlternative(result, alternative, phase, reasonCode) {
  for (const itemId of alternative.replaces) {
    removeItem(result, itemId, phase, reasonCode);
  }
  for (const itemId of alternative.items) {
    addItem(result, itemId, phase, wearPositionForPhase(phase), false, [reasonCode]);
  }
}

function carSafeReplacement(itemId) {
  const definition = CLOTHING_CATALOG[itemId];
  if (!definition) return null;
  if (definition.carSeatCompatibility === 'allowed') return itemId;
  if (itemId === 'fleece_jacket' || itemId === 'softshell_jacket' || itemId === 'light_transition_jacket' || itemId === 'rain_jacket') {
    return 'thin_sweater';
  }
  if (itemId === 'winter_overall' || itemId === 'transition_overall') {
    return 'warm_trousers';
  }
  return null;
}

function thermalEnvironmentFromWeather(weather) {
  if (weather.apparentTempTrusted === true && isFiniteNumber(weather.apparentTempC)) {
    return {
      thermalReferenceC: weather.apparentTempC,
      referenceSource: 'apparent_temp',
      alreadyIncludedFactors: Array.isArray(weather.apparentTempIncludes) ? [...weather.apparentTempIncludes] : []
    };
  }
  return {
    thermalReferenceC: weather.airTempC,
    referenceSource: 'air_temp',
    alreadyIncludedFactors: []
  };
}

function evaluateWind(weather, situation, thermal) {
  if (!isFiniteNumber(weather.windSpeedKmh) || weather.windSpeedKmh < 15) {
    return { thermalAdjustment: 0, needsWindProtection: false };
  }
  const alreadyIncluded = thermal.alreadyIncludedFactors.includes('wind');
  const directlyExposed = situation.mode !== 'stroller' || situation.windProtection !== 'good';
  return {
    thermalAdjustment: !alreadyIncluded && directlyExposed ? 1 : 0,
    needsWindProtection: directlyExposed
  };
}

function isRelevantRain(weather) {
  const probabilityTrigger = isFiniteNumber(weather.precipProbabilityPct) && weather.precipProbabilityPct >= 50;
  const amountTrigger = isFiniteNumber(weather.precipMm) && weather.precipMm > 0;
  const typeTrigger = ['rain', 'snow', 'sleet'].includes(weather.precipitationType);
  return probabilityTrigger || amountTrigger || typeTrigger;
}

function activityAdjustmentFor(situation) {
  if (situation.mode !== 'outdoor') return 0;
  if (situation.activity === 'passive') return 1;
  if (situation.activity === 'active') return -1;
  return 0;
}

function warmthBiasAdjustment(bias) {
  if (bias === 'runs_cool') return 1;
  if (bias === 'runs_warm') return -1;
  return 0;
}

function neckFeedbackAdjustment(feedback) {
  if (feedback === 'cool') return 1;
  if (feedback === 'hot_sweaty') return -1;
  return 0;
}

function applyWeatherDataQuality(result, weather) {
  if (weather.freshness === 'stale') {
    result.status = 'partial';
    addNotice(result, 'WEATHER_DATA_STALE', 'caution', ['STALE_WEATHER_USED'], {});
  }

  const missing = [];
  if (!isFiniteNumber(weather.windSpeedKmh)) missing.push('weather.windSpeedKmh');
  if (!isFiniteNumber(weather.uvIndex)) missing.push('weather.uvIndex');
  const precipitationKnown = isFiniteNumber(weather.precipProbabilityPct) || isFiniteNumber(weather.precipMm) || ['none', 'rain', 'snow', 'sleet'].includes(weather.precipitationType);
  if (!precipitationKnown) missing.push('weather.precipitation');

  if (missing.length > 0) {
    result.status = 'partial';
    result.dataQuality.missingFields.push(...missing);
    addNotice(result, 'WEATHER_DATA_INCOMPLETE', 'caution', ['OPTIONAL_WEATHER_HAZARD_DATA_MISSING'], { count: missing.length });
  }
}

function buildOutdoorExplanation({ thermal, baseBand, effectiveBand, thermalAdjustment, situation, wind, rain, weather }) {
  const parts = [`Thermische Referenz: ${formatTemp(thermal.thermalReferenceC)} (${baseBand.label})`];
  if (thermalAdjustment > 0) parts.push(`durch Situation/Empfindlichkeit um ${thermalAdjustment} leichte Wärmestufe(n) angehoben`);
  if (thermalAdjustment < 0) parts.push(`durch Situation/Aktivität um ${Math.abs(thermalAdjustment)} leichte Wärmestufe(n) reduziert`);
  if (effectiveBand.id !== baseBand.id) parts.push(`daraus folgt die Kleidungs-Baseline ${effectiveBand.label}`);
  if (wind.needsWindProtection) parts.push('Windschutz wird separat berücksichtigt');
  if (rain) parts.push('Regenschutz wird als Schutzfunktion ergänzt, nicht pauschal als Wärmestufe');
  if (isFiniteNumber(weather.uvIndex) && weather.uvIndex >= 3 && situation.sunExposure !== 'shade') parts.push('UV-Schutz erfolgt möglichst durch leichte Bedeckung und Schatten');
  return `${parts.join('; ')}.`;
}

function computeConfidence(result, preferredLevel) {
  const reasons = [...result.uncertainty];
  if (result.status === 'blocked') return confidence('low', reasons.length ? reasons : ['RECOMMENDATION_BLOCKED']);
  if (result.status === 'partial') return confidence('low', reasons.length ? reasons : ['RECOMMENDATION_PARTIAL']);
  if (preferredLevel === 'high' && reasons.length === 0) return confidence('high', []);
  if (reasons.length > 0) return confidence('medium', reasons);
  return confidence(preferredLevel ?? 'high', []);
}

function confidence(level, reasons) {
  return { level, reasons: [...new Set(reasons)] };
}

function createResult(mode, weather) {
  return {
    mode,
    status: 'ready',
    phases: [],
    items: [],
    alternatives: [],
    notices: [],
    ruleTrace: [],
    guidance: [],
    uncertainty: [],
    confidence: confidence('medium', []),
    explanation: '',
    dataQuality: {
      weatherFreshness: weather?.freshness ?? null,
      missingFields: [],
      usedManualFallback: weather?.origin === 'manual'
    }
  };
}

function blockedPhase(phase, missingFields) {
  return {
    phase,
    status: 'blocked',
    thermalReferenceC: null,
    thermalReferenceSource: null,
    thermalBand: null,
    effectiveThermalBand: null,
    thermalAdjustment: 0,
    bodyThermalAdjustment: 0,
    missingFields: [...missingFields]
  };
}

function addItem(result, itemId, phase, wearPosition, optional, reasonCodes) {
  const definition = CLOTHING_CATALOG[itemId];
  if (!definition) return false;
  const existing = result.items.find((entry) => entry.itemId === itemId && entry.phase === phase && entry.wearPosition === wearPosition);
  if (existing) {
    existing.reasonCodes = [...new Set([...existing.reasonCodes, ...reasonCodes])];
    existing.optional = existing.optional && optional;
    return true;
  }
  result.items.push(recommendedItem(itemId, phase, wearPosition, optional, reasonCodes));
  addTrace(result, reasonCodes[0] ?? 'engine.add', 'add', itemId, phase, null, reasonCodes[0] ?? 'ENGINE_ADD');
  return true;
}

function recommendedItem(itemId, phase, wearPosition, optional, reasonCodes) {
  const definition = CLOTHING_CATALOG[itemId];
  return {
    itemId,
    quantity: 1,
    role: definition?.layer ?? 'external',
    reasonCodes: [...reasonCodes],
    phase,
    wearPosition,
    optional
  };
}

function addDynamicSleepBag(result, sleepBagId, reasonCodes) {
  result.items.push({
    itemId: sleepBagId,
    quantity: 1,
    role: 'external',
    reasonCodes,
    phase: 'main',
    wearPosition: 'external',
    optional: false
  });
}

function removeItem(result, itemId, phase, reasonCode) {
  const before = result.items.length;
  result.items = result.items.filter((entry) => !(entry.itemId === itemId && entry.phase === phase));
  if (result.items.length !== before) {
    addTrace(result, reasonCode, 'remove', itemId, phase, null, reasonCode);
    return true;
  }
  return false;
}

function replaceItem(result, fromItemId, toItemId, phase, reasonCode) {
  const found = result.items.find((entry) => entry.itemId === fromItemId && entry.phase === phase);
  if (!found) return false;
  const wearPosition = found.wearPosition;
  const optional = found.optional;
  removeItem(result, fromItemId, phase, reasonCode);
  addItem(result, toItemId, phase, wearPosition, optional, [reasonCode]);
  addTrace(result, reasonCode, 'replace', `${fromItemId}->${toItemId}`, phase, null, reasonCode);
  return true;
}

function addNotice(result, code, severity, reasonCodes, data) {
  if (result.notices.some((notice) => notice.code === code && JSON.stringify(notice.data) === JSON.stringify(data))) return;
  result.notices.push({ code, severity, reasonCodes, data });
  addTrace(result, `notice.${code.toLowerCase()}`, 'notice', code, 'main', null, reasonCodes[0] ?? code);
}

function addTrace(result, ruleId, effect, target, phase, delta, reasonCode) {
  result.ruleTrace.push({ ruleId, effect, target, phase, delta, reasonCode });
}

function traceThermal(result, ruleId, delta, phase, reasonCode) {
  addTrace(result, ruleId, delta > 0 ? 'thermal_up' : 'thermal_down', null, phase, delta, reasonCode);
}

function mergeSubResult(target, source, phase) {
  target.items.push(...source.items.filter((entry) => entry.phase === phase));
  target.alternatives.push(...source.alternatives.filter((entry) => entry.phase === phase));
  target.notices.push(...source.notices.filter((notice) => !['CHECK_NECK'].includes(notice.code)));
  target.ruleTrace.push(...source.ruleTrace.filter((trace) => trace.phase === phase));
  target.phases.push(...source.phases.filter((entry) => entry.phase === phase));
  target.uncertainty.push(...source.uncertainty);
  target.dataQuality.missingFields.push(...source.dataQuality.missingFields);
  if (source.status === 'partial') target.status = 'partial';
}

function dedupeResult(result) {
  result.dataQuality.missingFields = [...new Set(result.dataQuality.missingFields)];
  result.uncertainty = [...new Set(result.uncertainty)];
  result.notices = result.notices.filter((notice, index, all) => index === all.findIndex((candidate) => candidate.code === notice.code && JSON.stringify(candidate.data) === JSON.stringify(notice.data)));
  result.items = result.items.filter((item, index, all) => index === all.findIndex((candidate) => candidate.itemId === item.itemId && candidate.phase === item.phase && candidate.wearPosition === item.wearPosition));
  return result;
}

export function temperatureBandFor(value) {
  if (!isFiniteNumber(value)) throw new TypeError('temperature must be a finite number');
  return rangeBandFor(value, TEMPERATURE_BANDS);
}

function rangeBandFor(value, bands) {
  return bands.find((band) => value >= band.min && value < band.max);
}

function shiftedBand(baseBand, adjustment) {
  const index = TEMPERATURE_BANDS.findIndex((band) => band.id === baseBand.id);
  const shiftedIndex = clamp(index - adjustment, 0, TEMPERATURE_BANDS.length - 1);
  return TEMPERATURE_BANDS[shiftedIndex];
}

function wearPositionForPhase(phase) {
  return phase === 'in_car' ? 'under_harness' : 'on_body';
}

function findSleepBagGuidance(bag, roomTempC) {
  if (!Array.isArray(bag.guidanceBands)) return null;
  return bag.guidanceBands.find((band) => {
    const minOk = band.minRoomTempC == null || roomTempC >= band.minRoomTempC;
    const maxOk = band.maxRoomTempC == null || roomTempC < band.maxRoomTempC;
    return minOk && maxOk;
  }) ?? null;
}

function ageMonthsAtObservation(birthDate, observationDate) {
  if (!birthDate || !observationDate) return null;
  const birth = new Date(`${birthDate}T00:00:00Z`);
  const observed = new Date(observationDate);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(observed.getTime()) || observed < birth) return null;
  let months = (observed.getUTCFullYear() - birth.getUTCFullYear()) * 12 + observed.getUTCMonth() - birth.getUTCMonth();
  if (observed.getUTCDate() < birth.getUTCDate()) months -= 1;
  return months;
}

function formatTemp(value) {
  return `${Number.isInteger(value) ? value : value.toFixed(1)} °C`;
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
