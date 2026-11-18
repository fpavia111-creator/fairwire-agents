// Rewrite an English fixture the way an export from another market writes it
// (shared by intl-check.mjs and make-intl-fixtures.mjs).
import { parseCsv, normHeader, namesFor, conceptOf, DEFAULT_UNITS } from '../../packages/fairwire-core/src/index.js';

// How each market writes a file. Dates: d = day-first with the separator, y = year-first.
export const MARKETS = {
  de: { enc: 'windows-1252', sep: ';', dec: ',', grp: '.', date: (y, m, d) => `${d}.${m}.${y}`, unitInName: true },
  fr: { enc: 'utf-8-bom', sep: ';', dec: ',', grp: ' ', date: (y, m, d) => `${d}/${m}/${y}`, dmy: true },
  es: { enc: 'utf-8', sep: ';', dec: ',', grp: '.', date: (y, m, d) => `${d}/${m}/${y}`, dmy: true, unitInName: true },
  pt: { enc: 'utf-8', sep: ';', dec: ',', grp: '.', date: (y, m, d) => `${d}/${m}/${y}`, dmy: true },
  it: { enc: 'utf-8', sep: ';', dec: ',', grp: '.', date: (y, m, d) => `${d}/${m}/${y}`, dmy: true, unitInName: true },
  ja: { enc: 'shift_jis', sep: ',', dec: '.', grp: ',', date: (y, m, d) => `${y}/${m}/${d}` },
  zh: { enc: 'gbk', sep: ',', dec: '.', grp: ',', date: (y, m, d) => `${y}-${m}-${d}`, unitInName: true },
  ko: { enc: 'euc-kr', sep: ',', dec: '.', grp: ',', date: (y, m, d) => `${y}.${m}.${d}` },
};
const TO_METRIC = { lb: ['kg', 0.45359237], mi: ['km', 1.609344], in: ['cm', 2.54] };
const unitOf = (f, fd) => (fd && fd.unit === false ? null : (fd && fd.unit) || DEFAULT_UNITS[f] || null);

const walk = (v, out = []) => { if (typeof v === 'string') { if (/\.csv$/i.test(v)) out.push(v); } else if (Array.isArray(v)) v.forEach((x) => walk(x, out)); else if (v && typeof v === 'object') Object.values(v).forEach((x) => walk(x, out)); return out; };
export const argFiles = (args) => Object.entries(args || {}).flatMap(([a, v]) => walk(v).map((f) => [a, f]));

function fmtNumber(s, mk, decimals) {
  const n = Number(s); if (!Number.isFinite(n)) return s;
  const neg = n < 0; const fixed = Math.abs(n).toFixed(decimals);
  const [i, f] = fixed.split('.');
  const grouped = i.replace(/\B(?=(\d{3})+(?!\d))/g, mk.grp);
  return (neg ? '-' : '') + grouped + (f ? mk.dec + f : '');
}
function fmtDate(s, mk) {
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})( \d{1,2}:\d{2})?$/.exec(String(s).trim()); // the English fixtures write US dates too
  if (us) return mk.date(us[3], us[1].padStart(2, '0'), us[2].padStart(2, '0')) + (us[4] || '');
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}:\d{2}(?::\d{2})?))?(Z|[+-]\d{2}:?\d{2})?$/.exec(String(s).trim());
  if (!m || m[5]) return s; // keep zoned timestamps exactly
  return mk.date(m[1], m[2], m[3]) + (m[4] ? ` ${m[4]}` : '');
}
const quote = (v, sep) => { const s = String(v ?? ''); return /["\r\n]/.test(s) || s.includes(sep) ? `"${s.replace(/"/g, '""')}"` : s; };

/** Rewrite one CSV for a language. Returns { text, translated, columns }. */
export function localise(csvText, def, lang, missing = null) {
  const mk = MARKETS[lang]; const rows = parseCsv(csvText); if (!rows.length) return null;
  const headers = Object.keys(rows[0]); const fields = def.fields || {};
  const english = new Set(); for (const [f, fd] of Object.entries(fields)) { english.add(normHeader(f)); for (const a of (fd && fd.aliases) || []) english.add(normHeader(a)); }
  // Same order as the adapter: a field's own name first, then its aliases, one column per field.
  const owner = new Map(); const taken = new Set();
  for (const [f] of Object.entries(fields)) { const h = headers.find((x) => normHeader(x) === normHeader(f)); if (h !== undefined) { owner.set(h, f); taken.add(f); } }
  for (const [f, fd] of Object.entries(fields)) { if (taken.has(f)) continue; for (const a of (fd && fd.aliases) || []) { const h = headers.find((x) => !owner.has(x) && normHeader(x) === normHeader(a)); if (h !== undefined) { owner.set(h, f); taken.add(f); break; } } }
  const fieldOf = (h) => (owner.has(h) ? [owner.get(h), fields[owner.get(h)] || {}] : [null, null]);
  const used = new Set(); const plan = []; let translated = 0;
  for (const h of headers) {
    const [f, fd] = fieldOf(h); let name = h; let unit = null;
    if (f) {
      const word = namesFor(conceptOf(f, fd), lang).find((w) => !english.has(normHeader(w)) && !used.has(normHeader(w)));
      if (word) { name = word; used.add(normHeader(word)); translated++; } else if (missing) missing.set(f, (missing.get(f) || 0) + 1);
      const u = unitOf(f, fd);
      if (u && TO_METRIC[u] && (fd.type === 'number' || fd.type === 'money')) { unit = TO_METRIC[u]; if (word && mk.unitInName) name = `${word} (${unit[0]})`; if (!word) name = `${h} (${unit[0]})`; }
    }
    plan.push({ h, name, fd: fd || {}, unit });
  }
  const lines = [plan.map((p) => quote(p.name, mk.sep)).join(mk.sep)];
  for (const r of rows) lines.push(plan.map((p) => {
    let v = r[p.h]; const s = String(v ?? '').trim();
    if (s === '') return '';
    const type = p.fd.type;
    if (type === 'date' || type === 'datetime') v = fmtDate(s, mk);
    else if ((type === 'money' || type === 'number') && /^-?\d+(\.\d+)?$/.test(s)) {
      if (p.unit) v = fmtNumber(String(Number(s) * p.unit[1]), mk, 4);
      else v = fmtNumber(s, mk, type === 'money' ? 2 : (s.split('.')[1] || '').length);
    }
    return quote(v, mk.sep);
  }).join(mk.sep));
  return { text: lines.join('\r\n') + '\r\n', translated, columns: headers.length };
}

