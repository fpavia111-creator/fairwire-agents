// Endpoint protection: coverage, protection states, staleness, products, versions and alerts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewEndpoints } from '../src/index.js';

const d = (device, over = {}) => ({ device, product: 'Defender', agent_version: '4.18.24090', signature_date: '2026-11-17', last_seen: '2026-11-18 07:00:00', protection: 'On', tamper_protection: 'On', mode: 'Active', ...over });
const codes = (input, s = {}, asOf = '2026-11-18') => reviewEndpoints(input, s, asOf).items.map((i) => `${i.key}:${i.code}`).sort();

test('coverage matches names without the domain and skips devices that cannot run an agent', () => {
  const o = reviewEndpoints({ devices: [d('pc-1.corp.example')], assets: [{ device: 'PC-1' }, { device: 'PC-2' }, { device: 'CAM-1', type: 'IP camera' }] }, {}, '2026-11-18');
  assert.deepEqual(o.items.map((i) => `${i.key}:${i.code}`), ['PC-2:no_agent']); assert.equal(o.assets_in_scope, 2); assert.equal(o.covered_pct, 50);
});

test('protection off and tamper off are read from words as consoles write them', () => {
  assert.ok(codes({ devices: [d('a', { protection: 'Disabled' })] }).includes('a:protection_off'));
  assert.ok(codes({ devices: [d('a', { tamper_protection: 'off' })] }).includes('a:tamper_off'));
  assert.deepEqual(codes({ devices: [d('a', { tamper_protection: '' })] }), [], 'blank tamper column is not off');
});

test('passive mode is flagged unless the device is listed as passive on purpose', () => {
  assert.ok(codes({ devices: [d('a', { mode: 'Passive' })] }).includes('a:passive_mode'));
  assert.deepEqual(codes({ devices: [d('a.corp', { mode: 'passive' })] }, { passive_ok: ['A'] }), []);
});

test('stale agents and old signatures follow their own limits', () => {
  assert.ok(codes({ devices: [d('a', { last_seen: '2026-11-01 07:00:00' })] }).includes('a:agent_not_reporting'));
  assert.ok(codes({ devices: [d('a', { signature_date: '2026-11-10' })] }).includes('a:old_signatures'));
  assert.deepEqual(codes({ devices: [d('a', { signature_date: '2026-11-10' })] }, { signature_max_days: 10 }), []);
});

test('two products on one device, and agent versions below the minimum', () => {
  assert.ok(codes({ devices: [d('a'), d('A.corp', { product: 'Other' })] }).includes('a:two_products'));
  assert.ok(codes({ devices: [d('a', { agent_version: '4.18.9' })] }, { min_agent_version: '4.18.10' }).includes('a:old_agent'));
  assert.deepEqual(codes({ devices: [d('a', { agent_version: '4.18.24090' })] }, { min_agent_version: '4.18.10' }), []);
});

test('only open high or critical alerts older than the limit are flagged', () => {
  const alerts = [{ alert_id: 'A1', device: 'a', severity: 'Critical', status: 'New', created: '2026-11-10 08:00:00' }, { alert_id: 'A2', device: 'a', severity: 'High', status: 'Resolved', created: '2026-11-10 08:00:00' }, { alert_id: 'A3', device: 'a', severity: 'Low', status: 'New', created: '2026-11-01 08:00:00' }, { alert_id: 'A4', device: 'a', severity: 'High', status: 'New', created: '2026-11-17 08:00:00' }];
  assert.deepEqual(codes({ devices: [d('a')], alerts }), ['A1:open_high_alert']);
  assert.equal(reviewEndpoints({ alerts }, {}, '2026-11-18').open_alerts, 3);
});

test('without an asset list there is no coverage figure', () => {
  const o = reviewEndpoints({ devices: [d('a')] }, {}, '2026-11-18');
  assert.equal(o.covered_pct, null); assert.equal(o.devices, 1); assert.deepEqual(o.items, []);
});
