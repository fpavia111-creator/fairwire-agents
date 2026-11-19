// Accuracy on fictional data, per agent and for the family (Kurt's final review question 1).
//
//   planted   the agent's check-totals case: every expected finding (code and key, written from the planted
//             problems in fixtures/README.md and checked line by line) must be found, and nothing else.
//   clean     the same fixtures with the planted rows removed (evidence/accuracy-cases.json "drop"): no finding expected.
//   mutation  the clean set with one field changed in one row: the named finding is expected.
//
// Personal-data masking is off here (fictional fixtures) so keys can be compared as written.
//   node scripts/accuracy.mjs [agent ...]           print the table; exit 1 on any miss, extra or false positive
//   node scripts/accuracy.mjs --write               also write evidence/accuracy-results.json (committed, used by the review)
import { readFileSync, writeFileSync, readdirSync, mkdirSync, cpSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { AgentRuntime, parseCsv, toCsv } from '../packages/fairwire-core/src/index.js';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..'); const PK = join(repo, 'packages');
const argv = process.argv.slice(2); const write = argv.includes('--write'); const only = argv.filter((a) => !a.startsWith('--'));
const spec = JSON.parse(readFileSync(join(repo, 'evidence', 'accuracy-cases.json'), 'utf8'));
const low = (v) => String(v ?? '').trim().toLowerCase();
/** A selector is [column, value] or { column: value, ... } (all must match); "/regex/" values match as a regular expression. */
const matches = (row, sel) => {
  const pairs = Array.isArray(sel) ? [sel] : Object.entries(sel);
  return pairs.every(([col, want]) => {
    if (!(col in row)) return false;
    const v = String(row[col] ?? '');
    return typeof want === 'string' && want.startsWith('/') && want.endsWith('/') ? new RegExp(want.slice(1, -1), 'i').test(v) : low(v) === low(want);
  });
};

async function check(manifest, root, args) {
  const prefix = manifest.tools[0].name.replace(/_check$/, '');
  const rt = new AgentRuntime(manifest, { root, audit: false, pii: 'off', memory: false });
  const r = await rt.call(`${prefix}_check`, { ...args, limit: 5000 });
  if (r.status !== 'executed') throw new Error(`${prefix}_check: ${r.status} ${r.reason}`);
  return r.result.items.map((i) => `${i.code}|${i.key}`);
}

/** Copy the package fixtures to a temp root; apply drops, then edits, to every CSV the case reads. */
function prepare(P, args, { drop = [], edits = [] }) {
  const root = mkdtempSync(join(tmpdir(), 'fw-acc-')); cpSync(join(P, 'fixtures'), join(root, 'fixtures'), { recursive: true });
  let rows = 0; const edited = edits.map(() => 0);
  for (const [arg, rel] of Object.entries(args)) {
    if (typeof rel !== 'string' || !/\.csv$/i.test(rel)) continue;
    const f = join(root, rel); if (!existsSync(f)) continue;
    const text = readFileSync(f, 'utf8'); const cols = text.split(/\r?\n/)[0].replace(/^﻿/, '').split(',');
    let recs = parseCsv(text).filter((r) => !drop.some((d) => matches(r, d)));
    edits.forEach((e, k) => {
      if (e.file && e.file !== arg) return;
      for (const r of recs) { if (!matches(r, e.where)) continue; Object.assign(r, e.set); edited[k]++; if (!e.all) break; }
    });
    rows += recs.length;
    writeFileSync(f, toCsv(recs, cols, { raw: true }));
  }
  return { root, rows, edited };
}

const out = []; let problems = 0;
for (const n of readdirSync(PK).filter((x) => /^fairwire-(?!core$)/.test(x) && (!only.length || only.includes(x))).sort()) {
  const s = spec.agents[n]; const P = join(PK, n);
  if (!s) { console.log(`${n}: no accuracy cases`); problems++; continue; }
  const { manifest } = await import(pathToFileURL(join(P, 'src', 'index.js')).href);
  const args = JSON.parse(readFileSync(join(P, 'evals', 'cases.json'), 'utf8')).cases.find((c) => c.id === (s.case || 'check-totals')).args;
  const res = { agent: n };
  // planted set
  const actual = await check(manifest, P, args);
  res.planted_total = s.expected.length;
  res.missed = s.expected.filter((e) => !actual.includes(e));
  res.unexpected = actual.filter((a) => !s.expected.includes(a));
  res.planted_found = res.planted_total - res.missed.length;
  // clean set
  const c = prepare(P, args, { drop: s.drop || [], edits: s.repair || [] });
  res.clean_rows = c.rows; res.clean_findings = await check(manifest, c.root, args); rmSync(c.root, { recursive: true, force: true });
  // mutations on the clean set
  res.mutations = [];
  for (const m of s.mutations || []) {
    const p = prepare(P, args, { drop: s.drop || [], edits: [...(s.repair || []), { file: m.file, where: m.where, set: m.set, all: m.all }] });
    const applied = p.edited.at(-1) > 0;
    const found = applied ? await check(manifest, p.root, args) : [];
    rmSync(p.root, { recursive: true, force: true });
    const caught = found.some((f) => f.split('|')[0] === m.expect);
    res.mutations.push({ id: m.id, expect: m.expect, applied, caught, other: found.filter((f) => f.split('|')[0] !== m.expect) });
  }
  res.mutations_caught = res.mutations.filter((m) => m.caught).length;
  const bad = res.missed.length + res.unexpected.length + res.clean_findings.length + res.mutations.filter((m) => !m.caught || !m.applied).length;
  problems += bad;
  out.push(res);
  console.log(`${bad ? 'FAIL' : 'ok  '} ${n.padEnd(30)} planted ${res.planted_found}/${res.planted_total}${res.unexpected.length ? `, ${res.unexpected.length} unexpected` : ''}; clean ${res.clean_rows} rows, ${res.clean_findings.length} finding(s); mutations ${res.mutations_caught}/${res.mutations.length}`);
  for (const x of res.missed) console.log(`       missed      ${x}`);
  for (const x of res.unexpected) console.log(`       unexpected  ${x}`);
  for (const x of res.clean_findings) console.log(`       clean FP    ${x}`);
  for (const m of res.mutations) if (!m.applied || !m.caught) console.log(`       mutation ${m.id}: ${m.applied ? 'not caught' : 'row not found'} (expected ${m.expect}; got ${m.other.join(', ') || 'nothing'})`);
}
const sum = (k) => out.reduce((t, r) => t + (typeof r[k] === 'number' ? r[k] : r[k].length), 0);
const totals = { agents: out.length, planted_found: sum('planted_found'), planted_total: sum('planted_total'), unexpected: sum('unexpected'), clean_rows: sum('clean_rows'), clean_false_positives: sum('clean_findings'), mutation_cases: sum('mutations'), mutation_caught: sum('mutations_caught') };
console.log(`\n${totals.agents} agent(s): planted ${totals.planted_found}/${totals.planted_total} found, ${totals.unexpected} unexpected; clean ${totals.clean_rows} rows, ${totals.clean_false_positives} false positive(s); mutations ${totals.mutation_caught}/${totals.mutation_cases} caught.`);
if (write) {
  mkdirSync(join(repo, 'evidence'), { recursive: true });
  writeFileSync(join(repo, 'evidence', 'accuracy-results.json'), JSON.stringify({ run: new Date().toISOString().slice(0, 10), node: process.version, totals, agents: out }, null, 2) + '\n');
}
process.exitCode = problems ? 1 : 0;
