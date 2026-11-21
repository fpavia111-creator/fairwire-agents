// Encryption for the files an agent keeps about its own work: the audit log,
// the approvals record, the usage counters and the facts it has learned.
//
// Off unless a key is given. With a key, every line (or the whole of usage.json)
// is sealed with AES-256-GCM before it reaches the disk:
//
//     ~1.<nonce, base64url>.<ciphertext and tag, base64url>
//
// One line of the file is still one record, so files stay append-only and the
// audit chain is unchanged: the hash chain and signatures cover the record inside
// the seal, and verifying a log needs the key. The key actually used is derived
// from the one you give (HKDF-SHA-256) per family and per kind of file, and the
// kind is bound into each line, so a line cannot be moved from one file to another.
//
// A plain file written before the key was set stays readable; new lines are sealed.
// A sealed line with no key, or the wrong key, is an error and never an empty result.
//
// Where the key comes from, first match wins:
//   1. the runtime option `stateKey` (the gateway passes each tenant's key this way)
//   2. <FAMILY>_STATE_KEY, then FAIR_STATE_KEY          (64 hex characters or base64)
//   3. <FAMILY>_STATE_KEY_FILE, then FAIR_STATE_KEY_FILE (a file holding the same)
//
// Not covered: the working files an agent reads and the reports it writes for you.
// Those are yours to open in other programs; use disk encryption for them.
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import { appendFileSync, readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { P } from './family.js';

const MARK = '~1.';
export const STATE_KINDS = Object.freeze(['audit', 'approvals', 'usage', 'memory']);

export class StateKeyError extends Error { constructor(m) { super(m); this.name = 'StateKeyError'; this.code = 'STATE_KEY'; } }

/** Read a 32-byte key from a Buffer, 64 hex characters, or base64 / base64url. */
export function parseStateKey(value) {
  if (value == null || value === '') return null;
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) { const b = Buffer.from(value); if (b.length !== 32) throw new StateKeyError(`a state key is 32 bytes; this one is ${b.length}`); return b; }
  const s = String(value).trim();
  const b = /^[0-9a-fA-F]{64}$/.test(s) ? Buffer.from(s, 'hex') : /^[A-Za-z0-9+/_-]{43}=?$/.test(s) ? Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64') : null;
  if (!b || b.length !== 32) throw new StateKeyError('a state key is 32 random bytes, written as 64 hex characters or as base64');
  return b;
}

/** A new random key, as 64 hex characters. */
export const generateStateKey = () => randomBytes(32).toString('hex');

class Seal {
  #keys = new Map(); #master;
  constructor(master, scope) { this.#master = master; this.scope = scope; Object.freeze(this); }
  #key(kind) {
    let k = this.#keys.get(kind);
    if (!k) { k = Buffer.from(hkdfSync('sha256', this.#master, Buffer.from('fair-agent-core state v1'), Buffer.from(`${this.scope}|${kind}`), 32)); this.#keys.set(kind, k); }
    return k;
  }
  seal(kind, text) {
    const iv = randomBytes(12); const c = createCipheriv('aes-256-gcm', this.#key(kind), iv); c.setAAD(Buffer.from(kind));
    const body = Buffer.concat([c.update(String(text), 'utf8'), c.final(), c.getAuthTag()]);
    return `${MARK}${iv.toString('base64url')}.${body.toString('base64url')}`;
  }
  open(kind, line) {
    const m = /^~1\.([A-Za-z0-9_-]{16})\.([A-Za-z0-9_-]+)$/.exec(line);
    if (!m) throw new StateKeyError('this line is not a sealed state record');
    const iv = Buffer.from(m[1], 'base64url'); const body = Buffer.from(m[2], 'base64url');
    if (body.length < 16) throw new StateKeyError('this sealed state record is cut short');
    const d = createDecipheriv('aes-256-gcm', this.#key(kind), iv); d.setAAD(Buffer.from(kind)); d.setAuthTag(body.subarray(body.length - 16));
    try { return Buffer.concat([d.update(body.subarray(0, body.length - 16)), d.final()]).toString('utf8'); }
    catch { throw new StateKeyError(`a sealed ${kind} record does not open with this key (wrong key, a record moved from another file, or the file was changed)`); }
  }
}

/** A seal for one family from a key (Buffer, hex or base64). null when there is no key. */
export function stateSeal(key, family = P()) {
  const master = parseStateKey(key); if (!master) return null;
  return new Seal(master, family.id);
}

const envCache = new Map();
/** The seal the environment asks for, for the family in force. null when no key is set. */
export function envSeal(env = process.env, family = P()) {
  let from = null; let value = null;
  for (const name of [family.env('STATE_KEY'), 'FAIR_STATE_KEY']) if (env[name]) { from = name; value = env[name]; break; }
  if (!value) for (const name of [family.env('STATE_KEY_FILE'), 'FAIR_STATE_KEY_FILE']) if (env[name]) {
    from = name;
    try { value = readFileSync(env[name], 'utf8').trim(); } catch (e) { throw new StateKeyError(`${name} points at ${env[name]}, which cannot be read (${e.code || e.message})`); }
    break;
  }
  if (!value) return null;
  const id = `${family.id}|${value}`; let s = envCache.get(id);
  if (!s) { try { s = stateSeal(value, family); } catch (e) { throw new StateKeyError(`${from}: ${e.message}`); } envCache.set(id, s); }
  return s;
}

/** Resolve what a store was given: a Seal, a key, undefined (ask the environment) or false (never seal). */
export function resolveSeal(given, family = P()) {
  if (given === false) return null;
  if (given === undefined || given === null) return envSeal(process.env, family);
  return given instanceof Seal ? given : stateSeal(given, family);
}

export const isSealed = (line) => typeof line === 'string' && line.startsWith(MARK);

const needKey = (kind) => new StateKeyError(`this ${kind} file is encrypted and no key is set. Set ${P().env('STATE_KEY')} (or FAIR_STATE_KEY) to the key it was written with.`);

/** One stored line to its text. Plain lines pass through, so a file may hold both. */
export function openLine(kind, line, seal) {
  if (!isSealed(line)) return line;
  if (!seal) throw needKey(kind);
  return seal.open(kind, line);
}
/** One record's text to the line that is stored. */
export const sealLine = (kind, text, seal) => (seal ? seal.seal(kind, text) : text);

/** Every non-empty line of a state file, opened. */
export function readStateLines(kind, file, seal) {
  return readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l.trim()).map((l) => openLine(kind, l.trim().startsWith(MARK) ? l.trim() : l, seal));
}
/** Append one record to a state file. */
export function appendStateLine(kind, file, text, seal) {
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, sealLine(kind, text, seal) + '\n', seal ? { mode: 0o600 } : undefined);
}
/** Read a whole-file JSON state file (usage.json). */
export function readStateJson(kind, file, seal) {
  const raw = readFileSync(file, 'utf8'); const t = raw.trim();
  return JSON.parse(isSealed(t) ? openLine(kind, t, seal) : raw);
}
/** Replace a whole-file JSON state file in one step. */
export function writeStateJson(kind, file, value, seal) {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  writeFileSync(tmp, seal ? seal.seal(kind, JSON.stringify(value)) + '\n' : JSON.stringify(value, null, 2), seal ? { mode: 0o600 } : undefined);
  renameSync(tmp, file);
}

/**
 * Seal a plain state file in place, or open a sealed one (for moving a folder in
 * or out of encryption, or handing a log to an auditor). Returns the line count.
 */
export function convertStateFile(kind, file, { seal, to }) {
  if (!existsSync(file)) return 0;
  if (kind === 'usage') { const v = readStateJson(kind, file, seal); writeStateJson(kind, file, v, to === 'sealed' ? seal : null); return 1; }
  const lines = readStateLines(kind, file, seal);
  const tmp = file + '.tmp';
  writeFileSync(tmp, lines.map((l) => (to === 'sealed' ? sealLine(kind, l, seal) : l) + '\n').join(''), { mode: 0o600 });
  renameSync(tmp, file);
  return lines.length;
}
