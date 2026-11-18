// Patch status: days-to-patch by severity, unsupported systems, failures, silence, restarts, wide gaps.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewPatches } from '../src/index.js';

const r = (device, over = {}) => ({ device, os: 'Windows 11 Pro', group: 'G', update: 'KB1', title: 't', severity: 'Critical', state: 'Installed', released: '2026-10-01', last_scan: '2026-11-17 08:00:00', failures: '0', ...over });
const codes = (rows, s = {}, asOf = '2026-11-18') => reviewPatches(rows, s, asOf).items.map((i) => `${i.key}:${i.code}`).sort();

test('a critical update is overdue after its days; inside them it is not', () => {
  assert.ok(codes([r('a', { state: 'Missing', released: '2026-11-01' })]).includes('a:overdue_critical'));
  assert.ok(!codes([r('a', { state: 'Missing', released: '2026-11-10' })]).includes('a:overdue_critical'));
  assert.ok(!codes([r('a', { state: 'Missing', released: '2026-11-01' })], { days_to_patch: { critical: 30 } }).includes('a:overdue_critical'));
});

test('other severities use their own days and land in one finding per device', () => {
  const o = reviewPatches([r('a', { update: 'KB2', severity: 'Important', state: 'Not installed', released: '2026-10-01' }), r('a', { update: 'KB3', severity: 'Moderate', state: 'Missing', released: '2026-10-01' })], {}, '2026-11-18');
  assert.deepEqual(o.items.map((i) => i.code), ['overdue_update']);
  assert.match(o.items[0].message, /missing 1 other update/);
});

test('unsupported systems match by name without catching newer versions', () => {
  assert.ok(codes([r('a', { os: 'Microsoft Windows 10 Enterprise' })]).includes('a:unsupported_os'));
  assert.ok(codes([r('a', { os: 'Windows Server 2012 R2' })]).includes('a:unsupported_os'));
  assert.ok(!codes([r('a', { os: 'Windows 11 Pro' })]).includes('a:unsupported_os'));
  assert.ok(codes([r('a', { os: 'Ubuntu 18.04' })], { unsupported_os: ['Ubuntu 18.04'] }).includes('a:unsupported_os'));
});

test('failed state or two failed attempts count as a failure', () => {
  assert.ok(codes([r('a', { state: 'Install failed' })]).includes('a:repeated_failure'));
  assert.ok(codes([r('a', { state: 'Installed', failures: '2' })]).includes('a:repeated_failure'));
  assert.ok(!codes([r('a', { failures: '1' })]).includes('a:repeated_failure'));
});

test('a device that stopped scanning is flagged; restarts pending are noted', () => {
  assert.ok(codes([r('a', { last_scan: '2026-11-01 08:00:00' })]).includes('a:not_reporting'));
  assert.ok(!codes([r('a', { last_scan: '2026-11-01 08:00:00' })], { stale_scan_days: 30 }).includes('a:not_reporting'));
  assert.ok(codes([r('a', { state: 'Pending reboot' })]).includes('a:pending_reboot'));
});

test('an update missing on many devices is flagged once, with at least three devices', () => {
  const rows = ['a', 'b', 'c', 'd', 'e'].map((d, k) => r(d, { state: k < 3 ? 'Missing' : 'Installed', released: '2026-11-15' }));
  assert.ok(codes(rows).includes('KB1:widely_missing'));
  assert.ok(!codes(rows.slice(1)).includes('KB1:widely_missing'), 'two of four');
});

test('fully patched counts devices with nothing missing, per group', () => {
  const o = reviewPatches([r('a'), r('b', { group: 'H', state: 'Missing', released: '2026-11-15' })], {}, '2026-11-18');
  assert.equal(o.fully_patched, 1); assert.equal(o.fully_patched_pct, 50);
  assert.deepEqual(o.by_group, [{ group: 'G', devices: 1, fully_patched: 1 }, { group: 'H', devices: 1, fully_patched: 0 }]);
});
