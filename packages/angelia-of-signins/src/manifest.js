import { readFileSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, settingsFrom, LIMITS, exportProfile } from 'fairwire-core';
import { SIGNIN_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewSignins } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  signins: fileArg('Sign-in log under --root (Entra ID sign-in logs, Okta System Log, Google Workspace login audit or any CSV, Excel or JSON): one row per sign-in with time, account, app, address, country, result, failure reason, client app and whether it was interactive'),
  settings: SETTINGS_ARG('allowed_countries, spray_users, spray_minutes, burst_failures, burst_minutes, travel_hours, service_accounts'),
};
const PROFILES = [
  exportProfile('entra_signins', { at: 'Date (UTC)', user: 'User principal name', app: 'Application', client_ip: 'IP address', country: 'Location', result: 'Status', failure_reason: 'Failure reason', client_app: 'Client app' }),
  exportProfile('okta_system_log', { at: 'published', user: 'actor.alternateId', client_ip: 'client.ipAddress', country: 'client.geographicalContext.country', result: 'outcome.result', failure_reason: 'outcome.reason' }),
];

export const manifest = wireAgent({
  pkg, prefix: 'angelia', title: 'Angelia of Sign-ins',
  description: 'Reviews identity provider sign-in logs: password spraying from one address, a success right after many failures, one account in two countries at once, legacy protocols, countries outside your list, service accounts used by people, failed bursts and attempts on disabled accounts. Accounts and addresses are masked for the model. Drafts notes; never blocks an account.',
  args, required: ['signins'],
  sources: { signins: { label: 'Sign-ins', args: ['signins'], fields: SIGNIN_FIELDS, profiles: PROFILES } },
  configSchemas: { angelia_settings: SETTINGS_SCHEMA },
  run: (a, ctx) => reviewSignins(ctx.records(a.signins, 'signins'), settingsFrom(a, ctx, 'angelia_settings', DEFAULTS)),
  summary: (o) => `${o.events} sign-in(s) for ${o.accounts} account(s) from ${o.addresses} address(es), ${o.failures} failed: ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Review sign-in logs', description: 'Review the sign-in log and list spraying, guessed passwords, impossible travel, legacy protocols, countries, service accounts, failed bursts and disabled-account attempts.' },
  explain: { arg: 'account', argSchema: { type: 'string', maxLength: 300, description: 'Account or address from angelia_check (a pseudonym is fine)' }, title: 'Explain one account or address', description: 'Every finding for one account or source address.', match: (i, v, ctx) => i.key === v || (ctx.pii && (ctx.pii.same(i.key, v, 'user') || ctx.pii.same(i.key, v, 'ip'))) },
  report: {
    title: 'Sign-in log review', base: 'angelia-signins',
    limits: [LIMITS.files, 'Countries come from the identity provider\'s address lookup, which can be wrong for mobile networks and VPNs; two countries is a question, not proof.', 'The log shows what the identity provider saw; sign-ins to apps that do not use it are not here.', LIMITS.defaults, LIMITS.pii, LIMITS.live],
  },
  note: { noun: 'security_note', verb: 'send', category: 'binding_send', actor: 'the identity owner', to: 'security operations and identity team', subject: 'Sign-in activity to investigate', ask: 'Please investigate the high items today and confirm each one with the account owner before blocking anything.' },
  refused: [
    { name: 'idp_block_user', category: 'revoke_access', description: 'Angelia never blocks an account, revokes sessions or resets a password.' },
    { name: 'idp_add_named_location', category: 'production_deploy', description: 'Angelia never changes sign-in policies or named locations.' },
  ],
  prompt: { title: 'Review sign-in logs', description: 'Walks the host model through a sign-in review with Angelia.', text: 'You are helping a security lead review sign-in logs with angelia-of-signins. Accounts and addresses are pseudonyms. 1. Call angelia_check; lead with spraying, successes after failures and impossible travel. 2. Use angelia_explain with a pseudonym. 3. Call angelia_write_report (the file has real values, for the team). 4. Offer angelia_draft_security_note; angelia_request_send waits for one named click.' },
});
