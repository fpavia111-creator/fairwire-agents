// IT contracts: notice deadlines, missed notices, uplifts, owners, overlaps, payments against contracts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewContracts } from '../src/index.js';

const c = (id, over = {}) => ({ contract_id: id, vendor: 'Vendor Inc', service: `svc-${id}`, owner: 'Owner', start_date: '2025-01-01', end_date: '2026-12-31', auto_renew: 'yes', notice_days: '30', annual_value: '1000', uplift_pct: '3', ...over });
const codes = (cs, sp = [], s = {}, asOf = '2026-11-18') => reviewContracts(cs, sp, s, asOf).items.map((i) => `${i.key}:${i.code}`).sort();

test('the notice deadline is the end date minus the notice period; high when close, medium further out', () => {
  const sev = (end, notice) => reviewContracts([c('1', { end_date: end, notice_days: notice })], [], {}, '2026-11-18').items.map((i) => [i.code, i.severity]);
  assert.deepEqual(sev('2026-12-31', '30'), [['notice_deadline', 'high']]);
  assert.deepEqual(sev('2027-01-31', '30'), [['notice_deadline', 'medium']]);
  assert.deepEqual(sev('2027-06-30', '30'), []);
  assert.deepEqual(sev('2026-12-31', '90'), [['notice_missed', 'medium']]);
});

test('contracts that do not auto-renew have no notice deadline', () => {
  assert.deepEqual(codes([c('1', { auto_renew: 'no' })]), []);
});

test('uplift above the cap, and no owner, on active contracts only', () => {
  assert.ok(codes([c('1', { uplift_pct: '7', end_date: '2027-12-31' })]).includes('1:uplift_above_cap'));
  assert.ok(!codes([c('1', { uplift_pct: '7', end_date: '2027-12-31' })], [], { uplift_cap_pct: 8 }).includes('1:uplift_above_cap'));
  assert.ok(codes([c('1', { owner: '', end_date: '2027-12-31' })]).includes('1:no_owner'));
  assert.deepEqual(codes([c('1', { owner: '', end_date: '2026-01-01' })]), [], 'ended contracts are not reviewed for owners');
});

test('two live contracts for one service overlap', () => {
  assert.ok(codes([c('1', { service: 'Backup', end_date: '2027-12-31' }), c('2', { service: 'backup', vendor: 'Other', end_date: '2027-12-31' })]).includes('1+2:overlapping_contracts'));
});

test('vendor names match without legal forms or punctuation', () => {
  assert.deepEqual(codes([c('1', { end_date: '2027-12-31' })], [{ vendor: 'VENDOR', amount: '500', date: '2026-10-01' }]), []);
});

test('payments: without a contract, after the end date, and over the value', () => {
  assert.ok(codes([], [{ vendor: 'Nobody', amount: '50', date: '2026-10-01' }]).includes('Nobody:spend_without_contract'));
  assert.ok(codes([c('1', { end_date: '2026-06-30', auto_renew: 'no' })], [{ vendor: 'Vendor Inc', amount: '50', date: '2026-08-01' }]).includes('Vendor Inc:expired_still_paid'));
  assert.ok(codes([c('1', { end_date: '2027-12-31' })], [{ vendor: 'Vendor Inc', amount: '1200', date: '2026-08-01' }]).includes('Vendor Inc:spend_over_contract'));
  assert.ok(!codes([c('1', { end_date: '2027-12-31' })], [{ vendor: 'Vendor Inc', amount: '1050', date: '2026-08-01' }]).includes('Vendor Inc:spend_over_contract'), 'within the 10% margin');
});

test('payments older than twelve months are left out', () => {
  assert.deepEqual(codes([], [{ vendor: 'Nobody', amount: '50', date: '2025-06-01' }]), []);
});
