// DNS review: tunnelling signals, outside resolvers, blocked and failing lookups, chatty names.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewQueries, baseDomain } from '../src/index.js';

const q = (over = {}) => ({ client: '10.0.0.5', query: 'www.example.com', qtype: 'A', rcode: 'NOERROR', count: '1', resolver: '10.0.0.53', action: 'allowed', ...over });
const codes = (o) => o.items.map((i) => i.code).sort();
const randomish = (k) => `${'q7w8e9r0t1y2u3i4o5p6a7s8d9f0g1h2'}${String(k).padStart(3, '0')}x`;

test('base domains: two labels, or three for names like example.co.uk', () => {
  assert.equal(baseDomain('a.b.tunnel.example.net.'), 'example.net');
  assert.equal(baseDomain('mail.example.co.uk'), 'example.co.uk');
  assert.equal(baseDomain('localhost'), 'localhost');
});

test('ten long random labels under one domain from one client are a possible tunnel; nine are not; ignored domains never are', () => {
  const ten = Array.from({ length: 10 }, (_, k) => q({ query: `${randomish(k)}.t.example.net`, qtype: 'TXT' }));
  assert.deepEqual(codes(reviewQueries(ten)), ['possible_tunnel']);
  assert.deepEqual(codes(reviewQueries(ten.slice(0, 9))), []);
  assert.deepEqual(codes(reviewQueries(ten, { ignore_domains: ['example.net'] })), []);
});

test('a long label that repeats few characters does not look random', () => {
  const dull = Array.from({ length: 12 }, (_, k) => q({ query: `${'ab'.repeat(20)}${k}.example.net` }));
  assert.deepEqual(codes(reviewQueries(dull)), []);
});

test('outside resolvers are flagged only when your own resolvers are listed', () => {
  const rows = [q({ resolver: '8.8.8.8', count: '5' })];
  assert.deepEqual(codes(reviewQueries(rows)), []);
  assert.deepEqual(codes(reviewQueries(rows, { internal_resolvers: ['10.0.0.53'] })), ['outside_resolver']);
});

test('blocked lookups and NXDOMAIN shares use counts, not rows', () => {
  assert.deepEqual(codes(reviewQueries([q({ query: 'bad.example', action: 'Blocked', count: '10' })])), ['blocked_client']);
  assert.deepEqual(codes(reviewQueries([q({ query: 'bad.example', action: 'blocked', count: '9' })])), []);
  const nx = [q({ query: 'old.corp', rcode: 'nxdomain', count: '30' }), q({ count: '10' })];
  assert.deepEqual(codes(reviewQueries(nx)), ['nxdomain_client']);
  assert.deepEqual(codes(reviewQueries(nx, { nxdomain_share_pct: 80 })), []);
});

test('SERVFAIL share is judged per name across clients', () => {
  const rows = [q({ query: 'api.x.example', rcode: 'SERVFAIL', count: '3' }), q({ client: '10.0.0.6', query: 'api.x.example', rcode: 'SERVFAIL', count: '3' }), q({ query: 'api.x.example', count: '6' })];
  const o = reviewQueries(rows);
  assert.deepEqual(codes(o), ['servfail_name']); assert.equal(o.items[0].share_pct, 50);
  assert.deepEqual(codes(reviewQueries(rows.slice(0, 2))), [], 'six queries are under the minimum of ten');
});

test('a chatty name is per client and name; totals count repeats and skip rows with no client', () => {
  const o = reviewQueries([q({ count: '1000' }), q({ client: '10.0.0.6', count: '999' }), q({ client: '', count: '5' })]);
  assert.deepEqual(codes(o), ['chatty_name']); assert.equal(o.queries, 1999); assert.equal(o.clients, 2);
  assert.equal(o.repeated_pct, 99.9);
});
