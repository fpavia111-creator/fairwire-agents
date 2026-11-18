#!/usr/bin/env node
// Runs every agent's private eval cases on its fictional fixtures and prints one line per agent.
//   node scripts/run-all-evals.mjs [agent ...]      exit 1 when any case fails
import { readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runEvalFile } from '../packages/fairwire-core/src/index.js';

const PK = join(dirname(fileURLToPath(import.meta.url)), '..', 'packages');
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const agents = readdirSync(PK).filter((n) => /-of-/.test(n) && existsSync(join(PK, n, 'evals', 'cases.json')) && (!only.length || only.includes(n))).sort();
let cases = 0, failed = 0; const rows = [];
for (const n of agents) {
  const { manifest } = await import(pathToFileURL(join(PK, n, 'src', 'index.js')).href);
  const r = await runEvalFile(manifest, join(PK, n, 'evals', 'cases.json'));
  const bad = r.results.filter((c) => !c.pass);
  cases += r.total; failed += bad.length; rows.push({ agent: n, cases: r.total, passed: r.total - bad.length });
  console.log(`${bad.length ? 'FAIL' : 'ok  '} ${n.padEnd(28)} ${r.total - bad.length}/${r.total}`);
  for (const c of bad) console.log(`       ${c.id}: ${c.fails.join('; ')}`);
}
console.log(`\n${agents.length} agent(s), ${cases} case(s), ${failed} failed.`);
if (process.argv.includes('--json')) writeFileSync('eval-results.json', JSON.stringify({ agents: rows, cases, failed }, null, 2));
process.exit(failed ? 1 : 0);
