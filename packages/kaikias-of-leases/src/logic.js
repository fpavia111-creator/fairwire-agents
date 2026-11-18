// Kaikias of Leases: DHCP lease review. Pure functions.
import { str, low, yes, isoDate, normMac, isRandomMac, ipToInt, parseCidr, cleanIp, pct, finding } from 'fairwire-core';

export const CHECKS = Object.freeze({
  rogue_dhcp_server: 'Leases handed out by a DHCP server that is not on your list (a home router or test box plugged in by mistake can break a whole floor).',
  ip_conflict: 'One address leased to two different devices at the same time.',
  scope_near_exhaustion: 'A scope whose active leases fill more than your share of its dynamic range.',
  reservation_in_dynamic_range: 'A reservation inside the range the server hands out dynamically (it can collide with a lease).',
  unknown_devices: 'Devices holding leases that are not in your asset list.',
  mac_in_many_scopes: 'One device holding leases in several scopes at once.',
  random_mac_share: 'A scope where many leases go to private (random) MAC addresses, which use up addresses faster and make devices hard to track.',
});

export const LEASE_FIELDS = Object.freeze({
  ip: { aliases: ['IP Address', 'Client IP Address', 'Address', 'IP', 'Leased IP'], required: true },
  mac: { aliases: ['MAC Address', 'Unique ID', 'Client ID', 'Hardware Address', 'MAC'], required: true },
  hostname: { aliases: ['Name', 'Host Name', 'Hostname', 'Client Name', 'Device Name'] },
  scope: { aliases: ['Scope', 'Scope ID', 'Subnet', 'Pool', 'Network'] },
  lease_expires: { type: 'datetime', aliases: ['Lease Expiration', 'Expires', 'Lease Expiry', 'End', 'Expiry'] },
  server: { aliases: ['Server', 'DHCP Server', 'Served By', 'Server IP'] },
  reservation: { aliases: ['Reservation', 'Reserved', 'Type', 'Static'] },
});
export const SCOPE_FIELDS = Object.freeze({
  scope: { aliases: ['Scope', 'Scope ID', 'Subnet', 'Network', 'Name'], required: true },
  start: { aliases: ['Start', 'Start Address', 'Range Start', 'First IP'], required: true },
  end: { aliases: ['End', 'End Address', 'Range End', 'Last IP'], required: true },
  name: { aliases: ['Scope Name', 'Description'] },
});
export const ASSET_FIELDS = Object.freeze({
  mac: { aliases: ['MAC Address', 'MAC', 'Wi-Fi MAC', 'Ethernet MAC'], required: true },
  hostname: { aliases: ['Name', 'Hostname', 'Device Name', 'Asset Name'] },
});

export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  authorized_servers: { type: 'array', items: { type: 'string' }, maxItems: 100, description: 'Addresses or names of your own DHCP servers (no rogue check when empty)' },
  exhaustion_pct: { type: 'number', minimum: 1, maximum: 100, description: 'Share of a dynamic range in use above which a scope is flagged (default 85)' },
  random_share_pct: { type: 'number', minimum: 1, maximum: 100, description: 'Share of leases with private MAC addresses above which a scope is noted (default 30)' },
} };
export const DEFAULTS = Object.freeze({ authorized_servers: [], exhaustion_pct: 85, random_share_pct: 30 });

export function reviewLeases({ leases = [], scopes = [], assets = [] }, settings = {}, asOf) {
  const s = { ...DEFAULTS, ...settings };
  const sc = scopes.map((r) => ({ id: str(r.scope), name: str(r.name), lo: ipToInt(r.start), hi: ipToInt(r.end), cidr: parseCidr(str(r.scope)) })).filter((x) => x.id && x.lo !== null && x.hi !== null && x.hi >= x.lo);
  const scopeOf = (ip, given) => { const n = ipToInt(ip); return sc.find((x) => x.id === given) || sc.find((x) => (x.cidr && n !== null && n >= x.cidr.first && n <= x.cidr.last) || (n !== null && n >= x.lo && n <= x.hi)) || null; };
  const all = leases.map((r) => ({ ip: cleanIp(r.ip), mac: normMac(r.mac) || low(r.mac), host: str(r.hostname), scopeGiven: str(r.scope), exp: str(r.lease_expires), server: str(r.server), reserved: yes(r.reservation) === true || /reserv|static/i.test(str(r.reservation)) })).filter((l) => l.ip && l.mac);
  const active = all.filter((l) => l.reserved || !l.exp || !asOf || isoDate(l.exp) >= asOf);
  for (const l of active) { const x = scopeOf(l.ip, l.scopeGiven); l.scope = x ? x.id : l.scopeGiven || '(no scope)'; l.scopeRef = x; }
  const items = [];
  if (s.authorized_servers.length) {
    const bad = new Map(); for (const l of active) if (l.server && !s.authorized_servers.map(low).includes(low(l.server))) bad.set(l.server, [...(bad.get(l.server) || []), l]);
    for (const [srv, list] of bad) items.push(finding('rogue_dhcp_server', 'high', srv, `${list.length} lease(s) came from ${srv}, which is not one of your DHCP servers (for example ${list.map((l) => l.ip).sort()[0]}).`, 'Find the device at that address (switch MAC table) and unplug it; turn on DHCP snooping on the access switches.', { subject: srv, leases: list.length }));
  }
  const byIp = new Map(); for (const l of active) byIp.set(l.ip, [...(byIp.get(l.ip) || []), l]);
  for (const [ip, list] of byIp) { const macs = [...new Set(list.map((l) => l.mac))].sort(); if (macs.length > 1) items.push(finding('ip_conflict', 'high', ip, `${ip} is leased to ${macs.length} devices at once (${macs.join(', ')}).`, 'Check for a static address set by hand on one of the devices, or two servers serving the same range.', { subject: ip })); }
  for (const x of sc) {
    const size = x.hi - x.lo + 1; const dyn = active.filter((l) => l.scopeRef === x && !l.reserved && ipToInt(l.ip) >= x.lo && ipToInt(l.ip) <= x.hi);
    const used = pct(new Set(dyn.map((l) => l.ip)).size, size);
    if (used > s.exhaustion_pct) items.push(finding('scope_near_exhaustion', 'medium', x.id, `Scope ${x.id}${x.name ? ` (${x.name})` : ''} has ${used}% of its ${size} dynamic addresses in use.`, 'Widen the range, shorten the lease time, or move guests and phones to their own scope.', { subject: x.id, used_pct: used }));
    for (const l of active.filter((y) => y.scopeRef === x && y.reserved)) { const n = ipToInt(l.ip); if (n >= x.lo && n <= x.hi) items.push(finding('reservation_in_dynamic_range', 'low', l.ip, `Reservation ${l.ip}${l.host ? ` (${l.host})` : ''} sits inside the dynamic range of ${x.id}.`, 'Move reservations outside the dynamic range, or exclude the address from the range.', { subject: x.id })); }
  }
  if (assets.length) {
    const known = new Set(assets.map((a) => normMac(a.mac) || low(a.mac)));
    const byScope = new Map(); for (const l of active) if (!known.has(l.mac)) byScope.set(l.scope, [...(byScope.get(l.scope) || []), l]);
    for (const [scope, list] of byScope) { const macs = [...new Set(list.map((l) => l.mac))].sort(); items.push(finding('unknown_devices', 'low', scope, `${macs.length} device(s) with leases in ${scope} are not in your asset list (for example ${macs.slice(0, 3).join(', ')}).`, 'Identify them by host name and switch port, then add them to the asset list or remove them.', { subject: scope, devices: macs.length })); }
  }
  const byMac = new Map(); for (const l of active) { const e = byMac.get(l.mac) || new Set(); e.add(l.scope); byMac.set(l.mac, e); }
  for (const [mac, set] of byMac) if (set.size > 1) items.push(finding('mac_in_many_scopes', 'low', mac, `${mac} holds leases in ${set.size} scopes (${[...set].sort().join(', ')}).`, 'Check whether it is a device that moves between networks or a misconfigured relay.', { subject: mac }));
  const scopesSeen = [...new Set(active.map((l) => l.scope))].sort();
  for (const scope of scopesSeen) { const list = active.filter((l) => l.scope === scope); const r = pct(list.filter((l) => isRandomMac(l.mac)).length, list.length); if (list.length >= 10 && r > s.random_share_pct) items.push(finding('random_mac_share', 'info', scope, `${r}% of the ${list.length} leases in ${scope} go to private (random) MAC addresses.`, 'Shorter lease times keep these from filling the scope; device-based rules need another identifier.', { subject: scope, share_pct: r })); }
  return { leases: all.length, active: active.length, expired: all.length - active.length, scopes: sc.length, devices: byMac.size, by_scope: scopesSeen.map((scope) => ({ scope, leases: active.filter((l) => l.scope === scope).length })), items };
}
