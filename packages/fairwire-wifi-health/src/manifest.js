import { readFileSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, AS_OF_ARG, settingsFrom, LIMITS, today } from 'fairwire-core';
import { AP_FIELDS, SSID_FIELDS, CLIENT_FIELDS, ROGUE_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewWifi } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  aps: fileArg('Access point export under --root (Meraki, UniFi, Aruba, Mist or any controller as CSV, Excel or JSON): one row per radio with AP name, site, model, firmware, status, last seen, band, channel, utilization and SSID count'),
  ssids: fileArg('Optional network (SSID) list with each one\'s security setting'),
  clients: fileArg('Optional client list with the access point, band, signal (RSSI) and whether the client supports 5 GHz'),
  rogues: fileArg('Optional rogue access point list from the controller'),
  settings: SETTINGS_ARG('offline_hours, utilization_max, max_ssids, weak_rssi, weak_clients_min, sticky_min, min_firmware'),
  as_of: AS_OF_ARG,
};

export const manifest = wireAgent({
  pkg, prefix: 'wifi', title: 'Fairwire Wi-Fi Health of Wi-Fi',
  description: 'Reviews Wi-Fi controller exports: rogue access points on your wire or copying your network names, WEP, TKIP and open networks, access points offline or on old firmware, 2.4 GHz channels other than 1, 6 and 11, crowded channels, too many SSIDs, weak clients and clients stuck on 2.4 GHz. Drafts a change request; never changes the controller.',
  args, required: ['aps'],
  sources: { aps: { label: 'Access point radios', args: ['aps'], fields: AP_FIELDS }, ssids: { label: 'Networks (SSIDs)', args: ['ssids'], fields: SSID_FIELDS }, clients: { label: 'Wireless clients', args: ['clients'], fields: CLIENT_FIELDS }, rogues: { label: 'Rogue access points', args: ['rogues'], fields: ROGUE_FIELDS } },
  configSchemas: { wifi_settings: SETTINGS_SCHEMA },
  run: (a, ctx) => reviewWifi({ aps: ctx.records(a.aps, 'aps'), ssids: a.ssids ? ctx.records(a.ssids, 'ssids') : [], clients: a.clients ? ctx.records(a.clients, 'clients') : [], rogues: a.rogues ? ctx.records(a.rogues, 'rogues') : [] }, settingsFrom(a, ctx, 'wifi_settings', DEFAULTS), a.as_of || today()),
  summary: (o) => `${o.access_points} access point(s) (${o.radios} radios, ${o.offline} offline), ${o.networks} network(s), ${o.clients} client(s): ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Review Wi-Fi', description: 'Review the controller exports and list rogues, weak security, offline and outdated access points, channel problems and client signal problems.' },
  explain: { arg: 'ap', argSchema: { type: 'string', maxLength: 200, description: 'Access point, network name or rogue BSSID from wifi_check' }, title: 'Explain one access point or network', description: 'Every finding for one access point, network or rogue.', match: (i, v) => i.key === v || i.subject === v },
  report: {
    title: 'Wi-Fi review', base: 'wifi-health',
    sections: (o) => [{ title: 'By site', rows: [...new Set(o.items.filter((i) => i.site).map((i) => i.site))].sort().map((site) => ({ site, findings: o.items.filter((i) => i.site === site).length })), columns: ['site', 'findings'] }],
    limits: [LIMITS.files, 'Channel, utilization and signal are the controller\'s own readings at the time of export; a site survey is the way to confirm coverage.', 'Firmware is compared with the newest version seen for the same model unless you set min_firmware; the vendor\'s advisories decide which version to run.', LIMITS.defaults, LIMITS.live],
  },
  note: { noun: 'change_request', verb: 'submit', category: 'production_deploy', actor: 'the wireless owner', to: 'network team', subject: 'Wi-Fi changes to review', ask: 'Please plan these changes for a quiet time; rogue devices on the wire should be removed today.' },
  refused: [
    { name: 'controller_apply_config', category: 'production_deploy', description: 'Fairwire Wi-Fi Health never changes channels, SSIDs, security or firmware on the controller.' },
    { name: 'wifi_contain_rogue', category: 'production_deploy', description: 'Fairwire Wi-Fi Health never starts rogue containment (it can disrupt neighbours and may be unlawful in some places).' },
  ],
  prompt: { title: 'Review Wi-Fi', description: 'Walks the host model through a Wi-Fi review with Fairwire Wi-Fi Health.', text: 'You are helping a network lead review Wi-Fi exports with fairwire-wifi-health. Fairwire Wi-Fi Health only reads exports. 1. Call wifi_check; lead with rogue access points and WEP or TKIP networks. 2. Use wifi_explain for one access point. 3. Call wifi_write_report. 4. Offer wifi_draft_change_request; wifi_request_submit waits for one named click.' },
});
