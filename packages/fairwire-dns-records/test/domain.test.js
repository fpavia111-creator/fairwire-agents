// DNS zones: takeover-prone CNAMEs, conflicts, private and foreign addresses, duplicates, TTLs, wildcards.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewZones } from '../src/index.js';

const r = (name, type, value, over = {}) => ({ zone: 'example.com', name, type, value, ttl: '3600', ...over });
const codes = (rows, s = {}) => reviewZones(rows, s).items.map((i) => `${i.key}:${i.code}`).sort();

test('names are made fully qualified from the zone; @ means the zone itself', () => {
  const o = reviewZones([r('@', 'A', '203.0.113.1'), r('www', 'CNAME', 'example.com.'), r('api.example.com.', 'A', '203.0.113.2')], {});
  assert.equal(o.names, 3); assert.equal(o.records, 3);
});

test('a CNAME to a cloud host is medium to confirm, high when your list of live resources lacks it', () => {
  const rows = [r('shop', 'CNAME', 'old-shop.herokuapp.com.')];
  assert.deepEqual(reviewZones(rows, {}).items.map((i) => [i.code, i.severity]), [['dangling_cname', 'medium']]);
  assert.deepEqual(reviewZones(rows, { active_cloud_hosts: ['other.herokuapp.com'] }).items.map((i) => [i.code, i.severity]), [['dangling_cname', 'high']]);
  assert.deepEqual(codes(rows, { active_cloud_hosts: ['old-shop.herokuapp.com.'] }), []);
  assert.deepEqual(codes([r('x', 'CNAME', 'host.mycdn.example')], { cloud_suffixes: ['mycdn.example'] }), ['x.example.com:dangling_cname']);
});

test('a CNAME next to other records at the same name is a conflict', () => {
  assert.deepEqual(codes([r('a', 'CNAME', 'b.example.net'), r('a', 'MX', '10 mail.example.com')]), ['a.example.com:cname_conflict']);
});

test('private addresses only matter in public zones; ownership only when ranges are given', () => {
  assert.deepEqual(codes([r('in', 'A', '10.0.0.5')]), ['in.example.com|10.0.0.5:private_ip_in_public_zone']);
  assert.deepEqual(codes([r('in', 'A', '10.0.0.5', { zone: 'corp.local' })], { public_zones: ['example.com'] }), []);
  assert.deepEqual(codes([r('x', 'A', '198.51.100.9')]), []);
  assert.deepEqual(codes([r('x', 'A', '198.51.100.9')], { owned_cidrs: ['203.0.113.0/24'] }), ['x.example.com|198.51.100.9:ip_not_owned']);
});

test('the same record twice is a duplicate, whatever the case or trailing dot', () => {
  assert.deepEqual(codes([r('Mail', 'a', '203.0.113.5'), r('mail.example.com.', 'A', '203.0.113.5')]), ['mail.example.com|A|203.0.113.5:duplicate_record']);
});

test('TTLs outside the limits and wildcards', () => {
  assert.deepEqual(codes([r('a', 'A', '203.0.113.5', { ttl: '10' })]), ['a.example.com|A|203.0.113.5:ttl_out_of_range']);
  assert.deepEqual(codes([r('a', 'A', '203.0.113.5', { ttl: '10' })], { ttl_min: 5 }), []);
  assert.deepEqual(codes([r('*.dev', 'A', '203.0.113.5')]), ['*.dev.example.com|A|203.0.113.5:wildcard_record']);
});

test('rows missing a name, type or value are left out', () => {
  assert.equal(reviewZones([r('', 'A', '1.2.3.4'), r('a', '', '1.2.3.4'), r('a', 'A', '')], {}).records, 0);
});

test('zone (master) files: $ORIGIN, $TTL, @, relative names, a blank owner, multi-line SOA and quoted semicolons', async () => {
  const { parseZoneFile, looksLikeZoneFile } = await import('../src/zonefile.js');
  const text = [
    '$ORIGIN example.org.', '$TTL 300', '@ IN SOA ns1 host ( 1 ; serial', '  2 3 4 5 )',
    'www 60 IN CNAME @', '    IN RRSIG CNAME 13 3 60 1 2 3 example.org. sig', 'txt IN TXT "a; b"', 'abs.other.org. IN A 192.0.2.1',
  ].join('\n');
  assert.ok(looksLikeZoneFile(text)); assert.ok(!looksLikeZoneFile('zone,name,type,value,ttl\nexample.com,www,A,192.0.2.1,300'));
  const { rows } = parseZoneFile(text);
  assert.deepEqual(rows.map((r) => [r.name, r.type, r.ttl]), [['example.org.', 'SOA', 300], ['www.example.org.', 'CNAME', 60], ['www.example.org.', 'RRSIG', 300], ['txt.example.org.', 'TXT', 300], ['abs.other.org.', 'A', 300]]);
  assert.equal(rows[1].value, 'example.org.'); assert.equal(rows[3].value, '"a; b"');
  const r = (await import('../src/logic.js')).reviewZones(rows);
  assert.ok(!r.items.some((i) => i.code === 'cname_conflict'), 'a DNSSEC signature beside a CNAME is not a conflict');
});
