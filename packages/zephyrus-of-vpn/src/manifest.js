import { readFileSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, settingsFrom, LIMITS } from 'fairwire-core';
import { SESSION_FIELDS, LEAVER_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewSessions } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  sessions: fileArg('VPN or remote-access log under --root (GlobalProtect, AnyConnect, FortiClient, WireGuard gateway or any CSV, Excel or JSON): one row per session or sign-in attempt with user, start, end, client address, country, result and client version'),
  leavers: fileArg('Optional list of people who left, with their last day (HR export)'),
  settings: SETTINGS_ARG('allowed_countries, travel_hours, burst_failures, burst_minutes, max_session_hours, min_client_version'),
};

export const manifest = wireAgent({
  pkg, prefix: 'zephyrus', title: 'Zephyrus of VPN',
  description: 'Reviews VPN and remote-access logs: leavers still connecting, one account in two countries at once, countries outside your list, failed sign-in bursts, shared accounts, sessions longer than your limit and old client versions. User names and client addresses are masked for the model. Drafts notes; never disables an account.',
  args, required: ['sessions'],
  sources: { sessions: { label: 'VPN sessions', args: ['sessions'], fields: SESSION_FIELDS }, leavers: { label: 'Leavers', args: ['leavers'], fields: LEAVER_FIELDS } },
  configSchemas: { zephyrus_settings: SETTINGS_SCHEMA },
  run: (a, ctx) => reviewSessions(ctx.records(a.sessions, 'sessions'), a.leavers ? ctx.records(a.leavers, 'leavers') : [], settingsFrom(a, ctx, 'zephyrus_settings', DEFAULTS)),
  summary: (o) => `${o.sessions} session(s) and sign-in(s) for ${o.users} account(s), ${o.failed} failed, from ${o.countries.length} countr(ies): ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Review remote access', description: 'Review the VPN log by account and list leavers connecting, impossible travel, countries outside your list, failed bursts, shared accounts, long sessions and old clients.' },
  explain: { arg: 'user', argSchema: { type: 'string', maxLength: 200, description: 'Account from zephyrus_check (the pseudonym is fine)' }, title: 'Explain one account', description: 'Every finding for one account.', match: (i, v, ctx) => i.key === v || (ctx.pii && ctx.pii.same(i.key, v, 'user')) },
  report: {
    title: 'Remote access review', base: 'zephyrus-vpn',
    sections: (o) => [{ title: 'By user', rows: [...new Set(o.items.map((i) => i.key))].map((user) => ({ user, findings: o.items.filter((i) => i.key === user).map((i) => i.code).join(' ') })), columns: ['user', 'findings'] }],
    limits: [LIMITS.files, 'Countries are the ones your gateway wrote; a VPN or mobile network can place a person in another country, so two countries is a question to ask, not proof.', LIMITS.defaults, LIMITS.pii, LIMITS.live],
  },
  note: { noun: 'access_note', verb: 'send', category: 'binding_send', actor: 'the identity owner', to: 'security and identity team', subject: 'Remote access to check', ask: 'Please confirm each item with the person or their manager before any account is disabled.' },
  refused: [
    { name: 'vpn_disconnect_session', category: 'revoke_access', description: 'Zephyrus never disconnects a session or disables an account; the identity owner does.' },
    { name: 'gateway_block_country', category: 'production_deploy', description: 'Zephyrus never changes the VPN gateway.' },
  ],
  prompt: { title: 'Review remote access', description: 'Walks the host model through a VPN log review with Zephyrus.', text: 'You are helping a security lead review VPN logs with zephyrus-of-vpn. Names are pseudonyms; Zephyrus never disconnects anyone. 1. Call zephyrus_check; lead with leavers connecting and two places at once. 2. Use zephyrus_explain with the pseudonym. 3. Call zephyrus_write_report (the file has real names, for the team). 4. Offer zephyrus_draft_access_note; zephyrus_request_send waits for one named click.' },
});
