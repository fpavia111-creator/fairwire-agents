// Boreas of Firewalls: rule review from a firewall rule export. Pure functions.
import { num, str, low, isAny, parseCidr, parsePorts, portsCover, portsInclude, isoDate, daysBetween, yes, finding, RISKY_INBOUND_PORTS, portName } from 'fairwire-core';

export const CHECKS = Object.freeze({
  any_any_allow: 'An enabled rule allows any source to any destination on any service.',
  internet_to_risky_port: 'An enabled rule allows traffic from the internet to a port that should rarely be open (RDP, SMB, FTP, Telnet, databases and the like), or to any port.',
  expired_temporary_rule: 'A rule with an end date in the past is still enabled.',
  shadowed_rule: 'An earlier rule already matches everything this rule matches, so this rule never takes effect.',
  duplicate_rule: 'Two enabled rules are the same in zones, addresses, service and action.',
  unused_rule: 'An enabled allow rule with no hits, or no hit for longer than your limit.',
  no_owner_or_ticket: 'An enabled allow rule with no owner, or with neither a ticket nor a description saying why it exists.',
  allow_without_logging: 'An enabled allow rule with logging off.',
  disabled_rule: 'A disabled rule still in the policy (clutter that makes reviews slower).',
});

export const RULE_FIELDS = Object.freeze({
  rule_id: { aliases: ['Name', 'Rule Name', 'Rule', 'Policy ID', 'ID', 'Rule ID'], required: true },
  position: { type: 'number', aliases: ['Position', 'Order', 'Sequence', 'Seq', 'Index', '#'] },
  enabled: { aliases: ['Enabled', 'Status', 'State', 'Disabled'] },
  action: { aliases: ['Action', 'Policy Action', 'Decision'], required: true },
  src_zone: { aliases: ['Source Zone', 'From', 'From Zone', 'Source Interface', 'Src Zone', 'Ingress'] },
  dst_zone: { aliases: ['Destination Zone', 'To', 'To Zone', 'Destination Interface', 'Dst Zone', 'Egress'] },
  source: { aliases: ['Source Address', 'Source', 'Src Address', 'Sources', 'Src'] },
  destination: { aliases: ['Destination Address', 'Destination', 'Dst Address', 'Destinations', 'Dst'] },
  service: { aliases: ['Service', 'Services', 'Port', 'Ports', 'Destination Port', 'Service Port'] },
  hits: { type: 'number', aliases: ['Hit Count', 'Hits', 'Hitcount', 'Rule Usage Hit Count', 'Bytes Hit Count'] },
  last_hit: { type: 'date', aliases: ['Last Hit', 'Last Hit Timestamp', 'Last Used', 'Last Matched'] },
  log: { aliases: ['Log', 'Logging', 'Log at Session End', 'Log Traffic'] },
  description: { aliases: ['Description', 'Comment', 'Comments', 'Remarks'] },
  owner: { aliases: ['Owner', 'Rule Owner', 'Requested By', 'Contact'], pii: 'name' },
  ticket: { aliases: ['Ticket', 'Change', 'Change Ticket', 'Tag', 'Reference'] },
  expires: { type: 'date', aliases: ['Expires', 'Expiry', 'End Date', 'Valid Until', 'Schedule End'] },
});

export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  internet_zones: { type: 'array', items: { type: 'string' }, maxItems: 50, description: 'Zone or interface names that mean the internet (default untrust, outside, internet, wan)' },
  risky_ports: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 65535 }, maxItems: 500, description: 'Ports that should not be open from the internet (default: RDP, SMB, FTP, Telnet, databases and others)' },
  unused_days: { type: 'integer', minimum: 1, description: 'Days since the last hit after which an allow rule counts as unused (default 90)' },
} };
export const DEFAULTS = Object.freeze({ internet_zones: ['untrust', 'outside', 'internet', 'wan'], risky_ports: RISKY_INBOUND_PORTS, unused_days: 90 });

const list = (v) => str(v).split(/[;,\s]+/).map((x) => x.trim().toLowerCase()).filter(Boolean);
const allAny = (l) => !l.length || l.some(isAny);
/** One address, zone or name list read once: "any" (or empty), and each entry with its CIDR range when it has one. */
const prepList = (l) => ({ any: allAny(l), items: l.map((t) => ({ t, c: parseCidr(t) })) });
/** a covers b: a is any, or every entry of b sits inside an entry of a (same text or a CIDR inside a CIDR). */
function covers(a, b) {
  if (a.any) return true; if (b.any) return false;
  return b.items.every((x) => a.items.some((y) => x.t === y.t || (!!y.c && !!x.c && y.c.first <= x.c.first && x.c.last <= y.c.last)));
}
/**
 * Earlier rules indexed by one address list, so the shadow search looks only at rules that could cover
 * the first entry of a later rule (any, the same text, or a CIDR), not at every earlier rule.
 * Each bucket holds rule positions in policy order.
 */
class CoverIndex {
  constructor() { this.any = []; this.text = new Map(); this.cidr = []; }
  add(k, p) {
    if (p.any) { this.any.push(k); return; }
    for (const t of new Set(p.items.map((i) => i.t))) { let a = this.text.get(t); if (!a) this.text.set(t, (a = [])); a.push(k); }
    if (p.items.some((i) => i.c)) this.cidr.push(k);
  }
  candidates(p) {
    if (p.any) return [this.any];
    const x = p.items[0]; const out = [this.any, this.text.get(x.t) || []];
    if (x.c) out.push(this.cidr);
    return out;
  }
}
const bucketSize = (ls) => ls.reduce((n, l) => n + l.length, 0);
const sig = (r) => [r.src_zone, r.dst_zone, r.source, r.destination, r.service, r.action].map((l) => (Array.isArray(l) ? [...l].sort().join(',') : l)).join('|');

export function readRules(rows) {
  return rows.filter((r) => str(r.rule_id)).map((r, k) => {
    const en = str(r.enabled); const enabledWord = low(en);
    const enabled = enabledWord === 'disabled' ? false : /^disabled?$/i.test(en) ? false : yes(r.enabled) ?? true;
    return { id: str(r.rule_id), pos: num(r.position) ?? k + 1, enabled, action: /^(allow|accept|permit|pass)$/i.test(str(r.action)) ? 'allow' : 'deny', src_zone: list(r.src_zone), dst_zone: list(r.dst_zone), source: list(r.source), destination: list(r.destination), service: list(r.service), ports: parsePorts(str(r.service)), hits: num(r.hits), last_hit: isoDate(r.last_hit), log: yes(r.log), description: str(r.description), owner: str(r.owner), ticket: str(r.ticket), expires: isoDate(r.expires) };
  }).sort((a, b) => a.pos - b.pos || (a.id < b.id ? -1 : 1));
}

export function reviewRules(rows, settings = {}, asOf) {
  const s = { ...DEFAULTS, ...settings };
  const rules = readRules(rows); const items = []; const internet = s.internet_zones.map(low);
  const risky = s.risky_ports.map(Number);
  const fromInternet = (r) => r.src_zone.some((z) => internet.includes(z)) || (allAny(r.src_zone) && allAny(r.source));
  const seen = new Map();
  const prep = rules.map((r) => ({ sz: prepList(r.src_zone), dz: prepList(r.dst_zone), s: prepList(r.source), d: prepList(r.destination) }));
  const bySrc = new CoverIndex(); const byDst = new CoverIndex();
  /** Position of the first enabled earlier rule that matches all of rule k's traffic, or -1. */
  const shadowOf = (k) => {
    const p = prep[k]; const r = rules[k]; const a = bySrc.candidates(p.s); const b = byDst.candidates(p.d);
    let best = -1;
    for (const l of bucketSize(a) <= bucketSize(b) ? a : b) {
      for (const j of l) {
        if (best !== -1 && j >= best) break;
        const q = prep[j];
        if (covers(q.sz, p.sz) && covers(q.dz, p.dz) && covers(q.s, p.s) && covers(q.d, p.d) && portsCover(rules[j].ports, r.ports)) { best = j; break; }
      }
    }
    return best;
  };
  rules.forEach((r, k) => {
    if (!r.enabled) { items.push(finding('disabled_rule', 'info', r.id, `Rule ${r.id} is disabled but still in the policy.`, 'Delete it in the next change window if nobody needs it back.', { subject: r.id })); return; }
    if (r.action === 'allow') {
      if (allAny(r.source) && allAny(r.destination) && r.ports.any) items.push(finding('any_any_allow', 'high', r.id, `Rule ${r.id} allows any source to any destination on any service${r.src_zone.length ? ` (${r.src_zone.join(',')} to ${r.dst_zone.join(',')})` : ''}.`, 'Replace it with rules for the traffic that is actually needed, then remove it.', { subject: r.id }));
      if (fromInternet(r)) { const hit = r.ports.any ? 'any port' : risky.filter((p) => portsInclude(r.ports, p)).map((p) => `${portName(p)} (${p})`).join(', '); if (hit) items.push(finding('internet_to_risky_port', 'high', r.id, `Rule ${r.id} allows the internet to reach ${allAny(r.destination) ? 'any address' : r.destination.join(', ')} on ${hit}.`, 'Put this service behind the VPN or a gateway, or limit the source to known addresses.', { subject: r.id })); }
      if (r.expires && asOf && r.expires < asOf) items.push(finding('expired_temporary_rule', 'medium', r.id, `Rule ${r.id} was meant to end on ${r.expires} and is still enabled.`, 'Disable it, or renew it with a new end date and ticket.', { subject: r.id, expires: r.expires }));
      const idle = r.hits === 0 ? 'has no hits' : r.last_hit && asOf && daysBetween(r.last_hit, asOf) > s.unused_days ? `has not been hit since ${r.last_hit}` : null;
      if (idle) items.push(finding('unused_rule', 'low', r.id, `Allow rule ${r.id} ${idle}.`, 'Confirm with the owner, then disable it for a cycle before deleting it.', { subject: r.id }));
      if (!r.owner || (!r.ticket && !r.description)) items.push(finding('no_owner_or_ticket', 'low', r.id, `Allow rule ${r.id} has ${!r.owner ? 'no owner' : 'no ticket or description'}.`, 'Record who asked for it and why, or remove it.', { subject: r.id }));
      if (r.log === false) items.push(finding('allow_without_logging', 'low', r.id, `Allow rule ${r.id} does not log.`, 'Turn on logging at session end so the rule can be reviewed and investigated.', { subject: r.id }));
    }
    const sg = sig(r);
    if (seen.has(sg)) items.push(finding('duplicate_rule', 'low', r.id, `Rule ${r.id} is the same as rule ${seen.get(sg)}.`, `Remove one of the two after checking which one the owner expects.`, { subject: r.id }));
    else {
      seen.set(sg, r.id);
      const j = shadowOf(k); const earlier = j >= 0 ? rules[j] : null;
      if (earlier) items.push(finding('shadowed_rule', 'medium', r.id, `Rule ${r.id} never takes effect: earlier rule ${earlier.id} (${earlier.action}) already matches all of its traffic.`, earlier.action === r.action ? 'Remove the later rule.' : 'Check the order: the later rule was probably meant to win; move it above or narrow the earlier one.', { subject: r.id, shadowed_by: earlier.id }));
    }
    bySrc.add(k, prep[k].s); byDst.add(k, prep[k].d);
  });
  const enabled = rules.filter((r) => r.enabled);
  return { rules: rules.length, enabled: enabled.length, allow: enabled.filter((r) => r.action === 'allow').length, deny: enabled.filter((r) => r.action === 'deny').length, items };
}
