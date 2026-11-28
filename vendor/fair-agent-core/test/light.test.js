import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as core from '../src/index.js';

const tmp = () => mkdtempSync(join(tmpdir(), 'fair-core-light-'));
const fam = core.bindApi(core, core.defineFamily({ id: 'lite', brand: 'Lite' }));
const rows = (n) => Array.from({ length: n }, (_, i) => ({ id: `R${i}`, amount: i, note: 'x'.repeat(40) }));
const manifest = fam.defineManifest({
  name: 'lite-agent', version: '1.2.3', description: 'Lite Agent: finds rows for the engine tests.', model: { provider: 'anthropic', id: 'claude-sonnet-4-5-20250929' },
  tools: [
    { name: 'lite_review', kind: 'read', title: 'Review', description: 'Lists every row. Second sentence.', inputSchema: { type: 'object', additionalProperties: false, required: ['n'], properties: { n: { type: 'integer', description: 'How many rows' } } }, handler: async (a) => ({ summary: `${a.n} rows`, total: a.n, items: rows(a.n) }) },
    { name: 'lite_send', kind: 'action', category: 'binding_send', title: 'Send', description: 'Sends it.', inputSchema: { type: 'object', additionalProperties: false, properties: {} }, handler: async () => ({ summary: 'sent' }) },
    { name: 'lite_pay', kind: 'action', category: 'move_money', title: 'Pay', description: 'Pays it.', inputSchema: { type: 'object', additionalProperties: false, properties: {} }, handler: async () => ({ summary: 'paid' }) },
  ],
  policy: { rules: [{ tool: 'lite_review', decision: 'allow' }, { tool: 'lite_send', decision: 'ask' }, { tool: 'lite_pay', decision: 'block' }], default: 'block' },
});

test('a long result is cut to the limit; totals stay; the full result goes to a file', async () => {
  const rt = new fam.AgentRuntime(manifest, { root: tmp() });
  const r = await rt.run('lite_review', { n: 5000 });
  assert.ok(JSON.stringify(r).length <= core.DEFAULT_MAX_RESULT_CHARS);
  assert.equal(r.result.total, 5000);
  assert.equal(r.result.summary, '5000 rows');
  assert.ok(r.result.items.length < 5000);
  assert.deepEqual(r.result_trimmed.lists_cut[0], { path: 'items', total: 5000, shown: r.result.items.length });
  const saved = JSON.parse(readFileSync(join(rt.root, r.result_trimmed.full_result_file), 'utf8'));
  assert.equal(saved.result.items.length, 5000);
  // call() itself is unchanged, and a small result is never touched
  assert.equal((await rt.call('lite_review', { n: 5000 })).result.items.length, 5000);
  const small = await rt.run('lite_review', { n: 3 });
  assert.equal(small.result_trimmed, undefined);
  assert.equal((await rt.run('lite_review', { n: 5000 }, { maxChars: 0 })).result.items.length, 5000);
});

test('with encrypted state no plain-text copy is written', async () => {
  const rt = new fam.AgentRuntime(manifest, { root: tmp(), stateKey: core.generateStateKey() });
  const r = await rt.run('lite_review', { n: 5000 });
  assert.equal(r.result_trimmed.full_result_file, null);
  assert.ok(!existsSync(join(rt.stateDir, 'results')));
});

test('the MCP server cuts long results the same way', async () => {
  const rt = new fam.AgentRuntime(manifest, { root: tmp() });
  const h = fam.createMcpHandler(rt);
  const res = (await h({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'lite_review', arguments: { n: 5000 } } })).result;
  assert.ok(res.content[0].text.length <= core.DEFAULT_MAX_RESULT_CHARS);
  assert.equal(res.structuredContent.result.total, 5000);
});

test('tool definitions for model APIs, without an MCP server', async () => {
  const rt = new fam.AgentRuntime(manifest, { root: tmp() });
  const a = rt.toolSchemas('anthropic');
  const review = a.find((t) => t.name === 'lite_review');
  assert.deepEqual(Object.keys(review), ['name', 'description', 'input_schema']);
  assert.deepEqual(review.input_schema.required, ['n']);
  assert.ok(!a.some((t) => t.name === 'lite_info'));
  assert.ok(!a.some((t) => t.name === 'lite_pay'), 'blocked tools are left out');
  assert.ok(a.some((t) => t.name === 'lite_inspect_input'));
  const o = rt.toolSchemas('openai');
  assert.equal(o[0].type, 'function'); assert.ok(o[0].function.parameters);
  assert.ok(rt.toolSchemas('mcp').some((t) => t.name === 'lite_info'));
  assert.throws(() => rt.toolSchemas('nope'), /unknown tool format/);
  // a program runs what the model picked through the same gate
  assert.equal((await rt.run('lite_send', {})).status, 'needs_approval');
  assert.equal((await rt.run('lite_pay', {})).status, 'blocked');
});

test('SKILL.md: frontmatter, every tool that can run, blocked tools named, approval rule', () => {
  const rt = new fam.AgentRuntime(manifest, { root: tmp() });
  const md = core.renderSkill(rt, { command: 'lite-agent' });
  assert.match(md, /^---\nname: lite-agent\ndescription: "Finds rows for the engine tests\. Use when/);
  assert.match(md, /# Lite Agent/);
  assert.match(md, /\| `lite_review` \| ALLOW \| read \| Lists every row\. \| `n` \|/);
  assert.match(md, /\| `lite_send` \| ASK \|/);
  assert.match(md, /Never run \(blocked by policy\): `lite_pay`/);
  assert.match(md, /lite-agent approve <approval_id> --as "Their Name"/);
  assert.match(md, /Never approve on their behalf/);
  const desc = md.split('\n')[2].slice('description: '.length);
  assert.ok(JSON.parse(desc).length <= 1024);
});
