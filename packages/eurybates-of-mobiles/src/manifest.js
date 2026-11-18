import { readFileSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, AS_OF_ARG, settingsFrom, LIMITS, exportProfile, today } from 'fairwire-core';
import { DEVICE_FIELDS, LEAVER_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewMobiles } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  devices: fileArg('Mobile device export under --root (Intune, Jamf, Workspace ONE, Kandji or any CSV, Excel or JSON): one row per device with user, platform, OS version, ownership, last check-in, encryption, passcode, jailbreak and compliance state'),
  leavers: fileArg('Optional list of people who left, with their last day'),
  settings: SETTINGS_ARG('stale_days, min_os'),
  as_of: AS_OF_ARG,
};

export const manifest = wireAgent({
  pkg, prefix: 'eurybates', title: 'Eurybates of Mobiles',
  description: 'Reviews a mobile device export from device management: jailbroken or rooted devices, devices of people who left, no passcode or encryption, devices that stopped checking in, operating systems under your minimum, other non-compliance and company devices with no owner. Users and device ids are masked for the model. Drafts notes; never wipes or locks a device.',
  args, required: ['devices'],
  sources: { devices: { label: 'Mobile devices', args: ['devices'], fields: DEVICE_FIELDS, profiles: [exportProfile('intune_devices', { device: 'Device name', platform: 'OS', os_version: 'OS version', compliance: 'Compliance', last_check_in: 'Last check-in', user: 'Primary user UPN', ownership: 'Ownership' })] }, leavers: { label: 'Leavers', args: ['leavers'], fields: LEAVER_FIELDS } },
  configSchemas: { eurybates_settings: SETTINGS_SCHEMA },
  run: (a, ctx) => reviewMobiles(ctx.records(a.devices, 'devices'), a.leavers ? ctx.records(a.leavers, 'leavers') : [], settingsFrom(a, ctx, 'eurybates_settings', DEFAULTS), a.as_of || today()),
  summary: (o) => `${o.devices} device(s), ${o.personal} personal: ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Review mobile devices', description: 'Review the device management export and list jailbroken, leaver, unprotected, silent, outdated, non-compliant and unassigned devices.' },
  explain: { arg: 'device', argSchema: { type: 'string', maxLength: 200, description: 'Device name or platform from eurybates_check' }, title: 'Explain one device or platform', description: 'Every finding for one device or platform.', match: (i, v) => i.key === v || i.subject === String(v).toLowerCase() },
  report: {
    title: 'Mobile device inventory', base: 'eurybates-mobiles',
    sections: (o) => [{ title: 'By platform', rows: o.by_platform, columns: ['platform', 'devices', 'personal'] }],
    limits: [LIMITS.files, 'Jailbreak, encryption and passcode states are what the device last reported to device management; a device that stopped checking in may have changed since.', 'Personal devices are judged on company data only; nothing here asks for a full wipe of a personal phone.', LIMITS.defaults, LIMITS.pii, LIMITS.live],
  },
  note: { noun: 'device_note', verb: 'send', category: 'binding_send', actor: 'the device management owner', to: 'endpoint and device management team', subject: 'Mobile devices to act on', ask: 'Please handle jailbroken and leaver devices today; contact each person before any wipe.' },
  refused: [
    { name: 'mdm_wipe_device', category: 'delete_personal_data', description: 'Eurybates never wipes, locks or retires a device.' },
    { name: 'mdm_change_policy', category: 'production_deploy', description: 'Eurybates never changes a compliance or configuration policy.' },
  ],
  prompt: { title: 'Review mobile devices', description: 'Walks the host model through a mobile device review with Eurybates.', text: 'You are helping an endpoint lead review mobile devices with eurybates-of-mobiles. Users are pseudonyms. 1. Call eurybates_check; lead with jailbroken devices and devices of leavers. 2. Use eurybates_explain for a device. 3. Call eurybates_write_report (the file has real names). 4. Offer eurybates_draft_device_note; eurybates_request_send waits for one named click.' },
});
