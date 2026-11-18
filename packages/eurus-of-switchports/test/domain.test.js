// Switch ports: trunks, VLAN 1, duplex, errors, plan, unused ports, descriptions, unused VLANs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewPorts, vlanList } from '../src/index.js';

const p = (port, over = {}) => ({ switch: 'sw1', port, description: 'desk', admin_status: 'up', oper_status: 'up', mode: 'access', vlan: '10', allowed_vlans: '', duplex: 'full', crc_errors: '0', last_used: '2026-11-18 08:00:00', ...over });
const codes = (rows, vlans = [], s = {}, asOf = '2026-11-18') => reviewPorts(rows, vlans, s, asOf).items.map((i) => `${i.key}:${i.code}`).sort();

test('VLAN lists: ranges and lists are read, "all" and the full range mean every VLAN', () => {
  assert.deepEqual([...vlanList('10,20,30-32')], [10, 20, 30, 31, 32]);
  assert.equal(vlanList('ALL'), null); assert.equal(vlanList('1-4094'), null); assert.equal(vlanList(''), null);
});

test('a trunk with every VLAN is flagged; a trunk with a list is not, and its VLANs count as used', () => {
  assert.ok(codes([p('t1', { mode: 'trunk', allowed_vlans: 'all' })]).includes('sw1 t1:trunk_all_vlans'));
  const r = reviewPorts([p('t2', { mode: 'trunk', allowed_vlans: '40,41' })], [{ vlan: '40' }, { vlan: '41' }], {}, '2026-11-18');
  assert.ok(!r.items.some((i) => i.code === 'trunk_all_vlans' || i.code === 'unused_vlan'));
});

test('VLAN 1 on an access port in use is flagged; on a port that is down it is not', () => {
  assert.ok(codes([p('a', { vlan: '1' })]).includes('sw1 a:access_in_vlan1'));
  assert.ok(!codes([p('a', { vlan: '1', oper_status: 'down' })]).includes('sw1 a:access_in_vlan1'));
});

test('half duplex and CRC errors over the limit', () => {
  assert.ok(codes([p('a', { duplex: 'Half' })]).includes('sw1 a:half_duplex'));
  assert.ok(codes([p('a', { crc_errors: '101' })]).includes('sw1 a:crc_errors'));
  assert.ok(!codes([p('a', { crc_errors: '101' })], [], { crc_max: 500 }).includes('sw1 a:crc_errors'));
});

test('the VLAN plan applies only to access ports in use, and only when you give one', () => {
  assert.ok(!codes([p('a', { vlan: '77' })]).includes('sw1 a:vlan_not_in_plan'));
  assert.ok(codes([p('a', { vlan: '77' })], [], { allowed_access_vlans: [10] }).includes('sw1 a:vlan_not_in_plan'));
  assert.ok(!codes([p('a', { vlan: '77', mode: 'trunk', allowed_vlans: '77' })], [], { allowed_access_vlans: [10] }).includes('sw1 a:vlan_not_in_plan'));
});

test('an enabled port down past the unused limit is flagged; a shut port is not', () => {
  const old = { oper_status: 'down', last_used: '2026-08-01 09:00:00' };
  assert.ok(codes([p('a', old)]).includes('sw1 a:unused_enabled_port'));
  assert.ok(!codes([p('a', { ...old, admin_status: 'down' })]).includes('sw1 a:unused_enabled_port'));
  assert.ok(!codes([p('a', old)], [], { unused_days: 200 }).includes('sw1 a:unused_enabled_port'));
});

test('trunks need a description; VLAN 1 is never reported as unused', () => {
  assert.ok(codes([p('t', { mode: 'trunk', allowed_vlans: '10', description: '' })]).includes('sw1 t:no_description'));
  const r = reviewPorts([p('a')], [{ vlan: '1' }, { vlan: '10' }, { vlan: '50', name: 'old' }], {}, '2026-11-18');
  assert.deepEqual(r.items.map((i) => i.key), ['VLAN 50']);
});
