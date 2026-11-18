// Fairwire Wi-Fi Health: wireless controller export review. Pure functions.
import { num, str, low, yes, hoursBetween, versionCompare, normMac, finding } from 'fairwire-core';

export const CHECKS = Object.freeze({
  rogue_ap: 'A rogue access point seen on your wired network, or one broadcasting one of your own network names (an "evil twin").',
  weak_security: 'A network (SSID) with WEP or WPA-TKIP (high), or with no password (medium; low for a guest network).',
  ap_offline: 'An access point that is offline or has not been seen for longer than your limit.',
  old_firmware: 'An access point on older firmware than others of the same model (or than your minimum).',
  bad_24_channel: 'A 2.4 GHz radio on a channel other than 1, 6 or 11, so it overlaps its neighbours.',
  crowded_channel: 'A radio whose channel is busier than your limit.',
  too_many_ssids: 'A radio broadcasting more network names than your limit (each one costs airtime).',
  weak_clients: 'An access point with several clients at a weak signal (coverage gap or wrong placement).',
  sticky_24_clients: 'Several clients that can use 5 GHz are stuck on 2.4 GHz on one access point.',
});

export const AP_FIELDS = Object.freeze({
  ap: { aliases: ['AP', 'AP Name', 'Name', 'Access Point', 'Device Name', 'Device'], required: true },
  site: { aliases: ['Site', 'Network', 'Location', 'Building'] },
  model: { aliases: ['Model', 'AP Model', 'Hardware'] },
  firmware: { aliases: ['Firmware', 'Firmware Version', 'Version', 'Software Version'] },
  status: { aliases: ['Status', 'State', 'Online', 'Connection'] },
  last_seen: { type: 'datetime', aliases: ['Last Seen', 'Last Contact', 'Last Online', 'Last Heard'] },
  band: { aliases: ['Band', 'Radio', 'Frequency', 'Radio Band'] },
  channel: { type: 'number', aliases: ['Channel', 'Chan', 'Primary Channel'] },
  utilization_pct: { type: 'number', aliases: ['Channel Utilization', 'Utilization', 'Utilization %', 'Busy %', 'Airtime %'] },
  ssid_count: { type: 'number', aliases: ['SSIDs', 'SSID Count', 'WLANs', 'Number of SSIDs'] },
});
export const SSID_FIELDS = Object.freeze({
  ssid: { aliases: ['SSID', 'Name', 'Network Name', 'WLAN'], required: true },
  security: { aliases: ['Security', 'Authentication', 'Encryption', 'Auth', 'Security Mode'], required: true },
  enabled: { aliases: ['Enabled', 'Status', 'Broadcast'] },
});
export const CLIENT_FIELDS = Object.freeze({
  client: { aliases: ['Client', 'MAC', 'MAC address', 'Description', 'Device'], required: true },
  ap: { aliases: ['AP', 'AP Name', 'Access Point', 'Connected To'], required: true },
  band: { aliases: ['Band', 'Radio', 'Frequency'] },
  rssi: { type: 'number', aliases: ['RSSI', 'Signal', 'Signal Strength', 'RSSI (dBm)', 'Signal (dBm)'] },
  capable_5ghz: { aliases: ['5 GHz Capable', 'Capable 5GHz', 'Dual Band', 'Supports 5 GHz'] },
});
export const ROGUE_FIELDS = Object.freeze({
  bssid: { aliases: ['BSSID', 'MAC', 'Rogue MAC'], required: true },
  ssid: { aliases: ['SSID', 'Network Name'] },
  on_wire: { aliases: ['On Wire', 'Wired', 'Seen on LAN', 'Wired Match'] },
  classification: { aliases: ['Classification', 'Class', 'Type', 'Status'] },
});

export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  offline_hours: { type: 'number', minimum: 1, description: 'Hours without contact after which an access point counts as offline (default 24)' },
  utilization_max: { type: 'number', minimum: 1, maximum: 100, description: 'Channel utilization percent above which a radio is crowded (default 70)' },
  max_ssids: { type: 'integer', minimum: 1, description: 'Network names one radio may broadcast (default 4)' },
  weak_rssi: { type: 'number', maximum: 0, description: 'Signal in dBm under which a client is weak (default -75)' },
  weak_clients_min: { type: 'integer', minimum: 1, description: 'Weak clients on one access point before it is flagged (default 3)' },
  sticky_min: { type: 'integer', minimum: 1, description: '5 GHz-capable clients on 2.4 GHz on one access point before it is flagged (default 3)' },
  min_firmware: { type: 'object', additionalProperties: { type: 'string' }, description: 'Lowest firmware per model, e.g. {"MR46": "10.4"}; without it, the newest version seen for the model is the reference' },
} };
export const DEFAULTS = Object.freeze({ offline_hours: 24, utilization_max: 70, max_ssids: 4, weak_rssi: -75, weak_clients_min: 3, sticky_min: 3, min_firmware: {} });

const is24 = (b) => /^2\.?4|^2g|^b\/g|^ng|^bg/i.test(str(b));

export function reviewWifi({ aps = [], ssids = [], clients = [], rogues = [] }, settings = {}, asOf) {
  const s = { ...DEFAULTS, ...settings };
  const items = []; const byAp = new Map();
  for (const r of aps) { const n = str(r.ap); if (!n) continue; byAp.set(n, [...(byAp.get(n) || []), r]); }
  const newest = {};
  for (const [, radios] of byAp) { const m = str(radios[0].model); const f = str(radios[0].firmware); if (m && f && (!newest[m] || versionCompare(f, newest[m]) > 0)) newest[m] = f; }
  let offline = 0;
  for (const [ap, radios] of byAp) {
    const r0 = radios[0]; const site = str(r0.site);
    const seen = radios.map((r) => str(r.last_seen)).filter(Boolean).sort().at(-1);
    const down = radios.some((r) => /^(offline|down|disconnected|dormant|false|no)$/i.test(str(r.status))) || (seen && asOf && hoursBetween(seen, `${asOf} 23:59:59`) > s.offline_hours + 24);
    if (down) { offline++; items.push(finding('ap_offline', 'high', ap, `${ap}${site ? ` at ${site}` : ''} is offline${seen ? ` (last seen ${seen})` : ''}.`, 'Check its power and switch port; replace it if it does not come back.', { subject: ap, site })); }
    const m = str(r0.model), f = str(r0.firmware); const ref = s.min_firmware[m] || newest[m];
    if (m && f && ref && versionCompare(f, ref) < 0) items.push(finding('old_firmware', 'medium', ap, `${ap} (${m}) runs firmware ${f}; ${s.min_firmware[m] ? 'your minimum' : 'the newest on the same model'} is ${ref}.`, 'Schedule the upgrade in a maintenance window with the others of this model.', { subject: ap, site }));
    let crowded = null, badCh = null, ssidMax = 0;
    for (const r of radios) {
      const ch = num(r.channel); const u = num(r.utilization_pct);
      if (is24(r.band) && ch !== null && ![1, 6, 11].includes(ch)) badCh = ch;
      if (u !== null && u > s.utilization_max) crowded = Math.max(crowded ?? 0, u);
      ssidMax = Math.max(ssidMax, num(r.ssid_count) || 0);
    }
    if (badCh !== null) items.push(finding('bad_24_channel', 'medium', ap, `${ap} uses 2.4 GHz channel ${badCh}, which overlaps channels 1, 6 and 11.`, 'Move it to 1, 6 or 11, whichever its neighbours use least.', { subject: ap, site }));
    if (crowded !== null) items.push(finding('crowded_channel', 'low', ap, `A radio on ${ap} is ${crowded}% busy.`, 'Check for interference, lower the transmit power of neighbours or add an access point.', { subject: ap, site }));
    if (ssidMax > s.max_ssids) items.push(finding('too_many_ssids', 'low', ap, `${ap} broadcasts ${ssidMax} network names.`, 'Merge networks that differ only by VLAN, or stop broadcasting unused ones.', { subject: ap, site }));
  }
  for (const r of ssids) {
    const n = str(r.ssid); if (!n || yes(r.enabled) === false) continue; const sec = low(r.security);
    if (/wep|tkip/.test(sec)) items.push(finding('weak_security', 'high', n, `Network "${n}" uses ${str(r.security)}, which is no longer considered secure.`, 'Move its devices to WPA2 or WPA3 (AES); replace devices that cannot.', { subject: n }));
    else if (/^(open|none|no security|unsecured|-)?$/.test(sec) || /^open/.test(sec)) items.push(finding('weak_security', /guest|visitor/i.test(n) ? 'low' : 'medium', n, `Network "${n}" has no password${/guest|visitor/i.test(n) ? ' (guest network)' : ''}.`, /guest|visitor/i.test(n) ? 'Keep it isolated from inside networks; consider OWE (enhanced open).' : 'Add WPA2 or WPA3, or isolate it like a guest network.', { subject: n }));
  }
  const cl = new Map();
  for (const c of clients) { const ap = str(c.ap); if (!ap || !str(c.client)) continue; cl.set(ap, [...(cl.get(ap) || []), c]); }
  for (const [ap, list] of cl) {
    const weak = list.filter((c) => num(c.rssi) !== null && num(c.rssi) < s.weak_rssi);
    if (weak.length >= s.weak_clients_min) items.push(finding('weak_clients', 'low', ap, `${weak.length} client(s) on ${ap} have a signal under ${s.weak_rssi} dBm.`, 'Survey the area; move or add an access point.', { subject: ap }));
    const sticky = list.filter((c) => is24(c.band) && yes(c.capable_5ghz) === true);
    if (sticky.length >= s.sticky_min) items.push(finding('sticky_24_clients', 'low', ap, `${sticky.length} client(s) on ${ap} could use 5 GHz but sit on 2.4 GHz.`, 'Turn on band steering, or lower the 2.4 GHz power on this access point.', { subject: ap }));
  }
  const own = new Set(ssids.map((r) => low(r.ssid)).filter(Boolean));
  for (const r of rogues) {
    const b = normMac(r.bssid) || str(r.bssid); if (!b) continue; const n = str(r.ssid);
    const wired = yes(r.on_wire) === true; const twin = n && own.has(low(n));
    if (wired || twin) items.push(finding('rogue_ap', 'high', b, `A rogue access point ${b}${n ? ` ("${n}")` : ''} ${wired ? 'is plugged into your wired network' : 'broadcasts one of your own network names'}.`, wired ? 'Find the switch port it is on and have someone remove the device.' : 'Locate it with the controller\'s map; warn staff not to join it.', { subject: n || b }));
  }
  return { access_points: byAp.size, radios: aps.filter((r) => str(r.ap)).length, offline, networks: ssids.filter((r) => str(r.ssid)).length, clients: clients.filter((c) => str(c.client)).length, items };
}
