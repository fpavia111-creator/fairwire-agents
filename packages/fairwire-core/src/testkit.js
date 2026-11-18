// Contract tests every Fairwire agent runs against its own manifest, fixtures and
// eval cases (import from 'fairwire-core/testkit'). They check how the agent is wired:
// each tool that runs has an eval case, bad arguments come back as readable errors,
// files outside --root are refused, Review mode and the kill switch hold, drafts are
// tied to their sha256, results are repeatable, the agent's own column layout is read
// as it is, and the same data written differently (column order, an extra column, BOM
// and CRLF, padded values, row order, no rows at all) gives the same answer. Domain behaviour is tested in each agent's own test files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { AgentRuntime } from './runtime.js';
import { adaptRecords } from './sources.js';
import { ONE_CLICK_CATEGORIES } from './manifest.js';
import { parseCsvRows } from './csv.js';
import { createHash } from 'node:crypto';

// A fixed pseudonym key, so two runs give the same pseudonyms (with audit off the runtime
// would otherwise make a new key for each run).
const TEST_PII_KEY = createHash('sha256').update('fairwire contract tests: fictional fixtures only').digest();

const FILE_ARG = /\.(csv|tsv|txt|json|jsonl|xlsx|log|zone)$/i;
const VOLATILE = /(^|_)(ms|at|time|generated|ran|date_written|written_at|elapsed|file|files|draft|path|dir|out_dir|report|html|csv|md)$/i;

function strip(v) {
  if (Array.isArray(v)) return v.map(strip);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([k]) => !VOLATILE.test(k)).map(([k, x]) => [k, strip(x)]));
  if (typeof v === 'string') return v.replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/g, '<time>').replace(/[A-Za-z]:?[\\/][^\s"]*fairwire-out[^\s"]*/g, '<out>');
  return v;
}

function sample(type, i) {
  return { date: '2026-11-02', datetime: '2026-11-02T08:00:00', money: String(100 + i), number: String(1 + i), bool: 'yes', email: 'ops@example.test' }[type] || `X${i}`;
}

/**
 * Registers the contract tests. `casesFile` is the agent's evals/cases.json.
 * Every call runs on a copy of the eval root in a temporary folder, so nothing is
 * written next to the fixtures.
 */
const canon = (v) => {
  if (Array.isArray(v)) return v.map(canon).map((x) => JSON.stringify(x)).sort();
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([k]) => !/^(row|rows|line|sources|file|files)$/.test(k)).sort(([x], [y]) => (x < y ? -1 : 1)).map(([k, x]) => [k, canon(x)]));
  return v;
};

export function agentContract({ manifest, casesFile }) {
  const data = JSON.parse(readFileSync(casesFile, 'utf8'));
  const srcRoot = resolve(dirname(casesFile), data.root || '.');
  const cases = (data.cases || data).filter((c) => !/^intl-/.test(c.id));
  const decision = (t) => (manifest.policy.rules.find((r) => r.tool === t.name) || manifest.policy.rules.find((r) => r.category && r.category === t.category) || {}).decision;
  const runs = manifest.tools.filter((t) => decision(t) !== 'block');
  const caseFor = (t) => cases.find((c) => c.tool === t.name && (!c.expect || !c.expect.status || ['executed', 'needs_approval'].includes(c.expect.status)));
  const sandbox = () => { const d = mkdtempSync(join(tmpdir(), `${manifest.name}-contract-`)); cpSync(srcRoot, d, { recursive: true, filter: (p) => !/[\\/](node_modules|fairwire-out|\.fairwire)([\\/]|$)/.test(p) }); return d; };
  const rtIn = (root, opts = {}) => new AgentRuntime(manifest, { root, stateDir: join(root, '.fairwire-test'), audit: false, piiKey: TEST_PII_KEY, ...opts });
  async function run(rt, tool, args) {
    const first = await rt.call(tool, args);
    if (first.status !== 'needs_approval') return first;
    rt.approvals.approve(first.approval_id, 'Pat Example');
    return rt.call(tool, args);
  }

  test(`${manifest.name} contract: every tool that runs has an eval case`, () => {
    const missing = runs.filter((t) => !/_(learn|accept_learning|retire_memory)$/.test(t.name) && !cases.some((c) => c.tool === t.name)).map((t) => t.name);
    assert.deepEqual(missing, []);
  });

  test(`${manifest.name} contract: missing or wrongly typed arguments come back as readable errors`, async () => {
    const root = sandbox();
    for (const t of runs) {
      const req = (t.inputSchema && t.inputSchema.required) || [];
      if (!req.length) continue;
      const r = await rtIn(root).call(t.name, {});
      assert.equal(r.status, 'error', `${t.name} with no arguments`);
      assert.match(r.reason, new RegExp(req[0]), `${t.name} names the missing argument`);
      const bad = await rtIn(root).call(t.name, { ...(caseFor(t) || {}).args, [req[0]]: { not: 'a string' } });
      assert.ok(['error', 'blocked'].includes(bad.status), `${t.name} with an object for ${req[0]}`);
    }
  });

  test(`${manifest.name} contract: a file outside --root is refused before it is read`, async () => {
    const root = sandbox();
    let checked = 0;
    for (const t of runs) {
      const c = caseFor(t); if (!c) continue;
      const key = Object.keys(c.args || {}).find((k) => (typeof c.args[k] === 'string' && FILE_ARG.test(c.args[k])) || (Array.isArray(c.args[k]) && FILE_ARG.test(String(c.args[k][0]))));
      if (!key) continue;
      for (const evil of ['../../../../../../etc/passwd', '/etc/passwd', 'fixtures/../../../../outside.csv']) {
        const r = await run(rtIn(root), t.name, { ...c.args, [key]: Array.isArray(c.args[key]) ? [evil, ...c.args[key].slice(1)] : evil });
        assert.equal(r.status, 'error', `${t.name} ${key}=${evil}`);
        assert.match(r.reason, /outside|leaves the allowed root/, `${t.name} ${key}=${evil}: ${r.reason}`);
        assert.doesNotMatch(JSON.stringify(r), /root:x:0:0/, `${t.name} leaked a file outside the root`);
      }
      checked++;
    }
    assert.ok(checked > 0, 'at least one tool reads a file');
  });

  test(`${manifest.name} contract: Review mode refuses writes and actions, and the kill switch stops everything`, async () => {
    const root = sandbox();
    const review = rtIn(root, { mode: 'review' });
    for (const t of manifest.tools) {
      const c = caseFor(t); const args = c ? c.args : {};
      const r = await review.call(t.name, args);
      if (t.kind === 'write' || t.kind === 'action') assert.equal(r.status, 'blocked', `${t.name} in Review`);
      else if (t.kind === 'read' && c && decision(t) === 'allow' && (!c.expect || !c.expect.status || c.expect.status === 'executed')) assert.equal(r.status, 'executed', `${t.name} reads in Review`);
    }
    const killed = rtIn(root); killed.kill();
    for (const t of manifest.tools) assert.equal((await killed.call(t.name, (caseFor(t) || {}).args || {})).status, 'blocked', `${t.name} after kill`);
    for (const t of manifest.tools.filter((x) => ONE_CLICK_CATEGORIES.includes(x.category))) assert.throws(() => rtIn(root, { mode: 'auto', autoActions: [t.name] }), /one-click/, `${t.name} cannot go on Auto`);
  });

  const drafts = manifest.tools.filter((t) => /_draft_/.test(t.name) && caseFor(t));
  const request = manifest.tools.find((t) => /_request_/.test(t.name) && (t.inputSchema.required || []).includes('draft_sha256'));
  if (drafts.length && request) {
    test(`${manifest.name} contract: a draft is only approved with its own sha256, open markers need a note, and an edited draft needs a new review`, async () => {
      const root = sandbox();
      const rt = rtIn(root);
      const d = await run(rt, drafts[0].name, caseFor(drafts[0]).args);
      assert.equal(d.status, 'executed', JSON.stringify(d).slice(0, 300));
      assert.match(d.result.draft_sha256, /^[a-f0-9]{64}$/);
      assert.match(readFileSync(d.result.file, 'utf8'), /DRAFT\. Not sent\./);
      const wrong = await run(rtIn(root), request.name, { draft: d.result.draft, draft_sha256: '0'.repeat(64) });
      assert.equal(wrong.status, 'error'); assert.match(wrong.reason, /sha256/);
      const pending = await rtIn(root).call(request.name, { draft: d.result.draft, draft_sha256: d.result.draft_sha256 });
      assert.equal(pending.status, 'needs_approval', 'one named click');
      if (d.result.open_markers) {
        const open = await run(rtIn(root), request.name, { draft: d.result.draft, draft_sha256: d.result.draft_sha256 });
        assert.equal(open.status, 'error'); assert.match(open.reason, /open markers/);
      }
      const ok = await run(rtIn(root), request.name, { draft: d.result.draft, draft_sha256: d.result.draft_sha256, accept_open_issues: true, note: 'contact confirmed by phone' });
      assert.equal(ok.status, 'executed'); assert.match(ok.result.summary, /Nothing was sent/);
      assert.equal(ok.approved_by, 'Pat Example');
      writeFileSync(d.result.file, readFileSync(d.result.file, 'utf8') + '\nEdited after review.\n');
      const edited = await run(rtIn(root), request.name, { draft: d.result.draft, draft_sha256: d.result.draft_sha256, accept_open_issues: true, note: 'contact confirmed by phone' });
      assert.equal(edited.status, 'error'); assert.match(edited.reason, /does not match/);
    });
  }

  test(`${manifest.name} contract: the same call on the same files gives the same result`, async () => {
    const root = sandbox();
    let checked = 0;
    for (const t of runs.filter((x) => x.kind === 'read')) {
      const c = caseFor(t); if (!c) continue;
      const a = await rtIn(root).call(t.name, c.args); const b = await rtIn(root).call(t.name, c.args);
      assert.equal(a.status, b.status, t.name);
      assert.deepEqual(strip(b.result), strip(a.result), `${t.name} differs between two runs`);
      checked++;
    }
    assert.ok(checked > 0, 'at least one read tool has an eval case');
  });

  // ---- The same data written differently gives the same answer ----
  const csvQ = (v) => (/[",\r\n]/.test(v) || /^\s|\s$/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v);
  const write = (file, rows, { eol = '\n', bom = false } = {}) => writeFileSync(file, (bom ? '﻿' : '') + rows.map((r) => r.map(csvQ).join(',')).join(eol) + eol);
  const csvArgs = (c) => Object.values(c.args || {}).flatMap((v) => (Array.isArray(v) ? v : [v])).filter((v) => typeof v === 'string' && /\.csv$/i.test(v));
  const readCases = cases.filter((c) => { const t = manifest.tools.find((x) => x.name === c.tool); return t && t.kind === 'read' && decision(t) === 'allow' && (!c.mode || c.mode === 'assist') && (!c.expect || !c.expect.status || c.expect.status === 'executed') && csvArgs(c).length; });
  const totals = (r) => Object.fromEntries(Object.entries(r || {}).filter(([k, v]) => typeof v === 'number' && !VOLATILE.test(k)));
  const VARIANTS = {
    'columns in reverse order': (rows) => rows.map((r) => [...r].reverse()),
    'an extra column the agent does not know': (rows) => rows.map((r, i) => [...r, i ? `note ${i}` : 'Internal Remark Zz']),
    'a byte-order mark and Windows line endings': (rows) => rows,
    'spaces around every value': (rows) => rows.map((r, i) => (i ? r.map((v) => (v === '' ? v : ` ${v} `)) : r)),
    'blank lines at the end': (rows) => [...rows, [''], ['']],
  };
  async function rerun(c, change, opts) {
    const root = sandbox();
    for (const f of new Set(csvArgs(c))) { const file = resolve(root, f); const rows = parseCsvRows(readFileSync(file, 'utf8')); write(file, change(rows), opts); }
    return rtIn(root).call(c.tool, c.args);
  }
  if (readCases.length) {
    test(`${manifest.name} contract: the same data with columns reordered, an extra column, a BOM and CRLF, padded values or trailing blank lines gives the same result`, async () => {
      for (const c of readCases) {
        const base = await rtIn(sandbox()).call(c.tool, c.args);
        assert.equal(base.status, 'executed', `${c.id}: ${base.reason}`);
        for (const [name, change] of Object.entries(VARIANTS)) {
          const r = await rerun(c, change, name.startsWith('a byte-order') ? { eol: '\r\n', bom: true } : {});
          assert.equal(r.status, 'executed', `${c.id} with ${name}: ${r.reason}`);
          const { sources: _a, ...got } = strip(r.result); const { sources: _b, ...want } = strip(base.result);
          assert.deepEqual(got, want, `${c.id} with ${name}`);
        }
      }
    });

    test(`${manifest.name} contract: the result does not depend on the order of the rows`, async () => {
      for (const c of readCases) {
        const base = await rtIn(sandbox()).call(c.tool, c.args);
        for (const [name, change] of [['rows reversed', (rows) => [rows[0], ...rows.slice(1).reverse()]], ['rows rotated', (rows) => { const b = rows.slice(1); const k = Math.floor(b.length / 2); return [rows[0], ...b.slice(k), ...b.slice(0, k)]; }]]) {
          const r = await rerun(c, change);
          assert.equal(r.status, 'executed', `${c.id} with ${name}: ${r.reason}`);
          assert.deepEqual(totals(r.result), totals(base.result), `${c.id} with ${name}`);
          // Everything else too: the same findings, wording and amounts, whichever row came first. Lists are compared as sets and row numbers are left out.
          assert.deepEqual(canon(r.result), canon(base.result), `${c.id} with ${name}`);
        }
      }
    });

    test(`${manifest.name} contract: a file with a header and no rows is answered, not crashed on`, async () => {
      for (const c of readCases) {
        for (const f of new Set(csvArgs(c))) {
          const root = sandbox(); const file = resolve(root, f);
          write(file, [parseCsvRows(readFileSync(file, 'utf8'))[0]]);
          const r = await rtIn(root).call(c.tool, c.args);
          assert.ok(['executed', 'error'].includes(r.status), `${c.id} with ${f} empty: ${r.status}`);
          const text = JSON.stringify(r);
          assert.doesNotMatch(text, /Cannot read prop|is not a function|is not iterable|undefined is not|\bNaN\b|Infinity|\[object Object\]/, `${c.id} with ${f} empty: ${text.slice(0, 300)}`);
        }
      }
    });
  }

  // Report pages follow --lang; the CSV a script reads does not.
  const reportCases = cases.filter((c) => { const t = manifest.tools.find((x) => x.name === c.tool); return t && t.kind === 'report' && decision(t) === 'allow' && (!c.mode || c.mode === 'assist') && (!c.expect || !c.expect.status || c.expect.status === 'executed'); });
  if (reportCases.length) {
    test(`${manifest.name} contract: the report page is written in the report language and the CSV stays the same`, async () => {
      const heads = (html) => [...html.matchAll(/<h[12]>(.*?)<\/h[12]>/g)].map((m) => m[1]);
      for (const c of reportCases) {
        const pages = {};
        for (const lang of ['en', 'de', 'ja']) {
          const root = sandbox(); const r = await rtIn(root, { lang }).call(c.tool, c.args);
          assert.equal(r.status, 'executed', `${c.id} in ${lang}: ${r.reason}`);
          const files = (r.result.files || []).map((f) => resolve(root, f));
          pages[lang] = { html: files.filter((f) => /\.html$/.test(f)).map((f) => readFileSync(f, 'utf8')), csv: files.filter((f) => /\.csv$/.test(f)).map((f) => readFileSync(f, 'utf8')) };
        }
        if (!pages.en.html.length) continue;
        for (const lang of ['de', 'ja']) {
          assert.deepEqual(pages[lang].csv, pages.en.csv, `${c.id}: the CSV changed with --lang ${lang}`);
          pages[lang].html.forEach((html, i) => {
            assert.match(html, new RegExp(`<html lang="${lang}"`), `${c.id}: page language`);
            const en = heads(pages.en.html[i]), tr = heads(html);
            assert.equal(tr.length, en.length, `${c.id}: same headings in ${lang}`);
            // Every heading is translated: none is left as the English one.
            en.forEach((h, k) => assert.notEqual(tr[k], h, `${c.id}: heading "${h}" has no ${lang} text in fairwire-core/src/report-text.js`));
            // The numbers on the page are the same numbers.
            const cells = (x) => [...x.matchAll(/<td>(.*?)<\/td>/g)].map((m) => m[1]);
            assert.deepEqual(cells(html), cells(pages.en.html[i]), `${c.id}: table cells changed with --lang ${lang}`);
          });
        }
      }
    });
  }

  const kinds = Object.entries(manifest.sources || {});
  if (kinds.length) {
    test(`${manifest.name} contract: a file already in the agent's own column names is read as it is`, () => {
      for (const [kind, def] of kinds) {
        const names = Object.keys(def.fields);
        const row = names.map((n, i) => sample(def.fields[n].type, i));
        const r = adaptRecords({ format: 'csv', matrix: [names, row] }, def, { kind, file: `${kind}.csv` });
        assert.equal(r.report.adapted, false, `${kind}: ${JSON.stringify(r.report).slice(0, 300)}`);
        assert.equal(r.rows.length, 1, kind);
        for (const [i, n] of names.entries()) if (!def.fields[n].type || def.fields[n].type === 'text') assert.equal(r.rows[0][n], row[i], `${kind}.${n}`);
      }
    });
  }
}

