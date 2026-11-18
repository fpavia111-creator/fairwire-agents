import { readFileSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, AS_OF_ARG, settingsFrom, LIMITS, today } from 'fairwire-core';
import { ROLE_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewAdmins } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  roles: fileArg('Privileged role export under --root (Entra ID role assignments or PIM export, Active Directory admin groups, Okta or Google admin roles as CSV, Excel or JSON): one row per account and role with assignment type, user type, MFA, mailbox, last sign-in and break-glass flag'),
  settings: SETTINGS_ARG('global_roles, max_global_admins, require_jit, break_glass_accounts, stale_admin_days, break_glass_signin_days'),
  as_of: AS_OF_ARG,
};

export const manifest = wireAgent({
  pkg, prefix: 'arke', title: 'Arke of Admins',
  description: 'Reviews privileged role assignments: more top admins than your cap, guests with admin roles, admins without MFA, break-glass accounts that signed in or have no note, standing assignments where you use just-in-time, admin accounts that also read mail and admins who no longer sign in. Names are masked for the model. Drafts notes; never removes a role.',
  args, required: ['roles'],
  sources: { roles: { label: 'Admin role assignments', args: ['roles'], fields: ROLE_FIELDS } },
  configSchemas: { arke_settings: SETTINGS_SCHEMA },
  run: (a, ctx) => reviewAdmins(ctx.records(a.roles, 'roles'), settingsFrom(a, ctx, 'arke_settings', DEFAULTS), a.as_of || today()),
  summary: (o) => `${o.assignments} admin role assignment(s) for ${o.admins} account(s), ${o.global_admins} top admin(s): ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Review privileged roles', description: 'Review admin role assignments and list too many top admins, guests, missing MFA, break-glass use, standing roles, admins with mail and stale admins.' },
  explain: { arg: 'account', argSchema: { type: 'string', maxLength: 300, description: 'Account from arke_check (the pseudonym is fine)' }, title: 'Explain one account', description: 'Every finding for one admin account.', match: (i, v, ctx) => i.key === v || (ctx.pii && ctx.pii.same(i.key, v, 'user')) },
  report: {
    title: 'Privileged role review', base: 'arke-admins',
    sections: (o) => [{ title: 'By role', rows: o.by_role, columns: ['role', 'holders', 'standing'] }],
    limits: [LIMITS.files, 'This looks at admin roles only; the Fairbooks agent ladon-of-access runs the wider access recertification across all apps.', 'Roles granted through nested groups or app-specific admin settings that are not in the export are not seen.', LIMITS.defaults, LIMITS.pii, LIMITS.live],
  },
  note: { noun: 'identity_note', verb: 'send', category: 'binding_send', actor: 'the identity owner', to: 'identity and security team', subject: 'Admin roles to tighten', ask: 'Please deal with guests and admins without MFA first; any break-glass sign-in needs an explanation.' },
  refused: [
    { name: 'idp_remove_role', category: 'revoke_access', description: 'Arke never removes or changes a role assignment.' },
    { name: 'idp_reset_break_glass', category: 'production_deploy', description: 'Arke never resets or uses a break-glass account.' },
  ],
  prompt: { title: 'Review privileged roles', description: 'Walks the host model through an admin role review with Arke.', text: 'You are helping an identity lead review admin roles with arke-of-admins. Names are pseudonyms. 1. Call arke_check; lead with guests holding roles, admins without MFA and break-glass sign-ins. 2. Use arke_explain for an account. 3. Call arke_write_report (the file has real names). 4. Offer arke_draft_identity_note; arke_request_send waits for one named click.' },
});
