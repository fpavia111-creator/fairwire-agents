// Flow review: the edge, cleartext, uploads, scans, shares and packet sizes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewFlows, readFlows } from '../src/index.js';

const f = (over = {}) => ({ start: '2026-11-16 10:00:00', src_ip: '10.0.0.5', dst_ip: '198.51.100.9', dst_port: '443', protocol: 'tcp', bytes: '1000', packets: '10', ...over });
const codes = (r) => r.items.map((i) => i.code).sort();

test('an outside address on RDP is high; the same port allowed in settings, or reached from inside, is not', () => {
  const rows = [f({ src_ip: '203.0.113.5', dst_ip: '10.0.0.20', dst_port: '3389' })];
  assert.deepEqual(codes(reviewFlows(rows)), ['inbound_risky_port', 'top_talker_share']);
  assert.ok(!codes(reviewFlows(rows, { allowed_inbound: ['10.0.0.20:3389'] })).includes('inbound_risky_port'));
  assert.ok(!codes(reviewFlows([f({ src_ip: '10.0.0.7', dst_ip: '10.0.0.20', dst_port: '3389' })])).includes('inbound_risky_port'));
});

test('internal_cidrs replace the private ranges when given', () => {
  const rows = [f({ src_ip: '10.9.9.9', dst_ip: '100.70.0.4', dst_port: '445' })];
  assert.ok(!codes(reviewFlows(rows)).includes('inbound_risky_port'), 'both private by default');
  assert.ok(codes(reviewFlows(rows, { internal_cidrs: ['100.64.0.0/10'] })).includes('inbound_risky_port'), 'only 100.64/10 is inside');
});

test('Telnet across the edge is high, HTTP is medium, and a protocol name with no port is still caught', () => {
  const r = reviewFlows([f({ dst_port: '23' }), f({ src_ip: '10.0.0.6', dst_port: '80' }), f({ src_ip: '10.0.0.7', dst_port: '', protocol: 'ftp' })]);
  const clear = r.items.filter((i) => i.code === 'cleartext_protocol').map((i) => [i.key, i.severity]).sort();
  assert.deepEqual(clear, [['10.0.0.5:23', 'high'], ['10.0.0.6:80', 'medium'], ['10.0.0.7:21', 'high']]);
});

test('an upload over the limit at night or at the weekend is flagged; the same bytes at 10:00 on a Monday are not', () => {
  const big = { dst_ip: '203.0.113.200', bytes: '600000000', packets: '400000' };
  assert.ok(codes(reviewFlows([f({ ...big, start: '2026-11-16 23:30:00' })])).includes('large_upload_after_hours'));
  assert.ok(codes(reviewFlows([f({ ...big, start: '2026-11-15 12:00:00' })])).includes('large_upload_after_hours'), 'Sunday');
  assert.ok(!codes(reviewFlows([f({ ...big, start: '2026-11-16 10:00:00' })])).includes('large_upload_after_hours'));
  assert.ok(!codes(reviewFlows([f({ ...big, start: '2026-11-16 23:30:00' })], { large_upload_bytes: 1e9 })).includes('large_upload_after_hours'));
});

test('many ports with tiny flows is a possible scan; ports with real traffic are not', () => {
  const tiny = Array.from({ length: 20 }, (_, k) => f({ dst_ip: '10.0.0.30', dst_port: String(2000 + k), bytes: '60', packets: '1' }));
  assert.ok(codes(reviewFlows(tiny)).includes('possible_port_scan'));
  assert.ok(!codes(reviewFlows(tiny.slice(0, 19))).includes('possible_port_scan'));
  assert.ok(!codes(reviewFlows(tiny.map((r) => ({ ...r, packets: '50' })))).includes('possible_port_scan'));
});

test('shares and small packets follow the settings', () => {
  const rows = [f({ bytes: '600', packets: '1200' }), f({ src_ip: '10.0.0.6', bytes: '400', packets: '4' })];
  const r = reviewFlows(rows);
  assert.ok(r.items.some((i) => i.code === 'top_talker_share' && i.key === '10.0.0.5' && i.share_pct === 60));
  assert.ok(r.items.some((i) => i.code === 'small_packets' && i.key === '10.0.0.5'));
  assert.ok(!codes(reviewFlows(rows, { top_share_pct: 70, min_packets: 5000 })).some((c) => c === 'top_talker_share' || c === 'small_packets'));
});

test('rows with bad addresses are skipped and counted; ports in exports with brackets or a port suffix still read', () => {
  const { flows, skipped } = readFlows([f({ src_ip: 'n/a' }), f({ src_ip: '10.0.0.5:51515', dst_ip: '[2001:db8::7]' })]);
  assert.equal(skipped, 1); assert.equal(flows.length, 1); assert.equal(flows[0].src, '10.0.0.5'); assert.equal(flows[0].dst, '2001:db8::7');
  const r = reviewFlows([]); assert.equal(r.flows, 0); assert.deepEqual(r.items, []);
});
