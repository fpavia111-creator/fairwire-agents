// The agent builder: tools, policy, sorting, accepted exceptions, the report and the draft pair.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { wireAgent, finding, AgentRuntime, ONE_CLICK_CATEGORIES, sortFindings } from '../src/index.js';
import { learnAndAccept } from './memory-flow.js';

const pkg = { name: 'fairwire-demo-rules', version: '0.0.1' };
const agent = () => wireAgent({
  pkg, prefix: 'demo', title: 'Demo of Rules', description: 'Demo agent for the builder tests.',
  args: { rules: { type: 'string', description: 'Rules file' }, as_of: { type: 'string', format: 'date', description: 'As of' } }, required: ['rules'],
  sources: { rules: { label: 'Rules', args: ['rules'], fields: { name: { required: true }, action: {}, owner: { pii: 'name' } } } },
  run: (a, ctx) => { const rows = ctx.records(a.rules); return { rules: rows.length, items: rows.filter((r) => r.action === 'allow').map((r) => finding(r.name === 'r1' ? 'any_any' : 'no_owner', r.name === 'r1' ? 'high' : 'low', r.name, `${r.name} allows traffic (owner ${r.owner || 'none'})`, 'Narrow it')) }; },
  summary: (o) => `${o.rules} rule(s), ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Check rules', description: 'Check the rules.' },
  explain: { arg: 'rule', argSchema: { type: 'string', description: 'Rule name' }, title: 'Explain a rule', description: 'Explain one rule.', match: (i, v) => i.key === v },
  report: { title: 'Firewall rule review', base: 'demo-rules', sections: () => [{ title: 'By rule', rows: [], columns: ['rule'] }], ics: () => [{ date: '2026-12-01', summary: 'Review rules' }] },
  drafts: { noun: 'change_request', verb: 'submit', category: 'production_deploy', actor: 'the firewall owner', description: 'Draft a change request.', required: ['rules'], args: { rules: { type: 'string', description: 'Rules file' } }, build: () => ({ id: 'r1', text: '**To:** [TO CONFIRM change board]\n\nNarrow r1.' }) },
  refused: [{ name: 'firewall_push', category: 'production_deploy', description: 'Never pushes rules.' }],
});
const root = () => { const d = mkdtempSync(join(tmpdir(), 'agent-')); writeFileSync(join(d, 'rules.csv'), 'name,action,owner\nr2,allow,Ana Ortiz\nr1,allow,\nr3,deny,\n'); return d; };

test('builder: the tools, their kinds and a policy that ends in block', () => {
  const m = agent(); const names = m.tools.map((t) => t.name);
  for (const n of ['demo_check', 'demo_explain', 'demo_write_report', 'demo_draft_change_request', 'demo_request_submit', 'demo_recall', 'demo_learn', 'demo_accept_learning', 'demo_retire_memory', 'firewall_push']) assert.ok(names.includes(n), n);
  assert.equal(m.policy.rules.at(-1).decision, 'block');
  for (const t of m.tools.filter((x) => ONE_CLICK_CATEGORIES.includes(x.category))) assert.notEqual(m.policy.rules.find((r) => r.tool === t.name).decision, 'allow', t.name);
});

test('builder: findings come back worst first, counted by code, with personal names masked', async () => {
  const r = await new AgentRuntime(agent(), { root: root(), audit: false }).call('demo_check', { rules: 'rules.csv' });
  assert.equal(r.status, 'executed', r.reason);
  assert.deepEqual(r.result.items.map((i) => i.code), ['any_any', 'no_owner']);
  assert.deepEqual(r.result.by_finding, { any_any: { severity: 'high', count: 1 }, no_owner: { severity: 'low', count: 1 } });
  assert.equal(r.result.summary, '3 rule(s), 2 open finding(s), 1 high.');
  assert.doesNotMatch(JSON.stringify(r.result), /Ana Ortiz/);
  assert.deepEqual(sortFindings([{ severity: 'low', code: 'a', key: '1' }, { severity: 'high', code: 'z', key: '2' }]).map((i) => i.code), ['z', 'a']);
});

test('builder: an accepted exception moves a finding out of the open count, and only after a named click', async () => {
  const d = root(); const rt = new AgentRuntime(agent(), { root: d, stateDir: join(d, '.st') });
  await learnAndAccept(rt, 'demo', 'known_exception', { code: 'any_any', key: 'r1', note: 'lab only' });
  const r = await rt.call('demo_check', { rules: 'rules.csv', as_of: '2026-11-18' });
  assert.equal(r.result.open, 1); assert.equal(r.result.accepted, 1); assert.equal(r.result.high, 0);
  assert.match(r.result.summary, /1 finding\(s\) accepted as known/);
  const expired = await new AgentRuntime(agent(), { root: d, stateDir: join(d, '.st2') }).call('demo_check', { rules: 'rules.csv' });
  assert.equal(expired.result.accepted, 0, 'another state folder has no accepted facts');
});

test('builder: the report writes CSV, HTML and a calendar; the request waits for one click', async () => {
  const d = root(); const rt = new AgentRuntime(agent(), { root: d, audit: false });
  const w = await rt.call('demo_write_report', { rules: 'rules.csv' });
  assert.equal(w.status, 'executed', w.reason); assert.equal(w.result.files.length, 3);
  const csv = readFileSync(w.result.files[0], 'utf8'); assert.match(csv, /owner,decision/); assert.match(csv, /Ana Ortiz/, 'the file keeps real names');
  assert.match(readFileSync(w.result.files[1], 'utf8'), /<h2>By rule<\/h2>/);
  const ask = await rt.call('demo_draft_change_request', { rules: 'rules.csv' }); assert.equal(ask.status, 'needs_approval');
  const ex = await rt.call('demo_explain', { rules: 'rules.csv', rule: 'nope' }); assert.equal(ex.status, 'error'); assert.match(ex.reason, /nothing found for rule/);
  const blocked = await new AgentRuntime(agent(), { root: d, audit: false, mode: 'auto' }).call('firewall_push', {}); assert.equal(blocked.status, 'blocked');
});
