export const GENERIC_TOG_TABLE = Object.freeze([
  Object.freeze({ id:'below_16', min:-Infinity, max:16, label:'< 16 °C', sleepBagId:'sleep_bag_3_5', tog:3.5, underlayerId:'sleep_under_long_sleeve_bodysuit', targetWarmth:7 }),
  Object.freeze({ id:'16_to_18', min:16, max:18, label:'16 bis < 18 °C', sleepBagId:'sleep_bag_2_5', tog:2.5, underlayerId:'sleep_under_long_sleeve_bodysuit', targetWarmth:6 }),
  Object.freeze({ id:'18_to_20', min:18, max:20, label:'18 bis < 20 °C', sleepBagId:'sleep_bag_2_5', tog:2.5, underlayerId:'sleep_under_short_sleeve_bodysuit', targetWarmth:5 }),
  Object.freeze({ id:'20_to_22', min:20, max:22, label:'20 bis < 22 °C', sleepBagId:'sleep_bag_1_5', tog:1.5, underlayerId:'sleep_under_short_sleeve_bodysuit', targetWarmth:4 }),
  Object.freeze({ id:'22_to_24', min:22, max:24, label:'22 bis < 24 °C', sleepBagId:'sleep_bag_1_0', tog:1.0, underlayerId:'sleep_under_short_sleeve_bodysuit', targetWarmth:3 }),
  Object.freeze({ id:'24_to_27', min:24, max:27, label:'24 bis < 27 °C', sleepBagId:'sleep_bag_0_5', tog:0.5, underlayerId:'sleep_under_short_sleeve_bodysuit', targetWarmth:2 }),
  Object.freeze({ id:'27_plus', min:27, max:Infinity, label:'≥ 27 °C', sleepBagId:'sleep_bag_none', tog:null, underlayerId:'sleep_under_nappy_only', targetWarmth:0 })
]);

export const SLEEP_BAG_IDS = Object.freeze([
  'sleep_bag_none','sleep_bag_0_5','sleep_bag_1_0','sleep_bag_1_5','sleep_bag_2_5','sleep_bag_3_5'
]);

export const SLEEP_UNDERLAYER_IDS = Object.freeze([
  'sleep_under_nappy_only',
  'sleep_under_short_sleeve_bodysuit',
  'sleep_under_long_sleeve_bodysuit',
  'sleep_under_light_pajamas',
  'sleep_under_short_body_plus_light_pajamas',
  'sleep_under_long_body_plus_light_pajamas'
]);

export function genericTogGuidanceForRoomTemp(roomTempC) {
  if (!Number.isFinite(roomTempC)) throw new TypeError('roomTempC must be finite');
  return GENERIC_TOG_TABLE.find((row) => roomTempC >= row.min && roomTempC < row.max);
}
