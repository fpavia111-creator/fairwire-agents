#!/usr/bin/env node
// Development aid: run an agent's check on JSON arguments and print the summary, the
// totals and every finding (raw, masking off), so fixtures can be checked by eye.
//   node scripts/probe.mjs <agent> '{"flows":"fixtures/flows.csv"}'
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { AgentRuntime } from '../packages/fairwire-core/src/index.js';

const PK = join(dirname(fileURLToPath(import.meta.url)), '..', 'packages');
const [n, json = '{}'] = process.argv.slice(2);
const { manifest } = await import(pathToFileURL(join(PK, n, 'src', 'index.js')).href);
const prefix = manifest.tools[0].name.split('_')[0];
const r = await new AgentRuntime(manifest, { root: join(PK, n), audit: false, pii: 'off' }).call(`${prefix}_check`, { ...JSON.parse(json), limit: 5000 });
if (r.status !== 'executed') { console.log(r.status, r.reason); process.exit(1); }
const { items, ...rest } = r.result;
console.log(JSON.stringify(rest, null, 0).slice(0, 1500));
for (const i of items) console.log(`${i.severity.padEnd(7)} ${i.code.padEnd(28)} ${String(i.key).padEnd(28)} ${i.message}`);
