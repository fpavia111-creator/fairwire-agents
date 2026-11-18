// MFA coverage: admins, missing and weak MFA, exclusions, shared accounts, unused MFA.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewMfa } from '../src/index.js';

const u = (user, over = {}) => ({ user, display_name: '', enabled: 'true', user_type: 'Member', is_admin: 'no', mfa_registered: 'yes', methods: 'authenticator app', excluded: 'no', last_sign_in: '2026-11-17', last_mfa: '2026-11-17', department: 'D', ...over });
const codes = (rows, s = {}, asOf = '2026-11-18') => reviewMfa(rows, s, asOf).items.map((i) => `${i.key}:${i.code}`).sort();

test('an admin needs a phishing-resistant method; an app alone is not enough', () => {
  assert.deepEqual(codes([u('a', { is_admin: 'yes' })]), ['a:admin_without_strong_mfa']);
  assert.deepEqual(codes([u('a', { is_admin: 'yes', methods: 'FIDO2 security key, app' })]), []);
  assert.deepEqual(codes([u('a', { is_admin: 'yes', methods: 'yubikey' })], { strong_methods: ['yubikey'] }), []);
});

test('no MFA is high; methods without a registered flag still count as registered', () => {
  assert.deepEqual(codes([u('a', { mfa_registered: 'no', methods: '' })]), ['a:no_mfa']);
  assert.deepEqual(codes([u('a', { mfa_registered: '', methods: 'authenticator app' })]), []);
});

test('disabled accounts are skipped', () => {
  assert.deepEqual(codes([u('a', { enabled: 'false', mfa_registered: 'no', methods: '' })]), []);
  assert.equal(reviewMfa([u('a', { enabled: 'Disabled' })], {}, '2026-11-18').active, 0);
});

test('exclusions are flagged unless the account is a listed break-glass account', () => {
  assert.ok(codes([u('a', { excluded: 'yes' })]).includes('a:excluded_from_mfa'));
  assert.deepEqual(codes([u('BG', { excluded: 'yes', mfa_registered: 'no', methods: '' })], { break_glass: ['bg'] }), []);
});

test('SMS and voice only is weak; SMS next to an app is not', () => {
  assert.ok(codes([u('a', { methods: 'SMS; Voice call' })]).includes('a:weak_methods_only'));
  assert.ok(!codes([u('a', { methods: 'SMS, authenticator app' })]).includes('a:weak_methods_only'));
});

test('shared mailboxes that can sign in are flagged and not judged as people', () => {
  assert.deepEqual(codes([u('desk', { user_type: 'SharedMailbox', mfa_registered: 'no', methods: '' })]), ['desk:shared_account_can_sign_in']);
});

test('registered but unused: recent sign-ins with no recent second factor', () => {
  assert.ok(codes([u('a', { last_mfa: '2026-07-01' })]).includes('a:registered_never_used'));
  assert.ok(codes([u('a', { last_mfa: '' })]).includes('a:registered_never_used'));
  assert.ok(!codes([u('a', { last_mfa: '2026-07-01', last_sign_in: '2026-09-01' })]).includes('a:registered_never_used'), 'not signing in lately');
  assert.ok(!codes([u('a', { last_mfa: '2026-07-01' })], { unused_days: 200 }).includes('a:registered_never_used'));
});
