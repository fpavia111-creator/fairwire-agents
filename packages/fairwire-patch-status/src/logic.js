// Fairwire Patch Status: patch status review from a per-device, per-update export. Pure functions.
import { num, str, low, isoDate, daysBetween, pct, finding, END_OF_SUPPORT_OS, osPastSupport } from 'fairwire-core';

export const CHECKS = Object.freeze({
  overdue_critical: 'A device missing a critical update for longer than your days-to-patch for critical updates.',
  unsupported_os: 'A device on an operating system past its vendor end of support (no more security updates unless you pay for extended support).',
  overdue_update: 'A device missing an important or moderate update for longer than your days-to-patch.',
  repeated_failure: 'An update that failed to install on a device (or failed several times).',
  not_reporting: 'A device whose last patch scan is older than your limit, so its real state is unknown.',
  pending_reboot: 'A device with updates installed that wait for a restart to take effect.',
  widely_missing: 'One update missing on a large share of devices (often an approval or deployment problem, not the devices).',
});

export const PATCH_FIELDS = Object.freeze({
  device: { aliases: ['Device', 'Device Name', 'Computer', 'Computer Name', 'Hostname', 'Endpoint'], required: true },
  os: { aliases: ['OS', 'Operating System', 'OS Name', 'Platform'] },
  group: { aliases: ['Group', 'Device Group', 'Collection', 'Ring', 'Site'] },
  update: { aliases: ['Update', 'KB', 'Patch', 'Patch ID', 'Update ID', 'Article ID'] },
  title: { aliases: ['Title', 'Update Title', 'Patch Name', 'Description'] },
  severity: { aliases: ['Severity', 'Classification', 'MSRC Severity', 'Priority', 'Criticality'] },
  state: { aliases: ['State', 'Status', 'Install State', 'Approval State', 'Compliance'] },
  released: { type: 'date', aliases: ['Released', 'Release Date', 'Published', 'Date Released', 'Patch Release Date'] },
  last_scan: { type: 'datetime', aliases: ['Last Scan', 'Last Scan Time', 'Last Check-in', 'Last Report', 'Last Contact'] },
  failures: { type: 'number', aliases: ['Failures', 'Install Failures', 'Failed Attempts', 'Error Count'] },
});

export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  days_to_patch: { type: 'object', additionalProperties: false, properties: { critical: { type: 'integer', minimum: 0, description: 'Days for critical updates (default 14)' }, important: { type: 'integer', minimum: 0, description: 'Days for important updates (default 30)' }, moderate: { type: 'integer', minimum: 0, description: 'Days for moderate updates (default 60)' }, low: { type: 'integer', minimum: 0, description: 'Days for low updates (default 90)' } }, description: 'Your patch policy: days after release by which each severity must be installed' },
  stale_scan_days: { type: 'integer', minimum: 1, description: 'Days since the last scan after which a device counts as not reporting (default 7)' },
  unsupported_os: { type: 'array', items: { type: 'string' }, maxItems: 100, description: 'Operating systems past end of support, matched as text; "*" stands for any text, and LTSC, LTSB or IoT systems are only matched by an entry that names them (default: END_OF_SUPPORT_OS as of 19 Nov 2026: Windows 2000, XP, Vista, 7, 8, 8.1 and 10, Windows 10 LTSB, Windows 11 21H2 to 23H2 and Home and Pro 24H2, Windows Server 2003, 2008 and 2012)' },
  widely_missing_pct: { type: 'number', minimum: 1, maximum: 100, description: 'Share of devices missing one update above which it is flagged (default 20)' },
} };
export const DEFAULTS = Object.freeze({ days_to_patch: { critical: 14, important: 30, moderate: 60, low: 90 }, stale_scan_days: 7, unsupported_os: END_OF_SUPPORT_OS, widely_missing_pct: 20 });

const sevOf = (v) => { const t = low(v); return /crit/.test(t) ? 'critical' : /import|high/.test(t) ? 'important' : /moder|medium/.test(t) ? 'moderate' : /low/.test(t) ? 'low' : 'important'; };
const stateOf = (v) => { const t = low(v); return /fail|error/.test(t) ? 'failed' : /reboot|restart/.test(t) ? 'pending_reboot' : /missing|needed|required|not installed|applicable|pending|downloaded|approved/.test(t) ? 'missing' : 'installed'; };

export function reviewPatches(rows, settings = {}, asOf) {
  const s = { ...DEFAULTS, ...settings, days_to_patch: { ...DEFAULTS.days_to_patch, ...(settings.days_to_patch || {}) } };
  const rs = rows.filter((r) => str(r.device)).map((r) => ({ device: str(r.device), os: str(r.os), group: str(r.group), update: str(r.update), title: str(r.title), sev: sevOf(r.severity), state: stateOf(r.state), released: isoDate(r.released), scan: isoDate(r.last_scan), failures: num(r.failures) || 0 }));
  const byDev = new Map(); for (const r of rs) byDev.set(r.device, [...(byDev.get(r.device) || []), r]);
  const items = []; const missingBy = new Map();
  for (const [dev, list] of byDev) {
    const os = list.find((r) => r.os)?.os || ''; const group = list.find((r) => r.group)?.group || '';
    const bad = osPastSupport(os, s.unsupported_os);
    if (bad) items.push(finding('unsupported_os', 'high', dev, `${dev} runs ${os}, which is past its vendor end of support.`, 'Upgrade or replace it; until then, isolate it and confirm whether extended security updates are paid for.', { subject: dev, group }));
    const scan = list.map((r) => r.scan).filter(Boolean).sort().at(-1);
    if (scan && asOf && daysBetween(scan, asOf) > s.stale_scan_days) items.push(finding('not_reporting', 'medium', dev, `${dev} last reported its patch state on ${scan}.`, 'Check that the device is on and its update agent is running; its findings below may be out of date.', { subject: dev, group }));
    const overdue = { critical: [], other: [] };
    for (const r of list) {
      if (r.state === 'missing' || r.state === 'failed') { if (r.update) missingBy.set(r.update, new Set([...(missingBy.get(r.update) || []), dev])); }
      if ((r.state === 'missing' || r.state === 'failed') && r.released && asOf) { const age = daysBetween(r.released, asOf); if (age > s.days_to_patch[r.sev]) (r.sev === 'critical' ? overdue.critical : overdue.other).push({ ...r, age }); }
    }
    if (overdue.critical.length) { const o = overdue.critical.sort((a, b) => b.age - a.age); items.push(finding('overdue_critical', 'high', dev, `${dev} is missing ${o.length} critical update(s) past ${s.days_to_patch.critical} days (oldest ${o[0].update || o[0].title}, released ${o[0].released}).`, 'Install them now, or record an exception with a reason and an end date.', { subject: dev, group, updates: o.map((x) => x.update).sort() })); }
    if (overdue.other.length) { const o = overdue.other.sort((a, b) => b.age - a.age); items.push(finding('overdue_update', 'medium', dev, `${dev} is missing ${o.length} other update(s) past your policy (oldest ${o[0].update || o[0].title}, ${o[0].sev}, released ${o[0].released}).`, 'Install them in the next patch window.', { subject: dev, group })); }
    const failed = list.filter((r) => r.state === 'failed' || r.failures >= 2);
    if (failed.length) items.push(finding('repeated_failure', 'medium', dev, `${dev} failed to install ${failed.map((r) => r.update || r.title).sort().join(', ')}${failed.some((r) => r.failures >= 2) ? ` (${Math.max(...failed.map((r) => r.failures))} failed attempts)` : ''}.`, 'Read the install error on the device; disk space and a stuck update service are common causes.', { subject: dev, group }));
    if (list.some((r) => r.state === 'pending_reboot')) items.push(finding('pending_reboot', 'low', dev, `${dev} has updates waiting for a restart.`, 'Schedule a restart; the updates do not protect the device until then.', { subject: dev, group }));
  }
  const devices = byDev.size;
  for (const [u, set] of missingBy) { const sh = pct(set.size, devices); if (set.size >= 3 && sh > s.widely_missing_pct) items.push(finding('widely_missing', 'low', u, `${u} is missing on ${set.size} of ${devices} devices (${sh}%).`, 'Check that the update is approved and targeted to these devices before chasing each one.', { subject: u, devices: set.size })); }
  const compliant = [...byDev.values()].filter((list) => !list.some((r) => r.state !== 'installed')).length;
  const groups = {}; for (const [dev, list] of byDev) { const g = list.find((r) => r.group)?.group || '(no group)'; const e = groups[g] || (groups[g] = { group: g, devices: 0, fully_patched: 0 }); e.devices++; if (!list.some((r) => r.state !== 'installed')) e.fully_patched++; }
  return { devices, updates: new Set(rs.map((r) => r.update).filter(Boolean)).size, fully_patched: compliant, fully_patched_pct: pct(compliant, devices), by_group: Object.values(groups).sort((a, b) => (a.group < b.group ? -1 : 1)), items };
}
