// Directory hygiene: password flags, group loops, computers, disabled members, owners, empty groups.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewDirectory } from '../src/index.js';

const user = (name, over = {}) => ({ type: 'user', name, enabled: 'True', last_logon: '2026-11-17', os: '', pwd_never_expires: 'False', pwd_not_required: 'False', member_of: '', members: '', managed_by: '', nested_groups: '', ...over });
const comp = (name, over = {}) => ({ type: 'computer', name, enabled: 'True', last_logon: '2026-11-17', os: 'Windows 11 Enterprise', ...over });
const group = (name, over = {}) => ({ type: 'group', name, enabled: 'True', members: '5', managed_by: 'Owner', nested_groups: '', ...over });
const codes = (rows, s = {}, asOf = '2026-11-18') => reviewDirectory(rows, s, asOf).items.map((i) => `${i.key}:${i.code}`).sort();

test('password flags on enabled users; disabled users are not judged on them', () => {
  assert.deepEqual(codes([user('a', { pwd_not_required: 'True' })]), ['a:password_not_required']);
  assert.deepEqual(codes([user('a', { pwd_never_expires: 'True', enabled: 'False' })]), []);
});

test('a service account prefix makes a non-expiring password low', () => {
  const o = reviewDirectory([user('svc-x', { pwd_never_expires: 'True' }), user('pat', { pwd_never_expires: 'True' })], {}, '2026-11-18');
  assert.deepEqual(o.items.map((i) => [i.key, i.severity]).sort(), [['pat', 'medium'], ['svc-x', 'low']]);
});

test('disabled accounts in groups: medium when a group is privileged, distinguished names read too', () => {
  const o = reviewDirectory([user('a', { enabled: 'False', member_of: 'CN=Domain Admins,CN=Users,DC=corp' }), user('b', { enabled: 'False', member_of: 'Staff' })], {}, '2026-11-18');
  assert.deepEqual(o.items.map((i) => [i.key, i.severity]).sort(), [['a', 'medium'], ['b', 'low']]);
});

test('stale and unsupported computers, enabled only', () => {
  assert.deepEqual(codes([comp('c', { last_logon: '2026-06-01' })]), ['c:stale_computer']);
  assert.deepEqual(codes([comp('c', { last_logon: '2026-06-01' })], { stale_days: 200 }), []);
  assert.deepEqual(codes([comp('c', { os: 'Windows 10 Pro' })]), ['c:unsupported_os_computer']);
  assert.deepEqual(codes([comp('c', { os: 'Windows 7', enabled: 'False', last_logon: '2020-01-01' })]), []);
});

test('groups: no owner, empty, built-in groups skipped', () => {
  assert.deepEqual(codes([group('g', { managed_by: '' })]), ['g:group_without_owner']);
  assert.deepEqual(codes([group('g', { members: '0' })]), ['g:empty_group']);
  assert.deepEqual(codes([group('Domain Admins', { managed_by: '' })]), []);
  assert.deepEqual(codes([group('g', { members: '0', nested_groups: 'h' }), group('h')]), [], 'a group with only nested groups is not empty');
});

test('a loop of three groups is reported once, named the same whatever the row order', () => {
  const rows = [group('A', { nested_groups: 'B' }), group('B', { nested_groups: 'C' }), group('C', { nested_groups: 'A' })];
  const a = reviewDirectory(rows, {}, '2026-11-18').items.filter((i) => i.code === 'nested_group_loop');
  const b = reviewDirectory([...rows].reverse(), {}, '2026-11-18').items.filter((i) => i.code === 'nested_group_loop');
  assert.equal(a.length, 1); assert.equal(a[0].message, b[0].message); assert.match(a[0].message, /A > B > C/);
});

test('counts by type and the user names the manifest masks', () => {
  const o = reviewDirectory([user('u'), comp('c'), group('g')], {}, '2026-11-18');
  assert.deepEqual([o.users, o.computers, o.groups], [1, 1, 1]); assert.deepEqual(o.user_names, ['u']);
});
