#!/usr/bin/env node
// Writes the hand-written part of each agent README from the agent itself: the one-line
// description, what it checks (CHECKS in src/logic.js), its settings (SETTINGS_SCHEMA),
// what it never does (refused tools and one-click actions) and the limits its report
// prints. readme-sections.mjs then adds the generated part (demo, tools, columns, install).
//
//   node scripts/agent-readme.mjs [agent ...]          write
//   node scripts/agent-readme.mjs --check              exit 1 when a README is out of date
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdtempSync, cpSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { AgentRuntime, ONE_CLICK_CATEGORIES } from '../packages/fairwire-core/src/index.js';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..'); const PK = join(repo, 'packages');
const check = process.argv.includes('--check');
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const START = '<!-- generated:start -->', END = '<!-- generated:end -->';
let stale = 0;
for (const n of readdirSync(PK).filter((x) => /^fairwire-(?!core$)/.test(x) && existsSync(join(PK, x, 'src', 'logic.js')) && (!only.length || only.includes(x))).sort()) {
  const P = join(PK, n);
  const mod = await import(pathToFileURL(join(P, 'src', 'index.js')).href);
  const m = mod.manifest; const pkg = JSON.parse(readFileSync(join(P, 'package.json'), 'utf8'));
  const prefix = m.tools[0].name.replace(/_check$/, '');
  const title = pkg.description.split(':')[0];
  const base = JSON.parse(readFileSync(join(P, 'evals', 'cases.json'), 'utf8')).cases.find((c) => c.id === 'check-totals');
  const root = mkdtempSync(join(tmpdir(), `${n}-readme-`)); cpSync(join(P, 'fixtures'), join(root, 'fixtures'), { recursive: true });
  const r = await new AgentRuntime(m, { root, audit: false }).call(`${prefix}_write_report`, base.args);
  const html = r.status === 'executed' ? readFileSync(r.result.files.find((f) => f.endsWith('.html')), 'utf8') : '';
  rmSync(root, { recursive: true, force: true });
  const limits = [...((/<h2>Limits<\/h2><ul>(.*?)<\/ul>/s.exec(html) || [])[1] || '').matchAll(/<li>(.*?)<\/li>/g)].map((x) => x[1].replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
  const refused = m.tools.filter((t) => (m.policy.rules.find((x) => x.tool === t.name) || {}).decision === 'block');
  const oneClick = m.tools.filter((t) => ONE_CLICK_CATEGORIES.includes(t.category));
  const props = (mod.SETTINGS_SCHEMA && mod.SETTINGS_SCHEMA.properties) || {};
  const L = [
    `# ${title}`, '',
    pkg.description.slice(title.length + 2), '',
    'Part of **Fairwire**, the IT and network family of [Mythos Machines](https://fair-agents.com) agents. The software is free (MIT); you pay a fixed price for the setup on your files. It reads files your IT team exports, on your own computer, and drafts notes. Every change to a live device, firewall, DNS zone, directory or cloud account stays one named person\'s click.', '',
    '## What it checks', '', '| Finding | What it means |', '|---|---|',
    ...Object.entries(mod.CHECKS || {}).map(([code, text]) => `| \`${code}\` | ${text.replace(/\|/g, '/')} |`), '',
    'Findings come back worst first (high, medium, low). A finding a named person has reviewed can be accepted as known, with a reason and a date to look again; it then moves to "Accepted as known" instead of counting as open.', '',
    ...(Object.keys(props).length ? ['## Settings', '', `Pass a settings file with \`settings\`. Every setting is optional; a misspelt setting is refused by name.`, '', '| Setting | What it does |', '|---|---|', ...Object.entries(props).map(([k, v]) => `| \`${k}\` | ${String(v.description || '').replace(/\|/g, '/')} |`), ''] : []),
    '## What it never does', '',
    ...refused.map((t) => `- \`${t.name}\` is refused: ${t.description.replace(/^Listed so agents can see it is refused\.\s*/, '')}`),
    ...oneClick.map((t) => `- \`${t.name}\` waits for one named person's click, even in Auto (\`${t.category}\`).`), '',
    '## Limits', '', ...limits.map((l) => `- ${l}`), '- Export layouts were written from knowledge of common exports and have not been tested on live customer accounts. Run `inspect` on a new export and name columns in `fairwire-sources.json` when they differ.', '',
    '## Licence', '', 'MIT. Fictional data only in `fixtures/`.', '',
  ];
  const f = join(P, 'README.md');
  const old = existsSync(f) ? readFileSync(f, 'utf8').replace(/\r\n/g, '\n') : ''; // a Windows checkout may hold CRLF
  const gen = old.includes(START) ? old.slice(old.indexOf(START), old.indexOf(END) + END.length) : '';
  let next = L.join('\n');
  if (gen) next = next.replace('\n## Limits', `\n${gen}\n\n## Limits`);
  if (next === old) continue;
  if (check) { console.log(`${n}: README hand part out of date`); stale++; continue; }
  writeFileSync(f, next); console.log(`${n}: README written`);
}
process.exit(stale ? 1 : 0);
