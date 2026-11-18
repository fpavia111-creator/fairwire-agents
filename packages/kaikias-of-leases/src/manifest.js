import { readFileSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, AS_OF_ARG, settingsFrom, LIMITS, exportProfile, today } from 'fairwire-core';
import { LEASE_FIELDS, SCOPE_FIELDS, ASSET_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewLeases } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  leases: fileArg('DHCP lease export under --root (Windows DHCP console, ISC or Kea, Infoblox or router export as CSV, Excel or JSON): one row per lease with address, MAC, host name, scope, expiry, serving server and whether it is a reservation'),
  scopes: fileArg('Optional scope list with each dynamic range start and end'),
  assets: fileArg('Optional asset list with MAC addresses, to find devices you do not know'),
  settings: SETTINGS_ARG('authorized_servers, exhaustion_pct, random_share_pct'),
  as_of: AS_OF_ARG,
};

export const manifest = wireAgent({
  pkg, prefix: 'kaikias', title: 'Kaikias of Leases',
  description: 'Reviews DHCP leases: leases from a DHCP server you do not run, one address leased to two devices, scopes near exhaustion, reservations inside the dynamic range, devices missing from your asset list, devices in several scopes and scopes filled by private MAC addresses. Drafts a note; never changes a scope.',
  args, required: ['leases'],
  sources: { leases: { label: 'DHCP leases', args: ['leases'], fields: LEASE_FIELDS, profiles: [exportProfile('windows_dhcp_leases', { ip: 'Client IP Address', hostname: 'Name', lease_expires: 'Lease Expiration', mac: 'Unique ID' })] }, scopes: { label: 'DHCP scopes', args: ['scopes'], fields: SCOPE_FIELDS }, assets: { label: 'Asset list', args: ['assets'], fields: ASSET_FIELDS } },
  configSchemas: { kaikias_settings: SETTINGS_SCHEMA },
  run: (a, ctx) => reviewLeases({ leases: ctx.records(a.leases, 'leases'), scopes: a.scopes ? ctx.records(a.scopes, 'scopes') : [], assets: a.assets ? ctx.records(a.assets, 'assets') : [] }, settingsFrom(a, ctx, 'kaikias_settings', DEFAULTS), a.as_of || today()),
  summary: (o) => `${o.leases} lease(s), ${o.active} active, ${o.devices} device(s) in ${o.scopes} scope(s): ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Review DHCP leases', description: 'Review active leases and list rogue servers, address conflicts, nearly full scopes, misplaced reservations, unknown devices and devices in several scopes.' },
  explain: { arg: 'scope', argSchema: { type: 'string', maxLength: 200, description: 'Scope, address, MAC or server from kaikias_check' }, title: 'Explain one scope or address', description: 'Every finding for one scope, address, device or server.', match: (i, v) => i.key === v || i.subject === v },
  report: {
    title: 'DHCP lease review', base: 'kaikias-leases',
    sections: (o) => [{ title: 'By scope', rows: o.by_scope, columns: ['scope', 'leases'] }],
    limits: [LIMITS.files, 'Leases are active when they have not expired by the as-of date; a device that left without releasing its lease still counts until then.', LIMITS.defaults, LIMITS.live],
  },
  note: { noun: 'network_note', verb: 'send', category: 'binding_send', actor: 'the network owner', to: 'network team', subject: 'DHCP findings to look at', ask: 'Please deal with rogue servers and conflicts first; scope changes can wait for a change window.' },
  refused: [
    { name: 'dhcp_change_scope', category: 'production_deploy', description: 'Kaikias never changes a scope, reservation or lease.' },
    { name: 'switch_block_port', category: 'production_deploy', description: 'Kaikias never blocks the port of a rogue server; a person does.' },
  ],
  prompt: { title: 'Review DHCP leases', description: 'Walks the host model through a DHCP review with Kaikias.', text: 'You are helping a network lead review DHCP with kaikias-of-leases. Kaikias only reads exports. 1. Call kaikias_check; lead with rogue servers and conflicts. 2. Use kaikias_explain for one scope. 3. Call kaikias_write_report. 4. Offer kaikias_draft_network_note; kaikias_request_send waits for one named click.' },
});
