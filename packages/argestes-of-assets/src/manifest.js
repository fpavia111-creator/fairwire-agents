import { readFileSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, AS_OF_ARG, settingsFrom, LIMITS, today } from 'fairwire-core';
import { CMDB_FIELDS, SEEN_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewAssets } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  cmdb: fileArg('CMDB or asset register export under --root (ServiceNow, Freshservice, Lansweeper, Snipe-IT or a spreadsheet as CSV, Excel or JSON): one row per record with asset id, host name, serial, status, owner, location and warranty end'),
  seen: fileArg('Devices seen by a discovery source (network scan, device management, EDR or DHCP export) with host name, serial and last seen'),
  settings: SETTINGS_ARG('ghost_days, recent_days, warranty_notice_days, retired_words'),
  as_of: AS_OF_ARG,
};

export const manifest = wireAgent({
  pkg, prefix: 'argestes', title: 'Argestes of Assets',
  description: 'Compares the CMDB with devices seen on the network or in device management: retired records still seen, devices with no record, duplicate serials, renamed devices, ghost records, records with no owner or location, and warranties ending. Owner names are masked for the model. Drafts CMDB fix lists; never edits the CMDB.',
  args, required: ['cmdb', 'seen'],
  sources: { cmdb: { label: 'CMDB records', args: ['cmdb'], fields: CMDB_FIELDS }, seen: { label: 'Devices seen', args: ['seen'], fields: SEEN_FIELDS } },
  configSchemas: { argestes_settings: SETTINGS_SCHEMA },
  run: (a, ctx) => reviewAssets(ctx.records(a.cmdb, 'cmdb'), ctx.records(a.seen, 'seen'), settingsFrom(a, ctx, 'argestes_settings', DEFAULTS), a.as_of || today()),
  summary: (o) => `${o.cmdb_records} CMDB record(s) (${o.active} active) against ${o.seen_devices} device(s) seen, ${o.matched} matched: ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Reconcile assets with the CMDB', description: 'Match devices seen by serial, then by host name, and list retired-but-seen, unknown, duplicate, renamed, ghost, incomplete and out-of-warranty records.' },
  explain: { arg: 'asset', argSchema: { type: 'string', maxLength: 200, description: 'Asset id, serial or host name from argestes_check' }, title: 'Explain one asset', description: 'Every finding for one record or device.', match: (i, v) => i.key === v || i.subject === v },
  report: {
    title: 'Assets against the CMDB', base: 'argestes-assets',
    rows: (o) => o.items.map((i) => ({ severity: i.severity, code: i.code, asset: i.key, message: i.message, fix: i.fix })),
    htmlColumns: ['severity', 'code', 'asset', 'message', 'fix', 'status'],
    limits: [LIMITS.files, 'Devices are matched by serial number first and by host name (without the domain) second; two devices that share a name and have no serial can be matched wrongly.', 'A device not seen may be switched off or in a drawer; a ghost record is a question for its owner.', LIMITS.defaults, LIMITS.pii],
  },
  note: { noun: 'cmdb_fix_list', verb: 'send', category: 'binding_send', actor: 'the asset manager', to: 'asset and CMDB owner', subject: 'CMDB records to fix', ask: 'Please update or investigate each record; retired devices seen again come first.' },
  refused: [
    { name: 'cmdb_update_record', category: 'production_deploy', description: 'Argestes never edits, merges or retires a CMDB record.' },
    { name: 'device_wipe', category: 'delete_personal_data', description: 'Argestes never wipes or locks a device.' },
  ],
  prompt: { title: 'Reconcile assets', description: 'Walks the host model through a CMDB reconciliation with Argestes.', text: 'You are helping an IT asset manager compare the CMDB with discovery data using argestes-of-assets. Owners are pseudonyms. 1. Call argestes_check; lead with retired devices seen again and devices with no record. 2. Use argestes_explain for an asset. 3. Call argestes_write_report. 4. Offer argestes_draft_cmdb_fix_list; argestes_request_send waits for one named click.' },
});
