// Retries: grouping by request, Retry-After, client errors, back-off, spend, exhaustion, 5xx rate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewRetries } from '../src/index.js';

const at = (s) => new Date(Date.UTC(2026, 10, 16, 9, 0, 0) + s * 1000).toISOString().slice(0, 19).replace('T', ' ');
const a = (id, n, s, status, over = {}) => ({ request_id: id, attempt: String(n), at: at(s), endpoint: '/v1/x', status: String(status), tokens: '100', bytes: '1000', ...over });
const codes = (o) => o.items.map((i) => i.code).sort();

test('attempts are grouped by request id whatever the row order, and only attempts after the first are retries', () => {
  const o = reviewRetries([a('r1', 2, 5, 200), a('r1', 1, 0, 503), a('r2', 1, 0, 200)]);
  assert.equal(o.requests, 2); assert.equal(o.attempts, 3); assert.equal(o.retries, 1); assert.equal(o.retry_tokens, 100);
});

test('a retry sooner than Retry-After is high; waiting long enough is fine', () => {
  assert.ok(codes(reviewRetries([a('r', 1, 0, 429, { retry_after: '30' }), a('r', 2, 10, 200)])).includes('retry_after_ignored'));
  assert.ok(!codes(reviewRetries([a('r', 1, 0, 429, { retry_after: '30' }), a('r', 2, 31, 200)])).includes('retry_after_ignored'));
});

test('retrying a 400 or 404 is flagged; 408, 409, 425 and 429 are retryable', () => {
  assert.ok(codes(reviewRetries([a('r', 1, 0, 404), a('r', 2, 5, 404)])).includes('retry_on_client_error'));
  for (const st of [408, 409, 425, 429]) assert.ok(!codes(reviewRetries([a('r', 1, 0, st), a('r', 2, 5, 200)])).includes('retry_on_client_error'), String(st));
  assert.ok(!codes(reviewRetries([a('r', 1, 0, 422), a('r', 2, 5, 200)], { retryable_4xx: [422] })).includes('retry_on_client_error'));
});

test('no back-off: gaps under the minimum or gaps that do not grow', () => {
  assert.ok(codes(reviewRetries([a('r', 1, 0, 503), a('r', 2, 0.5, 200)])).includes('no_backoff'));
  assert.ok(codes(reviewRetries([a('r', 1, 0, 503), a('r', 2, 2, 503), a('r', 3, 4, 200)])).includes('no_backoff'), 'two equal waits');
  assert.ok(!codes(reviewRetries([a('r', 1, 0, 503), a('r', 2, 2, 503), a('r', 3, 6, 200)])).includes('no_backoff'), 'growing waits');
});

test('retry spend uses the larger of the token and byte shares', () => {
  const o = reviewRetries([a('r', 1, 0, 503, { tokens: '0', bytes: '1000' }), a('r', 2, 3, 200, { tokens: '0', bytes: '1000' }), ...Array.from({ length: 3 }, (_, k) => a(`ok${k}`, 1, 10 + k, 200, { tokens: '0', bytes: '1000' }))]);
  const f = o.items.find((i) => i.code === 'retry_spend'); assert.equal(f.share_pct, 20);
  assert.ok(!codes(reviewRetries([a('r', 1, 0, 503, { tokens: '0', bytes: '1000' }), a('r', 2, 3, 200, { tokens: '0', bytes: '1000' })], { retry_share_pct: 60 })).includes('retry_spend'));
});

test('a request that ends in any error after retries is exhausted; one that ends in 200 is not', () => {
  assert.ok(codes(reviewRetries([a('r', 1, 0, 500), a('r', 2, 3, 400)])).includes('retries_exhausted'));
  assert.ok(!codes(reviewRetries([a('r', 1, 0, 500), a('r', 2, 3, 200)])).includes('retries_exhausted'));
  assert.ok(!codes(reviewRetries([a('r', 1, 0, 500)])).includes('retries_exhausted'), 'no retry, nothing exhausted');
});

test('the 5xx rate counts first attempts per endpoint; rows with no request id are ignored', () => {
  const rows = [a('r1', 1, 0, 500), ...Array.from({ length: 19 }, (_, k) => a(`ok${k}`, 1, k + 1, 200)), { request_id: '', status: '500' }];
  const o = reviewRetries(rows); assert.equal(o.requests, 20);
  assert.ok(!codes(o).includes('server_error_rate'), 'exactly 5% is not over 5%');
  assert.ok(codes(reviewRetries(rows, { server_error_pct: 4 })).includes('server_error_rate'));
});
