// Fairwire Call Quality: call quality review from call-detail or call-quality exports. Pure functions.
import { num, str, hourOf, pct, round1, finding } from 'fairwire-core';

export const CHECKS = Object.freeze({
  poor_call: 'A call with MOS, packet loss, jitter or one-way latency outside your limits (high when MOS is under 3.1).',
  one_way_audio: 'A call where one side received (almost) no audio packets.',
  site_poor_share: 'A site where more than your share of calls were poor.',
  trunk_poor_share: 'A trunk or carrier where more than your share of calls were poor.',
  poor_hour: 'An hour of the day with at least twice the overall share of poor calls (a sign of congestion).',
  short_dropped_calls: 'One number with several calls shorter than your limit (dropped or failed calls).',
});

export const CALL_FIELDS = Object.freeze({
  call_id: { aliases: ['Call ID', 'CallID', 'Call-ID', 'Session ID', 'Record ID', 'Unique ID'], required: true },
  started_at: { type: 'datetime', aliases: ['Start Time', 'Start', 'Call Start', 'Date/Time', 'Timestamp', 'Setup Time'] },
  duration: { type: 'number', aliases: ['Duration', 'Duration (s)', 'Duration (sec)', 'billsec', 'Call Duration', 'Talk Time'] },
  site: { aliases: ['Site', 'Location', 'Branch', 'Office'] },
  trunk: { aliases: ['Trunk', 'Carrier', 'Gateway', 'SIP Trunk', 'Route'] },
  codec: { aliases: ['Codec', 'Codec Name', 'Audio Codec', 'Payload'] },
  mos: { type: 'number', aliases: ['MOS', 'MOS Score', 'Avg MOS', 'Mean Opinion Score', 'Quality'] },
  loss_pct: { type: 'number', aliases: ['Packet Loss %', 'Loss %', 'Packet Loss', 'Loss', 'Lost Packets %'] },
  jitter_ms: { type: 'number', aliases: ['Jitter', 'Jitter (ms)', 'Avg Jitter', 'Max Jitter'] },
  latency_ms: { type: 'number', aliases: ['Latency', 'Latency (ms)', 'One-way Delay', 'Delay (ms)', 'RTT/2'] },
  packets_sent: { type: 'number', aliases: ['Packets Sent', 'RTP Packets Sent', 'Tx Packets'] },
  packets_received: { type: 'number', aliases: ['Packets Received', 'RTP Packets Received', 'Rx Packets'] },
  caller_number: { aliases: ['Caller', 'Calling Number', 'From', 'Source Number', 'ANI', 'Caller ID'], pii: 'phone' },
});

export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  mos_min: { type: 'number', minimum: 1, maximum: 5, description: 'Lowest acceptable MOS (default 3.6)' },
  loss_pct_max: { type: 'number', minimum: 0, maximum: 100, description: 'Highest acceptable packet loss in percent (default 1)' },
  jitter_ms_max: { type: 'number', minimum: 0, description: 'Highest acceptable jitter in ms (default 30)' },
  latency_ms_max: { type: 'number', minimum: 0, description: 'Highest acceptable one-way latency in ms (default 150)' },
  short_call_seconds: { type: 'number', minimum: 1, description: 'Calls shorter than this count as possibly dropped (default 10)' },
  short_calls_min: { type: 'integer', minimum: 2, description: 'Short calls from one number before it is flagged (default 3)' },
  poor_share_pct: { type: 'number', minimum: 1, maximum: 100, description: 'Share of poor calls above which a site or trunk is flagged (default 20)' },
  min_calls: { type: 'integer', minimum: 1, description: 'Calls a site, trunk or hour needs before shares are judged (default 5)' },
} };
export const DEFAULTS = Object.freeze({ mos_min: 3.6, loss_pct_max: 1, jitter_ms_max: 30, latency_ms_max: 150, short_call_seconds: 10, short_calls_min: 3, poor_share_pct: 20, min_calls: 5 });

/** Which limits a call breaks: [] when none or when no quality figures were exported. */
export function callProblems(c, s) {
  const p = [];
  if (c.mos !== null && c.mos < s.mos_min) p.push(`MOS ${c.mos}`);
  if (c.loss !== null && c.loss > s.loss_pct_max) p.push(`loss ${c.loss}%`);
  if (c.jitter !== null && c.jitter > s.jitter_ms_max) p.push(`jitter ${c.jitter} ms`);
  if (c.latency !== null && c.latency > s.latency_ms_max) p.push(`latency ${c.latency} ms`);
  return p;
}

export function reviewCalls(rows, settings = {}) {
  const s = { ...DEFAULTS, ...settings };
  const calls = rows.filter((r) => str(r.call_id)).map((r) => ({
    id: str(r.call_id), at: str(r.started_at), duration: num(r.duration), site: str(r.site) || '(no site)', trunk: str(r.trunk) || '(no trunk)', codec: str(r.codec) || '(unknown)',
    mos: num(r.mos), loss: num(r.loss_pct), jitter: num(r.jitter_ms), latency: num(r.latency_ms), sent: num(r.packets_sent), received: num(r.packets_received), caller: str(r.caller_number),
  }));
  const items = []; let poor = 0;
  const groups = { site: new Map(), trunk: new Map(), hour: new Map() };
  const bump = (m, k, bad) => { const e = m.get(k) || { calls: 0, poor: 0 }; e.calls++; if (bad) e.poor++; m.set(k, e); };
  for (const c of calls) {
    const probs = callProblems(c, s); const bad = probs.length > 0; if (bad) poor++;
    if (bad) items.push(finding('poor_call', c.mos !== null && c.mos < 3.1 ? 'high' : 'medium', c.id, `Call ${c.id} at ${c.site} on ${c.trunk} (${c.codec}) had ${probs.join(', ')}.`, 'Check the site\'s uplink and QoS markings at that time; if it repeats, raise it with the carrier.', { subject: c.site, site: c.site, trunk: c.trunk }));
    if (c.sent !== null && c.sent > 0 && c.received !== null && c.received < c.sent * 0.05 && (c.duration ?? 0) >= 5) items.push(finding('one_way_audio', 'high', c.id, `Call ${c.id} at ${c.site} sent ${c.sent} audio packets but received ${c.received}: the caller probably heard nothing.`, 'Check NAT and firewall rules for RTP (SIP ALG is a common cause) at that site.', { subject: c.site, site: c.site }));
    bump(groups.site, c.site, bad); bump(groups.trunk, c.trunk, bad);
    const h = hourOf(c.at); if (h !== null) bump(groups.hour, String(h).padStart(2, '0'), bad);
  }
  const overall = calls.length ? poor / calls.length : 0;
  for (const [site, e] of groups.site) { const sh = pct(e.poor, e.calls); if (e.calls >= s.min_calls && sh > s.poor_share_pct) items.push(finding('site_poor_share', 'high', site, `${sh}% of calls at ${site} were poor (${e.poor} of ${e.calls}).`, 'Look at the site\'s internet link, Wi-Fi and QoS before blaming the phones.', { site, share_pct: sh })); }
  for (const [trunk, e] of groups.trunk) { const sh = pct(e.poor, e.calls); if (e.calls >= s.min_calls && sh > s.poor_share_pct) items.push(finding('trunk_poor_share', 'medium', trunk, `${sh}% of calls on ${trunk} were poor (${e.poor} of ${e.calls}).`, 'Send the carrier the call ids and times; ask for their own quality records.', { trunk, share_pct: sh })); }
  for (const [hour, e] of groups.hour) { const sh = e.calls ? e.poor / e.calls : 0; if (e.calls >= s.min_calls && overall > 0 && sh >= 2 * overall) items.push(finding('poor_hour', 'low', `${hour}:00`, `${round1(sh * 100)}% of calls between ${hour}:00 and ${hour}:59 were poor, against ${round1(overall * 100)}% overall.`, 'Check what else uses the link at that hour (backups, updates, video).', { share_pct: round1(sh * 100) })); }
  const shortBy = new Map();
  for (const c of calls) if (c.caller && c.duration !== null && c.duration < s.short_call_seconds) shortBy.set(c.caller, [...(shortBy.get(c.caller) || []), c]);
  for (const [caller, list] of shortBy) if (list.length >= s.short_calls_min) items.push(finding('short_dropped_calls', 'medium', caller, `${caller} had ${list.length} calls shorter than ${s.short_call_seconds} seconds (${list.map((c) => c.id).sort().join(', ')}).`, 'Ask the user whether calls are dropping; check the handset or softphone and its network.', { subject: list[0].site, calls: list.length }));
  const byCodec = {}; for (const c of calls) byCodec[c.codec] = (byCodec[c.codec] || 0) + 1;
  return {
    calls: calls.length, minutes: round1(calls.reduce((t, c) => t + (c.duration || 0), 0) / 60), poor_calls: poor, poor_pct: pct(poor, calls.length),
    by_codec: Object.fromEntries(Object.entries(byCodec).sort(([a], [b]) => (a < b ? -1 : 1))),
    sites: [...groups.site.entries()].map(([site, e]) => ({ site, calls: e.calls, poor: e.poor, poor_pct: pct(e.poor, e.calls) })).sort((a, b) => b.poor_pct - a.poor_pct || (a.site < b.site ? -1 : 1)),
    items,
  };
}
