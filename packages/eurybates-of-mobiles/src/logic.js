// Eurybates of Mobiles: mobile device inventory from an MDM export. Pure functions.
import { str, low, yes, isoDate, daysBetween, versionCompare, finding } from 'fairwire-core';

export const CHECKS = Object.freeze({
  jailbroken: 'A jailbroken or rooted device (its security controls cannot be trusted).',
  leaver_device: 'A device still enrolled to someone who has left.',
  no_passcode_or_encryption: 'A device with no passcode or no storage encryption.',
  stale_check_in: 'A device that has not checked in with device management for longer than your limit (lost, wiped by the user, or switched off).',
  old_os: 'A device on an operating system older than the minimum you set for its platform.',
  noncompliant: 'A device your device management marks as not compliant for another reason.',
  no_owner: 'A company device with nobody assigned to it.',
});

export const DEVICE_FIELDS = Object.freeze({
  device: { aliases: ['Device name', 'Device', 'Name', 'Device ID'], required: true },
  user: { aliases: ['Primary user UPN', 'User', 'Assigned User', 'Owner', 'User principal name', 'Email'], pii: 'user' },
  platform: { aliases: ['OS', 'Platform', 'Operating System'] },
  os_version: { aliases: ['OS version', 'OS Version', 'Version'] },
  ownership: { aliases: ['Ownership', 'Owner Type', 'Device Ownership', 'Managed By'] },
  last_check_in: { type: 'datetime', aliases: ['Last check-in', 'Last Check-in', 'Last Sync', 'Last Contact', 'Last Inventory'] },
  encrypted: { aliases: ['Encrypted', 'Encryption', 'Storage Encrypted', 'FileVault'] },
  passcode: { aliases: ['Passcode', 'Passcode Present', 'Screen Lock', 'PIN Set'] },
  jailbroken: { aliases: ['Jailbroken', 'Rooted', 'Jailbroken/Rooted', 'Compromised'] },
  compliance: { aliases: ['Compliance', 'Compliance State', 'Compliant'] },
  imei: { aliases: ['IMEI', 'Serial number', 'Serial', 'MEID'], pii: 'device_id' },
});
export const LEAVER_FIELDS = Object.freeze({
  user: { aliases: ['User', 'UPN', 'Email', 'Login'], required: true, pii: 'user' },
  end_date: { type: 'date', aliases: ['End Date', 'Last Day', 'Termination Date', 'Leaving Date'], required: true },
});

export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  stale_days: { type: 'integer', minimum: 1, description: 'Days without a check-in after which a device is flagged (default 30)' },
  min_os: { type: 'object', additionalProperties: { type: 'string' }, description: 'Lowest OS version per platform, e.g. {"iOS": "17.0", "Android": "13"} (no check for platforms not listed)' },
} };
export const DEFAULTS = Object.freeze({ stale_days: 30, min_os: {} });

const platformKey = (p) => { const t = low(p); return /ipad/.test(t) ? 'ipados' : /ios|iphone/.test(t) ? 'ios' : /android/.test(t) ? 'android' : /mac/.test(t) ? 'macos' : /win/.test(t) ? 'windows' : t; };

export function reviewMobiles(rows, leaverRows = [], settings = {}, asOf) {
  const s = { ...DEFAULTS, ...settings };
  const ds = rows.filter((r) => str(r.device)).map((r) => ({ device: str(r.device), user: str(r.user), platform: str(r.platform), pk: platformKey(r.platform), os: str(r.os_version), personal: /personal|byod|employee/i.test(str(r.ownership)), seen: isoDate(r.last_check_in), enc: yes(r.encrypted), pass: yes(r.passcode), jb: yes(r.jailbroken) === true, comp: low(r.compliance) }));
  const leavers = new Map(leaverRows.filter((r) => str(r.user) && isoDate(r.end_date)).map((r) => [low(r.user), isoDate(r.end_date)]));
  const minOs = Object.fromEntries(Object.entries(s.min_os).map(([k, v]) => [platformKey(k), v]));
  const items = [];
  for (const d of ds) {
    const who = d.user || 'nobody';
    if (d.jb) items.push(finding('jailbroken', 'high', d.device, `${d.device} (${d.platform}, ${who}) is reported jailbroken or rooted.`, 'Block it from company data and ask the person to restore the device or use another.', { subject: d.pk }));
    const end = d.user && leavers.get(low(d.user)); if (end) items.push(finding('leaver_device', 'high', d.device, `${d.device} is still enrolled to ${d.user}, who left on ${end}.`, d.personal ? 'Remove company data from the device (selective wipe) and retire it from management.' : 'Collect the device, or wipe and re-issue it.', { subject: d.pk }));
    if (d.pass === false || d.enc === false) items.push(finding('no_passcode_or_encryption', 'high', d.device, `${d.device} (${who}) has ${d.pass === false && d.enc === false ? 'no passcode and no encryption' : d.pass === false ? 'no passcode' : 'no encryption'}.`, 'Enforce a passcode and encryption policy; block access until the device complies.', { subject: d.pk }));
    if (d.seen && asOf && daysBetween(d.seen, asOf) > s.stale_days) items.push(finding('stale_check_in', 'medium', d.device, `${d.device} (${who}) last checked in on ${d.seen}.`, 'Contact the person; if the device is lost, retire it and remove its access.', { subject: d.pk }));
    const oldOs = !!(minOs[d.pk] && d.os && versionCompare(d.os, minOs[d.pk]) < 0);
    if (oldOs) items.push(finding('old_os', 'medium', d.device, `${d.device} runs ${d.platform} ${d.os}, under your minimum of ${minOs[d.pk]}.`, 'Ask the person to update; replace devices that cannot.', { subject: d.pk }));
    if (/non|not/.test(d.comp) && !d.jb && !oldOs && d.pass !== false && d.enc !== false) items.push(finding('noncompliant', 'low', d.device, `${d.device} (${who}) is marked not compliant by device management.`, 'Check which policy it fails in the device management console.', { subject: d.pk }));
    if (!d.user && !d.personal) items.push(finding('no_owner', 'low', d.device, `Company device ${d.device} has nobody assigned.`, 'Assign it to a person, or retire it if it is spare.', { subject: d.pk }));
  }
  const plats = {}; for (const d of ds) { const e = plats[d.pk || 'unknown'] || (plats[d.pk || 'unknown'] = { platform: d.pk || 'unknown', devices: 0, personal: 0 }); e.devices++; if (d.personal) e.personal++; }
  return { devices: ds.length, personal: ds.filter((d) => d.personal).length, by_platform: Object.values(plats).sort((a, b) => (a.platform < b.platform ? -1 : 1)), items };
}
