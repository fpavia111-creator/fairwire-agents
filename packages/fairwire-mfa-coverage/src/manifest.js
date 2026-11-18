import { readFileSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, AS_OF_ARG, settingsFrom, LIMITS, exportProfile, today } from 'fairwire-core';
import { USER_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewMfa } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  users: fileArg('MFA registration export under --root (Entra ID user registration details, Okta factors report, Google Workspace 2SV report or any CSV, Excel or JSON): one row per account with enabled, type, admin, MFA registered, methods, exclusion, last sign-in and last MFA use'),
  settings: SETTINGS_ARG('break_glass, weak_methods, strong_methods, unused_days'),
  as_of: AS_OF_ARG,
};

export const manifest = wireAgent({
  pkg, prefix: 'mfa', title: 'Fairwire MFA Coverage',
  description: 'Reviews MFA coverage from an identity provider export: admins without phishing-resistant MFA, active accounts with no MFA, accounts excluded from the policy, SMS or voice only, shared mailboxes that can sign in and MFA registered but never used. Names are masked for the model. Drafts notes; never changes a policy.',
  args, required: ['users'],
  sources: { users: { label: 'Accounts and MFA methods', args: ['users'], fields: USER_FIELDS, profiles: [exportProfile('entra_mfa_registration', { user: 'User principal name', display_name: 'User display name', is_admin: 'Is admin', mfa_registered: 'Is MFA registered', methods: 'Methods registered' })] } },
  configSchemas: { mfa_settings: SETTINGS_SCHEMA },
  run: (a, ctx) => reviewMfa(ctx.records(a.users, 'users'), settingsFrom(a, ctx, 'mfa_settings', DEFAULTS), a.as_of || today()),
  summary: (o) => `${o.active} active account(s) of ${o.accounts}, ${o.registered_pct}% with MFA, ${o.strong_pct}% phishing-resistant, ${o.admins} admin(s): ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Review MFA coverage', description: 'Review MFA registration per active account and list admins without strong MFA, accounts without MFA, exclusions, weak methods, shared accounts and unused MFA.' },
  explain: { arg: 'user', argSchema: { type: 'string', maxLength: 200, description: 'Account from mfa_check (the pseudonym is fine)' }, title: 'Explain one account', description: 'Every finding for one account.', match: (i, v, ctx) => i.key === v || (ctx.pii && ctx.pii.same(i.key, v, 'user')) },
  report: {
    title: 'MFA coverage', base: 'mfa-coverage',
    sections: (o) => [{ title: 'By department', rows: o.by_department, columns: ['department', 'users', 'registered'] }],
    limits: [LIMITS.files, 'Registration is not enforcement: an account can have MFA registered and still sign in without it where a policy allows that. Pair this with the sign-in log review (fairwire-sign-in-logs).', LIMITS.defaults, LIMITS.pii, LIMITS.live],
  },
  note: { noun: 'identity_note', verb: 'send', category: 'binding_send', actor: 'the identity owner', to: 'identity and security team', subject: 'MFA gaps to close', ask: 'Please close the admin gaps first, then contact each person without MFA.' },
  refused: [
    { name: 'idp_change_policy', category: 'production_deploy', description: 'Fairwire MFA Coverage never changes a conditional access or MFA policy.' },
    { name: 'idp_reset_methods', category: 'revoke_access', description: 'Fairwire MFA Coverage never resets or removes anyone\'s authentication methods.' },
  ],
  prompt: { title: 'Review MFA coverage', description: 'Walks the host model through an MFA review with Fairwire MFA Coverage.', text: 'You are helping an identity lead review MFA coverage with fairwire-mfa-coverage. Names are pseudonyms. 1. Call mfa_check; lead with admins without phishing-resistant MFA and accounts with none. 2. Use mfa_explain for an account. 3. Call mfa_write_report (the file has real names). 4. Offer mfa_draft_identity_note; mfa_request_send waits for one named click.' },
});
