// Backups: coverage, RPO, failures and warnings in a row, size drops, offsite copies, retention.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewBackups } from '../src/index.js';

const run = (system, day, over = {}) => ({ job: `J-${system}`, system, status: 'Success', started_at: `${day} 01:00:00`, ended_at: `${day} 02:00:00`, size_bytes: '100000000000', copy_type: 'primary', target: 'r', retention_days: '30', ...over });
const nights = (system, statuses, over = {}) => statuses.map((st, k) => run(system, `2026-11-${String(10 + k).padStart(2, '0')}`, { status: st, ...over }));
const codes = (jobs, crit = [], s = {}, asOf = '2026-11-15') => reviewBackups(jobs, crit, s, asOf).items.map((i) => `${i.key}:${i.code}`).sort();

test('a critical system with no job is high; a system not on the list is not reported as uncovered', () => {
  assert.deepEqual(codes([], [{ system: 'APP' }]), ['APP:not_covered']);
});

test('the RPO is measured from the last good primary run to the end of the as-of day', () => {
  const jobs = nights('A', ['Success', 'Success', 'Success', 'Success', 'Success']);
  assert.ok(!codes(jobs, [{ system: 'A', rpo_hours: '24' }], {}, '2026-11-14').includes('A:no_recent_good_backup'));
  assert.ok(codes(jobs, [{ system: 'A', rpo_hours: '24' }], {}, '2026-11-16').includes('A:no_recent_good_backup'));
  assert.ok(!codes(jobs, [{ system: 'A', rpo_hours: '72' }], {}, '2026-11-16').includes('A:no_recent_good_backup'));
});

test('a missed RPO is high for critical systems and medium for others', () => {
  const o = reviewBackups(nights('A', ['Success', 'Failed']), [], {}, '2026-11-15');
  assert.deepEqual(o.items.map((i) => [i.code, i.severity]), [['no_recent_good_backup', 'medium']]);
});

test('failures and warnings in a row are judged on the last runs only', () => {
  assert.ok(codes(nights('A', ['Success', 'Failed', 'Failed', 'Failed'])).includes('A:repeated_failures'));
  assert.ok(!codes(nights('A', ['Failed', 'Failed', 'Success', 'Failed'])).includes('A:repeated_failures'));
  assert.ok(codes(nights('A', ['Warning', 'Partial', 'Warning'])).includes('A:warnings_ignored'));
});

test('a last good backup far under the usual size is flagged; normal variation is not', () => {
  const jobs = nights('A', ['Success', 'Success', 'Success', 'Success']);
  jobs[3].size_bytes = '40000000000';
  assert.ok(codes(jobs).includes('A:size_drop'));
  jobs[3].size_bytes = '80000000000';
  assert.ok(!codes(jobs).includes('A:size_drop'));
});

test('critical systems need a recent offsite or immutable copy', () => {
  const base = nights('A', ['Success', 'Success', 'Success', 'Success', 'Success']);
  assert.ok(codes(base, [{ system: 'A' }]).includes('A:no_offsite_copy'));
  assert.ok(!codes([...base, run('A', '2026-11-13', { copy_type: 'Immutable', job: 'Copy' })], [{ system: 'A' }]).includes('A:no_offsite_copy'));
  assert.ok(codes([...base, run('A', '2026-11-01', { copy_type: 'cloud copy', job: 'Copy' })], [{ system: 'A' }]).includes('A:no_offsite_copy'), 'too old');
});

test('retention under policy is low; system names match without case', () => {
  assert.ok(codes(nights('A', ['Success'], { retention_days: '7' })).includes('A:short_retention'));
  assert.deepEqual(codes(nights('a', ['Success', 'Success']), [{ system: 'A' }]).filter((c) => c.endsWith('not_covered')), []);
});
