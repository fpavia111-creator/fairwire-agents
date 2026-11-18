// Argestes of Assets: asset inventory against the CMDB. Pure functions.
import { str, low, isoDate, daysBetween, hostKey, finding } from 'fairwire-core';

export const CHECKS = Object.freeze({
  retired_but_seen: 'A CMDB record marked retired or disposed, but the device was seen on the network or in device management recently.',
  not_in_cmdb: 'A device seen on the network or in device management with no CMDB record.',
  duplicate_serial: 'Two or more CMDB records with the same serial number.',
  hostname_mismatch: 'The CMDB and the discovery source name the same serial number differently (a rename that was not recorded).',
  ghost_record: 'An active CMDB record not seen by any source for longer than your limit (lost, stolen, or retired without updating the CMDB).',
  missing_owner_or_location: 'An active CMDB record with no owner or no location.',
  warranty_ended: 'An active device whose warranty or support has ended, or ends within your notice window.',
});

export const CMDB_FIELDS = Object.freeze({
  asset_id: { aliases: ['Asset ID', 'Asset Tag', 'CI', 'Name', 'sys_id', 'Configuration Item'], required: true },
  hostname: { aliases: ['Hostname', 'Host Name', 'Device Name', 'Computer Name', 'DNS Name'] },
  serial: { aliases: ['Serial Number', 'Serial', 'Service Tag', 'serial_number'] },
  status: { aliases: ['Status', 'Install Status', 'Lifecycle', 'State', 'Operational Status'] },
  owner: { aliases: ['Owner', 'Assigned To', 'User', 'Custodian', 'Managed By'], pii: 'name' },
  location: { aliases: ['Location', 'Site', 'Building', 'Room'] },
  model: { aliases: ['Model', 'Model ID', 'Product'] },
  warranty_end: { type: 'date', aliases: ['Warranty End', 'Warranty Expiration', 'Support End', 'End of Support', 'Warranty Expires'] },
});
export const SEEN_FIELDS = Object.freeze({
  hostname: { aliases: ['Hostname', 'Device Name', 'Computer Name', 'Name', 'DNS Name'] },
  serial: { aliases: ['Serial Number', 'Serial', 'Service Tag', 'Hardware Serial'] },
  source: { aliases: ['Source', 'Discovered By', 'Tool', 'System'] },
  last_seen: { type: 'datetime', aliases: ['Last Seen', 'Last Check-in', 'Last Contact', 'Last Sync', 'Last Discovered'], required: true },
});

export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  ghost_days: { type: 'integer', minimum: 1, description: 'Days without being seen after which an active record counts as a ghost (default 90)' },
  recent_days: { type: 'integer', minimum: 1, description: 'Days within which a retired device seen again is flagged (default 30)' },
  warranty_notice_days: { type: 'integer', minimum: 0, description: 'Days before the warranty end to start flagging (default 60)' },
  retired_words: { type: 'array', items: { type: 'string' }, maxItems: 30, description: 'Status words that mean retired (default retired, disposed, decommissioned, stolen, lost)' },
} };
export const DEFAULTS = Object.freeze({ ghost_days: 90, recent_days: 30, warranty_notice_days: 60, retired_words: ['retired', 'disposed', 'decommissioned', 'stolen', 'lost', 'scrapped'] });

const serialKey = (v) => str(v).toUpperCase().replace(/[\s-]/g, '');

export function reviewAssets(cmdbRows, seenRows, settings = {}, asOf) {
  const s = { ...DEFAULTS, ...settings };
  const retired = (st) => s.retired_words.some((w) => low(st).includes(low(w)));
  const cmdb = cmdbRows.filter((r) => str(r.asset_id)).map((r) => ({ id: str(r.asset_id), host: hostKey(r.hostname), hostShown: str(r.hostname), serial: serialKey(r.serial), serialShown: str(r.serial), status: str(r.status), owner: str(r.owner), location: str(r.location), warranty: isoDate(r.warranty_end) }));
  const seen = seenRows.filter((r) => (str(r.hostname) || str(r.serial)) && isoDate(r.last_seen)).map((r) => ({ host: hostKey(r.hostname), hostShown: str(r.hostname), serial: serialKey(r.serial), serialShown: str(r.serial), source: str(r.source) || 'discovery', last: isoDate(r.last_seen) }));
  const bySerial = new Map(); const byHost = new Map();
  for (const c of cmdb) { if (c.serial) bySerial.set(c.serial, [...(bySerial.get(c.serial) || []), c]); if (c.host) byHost.set(c.host, [...(byHost.get(c.host) || []), c]); }
  const items = []; const lastSeen = new Map();
  for (const x of seen) {
    const match = (x.serial && bySerial.get(x.serial)) || (x.host && byHost.get(x.host)) || null;
    if (!match) { items.push(finding('not_in_cmdb', 'medium', x.serialShown || x.hostShown, `${x.hostShown || x.serialShown} (serial ${x.serialShown || 'unknown'}) was seen by ${x.source} on ${x.last} but has no CMDB record.`, 'Create the record with owner and location, or find out why an unknown device is on the network.', { subject: x.hostShown || x.serial })); continue; }
    for (const c of match) { const prev = lastSeen.get(c.id); if (!prev || x.last > prev.last) lastSeen.set(c.id, x); }
    if (x.serial && x.host && match.length === 1 && match[0].serial === x.serial && match[0].host && match[0].host !== x.host) items.push(finding('hostname_mismatch', 'low', match[0].id, `${match[0].id} is ${match[0].hostShown} in the CMDB but ${x.hostShown} in ${x.source} (serial ${x.serialShown}).`, 'Update the CMDB name, or check whether the serial was copied onto the wrong record.', { subject: match[0].id }));
  }
  for (const [serial, list] of bySerial) if (list.length > 1) items.push(finding('duplicate_serial', 'medium', list[0].serialShown, `Serial ${list[0].serialShown} is on ${list.length} CMDB records (${list.map((c) => c.id).sort().join(', ')}).`, 'Merge the records and keep the one with the right owner and history.', { subject: list[0].serialShown }));
  for (const c of cmdb) {
    const x = lastSeen.get(c.id); const age = x ? daysBetween(x.last, asOf) : null;
    if (retired(c.status)) { if (x && age !== null && age <= s.recent_days) items.push(finding('retired_but_seen', 'high', c.id, `${c.id} is "${c.status}" in the CMDB but ${x.source} saw it on ${x.last}.`, 'Find the device: either it was never retired, or someone is using a device that should be gone.', { subject: c.id })); continue; }
    if (!x || age > s.ghost_days) items.push(finding('ghost_record', 'low', c.id, `${c.id}${c.hostShown ? ` (${c.hostShown})` : ''} is active in the CMDB but ${x ? `was last seen on ${x.last}` : 'was not seen by any source'}.`, 'Ask the owner where it is; retire the record if it is gone.', { subject: c.id }));
    if (!c.owner || !c.location) items.push(finding('missing_owner_or_location', 'low', c.id, `${c.id} has no ${!c.owner && !c.location ? 'owner or location' : !c.owner ? 'owner' : 'location'}.`, 'Fill in who has it and where it is.', { subject: c.id }));
    if (c.warranty && asOf && daysBetween(asOf, c.warranty) <= s.warranty_notice_days) items.push(finding('warranty_ended', c.warranty < asOf ? 'low' : 'info', c.id, `${c.id} warranty or support ${c.warranty < asOf ? 'ended' : 'ends'} on ${c.warranty}.`, 'Plan a replacement or extend support if the device is still needed.', { subject: c.id, warranty_end: c.warranty }));
  }
  return { cmdb_records: cmdb.length, active: cmdb.filter((c) => !retired(c.status)).length, seen_devices: seen.length, matched: lastSeen.size, items };
}
