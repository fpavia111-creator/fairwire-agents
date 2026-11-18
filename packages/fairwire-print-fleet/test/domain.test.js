// Print fleet: offline, leases, idle printers, cost per page, colour, supplies, firmware, assets.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewPrinters } from '../src/index.js';

const p = (printer, over = {}) => ({ printer, site: 'HQ', model: 'M1', status: 'Online', last_seen: '2026-11-18 07:00:00', firmware: '1.0', mono_pages: '2000', color_pages: '200', supply_pct: '50', lease_monthly: '50', mono_click: '0.01', color_click: '0.05', lease_end: '2028-01-01', ...over });
const codes = (rows, assets = [], s = {}, asOf = '2026-11-18') => reviewPrinters(rows, assets, s, asOf).items.map((i) => `${i.key}:${i.code}`).sort();

test('offline by status or by an old last report', () => {
  assert.ok(codes([p('a', { status: 'Error' })]).includes('a:printer_offline'));
  assert.ok(codes([p('a', { last_seen: '2026-11-10 07:00:00' })]).includes('a:printer_offline'));
  assert.ok(!codes([p('a', { last_seen: '2026-11-10 07:00:00' })], [], { offline_days: 10 }).includes('a:printer_offline'));
});

test('a lease ending inside the notice window, or already ended, is flagged', () => {
  assert.ok(codes([p('a', { lease_end: '2027-01-15' })]).includes('a:lease_ending'));
  assert.ok(codes([p('a', { lease_end: '2026-10-01' })]).includes('a:lease_ending'));
  assert.ok(!codes([p('a', { lease_end: '2027-06-01' })]).includes('a:lease_ending'));
});

test('an idle printer is not also judged on cost per page or colour', () => {
  const c = codes([p('a', { mono_pages: '20', color_pages: '30' })]);
  assert.deepEqual(c, ['a:idle_printer']);
});

test('cost per page adds the lease and both click rates', () => {
  const o = reviewPrinters([p('a', { mono_pages: '300', color_pages: '0', lease_monthly: '90' })], [], {}, '2026-11-18');
  assert.ok(o.items.some((i) => i.code === 'high_cost_per_page')); assert.equal(o.cost, 93); assert.equal(o.cost_per_page, 0.31);
  assert.ok(!codes([p('a', { mono_pages: '300', color_pages: '0', lease_monthly: '90' })], [], { cost_per_page_max: 0.5 }).includes('a:high_cost_per_page'));
});

test('colour share, supplies and firmware within a model', () => {
  assert.ok(codes([p('a', { color_pages: '2000' })]).includes('a:high_color_share'));
  assert.ok(codes([p('a', { supply_pct: '5' })]).includes('a:low_supplies'));
  assert.deepEqual(codes([p('a', { firmware: '1.0.1' }), p('b'), p('c', { model: 'M2', firmware: '0.1' })]).filter((x) => x.endsWith('old_firmware')), ['b:old_firmware']);
});

test('the asset check runs only with an asset list and ignores the domain part of names', () => {
  assert.deepEqual(codes([p('a.corp.example')], [{ printer: 'A' }]), []);
  assert.deepEqual(codes([p('b')], [{ printer: 'A' }]), ['b:not_in_assets']);
  assert.deepEqual(codes([p('b')]), []);
});

test('totals by site', () => {
  const o = reviewPrinters([p('a'), p('b', { site: 'Branch' })], [], {}, '2026-11-18');
  assert.deepEqual(o.by_site.map((x) => [x.site, x.printers, x.pages]), [['Branch', 1, 2200], ['HQ', 1, 2200]]);
});
