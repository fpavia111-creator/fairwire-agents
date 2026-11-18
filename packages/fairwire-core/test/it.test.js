// IT helpers: addresses, ranges, ports, MACs, versions and dates.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCidr, inCidr, isPrivateIp, isPublicIp, cleanIp, isAny, parsePorts, portsInclude, portsCover, normMac, isRandomMac, versionCompare, hostKey, daysBetween, addDays, overlaps, hourOf, countBy, sortBy, humanBytes, yes, num, pct } from '../src/index.js';

test('it: CIDR ranges, private and public addresses', () => {
  const c = parseCidr('10.1.0.0/16');
  assert.equal(c.size, 65536); assert.ok(inCidr('10.1.200.7', c)); assert.ok(!inCidr('10.2.0.1', c));
  assert.equal(parseCidr('192.168.1.77/24').base, '192.168.1.0'); assert.equal(parseCidr('300.1.1.1'), null); assert.equal(parseCidr('10.0.0.0/33'), null);
  for (const ip of ['10.0.0.1', '172.20.1.1', '192.168.5.5', '100.64.1.1', '127.0.0.1', 'fd00::1', 'fe80::1']) assert.ok(isPrivateIp(ip), ip);
  for (const ip of ['203.0.113.10', '8.8.8.8', '2001:db8::1']) assert.ok(isPublicIp(ip), ip);
  assert.equal(cleanIp('10.0.0.5:443'), '10.0.0.5'); assert.equal(cleanIp('[fe80::1%eth0]'), 'fe80::1');
  assert.ok(isAny('any') && isAny('0.0.0.0/0') && isAny('*')); assert.ok(!isAny('10.0.0.0/8'));
});

test('it: port lists, ranges and coverage', () => {
  const p = parsePorts('tcp/80,443,8000-8010');
  assert.equal(p.count, 13); assert.ok(portsInclude(p, 8005)); assert.ok(!portsInclude(p, 22));
  assert.ok(parsePorts('any').any); assert.ok(parsePorts('1-65535').any); assert.ok(portsInclude(parsePorts('RDP'), 3389));
  assert.ok(portsCover(parsePorts('1-1024'), parsePorts('80,443'))); assert.ok(!portsCover(parsePorts('80'), parsePorts('80,443')));
});

test('it: MACs, versions, host names and bytes', () => {
  assert.equal(normMac('AA-BB-CC-00-11-22'), 'aa:bb:cc:00:11:22'); assert.equal(normMac('nope'), null);
  assert.ok(isRandomMac('da:a1:19:00:00:01')); assert.ok(!isRandomMac('00:1a:2b:3c:4d:5e'));
  assert.equal(versionCompare('10.0.19045', '10.0.22631'), -1); assert.equal(versionCompare('17.2', '17.2.0'), 0); assert.equal(versionCompare('9.1', '10.0'), -1);
  assert.equal(hostKey('LAPTOP-07.corp.example.'), 'laptop-07'); assert.equal(humanBytes(1500000), '1.5 MB');
});

test('it: dates, overlaps and hours as written', () => {
  assert.equal(daysBetween('2026-11-01', '2026-11-18'), 17); assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.ok(overlaps('2026-11-20T22:00', '2026-11-21T02:00', '2026-11-21T01:00', '2026-11-21T03:00'));
  assert.ok(!overlaps('2026-11-20T22:00', '2026-11-21T01:00', '2026-11-21T01:00', '2026-11-21T03:00'));
  assert.equal(hourOf('2026-11-20 23:15'), 23); assert.equal(hourOf('2026-11-20'), null);
});

test('it: counts and sorts do not depend on row order; loose yes/no and numbers', () => {
  const a = [{ k: 'b' }, { k: 'a' }, { k: 'b' }];
  assert.deepEqual(countBy(a, 'k'), countBy([...a].reverse(), 'k')); assert.deepEqual(Object.keys(countBy(a, 'k')), ['a', 'b']);
  assert.deepEqual(sortBy([{ s: 2, n: 'x' }, { s: 1, n: 'y' }, { s: 2, n: 'a' }], '-s', 'n').map((r) => r.n), ['a', 'x', 'y']);
  assert.equal(yes('Enabled'), true); assert.equal(yes('not registered'), false); assert.equal(yes('maybe'), null);
  assert.equal(num('1.234,56'), 1234.56); assert.equal(num(''), null); assert.equal(pct(1, 3), 33.3); assert.equal(pct(1, 0), 0);
});
