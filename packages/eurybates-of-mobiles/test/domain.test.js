// Mobile devices: jailbreak, leavers, passcode and encryption, check-ins, OS minimums, compliance, owners.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewMobiles } from '../src/index.js';

const d = (device, over = {}) => ({ device, user: 'pat@corp.example', platform: 'iOS', os_version: '18.1', ownership: 'Corporate', last_check_in: '2026-11-17 08:00:00', encrypted: 'yes', passcode: 'yes', jailbroken: 'no', compliance: 'Compliant', imei: '350000000000999', ...over });
const codes = (rows, leavers = [], s = {}, asOf = '2026-11-18') => reviewMobiles(rows, leavers, s, asOf).items.map((i) => `${i.key}:${i.code}`).sort();

test('jailbroken and rooted devices are high', () => {
  assert.deepEqual(codes([d('a', { jailbroken: 'Yes' })]), ['a:jailbroken']);
});

test('a device of a leaver is high, matched without case', () => {
  assert.deepEqual(codes([d('a')], [{ user: 'PAT@corp.example', end_date: '2026-10-01' }]), ['a:leaver_device']);
});

test('no passcode or no encryption is one finding naming what is missing', () => {
  const o = reviewMobiles([d('a', { passcode: 'no', encrypted: 'no' })], [], {}, '2026-11-18');
  assert.equal(o.items.length, 1); assert.match(o.items[0].message, /no passcode and no encryption/);
});

test('stale check-ins follow the limit', () => {
  assert.deepEqual(codes([d('a', { last_check_in: '2026-10-01 08:00:00' })]), ['a:stale_check_in']);
  assert.deepEqual(codes([d('a', { last_check_in: '2026-10-01 08:00:00' })], [], { stale_days: 60 }), []);
});

test('OS minimums per platform, with iPadOS and iOS kept apart', () => {
  const s = { min_os: { iOS: '17.0', Android: '13' } };
  assert.deepEqual(codes([d('a', { os_version: '16.7' })], [], s), ['a:old_os']);
  assert.deepEqual(codes([d('a', { platform: 'iPadOS', os_version: '16.7' })], [], s), []);
  assert.deepEqual(codes([d('a', { platform: 'Android', os_version: '12' })], [], s), ['a:old_os']);
});

test('non-compliance is only reported when no other finding explains it', () => {
  assert.deepEqual(codes([d('a', { compliance: 'Noncompliant' })]), ['a:noncompliant']);
  assert.deepEqual(codes([d('a', { compliance: 'Noncompliant', os_version: '16.0' })], [], { min_os: { iOS: '17' } }), ['a:old_os']);
});

test('company devices need an owner; personal devices do not', () => {
  assert.deepEqual(codes([d('a', { user: '' })]), ['a:no_owner']);
  assert.deepEqual(codes([d('a', { user: '', ownership: 'Personal' })]), []);
  assert.equal(reviewMobiles([d('a', { ownership: 'BYOD' })], [], {}, '2026-11-18').personal, 1);
});
