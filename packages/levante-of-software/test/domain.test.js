// Software against licences: product matching, prohibited, unapproved, versions, shortfalls, shelfware.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewSoftware, productKey } from '../src/index.js';

const i = (device, product, version = '1.0') => ({ device, product, version, publisher: 'P' });
const codes = (ins, ents = [], s = {}) => reviewSoftware(ins, ents, s).items.map((x) => `${x.key}:${x.code}`).sort();

test('product names compare without case, brackets or extra spaces', () => {
  assert.equal(productKey('7-Zip 24.08  (x64)'), '7-zip 24.08');
  assert.equal(productKey('VISIO Professional'), 'visio professional');
});

test('installs are counted per device, not per row', () => {
  const o = reviewSoftware([i('a', 'Tool'), i('A', 'Tool'), i('b', 'Tool')], [{ product: 'Tool', seats: '1' }], {});
  assert.ok(o.items.some((x) => x.code === 'over_deployed' && x.short === 1));
});

test('prohibited software is high and is not also reported as unapproved', () => {
  assert.deepEqual(codes([i('a', 'uTorrent Classic')], [], { prohibited: ['utorrent'], approved: ['Office'] }), ['uTorrent Classic:prohibited_software']);
});

test('the approved list is checked only when given, and names match by prefix', () => {
  assert.deepEqual(codes([i('a', 'Game')]), []);
  assert.deepEqual(codes([i('a', 'Game'), i('a', 'Office 2024')], [], { approved: ['office'] }), ['Game:unapproved_software']);
});

test('old versions use numeric comparison', () => {
  assert.deepEqual(codes([i('a', 'Zip', '9.2'), i('b', 'Zip', '24.1')], [], { min_versions: { Zip: '10.0' } }), ['Zip:old_version']);
});

test('shelfware needs both the share and the minimum count', () => {
  const ins = [i('a', 'Suite'), i('b', 'Suite')];
  assert.deepEqual(codes(ins, [{ product: 'Suite', seats: '10' }]), ['Suite:unused_entitlements']);
  assert.deepEqual(codes(ins, [{ product: 'Suite', seats: '6' }]), [], 'four unused is under the minimum of five');
  assert.deepEqual(codes(ins, [{ product: 'Suite', seats: '10' }], { shelfware_min_seats: 9 }), []);
});

test('three versions of one product are noted', () => {
  assert.deepEqual(codes([i('a', 'Zip', '1'), i('b', 'Zip', '2'), i('c', 'Zip', '3')]), ['Zip:many_versions']);
  assert.deepEqual(codes([i('a', 'Zip', '1'), i('b', 'Zip', '2')]), []);
});
