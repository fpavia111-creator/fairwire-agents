// Fairwire DNS Records: DNS zone hygiene from a zone export. Pure functions.
import { num, str, low, isIpv4, isPrivateIp, inAnyCidr, finding } from 'fairwire-core';

export const CHECKS = Object.freeze({
  dangling_cname: 'A name pointing (CNAME) at a cloud service host name that may no longer exist: whoever creates that cloud resource next can serve content on your name (subdomain takeover).',
  cname_conflict: 'A name with a CNAME and other records at the same time, which DNS does not allow and resolvers handle unpredictably.',
  private_ip_in_public_zone: 'A public zone record pointing at a private address (it leaks your internal layout and never works from outside).',
  ip_not_owned: 'A record pointing at a public address outside the ranges you own (it may now belong to someone else).',
  duplicate_record: 'The same record listed twice.',
  ttl_out_of_range: 'A time-to-live shorter or longer than your limits.',
  wildcard_record: 'A wildcard record, which answers for every name under it, including typos and names an attacker chooses.',
});

export const RECORD_FIELDS = Object.freeze({
  zone: { aliases: ['Zone', 'Zone Name', 'Domain', 'Hosted Zone'] },
  name: { aliases: ['Name', 'Record Name', 'Host', 'Hostname', 'FQDN'], required: true },
  type: { aliases: ['Type', 'Record Type', 'RR Type'], required: true },
  value: { aliases: ['Value', 'Data', 'Target', 'Points To', 'Content', 'Record Data'], required: true },
  ttl: { type: 'number', aliases: ['TTL', 'Time To Live', 'TTL (s)'] },
});

const CLOUD = ['azurewebsites.net', 'cloudapp.net', 'cloudapp.azure.com', 'trafficmanager.net', 'blob.core.windows.net', 'azureedge.net', 'azurefd.net', 's3.amazonaws.com', 's3-website', 'elasticbeanstalk.com', 'cloudfront.net', 'herokuapp.com', 'herokudns.com', 'github.io', 'netlify.app', 'vercel.app', 'pages.dev', 'fastly.net', 'ghost.io', 'myshopify.com', 'wpengine.com', 'zendesk.com', 'readthedocs.io'];
export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  public_zones: { type: 'array', items: { type: 'string' }, maxItems: 500, description: 'Zones published on the internet (default: every zone in the file)' },
  owned_cidrs: { type: 'array', items: { type: 'string' }, maxItems: 500, description: 'Public address ranges you own or rent (no ownership check when empty)' },
  active_cloud_hosts: { type: 'array', items: { type: 'string' }, maxItems: 5000, description: 'Cloud host names that still exist in your accounts; a CNAME to a cloud host not on this list is high (medium when the list is empty)' },
  cloud_suffixes: { type: 'array', items: { type: 'string' }, maxItems: 200, description: 'Extra cloud service host suffixes to treat as takeover-prone' },
  ttl_min: { type: 'integer', minimum: 0, description: 'Shortest acceptable TTL in seconds (default 60)' },
  ttl_max: { type: 'integer', minimum: 1, description: 'Longest acceptable TTL in seconds (default 604800, one week)' },
} };
export const DEFAULTS = Object.freeze({ public_zones: [], owned_cidrs: [], active_cloud_hosts: [], cloud_suffixes: [], ttl_min: 60, ttl_max: 604800 });

const DNSSEC = new Set(['RRSIG', 'NSEC', 'NSEC3', 'SIG', 'KEY']);
const fqdn = (name, zone) => { const n = low(name).replace(/\.$/, ''); const z = low(zone).replace(/\.$/, ''); if (!n || n === '@') return z; return z && !n.endsWith(z) ? `${n}.${z}` : n; };

/** Count items per key in one pass (a filter per group is quadratic). */
const countBy = (list, key) => { const m = new Map(); for (const x of list) { const k = key(x); m.set(k, (m.get(k) || 0) + 1); } return m; };

export function reviewZones(rows, settings = {}) {
  const s = { ...DEFAULTS, ...settings };
  const rs = rows.filter((r) => str(r.name) && str(r.type) && str(r.value)).map((r) => { const zone = low(r.zone).replace(/\.$/, ''); return { zone, name: fqdn(r.name, zone), type: str(r.type).toUpperCase(), value: low(r.value).replace(/\.$/, ''), ttl: num(r.ttl) }; });
  const items = []; const pub = s.public_zones.map(low); const active = new Set(s.active_cloud_hosts.map((h) => low(h).replace(/\.$/, '')));
  const cloud = [...CLOUD, ...s.cloud_suffixes.map(low)];
  const byName = new Map(); for (const r of rs) { const l = byName.get(r.name); if (l) l.push(r); else byName.set(r.name, [r]); }
  const seen = new Set();
  for (const r of rs) {
    const sig = `${r.name}|${r.type}|${r.value}`;
    if (seen.has(sig)) { items.push(finding('duplicate_record', 'low', sig, `${r.type} record ${r.name} -> ${r.value} is listed twice.`, 'Remove the copy.', { subject: r.zone })); continue; }
    seen.add(sig);
    const isPublic = !pub.length || pub.includes(r.zone);
    if (r.type === 'CNAME' && cloud.some((c) => r.value.endsWith(c) || r.value.includes(`.${c}`))) {
      if (!active.has(r.value)) items.push(finding('dangling_cname', active.size ? 'high' : 'medium', r.name, `${r.name} points at ${r.value}${active.size ? ', which is not in your list of cloud resources that still exist' : '; confirm that cloud resource still exists'}.`, 'If the resource is gone, delete the record today; if it exists, add it to active_cloud_hosts.', { subject: r.zone }));
    }
    if ((r.type === 'A') && isPublic && isIpv4(r.value) && isPrivateIp(r.value)) items.push(finding('private_ip_in_public_zone', 'medium', `${r.name}|${r.value}`, `Public record ${r.name} points at private address ${r.value}.`, 'Move it to the internal zone (split DNS) or remove it.', { subject: r.zone }));
    if (r.type === 'A' && isPublic && s.owned_cidrs.length && isIpv4(r.value) && !isPrivateIp(r.value) && !inAnyCidr(r.value, s.owned_cidrs)) items.push(finding('ip_not_owned', 'medium', `${r.name}|${r.value}`, `${r.name} points at ${r.value}, which is outside the address ranges you own.`, 'Check the address still belongs to your provider or service; remove the record if not.', { subject: r.zone }));
    if (r.ttl !== null && (r.ttl < s.ttl_min || r.ttl > s.ttl_max)) items.push(finding('ttl_out_of_range', 'low', sig, `${r.type} record ${r.name} has a TTL of ${r.ttl} seconds.`, r.ttl < s.ttl_min ? 'Raise it unless you are about to move the record; very short TTLs add load and cost.' : 'Lower it so a change takes effect within a day or so.', { subject: r.zone }));
    if (r.name.startsWith('*.')) items.push(finding('wildcard_record', 'low', sig, `${r.name} is a wildcard ${r.type} record pointing at ${r.value}.`, 'Replace it with the names you actually use, unless a service needs it.', { subject: r.zone }));
  }
  // DNSSEC records (RRSIG, NSEC, NSEC3) sit beside a CNAME by design (RFC 4035) and are not a conflict.
  for (const [name, list] of byName) { const types = new Set(list.map((r) => r.type).filter((t) => !DNSSEC.has(t))); if (types.has('CNAME') && types.size > 1) items.push(finding('cname_conflict', 'high', name, `${name} has a CNAME and also ${[...types].filter((t) => t !== 'CNAME').sort().join(', ')} records.`, 'Keep either the CNAME or the other records, not both.', { subject: list[0].zone })); }
  const zones = [...new Set(rs.map((r) => r.zone))].sort();
  return { records: rs.length, zones: zones.length, names: byName.size, cnames: rs.filter((r) => r.type === 'CNAME').length, by_zone: ((nr, nf) => zones.map((zone) => ({ zone, records: nr.get(zone) || 0, findings: nf.get(zone) || 0 })))(countBy(rs, (r) => r.zone), countBy(items, (i) => i.subject)), items };
}
