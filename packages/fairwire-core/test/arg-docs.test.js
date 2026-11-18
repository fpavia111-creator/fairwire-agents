import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { defineManifest, documentSchema, undocumentedArgs, createMcpHandler, serveStdio, AgentRuntime } from '../src/index.js';
import { sampleManifest } from './helpers.js';

const base = (extra = {}) => ({
  name: 'docs-pack', version: '1.0.0', model: { provider: 'anthropic', id: 'claude-x-20260101' },
  policy: { default: 'block', rules: [{ tool: '*', decision: 'allow' }] },
  tools: [{ name: 'docs_scan', kind: 'read', description: 'Scan things', inputSchema: { type: 'object', properties: {
    out_dir: { type: 'string' }, proposal: { type: 'string' }, proposal_sha256: { type: 'string' }, amount_column: { type: 'string' },
    widget: { type: 'string' }, kept: { type: 'string', description: 'inline wins' } } }, handler: () => ({}) }],
  ...extra,
});

test('arg docs: glossary, argDocs, inline wins, shared objects untouched', () => {
  const shared = { type: 'string' };
  const m = defineManifest(base({ argDocs: { widget: 'Generic widget', 'docs_scan.kept': 'never used' } }));
  const p = m.tools[0].inputSchema.properties;
  assert.match(p.out_dir.description, /fairwire-out\/docs/);
  assert.match(p.proposal_sha256.description, /SHA-256 of the proposal file/);
  assert.match(p.proposal.description, /Path under --root to the proposal file/);
  assert.match(p.amount_column.description, /holds the amount/);
  assert.equal(p.widget.description, 'Generic widget');
  assert.equal(p.kept.description, 'inline wins');
  assert.deepEqual(undocumentedArgs(m), []);
  const s = documentSchema({ name: 'x_y', inputSchema: { type: 'object', properties: { a: shared } } }, { a: 'doc' });
  assert.equal(s.properties.a.description, 'doc');
  assert.equal(shared.description, undefined);
});

test('arg docs: a typo in argDocs is a manifest error', () => {
  assert.throws(() => defineManifest(base({ argDocs: { widgte: 'oops' } })), /argDocs: "widgte" is not an argument/);
});

test('mcp: agent tools declare the result envelope as outputSchema; text is compact JSON', async () => {
  const h = createMcpHandler(new AgentRuntime(sampleManifest(), { audit: false }));
  const list = await h({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
  const t = list.result.tools.find((x) => x.name === 'read_thing');
  assert.deepEqual(t.outputSchema.required, ['status', 'decision']);
  const call = await h({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'read_thing', arguments: { x: 1 } } });
  assert.ok(!call.result.content[0].text.includes('\n'));
  assert.deepEqual(JSON.parse(call.result.content[0].text), call.result.structuredContent);
});

test('mcp stdio: JSON-RPC batches are answered, empty batch is an error', async () => {
  const input = new PassThrough(), output = new PassThrough();
  const lines = [];
  output.on('data', (b) => lines.push(...String(b).split('\n').filter(Boolean)));
  const orig = process.stderr.write; process.stderr.write = () => true;
  try {
    const rl = serveStdio(new AgentRuntime(sampleManifest(), { audit: false }), { input, output });
    input.write(JSON.stringify([{ jsonrpc: '2.0', id: 1, method: 'ping' }, { jsonrpc: '2.0', method: 'notifications/initialized' }, { jsonrpc: '2.0', id: 2, method: 'nope' }]) + '\n');
    input.write('[]\n');
    await new Promise((r) => setTimeout(r, 50));
    rl.close();
  } finally { process.stderr.write = orig; }
  const batch = JSON.parse(lines[0]);
  assert.equal(batch.length, 2);
  assert.deepEqual(batch[0], { jsonrpc: '2.0', id: 1, result: {} });
  assert.equal(batch[1].error.code, -32601);
  assert.equal(JSON.parse(lines[1]).error.code, -32600);
});
