// Logs: retention against policy by category, silent sources, coverage, volume jumps, over-long retention.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewLogs } from '../src/index.js';

const s = (source, over = {}) => ({ source, host: 'h1', category: 'Application', retention_days: '30', last_event: '2026-11-18 07:00:00', daily_gb: '1', avg_daily_gb: '1', ...over });
const codes = (rows, assets = [], set = {}, asOf = '2026-11-18') => reviewLogs(rows, assets, set, asOf).items.map((i) => `${i.key}:${i.code}`).sort();

test('categories are read from words: firewall and audit logs are security logs', () => {
  const o = reviewLogs([s('a', { category: 'Firewall', retention_days: '400' }), s('b', { category: 'DNS', retention_days: '100' }), s('c', { category: 'Custom', retention_days: '100' })], [], {}, '2026-11-18');
  assert.deepEqual(o.by_category.map((x) => x.category), ['custom', 'network', 'security']); assert.deepEqual(o.items, []);
});

test('retention under policy is high for security logs and medium otherwise', () => {
  const o = reviewLogs([s('sec', { category: 'Security', retention_days: '180' }), s('app', { retention_days: '14' })], [], {}, '2026-11-18');
  assert.deepEqual(o.items.map((i) => [i.key, i.severity]).sort(), [['app@h1', 'medium'], ['sec@h1', 'high']]);
  assert.deepEqual(codes([s('sec', { category: 'Security', retention_days: '180' })], [], { retention_policy_days: { security: 180 } }), []);
});

test('a source with no events past the limit is silent', () => {
  assert.deepEqual(codes([s('a', { last_event: '2026-11-16 07:00:00' })]), ['a@h1:source_silent']);
  assert.deepEqual(codes([s('a', { last_event: '2026-11-16 07:00:00' })], [], { silent_hours: 72 }), []);
});

test('coverage: in-scope asset types with no source; matching ignores the domain', () => {
  const assets = [{ host: 'H1.corp.example', type: 'server' }, { host: 'h2', type: 'Server' }, { host: 'pc', type: 'laptop' }];
  const o = reviewLogs([s('a')], assets, {}, '2026-11-18');
  assert.deepEqual(o.items.map((i) => `${i.key}:${i.code}`), ['h2:asset_not_logging']); assert.equal(o.assets_in_scope, 2); assert.equal(o.coverage_pct, 50);
});

test('volume jumps: low over the limit, medium over five times the usual', () => {
  const sev = (gb) => reviewLogs([s('a', { daily_gb: gb, avg_daily_gb: '2' })], [], {}, '2026-11-18').items.map((i) => i.severity);
  assert.deepEqual(sev('5'), ['low']); assert.deepEqual(sev('11'), ['medium']); assert.deepEqual(sev('4'), []);
});

test('retention far beyond policy is low', () => {
  assert.deepEqual(codes([s('a', { retention_days: '100' })]), ['a@h1:kept_too_long']);
  assert.deepEqual(codes([s('a', { retention_days: '100' })], [], { too_long_factor: 4 }), []);
});

test('a source without a host is keyed by its name alone', () => {
  assert.deepEqual(codes([s('cloud audit', { host: '', category: 'audit', retention_days: '30' })]), ['cloud audit:retention_too_short']);
});
