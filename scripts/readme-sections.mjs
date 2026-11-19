#!/usr/bin/env node
// Writes the generated part of every agent README from the agent itself, between
// <!-- generated:start --> and <!-- generated:end --> (inserted before "## Limits"
// the first time): a captured demo run, the tool table with each tool's policy,
// the columns each input is read from (with their names in other languages), the
// named exports, memory, install, modes, CLI and data notes.
//
//   node scripts/readme-sections.mjs [agent ...]     write
//   node scripts/readme-sections.mjs --check         exit 1 when a README is out of date
//
// The hand-written part (what it checks, how it decides, limits) is left as it is.
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describeSources, EXPORTS_BASIS_NOTE, namesFor, conceptOf, DEFAULT_UNITS, ONE_CLICK_CATEGORIES } from '../packages/fairwire-core/src/index.js';

const PK = join(dirname(fileURLToPath(import.meta.url)), '..', 'packages');
const check = process.argv.includes('--check');
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const START = '<!-- generated:start -->', END = '<!-- generated:end -->';
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const first = (s) => { const t = String(s || '').split(/(?<=[.!?])\s/)[0]; return t.length > 220 ? t.slice(0, 217) + '…' : t; };
const TYPE = { text: 'text', date: 'date', datetime: 'date and time', money: 'amount', number: 'number', bool: 'yes/no', email: 'email' };
const UNIT = { lb: 'pounds (kg converted)', mi: 'miles (km converted)', in: 'inches (cm converted)', kg: 'kilograms (lb converted)' };

function demoText(n) {
  const root = mkdtempSync(join(tmpdir(), `${n}-readme-`));
  try {
    const out = execFileSync(process.execPath, [join(PK, n, 'bin', `${n}.js`), 'demo'], { cwd: root, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' }, timeout: 60000 });
    // Drafts are named after the day the demo runs; the README shows a fixed date so it does not change every day.
    const today = new Date().toISOString().slice(0, 10);
    return out.split(today).join('2026-11-18').replace(/ in \/[^\s,]*(?=,| )/g, '').replace(/\/tmp\/[^\s)]*/g, '<demo folder>').replace(/\r/g, '').trimEnd().split('\n').slice(0, 70).join('\n');
  } finally { rmSync(root, { recursive: true, force: true }); }
}

function policyOf(m, t) {
  const r = (m.policy.rules || []).find((x) => x.tool === t.name);
  if (r && r.decision === 'block') return 'refused';
  if (ONE_CLICK_CATEGORIES.includes(t.category)) return `one named click, even in Auto (\`${t.category}\`)`;
  if (r && r.decision === 'ask') return 'asks first (Auto can be opted in)';
  return 'runs';
}

function section(n, m, demo) {
  const prefix = m.tools[0].name.replace(/_check$/, '');
  const L = [START, ''];
  L.push('## A demo run', '', `\`npx -y ${n} demo\` runs the agent on the fictional files in [\`fixtures/\`](fixtures) in a temporary folder. Captured output:`, '', '```text', demo, '```', '');
  L.push('## Tools', '', '| Tool | What it does | Policy |', '|---|---|---|');
  for (const t of m.tools) L.push(`| \`${t.name}\` | ${esc(first(t.description.replace(/^Listed so agents can see it is refused\.\s*/, '')))} | ${policyOf(m, t)} |`);
  L.push('', 'Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.', '');
  const sources = describeSources(m);
  if (sources.length) {
    L.push('## Columns it reads', '', 'Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent\'s own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts and counts are read with either decimal mark. Every result lists under `sources` how each file was read.', '');
    for (const s of sources) {
      const def = m.sources[s.kind];
      L.push(`### ${s.label} (${s.args.map((a) => `\`${a}\``).join(', ')})`, '', '| Column | Type | Also read as | For example, in other languages |', '|---|---|---|---|');
      for (const c of s.columns) {
        const fd = def.fields[c.name] || {};
        const concept = conceptOf(c.name, fd);
        const words = concept ? ['de', 'fr', 'ja', 'zh'].map((l) => namesFor(concept, l)[0]).filter(Boolean) : [];
        const unit = fd.unit === false ? null : fd.unit || DEFAULT_UNITS[c.name];
        L.push(`| \`${c.name}\`${c.required ? ' (required)' : ''} | ${unit ? UNIT[unit] || unit : TYPE[c.type] || c.type} | ${esc(c.also_called.slice(0, 6).join(', ')) || '-'} | ${esc(words.join(', ')) || '-'} |`);
      }
      L.push('');
      if (s.exports.length) {
        L.push('Named exports recognised by their column names:', '', '| System | Export | Recognised by | Layout checked against vendor docs |', '|---|---|---|---|');
        for (const e of s.exports) L.push(`| ${esc(e.system)} | ${esc(e.label)} | ${esc(e.recognised_by.join(', '))} | ${e.layout_checked === 'no' ? 'no' : esc(e.layout_checked)} |`);
        L.push('', EXPORTS_BASIS_NOTE, '');
      }
    }
    L.push('### Files from other countries', '', `A German export in Windows-1252 with semicolons, \`1.234,56\` and \`03.11.2026\`, or a Japanese one in Shift_JIS with \`2026/11/03\`, is read the same way as the English file. [\`fixtures/intl/\`](fixtures/intl) has both versions of the demo data, and the eval cases \`intl-de-*\` and \`intl-ja-*\` require the same results as the English case. Columns named differently? Run \`npx ${n} inspect <file>\` (names and shapes only, never values) and name them in \`fairwire-sources.json\`:`, '', '```json', '{ "files": { "exports/devices.csv": { "columns": { "host": "Gerätename" }, "date_order": "dmy" } } }', '```', '');
  }
  if (m.memory) {
    L.push('## Memory', '', `${m.name} can remember facts about your setup so the next run does not have to be told again. \`${prefix}_learn\` only proposes a fact; it changes nothing until a named person accepts it with \`${prefix}_accept_learning\`, which is one click even in Auto. Facts live in one hash-chained file per agent under \`.fairwire/memory/\`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with \`--no-memory\`.`, '', '| Kind | What an accepted fact changes |', '|---|---|');
    for (const [k, v] of Object.entries(m.memory.kinds)) L.push(`| \`${k}\` | ${esc(v.effect)} |`);
    L.push('| `note` | nothing (shown by recall only) |', '', `\`\`\`bash\n${n} memory list\n${n} memory accept MEM-1a2b3c4d5e6f --as "Your Name"\n${n} memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "rule removed"\n\`\`\``, '');
  }
  const read = m.tools.find((t) => t.kind === 'read');
  L.push('## Install', '', 'Node 20 or newer. No other dependencies.', '', '```bash', `npx -y ${n} demo`, `npx -y ${n} mcp --root /path/to/your/files`, '```', '', 'Claude Desktop, Cursor and other MCP hosts:', '', '```json', JSON.stringify({ mcpServers: { [n]: { command: 'npx', args: ['-y', n, 'mcp', '--root', '/path/to/your/files'] } } }, null, 2), '```', '', `Claude Code: \`claude mcp add ${n} -- npx -y ${n} mcp --root .\`, or install the \`${n}\` plugin from this repository's marketplace.`, '');
  L.push('## Modes and approvals', '', '- **Review** (`--mode review`): reads and reports only.', '- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `' + n + ' approve <id> --as "Your Name"` (or on the local approvals page, `' + n + ' approvals`), and the same call is repeated.', '- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`' + n + ' kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.', '');
  L.push('## CLI', '', '```bash', `${n} tools                 # every tool, its policy and arguments`, `${n} sources               # the columns each input is read from`, `${n} inspect <file>        # how a file would be read (names and shapes, never values)`, read ? `${n} call ${read.name} '${JSON.stringify(Object.fromEntries((read.inputSchema.required || []).map((k) => [k, `<${k}>`])))}'` : '', `${n} eval                  # the private eval cases on the fictional fixtures`, `${n} demo`, '```', '');
  L.push('## Audit log and data', '', 'Every call is written to `.fairwire/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.', '', END);
  return L.filter((x) => x !== '').length ? L.join('\n').replace(/\n{3,}/g, '\n\n') : '';
}

let stale = 0;
for (const n of readdirSync(PK).filter((x) => /^fairwire-(?!core$)/.test(x) && (!only.length || only.includes(x))).sort()) {
  const { manifest } = await import(pathToFileURL(join(PK, n, 'src', 'index.js')).href);
  const f = join(PK, n, 'README.md'); if (!existsSync(f)) continue;
  const block = section(n, manifest, demoText(n));
  // Compared without line-ending differences (a Windows checkout may hold CRLF).
  let txt = readFileSync(f, 'utf8').replace(/\r\n/g, '\n'); const was = txt;
  // The hand-written tool table is replaced by the generated one.
  if (!txt.includes(START)) txt = txt.replace(/\n## Tools\n[\s\S]*?(?=\n## )/, '\n');
  const next = txt.includes(START) ? txt.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block) : txt.includes('\n## Limits') ? txt.replace(/\n## Limits\b/, `\n${block}\n\n## Limits`) : `${txt.trimEnd()}\n\n${block}\n`;
  if (next === was) continue;
  if (check) { console.log(`${n}: README generated part is out of date`); stale++; continue; }
  writeFileSync(f, next); console.log(`${n}: README updated`);
}
if (check && stale) process.exit(1);
