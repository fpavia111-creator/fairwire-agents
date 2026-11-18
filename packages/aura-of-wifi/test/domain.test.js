// Wi-Fi: offline and outdated access points, channels, SSIDs, security, clients and rogues.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewWifi } from '../src/index.js';

const radio = (ap, over = {}) => ({ ap, site: 'HQ', model: 'M1', firmware: '2.0', status: 'online', last_seen: '2026-11-18 08:00:00', band: '5', channel: '36', utilization_pct: '20', ssid_count: '2', ...over });
const codes = (input, s = {}) => reviewWifi(input, s, '2026-11-18').items.map((i) => `${i.key}:${i.code}`).sort();

test('an access point is offline by status or by last contact beyond the limit', () => {
  assert.ok(codes({ aps: [radio('a', { status: 'Offline' })] }).includes('a:ap_offline'));
  assert.ok(codes({ aps: [radio('a', { last_seen: '2026-11-15 08:00:00' })] }).includes('a:ap_offline'));
  assert.ok(!codes({ aps: [radio('a', { last_seen: '2026-11-17 20:00:00' })] }).includes('a:ap_offline'));
});

test('firmware is compared within a model, or against your minimum', () => {
  const aps = [radio('a', { firmware: '2.0' }), radio('b', { firmware: '1.9.9' }), radio('c', { model: 'M2', firmware: '1.0' })];
  assert.deepEqual(codes({ aps }).filter((c) => c.endsWith('old_firmware')), ['b:old_firmware']);
  assert.deepEqual(codes({ aps }, { min_firmware: { M2: '1.5' } }).filter((c) => c.endsWith('old_firmware')), ['b:old_firmware', 'c:old_firmware']);
});

test('2.4 GHz channels other than 1, 6 and 11 are flagged; 5 GHz channels are not', () => {
  assert.ok(codes({ aps: [radio('a', { band: '2.4 GHz', channel: '4' })] }).includes('a:bad_24_channel'));
  assert.ok(!codes({ aps: [radio('a', { band: '2.4', channel: '6' })] }).includes('a:bad_24_channel'));
  assert.ok(!codes({ aps: [radio('a', { band: '5', channel: '44' })] }).includes('a:bad_24_channel'));
});

test('crowded channels and too many SSIDs follow the limits', () => {
  assert.ok(codes({ aps: [radio('a', { utilization_pct: '71' })] }).includes('a:crowded_channel'));
  assert.ok(!codes({ aps: [radio('a', { utilization_pct: '71' })] }, { utilization_max: 80 }).includes('a:crowded_channel'));
  assert.ok(codes({ aps: [radio('a', { ssid_count: '5' })] }).includes('a:too_many_ssids'));
});

test('WEP and TKIP are high, open is medium, open guest is low, disabled networks are skipped', () => {
  const o = reviewWifi({ ssids: [{ ssid: 'A', security: 'WEP-128' }, { ssid: 'B', security: 'WPA/WPA2 TKIP' }, { ssid: 'C', security: 'open' }, { ssid: 'Guest WiFi', security: 'Open' }, { ssid: 'D', security: 'open', enabled: 'no' }, { ssid: 'E', security: 'WPA3-SAE' }] }, {}, '2026-11-18');
  assert.deepEqual(o.items.map((i) => [i.key, i.severity]).sort(), [['A', 'high'], ['B', 'high'], ['C', 'medium'], ['Guest WiFi', 'low']]);
});

test('weak and sticky clients are counted per access point', () => {
  const clients = [...[1, 2, 3].map((k) => ({ client: `c${k}`, ap: 'a', band: '5', rssi: '-80', capable_5ghz: 'yes' })), ...[4, 5, 6].map((k) => ({ client: `c${k}`, ap: 'b', band: '2.4', rssi: '-50', capable_5ghz: 'yes' }))];
  assert.deepEqual(codes({ clients }), ['a:weak_clients', 'b:sticky_24_clients']);
  assert.deepEqual(codes({ clients }, { weak_clients_min: 4, sticky_min: 4 }), []);
});

test('a rogue counts when it is on the wire or copies your network name; neighbours do not', () => {
  const o = codes({ ssids: [{ ssid: 'Corp', security: 'WPA2' }], rogues: [{ bssid: 'aa-bb-cc-00-00-01', ssid: 'corp', on_wire: 'no' }, { bssid: 'aa:bb:cc:00:00:02', ssid: 'X', on_wire: 'Yes' }, { bssid: 'aa:bb:cc:00:00:03', ssid: 'Cafe', on_wire: 'no' }] });
  assert.deepEqual(o, ['aa:bb:cc:00:00:01:rogue_ap', 'aa:bb:cc:00:00:02:rogue_ap']);
});
