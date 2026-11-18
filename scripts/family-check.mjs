#!/usr/bin/env node
// Family-wide checks every Fairwire agent must pass, beyond its own tests:
//   - every agent in scripts/agents.json has a package, and every package is listed
//   - tool names and prefixes are unique across the family (refused tools may repeat)
//   - check, report, draft, one-click request and memory tools exist
//   - at least one refused live action, and the default block rule last
//   - at least 15 eval cases including "check-totals", at least 20 tests,
//     a fixtures README, an agent README with a Limits section, a CHANGELOG and LICENSE
//   - the plugin files name the package's version
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..'); const PK = join(repo, 'packages');
const list = JSON.parse(readFileSync(join(repo, 'scripts/agents.json'), 'utf8')).map((x) => x[0]);
const pkgs = readdirSync(PK).filter((n) => /^fairwire-(?!core$)/.test(n));
const problems = []; const bad = (n, m) => problems.push(`${n}: ${m}`);
for (const n of list) if (!pkgs.includes(n)) bad(n, 'listed in agents.json but has no package');
for (const n of pkgs) if (!list.includes(n)) bad(n, 'package not listed in agents.json');
const toolOwner = new Map(); const prefixes = new Map(); let tools = 0, cases = 0, tests = 0;
for (const n of list.filter((x) => pkgs.includes(x))) {
  const P = join(PK, n);
  const { manifest: m } = await import(pathToFileURL(join(P, 'src', 'index.js')).href);
  const prefix = m.tools[0].name.replace(/_check$/, '');
  if (prefixes.has(prefix)) bad(n, `prefix ${prefix} also used by ${prefixes.get(prefix)}`); prefixes.set(prefix, n);
  const blocked = (t) => (m.policy.rules.find((r) => r.tool === t.name) || {}).decision === 'block';
  for (const t of m.tools) { tools++; if (blocked(t)) continue; if (toolOwner.has(t.name)) bad(n, `tool ${t.name} also defined by ${toolOwner.get(t.name)}`); else toolOwner.set(t.name, n); }
  for (const t of [`${prefix}_check`, `${prefix}_write_report`, `${prefix}_recall`, `${prefix}_learn`, `${prefix}_accept_learning`]) if (!m.tools.some((x) => x.name === t)) bad(n, `no ${t}`);
  if (!m.tools.some((t) => /_draft_/.test(t.name)) || !m.tools.some((t) => /_request_/.test(t.name))) bad(n, 'no draft and one-click request pair');
  if (!m.tools.some((t) => blocked(t))) bad(n, 'no refused live action');
  if (m.policy.rules.at(-1).tool !== '*' || m.policy.rules.at(-1).decision !== 'block') bad(n, 'last rule is not the default block');
  const c = JSON.parse(readFileSync(join(P, 'evals/cases.json'), 'utf8')).cases; cases += c.length;
  if (c.length < 15) bad(n, `${c.length} eval cases (< 15)`);
  if (!c.some((x) => x.id === 'check-totals')) bad(n, 'no check-totals eval case');
  const contract = 11; // agentContract registers eleven tests for an agent with a draft, a report and table inputs
  const own = readdirSync(join(P, 'test')).filter((f) => f.endsWith('.test.js') && f !== 'contract.test.js').reduce((t, f) => t + (readFileSync(join(P, 'test', f), 'utf8').match(/^test\(/gm) || []).length, 0);
  tests += own + contract; if (own + contract < 20) bad(n, `${own} own tests + ${contract} contract tests < 20`);
  for (const f of ['fixtures/README.md', 'README.md', 'CHANGELOG.md', 'LICENSE']) if (!existsSync(join(P, f))) bad(n, `no ${f}`);
  if (existsSync(join(P, 'README.md')) && !/\n## Limits/.test(readFileSync(join(P, 'README.md'), 'utf8'))) bad(n, 'README has no Limits section');
  const pj = JSON.parse(readFileSync(join(P, 'package.json'), 'utf8'));
  // Naming (BUILD-BRIEF, 18 Nov 2026): fairwire-<1 to 4 job words>, bin = package name, tool prefix = the job words.
  if (!/^fairwire(-[a-z0-9]+){1,4}$/.test(n) || pj.name !== n) bad(n, 'name is not fairwire-<what it does> (1 to 4 words) or differs from the folder');
  if (!pj.bin || Object.keys(pj.bin).join() !== n) bad(n, 'bin name is not the package name');
  if (pj.mcpName && pj.mcpName !== `io.github.fpavia111-creator/${n}`) bad(n, `mcpName ${pj.mcpName} does not match the package`);
  if (!/^[a-z][a-z0-9]*(_[a-z0-9]+){0,2}$/.test(prefix)) bad(n, `tool prefix ${prefix} is not short snake_case job words`);
  const plugin = join(P, '.claude-plugin', 'plugin.json');
  if (existsSync(plugin) && JSON.parse(readFileSync(plugin, 'utf8')).version !== pj.version) bad(n, 'plugin.json version differs from package.json');
}
console.log(`${list.length} agents, ${tools} tools (${toolOwner.size} distinct that run), ${prefixes.size} prefixes, ${cases} eval cases, about ${tests} tests.`);
for (const p of problems) console.log(`  ${p}`);
console.log(problems.length ? `${problems.length} problem(s).` : 'All family checks pass.');
process.exit(problems.length ? 1 : 0);
