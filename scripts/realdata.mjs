// Real data (final pass): run the agents on public, lawfully published files in their real format.
// Downloads go to _realdata/ (git-ignored, never committed); the results go to evidence/realdata.json.
// Nothing private is used. Each source records its page, licence, size and SHA-256.
//
//   node scripts/realdata.mjs            download what is missing, run, print, write evidence/realdata.json
//   node scripts/realdata.mjs --refresh  download again
//
// What each run means is in REVIEW-ver1.md ("Final pass", real data).
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { AgentRuntime, readZip, parseCsv } from '../packages/fairwire-core/src/index.js';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..'); const RD = join(repo, '_realdata');
const refresh = process.argv.includes('--refresh');
const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');

const SOURCES = {
  uci: { name: 'Incident management process enriched event log (UCI Machine Learning Repository, dataset 498)', system: 'ServiceNow (incident audit log of an IT company, anonymised)', page: 'https://archive.ics.uci.edu/dataset/498', url: 'https://archive.ics.uci.edu/static/public/498/incident+management+process+enriched+event+log.zip', file: 'uci-incidents/incident_event_log.zip', licence: 'CC BY 4.0. Amaral, Fantinato and Peres (2018), doi:10.24432/C57S4H' },
  bpic: { name: 'BPI Challenge 2014: Change details (4TU.ResearchData)', system: 'HP Service Manager change records of Rabobank Group ICT', page: 'https://data.4tu.nl/datasets/e9c00fe9-c87a-450e-8bd6-d5e06a6b309a', url: 'https://data.4tu.nl/file/e9c00fe9-c87a-450e-8bd6-d5e06a6b309a/9d7cd406-9826-4adf-8418-c751b475f556', file: 'bpic2014-changes/Detail_Change.csv', md5: '24a9fd1b2d7f7a46469ee85b4c14e598', licence: '4TU.ResearchData General Terms of Use. van Dongen (2014), doi:10.4121/uuid:d5ccb355-ca67-480f-8739-289b9b593aaf' },
  root: { name: 'DNS root zone file', system: 'IANA root zone in master-file format (as published by InterNIC)', page: 'https://www.iana.org/domains/root/files', url: 'https://www.internic.net/domain/root.zone', file: 'iana-root-zone/root.zone', licence: 'Published by IANA for public download; no licence stated' },
  eol: { name: 'endoflife.date (Windows, Windows Server, iOS, Android)', system: 'End-of-support dates collected from vendor pages', page: 'https://endoflife.date', urls: { windows: 'https://endoflife.date/api/windows.json', 'windows-server': 'https://endoflife.date/api/windows-server.json', ios: 'https://endoflife.date/api/ios.json', android: 'https://endoflife.date/api/android.json' }, licence: 'MIT (endoflife.date project)' },
};

async function fetchTo(url, rel) {
  const f = join(RD, rel); mkdirSync(dirname(f), { recursive: true });
  if (existsSync(f) && !refresh) return f;
  const res = await fetch(url, { signal: AbortSignal.timeout(300000), headers: { 'user-agent': 'fairwire-realdata-check' } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  writeFileSync(f, Buffer.from(await res.arrayBuffer()));
  return f;
}
const fileInfo = (f) => ({ bytes: statSync(f).size, sha256: sha(f), downloaded: statSync(f).mtime.toISOString().slice(0, 10) });
async function agent(n) { return (await import(pathToFileURL(join(repo, 'packages', n, 'src', 'index.js')).href)).manifest; }
async function run(n, root, tool, args) {
  const r = await new AgentRuntime(await agent(n), { root, audit: false, memory: false, pii: 'off' }).call(tool, { ...args, limit: 5000 });
  if (r.status !== 'executed') throw new Error(`${tool}: ${r.status} ${r.reason}`);
  return r;
}
const out = { run: new Date().toISOString().slice(0, 10), node: process.version, sources: [] };

// 1. ServiceNow incidents -> fairwire-ticket-sla
{
  const s = SOURCES.uci; const zip = await fetchTo(s.url, s.file);
  const csvName = 'incident_event_log.csv'; const dir = join(RD, 'uci-incidents');
  const entries = readZip(readFileSync(zip), { only: (name) => name.endsWith(csvName), maxBytes: 200 * 1024 * 1024 });
  const text = Buffer.from([...entries.values()][0]).toString('utf8');
  // The file is an audit log (one row per update); an incident list export shows each incident's latest row.
  const lines = text.split(/\r?\n/); const last = new Map();
  for (const l of lines.slice(1)) if (l) last.set(l.slice(0, l.indexOf(',')), l);
  writeFileSync(join(dir, 'incident_list.csv'), [lines[0], ...last.values()].join('\n') + '\n');
  const r = await run('fairwire-ticket-sla', dir, 'tickets_check', { tickets: 'incident_list.csv', as_of: '2017-12-31' });
  // Compare the agent's team breach findings (default targets) with the instance's own SLA flag (made_sla).
  const rows = parseCsv(readFileSync(join(dir, 'incident_list.csv'), 'utf8'));
  const teams = new Map(); for (const x of rows) { const t = x.assignment_group === '?' ? '(no team)' : x.assignment_group; const e = teams.get(t) || { n: 0, missed: 0 }; e.n++; if (x.made_sla === 'false') e.missed++; teams.set(t, e); }
  const snFlag = new Set([...teams].filter(([, e]) => e.n >= 3 && (100 * e.missed) / e.n > 20).map(([t]) => t));
  const agFlag = new Set(r.result.items.filter((i) => i.code === 'team_breach_rate').map((i) => i.key));
  const both = [...agFlag].filter((t) => snFlag.has(t)).length;
  const reopenRaw = rows.filter((x) => Number(x.reopen_count) >= 2).length;
  out.sources.push({ id: 'uci', agent: 'fairwire-ticket-sla', ...s, file: fileInfo(zip), rows_in_file: lines.length - 2, incidents: last.size,
    result: { summary: r.result.summary, by_finding: r.result.by_finding, checks_skipped: r.result.checks_skipped || [], warnings: r.warnings || [] },
    checks: {
      open_tickets: { agent: r.result.open_tickets, expected: 0, note: 'every incident ends Closed in the log' },
      reopened_often: { agent: (r.result.by_finding.reopened_often || {}).count || 0, file: reopenRaw },
      team_breach_rate_vs_made_sla: { agent_flagged: agFlag.size, servicenow_flagged: snFlag.size, both, agent_only: agFlag.size - both, servicenow_only: snFlag.size - both, note: 'agent: default resolution targets (P1 4 h, P2 24 h, P3 72 h, P4 120 h, calendar hours); ServiceNow: the instance\'s own SLA definitions, not published' },
    } });
}

// 2. HP Service Manager changes -> fairwire-change-calendar
{
  const s = SOURCES.bpic; const f = await fetchTo(s.url, s.file);
  const md5 = createHash('md5').update(readFileSync(f)).digest('hex');
  const r = await run('fairwire-change-calendar', dirname(f), 'changes_check', { changes: 'Detail_Change.csv' });
  out.sources.push({ id: 'bpic', agent: 'fairwire-change-calendar', ...s, file: { ...fileInfo(f), md5_matches_publisher: md5 === s.md5 },
    result: { summary: r.result.summary, changes: r.result.changes, rows: r.result.rows, long_windows: r.result.long_windows, by_finding: r.result.by_finding, checks_skipped: r.result.checks_skipped || [], warnings: r.warnings || [] } });
}

// 3. IANA root zone -> fairwire-dns-records
{
  const s = SOURCES.root; const f = await fetchTo(s.url, s.file);
  const types = {}; for (const l of readFileSync(f, 'utf8').split(/\r?\n/)) { if (!l || l.startsWith(';')) continue; const t = l.split(/\s+/)[3]; if (t) types[t] = (types[t] || 0) + 1; }
  const total = Object.values(types).reduce((a, b) => a + b, 0);
  const r = await run('fairwire-dns-records', dirname(f), 'dns_records_check', { records: 'root.zone' });
  out.sources.push({ id: 'root', agent: 'fairwire-dns-records', ...s, file: fileInfo(f),
    result: { summary: r.result.summary, records: r.result.records, records_in_file: total, record_types: types, format: r.result.format, by_finding: r.result.by_finding } });
}

// 4. endoflife.date -> the dated operating-system rules of fairwire-patch-status and fairwire-directory-hygiene
{
  const s = SOURCES.eol; const data = {}; const files = {};
  for (const [k, u] of Object.entries(s.urls)) { const f = await fetchTo(u, `endoflife/${k}.json`); data[k] = JSON.parse(readFileSync(f, 'utf8')); files[k] = fileInfo(f); }
  const { DEFAULTS: P } = await import(pathToFileURL(join(repo, 'packages/fairwire-patch-status/src/logic.js')).href);
  const { DEFAULTS: D } = await import(pathToFileURL(join(repo, 'packages/fairwire-directory-hygiene/src/logic.js')).href);
  const { osPastSupport } = await import(pathToFileURL(join(repo, 'packages/fairwire-core/src/it.js')).href);
  const today = out.run; const cycles = [];
  // OS names written the way device exports write them, per edition: (W) = Home and Pro, (E) = Enterprise and Education.
  const winName = (c) => {
    const lab = String(c.releaseLabel || c.cycle); const m = /^(10|11)\s+(\S+)/.exec(lab);
    if (!m) return `Windows ${lab}`;
    const [, major, ver] = m;
    if (/iot/i.test(lab)) return `Windows ${major} IoT Enterprise ${c.lts ? 'LTSC ' : ''}${ver}`;
    if (c.lts) return `Windows ${major} Enterprise ${c.releaseDate < '2018' ? 'LTSB' : 'LTSC'} ${ver}`;
    return `Windows ${major} ${/\(E\)/.test(lab) ? 'Enterprise' : 'Pro'} ${ver}`;
  };
  for (const c of data.windows) { const os = winName(c); cycles.push({ product: 'Windows', label: os, os, eol: c.eol }); }
  for (const c of data['windows-server']) { const os = `Windows Server ${String(c.releaseLabel || c.cycle).replace(/^Windows Server\s*/i, '')}`; cycles.push({ product: 'Windows Server', label: os, os, eol: c.eol }); }
  const ended = (c) => typeof c.eol === 'string' ? c.eol <= today : c.eol === true;
  const rule = (list) => cycles.map((c) => ({ ...c, ended: ended(c), flagged: !!osPastSupport(c.os, list) }));
  const summarise = (rows) => ({ ended: rows.filter((r) => r.ended).length, ended_and_flagged: rows.filter((r) => r.ended && r.flagged).length, ended_not_flagged: rows.filter((r) => r.ended && !r.flagged).map((r) => `${r.label} (ended ${r.eol})`), flagged_but_supported: rows.filter((r) => !r.ended && r.flagged).map((r) => `${r.label} (supported to ${r.eol})`) });
  const latest = (k) => data[k].filter((c) => !ended(c)).map((c) => c.cycle).sort((a, b) => Number(a) - Number(b));
  out.sources.push({ id: 'eol', agents: ['fairwire-patch-status', 'fairwire-directory-hygiene', 'fairwire-mobile-devices'], name: s.name, system: s.system, page: s.page, licence: s.licence, files,
    result: { patch_status: summarise(rule(P.unsupported_os)), directory_hygiene: summarise(rule(D.unsupported_os)), still_supported: { ios: latest('ios'), android: latest('android') } } });
}

mkdirSync(join(repo, 'evidence'), { recursive: true });
writeFileSync(join(repo, 'evidence', 'realdata.json'), JSON.stringify(out, null, 2) + '\n');
for (const x of out.sources) console.log(`${x.id}: ${x.result.summary || JSON.stringify(x.result).slice(0, 400)}`);
const u = out.sources.find((x) => x.id === 'uci').checks; console.log('uci checks:', JSON.stringify(u));
const e = out.sources.find((x) => x.id === 'eol').result; console.log('eol patch rule:', JSON.stringify(e.patch_status).slice(0, 900));
console.log('still supported:', JSON.stringify(e.still_supported));
