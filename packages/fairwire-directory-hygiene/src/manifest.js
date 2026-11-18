import { readFileSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, AS_OF_ARG, settingsFrom, LIMITS, today } from 'fairwire-core';
import { OBJECT_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewDirectory } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  objects: fileArg('Directory export under --root (Active Directory PowerShell or ADManager export, Entra ID users, devices and groups as CSV, Excel or JSON): one row per user, computer or group with enabled, last logon, OS, password flags, member of, member count, managed by and nested groups'),
  settings: SETTINGS_ARG('stale_days, unsupported_os, privileged_groups, service_account_prefixes, builtin_groups'),
  as_of: AS_OF_ARG,
};

export const manifest = wireAgent({
  pkg, prefix: 'directory', title: 'Fairwire Directory Hygiene',
  description: 'Reviews Active Directory or Entra ID exports for hygiene: accounts with "password not required", nested group loops, passwords that never expire, unsupported computers, disabled accounts still in groups, stale computer objects, groups with no owner and empty groups. User names are masked for the model. Drafts clean-up lists; never edits the directory.',
  args, required: ['objects'],
  sources: { objects: { label: 'Directory objects', args: ['objects'], fields: OBJECT_FIELDS } },
  configSchemas: { directory_settings: SETTINGS_SCHEMA },
  run: (a, ctx) => { const o = reviewDirectory(ctx.records(a.objects, 'objects'), settingsFrom(a, ctx, 'directory_settings', DEFAULTS), a.as_of || today()); if (ctx.pii) for (const n of o.user_names) ctx.pii.register('user', n); const { user_names: _u, ...rest } = o; return rest; },
  summary: (o) => `${o.objects} object(s): ${o.users} user(s), ${o.computers} computer(s), ${o.groups} group(s): ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Review directory hygiene', description: 'Review the directory export and list risky password flags, group loops, unsupported and stale computers, disabled members, ownerless and empty groups.' },
  explain: { arg: 'name', argSchema: { type: 'string', maxLength: 200, description: 'User, computer or group from directory_check (a pseudonym is fine)' }, title: 'Explain one object', description: 'Every finding for one user, computer or group.', match: (i, v, ctx) => i.key === v || String(i.key).split(' > ').includes(String(v).toLowerCase()) || (ctx.pii && ctx.pii.same(i.key, v, 'user')) },
  report: {
    title: 'Directory hygiene', base: 'directory-hygiene',
    sections: (o) => [{ title: 'By type', rows: ['user', 'computer', 'group'].map((type) => ({ type, findings: o.items.filter((i) => i.subject === type).length })), columns: ['type', 'findings'] }],
    limits: [LIMITS.files, 'Last logon dates in Active Directory replicate slowly (lastLogonTimestamp can lag by up to two weeks); stale means "probably", so disable before deleting.', LIMITS.defaults, LIMITS.pii, LIMITS.live],
  },
  note: { noun: 'cleanup_list', verb: 'send', category: 'binding_send', actor: 'the directory owner', to: 'identity and directory administrators', subject: 'Directory clean-up to review', ask: 'Please fix the password flags first; disable stale objects before deleting anything.' },
  refused: [
    { name: 'directory_modify_object', category: 'production_deploy', description: 'Fairwire Directory Hygiene never edits, disables, moves or deletes a directory object.' },
    { name: 'directory_remove_member', category: 'revoke_access', description: 'Fairwire Directory Hygiene never removes anyone from a group.' },
  ],
  prompt: { title: 'Review directory hygiene', description: 'Walks the host model through a directory review with Fairwire Directory Hygiene.', text: 'You are helping a directory administrator review hygiene with fairwire-directory-hygiene. User names are pseudonyms. 1. Call directory_check; lead with "password not required" and group loops. 2. Use directory_explain for one object. 3. Call directory_write_report (the file has real names). 4. Offer directory_draft_cleanup_list; directory_request_send waits for one named click.' },
});
