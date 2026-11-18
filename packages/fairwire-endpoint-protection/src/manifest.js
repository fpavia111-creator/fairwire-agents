import { readFileSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, AS_OF_ARG, settingsFrom, LIMITS, exportProfile, today } from 'fairwire-core';
import { DEVICE_FIELDS, ASSET_FIELDS, ALERT_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewEndpoints } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  devices: fileArg('Endpoint security console export under --root (Defender, CrowdStrike, SentinelOne, Sophos or any CSV, Excel or JSON): one row per device and product with agent version, signature date, last seen, real-time protection, tamper protection and mode'),
  assets: fileArg('Optional asset list (device names and types) to find devices with no agent'),
  alerts: fileArg('Optional alert export with id, device, severity, status and created time'),
  settings: SETTINGS_ARG('stale_days, signature_max_days, alert_open_days, min_agent_version, passive_ok, asset_types_without_agent'),
  as_of: AS_OF_ARG,
};

export const manifest = wireAgent({
  pkg, prefix: 'endpoints', title: 'Fairwire Endpoint Protection',
  description: 'Reviews endpoint protection coverage: devices with no agent, protection or tamper protection off, passive mode, agents not reporting, old signatures and agent versions, two products on one device and high alerts left open. Drafts notes; never isolates or changes a device.',
  args, required: ['devices'],
  sources: { devices: { label: 'Protected devices', args: ['devices'], fields: DEVICE_FIELDS, profiles: [exportProfile('defender_devices', { device: 'Device Name', protection: 'Health State' })] }, assets: { label: 'Asset list', args: ['assets'], fields: ASSET_FIELDS }, alerts: { label: 'Alerts', args: ['alerts'], fields: ALERT_FIELDS } },
  configSchemas: { endpoints_settings: SETTINGS_SCHEMA },
  run: (a, ctx) => reviewEndpoints({ devices: ctx.records(a.devices, 'devices'), assets: a.assets ? ctx.records(a.assets, 'assets') : [], alerts: a.alerts ? ctx.records(a.alerts, 'alerts') : [] }, settingsFrom(a, ctx, 'endpoints_settings', DEFAULTS), a.as_of || today()),
  summary: (o) => `${o.devices} device(s) with an agent${o.covered_pct !== null ? `, ${o.covered_pct}% of ${o.assets_in_scope} in-scope assets covered` : ''}, ${o.open_alerts} open alert(s): ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Review endpoint protection', description: 'Review the security console export against the asset list and list uncovered devices, protection gaps, stale agents and signatures, product clashes and old high alerts.' },
  explain: { arg: 'device', argSchema: { type: 'string', maxLength: 200, description: 'Device or alert id from endpoints_check' }, title: 'Explain one device', description: 'Every finding for one device or alert.', match: (i, v) => i.key === v || i.subject === v },
  report: {
    title: 'Endpoint protection coverage', base: 'endpoint-protection',
    limits: [LIMITS.files, 'Coverage compares device names (without the domain); a device renamed in one system and not the other shows as uncovered.', 'An agent that reports healthy can still miss a threat; this is a coverage and hygiene check, not a security assessment.', LIMITS.defaults, LIMITS.live],
  },
  note: { noun: 'security_note', verb: 'send', category: 'binding_send', actor: 'the endpoint security owner', to: 'security operations', subject: 'Endpoint protection gaps', ask: 'Please close the high items today and plan the rest.' },
  refused: [
    { name: 'edr_isolate_device', category: 'production_deploy', description: 'Fairwire Endpoint Protection never isolates, scans or changes a device.' },
    { name: 'edr_change_policy', category: 'production_deploy', description: 'Fairwire Endpoint Protection never changes a security policy or exclusion.' },
  ],
  prompt: { title: 'Review endpoint protection', description: 'Walks the host model through a coverage review with Fairwire Endpoint Protection.', text: 'You are helping a security lead review endpoint protection with fairwire-endpoint-protection. Fairwire Endpoint Protection only reads exports. 1. Call endpoints_check; lead with devices with no agent, protection off and old high alerts. 2. Use endpoints_explain for one device. 3. Call endpoints_write_report. 4. Offer endpoints_draft_security_note; endpoints_request_send waits for one named click.' },
});
