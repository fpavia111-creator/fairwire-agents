// Personal-data masking: what the model sees, what stays in the files, and how pseudonyms come back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PiiMasker, loadPiiKey, piiKindOf, AgentRuntime, defineManifest, MODEL_PIN } from '../src/index.js';

const key = Buffer.alloc(32, 7);

test('pii: sign-in names, e-mails, phones and display names become stable pseudonyms', () => {
  const m = new PiiMasker({ key });
  const r = m.maskResult({ user: 'ana.ortiz@example.test', display_name: 'Ana Ortiz', phone: '+1 555 010 4477', count: 3, host: 'LAPTOP-07' });
  assert.match(r.user, /^USR-[0-9a-f]{8}$/); assert.match(r.display_name, /^PERSON-[0-9a-f]{8}$/); assert.match(r.phone, /^TEL-[0-9a-f]{8}$/);
  assert.equal(r.count, 3); assert.equal(r.host, 'LAPTOP-07', 'host names stay in mask mode');
  const again = new PiiMasker({ key }).maskResult({ user: 'ANA.ORTIZ@example.test' });
  assert.equal(again.user, r.user, 'same person, same pseudonym, whatever the case');
});

test('pii: a registered value is also replaced inside free text, as "Last, First" too', () => {
  const m = new PiiMasker({ key });
  m.registerRecords([{ display_name: 'Ana Ortiz', upn: 'aortiz' }]);
  const t = m.maskText('Ortiz, Ana signed in as aortiz from a new country; mail ops@example.test or call 555-010-4477.');
  assert.doesNotMatch(t, /Ortiz|aortiz|ops@example|555-010/);
  assert.match(t, /PERSON-[0-9a-f]{8} signed in as USR-[0-9a-f]{8}/); assert.match(t, /\[EMAIL\]/); assert.match(t, /\[PHONE\]/);
});

test('pii: strict also masks host names and every address; off changes nothing', () => {
  const s = new PiiMasker({ key, mode: 'strict' }).maskResult({ host: 'LAPTOP-07', src_ip: '10.1.2.3', user: 'x1' });
  assert.match(s.host, /^HOST-/); assert.match(s.src_ip, /^IP-/);
  const o = new PiiMasker({ key, mode: 'off' }).maskResult({ user: 'ana', display_name: 'Ana Ortiz' });
  assert.deepEqual(o, { user: 'ana', display_name: 'Ana Ortiz' });
  assert.equal(piiKindOf('client_ip'), 'ip'); assert.equal(piiKindOf('src_ip'), null); assert.equal(piiKindOf('src_ip', 'strict'), 'any_ip');
});

test('pii: a pseudonym passed back by the model matches the raw value', () => {
  const m = new PiiMasker({ key });
  const tok = m.token('user', 'aortiz');
  assert.ok(m.same('aortiz', tok, 'user')); assert.ok(m.same('AORTIZ', 'aortiz', 'user')); assert.ok(!m.same('bkim', tok, 'user'));
});

test('pii: the key is created once in the state folder and a bad key file is refused', () => {
  const d = mkdtempSync(join(tmpdir(), 'pii-'));
  const k1 = loadPiiKey(d); const k2 = loadPiiKey(d);
  assert.ok(existsSync(join(d, 'pii.key'))); assert.deepEqual(k1, k2);
  writeFileSync(join(d, 'pii.key'), 'nope'); assert.throws(() => loadPiiKey(d), /64-character hex key/);
});

test('pii: the runtime masks results and the audit line, and the report file keeps the real values', async () => {
  const root = mkdtempSync(join(tmpdir(), 'pii-rt-'));
  writeFileSync(join(root, 'u.csv'), 'user,display_name\naortiz,Ana Ortiz\n');
  const manifest = defineManifest({ name: 'pii-demo', version: '0.0.1', model: MODEL_PIN, description: 'demo',
    sources: { users: { label: 'Users', args: ['users'], fields: { user: { required: true }, display_name: {} } } },
    tools: [{ name: 'demo_check', kind: 'report', title: 'Check', description: 'Check', inputSchema: { type: 'object', additionalProperties: false, required: ['users'], properties: { users: { type: 'string', description: 'file' } } },
      handler: async (a, ctx) => { const rows = ctx.records(a.users); const f = ctx.writeFile(ctx.outDir('out'), 'r.txt', rows.map((r) => r.display_name).join('\n')); return { summary: `${rows[0].display_name} (${rows[0].user}) has no MFA`, rows, file: f }; } }],
    policy: { rules: [{ tool: 'demo_check', decision: 'allow' }, { tool: '*', decision: 'block' }] } });
  const rt = new AgentRuntime(manifest, { root, piiKey: key });
  const r = await rt.call('demo_check', { users: 'u.csv' });
  assert.equal(r.status, 'executed', r.reason);
  assert.doesNotMatch(JSON.stringify(r.result), /Ana|aortiz/); assert.ok(r.personal_data.masked.user >= 1);
  assert.match(readFileSync(join(root, 'out', 'r.txt'), 'utf8'), /Ana Ortiz/);
  assert.doesNotMatch(readFileSync(join(root, '.fairwire', 'audit.jsonl'), 'utf8'), /Ana Ortiz|aortiz/);
  const off = await new AgentRuntime(manifest, { root, pii: 'off', audit: false }).call('demo_check', { users: 'u.csv' });
  assert.match(JSON.stringify(off.result), /Ana Ortiz/); assert.ok(off.warnings.some((w) => /masking is OFF/.test(w)));
  assert.throws(() => new AgentRuntime(manifest, { root, pii: 'loose' }), /pii must be one of/);
});
