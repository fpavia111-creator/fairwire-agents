// Fairwire DNS Queries: resolver query log review. Pure functions.
import { num, str, low, pct, round1, cleanIp, shannonEntropy, finding } from 'fairwire-core';

export const CHECKS = Object.freeze({
  possible_tunnel: 'Many long, random-looking names under one domain from one client: a common sign of data sent out through DNS (tunnelling) or malware.',
  outside_resolver: 'A client asked a resolver that is not on your list of inside resolvers, so your DNS filtering and logs are bypassed.',
  blocked_client: 'A client kept asking for names your resolver blocks (often an infected or misconfigured device).',
  nxdomain_client: 'A client got "no such name" for most of its queries (stale settings, a removed server, or malware guessing names).',
  servfail_name: 'A name that failed with SERVFAIL for a large share of queries (a broken zone or upstream).',
  chatty_name: 'One client asked for one name very many times (very short TTLs or an app polling; a cache or longer TTL would cut the traffic).',
});

export const QUERY_FIELDS = Object.freeze({
  client: { aliases: ['Client IP', 'Client', 'Source IP', 'Source', 'client_ip', 'Requestor', 'Host IP'], required: true },
  query: { aliases: ['Query Name', 'Query', 'QName', 'Domain', 'Name', 'FQDN', 'Question'], required: true },
  qtype: { aliases: ['Query Type', 'QType', 'Type', 'Record Type', 'RR Type'] },
  rcode: { aliases: ['Response Code', 'RCode', 'Response', 'Status', 'Reply Code', 'Result Code'] },
  count: { type: 'number', aliases: ['Count', 'Queries', 'Hits', 'Requests', 'Total'] },
  resolver: { aliases: ['Resolver', 'Server', 'DNS Server', 'Upstream', 'Destination IP', 'Server IP'] },
  action: { aliases: ['Action', 'Policy Action', 'Blocked', 'Filter Action', 'Disposition'] },
  at: { type: 'datetime', aliases: ['Timestamp', 'Time', 'Date', 'Query Time'] },
});

export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  internal_resolvers: { type: 'array', items: { type: 'string' }, maxItems: 100, description: 'Addresses of your own resolvers; queries to any other resolver are flagged (no check when empty)' },
  chatty_min: { type: 'integer', minimum: 2, description: 'Queries for one name from one client before it is flagged (default 1000)' },
  nxdomain_min: { type: 'integer', minimum: 1, description: 'NXDOMAIN answers a client needs before its share is judged (default 20)' },
  nxdomain_share_pct: { type: 'number', minimum: 1, maximum: 100, description: 'NXDOMAIN share of a client above which it is flagged (default 50)' },
  servfail_min: { type: 'integer', minimum: 1, description: 'Queries a name needs before its SERVFAIL share is judged (default 10)' },
  servfail_share_pct: { type: 'number', minimum: 1, maximum: 100, description: 'SERVFAIL share above which a name is flagged (default 25)' },
  blocked_min: { type: 'integer', minimum: 1, description: 'Blocked queries from one client before it is flagged (default 10)' },
  tunnel_names_min: { type: 'integer', minimum: 2, description: 'Distinct long random-looking names under one domain from one client before it is flagged (default 10)' },
  long_label: { type: 'integer', minimum: 10, description: 'Characters in the first label that make a name long (default 30)' },
  entropy_min: { type: 'number', minimum: 1, maximum: 6, description: 'Character entropy (bits) above which a long label looks random (default 3.5)' },
  ignore_domains: { type: 'array', items: { type: 'string' }, maxItems: 500, description: 'Domains whose long names are expected (some security and CDN services), e.g. "example-av.net"' },
} };
export const DEFAULTS = Object.freeze({ internal_resolvers: [], chatty_min: 1000, nxdomain_min: 20, nxdomain_share_pct: 50, servfail_min: 10, servfail_share_pct: 25, blocked_min: 10, tunnel_names_min: 10, long_label: 30, entropy_min: 3.5, ignore_domains: [] });

const SLD = new Set(['co', 'com', 'org', 'net', 'ac', 'gov', 'edu', 'or', 'ne']);
/** The domain a name belongs to, approximately: the last two labels, or three for names like example.co.uk. */
export function baseDomain(name) {
  const p = low(name).replace(/\.$/, '').split('.').filter(Boolean);
  if (p.length <= 2) return p.join('.');
  return (p.at(-1).length === 2 && SLD.has(p.at(-2)) ? p.slice(-3) : p.slice(-2)).join('.');
}
const BLOCK = /^(block|blocked|deny|denied|drop|dropped|sinkhole|sinkholed|refused|filtered|yes|true)$/i;

export function reviewQueries(rows, settings = {}) {
  const s = { ...DEFAULTS, ...settings };
  const qs = rows.map((r) => ({ client: cleanIp(r.client), name: low(r.query).replace(/\.$/, ''), type: str(r.qtype).toUpperCase(), rcode: str(r.rcode).toUpperCase() || 'NOERROR', count: Math.max(1, Math.round(num(r.count) || 1)), resolver: cleanIp(r.resolver), blocked: BLOCK.test(str(r.action)) })).filter((q) => q.client && q.name);
  const items = []; const total = qs.reduce((t, q) => t + q.count, 0);
  const ignored = (n) => s.ignore_domains.some((d) => n === low(d) || n.endsWith(`.${low(d)}`));
  const byClient = new Map(); const byName = new Map(); const pair = new Map(); const tunnel = new Map(); const outside = new Map();
  const add = (m, k) => { const e = m.get(k) || { q: 0, nx: 0, sf: 0, blocked: 0, names: new Set(), clients: new Set() }; m.set(k, e); return e; };
  for (const q of qs) {
    const c = add(byClient, q.client); c.q += q.count; if (q.rcode === 'NXDOMAIN') c.nx += q.count; if (q.blocked) { c.blocked += q.count; c.names.add(q.name); }
    const n = add(byName, q.name); n.q += q.count; if (q.rcode === 'SERVFAIL') n.sf += q.count; n.clients.add(q.client);
    const p = `${q.client}>${q.name}`; pair.set(p, (pair.get(p) || 0) + q.count);
    const label = q.name.split('.')[0];
    if (label.length >= s.long_label && shannonEntropy(label) >= s.entropy_min && !ignored(q.name)) add(tunnel, `${q.client}>${baseDomain(q.name)}`).names.add(q.name);
    if (s.internal_resolvers.length && q.resolver && !s.internal_resolvers.includes(q.resolver)) { const e = add(outside, `${q.client}>${q.resolver}`); e.q += q.count; }
  }
  for (const [k, e] of tunnel) if (e.names.size >= s.tunnel_names_min) { const [client, dom] = k.split('>'); items.push(finding('possible_tunnel', 'high', k, `${client} asked for ${e.names.size} long random-looking names under ${dom}.`, 'Find the process on this device that makes these queries; block the domain at the resolver if nobody can explain it.', { subject: client, names: e.names.size })); }
  for (const [k, e] of outside) { const [client, res] = k.split('>'); items.push(finding('outside_resolver', 'medium', k, `${client} sent ${e.q} queries straight to ${res}, which is not one of your resolvers.`, 'Point the device at your own resolvers and block outbound DNS (port 53 and DNS over HTTPS) from clients at the firewall.', { subject: client, queries: e.q })); }
  for (const [client, e] of byClient) {
    if (e.blocked >= s.blocked_min) items.push(finding('blocked_client', 'medium', client, `${client} asked ${e.blocked} times for ${e.names.size} blocked name(s) (${[...e.names].sort().slice(0, 3).join(', ')}).`, 'Scan the device; repeated lookups of blocked names often come from malware or a leftover browser extension.', { subject: client, queries: e.blocked }));
    const sh = pct(e.nx, e.q); if (e.nx >= s.nxdomain_min && sh > s.nxdomain_share_pct) items.push(finding('nxdomain_client', 'medium', client, `${sh}% of ${client}'s ${e.q} queries got NXDOMAIN (no such name).`, 'Look for an old server name, a mapped drive or a proxy setting (WPAD) the device still asks for.', { subject: client, share_pct: sh }));
  }
  for (const [name, e] of byName) { const sh = pct(e.sf, e.q); if (e.q >= s.servfail_min && sh > s.servfail_share_pct) items.push(finding('servfail_name', 'low', name, `${sh}% of ${e.q} queries for ${name} failed with SERVFAIL (${e.clients.size} client(s)).`, 'Check the zone\'s name servers and DNSSEC for this name, or the upstream your resolver forwards to.', { subject: name, share_pct: sh })); }
  for (const [k, n] of pair) if (n >= s.chatty_min) { const [client, name] = k.split('>'); items.push(finding('chatty_name', 'low', k, `${client} asked for ${name} ${n} times.`, 'Check the record\'s TTL and whether the app caches answers.', { subject: client, queries: n })); }
  const nx = qs.filter((q) => q.rcode === 'NXDOMAIN').reduce((t, q) => t + q.count, 0);
  const repeated = [...pair.values()].reduce((t, n) => t + Math.max(0, n - 1), 0);
  return {
    queries: total, clients: byClient.size, names: byName.size, nxdomain_pct: pct(nx, total), repeated_pct: pct(repeated, total),
    top_clients: [...byClient.entries()].map(([client, e]) => ({ client, queries: e.q, nxdomain: e.nx, blocked: e.blocked })).sort((a, b) => b.queries - a.queries || (a.client < b.client ? -1 : 1)).slice(0, 20),
    avg_per_name: names(byName, total), items,
  };
}
const names = (m, total) => (m.size ? round1(total / m.size) : 0);
