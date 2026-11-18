// Telecom bills: leavers, unused lines, roaming, premium charges, plan size and duplicate lines.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewTelecom } from '../src/index.js';

const l = (line, month, over = {}) => ({ line_number: line, month: `${month}-01`, user: 'Pat', line_type: 'Mobile', plan: 'P', monthly_charge: '40', data_gb: '10', data_allowance_gb: '20', minutes: '100', roaming_charge: '0', premium_charge: '0', ...over });
const codes = (rows, leavers = [], s = {}) => reviewTelecom(rows, leavers, s).items.map((i) => `${i.key}:${i.code}`).sort();

test('only lines billed in the latest month are judged', () => {
  const o = reviewTelecom([l('1', '2026-09', { data_gb: '0', minutes: '0' }), l('2', '2026-10')], [], {});
  assert.equal(o.month, '2026-10'); assert.equal(o.lines, 1); assert.deepEqual(o.items, []);
});

test('a leaver\'s line is high only when they left before the month started', () => {
  assert.ok(codes([l('1', '2026-10')], [{ user: 'pat', end_date: '2026-09-20' }]).includes('1:line_of_leaver'));
  assert.ok(!codes([l('1', '2026-10')], [{ user: 'Pat', end_date: '2026-10-20' }]).includes('1:line_of_leaver'));
});

test('a line is unused only when every recent month has no data and no minutes', () => {
  const z = { data_gb: '0', minutes: '0' };
  assert.ok(codes([l('1', '2026-09', z), l('1', '2026-10', z)]).includes('1:unused_line'));
  assert.ok(!codes([l('1', '2026-09'), l('1', '2026-10', z)]).includes('1:unused_line'));
  assert.ok(codes([l('1', '2026-09'), l('1', '2026-10', z)], [], { unused_months: 1 }).includes('1:unused_line'));
});

test('roaming over the limit and any premium charge are flagged in the latest month', () => {
  assert.ok(codes([l('1', '2026-10', { roaming_charge: '51' })]).includes('1:roaming_spike'));
  assert.ok(!codes([l('1', '2026-10', { roaming_charge: '51' })], [], { roaming_max: 100 }).includes('1:roaming_spike'));
  assert.ok(codes([l('1', '2026-10', { premium_charge: '4.99' })]).includes('1:premium_charges'));
});

test('an oversized plan needs two months under the share, and not an unused line', () => {
  assert.ok(codes([l('1', '2026-09', { data_gb: '1' }), l('1', '2026-10', { data_gb: '2' })]).includes('1:oversized_plan'));
  assert.ok(!codes([l('1', '2026-09', { data_gb: '1' }), l('1', '2026-10', { data_gb: '8' })]).includes('1:oversized_plan'));
  assert.ok(!codes([l('1', '2026-10', { data_gb: '1' })]).includes('1:oversized_plan'), 'one month is not enough');
});

test('two active mobile lines for one person; a landline does not count', () => {
  assert.ok(codes([l('1', '2026-10'), l('2', '2026-10', { user: 'PAT' })]).some((c) => c.endsWith('two_lines_one_user')));
  assert.ok(!codes([l('1', '2026-10'), l('2', '2026-10', { line_type: 'Landline' })]).some((c) => c.endsWith('two_lines_one_user')));
});

test('totals for the latest month', () => {
  const o = reviewTelecom([l('1', '2026-10', { monthly_charge: '40.10', roaming_charge: '5' }), l('2', '2026-10', { monthly_charge: '9.90' })], [], {});
  assert.equal(o.total, 50); assert.equal(o.roaming, 5);
});
