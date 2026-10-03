const MODES = ['outdoor', 'stroller', 'carrier', 'car', 'sleep'];

function def({ itemId, description, kind = 'clothing', slot, category = itemId, bodyZones = [], thermalWeight = 0,
  thermalStepCredit = 0, sleepWarmthWeight = null, tog = null, windProtection = 0,
  rainProtection = 0, sunCoverage = 0, thermalWeightByZone = null, carSeatCompatibility = 'allowed', sleepSafe = false,
  allowedSituations = MODES, styleAssetGroup = itemId }) {
  return Object.freeze({
    itemId, kind, slot, category, labelKey: `clothing.${itemId}`, description, bodyZones: Object.freeze([...bodyZones]),
    thermalWeight, thermalStepCredit, sleepWarmthWeight, tog, windProtection, rainProtection,
    sunCoverage, thermalWeightByZone: thermalWeightByZone ? Object.freeze({ ...thermalWeightByZone }) : null,
    carSeatCompatibility, sleepSafe, allowedSituations: Object.freeze([...allowedSituations]),
    styleAssetGroup
  });
}

const items = [
  def({ itemId:'short_sleeve_bodysuit', description:'Dünner Body aus Baumwolle oder Jersey mit kurzen Ärmeln.', slot:'base_torso', bodyZones:['torso'], thermalWeight:1, sleepSafe:true }),
  def({ itemId:'long_sleeve_bodysuit', description:'Dünner Body aus Baumwolle oder Jersey mit langen Ärmeln.', slot:'base_torso', bodyZones:['torso','arms'], thermalWeight:2, sleepSafe:true }),
  def({ itemId:'t_shirt', description:'Dünnes Kurzarmshirt aus Jersey, ungefüttert.', slot:'top', bodyZones:['torso'], thermalWeight:1, sleepSafe:false, allowedSituations:['outdoor','stroller','carrier','car'] }),
  def({ itemId:'light_long_sleeve_shirt', description:'Dünnes Langarmshirt aus leichtem Jersey, ungefüttert.', slot:'top', bodyZones:['torso','arms'], thermalWeight:1, sunCoverage:3, sleepSafe:false, allowedSituations:['outdoor','stroller','carrier','car'] }),

  def({ itemId:'light_trousers', description:'Dünne, ungefütterte Hose aus leichtem Stoff.', slot:'legs', bodyZones:['legs'], thermalWeight:1, sleepSafe:false, allowedSituations:['outdoor','stroller','carrier','car'] }),
  def({ itemId:'leggings', description:'Körpernahe Jersey- oder Baumwollleggings mittlerer Stoffstärke.', slot:'legs', bodyZones:['legs'], thermalWeight:2, sleepSafe:false, allowedSituations:['outdoor','stroller','carrier','car'] }),
  def({ itemId:'trousers', description:'Normale ungefütterte Alltagshose mittlerer Stoffstärke.', slot:'legs', bodyZones:['legs'], thermalWeight:2, sleepSafe:false, allowedSituations:['outdoor','stroller','carrier','car'] }),
  def({ itemId:'warm_trousers', description:'Dickere oder gefütterte Hose, deutlich wärmer als eine normale Hose.', slot:'legs', bodyZones:['legs'], thermalWeight:3, sleepSafe:false, allowedSituations:['outdoor','stroller','carrier','car'] }),
  def({ itemId:'tights', description:'Normale Strumpfhose mittlerer Stärke, die Beine und Füße bedeckt.', slot:'legs', bodyZones:['legs','feet'], thermalWeight:2, thermalWeightByZone:{ feet:1 }, sleepSafe:false, allowedSituations:['outdoor','stroller','carrier','car'] }),

  def({ itemId:'thin_sweater', description:'Leichter Strick- oder Jersey-Pullover, ungefüttert.', slot:'mid', bodyZones:['torso','arms'], thermalWeight:2, carSeatCompatibility:'allowed', allowedSituations:['outdoor','stroller','carrier','car'] }),
  def({ itemId:'sweatshirt', description:'Pullover aus normalem Sweatstoff, nicht dick gefüttert oder stark angeraut.', slot:'mid', bodyZones:['torso','arms'], thermalWeight:2, carSeatCompatibility:'allowed', allowedSituations:['outdoor','stroller','carrier','car'] }),
  def({ itemId:'thin_cardigan', description:'Dünne, leichte Strickjacke ohne starke Isolierung.', slot:'mid', bodyZones:['torso','arms'], thermalWeight:2, carSeatCompatibility:'allowed', allowedSituations:['outdoor','stroller','carrier','car'] }),
  def({ itemId:'fleece_jacket', description:'Deutlich wärmere, isolierende Mittelschicht aus Fleece.', slot:'mid', bodyZones:['torso','arms'], thermalWeight:3, windProtection:1, carSeatCompatibility:'conditional', allowedSituations:['outdoor','stroller','carrier','car'] }),

  def({ itemId:'light_transition_jacket', description:'Leichte ungefütterte Übergangsjacke mit geringer Wärmeleistung und etwas Windschutz.', slot:'outer', bodyZones:['torso','arms'], thermalWeight:1, windProtection:1, carSeatCompatibility:'conditional', allowedSituations:['outdoor','stroller','carrier','car'] }),
  def({ itemId:'insulated_transition_jacket', description:'Leicht gefütterte Übergangsjacke, zum Beispiel mit dünnem Teddy- oder Fleecefutter.', slot:'outer', bodyZones:['torso','arms'], thermalWeight:2, windProtection:1, carSeatCompatibility:'conditional', allowedSituations:['outdoor','stroller','carrier','car'] }),
  def({ itemId:'softshell_jacket', description:'Wärmere windschützende Jacke aus Softshell mit isolierender Wirkung.', slot:'outer', bodyZones:['torso','arms'], thermalWeight:3, windProtection:3, rainProtection:1, carSeatCompatibility:'conditional', allowedSituations:['outdoor','stroller','carrier','car'] }),
  def({ itemId:'rain_jacket', description:'Ungefütterte Regenjacke zum Schutz vor Regen und Wind, ohne relevante zusätzliche Wärme.', slot:'outer', bodyZones:['torso','arms'], thermalWeight:0, windProtection:3, rainProtection:3, carSeatCompatibility:'conditional', allowedSituations:['outdoor','stroller','carrier','car'] }),
  def({ itemId:'transition_overall', description:'Übergangsoverall mit leichter bis mittlerer Isolation und Windschutz.', slot:'outer', bodyZones:['torso','arms','legs'], thermalWeight:3, thermalWeightByZone:{ legs:1 }, windProtection:3, rainProtection:1, carSeatCompatibility:'prohibited', allowedSituations:['outdoor','stroller','car'] }),
  def({ itemId:'winter_overall', description:'Dick gefütterter, stark isolierender Overall für kalte Bedingungen.', slot:'outer', bodyZones:['torso','arms','legs'], thermalWeight:4, thermalWeightByZone:{ legs:1 }, windProtection:3, rainProtection:2, carSeatCompatibility:'prohibited', allowedSituations:['outdoor','stroller','car'] }),

  def({ itemId:'socks', description:'Dünne bis normale Alltagssocken.', slot:'feet', bodyZones:['feet'], thermalWeight:1, sleepSafe:false, allowedSituations:['outdoor','stroller','carrier','car'] }),
  def({ itemId:'warm_socks_booties', description:'Dicke Socken oder weiche gefütterte Baby-Booties für zusätzliche Fußwärme.', slot:'feet', bodyZones:['feet'], thermalWeight:2, sleepSafe:false, allowedSituations:['outdoor','stroller','carrier','car'] }),
  def({ itemId:'sun_hat', description:'Leichter Sonnenhut zur Verschattung von Kopf und Gesicht, ohne Wärmewirkung.', slot:'head', bodyZones:['head'], thermalWeight:0, sunCoverage:3, allowedSituations:['outdoor','stroller','carrier'] }),
  def({ itemId:'thin_hat', description:'Dünne ungefütterte Mütze aus Jersey oder Baumwolle.', slot:'head', bodyZones:['head'], thermalWeight:1, windProtection:1, allowedSituations:['outdoor','stroller','carrier'] }),
  def({ itemId:'warm_hat', description:'Warme Mütze aus Fleece, Wolle oder vergleichbar isolierendem Material.', slot:'head', bodyZones:['head'], thermalWeight:2, windProtection:2, allowedSituations:['outdoor','stroller','carrier'] }),
  def({ itemId:'gloves', description:'Dünne Handschuhe oder Fäustlinge als leichter Kälte- und Windschutz.', slot:'hands', bodyZones:['hands'], thermalWeight:1, windProtection:1, allowedSituations:['outdoor','stroller','carrier'] }),

  def({ itemId:'light_shoes', description:'Leichte ungefütterte Schuhe ohne zusätzliche Wärmeisolierung.', kind:'footwear', slot:'footwear', bodyZones:['feet'], thermalWeight:1, allowedSituations:['outdoor'] }),
  def({ itemId:'weatherproof_shoes', description:'Ungefütterte wetterfeste Schuhe mit zusätzlichem Schutz vor Nässe.', kind:'footwear', slot:'footwear', bodyZones:['feet'], thermalWeight:1, rainProtection:2, allowedSituations:['outdoor'] }),
  def({ itemId:'warm_shoes', description:'Gefütterte oder deutlich wärmere Schuhe für kalte Bedingungen.', kind:'footwear', slot:'footwear', bodyZones:['feet'], thermalWeight:2, windProtection:1, rainProtection:1, allowedSituations:['outdoor'] }),

  def({ itemId:'stroller_thermal_none', description:'Keine zusätzliche Wärmeschicht im Kinderwagen.', kind:'stroller_accessory', slot:'stroller_thermal_accessory', category:'none', thermalWeight:0, thermalStepCredit:0, carSeatCompatibility:'prohibited', allowedSituations:['stroller'] }),
  def({ itemId:'stroller_light_blanket', description:'Dünne Baumwoll-, Strick- oder vergleichbar leichte Decke als zusätzliche Wärme.', kind:'stroller_accessory', slot:'stroller_thermal_accessory', category:'blanket', bodyZones:['torso','legs','feet'], thermalWeight:1, thermalStepCredit:0.5, carSeatCompatibility:'prohibited', allowedSituations:['stroller'] }),
  def({ itemId:'stroller_warm_blanket', description:'Dickere Decke aus zum Beispiel Wolle, Fleece oder Steppmaterial.', kind:'stroller_accessory', slot:'stroller_thermal_accessory', category:'blanket', bodyZones:['torso','legs','feet'], thermalWeight:2, thermalStepCredit:1, carSeatCompatibility:'prohibited', allowedSituations:['stroller'] }),
  def({ itemId:'stroller_light_footmuff', description:'Leicht gefütterter Fußsack mit moderater zusätzlicher Wärme.', kind:'stroller_accessory', slot:'stroller_thermal_accessory', category:'footmuff', bodyZones:['torso','legs','feet'], thermalWeight:2, thermalStepCredit:1, windProtection:1, carSeatCompatibility:'prohibited', allowedSituations:['stroller'] }),
  def({ itemId:'stroller_warm_footmuff', description:'Dick gefütterter Winterfußsack mit starker zusätzlicher Wärme.', kind:'stroller_accessory', slot:'stroller_thermal_accessory', category:'footmuff', bodyZones:['torso','legs','feet'], thermalWeight:4, thermalStepCredit:2, windProtection:2, carSeatCompatibility:'prohibited', allowedSituations:['stroller'] }),

  def({ itemId:'stroller_weather_none', description:'Kein zusätzlicher Regen- oder Sonnenschutz am Kinderwagen.', kind:'stroller_accessory', slot:'stroller_weather_accessory', category:'none', thermalWeight:0, carSeatCompatibility:'prohibited', allowedSituations:['stroller'] }),
  def({ itemId:'stroller_rain_cover', description:'Regenschutz für den Kinderwagen; keine zusätzliche Wärmeschicht.', kind:'stroller_accessory', slot:'stroller_weather_accessory', category:'rain_cover', thermalWeight:0, windProtection:2, rainProtection:3, carSeatCompatibility:'prohibited', allowedSituations:['stroller'] }),
  def({ itemId:'stroller_sunshade', description:'Verschattung am Kinderwagen zum Schutz vor direkter Sonne; keine Wärmeschicht.', kind:'stroller_accessory', slot:'stroller_weather_accessory', category:'sunshade', thermalWeight:0, sunCoverage:3, carSeatCompatibility:'prohibited', allowedSituations:['stroller'] }),

  def({ itemId:'carrier_cover_none', description:'Kein zusätzliches Cover über Baby und Trage.', kind:'carrier_accessory', slot:'carrier_accessory', category:'none', thermalWeight:0, thermalStepCredit:0, allowedSituations:['carrier'] }),
  def({ itemId:'carrier_cover_light', description:'Leichtes Cover als zusätzlicher Windschutz und geringe zusätzliche Wärme.', kind:'carrier_accessory', slot:'carrier_accessory', category:'cover', bodyZones:['torso','legs'], thermalWeight:1, thermalStepCredit:0.5, windProtection:1, allowedSituations:['carrier'] }),
  def({ itemId:'carrier_cover_warm', description:'Gefüttertes Tragecover mit deutlich zusätzlicher Wärme und Windschutz.', kind:'carrier_accessory', slot:'carrier_accessory', category:'cover', bodyZones:['torso','legs'], thermalWeight:2, thermalStepCredit:1, windProtection:2, allowedSituations:['carrier'] }),

  def({ itemId:'car_thermal_none', description:'Keine zusätzliche Wärmeschicht über dem Autositzgurt.', kind:'car_accessory', slot:'car_thermal_accessory', category:'none', thermalWeight:0, thermalStepCredit:0, carSeatCompatibility:'prohibited', allowedSituations:['car'] }),
  def({ itemId:'car_blanket_over_harness', description:'Dünne Decke, die erst über dem geschlossenen Autositzgurt liegt.', kind:'car_accessory', slot:'car_thermal_accessory', category:'blanket', bodyZones:['torso','legs'], thermalWeight:1, thermalStepCredit:0.5, carSeatCompatibility:'prohibited', allowedSituations:['car'] }),
  def({ itemId:'car_warm_blanket_over_harness', description:'Dickere warme Decke, die erst über dem geschlossenen Autositzgurt liegt.', kind:'car_accessory', slot:'car_thermal_accessory', category:'blanket', bodyZones:['torso','legs'], thermalWeight:2, thermalStepCredit:1, carSeatCompatibility:'prohibited', allowedSituations:['car'] }),

  def({ itemId:'sleep_bag_none', description:'Schlafen ohne Schlafsack; weitere Schlafkleidung richtet sich nach der Raumtemperatur.', kind:'sleep_bag', slot:'sleep_bag', category:'sleep_bag', thermalWeight:0, sleepWarmthWeight:0, tog:null, carSeatCompatibility:'prohibited', sleepSafe:true, allowedSituations:['sleep'] }),
  def({ itemId:'sleep_bag_0_5', description:'Sehr leichter Schlafsack mit Herstellerangabe 0,5 TOG.', kind:'sleep_bag', slot:'sleep_bag', category:'sleep_bag', thermalWeight:1, sleepWarmthWeight:1, tog:0.5, carSeatCompatibility:'prohibited', sleepSafe:true, allowedSituations:['sleep'] }),
  def({ itemId:'sleep_bag_1_0', description:'Leichter Schlafsack mit Herstellerangabe 1,0 TOG.', kind:'sleep_bag', slot:'sleep_bag', category:'sleep_bag', thermalWeight:2, sleepWarmthWeight:2, tog:1.0, carSeatCompatibility:'prohibited', sleepSafe:true, allowedSituations:['sleep'] }),
  def({ itemId:'sleep_bag_1_5', description:'Mittlerer Schlafsack mit Herstellerangabe 1,5 TOG.', kind:'sleep_bag', slot:'sleep_bag', category:'sleep_bag', thermalWeight:3, sleepWarmthWeight:3, tog:1.5, carSeatCompatibility:'prohibited', sleepSafe:true, allowedSituations:['sleep'] }),
  def({ itemId:'sleep_bag_2_5', description:'Warmer Schlafsack mit Herstellerangabe 2,5 TOG.', kind:'sleep_bag', slot:'sleep_bag', category:'sleep_bag', thermalWeight:4, sleepWarmthWeight:4, tog:2.5, carSeatCompatibility:'prohibited', sleepSafe:true, allowedSituations:['sleep'] }),
  def({ itemId:'sleep_bag_3_5', description:'Sehr warmer Schlafsack mit Herstellerangabe 3,5 TOG.', kind:'sleep_bag', slot:'sleep_bag', category:'sleep_bag', thermalWeight:4, sleepWarmthWeight:5, tog:3.5, carSeatCompatibility:'prohibited', sleepSafe:true, allowedSituations:['sleep'] }),

  def({ itemId:'sleep_under_nappy_only', description:'Keine zusätzliche Schlafkleidung außer der Windel.', kind:'clothing', slot:'sleep_underlayer', category:'sleep_underlayer', bodyZones:['torso'], thermalWeight:0, sleepWarmthWeight:0, carSeatCompatibility:'prohibited', sleepSafe:true, allowedSituations:['sleep'] }),
  def({ itemId:'sleep_under_short_sleeve_bodysuit', description:'Dünner Kurzarmbody als körpernahe Schlafschicht.', kind:'clothing', slot:'sleep_underlayer', category:'sleep_underlayer', bodyZones:['torso'], thermalWeight:1, sleepWarmthWeight:1, carSeatCompatibility:'prohibited', sleepSafe:true, allowedSituations:['sleep'] }),
  def({ itemId:'sleep_under_long_sleeve_bodysuit', description:'Dünner Langarmbody als körpernahe Schlafschicht.', kind:'clothing', slot:'sleep_underlayer', category:'sleep_underlayer', bodyZones:['torso','arms'], thermalWeight:2, sleepWarmthWeight:2, carSeatCompatibility:'prohibited', sleepSafe:true, allowedSituations:['sleep'] }),
  def({ itemId:'sleep_under_light_pajamas', description:'Dünner ungefütterter Schlafanzug aus leichtem Jersey oder Baumwolle.', kind:'clothing', slot:'sleep_underlayer', category:'sleep_underlayer', bodyZones:['torso','arms','legs'], thermalWeight:2, sleepWarmthWeight:2, carSeatCompatibility:'prohibited', sleepSafe:true, allowedSituations:['sleep'] }),
  def({ itemId:'sleep_under_short_body_plus_light_pajamas', description:'Dünner Kurzarmbody unter einem leichten ungefütterten Schlafanzug.', kind:'clothing', slot:'sleep_underlayer', category:'sleep_underlayer', bodyZones:['torso','arms','legs'], thermalWeight:3, sleepWarmthWeight:3, carSeatCompatibility:'prohibited', sleepSafe:true, allowedSituations:['sleep'] }),
  def({ itemId:'sleep_under_long_body_plus_light_pajamas', description:'Dünner Langarmbody unter einem leichten ungefütterten Schlafanzug.', kind:'clothing', slot:'sleep_underlayer', category:'sleep_underlayer', bodyZones:['torso','arms','legs'], thermalWeight:4, sleepWarmthWeight:4, carSeatCompatibility:'prohibited', sleepSafe:true, allowedSituations:['sleep'] })
];

export const CLOTHING_CATALOG = Object.freeze(Object.fromEntries(items.map((entry) => [entry.itemId, entry])));

export function getClothingDescription(itemId) {
  return CLOTHING_CATALOG[itemId]?.description ?? '';
}

export const SLOT_ITEMS = Object.freeze(Object.fromEntries(
  [...new Set(items.map((entry) => entry.slot))].map((slot) => [slot, Object.freeze(items.filter((entry) => entry.slot === slot).map((entry) => entry.itemId))])
));
