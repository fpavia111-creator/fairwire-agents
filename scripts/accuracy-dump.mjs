// Dev aid for the accuracy review: each agent's planted-problem notes (fixtures/README.md) next to
// what its check finds on the check-totals case, as code / key / message. Personal-data masking is
// off here (fictional fixtures) so keys can be matched to rows.
//   node scripts/accuracy-dump.mjs [agent ...] > out.txt
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { AgentRuntime } from '../packages/fairwire-core/src/index.js';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..'); const PK = join(repo, 'packages');
const only = process.argv.slice(2);
for (const n of readdirSync(PK).filter((x) => /^fairwire-(?!core$)/.test(x) && (!only.length || only.includes(x))).sort()) {
  const P = join(PK, n);
  const { manifest } = await import(pathToFileURL(join(P, 'src', 'index.js')).href);
  const c = JSON.parse(readFileSync(join(P, 'evals', 'cases.json'), 'utf8')).cases.find((x) => x.id === 'check-totals');
  const prefix = manifest.tools[0].name.replace(/_check$/, '');
  const rt = new AgentRuntime(manifest, { root: P, audit: false, pii: 'off', memory: false });
  const r = await rt.call(`${prefix}_check`, { ...c.args, limit: 5000 });
  console.log(`\n===== ${n} (${prefix}_check ${JSON.stringify(c.args)})`);
  const readme = existsSync(join(P, 'fixtures', 'README.md')) ? readFileSync(join(P, 'fixtures', 'README.md'), 'utf8') : '';
  console.log(readme.split('\n').filter((l) => /^- /.test(l)).join('\n'));
  if (r.status !== 'executed') { console.log('  ERROR', r.reason); continue; }
  console.log(`-- ${r.result.items.length} finding(s)${r.result.more ? ' (more: ' + r.result.more + ')' : ''}`);
  for (const i of r.result.items) console.log(`  ${i.code} | ${i.key} | ${String(i.message).slice(0, 150)}`);
}
