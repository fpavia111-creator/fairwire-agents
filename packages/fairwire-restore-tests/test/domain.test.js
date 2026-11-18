// Restore tests: never tested, failed, overdue, RTO, RPO, sign-off and the due calendar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewRestores } from '../src/index.js';

const t = (id, system, on, over = {}) => ({ test_id: id, system, tested_on: on, result: 'Pass', restore_minutes: '60', data_age_hours: '4', signed_off_by: 'Owner', ...over });
const codes = (tests, crit = [], s = {}, asOf = '2026-11-18') => reviewRestores(tests, crit, s, asOf).items.map((i) => `${i.key}:${i.code}`).sort();

test('a critical system with no test is high and is due today', () => {
  const o = reviewRestores([], [{ system: 'ERP' }], {}, '2026-11-18');
  assert.deepEqual(o.items.map((i) => i.code), ['never_tested']); assert.deepEqual(o.due, [{ system: 'ERP', date: '2026-11-18' }]);
});

test('a failed latest test is high until a later test passes', () => {
  assert.ok(codes([t('1', 'A', '2026-10-01', { result: 'Fail' })]).includes('A:failed_not_retested'));
  assert.ok(!codes([t('1', 'A', '2026-10-01', { result: 'Fail' }), t('2', 'A', '2026-10-15')]).includes('A:failed_not_retested'));
  assert.ok(codes([t('1', 'A', '2026-10-01'), t('2', 'A', '2026-10-15', { result: 'failed' })]).includes('A:failed_not_retested'));
});

test('overdue uses the system interval, then the default', () => {
  assert.ok(codes([t('1', 'A', '2026-04-01')]).includes('A:test_overdue'));
  assert.ok(!codes([t('1', 'A', '2026-04-01')], [{ system: 'A', test_interval_days: '365' }]).includes('A:test_overdue'));
  assert.ok(!codes([t('1', 'A', '2026-04-01')], [], { test_interval_days: 300 }).includes('A:test_overdue'));
});

test('RTO and RPO are judged on the last passing test', () => {
  assert.ok(codes([t('1', 'A', '2026-10-01', { restore_minutes: '300' })]).includes('A:rto_missed'));
  assert.ok(codes([t('1', 'A', '2026-10-01', { data_age_hours: '30' })]).includes('A:rpo_missed'));
  assert.ok(!codes([t('1', 'A', '2026-10-01', { restore_minutes: '300', data_age_hours: '30' })], [{ system: 'a', rto_minutes: '400', rpo_hours: '48' }]).some((c) => /rto|rpo/.test(c)), 'per-system objectives, system names without case');
});

test('the last test needs a sign-off', () => {
  assert.ok(codes([t('1', 'A', '2026-10-01', { signed_off_by: '' })]).includes('A:no_sign_off'));
  assert.ok(!codes([t('1', 'A', '2026-09-01', { signed_off_by: '' }), t('2', 'A', '2026-10-01')]).includes('A:no_sign_off'));
});

test('the due calendar is sorted by date and a failed system is due now', () => {
  const o = reviewRestores([t('1', 'B', '2026-10-01'), t('2', 'A', '2026-06-01'), t('3', 'C', '2026-11-01', { result: 'Fail' })], [], {}, '2026-11-18');
  assert.deepEqual(o.due.map((d) => [d.system, d.date]), [['A', '2026-11-28'], ['C', '2026-11-18'], ['B', '2027-03-30']].sort((x, y) => (x[1] < y[1] ? -1 : 1)));
});

test('rows without a system or a readable date are left out', () => {
  const o = reviewRestores([t('1', '', '2026-10-01'), t('2', 'A', 'soon'), t('3', 'B', '2026-10-01')], [], {}, '2026-11-18');
  assert.equal(o.tests, 1); assert.equal(o.systems, 1);
});
