// Personal-data masking. Every Fairwire tool result passes through here before it
// leaves the runtime, so the AI model that called the tool sees stable pseudonyms
// (USR-3f2a9c1d) instead of people's names, sign-in names, e-mail addresses, phone
// numbers and the public addresses they connected from. Files the tools write on this
// machine (worklists, drafts) keep the real values, because the IT team needs them.
//
// What it is, honestly:
//   - It removes the direct identifiers below from what the model sees. It is not
//     anonymisation: device names, internal addresses, dates and counts still reach
//     the model in the default "mask" mode. "strict" also masks host and device names
//     and every IP address.
//   - It works from column and field names plus a few text patterns (e-mail, phone).
//     A name typed into a free-text column the agent does not know about can get
//     through, and a device name like "JSMITH-LAPTOP" carries a name in "mask" mode.
//
// Pseudonyms are HMAC-SHA256 of the value with a per-installation key
// (<stateDir>/pii.key, created on first use, never returned), so the same person gets
// the same pseudonym in every result, and a pseudonym cannot be reversed without the
// key. A tool argument may be a pseudonym; tools match it with pii.same().

import { createHmac, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { join, dirname } from 'node:path';

export const PII_MODES = Object.freeze(['mask', 'strict', 'off']);
export const PII_KEY_FILE = 'pii.key';

/** Keys whose values describe the file's columns (field → header), never personal data. Free-text scrubbing still applies. */
const META_KEYS = new Set(['mapped', 'unmapped', 'missing', 'translated', 'columns', 'recognised_by', 'signature', 'by_finding', 'by_status', 'kinds']);
const norm = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
const keys = (kind, list) => list.map((k) => [norm(k), kind]);

// Field names (any case or punctuation) → kind. Kinds in STRICT_ONLY are masked only in strict mode.
const KEY_KIND = new Map([
  ...keys('name', ['display_name', 'full_name', 'person', 'person_name', 'employee', 'employee_name', 'first_name', 'last_name', 'user_display_name', 'user_full_name', 'requester', 'requester_name', 'caller', 'caller_name', 'assigned_user', 'assigned_to', 'assignee', 'owner_name', 'device_owner', 'user_name_display', 'subscriber', 'subscriber_name', 'cardholder']),
  ...keys('user', ['user', 'username', 'user_name', 'login', 'login_name', 'upn', 'user_principal_name', 'sam_account_name', 'samaccountname', 'account_name', 'user_id', 'userid', 'actor', 'sign_in_name', 'principal', 'recipient', 'mailbox', 'user_email', 'email', 'email_address', 'owner_email', 'requester_email', 'users']),
  ...keys('phone', ['phone', 'phone_number', 'mobile', 'mobile_number', 'line_number', 'msisdn', 'telephone', 'extension', 'did', 'caller_number', 'callee_number', 'calling_number', 'called_number']),
  ...keys('device_id', ['imei', 'meid', 'iccid', 'sim', 'sim_number', 'imsi']),
  ...keys('ip', ['client_ip', 'public_ip', 'caller_ip', 'signin_ip', 'remote_ip', 'source_public_ip', 'client_address', 'ips']),
  ...keys('host', ['hostname', 'host', 'device_name', 'computer_name', 'device', 'computer', 'workstation', 'endpoint', 'machine', 'hosts']),
  ...keys('any_ip', ['ip', 'ip_address', 'src_ip', 'dst_ip', 'source_ip', 'destination_ip', 'address_ip']),
]);
const STRICT_ONLY = new Set(['host', 'any_ip']);
const PREFIX = { name: 'PERSON', user: 'USR', phone: 'TEL', device_id: 'DEV', ip: 'IP', host: 'HOST', any_ip: 'IP' };
const FIXED = {};
// Minimum length before a registered value is also searched for inside free text.
const MIN_TEXT = { name: 4, user: 3, phone: 6, device_id: 6, ip: 7, host: 4, any_ip: 7 };

const TEXT_PATTERNS = [
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[EMAIL]'],
  [/(?<![\d.-])\+?\(?\b\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b/g, '[PHONE]'],
];

// A value that is already a pseudonym or placeholder is left alone (results pass the masker more than once).
const ALREADY = /^((PERSON|USR|TEL|DEV|IP|HOST)-[0-9a-f]{8}|\[(EMAIL|PHONE)\])$/;

/** Kind of a field name, or null. */
export const piiKindOf = (key, mode = 'mask') => { const k = KEY_KIND.get(norm(key)); return !k || (STRICT_ONLY.has(k) && mode !== 'strict') ? null : k; };

/** Name variants a person's name appears as in text: as given, "First Last" and "Last, First". */
function nameVariants(raw) {
  const s = String(raw).trim(); if (!s) return [];
  const out = new Set([s]);
  const m = /^([^,]+),\s*(.+)$/.exec(s);
  if (m) out.add(`${m[2]} ${m[1]}`.trim());
  else { const p = s.split(/\s+/); if (p.length >= 2) out.add(`${p.at(-1)}, ${p.slice(0, -1).join(' ')}`); }
  return [...out];
}
const nameKey = (s) => String(s).toLowerCase().split(/[^a-z0-9À-￿]+/).filter(Boolean).sort().join(' ');

/** Read or create the per-installation pseudonym key. */
export function loadPiiKey(stateDir) {
  if (!stateDir) return randomBytes(32);
  const f = join(stateDir, PII_KEY_FILE);
  if (existsSync(f)) { const h = readFileSync(f, 'utf8').trim(); if (/^[0-9a-f]{64}$/.test(h)) return Buffer.from(h, 'hex'); throw new Error(`${PII_KEY_FILE} in the state folder is not a 64-character hex key; restore it from backup or delete it (pseudonyms will change)`); }
  mkdirSync(dirname(f), { recursive: true });
  const k = randomBytes(32);
  writeFileSync(f, k.toString('hex') + '\n', { mode: 0o600 });
  try { chmodSync(f, 0o600); } catch { /* Windows */ }
  return k;
}

export class PiiMasker {
  constructor({ mode = 'mask', key = null } = {}) {
    if (!PII_MODES.includes(mode)) throw new Error(`pii mode must be one of ${PII_MODES.join(', ')}`);
    this.mode = mode;
    this.key = key || randomBytes(32);
    this.reset();
  }

  /** Forget the values registered for the last call. */
  reset() { this.seen = new Map(); this.counts = {}; this.index = null; }

  get on() { return this.mode !== 'off'; }

  /** Stable pseudonym for a value of one kind. */
  token(kind, value) {
    const k = kind === 'any_ip' ? 'ip' : kind;
    const v = k === 'name' ? nameKey(value) : String(value).trim().toUpperCase();
    return `${PREFIX[k] || 'ID'}-${createHmac('sha256', this.key).update(`${k}|${v}`).digest('hex').slice(0, 8)}`;
  }

  /** What the model sees for one value of one kind. */
  maskValue(kind, value) {
    if (value === null || value === undefined || value === '' || !this.on) return value;
    if (Array.isArray(value)) return value.map((v) => this.maskValue(kind, v));
    if (typeof value === 'object') return value;
    const s = String(value);
    if (ALREADY.test(s)) return value;
    if ((kind === 'ip' || kind === 'any_ip') && !/[\d:]/.test(s)) return value;
    this.counts[kind] = (this.counts[kind] || 0) + 1;
    if (FIXED[kind]) { this.register(kind, s); return FIXED[kind]; }
    this.register(kind, s);
    return this.token(kind, s);
  }

  /** Remember a raw value so it is also replaced where it appears inside other text. */
  register(kind, raw) {
    if (!this.on || raw === null || raw === undefined) return;
    if (STRICT_ONLY.has(kind) && this.mode !== 'strict') return;
    const vals = kind === 'name' ? nameVariants(raw) : [String(raw).trim()];
    const rep = FIXED[kind] || this.token(kind, raw);
    // Leading and trailing punctuation is dropped for matching, so a value with junk in front of it
    // (a spreadsheet formula, a quote, a bullet) is still found where it appears in text.
    for (const v0 of vals) { const v = v0.replace(/^[^a-z0-9À-￿]+|[^a-z0-9À-￿]+$/gi, ''); if (v.length >= (MIN_TEXT[kind] || 4) && !this.seen.has(v.toLowerCase())) { this.seen.set(v.toLowerCase(), { value: v, rep }); this.index = null; } }
  }

  /** Register every personal-data field of plain records (used when a tool reads a source file). */
  registerRecords(rows, fieldKinds = {}) {
    if (!this.on || !Array.isArray(rows)) return;
    const cols = new Map();
    for (const r of rows.slice(0, 1)) if (r && typeof r === 'object') for (const k of Object.keys(r)) { const kind = fieldKinds[k] || piiKindOf(k, this.mode); if (kind && !(STRICT_ONLY.has(kind) && this.mode !== 'strict')) cols.set(k, kind); }
    if (!cols.size) return;
    for (const r of rows) if (r && typeof r === 'object') for (const [k, kind] of cols) if (r[k] !== null && r[k] !== undefined && r[k] !== '') this.register(kind, r[k]);
  }

  #buildIndex() {
    const idx = new Map();
    for (const [low, e] of this.seen) {
      const first = (/[a-z0-9À-￿]+/.exec(low) || [low])[0];
      if (!idx.has(first)) idx.set(first, []);
      idx.get(first).push({ low, ...e });
    }
    for (const list of idx.values()) list.sort((a, b) => b.low.length - a.low.length);
    this.index = idx;
  }

  /** Replace registered values, then e-mail and phone patterns, inside free text. */
  maskText(s) {
    if (!this.on || typeof s !== 'string' || !s) return s;
    let out = s;
    if (this.seen.size) {
      if (!this.index) this.#buildIndex();
      const lowS = out.toLowerCase(); let res = ''; let i = 0;
      const word = /[a-z0-9À-￿]+/g; let m;
      while ((m = word.exec(lowS))) {
        if (m.index < i) continue;
        const before = m.index === 0 || !/[a-z0-9À-￿]/.test(lowS[m.index - 1]);
        const cands = before ? this.index.get(m[0]) : null;
        if (cands) {
          const hit = cands.find((c) => lowS.startsWith(c.low, m.index) && !/[a-z0-9À-￿]/.test(lowS[m.index + c.low.length] || ' '));
          if (hit) { res += out.slice(i, m.index) + hit.rep; i = m.index + hit.low.length; word.lastIndex = i; this.counts.text = (this.counts.text || 0) + 1; continue; }
        }
      }
      out = res + out.slice(i);
    }
    for (const [re, rep] of TEXT_PATTERNS) out = out.replace(re, () => { this.counts.pattern = (this.counts.pattern || 0) + 1; return rep; });
    return out;
  }

  /** Masked deep copy of a tool result: personal-data fields first, then free text everywhere. */
  maskResult(value) {
    if (!this.on) return value;
    const byKey = (v, key, depth) => {
      if (depth > 40) return v;
      const kind = key === null ? null : piiKindOf(key, this.mode);
      if (Array.isArray(v)) return v.map((x) => (kind && (typeof x !== 'object' || x === null) ? this.maskValue(kind, x) : byKey(x, kind ? null : key, depth + 1)));
      if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = META_KEYS.has(k) ? x : byKey(x, k, depth + 1); return o; }
      // Counts and flags under a personal-data key (by_check.user: 3) are not identifiers; long numbers may be.
      if (kind && (typeof v === 'boolean' || (typeof v === 'number' && Math.abs(v) < 100000))) return v;
      return kind ? this.maskValue(kind, v) : v;
    };
    const keyed = byKey(value, null, 0);
    const text = (v, depth) => {
      if (depth > 40) return v;
      if (typeof v === 'string') return this.maskText(v);
      if (Array.isArray(v)) return v.map((x) => text(x, depth + 1));
      if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[this.maskText(k)] = text(x, depth + 1); return o; }
      return v;
    };
    return text(keyed, 0);
  }

  /**
   * Does a value the model passed back (a pseudonym or the raw value) name this raw value?
   * Used by tools that take a user, host or line as an argument.
   */
  same(raw, given, kind = 'user') {
    const r = String(raw ?? '').trim(), g = String(given ?? '').trim();
    if (!r || !g) return false;
    if (r.toLowerCase() === g.toLowerCase()) return true;
    const p = PREFIX[kind === 'any_ip' ? 'ip' : kind];
    return this.on && !!p && g.toUpperCase().startsWith(`${p}-`) && this.token(kind, r).toLowerCase() === g.toLowerCase();
  }

  /** Summary of what was masked in the last result (counts by kind, no values). */
  report() { return { mode: this.mode, masked: { ...this.counts } }; }
}
