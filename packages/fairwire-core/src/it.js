// IT and network helpers shared by the Fairwire agents. Pure functions, no I/O.
//
// Nothing here is a vendor's rule or a standard's requirement. Port names, "risky"
// port lists, cleartext protocols and thresholds are working defaults that the
// buyer overrides with a settings file; every agent says which defaults it used.
import { readNumber } from './intl.js';

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
export const round1 = (n) => Math.round((Number(n) + Number.EPSILON) * 10) / 10;
export const num = (v) => { if (v === null || v === undefined || v === '') return null; if (typeof v === 'number') return Number.isFinite(v) ? v : null; const n = readNumber(v); return Number.isFinite(n) ? n : null; };
export const sum = (xs) => round2(xs.reduce((s, x) => s + (Number(x) || 0), 0));
export const str = (v) => String(v ?? '').trim();
export const low = (v) => str(v).toLowerCase();
/** Percentage a of b, one decimal; 0 when b is 0. */
export const pct = (a, b) => (b ? round1((100 * a) / b) : 0);
/** A yes/no cell read loosely ("yes", "true", "1", "enabled"); null when blank or unclear. */
export function yes(v) {
  const s = low(v);
  if (!s) return null;
  if (/^(y|yes|true|t|1|on|enabled|enable|active|registered|compliant|protected|encrypted|ok|pass|passed|success|succeeded)$/.test(s)) return true;
  if (/^(n|no|false|f|0|off|disabled|disable|inactive|not registered|unregistered|noncompliant|non-compliant|not compliant|unprotected|not encrypted|fail|failed|failure)$/.test(s)) return false;
  return null;
}

// ---------------------------------------------------------------- dates ----
const DAY = 86400000;
export const toMs = (v) => { const s = str(v); if (!s) return NaN; const iso = /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00Z` : /[zZ]|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s.replace(' ', 'T')}Z`; return Date.parse(iso); };
export const isoDate = (v) => { const t = toMs(v); return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null; };
export const isoTime = (v) => { const t = toMs(v); return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 19) : null; };
export function daysBetween(a, b) { const x = toMs(a), y = toMs(b); return Number.isFinite(x) && Number.isFinite(y) ? Math.round((y - x) / DAY) : null; }
export function hoursBetween(a, b) { const x = toMs(a), y = toMs(b); return Number.isFinite(x) && Number.isFinite(y) ? round2((y - x) / 3600000) : null; }
export function minutesBetween(a, b) { const x = toMs(a), y = toMs(b); return Number.isFinite(x) && Number.isFinite(y) ? round1((y - x) / 60000) : null; }
export function addDays(d, n) { const t = toMs(d); return Number.isFinite(t) ? new Date(t + n * DAY).toISOString().slice(0, 10) : null; }
export const inWindow = (d, from, to) => { const x = isoDate(d); return !!x && (!from || x >= isoDate(from)) && (!to || x <= isoDate(to)); };
export const monthOf = (d) => { const x = isoDate(d); return x ? x.slice(0, 7) : null; };
/** Hour of day (0-23) of a timestamp as written (no time zone shift). */
export const hourOf = (v) => { const m = /[T ](\d{1,2}):\d{2}/.exec(str(v)); return m ? Number(m[1]) : null; };
/** Day of week of a date, 0 = Sunday. */
export const weekdayOf = (v) => { const t = toMs(isoDate(v)); return Number.isFinite(t) ? new Date(t).getUTCDay() : null; };
export const today = () => new Date().toISOString().slice(0, 10);
/** Two time ranges overlap (end exclusive). */
export function overlaps(aStart, aEnd, bStart, bEnd) { const a0 = toMs(aStart), a1 = toMs(aEnd), b0 = toMs(bStart), b1 = toMs(bEnd); return [a0, a1, b0, b1].every(Number.isFinite) && a0 < b1 && b0 < a1; }

// ------------------------------------------------------------ grouping ----
/** Group rows by a key function into a Map, keeping order. */
export function groupBy(rows, key) {
  const m = new Map();
  for (const r of rows) { const k = key(r); if (!m.has(k)) m.set(k, []); m.get(k).push(r); }
  return m;
}
/** Count by key into a plain object sorted by key, so results do not depend on row order. */
export function countBy(rows, key) {
  const m = {};
  for (const r of rows) { const k = typeof key === 'function' ? key(r) : r[key]; m[k] = (m[k] || 0) + 1; }
  return Object.fromEntries(Object.entries(m).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}
/** Sort by a list of keys; ties broken by the next key, strings compared plainly. Stable across row order. */
export function sortBy(rows, ...keys) {
  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  return [...rows].sort((x, y) => { for (const k of keys) { const desc = k.startsWith('-'); const f = desc ? k.slice(1) : k; const c = cmp(x[f] ?? '', y[f] ?? ''); if (c) return desc ? -c : c; } return 0; });
}

// ---------------------------------------------------------------- IPs ----
const V4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
export const isIpv4 = (s) => V4.test(str(s));
export const isIpv6 = (s) => { const t = str(s); return /^[0-9a-f:]+$/i.test(t) && t.includes(':') && t.split(':').length <= 8 && t.length >= 2; };
export const isIp = (s) => isIpv4(s) || isIpv6(s);
/** Strip a port, brackets or a zone from an address as exports write it ("10.0.0.5:443", "[fe80::1%eth0]"). */
export function cleanIp(s) {
  let t = str(s).replace(/^\[|\](:\d+)?$/g, '').replace(/%.*$/, '');
  if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(t)) t = t.replace(/:\d+$/, '');
  return t;
}
export function ipToInt(ip) { const t = cleanIp(ip); if (!isIpv4(t)) return null; return t.split('.').reduce((n, o) => n * 256 + Number(o), 0); }
export const intToIp = (n) => [24, 16, 8, 0].map((s) => Math.floor(n / 2 ** s) % 256).join('.');
/** Parse "10.1.0.0/16" (or a bare address as /32). Returns { base, bits, first, last, size } or null. */
export function parseCidr(c) {
  const [ip, b] = str(c).split('/'); const n = ipToInt(ip); if (n === null) return null;
  const bits = b === undefined ? 32 : Number(b); if (!Number.isInteger(bits) || bits < 0 || bits > 32) return null;
  const size = 2 ** (32 - bits); const first = Math.floor(n / size) * size;
  return { base: intToIp(first), bits, first, last: first + size - 1, size };
}
export function inCidr(ip, cidr) { const n = ipToInt(ip); const c = typeof cidr === 'string' ? parseCidr(cidr) : cidr; return n !== null && !!c && n >= c.first && n <= c.last; }
export const inAnyCidr = (ip, list = []) => list.some((c) => inCidr(ip, c));
const PRIVATE4 = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '100.64.0.0/10', '127.0.0.0/8', '169.254.0.0/16'].map(parseCidr);
/** RFC 1918, carrier-grade NAT, loopback and link-local; for IPv6 unique-local, link-local and loopback. */
export function isPrivateIp(ip) {
  const t = cleanIp(ip);
  if (isIpv4(t)) return PRIVATE4.some((c) => inCidr(t, c));
  if (isIpv6(t)) return /^(f[cd]|fe[89ab])/i.test(t) || t === '::1';
  return false;
}
export const isPublicIp = (ip) => isIp(cleanIp(ip)) && !isPrivateIp(ip);
/** Any-address words firewall exports use. */
export const isAny = (v) => /^(any|all|\*|0\.0\.0\.0\/0|::\/0|0\.0\.0\.0|any4|any6|all_ports|internet)$/i.test(str(v));

// --------------------------------------------------------------- MACs ----
export function normMac(m) { const h = str(m).toLowerCase().replace(/[^0-9a-f]/g, ''); return h.length === 12 ? h.match(/../g).join(':') : null; }
/** A MAC with the locally administered bit set: usually a phone or laptop's private (random) address. */
export const isRandomMac = (m) => { const n = normMac(m); return !!n && (parseInt(n.slice(0, 2), 16) & 2) === 2; };

// -------------------------------------------------------------- ports ----
export const PORT_NAMES = Object.freeze({ 20: 'FTP data', 21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS', 69: 'TFTP', 80: 'HTTP', 110: 'POP3', 123: 'NTP', 135: 'MS RPC', 137: 'NetBIOS', 138: 'NetBIOS', 139: 'NetBIOS', 143: 'IMAP', 161: 'SNMP', 389: 'LDAP', 443: 'HTTPS', 445: 'SMB', 514: 'Syslog', 636: 'LDAPS', 993: 'IMAPS', 995: 'POP3S', 1433: 'SQL Server', 1521: 'Oracle', 3306: 'MySQL', 3389: 'RDP', 5060: 'SIP', 5061: 'SIP TLS', 5432: 'PostgreSQL', 5900: 'VNC', 6379: 'Redis', 8080: 'HTTP alt', 8443: 'HTTPS alt', 9200: 'Elasticsearch', 27017: 'MongoDB' });
/** Ports that should rarely be open to the internet. A default; settings replace it. */
export const RISKY_INBOUND_PORTS = Object.freeze([21, 23, 135, 137, 138, 139, 445, 1433, 1521, 3306, 3389, 5432, 5900, 6379, 9200, 27017, 161, 69]);
/** Protocols that send data, and often passwords, without encryption. */
export const CLEARTEXT = Object.freeze({ ports: [21, 23, 80, 110, 143, 69, 161, 389, 8080], names: ['http', 'ftp', 'telnet', 'pop3', 'imap', 'tftp', 'snmp', 'snmpv1', 'snmpv2', 'snmpv2c', 'ldap'] });
export const portName = (p) => PORT_NAMES[Number(p)] || (p === null || p === undefined || p === '' ? '' : `port ${p}`);
/** Read "443", "tcp/443", "80,443", "1024-65535", "any" into { any, ranges: [[lo, hi]] }. */
export function parsePorts(v) {
  const s = low(v).replace(/\b(tcp|udp|sctp)[/:]?/g, '');
  if (!s || isAny(s) || s === '0-65535' || s === '1-65535') return { any: true, ranges: [[0, 65535]], count: 65536 };
  const ranges = [];
  for (const part of s.split(/[,;\s]+/).filter(Boolean)) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (m) { const a = Number(m[1]), b = m[2] ? Number(m[2]) : a; ranges.push([Math.min(a, b), Math.max(a, b)]); }
    else { const named = Object.entries(PORT_NAMES).find(([, n]) => n.toLowerCase() === part); if (named) ranges.push([Number(named[0]), Number(named[0])]); }
  }
  const count = ranges.reduce((t, [a, b]) => t + (b - a + 1), 0);
  return { any: count >= 65535, ranges, count };
}
export const portsInclude = (p, port) => p.any || p.ranges.some(([a, b]) => port >= a && port <= b);
/** Every port of b is in a. */
export const portsCover = (a, b) => a.any || (!b.any && b.ranges.every(([x, y]) => a.ranges.some(([p, q]) => x >= p && y <= q)));

// ----------------------------------------------------- names and versions ----
/** Host name key: lower case, no domain suffix, no trailing dot. "LAPTOP-07.corp.example." → "laptop-07". */
export const hostKey = (h) => low(h).replace(/\.$/, '').split('.')[0];
/** Compare dotted versions numerically ("10.0.19045" vs "10.0.22631"); text parts compared plainly. */
export function versionCompare(a, b) {
  const x = str(a).split(/[.\-_ ]/), y = str(b).split(/[.\-_ ]/);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const p = x[i] ?? '0', q = y[i] ?? '0'; const np = /^\d+$/.test(p), nq = /^\d+$/.test(q);
    const c = np && nq ? Number(p) - Number(q) : p < q ? -1 : p > q ? 1 : 0;
    if (c) return c < 0 ? -1 : 1;
  }
  return 0;
}
/** Bytes as people read them: 1.5 GB. Decimal units, as network tools report. */
export function humanBytes(n) {
  const v = Number(n) || 0; const u = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']; let i = 0; let x = v;
  while (Math.abs(x) >= 1000 && i < u.length - 1) { x /= 1000; i++; }
  return `${i ? round1(x) : Math.round(x)} ${u[i]}`;
}
/** Money with two decimals as a plain number (reports show the currency column separately). */
export const money = (v) => round2(Number(v) || 0);
