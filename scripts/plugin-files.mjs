import { fileURLToPath } from 'node:url';
// Writes the Claude Code plugin marketplace (.claude-plugin/marketplace.json) and, in every
// agent package, .claude-plugin/plugin.json plus .mcp.json. Each plugin starts its agent with
// npx at the pinned version, so it works once that version is on npm.
// Usage: node scripts/plugin-files.mjs [--check]
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const check = process.argv.includes('--check');
const pkgs = readdirSync(join(root, 'packages')).filter((n) => n !== 'fairwire-core' && existsSync(join(root, 'packages', n, 'package.json'))).sort();
const want = new Map();
const plugins = [];
for (const n of pkgs) {
  const p = JSON.parse(readFileSync(join(root, 'packages', n, 'package.json'), 'utf8'));
  const desc = ((s) => s[0].toUpperCase() + s.slice(1))(p.description.replace(/^[A-Z]\w+ of [A-Z]\w+:\s*/, ''));
  want.set(join('packages', n, '.claude-plugin', 'plugin.json'), { name: n, version: p.version, description: desc, author: { name: p.author }, license: p.license, homepage: p.homepage, keywords: p.keywords });
  want.set(join('packages', n, '.mcp.json'), { mcpServers: { [n]: { command: 'npx', args: ['-y', `${n}@${p.version}`, 'mcp'] } } });
  plugins.push({ name: n, source: `./packages/${n}`, description: desc, version: p.version, category: 'it-operations', keywords: [...new Set(p.keywords.filter((k) => !['mcp', 'mcp-server', 'fairwire', 'it-operations', 'network'].includes(k)))] });
}
want.set(join('.claude-plugin', 'marketplace.json'), { name: 'fairwire-it', owner: { name: 'Mythos Machines' }, metadata: { description: 'Thirty-one IT and network agents. Each reads files an IT team exports, writes reports locally and waits for a named person before anything that changes a live device, firewall, DNS zone, directory or cloud account.' }, plugins });
let stale = 0;
for (const [rel, obj] of want) {
  const f = join(root, rel); const text = JSON.stringify(obj, null, 2) + '\n';
  // Compared without line-ending differences (a Windows checkout may hold CRLF).
  if (check) { if (!existsSync(f) || readFileSync(f, 'utf8').replace(/\r\n/g, '\n') !== text) { console.error(`stale: ${rel}`); stale++; } continue; }
  mkdirSync(join(f, '..'), { recursive: true }); writeFileSync(f, text);
}
if (check && stale) { console.error(`${stale} plugin file(s) out of date; run node scripts/plugin-files.mjs`); process.exit(1); }
console.log(`${check ? 'checked' : 'wrote'} ${want.size} plugin file(s) for ${pkgs.length} agents`);
