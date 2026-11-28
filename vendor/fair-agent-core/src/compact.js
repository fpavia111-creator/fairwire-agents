// Keeps tool results small enough for a model's context window.
//
// A review of a 2,000-row export used to come back as about 1.5 MB of JSON, more than any
// model can hold. Here a result that is too long keeps every number and sentence but has its
// long lists cut to their first rows; the whole result goes to a file the person (or a script)
// can open. The agent's own result is unchanged: only what the MCP server and the command line
// print is shortened. Tests and scripts that call AgentRuntime.call still get everything.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { randomBytes } from 'node:crypto';

/** About 5,000 tokens. Override with --max-chars, <FAMILY>_MAX_RESULT_CHARS or FAIR_MAX_RESULT_CHARS. */
export const DEFAULT_MAX_RESULT_CHARS = 20000;
const KEEP_STEPS = [25, 10, 5, 3, 1];

export function maxResultChars(value, envName) {
  const raw = value ?? (envName && process.env[envName]) ?? process.env.FAIR_MAX_RESULT_CHARS;
  if (raw === undefined || raw === null || raw === '' || raw === true) return DEFAULT_MAX_RESULT_CHARS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) throw new Error('max result size must be a non-negative number of characters (0 = no limit)');
  return n;
}

function trimArrays(value, keep, path, trimmed) {
  if (Array.isArray(value)) {
    const out = value.slice(0, keep).map((v, i) => trimArrays(v, keep, `${path}[${i}]`, trimmed));
    if (value.length > keep) trimmed.push({ path: path || '(result)', total: value.length, shown: keep });
    return out;
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = trimArrays(v, keep, path ? `${path}.${k}` : k, trimmed);
    return out;
  }
  return value;
}

function scalarsOnly(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (v === null || typeof v !== 'object') out[k] = v;
  return out;
}

/**
 * Write the full result next to the agent's state (never when the state is encrypted, since
 * this file would not be). Returns a path relative to root, or null when nothing was written.
 */
export function saveFullResult(runtime, tool, obj) {
  if (!runtime || !runtime.stateDir || runtime.seal) return null;
  try {
    const dir = join(runtime.stateDir, 'results');
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = join(dir, `${String(tool).replace(/[^\w-]/g, '_')}-${stamp}-${randomBytes(3).toString('hex')}.json`);
    writeFileSync(file, JSON.stringify(obj, null, 2) + '\n');
    return relative(runtime.root, file).split('\\').join('/');
  } catch { return null; }
}

/**
 * Shorten a tool envelope ({status, decision, result, ...}) to at most maxChars of JSON.
 * Returns the envelope unchanged when it already fits or maxChars is 0.
 */
export function compactEnvelope(env, { maxChars = DEFAULT_MAX_RESULT_CHARS, save } = {}) {
  if (!maxChars || !env || typeof env !== 'object') return env;
  const full = JSON.stringify(env);
  if (full.length <= maxChars) return env;
  const file = typeof save === 'function' ? save(env) : null;
  const note = (trimmed, how) => ({
    full_size_chars: full.length,
    shown: how,
    ...(trimmed && trimmed.length ? { lists_cut: trimmed.slice(0, 20) } : {}),
    full_result_file: file,
    how_to_see_everything: file
      ? `Every row is in ${file}. Read only the rows you need from it (for example with a short script), or run the report tool to write the full report.`
      : 'Run the report tool to write the full report to a file, or call again from the command line with --full.',
  });
  for (const keep of KEEP_STEPS) {
    const trimmed = [];
    const out = { ...env, result: trimArrays(env.result, keep, '', trimmed), result_trimmed: null };
    out.result_trimmed = note(trimmed, `first ${keep} row(s) of each long list; every total and summary is unchanged`);
    if (JSON.stringify(out).length <= maxChars) return out;
  }
  return { ...env, result: scalarsOnly(env.result), result_trimmed: note(null, 'summary numbers only; every list was left out') };
}
