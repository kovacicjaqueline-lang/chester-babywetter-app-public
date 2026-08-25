const ALL_OUTDOOR = ['outdoor', 'stroller', 'carrier', 'car'];

function item(itemId, {
  kind = 'clothing', slot, category = itemId, bodyZones = [], thermalWeight = 0,
  thermalStepCredit = 0, sleepWarmthWeight = null, tog = null,
  windProtection = 0, rainProtection = 0, sunCoverage = 0,
  carSeatCompatibility = 'allowed', sleepSafe = false,
  allowedSituations = ALL_OUTDOOR, styleAssetGroup = itemId
}) {
  return Object.freeze({
    itemId, kind, slot, category, labelKey: `clothing.${itemId}`, bodyZones,
    thermalWeight, thermalStepCredit, sleepWarmthWeight, tog,
    windProtection, rainProtection, sunCoverage, carSeatCompatibility,
    sleepSafe, allowedSituations, styleAssetGroup
  });
}

const entries = [
  item('short_sleeve_bodysuit', { slot: 'base_torso', bodyZones: ['torso'], thermalWeight: 1, sunCoverage: 1, sleepSafe: true, allowedSituations: [...ALL_OUTDOOR, 'sleep'] }),
  item('long_sleeve_bodysuit', { slot: 'base_torso', bodyZones: ['torso', 'arms'], thermalWeight: 2, sunCoverage: 2, sleepSafe: true, allowedSituations: [...ALL_OUTDOOR, 'sleep'] }),
  item('t_shirt', { slot: 'base_torso', bodyZones: ['torso'], thermalWeight: 1, sunCoverage: 1 }),
  item('light_long_sleeve_shirt', { slot: 'base_torso', bodyZones: ['torso', 'arms'], thermalWeight: 1, sunCoverage: 3 }),
  item('long_sleeve_shirt', { slot: 'base_torso', bodyZones: ['torso', 'arms'], thermalWeight: 2, sunCoverage: 2 }),

  item('light_trousers', { slot: 'legs', bodyZones: ['legs'], thermalWeight: 1, sunCoverage: 2, sleepSafe: true, allowedSituations: [...ALL_OUTDOOR, 'sleep'] }),
  item('trousers', { slot: 'legs', bodyZones: ['legs'], thermalWeight: 2, sunCoverage: 2, sleepSafe: true, allowedSituations: [...ALL_OUTDOOR, 'sleep'] }),
  item('warm_trousers', { slot: 'legs', bodyZones: ['legs'], thermalWeight: 3, sunCoverage: 2 }),
  item('leggings', { slot: 'legs', bodyZones: ['legs'], thermalWeight: 2, sunCoverage: 2, sleepSafe: true, allowedSituations: [...ALL_OUTDOOR, 'sleep'] }),
  item('tights', { slot: 'legs', bodyZones: ['legs', 'feet'], thermalWeight: 2, sunCoverage: 2 }),

  item('thin_sweater', { slot: 'mid', bodyZones: ['torso', 'arms'], thermalWeight: 2, sunCoverage: 2 }),
  item('sweatshirt', { slot: 'mid', bodyZones: ['torso', 'arms'], thermalWeight: 2, sunCoverage: 2 }),
  item('fleece_jacket', { slot: 'mid', bodyZones: ['torso', 'arms'], thermalWeight: 3, windProtection: 1, sunCoverage: 2, carSeatCompatibility: 'conditional' }),

  item('light_transition_jacket', { slot: 'outer', bodyZones: ['torso', 'arms'], thermalWeight: 1, windProtection: 1, sunCoverage: 2, carSeatCompatibility: 'conditional' }),
  item('softshell_jacket', { slot: 'outer', bodyZones: ['torso', 'arms'], thermalWeight: 2, windProtection: 3, rainProtection: 1, sunCoverage: 2, carSeatCompatibility: 'conditional' }),
  item('rain_jacket', { slot: 'outer', bodyZones: ['torso', 'arms'], thermalWeight: 0, windProtection: 2, rainProtection: 3, sunCoverage: 2, carSeatCompatibility: 'conditional' }),
  item('transition_overall', { slot: 'outer', bodyZones: ['torso', 'arms', 'legs'], thermalWeight: 3, windProtection: 3, rainProtection: 1, sunCoverage: 3, carSeatCompatibility: 'prohibited' }),
  item('winter_overall', { slot: 'outer', bodyZones: ['torso', 'arms', 'legs'], thermalWeight: 4, windProtection: 3, rainProtection: 2, sunCoverage: 3, carSeatCompatibility: 'prohibited' }),

  item('socks', { slot: 'feet', bodyZones: ['feet'], thermalWeight: 0, sleepSafe: true, allowedSituations: [...ALL_OUTDOOR, 'sleep'] }),
  item('warm_socks_booties', { slot: 'feet', bodyZones: ['feet'], thermalWeight: 1 }),
  item('sun_hat', { slot: 'head', bodyZones: ['head'], thermalWeight: 0, sunCoverage: 3, allowedSituations: ['outdoor', 'stroller', 'carrier'] }),
  item('thin_hat', { slot: 'head', bodyZones: ['head'], thermalWeight: 1, windProtection: 1, allowedSituations: ['outdoor', 'stroller', 'carrier'] }),
  item('warm_hat', { slot: 'head', bodyZones: ['head'], thermalWeight: 2, windProtection: 2, allowedSituations: ['outdoor', 'stroller', 'carrier'] }),
  item('gloves', { slot: 'hands', bodyZones: ['hands'], thermalWeight: 1, windProtection: 1, allowedSituations: ['outdoor', 'stroller', 'carrier'] }),
  item('soft_shoes', { kind: 'footwear', slot: 'footwear', bodyZones: ['feet'], thermalWeight: 0, allowedSituations: ['outdoor'] }),
  item('weather_shoes', { kind: 'footwear', slot: 'footwear', bodyZones: ['feet'], thermalWeight: 1, windProtection: 1, rainProtection: 2, allowedSituations: ['outdoor'] }),

  item('stroller_light_blanket', { kind: 'stroller_accessory', slot: 'stroller_thermal_accessory', category: 'blanket', bodyZones: ['torso', 'legs', 'feet'], thermalWeight: 1, thermalStepCredit: 0.5, carSeatCompatibility: 'prohibited', allowedSituations: ['stroller'] }),
  item('stroller_warm_blanket', { kind: 'stroller_accessory', slot: 'stroller_thermal_accessory', category: 'blanket', bodyZones: ['torso', 'legs', 'feet'], thermalWeight: 2, thermalStepCredit: 1, carSeatCompatibility: 'prohibited', allowedSituations: ['stroller'] }),
  item('stroller_light_footmuff', { kind: 'stroller_accessory', slot: 'stroller_thermal_accessory', category: 'footmuff', bodyZones: ['torso', 'legs', 'feet'], thermalWeight: 2, thermalStepCredit: 1, windProtection: 1, carSeatCompatibility: 'prohibited', allowedSituations: ['stroller'] }),
  item('stroller_warm_footmuff', { kind: 'stroller_accessory', slot: 'stroller_thermal_accessory', category: 'footmuff', bodyZones: ['torso', 'legs', 'feet'], thermalWeight: 4, thermalStepCredit: 2, windProtection: 2, carSeatCompatibility: 'prohibited', allowedSituations: ['stroller'] }),
  item('stroller_rain_cover', { kind: 'stroller_accessory', slot: 'stroller_weather_accessory', category: 'rain_cover', windProtection: 2, rainProtection: 3, carSeatCompatibility: 'prohibited', allowedSituations: ['stroller'] }),
  item('stroller_sunshade', { kind: 'stroller_accessory', slot: 'stroller_weather_accessory', category: 'sunshade', sunCoverage: 3, carSeatCompatibility: 'prohibited', allowedSituations: ['stroller'] }),

  item('carrier_cover_light', { kind: 'carrier_accessory', slot: 'carrier_accessory', category: 'carrier_cover', bodyZones: ['torso'], thermalWeight: 1, thermalStepCredit: 0.5, windProtection: 1, allowedSituations: ['carrier'] }),
  item('carrier_cover_warm', { kind: 'carrier_accessory', slot: 'carrier_accessory', category: 'carrier_cover', bodyZones: ['torso'], thermalWeight: 2, thermalStepCredit: 1, windProtection: 2, allowedSituations: ['carrier'] }),

  item('sleep_bag_none', { kind: 'sleep_bag', slot: 'sleep_bag', category: 'sleep_bag', sleepWarmthWeight: 0, sleepSafe: true, allowedSituations: ['sleep'] }),
  item('sleep_bag_0_5', { kind: 'sleep_bag', slot: 'sleep_bag', category: 'sleep_bag', sleepWarmthWeight: 1, tog: 0.5, sleepSafe: true, allowedSituations: ['sleep'] }),
  item('sleep_bag_1_0', { kind: 'sleep_bag', slot: 'sleep_bag', category: 'sleep_bag', sleepWarmthWeight: 2, tog: 1.0, sleepSafe: true, allowedSituations: ['sleep'] }),
  item('sleep_bag_1_5', { kind: 'sleep_bag', slot: 'sleep_bag', category: 'sleep_bag', sleepWarmthWeight: 3, tog: 1.5, sleepSafe: true, allowedSituations: ['sleep'] }),
  item('sleep_bag_2_5', { kind: 'sleep_bag', slot: 'sleep_bag', category: 'sleep_bag', sleepWarmthWeight: 4, tog: 2.5, sleepSafe: true, allowedSituations: ['sleep'] }),
  item('sleep_bag_3_5', { kind: 'sleep_bag', slot: 'sleep_bag', category: 'sleep_bag', sleepWarmthWeight: 5, tog: 3.5, sleepSafe: true, allowedSituations: ['sleep'] }),

  item('sleep_underlayer_nappy_only', { slot: 'sleep_underlayer', category: 'sleep_underlayer', sleepWarmthWeight: 0, sleepSafe: true, allowedSituations: ['sleep'] }),
  item('sleep_underlayer_short_sleeve_bodysuit', { slot: 'sleep_underlayer', category: 'sleep_underlayer', sleepWarmthWeight: 1, sleepSafe: true, allowedSituations: ['sleep'] }),
  item('sleep_underlayer_long_sleeve_bodysuit', { slot: 'sleep_underlayer', category: 'sleep_underlayer', sleepWarmthWeight: 2, sleepSafe: true, allowedSituations: ['sleep'] }),
  item('sleep_underlayer_light_pajamas', { slot: 'sleep_underlayer', category: 'sleep_underlayer', sleepWarmthWeight: 2, sleepSafe: true, allowedSituations: ['sleep'] }),
  item('sleep_underlayer_short_bodysuit_plus_light_pajamas', { slot: 'sleep_underlayer', category: 'sleep_underlayer', sleepWarmthWeight: 3, sleepSafe: true, allowedSituations: ['sleep'] }),
  item('sleep_underlayer_long_bodysuit_plus_light_pajamas', { slot: 'sleep_underlayer', category: 'sleep_underlayer', sleepWarmthWeight: 4, sleepSafe: true, allowedSituations: ['sleep'] })
];

export const CLOTHING_CATALOG = Object.freeze(Object.fromEntries(entries.map((entry) => [entry.itemId, entry])));
export const OUTFIT_CATALOG = CLOTHING_CATALOG;

export function itemsForSlot(slot, mode) {
  return Object.values(CLOTHING_CATALOG).filter((entry) => entry.slot === slot && (!mode || entry.allowedSituations.includes(mode)));
}
