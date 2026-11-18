// Email gateway: released threats, allow lists, outbound spam, pull-backs, targets, data-loss hits.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewMail } from '../src/index.js';

let n = 0;
const m = (over = {}) => ({ message_id: `M${++n}`, received_at: '2026-11-16 10:00:00', direction: 'Inbound', sender: 'a@x.example', recipient: 'b@corp.example', verdict: 'Clean', action: 'Delivered', allowlisted: 'no', clawed_back_at: '', dlp_rule: '', ...over });
const codes = (rows, s = {}) => reviewMail(rows, s).items.map((i) => i.code).sort();

test('a released phish or malware message is high; a released spam message is not', () => {
  assert.deepEqual(codes([m({ verdict: 'Phish', action: 'Released' })]), ['released_threat']);
  assert.deepEqual(codes([m({ verdict: 'Spam', action: 'Released' })]), []);
});

test('an allow-listed sender with any spammy verdict is flagged once per sender', () => {
  const o = reviewMail([m({ allowlisted: 'yes', verdict: 'Malware' }), m({ allowlisted: 'Yes', verdict: 'Spam' })], {});
  assert.equal(o.items.length, 1); assert.equal(o.items[0].messages, 2);
});

test('outbound spam needs the minimum from one mailbox', () => {
  const out = (k) => Array.from({ length: k }, () => m({ direction: 'Outbound', sender: 'rep@corp.example', verdict: 'Spam', action: 'Blocked' }));
  assert.deepEqual(codes(out(20)), ['outbound_spam']);
  assert.deepEqual(codes(out(19)), []);
  assert.deepEqual(codes(out(5), { outbound_spam_min: 5 }), ['outbound_spam']);
});

test('a pull-back later than the limit is medium; a quick one is fine', () => {
  assert.deepEqual(codes([m({ verdict: 'Phish', clawed_back_at: '2026-11-16 11:30:00' })]), ['late_clawback']);
  assert.deepEqual(codes([m({ verdict: 'Phish', clawed_back_at: '2026-11-16 10:20:00' })]), []);
});

test('most targeted counts inbound threats per person', () => {
  const t = Array.from({ length: 5 }, () => m({ verdict: 'Phish', action: 'Quarantined', recipient: 'ceo@corp.example' }));
  assert.deepEqual(codes(t), ['most_targeted']);
  assert.deepEqual(codes(t.slice(0, 4)), []);
});

test('data-loss hits are counted for internal senders only', () => {
  const d = (dir) => Array.from({ length: 3 }, () => m({ direction: dir, sender: 'x@corp.example', dlp_rule: 'Card numbers' }));
  assert.deepEqual(codes(d('Outbound')), ['dlp_hits']);
  assert.deepEqual(codes(d('Inbound')), []);
});

test('totals: direction, threats and the quarantined share of inbound mail', () => {
  const o = reviewMail([m({ action: 'Quarantined', verdict: 'Phish' }), m(), m({ direction: 'Outbound' }), { message_id: '' }], {});
  assert.deepEqual([o.messages, o.inbound, o.outbound, o.threats, o.quarantined_pct], [3, 2, 1, 1, 50]);
});
