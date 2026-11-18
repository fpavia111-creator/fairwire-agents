// One-off: rename the themed agents to Fair-branded job names (BUILD-BRIEF "Naming", 18 Nov 2026).
// Moves each package folder and bin file with git mv, then rewrites package names, titles, tool prefixes
// and output folders in every tracked text file. Safe to run again (a renamed agent is skipped).
// usage: node scripts/rename-agents.cjs
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const names = JSON.parse(fs.readFileSync(path.join(__dirname, 'names.json'), 'utf8'));
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' });

for (const [oldPkg, , , newPkg] of names) {
  const from = path.join(ROOT, 'packages', oldPkg), to = path.join(ROOT, 'packages', newPkg);
  if (!fs.existsSync(from)) continue;
  git('mv', `packages/${oldPkg}`, `packages/${newPkg}`);
  if (fs.existsSync(path.join(to, 'bin', `${oldPkg}.js`))) git('mv', `packages/${newPkg}/bin/${oldPkg}.js`, `packages/${newPkg}/bin/${newPkg}.js`);
  // untracked output folders move with the folder; drop the old per-prefix output so it is rebuilt
  fs.rmSync(path.join(to, 'fairwire-out'), { recursive: true, force: true });
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rules = [];
for (const [oldPkg, oldPrefix, oldTitle, newPkg, newPrefix, newTitle] of names) {
  rules.push([new RegExp(`\\b${esc(oldPkg)}\\b`, 'g'), newPkg]);
  rules.push([new RegExp(`\\b${esc(oldTitle)}\\b`, 'gi'), newTitle]);
  rules.push([new RegExp(`\\b${esc(oldPrefix)}_(?=[a-z])`, 'g'), `${newPrefix}_`]);
  rules.push([new RegExp(`fairwire-out/${esc(oldPrefix)}\\b`, 'g'), `fairwire-out/${newPrefix}`]);
  rules.push([new RegExp(`prefix: '${esc(oldPrefix)}'`, 'g'), `prefix: '${newPrefix}'`]);
}
const TEXT = /\.(js|mjs|cjs|json|md|html|csv|tsv|txt|yml|yaml|jsonl|ics)$/i;
let files = 0, edits = 0;
for (const rel of git('ls-files').split('\n').filter(Boolean)) {
  if (!TEXT.test(rel) || /(^|\/)names\.json$|rename-agents\.cjs$/.test(rel)) continue;
  const f = path.join(ROOT, rel); if (!fs.existsSync(f)) continue;
  const raw = fs.readFileSync(f, 'utf8'); let s = raw;
  for (const [re, to] of rules) s = s.replace(re, to);
  if (s !== raw) { fs.writeFileSync(f, s); files++; edits++; }
}
console.log(`renamed ${names.length} agents; rewrote ${files} file(s)`);
