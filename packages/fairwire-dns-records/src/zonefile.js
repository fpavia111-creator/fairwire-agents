// DNS master files (RFC 1035 section 5): what BIND, Windows DNS, Cloudflare, Route 53 (via cli53) and a zone
// transfer (dig AXFR) write. Read into the same rows as a spreadsheet export: zone, name, type, value, ttl.
// Pure functions. Added in the final pass to read the public IANA root zone as published.
//
// Handled: comments, $ORIGIN, $TTL, $INCLUDE (not followed; counted), "@", relative and absolute names,
// a blank owner (the previous one), TTL and class in either order, records split over lines with
// parentheses, and quoted text with semicolons inside.

const TYPES = new Set(['A', 'AAAA', 'AFSDB', 'APL', 'CAA', 'CDNSKEY', 'CDS', 'CERT', 'CNAME', 'CSYNC', 'DHCID', 'DLV', 'DNAME', 'DNSKEY', 'DS', 'EUI48', 'EUI64', 'HINFO', 'HIP', 'HTTPS', 'IPSECKEY', 'KEY', 'KX', 'LOC', 'MX', 'NAPTR', 'NS', 'NSEC', 'NSEC3', 'NSEC3PARAM', 'OPENPGPKEY', 'PTR', 'RP', 'RRSIG', 'SIG', 'SMIMEA', 'SOA', 'SPF', 'SRV', 'SSHFP', 'SVCB', 'TA', 'TLSA', 'TXT', 'URI', 'ZONEMD']);
const CLASSES = new Set(['IN', 'CH', 'HS', 'CS']);
const isType = (t) => TYPES.has(t.toUpperCase()) || /^TYPE\d+$/i.test(t);
/** Record types whose whole value is one domain name, resolved against $ORIGIN when relative. */
const NAME_VALUE = new Set(['CNAME', 'DNAME', 'NS', 'PTR']);

/** Strip a comment that is not inside quotes. */
function stripComment(line) {
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '\\') { i++; continue; }
    if (ch === '"') q = !q; else if (ch === ';' && !q) return line.slice(0, i);
  }
  return line;
}
/** Split on whitespace, keeping quoted strings whole. */
function tokens(s) { return s.match(/"(?:[^"\\]|\\.)*"|[^\s()]+/g) || []; }

/** True when the text looks like a master file rather than a CSV or JSON export. */
export function looksLikeZoneFile(text) {
  const lines = String(text).split(/\r?\n/).map((l) => stripComment(l).trim()).filter(Boolean).slice(0, 40);
  if (!lines.length) return false;
  if (lines.some((l) => /^\$(ORIGIN|TTL)\b/i.test(l))) return true;
  const data = lines.filter((l) => !/^[,;]/.test(l));
  const rr = data.filter((l) => { const t = tokens(l); return t.slice(0, 4).some((x, k) => k > 0 && isType(x)) && !/,/.test(l.split(/\s+/)[0]); });
  return rr.length >= Math.min(3, data.length) && !data[0].includes(',');
}

export function parseZoneFile(text, { origin = '' } = {}) {
  let org = origin ? (origin.endsWith('.') ? origin : `${origin}.`) : '';
  let ttl = null; let last = null; const rows = []; let includes = 0; let skipped = 0; let zone = org;
  const abs = (n) => { if (n === '@') return org || '.'; if (n.endsWith('.')) return n; return org && org !== '.' ? `${n}.${org}` : `${n}.`; };
  const src = String(text).replace(/^﻿/, '').split(/\r?\n/);
  for (let i = 0; i < src.length; i++) {
    let raw = stripComment(src[i]);
    // A record split over lines with parentheses (SOA, DNSKEY, RRSIG).
    let depth = (raw.match(/\(/g) || []).length - (raw.match(/\)/g) || []).length;
    while (depth > 0 && i + 1 < src.length) { const next = stripComment(src[++i]); raw += ` ${next}`; depth += (next.match(/\(/g) || []).length - (next.match(/\)/g) || []).length; }
    if (!raw.trim()) continue;
    const blankOwner = /^\s/.test(raw);
    const t = tokens(raw);
    if (!t.length) continue;
    const d = t[0].toUpperCase();
    if (d === '$ORIGIN') { org = t[1] ? (t[1].endsWith('.') ? t[1] : `${t[1]}.${org}`) : org; if (!zone) zone = org; continue; }
    if (d === '$TTL') { ttl = Number(t[1]) || ttl; continue; }
    if (d === '$INCLUDE') { includes++; continue; }
    let k = 0; let owner;
    if (blankOwner) owner = last; else { owner = abs(t[0]); k = 1; }
    let rttl = null;
    for (let n = 0; n < 2 && k < t.length; n++) {
      if (/^\d+$/.test(t[k])) { rttl = Number(t[k]); k++; } else if (CLASSES.has(t[k].toUpperCase())) k++;
    }
    const type = t[k] ? t[k].toUpperCase() : '';
    if (!owner || !isType(type)) { skipped++; continue; }
    let value = t.slice(k + 1).join(' ');
    if (NAME_VALUE.has(type) && t[k + 1]) value = abs(t[k + 1]);
    if (type === 'SOA' && !zone) zone = owner;
    last = owner;
    rows.push({ zone: zone || org || owner, name: owner, type, value, ttl: rttl ?? ttl ?? '' });
  }
  return { rows, includes, skipped };
}
