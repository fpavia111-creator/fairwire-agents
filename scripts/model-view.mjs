// What reaches the AI model (Kurt's final review question 2), per agent.
//
// For every input field an agent reads: masked (stable pseudonym before the result leaves the runtime),
// masked only in strict mode (host names, internal addresses), or sent in clear (dates, counts, codes,
// amounts, settings). Free-text fields are listed separately: e-mail addresses and phone numbers in them
// are replaced by pattern, and every masked value seen in the files is also replaced inside text, but a
// name typed into free text that appears nowhere else can get through.
//
// Then a canary: each agent's check-totals case runs in the default "mask" mode and every value of a
// masked field in its input files is searched for in the JSON the model would receive. Any hit is a leak.
//   node scripts/model-view.mjs [--write]     prints the table; --write saves evidence/model-view.json
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { AgentRuntime, piiKindOf, parseCsv } from '../packages/fairwire-core/src/index.js';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..'); const PK = join(repo, 'packages');
const write = process.argv.includes('--write');
// Fields whose values are sentences or labels a person typed (not codes, ids or numbers).
const FREE_TEXT = /(^|_)(description|note|title|comment|subject|prompt|message|summary|purpose|query|plan|evidence|outcome|failure_reason|backout_plan|dlp_rule)$/i;
// Personal values an agent masks by registering them at run time rather than by field name.
const REGISTERED = { 'fairwire-directory-hygiene': { field: 'name (user objects)', pick: (row) => (/^user$/i.test(row.type || '') ? row.name : null) } };
// Free text that must never reach the model at all (only a hash of it is returned).
const NEVER = { 'fairwire-ai-usage': ['prompt'] };
const KEY = Buffer.alloc(32, 9);
const out = []; let leaks = 0;
for (const n of readdirSync(PK).filter((x) => /^fairwire-(?!core$)/.test(x)).sort()) {
  const P = join(PK, n);
  const { manifest } = await import(pathToFileURL(join(P, 'src', 'index.js')).href);
  const masked = new Set(), strictOnly = new Set(), clear = new Set(), free = new Set(); const fieldKind = {};
  for (const src of Object.values(manifest.sources || {})) for (const [f, def] of Object.entries(src.fields || {})) {
    const kind = def.pii || piiKindOf(f, 'mask'); const strict = piiKindOf(f, 'strict');
    if (kind) { masked.add(f); fieldKind[f] = kind; } else if (strict) strictOnly.add(f); else clear.add(f);
    if (!kind && FREE_TEXT.test(f)) free.add(f);
  }
  // canary
  const c = JSON.parse(readFileSync(join(P, 'evals', 'cases.json'), 'utf8')).cases.find((x) => x.id === 'check-totals');
  const prefix = manifest.tools[0].name.replace(/_check$/, '');
  const rt = new AgentRuntime(manifest, { root: P, audit: false, memory: false, piiKey: KEY });
  const r = await rt.call(`${prefix}_check`, { ...c.args, limit: 5000 });
  const text = JSON.stringify(r.result);
  const secrets = new Set();
  for (const rel of Object.values(c.args)) {
    if (typeof rel !== 'string' || !/\.csv$/i.test(rel) || !existsSync(join(P, rel))) continue;
    const rows = parseCsv(readFileSync(join(P, rel), 'utf8'));
    for (const row of rows) {
      for (const [col, v] of Object.entries(row)) {
        const norm = col.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        if ((masked.has(norm) || piiKindOf(col, 'mask') || (NEVER[n] || []).includes(norm)) && String(v).trim().length >= 4) secrets.add(String(v).trim());
      }
      const reg = REGISTERED[n] && REGISTERED[n].pick(row); if (reg && String(reg).trim().length >= 4) secrets.add(String(reg).trim());
    }
  }
  if (REGISTERED[n]) masked.add(REGISTERED[n].field);
  for (const f of NEVER[n] || []) { free.delete(f); masked.add(`${f} (never returned; a hash only)`); }
  const leaked = [...secrets].filter((s) => text.includes(s));
  leaks += leaked.length;
  const res = { agent: n, masked: [...masked].sort(), masked_in_strict_only: [...strictOnly].sort(), clear: [...clear].sort(), free_text: [...free].sort(), canary_values: secrets.size, canary_leaks: leaked, pseudonyms_in_result: (text.match(/\b(PERSON|USR|TEL|DEV|IP|HOST)-[0-9a-f]{8}\b/g) || []).length };
  out.push(res);
  console.log(`${leaked.length ? 'LEAK' : 'ok  '} ${n.padEnd(30)} masked: ${res.masked.join(', ') || '-'} | strict only: ${res.masked_in_strict_only.join(', ') || '-'} | free text: ${res.free_text.join(', ') || '-'} | canary ${secrets.size} value(s), ${leaked.length} leak(s)`);
  for (const l of leaked) console.log(`       leaked: ${l}`);
}
const totals = { agents: out.length, agents_with_personal_fields: out.filter((r) => r.masked.length).length, canary_values: out.reduce((t, r) => t + r.canary_values, 0), canary_leaks: leaks };
console.log(`\n${totals.agents} agents, ${totals.agents_with_personal_fields} read personal fields; canary: ${totals.canary_values} personal value(s) from the fixtures, ${leaks} reached the model's view.`);
if (write) writeFileSync(join(repo, 'evidence', 'model-view.json'), JSON.stringify({ run: new Date().toISOString().slice(0, 10), mode: 'mask (default)', totals, agents: out }, null, 2) + '\n');
process.exitCode = leaks ? 1 : 0;
