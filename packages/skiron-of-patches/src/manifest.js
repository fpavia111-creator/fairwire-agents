import { readFileSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, AS_OF_ARG, settingsFrom, LIMITS, today } from 'fairwire-core';
import { PATCH_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewPatches } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  patches: fileArg('Patch status export under --root (WSUS, Intune, Configuration Manager, ManageEngine, NinjaOne or any CSV, Excel or JSON): one row per device and update with severity, state, release date, last scan and failures'),
  settings: SETTINGS_ARG('days_to_patch (critical, important, moderate, low), stale_scan_days, unsupported_os, widely_missing_pct'),
  as_of: AS_OF_ARG,
};

export const manifest = wireAgent({
  pkg, prefix: 'skiron', title: 'Skiron of Patches',
  description: 'Reviews a patch status export: critical and other updates missing past your days-to-patch, operating systems past end of support, updates that keep failing, devices that stopped reporting, pending restarts and updates missing on many devices at once. Drafts notes; never installs anything.',
  args, required: ['patches'],
  sources: { patches: { label: 'Patch status', args: ['patches'], fields: PATCH_FIELDS } },
  configSchemas: { skiron_settings: SETTINGS_SCHEMA },
  run: (a, ctx) => reviewPatches(ctx.records(a.patches, 'patches'), settingsFrom(a, ctx, 'skiron_settings', DEFAULTS), a.as_of || today()),
  summary: (o) => `${o.devices} device(s), ${o.updates} update(s), ${o.fully_patched} fully patched (${o.fully_patched_pct}%): ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Review patch status', description: 'Review patch state per device against your days-to-patch and list overdue updates, unsupported systems, failures, silent devices, pending restarts and updates missing everywhere.' },
  explain: { arg: 'device', argSchema: { type: 'string', maxLength: 200, description: 'Device or update id from skiron_check' }, title: 'Explain one device or update', description: 'Every finding for one device or update.', match: (i, v) => i.key === v },
  report: {
    title: 'Patch status', base: 'skiron-patches',
    sections: (o) => [{ title: 'By group', rows: o.by_group, columns: ['group', 'devices', 'fully_patched'] }],
    limits: [LIMITS.files, 'Severity and release dates are the ones in your export; end-of-support defaults come from public vendor dates as of 2026 and do not know about extended support you bought.', 'A device that stopped reporting may be patched or not; its rows show its last known state.', LIMITS.defaults, LIMITS.live],
  },
  note: { noun: 'patch_note', verb: 'send', category: 'binding_send', actor: 'the patch owner', to: 'desktop and server teams', subject: 'Patching behind your policy', ask: 'Please patch or record an exception for each device; unsupported systems need a plan and a date.' },
  refused: [
    { name: 'patch_deploy_now', category: 'production_deploy', description: 'Skiron never approves, deploys or installs an update.' },
    { name: 'device_force_reboot', category: 'production_deploy', description: 'Skiron never restarts a device.' },
  ],
  prompt: { title: 'Review patch status', description: 'Walks the host model through a patch review with Skiron.', text: 'You are helping an IT lead review patch status with skiron-of-patches. Skiron only reads the export. 1. Call skiron_check; lead with overdue critical updates and unsupported systems. 2. Use skiron_explain for one device. 3. Call skiron_write_report. 4. Offer skiron_draft_patch_note; skiron_request_send waits for one named click.' },
});
