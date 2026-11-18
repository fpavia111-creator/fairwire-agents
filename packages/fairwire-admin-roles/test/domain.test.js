// Privileged roles: top-admin cap, guests, MFA, break-glass use and notes, standing roles, mail, staleness.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewAdmins } from '../src/index.js';

const r = (user, over = {}) => ({ user, display_name: '', role: 'User Administrator', assignment_type: 'Eligible', user_type: 'Member', mfa: 'fido2', mailbox: 'no', last_sign_in: '2026-11-17', break_glass: 'no', note: '', ...over });
const codes = (rows, s = {}, asOf = '2026-11-18') => reviewAdmins(rows, s, asOf).items.map((i) => `${i.key}:${i.code}`).sort();

test('the top-admin cap counts people, not assignments, and leaves break-glass accounts out', () => {
  const ga = (u, over = {}) => r(u, { role: 'Global Administrator', ...over });
  assert.deepEqual(codes(['a', 'b', 'c', 'd'].map((u) => ga(u))), []);
  assert.deepEqual(codes(['a', 'b', 'c', 'd', 'e'].map((u) => ga(u))), ['global-admins:too_many_global_admins']);
  assert.deepEqual(codes([...['a', 'b', 'c', 'd'].map((u) => ga(u)), ga('bg', { break_glass: 'yes', note: 'safe', last_sign_in: '2026-01-01' })]), []);
  assert.deepEqual(codes(['a', 'b', 'c', 'd', 'e'].map((u) => ga(u))).length, 1);
});

test('guests are found by user type or by the external marker in the name', () => {
  assert.ok(codes([r('x', { user_type: 'Guest' })]).includes('x:guest_with_admin_role'));
  assert.ok(codes([r('vendor_example.com#EXT#@corp.example')]).includes('vendor_example.com#EXT#@corp.example:guest_with_admin_role'));
});

test('no MFA is high; any registered method avoids it', () => {
  assert.deepEqual(codes([r('a', { mfa: '' })]), ['a:admin_without_mfa']);
  assert.deepEqual(codes([r('a', { mfa: 'Not registered' })]), ['a:admin_without_mfa']);
});

test('break-glass accounts: recent sign-in is high, a missing note is low, other checks skip them', () => {
  assert.deepEqual(codes([r('bg', { break_glass: 'yes', note: '', mfa: '', assignment_type: 'Permanent', last_sign_in: '2026-11-10' })]), ['bg:break_glass_no_note', 'bg:break_glass_signed_in']);
  assert.deepEqual(codes([r('bg', { note: 'safe', last_sign_in: '2026-11-10' })], { break_glass_accounts: ['BG'] }), ['bg:break_glass_signed_in']);
});

test('standing assignments only when just-in-time is expected', () => {
  assert.deepEqual(codes([r('a', { assignment_type: 'Active (permanent)' })]), ['a:standing_admin']);
  assert.deepEqual(codes([r('a', { assignment_type: 'Active (permanent)' })], { require_jit: false }), []);
});

test('admin accounts with mail, and admins who stopped signing in', () => {
  assert.deepEqual(codes([r('a', { mailbox: 'yes' })]), ['a:admin_reads_mail']);
  assert.deepEqual(codes([r('a', { last_sign_in: '2026-07-01' })]), ['a:stale_admin']);
  assert.deepEqual(codes([r('a', { last_sign_in: '2026-07-01' })], { stale_admin_days: 200 }), []);
});

test('roles are summarised with holders and standing assignments; one finding per account', () => {
  const o = reviewAdmins([r('a', { mfa: '' }), r('A', { role: 'Exchange Administrator', mfa: '' })], {}, '2026-11-18');
  assert.equal(o.items.filter((i) => i.code === 'admin_without_mfa').length, 1); assert.equal(o.admins, 1);
  assert.deepEqual(o.by_role.map((x) => x.role), ['Exchange Administrator', 'User Administrator']);
});
