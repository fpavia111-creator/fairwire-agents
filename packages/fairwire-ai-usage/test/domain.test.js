// AI usage: repeated prompts, sizes, models, cut-offs, payloads, tags and costs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewUsage, costOf } from '../src/index.js';

const r = (id, over = {}) => ({ request_id: id, app: 'bot', model: 'm-small', prompt_tokens: '1000', output_tokens: '100', cached_tokens: '0', stop_reason: 'end_turn', bytes: '4000', prompt: `a question that is long enough number ${id}`, ...over });
const codes = (o) => o.items.map((i) => i.code).sort();
const same = { prompt: 'Summarise the same long policy text for me' };

test('three uncached copies of a prompt are flagged with the extra tokens; cached copies do not count', () => {
  const o = reviewUsage([r('1', same), r('2', same), r('3', same), r('4', { ...same, cached_tokens: '900' })]);
  const f = o.items.find((i) => i.code === 'repeated_prompt');
  assert.equal(f.copies, 3); assert.equal(f.extra_tokens, 2000);
  assert.ok(!codes(reviewUsage([r('1', same), r('2', same)])).includes('repeated_prompt'));
  assert.ok(!codes(reviewUsage([r('1', same), r('2', same), r('3', same)], { repeat_min: 4 })).includes('repeated_prompt'));
});

test('a prompt hash column is used when the log has no prompt text, and short prompts are not compared', () => {
  const h = { prompt: '', prompt_hash: 'ABC123' };
  assert.ok(codes(reviewUsage([r('1', h), r('2', h), r('3', h)])).includes('repeated_prompt'));
  const short = { prompt: 'hi' };
  assert.ok(!codes(reviewUsage([r('1', short), r('2', short), r('3', short)])).includes('repeated_prompt'));
});

test('the prompt text is never in a finding', () => {
  const o = reviewUsage([r('1', same), r('2', same), r('3', same)]);
  assert.doesNotMatch(JSON.stringify(o.items), /policy text/);
});

test('large prompts, large payloads and cut-off answers follow their limits', () => {
  const o = reviewUsage([r('1', { prompt_tokens: '60000', bytes: '600000' }), r('2', { stop_reason: 'length' }), r('3', { stop_reason: 'max_tokens' }), r('4', { stop_reason: 'LENGTH' })]);
  assert.deepEqual(codes(o), ['cut_off_answers', 'large_payload', 'large_prompt']);
  assert.deepEqual(codes(reviewUsage([r('1', { prompt_tokens: '60000' })], { large_prompt_tokens: 70000 })), []);
});

test('tiny requests on a model you call large are flagged only when you list large models', () => {
  const tiny = Array.from({ length: 5 }, (_, k) => r(String(k), { model: 'm-big', prompt_tokens: '100', output_tokens: '20' }));
  assert.ok(!codes(reviewUsage(tiny)).includes('oversized_model'));
  assert.ok(codes(reviewUsage(tiny, { large_models: ['m-big'] })).includes('oversized_model'));
  assert.ok(!codes(reviewUsage(tiny.slice(0, 4), { large_models: ['m-big'] })).includes('oversized_model'));
});

test('costs come only from your price table, with cached input at its own price', () => {
  const prices = { 'm-small': { input_per_mtok: 2, output_per_mtok: 10, cached_per_mtok: 0.2 } };
  assert.equal(costOf({ model: 'm-small', prompt: 1000000, cached: 500000, output: 100000 }, prices), 2.1);
  assert.equal(costOf({ model: 'other', prompt: 1, cached: 0, output: 1 }, prices), null);
  const o = reviewUsage([r('1'), r('2', { model: 'other' })], { prices });
  assert.equal(o.cost, 0); assert.equal(o.by_model.other.cost, 0); assert.equal(reviewUsage([r('1')]).cost, null);
});

test('requests with no app are flagged once with their count', () => {
  const o = reviewUsage([r('1', { app: '' }), r('2', { app: '' }), r('3')]);
  const f = o.items.filter((i) => i.code === 'no_app_tag');
  assert.equal(f.length, 1); assert.equal(f[0].requests, 2); assert.equal(o.by_app['(no app)'].requests, 2);
});
