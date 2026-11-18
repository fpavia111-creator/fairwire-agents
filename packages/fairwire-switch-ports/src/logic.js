// Fairwire Switch Ports: switch port and VLAN inventory review. Pure functions.
import { num, str, low, daysBetween, isoDate, finding } from 'fairwire-core';

export const CHECKS = Object.freeze({
  trunk_all_vlans: 'A trunk port that carries every VLAN instead of the ones it needs.',
  access_in_vlan1: 'An access port in use in VLAN 1, the default VLAN that should carry no user traffic.',
  half_duplex: 'A port that came up at half duplex (usually a speed or duplex mismatch that slows the link).',
  crc_errors: 'A port with more CRC errors than your limit (a bad cable, transceiver or port).',
  vlan_not_in_plan: 'An access port in a VLAN that is not in your plan.',
  unused_enabled_port: 'A port that is enabled but has not been used for longer than your limit (an open socket anyone can plug into).',
  no_description: 'A trunk or uplink port with no description, so nobody knows what it connects.',
  unused_vlan: 'A VLAN in your VLAN list that no port uses.',
});

export const PORT_FIELDS = Object.freeze({
  switch: { aliases: ['Switch', 'Device', 'Hostname', 'Switch Name', 'Device Name'], required: true },
  port: { aliases: ['Port', 'Interface', 'Port Name', 'Ifname', 'Port ID'], required: true },
  description: { aliases: ['Description', 'Port Description', 'Alias', 'Name'] },
  admin_status: { aliases: ['Admin Status', 'Admin', 'Enabled', 'Shutdown'] },
  oper_status: { aliases: ['Oper Status', 'Status', 'Link', 'Link Status', 'State'] },
  mode: { aliases: ['Mode', 'Switchport Mode', 'Type', 'Port Mode'] },
  vlan: { type: 'number', aliases: ['VLAN', 'Access VLAN', 'Native VLAN', 'PVID', 'Untagged VLAN'] },
  allowed_vlans: { aliases: ['Allowed VLANs', 'Trunk VLANs', 'Tagged VLANs', 'VLAN List'] },
  duplex: { aliases: ['Duplex', 'Duplex Mode'] },
  crc_errors: { type: 'number', aliases: ['CRC Errors', 'CRC', 'FCS Errors', 'Input CRC'] },
  last_used: { type: 'datetime', aliases: ['Last Used', 'Last Input', 'Last Change', 'Last Link Up', 'Last Activity'] },
});
export const VLAN_FIELDS = Object.freeze({
  vlan: { type: 'number', aliases: ['VLAN', 'VLAN ID', 'ID', 'Tag'], required: true },
  name: { aliases: ['Name', 'VLAN Name', 'Description'] },
});

export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  allowed_access_vlans: { type: 'array', items: { type: 'integer', minimum: 1, maximum: 4094 }, maxItems: 4094, description: 'VLANs access ports may use (no check when empty)' },
  crc_max: { type: 'integer', minimum: 0, description: 'CRC errors above which a port is flagged (default 100)' },
  unused_days: { type: 'integer', minimum: 1, description: 'Days without use after which an enabled port is flagged (default 60)' },
} };
export const DEFAULTS = Object.freeze({ allowed_access_vlans: [], crc_max: 100, unused_days: 60 });

const up = (v) => /^(up|connected|enabled|yes|true|1)$/i.test(str(v));
const adminUp = (v) => { const t = low(v); return !t || !/^(down|disabled|shutdown|admin down|no|false|0)$/.test(t); };
/** VLAN ids in a list like "10,20,30-32"; null for "all" or the whole range. */
export function vlanList(v) {
  const t = low(v).replace(/\s+/g, '');
  if (!t || t === 'all' || t === '1-4094' || t === '1-4095' || t === 'any') return null;
  const out = new Set();
  for (const part of t.split(/[,;]/)) { const m = /^(\d+)(?:-(\d+))?$/.exec(part); if (m) for (let i = Number(m[1]); i <= Number(m[2] || m[1]) && i <= 4094; i++) out.add(i); }
  return out;
}

export function reviewPorts(rows, vlanRows = [], settings = {}, asOf) {
  const s = { ...DEFAULTS, ...settings };
  const ports = rows.filter((r) => str(r.switch) && str(r.port)).map((r) => ({ sw: str(r.switch), port: str(r.port), key: `${str(r.switch)} ${str(r.port)}`, desc: str(r.description), admin: adminUp(r.admin_status), oper: up(r.oper_status), trunk: /trunk|tagged|uplink/i.test(str(r.mode)), vlan: num(r.vlan), allowed: str(r.allowed_vlans), duplex: low(r.duplex), crc: num(r.crc_errors), last: str(r.last_used) }));
  const items = []; const used = new Set();
  for (const p of ports) {
    if (p.vlan !== null) used.add(p.vlan);
    if (p.trunk) { const l = vlanList(p.allowed); if (l) for (const v of l) used.add(v); else items.push(finding('trunk_all_vlans', 'medium', p.key, `Trunk ${p.key} carries every VLAN.`, 'Limit the trunk to the VLANs the far end needs.', { subject: p.sw })); }
    if (!p.trunk && p.oper && p.vlan === 1) items.push(finding('access_in_vlan1', 'medium', p.key, `Access port ${p.key} is in use in VLAN 1.`, 'Move it to the right user or device VLAN.', { subject: p.sw }));
    if (p.oper && /half/.test(p.duplex)) items.push(finding('half_duplex', 'medium', p.key, `${p.key} is up at half duplex.`, 'Set both ends to auto (or both to the same fixed speed and duplex) and check the cable.', { subject: p.sw }));
    if (p.crc !== null && p.crc > s.crc_max) items.push(finding('crc_errors', 'medium', p.key, `${p.key} has ${p.crc} CRC errors.`, 'Replace the patch cable or transceiver; move the device to another port if errors continue.', { subject: p.sw, crc: p.crc }));
    if (!p.trunk && p.oper && s.allowed_access_vlans.length && p.vlan !== null && p.vlan !== 1 && !s.allowed_access_vlans.includes(p.vlan)) items.push(finding('vlan_not_in_plan', 'low', p.key, `${p.key} is in VLAN ${p.vlan}, which is not in your plan.`, 'Move the port to a planned VLAN or add the VLAN to the plan with a reason.', { subject: p.sw }));
    if (p.admin && !p.oper && p.last && asOf && isoDate(p.last) && daysBetween(p.last, asOf) > s.unused_days) items.push(finding('unused_enabled_port', 'low', p.key, `${p.key} is enabled but unused since ${isoDate(p.last)}.`, 'Shut the port, or put it in an unused VLAN, until someone needs it.', { subject: p.sw }));
    if (p.trunk && !p.desc) items.push(finding('no_description', 'low', p.key, `Trunk ${p.key} has no description.`, 'Write what it connects to (device and port) in the description.', { subject: p.sw }));
  }
  for (const v of vlanRows) { const id = num(v.vlan); if (id !== null && id !== 1 && !used.has(id)) items.push(finding('unused_vlan', 'info', `VLAN ${id}`, `VLAN ${id}${str(v.name) ? ` (${str(v.name)})` : ''} is not used by any port in the export.`, 'Remove it if no switch outside this export uses it.', { subject: `VLAN ${id}` })); }
  const sws = [...new Set(ports.map((p) => p.sw))].sort();
  // Counted in one pass each (a filter per switch is quadratic with thousands of switches).
  const portsOf = new Map(); for (const p of ports) portsOf.set(p.sw, (portsOf.get(p.sw) || 0) + 1);
  const findingsOf = new Map(); for (const i of items) findingsOf.set(i.subject, (findingsOf.get(i.subject) || 0) + 1);
  return { switches: sws.length, ports: ports.length, ports_up: ports.filter((p) => p.oper).length, trunks: ports.filter((p) => p.trunk).length, vlans_used: used.size, by_switch: sws.map((sw) => ({ switch: sw, ports: portsOf.get(sw) || 0, findings: findingsOf.get(sw) || 0 })), items };
}
