const MODES = ['outdoor', 'stroller', 'carrier', 'car', 'sleep'];

function def({ itemId, kind = 'clothing', slot, category = itemId, bodyZones = [], thermalWeight = 0,
  thermalStepCredit = 0, sleepWarmthWeight = null, tog = null, windProtection = 0,
  rainProtection = 0, sunCoverage = 0, carSeatCompatibility = 'allowed', sleepSafe = false,
  allowedSituations = MODES, styleAssetGroup = itemId }) {
  return Object.freeze({
    itemId, kind, slot, category, labelKey: `clothing.${itemId}`, bodyZones: Object.freeze([...bodyZones]),
    thermalWeight, thermalStepCredit, sleepWarmthWeight, tog, windProtection, rainProtection,
    sunCoverage, carSeatCompatibility, sleepSafe, allowedSituations: Object.freeze([...allowedSituations]),
    styleAssetGroup
  });
}

const items = [
  def({ itemId:'short_sleeve_bodysuit', slot:'base_torso', bodyZones:['torso'], thermalWeight:1, sleepSafe:true }),
  def({ itemId:'long_sleeve_bodysuit', slot:'base_torso', bodyZones:['torso','arms'], thermalWeight:2, sleepSafe:true }),
  def({ itemId:'t_shirt', slot:'base_torso', bodyZones:['torso'], thermalWeight:1, sleepSafe:false, allowedSituations:['outdoor','stroller','carrier','car'] }),
  def({ itemId:'light_long_sleeve_shirt', slot:'base_torso', bodyZones:['torso','arms'], thermalWeight:1, sunCoverage:3, sleepSafe:false, allowedSituations:['outdoor','stroller','carrier','car'] }),

  def({ itemId:'light_trousers', slot:'legs', bodyZones:['legs'], thermalWeight:1, sleepSafe:false, allowedSituations:['outdoor','stroller','carrier','car'] }),
  def({ itemId:'leggings', slot:'legs', bodyZones:['legs'], thermalWeight:2, sleepSafe:false, allowedSituations:['outdoor','stroller','carrier','car'] }),
  def({ itemId:'trousers', slot:'legs', bodyZones:['legs'], thermalWeight:2, sleepSafe:false, allowedSituations:['outdoor','stroller','carrier','car'] }),
  def({ itemId:'warm_trousers', slot:'legs', bodyZones:['legs'], thermalWeight:3, sleepSafe:false, allowedSituations:['outdoor','stroller','carrier','car'] }),
  def({ itemId:'tights', slot:'legs', bodyZones:['legs','feet'], thermalWeight:2, sleepSafe:false, allowedSituations:['outdoor','stroller','carrier','car'] }),

  def({ itemId:'thin_sweater', slot:'mid', bodyZones:['torso','arms'], thermalWeight:2, carSeatCompatibility:'allowed', allowedSituations:['outdoor','stroller','carrier','car'] }),
  def({ itemId:'sweatshirt', slot:'mid', bodyZones:['torso','arms'], thermalWeight:2, carSeatCompatibility:'allowed', allowedSituations:['outdoor','stroller','carrier','car'] }),
  def({ itemId:'fleece_jacket', slot:'mid', bodyZones:['torso','arms'], thermalWeight:3, windProtection:1, carSeatCompatibility:'conditional', allowedSituations:['outdoor','stroller','carrier','car'] }),

  def({ itemId:'light_transition_jacket', slot:'outer', bodyZones:['torso','arms'], thermalWeight:1, windProtection:1, carSeatCompatibility:'conditional', allowedSituations:['outdoor','stroller','carrier','car'] }),
  def({ itemId:'softshell_jacket', slot:'outer', bodyZones:['torso','arms'], thermalWeight:3, windProtection:3, rainProtection:1, carSeatCompatibility:'conditional', allowedSituations:['outdoor','stroller','carrier','car'] }),
  def({ itemId:'rain_jacket', slot:'outer', bodyZones:['torso','arms'], thermalWeight:0, windProtection:2, rainProtection:3, carSeatCompatibility:'conditional', allowedSituations:['outdoor','stroller','carrier','car'] }),
  def({ itemId:'transition_overall', slot:'outer', bodyZones:['torso','arms','legs'], thermalWeight:3, windProtection:3, rainProtection:1, carSeatCompatibility:'prohibited', allowedSituations:['outdoor','stroller','car'] }),
  def({ itemId:'winter_overall', slot:'outer', bodyZones:['torso','arms','legs'], thermalWeight:4, windProtection:3, rainProtection:2, carSeatCompatibility:'prohibited', allowedSituations:['outdoor','stroller','car'] }),

  def({ itemId:'socks', slot:'feet', bodyZones:['feet'], thermalWeight:1, sleepSafe:false, allowedSituations:['outdoor','stroller','carrier','car'] }),
  def({ itemId:'warm_socks_booties', slot:'feet', bodyZones:['feet'], thermalWeight:2, sleepSafe:false, allowedSituations:['outdoor','stroller','carrier','car'] }),
  def({ itemId:'sun_hat', slot:'head', bodyZones:['head'], thermalWeight:0, sunCoverage:3, allowedSituations:['outdoor','stroller','carrier'] }),
  def({ itemId:'thin_hat', slot:'head', bodyZones:['head'], thermalWeight:1, windProtection:1, allowedSituations:['outdoor','stroller','carrier'] }),
  def({ itemId:'warm_hat', slot:'head', bodyZones:['head'], thermalWeight:2, windProtection:2, allowedSituations:['outdoor','stroller','carrier'] }),
  def({ itemId:'gloves', slot:'hands', bodyZones:['hands'], thermalWeight:1, windProtection:1, allowedSituations:['outdoor','stroller','carrier'] }),

  def({ itemId:'light_shoes', kind:'footwear', slot:'footwear', bodyZones:['feet'], thermalWeight:1, allowedSituations:['outdoor'] }),
  def({ itemId:'weatherproof_shoes', kind:'footwear', slot:'footwear', bodyZones:['feet'], thermalWeight:1, rainProtection:2, allowedSituations:['outdoor'] }),
  def({ itemId:'warm_shoes', kind:'footwear', slot:'footwear', bodyZones:['feet'], thermalWeight:2, windProtection:1, rainProtection:1, allowedSituations:['outdoor'] }),

  def({ itemId:'stroller_thermal_none', kind:'stroller_accessory', slot:'stroller_thermal_accessory', category:'none', thermalWeight:0, thermalStepCredit:0, carSeatCompatibility:'prohibited', allowedSituations:['stroller'] }),
  def({ itemId:'stroller_light_blanket', kind:'stroller_accessory', slot:'stroller_thermal_accessory', category:'blanket', bodyZones:['torso','legs','feet'], thermalWeight:1, thermalStepCredit:0.5, carSeatCompatibility:'prohibited', allowedSituations:['stroller'] }),
  def({ itemId:'stroller_warm_blanket', kind:'stroller_accessory', slot:'stroller_thermal_accessory', category:'blanket', bodyZones:['torso','legs','feet'], thermalWeight:2, thermalStepCredit:1, carSeatCompatibility:'prohibited', allowedSituations:['stroller'] }),
  def({ itemId:'stroller_light_footmuff', kind:'stroller_accessory', slot:'stroller_thermal_accessory', category:'footmuff', bodyZones:['torso','legs','feet'], thermalWeight:2, thermalStepCredit:1, windProtection:1, carSeatCompatibility:'prohibited', allowedSituations:['stroller'] }),
  def({ itemId:'stroller_warm_footmuff', kind:'stroller_accessory', slot:'stroller_thermal_accessory', category:'footmuff', bodyZones:['torso','legs','feet'], thermalWeight:4, thermalStepCredit:2, windProtection:2, carSeatCompatibility:'prohibited', allowedSituations:['stroller'] }),

  def({ itemId:'stroller_weather_none', kind:'stroller_accessory', slot:'stroller_weather_accessory', category:'none', thermalWeight:0, carSeatCompatibility:'prohibited', allowedSituations:['stroller'] }),
  def({ itemId:'stroller_rain_cover', kind:'stroller_accessory', slot:'stroller_weather_accessory', category:'rain_cover', thermalWeight:0, windProtection:2, rainProtection:3, carSeatCompatibility:'prohibited', allowedSituations:['stroller'] }),
  def({ itemId:'stroller_sunshade', kind:'stroller_accessory', slot:'stroller_weather_accessory', category:'sunshade', thermalWeight:0, sunCoverage:3, carSeatCompatibility:'prohibited', allowedSituations:['stroller'] }),

  def({ itemId:'carrier_cover_none', kind:'carrier_accessory', slot:'carrier_accessory', category:'none', thermalWeight:0, thermalStepCredit:0, allowedSituations:['carrier'] }),
  def({ itemId:'carrier_cover_light', kind:'carrier_accessory', slot:'carrier_accessory', category:'cover', bodyZones:['torso','legs'], thermalWeight:1, thermalStepCredit:0.5, windProtection:1, allowedSituations:['carrier'] }),
  def({ itemId:'carrier_cover_warm', kind:'carrier_accessory', slot:'carrier_accessory', category:'cover', bodyZones:['torso','legs'], thermalWeight:2, thermalStepCredit:1, windProtection:2, allowedSituations:['carrier'] }),

  def({ itemId:'car_blanket_over_harness', kind:'clothing', slot:'outer', category:'blanket', bodyZones:['torso','legs'], thermalWeight:2, carSeatCompatibility:'prohibited', allowedSituations:['car'] }),

  def({ itemId:'sleep_bag_none', kind:'sleep_bag', slot:'sleep_bag', category:'sleep_bag', thermalWeight:0, sleepWarmthWeight:0, tog:null, carSeatCompatibility:'prohibited', sleepSafe:true, allowedSituations:['sleep'] }),
  def({ itemId:'sleep_bag_0_5', kind:'sleep_bag', slot:'sleep_bag', category:'sleep_bag', thermalWeight:1, sleepWarmthWeight:1, tog:0.5, carSeatCompatibility:'prohibited', sleepSafe:true, allowedSituations:['sleep'] }),
  def({ itemId:'sleep_bag_1_0', kind:'sleep_bag', slot:'sleep_bag', category:'sleep_bag', thermalWeight:2, sleepWarmthWeight:2, tog:1.0, carSeatCompatibility:'prohibited', sleepSafe:true, allowedSituations:['sleep'] }),
  def({ itemId:'sleep_bag_1_5', kind:'sleep_bag', slot:'sleep_bag', category:'sleep_bag', thermalWeight:3, sleepWarmthWeight:3, tog:1.5, carSeatCompatibility:'prohibited', sleepSafe:true, allowedSituations:['sleep'] }),
  def({ itemId:'sleep_bag_2_5', kind:'sleep_bag', slot:'sleep_bag', category:'sleep_bag', thermalWeight:4, sleepWarmthWeight:4, tog:2.5, carSeatCompatibility:'prohibited', sleepSafe:true, allowedSituations:['sleep'] }),
  def({ itemId:'sleep_bag_3_5', kind:'sleep_bag', slot:'sleep_bag', category:'sleep_bag', thermalWeight:4, sleepWarmthWeight:5, tog:3.5, carSeatCompatibility:'prohibited', sleepSafe:true, allowedSituations:['sleep'] }),

  def({ itemId:'sleep_under_nappy_only', kind:'clothing', slot:'sleep_underlayer', category:'sleep_underlayer', bodyZones:['torso'], thermalWeight:0, sleepWarmthWeight:0, carSeatCompatibility:'prohibited', sleepSafe:true, allowedSituations:['sleep'] }),
  def({ itemId:'sleep_under_short_sleeve_bodysuit', kind:'clothing', slot:'sleep_underlayer', category:'sleep_underlayer', bodyZones:['torso'], thermalWeight:1, sleepWarmthWeight:1, carSeatCompatibility:'prohibited', sleepSafe:true, allowedSituations:['sleep'] }),
  def({ itemId:'sleep_under_long_sleeve_bodysuit', kind:'clothing', slot:'sleep_underlayer', category:'sleep_underlayer', bodyZones:['torso','arms'], thermalWeight:2, sleepWarmthWeight:2, carSeatCompatibility:'prohibited', sleepSafe:true, allowedSituations:['sleep'] }),
  def({ itemId:'sleep_under_light_pajamas', kind:'clothing', slot:'sleep_underlayer', category:'sleep_underlayer', bodyZones:['torso','arms','legs'], thermalWeight:2, sleepWarmthWeight:2, carSeatCompatibility:'prohibited', sleepSafe:true, allowedSituations:['sleep'] }),
  def({ itemId:'sleep_under_short_body_plus_light_pajamas', kind:'clothing', slot:'sleep_underlayer', category:'sleep_underlayer', bodyZones:['torso','arms','legs'], thermalWeight:3, sleepWarmthWeight:3, carSeatCompatibility:'prohibited', sleepSafe:true, allowedSituations:['sleep'] }),
  def({ itemId:'sleep_under_long_body_plus_light_pajamas', kind:'clothing', slot:'sleep_underlayer', category:'sleep_underlayer', bodyZones:['torso','arms','legs'], thermalWeight:4, sleepWarmthWeight:4, carSeatCompatibility:'prohibited', sleepSafe:true, allowedSituations:['sleep'] })
];

export const CLOTHING_CATALOG = Object.freeze(Object.fromEntries(items.map((entry) => [entry.itemId, entry])));

export const SLOT_ITEMS = Object.freeze(Object.fromEntries(
  [...new Set(items.map((entry) => entry.slot))].map((slot) => [slot, Object.freeze(items.filter((entry) => entry.slot === slot).map((entry) => entry.itemId))])
));
