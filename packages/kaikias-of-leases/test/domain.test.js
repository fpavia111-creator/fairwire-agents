// DHCP: rogue servers, conflicts, exhaustion, reservations, unknown devices, scopes, random MACs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewLeases } from '../src/index.js';

const l = (ip, mac, over = {}) => ({ ip, mac, hostname: 'h', scope: '', lease_expires: '2026-11-19 08:00:00', server: '10.0.0.10', reservation: 'no', ...over });
const scope = { scope: '10.1.0.0/24', start: '10.1.0.10', end: '10.1.0.19', name: 'test' };
const codes = (input, s = {}, asOf = '2026-11-18') => reviewLeases(input, s, asOf).items.map((i) => `${i.key}:${i.code}`).sort();

test('a lease from a server not on your list is high; without a list there is no check', () => {
  const leases = [l('192.168.0.5', '00:00:00:00:00:01', { server: '192.168.0.1' })];
  assert.deepEqual(codes({ leases }), []);
  assert.deepEqual(codes({ leases }, { authorized_servers: ['10.0.0.10'] }), ['192.168.0.1:rogue_dhcp_server']);
});

test('two devices on one address is a conflict; the same device twice is not; expired leases do not count', () => {
  assert.ok(codes({ leases: [l('10.1.0.11', 'aa-00-00-00-00-01'), l('10.1.0.11', 'AA:00:00:00:00:02')] }).includes('10.1.0.11:ip_conflict'));
  assert.ok(!codes({ leases: [l('10.1.0.11', 'aa-00-00-00-00-01'), l('10.1.0.11', 'AA:00:00:00:00:01')] }).includes('10.1.0.11:ip_conflict'));
  assert.ok(!codes({ leases: [l('10.1.0.11', '00:00:00:00:00:01'), l('10.1.0.11', '00:00:00:00:00:02', { lease_expires: '2026-11-01 00:00:00' })] }).includes('10.1.0.11:ip_conflict'));
});

test('exhaustion counts distinct dynamic addresses against the range size', () => {
  const leases = Array.from({ length: 9 }, (_, k) => l(`10.1.0.${10 + k}`, `00:00:00:00:00:${String(k).padStart(2, '0')}`));
  assert.ok(codes({ leases, scopes: [scope] }).includes('10.1.0.0/24:scope_near_exhaustion'), '90% of 10');
  assert.ok(!codes({ leases: leases.slice(0, 8), scopes: [scope] }).includes('10.1.0.0/24:scope_near_exhaustion'), '80% of 10');
  assert.ok(!codes({ leases, scopes: [scope] }, { exhaustion_pct: 95 }).includes('10.1.0.0/24:scope_near_exhaustion'));
});

test('a reservation inside the dynamic range is flagged; outside it is not', () => {
  assert.ok(codes({ leases: [l('10.1.0.12', '00:00:00:00:00:01', { reservation: 'yes' })], scopes: [scope] }).includes('10.1.0.12:reservation_in_dynamic_range'));
  assert.ok(!codes({ leases: [l('10.1.0.200', '00:00:00:00:00:01', { reservation: 'Reserved' })], scopes: [scope] }).includes('10.1.0.200:reservation_in_dynamic_range'));
});

test('unknown devices are grouped per scope and matched by MAC in any notation', () => {
  const o = reviewLeases({ leases: [l('10.1.0.11', '00-AA-00-00-00-01'), l('10.1.0.12', '00:aa:00:00:00:02')], scopes: [scope], assets: [{ mac: '00AA.0000.0001'.replace(/\./g, '') }] }, {}, '2026-11-18');
  const u = o.items.filter((i) => i.code === 'unknown_devices'); assert.equal(u.length, 1); assert.equal(u[0].devices, 1);
});

test('one device in two scopes is noted; scope names given in the export are used', () => {
  assert.ok(codes({ leases: [l('10.1.0.11', '00:00:00:00:00:01', { scope: 'A' }), l('10.2.0.11', '00:00:00:00:00:01', { scope: 'B' })] }).includes('00:00:00:00:00:01:mac_in_many_scopes'));
});

test('random MAC share needs at least ten leases in the scope', () => {
  const mk = (n, rnd) => Array.from({ length: n }, (_, k) => l(`10.1.0.${30 + k}`, `${k < rnd ? 'da' : '00'}:00:00:00:00:${String(k).padStart(2, '0')}`, { scope: 'S' }));
  assert.ok(codes({ leases: mk(10, 4) }).includes('S:random_mac_share'));
  assert.ok(!codes({ leases: mk(9, 9) }).includes('S:random_mac_share'));
});
