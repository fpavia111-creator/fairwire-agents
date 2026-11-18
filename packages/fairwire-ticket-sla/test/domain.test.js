// Ticket SLAs: priorities, resolution and response targets, assignment, holds, reopens, team rates.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewTickets, priorityOf } from '../src/index.js';

// The first response comes an hour after opening unless a test sets it.
const plusHour = (d) => new Date(Date.parse(d.replace(' ', 'T') + 'Z') + 3600000).toISOString().slice(0, 19).replace('T', ' ');
const t = (id, over = {}) => { const opened = over.opened_at || '2026-11-18 08:00:00'; return { ticket: id, priority: 'P3', opened_at: opened, first_response_at: /^[0-9]{4}/.test(opened) ? plusHour(opened) : '', resolved_at: '', state: 'In Progress', team: 'Desk', assignee: 'Agent', reopen_count: '0', ...over }; };
const codes = (rows, s = {}, asOf = '2026-11-18') => reviewTickets(rows, s, asOf).items.map((i) => `${i.key}:${i.code}`).sort();

test('priorities are read from numbers and words', () => {
  assert.deepEqual(['1 - Critical', 'P2', 'High', 'Moderate', 'Low', '', 'Highest'].map(priorityOf), ['P1', 'P2', 'P2', 'P3', 'P4', 'P3', 'P1']);
});

test('an open ticket past its resolution target is breached; P1 and P2 are high', () => {
  const o = reviewTickets([t('a', { priority: 'P2', opened_at: '2026-11-17 08:00:00' }), t('b', { opened_at: '2026-11-14 08:00:00' })], {}, '2026-11-18');
  assert.deepEqual(o.items.filter((i) => i.code === 'resolution_breached').map((i) => [i.key, i.severity]).sort(), [['a', 'high'], ['b', 'medium']]);
  assert.deepEqual(codes([t('a', { opened_at: '2026-11-17 08:00:00' })]), [], 'P3 inside 72 hours');
});

test('resolved tickets are not open breaches but count for the team', () => {
  const rows = ['1', '2', '3'].map((k) => t(k, { opened_at: '2026-11-01 08:00:00', resolved_at: '2026-11-10 08:00:00', state: 'Resolved', team: 'Apps' }));
  assert.deepEqual(codes(rows), ['Apps:team_breach_rate']);
  assert.deepEqual(codes(rows.slice(0, 2)), [], 'a team needs at least three tickets');
});

test('response: missing past the target, or late when it came', () => {
  assert.ok(codes([t('a', { first_response_at: '', opened_at: '2026-11-18 08:00:00' })]).includes('a:response_breached'));
  assert.ok(codes([t('a', { first_response_at: '2026-11-18 20:00:00' })]).includes('a:response_breached'));
  assert.ok(!codes([t('a', { first_response_at: '2026-11-18 20:00:00' })], { response_hours: { P3: 24 } }).includes('a:response_breached'));
});

test('no assignee after a day; on hold beyond the limit; reopened twice', () => {
  assert.ok(codes([t('a', { assignee: '', opened_at: '2026-11-17 08:00:00' })]).includes('a:no_assignee'));
  assert.ok(!codes([t('a', { assignee: '' })]).includes('a:no_assignee'));
  assert.ok(codes([t('a', { state: 'Pending vendor', opened_at: '2026-11-08 08:00:00', priority: 'P4' })]).includes('a:parked_on_hold'));
  assert.ok(codes([t('a', { reopen_count: '2' })]).includes('a:reopened_often'));
});

test('aging buckets count open tickets by age', () => {
  const o = reviewTickets([t('a'), t('b', { opened_at: '2026-11-15 08:00:00' }), t('c', { opened_at: '2026-10-25 08:00:00' }), t('d', { opened_at: '2026-09-01 08:00:00' }), t('e', { state: 'Closed' })], { resolve_hours: { P3: 99999 } }, '2026-11-18');
  assert.deepEqual(o.aging, { under_1_day: 1, '1_to_7_days': 1, '8_to_30_days': 1, over_30_days: 1 }); assert.equal(o.open_tickets, 4);
});

test('rows without a ticket number or opened time are left out', () => {
  assert.equal(reviewTickets([t(''), t('a', { opened_at: 'soon' }), t('b')], {}, '2026-11-18').tickets, 1);
});
