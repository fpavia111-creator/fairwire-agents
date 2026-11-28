#!/usr/bin/env node
// Writes an Agent Skill for every agent: packages/<agent>/skills/<agent>/SKILL.md, from the
// agent's own manifest (`<agent> skill`). A Claude Code plugin made from the package then loads
// one line per agent until a task needs it, and runs the agent from the command line with the
// same allow / ask / block policy, approvals and audit log as the MCP server. The MCP server is
// still there for hosts without a shell (`<agent> mcp`, server.json); plugins no longer start it.
//
// Also: every agent package has .claude-plugin/plugin.json (written when missing), and when the
// repository has no plugin marketplace yet, .claude-plugin/marketplace.json lists every agent.
// Usage: node scripts/skill-files.mjs [--check]
import { fileURLToPath } from 'node:url';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, basename } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const check = process.argv.includes('--check');
const repo = basename(root).replace(/-agents$/, '');
const brand = repo.charAt(0).toUpperCase() + repo.slice(1).replace(/\d+$/, '');
const agents = readdirSync(join(root, 'packages')).filter((n) => existsSync(join(root, 'packages', n, 'bin', `${n}.js`))).sort();
const want = new Map();
const gone = [];
const plugins = [];
const hadMarketplace = existsSync(join(root, '.claude-plugin', 'marketplace.json'));

for (const n of agents) {
  const dir = join(root, 'packages', n);
  const p = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const title = (String(p.description).match(/^([^:]{3,60}):\s/) || [])[1];
  const r = spawnSync(process.execPath, [join(dir, 'bin', `${n}.js`), 'skill', ...(title ? ['--title', title] : [])], { encoding: 'utf8', cwd: dir });
  if (r.status !== 0) { console.error(`${n}: "skill" failed\n${r.stderr}`); process.exit(1); }
  want.set(join('packages', n, 'skills', n, 'SKILL.md'), r.stdout.replace(/\n+$/, '\n'));
  const desc = String(p.description).replace(/^[^:]{3,60}:\s*/, '');
  const pj = join('packages', n, '.claude-plugin', 'plugin.json');
  if (!existsSync(join(root, pj))) want.set(pj, JSON.stringify({ name: n, version: p.version, description: desc.charAt(0).toUpperCase() + desc.slice(1), author: { name: p.author }, license: p.license, homepage: p.homepage, keywords: p.keywords }, null, 2) + '\n');
  if (existsSync(join(dir, '.mcp.json'))) gone.push(join('packages', n, '.mcp.json'));
  plugins.push({ name: n, source: `./packages/${n}`, description: desc.charAt(0).toUpperCase() + desc.slice(1), version: p.version, category: repo, keywords: [...new Set((p.keywords || []).filter((k) => !['mcp', 'mcp-server', repo].includes(k)))] });
}
if (!hadMarketplace) want.set(join('.claude-plugin', 'marketplace.json'), JSON.stringify({ name: `${repo}-agents`, owner: { name: 'Fair Agents' }, metadata: { description: `${brand} agents from Fair Agents. Each runs on your computer from files you export, as an Agent Skill driven from the command line, and waits for a named person before anything that moves money, sends a message or changes a live system.` }, plugins }, null, 2) + '\n');

let stale = 0;
for (const [rel, text] of want) {
  const f = join(root, rel);
  if (check) { if (!existsSync(f) || readFileSync(f, 'utf8').replace(/\r\n/g, '\n') !== text) { console.error(`stale: ${rel}`); stale++; } continue; }
  mkdirSync(join(f, '..'), { recursive: true }); writeFileSync(f, text);
}
for (const rel of gone) { if (check) { console.error(`remove: ${rel} (plugins use the skill, not the MCP server)`); stale++; } else rmSync(join(root, rel)); }
if (check && stale) { console.error(`${stale} skill file(s) out of date; run node scripts/skill-files.mjs`); process.exit(1); }
console.log(`${check ? 'checked' : 'wrote'} skills for ${agents.length} agents${gone.length && !check ? `; removed ${gone.length} .mcp.json` : ''}`);
