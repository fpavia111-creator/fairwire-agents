// Sign-in logs: spraying, guessed passwords, travel, legacy protocols, countries, service accounts, bursts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewSignins } from '../src/index.js';

const at = (min) => new Date(Date.UTC(2026, 10, 16, 8, 0) + min * 60000).toISOString().slice(0, 19).replace('T', ' ');
const e = (user, min, over = {}) => ({ at: at(min), user, app: 'Mail', client_ip: '198.51.100.1', country: 'US', result: 'Success', failure_reason: '', client_app: 'Browser', interactive: 'Yes', ...over });
const codes = (rows, s = {}) => reviewSignins(rows, s).items.map((i) => `${i.key}:${i.code}`).sort();
const fail = { result: 'Failure', failure_reason: 'Invalid password' };

test('spraying: one address failing on ten accounts within the window', () => {
  const ten = Array.from({ length: 10 }, (_, k) => e(`u${k}`, k * 5, { ...fail, client_ip: '203.0.113.9' }));
  assert.ok(codes(ten).includes('203.0.113.9:password_spray'));
  assert.ok(!codes(ten.slice(0, 9)).includes('203.0.113.9:password_spray'));
  assert.ok(!codes(ten, { spray_minutes: 20 }).includes('203.0.113.9:password_spray'), 'spread over 45 minutes');
});

test('a success after a burst of failures is high; the same failures with no success are a low burst', () => {
  const f = Array.from({ length: 10 }, (_, k) => e('pat', k, fail));
  assert.deepEqual(codes([...f, e('pat', 12)]), ['pat:success_after_failures']);
  assert.deepEqual(codes(f), ['pat:failed_burst']);
  assert.deepEqual(codes([...f, e('pat', 120)]), ['pat:failed_burst'], 'success long after the burst');
});

test('two countries inside the travel window, successes only', () => {
  assert.ok(codes([e('a', 0), e('a', 60, { country: 'BR' })]).includes('a:two_places_at_once'));
  assert.ok(!codes([e('a', 0), e('a', 60, { country: 'BR', ...fail })]).includes('a:two_places_at_once'));
  assert.ok(!codes([e('a', 0), e('a', 300, { country: 'BR' })]).includes('a:two_places_at_once'));
});

test('legacy protocols are recognised by their client names', () => {
  for (const cl of ['IMAP4', 'POP3', 'Authenticated SMTP', 'Exchange ActiveSync', 'Other clients']) assert.ok(codes([e('a', 0, { client_app: cl })]).includes('a:legacy_protocol'), cl);
  assert.ok(!codes([e('a', 0, { client_app: 'Mobile Apps and Desktop clients' })]).includes('a:legacy_protocol'));
});

test('countries are checked only against your list', () => {
  assert.deepEqual(codes([e('a', 0, { country: 'FR' })]), []);
  assert.deepEqual(codes([e('a', 0, { country: 'FR' })], { allowed_countries: ['US'] }), ['a:country_not_allowed']);
});

test('service accounts by prefix or exact name, interactive sign-ins only', () => {
  assert.ok(codes([e('svc-x', 0)]).includes('svc-x:service_account_interactive'));
  assert.ok(!codes([e('svc-x', 0, { interactive: 'Non-interactive' })]).includes('svc-x:service_account_interactive'));
  assert.ok(codes([e('batch01', 0)], { service_accounts: ['batch01'] }).includes('batch01:service_account_interactive'));
});

test('disabled-account attempts are read from the failure reason; rows without a time are left out', () => {
  assert.deepEqual(codes([e('old', 0, { result: 'Failure', failure_reason: 'User account is disabled' })]), ['old:disabled_account_attempts']);
  assert.equal(reviewSignins([e('a', 0, { at: 'yesterday' })], {}).events, 0);
});
