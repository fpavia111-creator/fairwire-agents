// Remote access: leavers, travel, countries, bursts, shared accounts, long sessions, client versions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewSessions } from '../src/index.js';

const s = (user, start, over = {}) => ({ user, connected_at: start, disconnected_at: '', client_ip: '198.51.100.1', country: 'US', result: 'success', client_version: '5.1', ...over });
const codes = (rows, leavers = [], set = {}) => reviewSessions(rows, leavers, set).items.map((i) => `${i.key}:${i.code}`).sort();

test('a leaver is flagged only for successful sessions after their last day', () => {
  const L = [{ user: 'Pat', end_date: '2026-11-01' }];
  assert.ok(codes([s('pat', '2026-11-02 09:00:00')], L).includes('pat:leaver_connected'), 'user names compared without case');
  assert.ok(!codes([s('pat', '2026-10-30 09:00:00')], L).includes('pat:leaver_connected'));
  assert.ok(!codes([s('pat', '2026-11-02 09:00:00', { result: 'failure' })], L).includes('pat:leaver_connected'));
});

test('two countries within the travel window are flagged; a day apart they are not', () => {
  assert.ok(codes([s('a', '2026-11-16 09:00:00'), s('a', '2026-11-16 10:30:00', { country: 'BR' })]).includes('a:two_places_at_once'));
  assert.ok(!codes([s('a', '2026-11-16 09:00:00'), s('a', '2026-11-17 10:00:00', { country: 'BR' })]).includes('a:two_places_at_once'));
  assert.ok(!codes([s('a', '2026-11-16 09:00:00'), s('a', '2026-11-16 10:30:00', { country: 'BR' })], [], { travel_hours: 1 }).includes('a:two_places_at_once'));
});

test('countries are checked only against your list, and only for successful connections', () => {
  const rows = [s('a', '2026-11-16 09:00:00', { country: 'FR' }), s('b', '2026-11-16 09:00:00', { country: 'FR', result: 'failure' })];
  assert.deepEqual(codes(rows).filter((c) => c.endsWith('country_not_allowed')), []);
  assert.deepEqual(codes(rows, [], { allowed_countries: ['us'] }).filter((c) => c.endsWith('country_not_allowed')), ['a:country_not_allowed']);
});

test('a failed burst needs the count inside the window', () => {
  const fails = (gapMin) => Array.from({ length: 10 }, (_, k) => s('b', new Date(Date.UTC(2026, 10, 16, 3, 0) + k * gapMin * 60000).toISOString().slice(0, 19).replace('T', ' '), { result: 'Failed' }));
  assert.ok(codes(fails(1)).includes('b:failed_login_burst'));
  assert.ok(!codes(fails(2)).includes('b:failed_login_burst'), 'ten failures over 18 minutes');
});

test('overlapping sessions from two addresses in one country are a shared account', () => {
  const a = s('x', '2026-11-16 08:00:00', { disconnected_at: '2026-11-16 12:00:00' });
  assert.ok(codes([a, s('x', '2026-11-16 09:00:00', { client_ip: '198.51.100.2' })]).includes('x:shared_account'));
  assert.ok(!codes([a, s('x', '2026-11-16 13:00:00', { client_ip: '198.51.100.2' })]).includes('x:shared_account'), 'after the first ended');
  assert.ok(!codes([a, s('x', '2026-11-16 09:00:00')]).includes('x:shared_account'), 'same address');
});

test('long sessions and old clients follow the settings', () => {
  const long = s('l', '2026-11-14 08:00:00', { disconnected_at: '2026-11-15 10:00:00' });
  assert.ok(codes([long]).includes('l:long_session'));
  assert.ok(!codes([long], [], { max_session_hours: 30 }).includes('l:long_session'));
  assert.ok(codes([s('o', '2026-11-16 09:00:00', { client_version: '4.9.9' })], [], { min_client_version: '5.0' }).includes('o:old_client'));
  assert.ok(!codes([s('o', '2026-11-16 09:00:00', { client_version: '10.0' })], [], { min_client_version: '5.0' }).includes('o:old_client'), '10 is newer than 5, not older');
});

test('totals: rows with no user or start are left out; a blank result counts as success', () => {
  const o = reviewSessions([s('a', '2026-11-16 09:00:00', { result: '' }), s('', '2026-11-16 09:00:00'), s('b', '')], [], {});
  assert.equal(o.sessions, 1); assert.equal(o.successful, 1); assert.deepEqual(o.countries, ['US']);
});
