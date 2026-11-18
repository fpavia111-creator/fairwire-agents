import { readFileSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, settingsFrom, LIMITS } from 'fairwire-core';
import { CALL_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewCalls } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  calls: fileArg('Call-detail or call-quality export under --root (phone system, SBC or UCaaS admin export as CSV, Excel or JSON): one row per call with id, start, duration, site, trunk, codec, MOS, loss, jitter and latency'),
  settings: SETTINGS_ARG('mos_min, loss_pct_max, jitter_ms_max, latency_ms_max, short_call_seconds, short_calls_min, poor_share_pct, min_calls'),
};

export const manifest = wireAgent({
  pkg, prefix: 'echo', title: 'Echo of VoIP',
  description: 'Reviews a call-detail or call-quality export: calls with low MOS, packet loss, jitter or latency over your limits, one-way audio, sites, trunks and hours where poor calls cluster, and numbers with many very short calls. Phone numbers are masked for the model. Drafts a ticket for the voice provider.',
  args, required: ['calls'],
  sources: { calls: { label: 'Calls', args: ['calls'], fields: CALL_FIELDS } },
  configSchemas: { echo_settings: SETTINGS_SCHEMA },
  run: (a, ctx) => reviewCalls(ctx.records(a.calls, 'calls'), settingsFrom(a, ctx, 'echo_settings', DEFAULTS)),
  summary: (o) => `${o.calls} call(s), ${o.minutes} minute(s), ${o.poor_calls} poor (${o.poor_pct}%): ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Review call quality', description: 'Check every call against your quality limits and list poor calls, one-way audio, sites, trunks and hours where poor calls cluster, and numbers with many short calls.' },
  explain: { arg: 'site', argSchema: { type: 'string', maxLength: 100, description: 'Site name, trunk or call id from echo_check' }, title: 'Explain one site, trunk or call', description: 'Every finding for one site, trunk or call id.', match: (i, v) => i.site === v || i.trunk === v || i.key === v },
  report: {
    title: 'Call quality review', base: 'echo-calls',
    sections: (o) => [{ title: 'By site', rows: o.sites, columns: ['site', 'calls', 'poor', 'poor_pct'] }, { title: 'By codec', rows: Object.entries(o.by_codec).map(([codec, calls]) => ({ codec, calls })), columns: ['codec', 'calls'] }],
    limits: [LIMITS.files, 'MOS, loss, jitter and latency are the figures your phone system or SBC exported; the agent does not measure calls. Calls with no quality figures are only checked for one-way audio and length.', LIMITS.defaults, LIMITS.pii],
  },
  note: { noun: 'provider_ticket', verb: 'send', category: 'binding_send', actor: 'the voice service owner', to: 'voice provider support', subject: 'Call quality problems for your review', ask: 'Please check your records for these calls and times and tell us what you find on your side.' },
  refused: [
    { name: 'pbx_change_codec', category: 'production_deploy', description: 'Echo never changes a codec, route or trunk on the phone system.' },
    { name: 'provider_ticket_submit', category: 'binding_send', description: 'Echo never opens a ticket with the provider itself; a person sends the reviewed draft.' },
  ],
  prompt: { title: 'Review call quality', description: 'Walks the host model through a call quality review with Echo.', text: 'You are helping an IT lead review call quality with echo-of-voip. Echo only reads the export; pbx_change_codec and provider_ticket_submit are refused. 1. Call echo_check and lead with one-way audio and sites where poor calls cluster. 2. Use echo_explain for a site or trunk. 3. Call echo_write_report. 4. Offer echo_draft_provider_ticket; echo_request_send waits for one named click.' },
});
