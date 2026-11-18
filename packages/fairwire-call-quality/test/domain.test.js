// Call quality: limits per call, one-way audio, clusters by site, trunk and hour, short calls.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewCalls, callProblems, DEFAULTS } from '../src/index.js';

const c = (id, over = {}) => ({ call_id: id, started_at: '2026-11-16 10:00:00', duration: '120', site: 'HQ', trunk: 't1', codec: 'G.711', mos: '4.3', loss_pct: '0.1', jitter_ms: '5', latency_ms: '40', packets_sent: '6000', packets_received: '5990', caller_number: `+1 555 0100 ${id.length}${id}`, ...over });
const codes = (r) => r.items.map((i) => i.code).sort();

test('each limit is checked on its own, and a call with no quality figures is not poor', () => {
  const s = DEFAULTS;
  assert.deepEqual(callProblems({ mos: 3.5, loss: null, jitter: null, latency: null }, s), ['MOS 3.5']);
  assert.deepEqual(callProblems({ mos: null, loss: 1.5, jitter: 31, latency: 151 }, s), ['loss 1.5%', 'jitter 31 ms', 'latency 151 ms']);
  assert.deepEqual(callProblems({ mos: null, loss: null, jitter: null, latency: null }, s), []);
});

test('a MOS under 3.1 makes a poor call high; other poor calls are medium', () => {
  const r = reviewCalls([c('A', { mos: '3.0' }), c('B', { mos: '3.4' })]);
  assert.deepEqual(r.items.filter((i) => i.code === 'poor_call').map((i) => [i.key, i.severity]).sort(), [['A', 'high'], ['B', 'medium']]);
});

test('one-way audio needs packets sent, almost none back, and a call of at least five seconds', () => {
  assert.ok(codes(reviewCalls([c('A', { packets_received: '0' })])).includes('one_way_audio'));
  assert.ok(codes(reviewCalls([c('A', { packets_received: '250' })])).includes('one_way_audio'), 'under 5% back');
  assert.ok(!codes(reviewCalls([c('A', { packets_received: '400' })])).includes('one_way_audio'));
  assert.ok(!codes(reviewCalls([c('A', { packets_received: '0', duration: '3' })])).includes('one_way_audio'));
});

test('a site needs enough calls and more than the share to be flagged', () => {
  const bad = (id) => c(id, { site: 'Shop', jitter_ms: '60' });
  const good = (id) => c(id, { site: 'Shop' });
  assert.ok(codes(reviewCalls([bad('1'), bad('2'), good('3'), good('4'), good('5')])).includes('site_poor_share'));
  assert.ok(!codes(reviewCalls([bad('1'), bad('2'), good('3')])).includes('site_poor_share'), 'only three calls');
  assert.ok(!codes(reviewCalls([bad('1'), bad('2'), good('3'), good('4'), good('5')], { poor_share_pct: 50 })).includes('site_poor_share'));
});

test('an hour is flagged at twice the overall poor share', () => {
  const rows = [...['1', '2', '3', '4', '5'].map((k) => c(`P${k}`, { started_at: '2026-11-16 14:10:00', loss_pct: '3' })), ...Array.from({ length: 15 }, (_, k) => c(`G${k}`, { started_at: '2026-11-16 09:10:00' }))];
  const r = reviewCalls(rows);
  assert.ok(r.items.some((i) => i.code === 'poor_hour' && i.key === '14:00'));
  assert.ok(!r.items.some((i) => i.code === 'poor_hour' && i.key === '09:00'));
});

test('three short calls from one number are flagged; two are not', () => {
  const s = (id, d) => c(id, { duration: d, caller_number: '+1 555 0199 001' });
  assert.ok(codes(reviewCalls([s('a', '4'), s('b', '9'), s('c', '2')])).includes('short_dropped_calls'));
  assert.ok(!codes(reviewCalls([s('a', '4'), s('b', '12'), s('c', '2')])).includes('short_dropped_calls'));
});

test('totals: minutes, poor share, codecs and sites worst first; rows without a call id are left out', () => {
  const r = reviewCalls([c('A', { duration: '90', site: 'X', mos: '2' }), c('B', { duration: '30', site: 'Y' }), { call_id: '', duration: '600' }]);
  assert.equal(r.calls, 2); assert.equal(r.minutes, 2); assert.equal(r.poor_pct, 50);
  assert.deepEqual(r.sites.map((x) => x.site), ['X', 'Y']); assert.deepEqual(r.by_codec, { 'G.711': 2 });
});
