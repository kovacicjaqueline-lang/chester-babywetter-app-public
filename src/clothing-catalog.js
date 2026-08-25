export const CLOTHING_CATALOG = Object.freeze({
  short_sleeve_bodysuit: item('short_sleeve_bodysuit', 'base', ['torso'], 0, 0, 0, 1, 'allowed', true, ['outdoor', 'stroller', 'carrier', 'car', 'sleep']),
  long_sleeve_bodysuit: item('long_sleeve_bodysuit', 'base', ['torso', 'arms'], 1, 0, 0, 2, 'allowed', true, ['outdoor', 'stroller', 'carrier', 'car', 'sleep']),
  t_shirt: item('t_shirt', 'base', ['torso'], 0, 0, 0, 1, 'allowed', false, ['outdoor', 'stroller', 'carrier', 'car']),
  light_long_sleeve_shirt: item('light_long_sleeve_shirt', 'base', ['torso', 'arms'], 0, 0, 0, 3, 'allowed', false, ['outdoor', 'stroller', 'carrier', 'car']),
  long_sleeve_shirt: item('long_sleeve_shirt', 'base', ['torso', 'arms'], 1, 0, 0, 2, 'allowed', false, ['outdoor', 'stroller', 'carrier', 'car']),
  sleep_suit: item('sleep_suit', 'base', ['torso', 'arms', 'legs', 'feet'], 1, 0, 0, 2, 'allowed', true, ['sleep']),

  light_trousers: item('light_trousers', 'legs', ['legs'], 0, 0, 0, 2, 'allowed', true, ['outdoor', 'stroller', 'carrier', 'car', 'sleep']),
  trousers: item('trousers', 'legs', ['legs'], 1, 0, 0, 2, 'allowed', true, ['outdoor', 'stroller', 'carrier', 'car', 'sleep']),
  warm_trousers: item('warm_trousers', 'legs', ['legs'], 2, 0, 0, 2, 'allowed', true, ['outdoor', 'stroller', 'carrier', 'car']),
  leggings: item('leggings', 'legs', ['legs'], 1, 0, 0, 2, 'allowed', true, ['outdoor', 'stroller', 'carrier', 'car', 'sleep']),
  tights: item('tights', 'legs', ['legs', 'feet'], 1, 0, 0, 2, 'allowed', true, ['outdoor', 'stroller', 'carrier', 'car']),

  thin_sweater: item('thin_sweater', 'mid', ['torso', 'arms'], 1, 0, 0, 2, 'allowed', false, ['outdoor', 'stroller', 'carrier', 'car']),
  sweatshirt: item('sweatshirt', 'mid', ['torso', 'arms'], 2, 0, 0, 2, 'allowed', false, ['outdoor', 'stroller', 'carrier', 'car']),
  fleece_jacket: item('fleece_jacket', 'mid', ['torso', 'arms'], 3, 1, 0, 2, 'conditional', false, ['outdoor', 'stroller', 'carrier', 'car']),

  light_transition_jacket: item('light_transition_jacket', 'outer', ['torso', 'arms'], 1, 1, 0, 2, 'conditional', false, ['outdoor', 'stroller', 'carrier', 'car']),
  softshell_jacket: item('softshell_jacket', 'outer', ['torso', 'arms'], 2, 3, 1, 2, 'conditional', false, ['outdoor', 'stroller', 'carrier', 'car']),
  rain_jacket: item('rain_jacket', 'outer', ['torso', 'arms'], 1, 2, 3, 2, 'conditional', false, ['outdoor', 'stroller', 'carrier', 'car']),
  transition_overall: item('transition_overall', 'outer', ['torso', 'arms', 'legs'], 3, 3, 1, 3, 'prohibited', false, ['outdoor', 'stroller', 'car']),
  winter_overall: item('winter_overall', 'outer', ['torso', 'arms', 'legs'], 4, 3, 2, 3, 'prohibited', false, ['outdoor', 'stroller', 'car']),

  socks: item('socks', 'accessory', ['feet'], 0, 0, 0, 0, 'allowed', true, ['outdoor', 'stroller', 'carrier', 'car', 'sleep']),
  warm_socks_booties: item('warm_socks_booties', 'accessory', ['feet'], 1, 0, 0, 0, 'allowed', true, ['outdoor', 'stroller', 'carrier', 'car']),
  sun_hat: item('sun_hat', 'accessory', ['head'], 0, 0, 0, 3, 'allowed', false, ['outdoor', 'stroller', 'carrier']),
  thin_hat: item('thin_hat', 'accessory', ['head'], 1, 1, 0, 0, 'allowed', false, ['outdoor', 'stroller', 'carrier']),
  warm_hat: item('warm_hat', 'accessory', ['head'], 2, 2, 0, 0, 'allowed', false, ['outdoor', 'stroller', 'carrier']),
  gloves: item('gloves', 'accessory', ['hands'], 1, 1, 0, 0, 'allowed', false, ['outdoor', 'stroller', 'carrier']),

  light_footmuff: item('light_footmuff', 'external', ['torso', 'legs', 'feet'], 1, 1, 0, 0, 'prohibited', false, ['stroller']),
  footmuff: item('footmuff', 'external', ['torso', 'legs', 'feet'], 0, 1, 0, 0, 'prohibited', false, ['stroller']),
  blanket_over_harness: item('blanket_over_harness', 'external', ['torso', 'legs'], 1, 0, 0, 0, 'prohibited', false, ['car'])
});

function item(itemId, layer, bodyZones, thermalWeight, windProtection, rainProtection, sunCoverage, carSeatCompatibility, sleepSafe, allowedSituations) {
  return Object.freeze({
    itemId,
    category: itemId,
    layer,
    labelKey: `clothing.${itemId}`,
    bodyZones,
    thermalWeight,
    windProtection,
    rainProtection,
    sunCoverage,
    carSeatCompatibility,
    sleepSafe,
    allowedSituations,
    styleAssetGroup: itemId
  });
}
