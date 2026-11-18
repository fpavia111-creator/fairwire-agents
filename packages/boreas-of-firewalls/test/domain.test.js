// Firewall rules: risky allows, shadowing by address and port ranges, duplicates, dates, hits, owners, logging.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewRules, readRules } from '../src/index.js';

const r = (id, pos, over = {}) => ({ rule_id: id, position: String(pos), enabled: 'yes', action: 'allow', src_zone: 'trust', dst_zone: 'untrust', source: '10.0.0.0/8', destination: 'any', service: 'tcp/443', hits: '100', last_hit: '2026-11-17', log: 'yes', description: 'web', owner: 'Net', ticket: 'CHG-1', expires: '', ...over });
const codes = (rows, s = {}, asOf = '2026-11-18') => reviewRules(rows, s, asOf).items.map((i) => `${i.key}:${i.code}`).sort();

test('any to any on any service is high; a deny of the same is not a risky allow', () => {
  assert.ok(codes([r('a', 1, { source: 'any', service: 'any' })]).includes('a:any_any_allow'));
  assert.ok(!codes([r('a', 1, { source: 'any', service: 'any', action: 'deny' })]).includes('a:any_any_allow'));
});

test('the internet zone to RDP, to any port, or from any zone and any source counts; inside to RDP does not', () => {
  assert.ok(codes([r('a', 1, { src_zone: 'untrust', dst_zone: 'dmz', source: 'any', service: 'tcp/3389' })]).includes('a:internet_to_risky_port'));
  assert.ok(codes([r('a', 1, { src_zone: 'outside', dst_zone: 'dmz', source: '203.0.113.0/24', service: 'any' })]).includes('a:internet_to_risky_port'));
  assert.ok(codes([r('a', 1, { src_zone: 'any', source: 'any', service: '1-1024' })]).includes('a:internet_to_risky_port'), 'range includes FTP and Telnet');
  assert.ok(!codes([r('a', 1, { service: 'tcp/3389' })]).includes('a:internet_to_risky_port'));
  assert.ok(!codes([r('a', 1, { src_zone: 'untrust', source: 'any', service: 'tcp/3389' })], { internet_zones: ['wan'] }).includes('a:internet_to_risky_port'));
});

test('a later rule inside an earlier one by CIDR and ports is shadowed; a wider later rule is not', () => {
  const early = r('wide', 1, { source: '10.0.0.0/8', service: 'tcp/80,443' });
  assert.ok(codes([early, r('narrow', 2, { source: '10.2.0.0/16', service: 'tcp/443' })]).includes('narrow:shadowed_rule'));
  assert.ok(!codes([early, r('wider', 2, { source: 'any', service: 'tcp/443' })]).includes('wider:shadowed_rule'));
  assert.ok(!codes([early, r('other-port', 2, { service: 'tcp/8443' })]).includes('other-port:shadowed_rule'));
  assert.ok(!codes([r('off', 1, { enabled: 'disabled', source: 'any', service: 'any' }), r('b', 2)]).includes('b:shadowed_rule'), 'a disabled rule shadows nothing');
});

test('policy order comes from the position column, not the row order', () => {
  const rows = [r('narrow', 2, { source: '10.2.0.0/16', service: 'tcp/443' }), r('wide', 1, { source: '10.0.0.0/8', service: 'tcp/443,80' })];
  assert.deepEqual(readRules(rows).map((x) => x.id), ['wide', 'narrow']);
  assert.ok(codes(rows).includes('narrow:shadowed_rule'));
});

test('an exact copy is a duplicate, not shadowed twice', () => {
  const c = codes([r('a', 1), r('b', 2)]);
  assert.ok(c.includes('b:duplicate_rule')); assert.ok(!c.includes('b:shadowed_rule'));
});

test('end dates, hits and last hits are judged against the as-of date', () => {
  assert.ok(codes([r('t', 1, { expires: '2026-11-01' })]).includes('t:expired_temporary_rule'));
  assert.ok(!codes([r('t', 1, { expires: '2026-12-01' })]).includes('t:expired_temporary_rule'));
  assert.ok(codes([r('z', 1, { hits: '0', last_hit: '' })]).includes('z:unused_rule'));
  assert.ok(codes([r('o', 1, { last_hit: '2026-07-01' })]).includes('o:unused_rule'));
  assert.ok(!codes([r('o', 1, { last_hit: '2026-07-01' })], { unused_days: 200 }).includes('o:unused_rule'));
  assert.ok(!codes([r('n', 1, { hits: '', last_hit: '' })]).includes('n:unused_rule'), 'no hit data, no judgement');
});

test('owner, ticket and logging on allow rules; disabled rules are listed as info', () => {
  assert.ok(codes([r('a', 1, { owner: '' })]).includes('a:no_owner_or_ticket'));
  assert.ok(codes([r('a', 1, { ticket: '', description: '' })]).includes('a:no_owner_or_ticket'));
  assert.ok(!codes([r('a', 1, { ticket: '' })]).includes('a:no_owner_or_ticket'), 'a description is enough');
  assert.ok(codes([r('a', 1, { log: 'no' })]).includes('a:allow_without_logging'));
  const o = reviewRules([r('d', 1, { enabled: 'Disabled' })], {}, '2026-11-18');
  assert.deepEqual(o.items.map((i) => [i.code, i.severity]), [['disabled_rule', 'info']]); assert.equal(o.enabled, 0);
});
