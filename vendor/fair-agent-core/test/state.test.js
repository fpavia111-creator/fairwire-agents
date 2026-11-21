import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  AgentRuntime, AuditLog, ApprovalStore, UsageStore, defineManifest, defineFamily, inFamily, readAudit, verifyChain, memoryTools,
  stateSeal, generateStateKey, parseStateKey, convertStateFile, runCli, StateKeyError,
} from '../src/index.js';

const tmp = () => mkdtempSync(join(tmpdir(), 'fair-core-state-'));
const key = () => generateStateKey();
const manifest = (extra = {}) => defineManifest({
  name: 'sample-agent', version: '1.0.0', description: 'A sample agent for the engine tests.', model: { provider: 'anthropic', id: 'claude-sonnet-4-5-20250929' },
  tools: [
    { name: 'sample_read', kind: 'read', title: 'Read', description: 'Reads the secret word.', inputSchema: { type: 'object', additionalProperties: false, properties: { who: { type: 'string', description: 'Who asks' } } }, handler: async (a) => ({ summary: `ZEBRA-CROSSING for ${a.who || 'nobody'}` }) },
    { name: 'sample_send', kind: 'action', category: 'send_message', title: 'Send', description: 'Sends the secret word.', inputSchema: { type: 'object', additionalProperties: false, required: ['to'], properties: { to: { type: 'string', description: 'Recipient' } } }, handler: async (a) => ({ summary: `sent to ${a.to}` }) },
  ],
  policy: { rules: [{ tool: 'sample_read', decision: 'allow' }, { tool: 'sample_send', decision: 'ask' }], default: 'block' },
  ...extra,
});
const stateFiles = (dir) => readdirSync(dir).filter((f) => /\.(jsonl|json)$/.test(f)).map((f) => join(dir, f));

test('with no key the state files are plain, as before', async () => {
  const root = tmp(); const rt = new AgentRuntime(manifest(), { root });
  await rt.call('sample_read', { who: 'PLAIN-NAME' });
  assert.equal(rt.seal, null);
  assert.match(readFileSync(join(rt.stateDir, 'audit.jsonl'), 'utf8'), /sample_read/);
});

test('with a key, audit, approvals and usage hold no readable text, and everything still works', async () => {
  const root = tmp(); const k = key(); const rt = new AgentRuntime(manifest(), { root, stateKey: k });
  await rt.call('sample_read', { who: 'Ada' });
  const ask = await rt.call('sample_send', { to: 'OTTER-RECIPIENT' });
  assert.equal(ask.status, 'needs_approval');
  rt.approvals.approve(ask.approval_id, 'Grace Example', 'ok');
  const done = await rt.call('sample_send', { to: 'OTTER-RECIPIENT' });
  assert.equal(done.status, 'executed');
  for (const f of stateFiles(rt.stateDir)) {
    const raw = readFileSync(f, 'utf8');
    assert.ok(raw.split('\n').filter(Boolean).every((l) => l.startsWith('~1.')), `${f} has a plain line`);
    for (const word of ['sample_read', 'ZEBRA', 'OTTER', 'Grace', 'approved_by', 'steps']) assert.ok(!raw.includes(word), `${f} shows "${word}"`);
  }
  // a second runtime with the same key reads the same state and keeps one chain
  const rt2 = new AgentRuntime(manifest(), { root, stateKey: k });
  await rt2.call('sample_read', {});
  const entries = readAudit(join(rt.stateDir, 'audit.jsonl'), { seal: stateSeal(k) });
  assert.ok(entries.length >= 4); assert.equal(verifyChain(entries).ok, true);
  assert.ok(rt2.usageReport());
});

test('a sealed file is never read as empty: no key and a wrong key are errors', async () => {
  const root = tmp(); const rt = new AgentRuntime(manifest(), { root, stateKey: key() });
  const ask = await rt.call('sample_send', { to: 'x' });
  assert.throws(() => new AgentRuntime(manifest(), { root }), (e) => e instanceof StateKeyError && /encrypted and no key is set/.test(e.message));
  assert.throws(() => new AgentRuntime(manifest(), { root, stateKey: key() }), /does not open with this key/);
  assert.throws(() => new ApprovalStore(rt.stateDir, { seal: false }).state(ask.approval_id), /encrypted and no key is set/);
  assert.throws(() => readAudit(join(rt.stateDir, 'audit.jsonl'), { seal: false }), /encrypted/);
});

test('a line cannot be moved to another kind of file, or to another family', () => {
  const dir = tmp(); const k = key();
  const a = new AuditLog(join(dir, 'audit.jsonl'), { seal: k }); a.write({ tool: 't', status: 'executed' });
  const line = readFileSync(join(dir, 'audit.jsonl'), 'utf8');
  writeFileSync(join(dir, 'approvals.jsonl'), line);
  assert.throws(() => new ApprovalStore(dir, { seal: k }).all(), /does not open/);
  const other = defineFamily({ id: 'otherfam' });
  assert.throws(() => inFamily(other, () => readAudit(join(dir, 'audit.jsonl'), { seal: k })), /does not open/);
});

test('an edited sealed line is refused; the chain inside the seal still catches a removed line', () => {
  const dir = tmp(); const k = key(); const f = join(dir, 'audit.jsonl');
  const a = new AuditLog(f, { seal: k }); for (let i = 0; i < 3; i++) a.write({ tool: `t${i}`, status: 'executed' });
  const lines = readFileSync(f, 'utf8').split('\n').filter(Boolean);
  writeFileSync(f, [lines[0], lines[2]].join('\n') + '\n');
  assert.equal(verifyChain(readAudit(f, { seal: k })).ok, false);
  const flipped = lines[1].slice(0, -3) + (lines[1].slice(-3) === 'AAA' ? 'BBB' : 'AAA');
  writeFileSync(f, [lines[0], flipped, lines[2]].join('\n') + '\n');
  assert.throws(() => readAudit(f, { seal: k }), /does not open/);
});

test('turning encryption on keeps old plain lines readable; seal and open convert a folder both ways', async () => {
  const root = tmp(); const k = key();
  const plain = new AgentRuntime(manifest(), { root }); await plain.call('sample_read', { who: 'before' });
  const rt = new AgentRuntime(manifest(), { root, stateKey: k }); await rt.call('sample_read', { who: 'after' });
  const f = join(rt.stateDir, 'audit.jsonl');
  const raw = readFileSync(f, 'utf8').split('\n').filter(Boolean);
  assert.ok(raw.some((l) => l.startsWith('{')) && raw.some((l) => l.startsWith('~1.')));
  assert.equal(verifyChain(readAudit(f, { seal: stateSeal(k) })).ok, true);
  const n = convertStateFile('audit', f, { seal: stateSeal(k), to: 'sealed' });
  assert.equal(n, raw.length); assert.ok(readFileSync(f, 'utf8').split('\n').filter(Boolean).every((l) => l.startsWith('~1.')));
  convertStateFile('audit', f, { seal: stateSeal(k), to: 'plain' });
  assert.equal(verifyChain(readAudit(f, { seal: false })).ok, true);
});

test('memory files are sealed too, and verify', async () => {
  const root = tmp(); const k = key();
  const mem = memoryTools('sample', {});
  const withMem = defineManifest({ name: 'sample-agent', version: '1.0.0', description: 'A sample agent with memory.', model: { provider: 'anthropic', id: 'claude-sonnet-4-5-20250929' }, memory: { prefix: 'sample', kinds: {} }, tools: mem.tools, policy: { rules: [...mem.rules, { tool: '*', decision: 'block' }] } });
  const rt = new AgentRuntime(withMem, { root, stateKey: k });
  const r = await rt.call('sample_learn', { kind: 'note', value: { text: 'HERON-FACT about the setup' } });
  assert.equal(r.status, 'executed', JSON.stringify(r).slice(0, 300));
  const dir = join(rt.stateDir, 'memory'); const files = readdirSync(dir);
  assert.equal(files.length, 1);
  assert.ok(!readFileSync(join(dir, files[0]), 'utf8').includes('HERON'));
  assert.equal(rt.memory.load().chain.ok, true);
  assert.ok(JSON.stringify(rt.memory.lines()).includes('HERON-FACT'));
});

test('the key comes from the family variable, then FAIR_STATE_KEY, then a key file; a bad key is refused with its name', async () => {
  const k = key(); const fam = defineFamily({ id: 'envfam' });
  const saved = { ...process.env };
  try {
    process.env.ENVFAM_STATE_KEY = k;
    const root = tmp(); const rt = new AgentRuntime(manifest(), { root, family: fam }); await rt.call('sample_read', {});
    assert.ok(rt.seal); assert.ok(readFileSync(join(rt.stateDir, 'audit.jsonl'), 'utf8').startsWith('~1.'));
    delete process.env.ENVFAM_STATE_KEY; process.env.FAIR_STATE_KEY = k;
    assert.equal(verifyChain(inFamily(fam, () => readAudit(join(rt.stateDir, 'audit.jsonl')))).ok, true);
    delete process.env.FAIR_STATE_KEY; const kf = join(tmp(), 'k'); writeFileSync(kf, k + '\n'); process.env.ENVFAM_STATE_KEY_FILE = kf;
    assert.ok(new AgentRuntime(manifest(), { root, family: fam }).seal);
    delete process.env.ENVFAM_STATE_KEY_FILE; process.env.ENVFAM_STATE_KEY = 'not-a-key';
    assert.throws(() => new AgentRuntime(manifest(), { root: tmp(), family: fam }), /ENVFAM_STATE_KEY: a state key is 32 random bytes/);
  } finally { for (const n of ['ENVFAM_STATE_KEY', 'FAIR_STATE_KEY', 'ENVFAM_STATE_KEY_FILE']) { if (n in saved) process.env[n] = saved[n]; else delete process.env[n]; } }
  assert.equal(parseStateKey(Buffer.alloc(32, 7)).length, 32);
  assert.equal(parseStateKey(Buffer.alloc(32, 7).toString('base64')).length, 32);
  assert.throws(() => parseStateKey('abc'), /32 random bytes/);
});

test('the "state" command: keygen, status, seal, open', async () => {
  const root = tmp(); const out = [];
  const rt = new AgentRuntime(manifest(), { root }); await rt.call('sample_read', {});
  const kf = join(tmp(), 'state.key');
  const run = async (...a) => { const w = process.stdout.write; process.stdout.write = (x) => { out.push(String(x)); return true; }; try { return await runCli(manifest(), [...a, '--root', root]); } finally { process.stdout.write = w; } };
  assert.equal(await run('state', 'keygen', '--out', kf), 0); assert.match(readFileSync(kf, 'utf8'), /^[0-9a-f]{64}\n$/);
  assert.equal(await run('state', 'seal'), 2);
  process.env.FAIR_STATE_KEY_FILE = kf;
  try {
    assert.equal(await run('state', 'seal'), 0);
    assert.ok(readFileSync(join(rt.stateDir, 'audit.jsonl'), 'utf8').startsWith('~1.'));
    out.length = 0; assert.equal(await run('state', 'status'), 0); assert.match(out.join('\n'), /"state": "encrypted"/);
    assert.equal(await run('verify-log'), 0);
    assert.equal(await run('state', 'open'), 0);
    assert.ok(readFileSync(join(rt.stateDir, 'audit.jsonl'), 'utf8').startsWith('{'));
  } finally { delete process.env.FAIR_STATE_KEY_FILE; }
  assert.ok(existsSync(kf));
});
