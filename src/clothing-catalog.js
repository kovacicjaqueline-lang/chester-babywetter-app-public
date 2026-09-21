const MODES = ['outdoor', 'stroller', 'carrier', 'car', 'sleep'];

// User-facing clothing copy belongs beside the item definition so Outfit, alternatives
// and the catalog cannot drift into different meanings for the same item.
const CLOTHING_COPY = Object.freeze({
  short_sleeve_bodysuit: ['Kurzarmbody', 'Dünne Basisschicht mit kurzen Ärmeln.'],
  long_sleeve_bodysuit: ['Langarmbody', 'Dünne Basisschicht mit langen Ärmeln.'],
  t_shirt: ['T-Shirt', 'Leichtes Oberteil mit kurzen Ärmeln.'],
  light_long_sleeve_shirt: ['Leichtes Langarmshirt', 'Leichtes Oberteil mit langen Ärmeln.'],
  light_trousers: ['Leichte Hose', 'Dünne, ungefütterte Hose.'],
  leggings: ['Leggings', 'Eng anliegende, dünne bis mitteldicke Hose.'],
  trousers: ['Hose', 'Normale, ungefütterte Hose.'],
  warm_trousers: ['Warme Hose', 'Dickere oder gefütterte, stärker wärmende Hose.'],
  tights: ['Strumpfhose', 'Dünne bis mitteldicke Ganzbein-Basisschicht.'],
  thin_sweater: ['Dünner Pullover', 'Leichte, langärmlige Zwischenschicht aus dünnem Stoff.'],
  sweatshirt: ['Sweatshirt', 'Mitteldicke, langärmlige Zwischenschicht aus Sweatstoff.'],
  fleece_jacket: ['Fleecejacke', 'Weiche, wärmende Zwischenschicht aus Fleece.'],
  light_transition_jacket: ['Leichte Übergangsjacke', 'Leichte Außenschicht für milde Temperaturen und etwas Wind.'],
  softshell_jacket: ['Softshelljacke', 'Windabweisende, wärmende Außenschicht mit etwas Regenschutz.'],
  rain_jacket: ['Regenjacke', 'Leichte, wasserdichte Außenschicht; sie wärmt nur wenig.'],
  transition_overall: ['Übergangsoverall', 'Einteiliger, mitteldicker Overall für milde bis kühle Temperaturen.'],
  winter_overall: ['Winteroverall', 'Dicker, gefütterter Overall für kalte Temperaturen.'],
  socks: ['Socken', 'Dünne Fußschicht ohne zusätzliche starke Polsterung.'],
  warm_socks_booties: ['Warme Socken / Booties', 'Dicke Socken oder weiche, warme Überzieher für die Füße.'],
  sun_hat: ['Sonnenhut', 'Leichter Hut, der Kopf und Gesicht vor Sonne schützt.'],
  thin_hat: ['Dünne Mütze', 'Leichte Mütze für etwas Wärme und Windschutz.'],
  warm_hat: ['Warme Mütze', 'Dickere, stärker wärmende Mütze.'],
  gloves: ['Handschuhe', 'Wärmende Bedeckung für die Hände.'],
  light_shoes: ['Leichte Schuhe', 'Dünne Schuhe für trockene Wege und milde Bedingungen.'],
  weatherproof_shoes: ['Wetterfeste Schuhe', 'Schuhe mit zusätzlichem Schutz vor Nässe.'],
  warm_shoes: ['Warme Schuhe', 'Gefütterte oder stärker wärmende Schuhe.'],
  stroller_thermal_none: ['Kein Wärmezubehör', 'Keine zusätzliche Wärmeschicht im Kinderwagen.'],
  stroller_light_blanket: ['Leichte Kinderwagendecke', 'Dünne Decke für eine zusätzliche, leicht anpassbare Schicht.'],
  stroller_warm_blanket: ['Warme Kinderwagendecke', 'Dicke Decke für deutlich mehr Wärme im Kinderwagen.'],
  stroller_light_footmuff: ['Leichter Fußsack', 'Leicht wärmender Fußsack, der Beine und Füße umschließt.'],
  stroller_warm_footmuff: ['Warmer Fußsack', 'Dicker, stark wärmender Fußsack für den Kinderwagen.'],
  stroller_weather_none: ['Kein Wetterschutz-Zubehör', 'Kein zusätzlicher Regen- oder Sonnenschutz am Kinderwagen.'],
  stroller_rain_cover: ['Regenverdeck', 'Schützt den Kinderwagen vor Regen; Luftzirkulation muss frei bleiben.'],
  stroller_sunshade: ['Sonnensegel / Sonnenschirm', 'Spendet Schatten; die Luftzirkulation muss frei bleiben.'],
  carrier_cover_none: ['Kein Tragecover', 'Keine zusätzliche Wärmeschicht über der Trage.'],
  carrier_cover_light: ['Leichtes Tragecover', 'Leichte zusätzliche Wärmeschicht über dem getragenen Baby.'],
  carrier_cover_warm: ['Warmes Tragecover', 'Dicke zusätzliche Wärmeschicht über dem getragenen Baby.'],
  car_thermal_none: ['Keine zusätzliche Decke', 'Keine zusätzliche Wärmeschicht über dem Autositzgurt.'],
  car_blanket_over_harness: ['Leichte Decke über dem Autositzgurt', 'Leichte Decke, die nur über dem geschlossenen Gurt liegt.'],
  car_warm_blanket_over_harness: ['Warme Decke über dem Autositzgurt', 'Dicke Decke, die nur über dem geschlossenen Gurt liegt.'],
  sleep_bag_none: ['Kein Schlafsack', 'Kein zusätzlicher Schlafsack; die Unterkleidung bleibt die Wärmeschicht.'],
  sleep_bag_0_5: ['Schlafsack 0,5 TOG', 'Sehr leichter Schlafsack für warme Schlafräume.'],
  sleep_bag_1_0: ['Schlafsack 1,0 TOG', 'Leichter Schlafsack für milde Schlafräume.'],
  sleep_bag_1_5: ['Schlafsack 1,5 TOG', 'Mitteldicker Schlafsack für mäßig warme Schlafräume.'],
  sleep_bag_2_5: ['Schlafsack 2,5 TOG', 'Warmer Schlafsack für kühlere Schlafräume.'],
  sleep_bag_3_5: ['Schlafsack 3,5 TOG', 'Sehr warmer Schlafsack für kalte Schlafräume.'],
  sleep_under_nappy_only: ['Nur Windel', 'Keine zusätzliche Kleidung unter dem Schlafsack.'],
  sleep_under_short_sleeve_bodysuit: ['Kurzarmbody zum Schlafen', 'Leichte Schlaf-Basisschicht mit kurzen Ärmeln.'],
  sleep_under_long_sleeve_bodysuit: ['Langarmbody zum Schlafen', 'Leichte Schlaf-Basisschicht mit langen Ärmeln.'],
  sleep_under_light_pajamas: ['Leichter Schlafanzug', 'Leichter einteiliger oder zweiteiliger Schlafanzug.'],
  sleep_under_short_body_plus_light_pajamas: ['Kurzarmbody + leichter Schlafanzug', 'Kurzarmbody kombiniert mit einem leichten Schlafanzug.'],
  sleep_under_long_body_plus_light_pajamas: ['Langarmbody + leichter Schlafanzug', 'Langarmbody kombiniert mit einem leichten Schlafanzug.']
});

function def({ itemId, kind = 'clothing', slot, category = itemId, bodyZones = [], thermalWeight = 0,
  thermalStepCredit = 0, sleepWarmthWeight = null, tog = null, windProtection = 0,
  rainProtection = 0, sunCoverage = 0, carSeatCompatibility = 'allowed', sleepSafe = false,
  allowedSituations = MODES, styleAssetGroup = itemId }) {
  const [label, description] = CLOTHING_COPY[itemId] ?? [itemId, 'Keine Beschreibung hinterlegt.'];
  return Object.freeze({
    itemId, kind, slot, category, label, description, labelKey: `clothing.${itemId}`, bodyZones: Object.freeze([...bodyZones]),
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
  def({ itemId:'rain_jacket', slot:'outer', bodyZones:['torso','arms'], thermalWeight:0, windProtection:3, rainProtection:3, carSeatCompatibility:'conditional', allowedSituations:['outdoor','stroller','carrier','car'] }),
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

  def({ itemId:'car_thermal_none', kind:'car_accessory', slot:'car_thermal_accessory', category:'none', thermalWeight:0, thermalStepCredit:0, carSeatCompatibility:'prohibited', allowedSituations:['car'] }),
  def({ itemId:'car_blanket_over_harness', kind:'car_accessory', slot:'car_thermal_accessory', category:'blanket', bodyZones:['torso','legs'], thermalWeight:1, thermalStepCredit:0.5, carSeatCompatibility:'prohibited', allowedSituations:['car'] }),
  def({ itemId:'car_warm_blanket_over_harness', kind:'car_accessory', slot:'car_thermal_accessory', category:'blanket', bodyZones:['torso','legs'], thermalWeight:2, thermalStepCredit:1, carSeatCompatibility:'prohibited', allowedSituations:['car'] }),

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
