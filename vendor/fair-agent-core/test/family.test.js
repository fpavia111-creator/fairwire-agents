import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as core from '../src/index.js';

const tmp = () => mkdtempSync(join(tmpdir(), 'fair-core-family-'));
const tool = (name, handler) => ({ name, kind: 'read', title: name, description: `Runs ${name}.`, inputSchema: { type: 'object', additionalProperties: false, properties: { file: { type: 'string', description: 'A file' } } }, handler });
const spec = (name, tools) => ({ name, version: '1.0.0', description: `${name} for the engine tests.`, model: { provider: 'anthropic', id: 'claude-sonnet-4-5-20250929' }, tools, policy: { rules: tools.map((t) => ({ tool: t.name, decision: 'allow' })), default: 'block' } });

test('two families run side by side in one process, each with its own names', async () => {
  const alpha = core.bindApi(core, core.defineFamily({ id: 'alpha', brand: 'Alpha' }));
  const beta = core.bindApi(core, core.defineFamily({ id: 'beta', brand: 'Beta' }));
  const ma = alpha.defineManifest(spec('alpha-agent', [tool('a_where', async (_a, ctx) => ({ summary: ctx.outDir() }))]));
  const mb = beta.defineManifest(spec('beta-agent', [tool('b_where', async (_a, ctx) => ({ summary: ctx.outDir() }))]));
  const ra = new alpha.AgentRuntime(ma, { root: tmp() }); const rb = new beta.AgentRuntime(mb, { root: tmp() });
  assert.ok(ra.stateDir.endsWith('.alpha')); assert.ok(rb.stateDir.endsWith('.beta'));
  const [xa, xb] = await Promise.all([ra.call('a_where', {}), rb.call('b_where', {})]);
  assert.ok(xa.result.summary.endsWith('alpha-out')); assert.ok(xb.result.summary.endsWith('beta-out'));
  // the manifest carries its family: the plain engine class picks it up too
  assert.equal(new core.AgentRuntime(ma, { root: tmp() }).family.id, 'alpha');
  const ha = alpha.createMcpHandler(ra); const hb = beta.createMcpHandler(rb);
  const names = async (h) => (await h({ jsonrpc: '2.0', id: 1, method: 'tools/list' })).result.tools.map((t) => t.name);
  assert.ok((await names(ha)).includes('alpha_info')); assert.ok((await names(hb)).includes('beta_info'));
  assert.equal(alpha.SOURCES_FILE, 'fair-sources.json'); // constants are replaced only when the binding names them
  assert.equal(core.bindApi(core, core.defineFamily({ id: 'gamma' }), { SOURCES_FILE: 'gamma-sources.json' }).SOURCES_FILE, 'gamma-sources.json');
});

test('reading rules are per family: the same file, two readings', () => {
  const keep = core.defineFamily({ id: 'keepfam', dialect: { ownName: 'keep' } });
  const map = core.defineFamily({ id: 'mapfam', dialect: { ownName: 'map' } });
  const table = { format: 'csv', matrix: [['Load_ID', 'Amount'], ['L1', '10.50']], encoding: { name: 'utf-8', how: 'utf-8' } };
  const def = { fields: { load_id: { type: 'text', required: true }, amount: { type: 'money' } } };
  const a = core.inFamily(keep, () => core.adaptRecords(table, def, { kind: 'loads', file: 'f.csv' }));
  const b = core.inFamily(map, () => core.adaptRecords(table, def, { kind: 'loads', file: 'f.csv' }));
  assert.equal(b.rows[0].load_id, 'L1');
  assert.equal(b.report.mapped.load_id, 'Load_ID');
  assert.equal(a.report.mapped.load_id, undefined);
  assert.throws(() => core.defineFamily({ id: 'badfam', dialect: { nope: true } }), /unknown reading rule/);
});

test('a family that masks personal data brings its masker; the engine routes every result through it', async () => {
  class StarMasker {
    constructor({ mode }) { this.on = mode !== 'off'; this.count = 0; }
    maskText(t) { return this.on ? String(t).replace(/Ada Lovelace/g, () => { this.count++; return 'PERSON-1'; }) : t; }
    maskResult(x) { return this.on ? JSON.parse(this.maskText(JSON.stringify(x))) : x; }
    report() { return { masked: this.count ? { name: this.count } : {} }; }
    registerRecords() {} register() {} same(a, b) { return a === b; }
  }
  const fam = core.defineFamily({ id: 'maskfam', masking: {
    name: 'pii', prop: 'pii', method: 'piiMasker', options: ['pii'], keyOptions: ['piiKey'], env: 'PII', modes: ['mask', 'off'], Masker: StarMasker, loadKey: () => Buffer.alloc(32),
    auditField: 'pii_mode', maskSummary: true, off: (out) => ({ ...out, warnings: ['masking is off'] }), done: (masked, rep) => (Object.keys(rep.masked).length ? { ...masked, pii_masked: rep.masked } : masked),
  } });
  const api = core.bindApi(core, fam);
  const m = api.defineManifest(spec('mask-agent', [tool('m_who', async (_a, ctx) => { assert.ok(ctx.pii); return { summary: 'Paid Ada Lovelace', name: 'Ada Lovelace' }; })]));
  const root = tmp(); const rt = new api.AgentRuntime(m, { root });
  const r = await rt.call('m_who', {});
  assert.equal(r.result.name, 'PERSON-1'); assert.ok(r.pii_masked.name >= 1);
  assert.ok(!JSON.stringify(core.readAudit(join(rt.stateDir, 'audit.jsonl'))).includes('Ada'));
  const off = new api.AgentRuntime(m, { root: tmp(), pii: 'off' });
  const o = await off.call('m_who', {}); assert.equal(o.result.name, 'Ada Lovelace'); assert.deepEqual(o.warnings, ['masking is off']);
  assert.equal(core.readAudit(join(off.stateDir, 'audit.jsonl')).at(-1).pii_mode, 'off');
  assert.throws(() => new api.AgentRuntime(m, { root: tmp(), pii: 'sometimes' }), /pii must be one of mask, off/);
  // a family with no masker: the tool context has none and results pass through
  const plain = core.bindApi(core, core.defineFamily({ id: 'plainfam' }));
  const pm = plain.defineManifest(spec('plain-agent', [tool('p_who', async (_a, ctx) => ({ summary: String('pii' in ctx) }))]));
  assert.equal((await new plain.AgentRuntime(pm, { root: tmp() }).call('p_who', {})).result.summary, 'false');
});

test('paths: over-long paths and names are refused before the disk is touched', () => {
  const root = tmp();
  assert.throws(() => core.safePath(root, 'A'.repeat(200000)), /path is too long/);
  assert.throws(() => core.safePath(root, `a/${'B'.repeat(300)}/c.txt`), /too long.*longer than 255/);
  assert.ok(core.safePath(root, 'x/'.repeat(200) + 'ok.txt').endsWith('ok.txt'));
});

test('a repeated column name keeps the first column and numbers the later ones', () => {
  const recs = core.parseCsv('code,RVU,RVU\n99213,1.3,0.1\n');
  assert.deepEqual(Object.keys(recs[0]), ['code', 'RVU', 'RVU (2)']);
});
