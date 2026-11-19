// Change calendar: freezes, approvals, overlaps, back-out and tests, timing, failures, emergency share.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewChanges } from '../src/index.js';

const c = (id, over = {}) => ({ change_id: id, system: 'ERP', title: 't', start: '2026-11-24 22:00:00', end: '2026-11-24 23:00:00', risk: 'Low', type: 'Normal', approval: 'Approved', backout_plan: 'Revert', test_evidence: 'Tested', outcome: '', requester: 'R', ...over });
const codes = (rows, fz = [], s = {}) => reviewChanges(rows, fz, s).items.map((i) => `${i.key}:${i.code}`).sort();
const freeze = [{ name: 'Year end', start: '2026-12-20 00:00:00', end: '2026-12-31 23:59:00' }];

test('a change inside a freeze is high; an emergency change inside it is medium', () => {
  const sev = (type) => reviewChanges([c('a', { start: '2026-12-22 22:00:00', end: '2026-12-22 23:00:00', type })], freeze, {}).items.filter((i) => i.code === 'in_freeze_window').map((i) => i.severity);
  assert.deepEqual(sev('Normal'), ['high']); assert.deepEqual(sev('Emergency'), ['medium']);
  assert.deepEqual(codes([c('a')], freeze), []);
});

test('approval: pending or missing is high; standard changes need none', () => {
  assert.deepEqual(codes([c('a', { approval: 'Pending' })]), ['a:not_approved']);
  assert.deepEqual(codes([c('a', { approval: 'Not approved' })]), ['a:not_approved']);
  assert.deepEqual(codes([c('a', { approval: '', type: 'Standard', backout_plan: '', test_evidence: '' })]), []);
});

test('overlaps are per system and high only when both changes are high risk', () => {
  const o = reviewChanges([c('a', { risk: 'High' }), c('b', { start: '2026-11-24 22:30:00', end: '2026-11-24 23:30:00', risk: 'High' }), c('x', { system: 'HR' })], [], {});
  assert.deepEqual(o.items.map((i) => [i.key, i.severity]), [['a+b', 'high']]);
  assert.deepEqual(codes([c('a'), c('b', { start: '2026-11-24 23:00:00', end: '2026-11-25 00:00:00' })]), [], 'back to back is not an overlap');
});

test('back-out plans and test evidence; "n/a" does not count', () => {
  assert.deepEqual(codes([c('a', { backout_plan: 'n/a' })]), ['a:no_backout_plan']);
  assert.deepEqual(codes([c('a', { test_evidence: '' })]), ['a:no_test_evidence']);
  assert.deepEqual(codes([c('a', { type: 'Emergency', test_evidence: '' })]), [], 'emergencies are not asked for tests');
});

test('high-risk changes in business hours on working days', () => {
  assert.deepEqual(codes([c('a', { risk: 'High', start: '2026-11-24 10:00:00', end: '2026-11-24 11:00:00' })]), ['a:risky_in_business_hours']);
  assert.deepEqual(codes([c('a', { risk: 'High', start: '2026-11-22 10:00:00', end: '2026-11-22 11:00:00' })]), [], 'Sunday');
  assert.deepEqual(codes([c('a', { risk: 'High', start: '2026-11-24 10:00:00', end: '2026-11-24 11:00:00' })], [], { business_hours: [11, 17] }), []);
});

test('repeat failures per system and the emergency share', () => {
  assert.ok(codes([c('a', { outcome: 'Failed' }), c('b', { outcome: 'Rolled back', start: '2026-11-25 22:00:00', end: '2026-11-25 23:00:00' })]).includes('ERP:repeat_failed_changes'));
  const many = ['1', '2', '3', '4', '5'].map((k, n) => c(k, { system: `S${k}`, type: n < 2 ? 'Emergency' : 'Normal' }));
  assert.ok(codes(many).includes('emergency:emergency_share'));
  assert.ok(!codes(many, [], { emergency_share_pct: 50 }).includes('emergency:emergency_share'));
});

test('a change with no end gets a one-hour window; rows without a start are left out', () => {
  const o = reviewChanges([c('a', { end: '' }), c('b', { start: '2026-11-24 22:30:00', end: '' }), c('z', { start: 'soon' })], [], {});
  assert.equal(o.changes, 2); assert.ok(o.items.some((i) => i.code === 'overlapping_changes'));
});

test('real change exports: a months-long planning window is counted, not compared; one change on several rows is one change; a yes/no emergency column counts', () => {
  // Shapes found in the public BPI Challenge 2014 (HP Service Manager) change records.
  const long = c('plan', { start: '2026-08-01 07:00:00', end: '2027-01-31 00:00:00' });
  const o = reviewChanges([long, c('a'), c('b', { start: '2026-11-24 22:30:00', end: '2026-11-24 23:30:00' })]);
  assert.deepEqual(o.items.filter((i) => i.code === 'overlapping_changes').map((i) => i.key), ['a+b'], 'the planning window overlaps nothing');
  assert.equal(o.long_windows, 1);
  const twoRows = reviewChanges([c('x', { system: 'ERP' }), c('x', { system: 'CRM' }), c('y', { system: 'ERP', start: '2026-11-24 22:15:00' })]);
  assert.equal(twoRows.changes, 2); assert.equal(twoRows.rows, 3);
  assert.equal(twoRows.items.filter((i) => i.code === 'overlapping_changes').length, 1, 'x and y on ERP, once');
  const em = reviewChanges([1, 2, 3, 4, 5].map((k) => c(`e${k}`, { system: `S${k}`, type: 'Release Type 11', emergency: k === 1 ? 'Y' : 'N' })));
  assert.equal(em.emergency, 1);
});
