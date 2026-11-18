// CMDB reconciliation: matching, retired-but-seen, unknown, duplicates, renames, ghosts, gaps, warranty.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewAssets } from '../src/index.js';

const c = (id, over = {}) => ({ asset_id: id, hostname: `H-${id}`, serial: `S-${id}`, status: 'In use', owner: 'Owner', location: 'HQ', warranty_end: '2030-01-01', ...over });
const seen = (host, serial, last = '2026-11-17', source = 'scan') => ({ hostname: host, serial, source, last_seen: last });
const codes = (cm, se, s = {}, asOf = '2026-11-18') => reviewAssets(cm, se, s, asOf).items.map((i) => `${i.key}:${i.code}`).sort();

test('serials match whatever their spacing or dashes; host names match without the domain', () => {
  const o = reviewAssets([c('1', { serial: 'ab 12-3' }), c('2', { serial: '' })], [seen('x', 'AB123'), seen('H-2.corp.example.', '')], {}, '2026-11-18');
  assert.equal(o.matched, 2); assert.deepEqual(o.items.filter((i) => i.code === 'not_in_cmdb'), []);
});

test('a retired record seen within the recent window is high; seen long ago it is not', () => {
  assert.ok(codes([c('1', { status: 'Disposed' })], [seen('H-1', 'S-1', '2026-11-10')]).includes('1:retired_but_seen'));
  assert.ok(!codes([c('1', { status: 'Disposed' })], [seen('H-1', 'S-1', '2026-09-10')]).includes('1:retired_but_seen'));
  assert.ok(codes([c('1', { status: 'gone' })], [seen('H-1', 'S-1')], { retired_words: ['gone'] }).includes('1:retired_but_seen'));
});

test('an unknown device is reported by serial, or by name when it has none', () => {
  assert.deepEqual(codes([], [seen('cam', ''), seen('pc', 'S-9')]), ['S-9:not_in_cmdb', 'cam:not_in_cmdb']);
});

test('duplicate serials and renames are found', () => {
  assert.ok(codes([c('1'), c('2', { serial: 'S-1' })], []).includes('S-1:duplicate_serial'));
  assert.ok(codes([c('1')], [seen('NEWNAME', 'S-1')]).includes('1:hostname_mismatch'));
});

test('ghost records: never seen, or seen before the limit; retired records are never ghosts', () => {
  assert.ok(codes([c('1')], []).includes('1:ghost_record'));
  assert.ok(codes([c('1')], [seen('H-1', 'S-1', '2026-06-01')]).includes('1:ghost_record'));
  assert.ok(!codes([c('1')], [seen('H-1', 'S-1', '2026-06-01')], { ghost_days: 200 }).includes('1:ghost_record'));
  assert.ok(!codes([c('1', { status: 'Retired' })], []).includes('1:ghost_record'));
});

test('missing owner or location on active records only', () => {
  assert.ok(codes([c('1', { owner: '' })], [seen('H-1', 'S-1')]).includes('1:missing_owner_or_location'));
  assert.ok(!codes([c('1', { owner: '', status: 'Retired' })], []).includes('1:missing_owner_or_location'));
});

test('warranty: ended is low, ending within the notice window is info, later is nothing', () => {
  const sev = (w, s = {}) => reviewAssets([c('1', { warranty_end: w })], [seen('H-1', 'S-1')], s, '2026-11-18').items.filter((i) => i.code === 'warranty_ended').map((i) => i.severity);
  assert.deepEqual(sev('2026-11-01'), ['low']); assert.deepEqual(sev('2026-12-01'), ['info']); assert.deepEqual(sev('2027-06-01'), []);
  assert.deepEqual(sev('2027-01-10', { warranty_notice_days: 90 }), ['info']);
});
