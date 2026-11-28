#!/usr/bin/env node
// Writes sample-reports/: each listed agent's report (CSV and HTML, English) on its
// fictional fixtures, from its eval case "check-totals", plus an index page.
//   node scripts/sample-reports.mjs [agent ...]
import { readFileSync, mkdirSync, mkdtempSync, cpSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { AgentRuntime, htmlPage, escapeHtml } from '../packages/fairwire-core/src/index.js';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..'); const PK = join(repo, 'packages');
const DEFAULT = ['fairwire-firewall-rules', 'fairwire-sign-in-logs', 'fairwire-backup-jobs', 'fairwire-cloud-costs', 'fairwire-network-traffic', 'fairwire-ticket-sla', 'fairwire-patch-status', 'fairwire-dns-records'];
const agents = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT;
const out = join(repo, 'sample-reports'); mkdirSync(out, { recursive: true });
const links = [];
for (const n of agents) {
  const { manifest } = await import(pathToFileURL(join(PK, n, 'src', 'index.js')).href);
  const base = JSON.parse(readFileSync(join(PK, n, 'evals', 'cases.json'), 'utf8')).cases.find((c) => c.id === 'check-totals');
  const root = mkdtempSync(join(tmpdir(), `${n}-sample-`)); cpSync(join(PK, n, 'fixtures'), join(root, 'fixtures'), { recursive: true });
  const prefix = manifest.tools[0].name.replace(/_check$/, '');
  const r = await new AgentRuntime(manifest, { root, audit: false }).call(`${prefix}_write_report`, base.args);
  if (r.status !== 'executed') { console.error(`${n}: ${r.reason}`); process.exitCode = 1; continue; }
  for (const f of r.result.files) {
    const name = basename(f); // report bases are the job names (firewall-rules.html)
    copyFileSync(f, join(out, name));
    if (name.endsWith('.html')) links.push({ n, name, summary: r.result.summary });
  }
  rmSync(root, { recursive: true, force: true });
  console.log(`${n}: ${r.result.summary}`);
}
const body = `<h1>Fairwire sample reports</h1><p class="mut">Written by the agents on fictional data. Nothing was sent or changed.</p><ul>${links.map((l) => `<li><a href="${escapeHtml(l.name)}">${escapeHtml(l.n)}</a>: ${escapeHtml(l.summary)}</li>`).join('')}</ul>`;
writeFileSync(join(out, 'index.html'), htmlPage({ title: 'Fairwire sample reports', bodyHtml: body, footer: 'Fictional data. Fair Agents.', lang: 'en' }));
