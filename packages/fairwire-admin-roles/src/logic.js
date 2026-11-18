// Fairwire Admin Roles: privileged role review from directory role exports. Pure functions.
import { str, low, yes, isoDate, daysBetween, finding } from 'fairwire-core';

export const CHECKS = Object.freeze({
  too_many_global_admins: 'More people hold the top admin role than your cap.',
  guest_with_admin_role: 'A guest (external) account holds an admin role.',
  admin_without_mfa: 'An account with an admin role and no MFA registered.',
  break_glass_signed_in: 'An emergency (break-glass) account signed in recently; it should only be used in an emergency, and every use explained.',
  standing_admin: 'A permanent admin assignment where your policy says admins activate just in time.',
  admin_reads_mail: 'An admin account that also has a mailbox (a daily-use account doing admin work, the easiest one to phish).',
  stale_admin: 'An admin role held by an account that has not signed in for longer than your limit.',
  break_glass_no_note: 'An emergency account with no note on how it is stored, monitored and tested.',
});

export const ROLE_FIELDS = Object.freeze({
  user: { aliases: ['User principal name', 'UPN', 'User', 'Principal', 'Account', 'Member'], required: true, pii: 'user' },
  display_name: { aliases: ['Display name', 'Name', 'Principal display name'], pii: 'name' },
  role: { aliases: ['Role', 'Role name', 'Directory role', 'Group', 'Role Definition'], required: true },
  assignment_type: { aliases: ['Assignment type', 'Assignment', 'State', 'Membership type', 'Type'] },
  user_type: { aliases: ['User type', 'Account type', 'Principal type'] },
  mfa: { aliases: ['MFA', 'MFA registered', 'Is MFA registered', 'Strong auth', 'Methods'] },
  mailbox: { aliases: ['Has mailbox', 'Mailbox', 'Licensed for email', 'Exchange license'] },
  last_sign_in: { type: 'date', aliases: ['Last sign-in', 'Last sign in', 'Last login', 'LastLogonDate'] },
  break_glass: { aliases: ['Break glass', 'Emergency access', 'Break-glass'] },
  note: { aliases: ['Note', 'Notes', 'Exclusion note', 'Documentation', 'Comment'] },
});

export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  global_roles: { type: 'array', items: { type: 'string' }, maxItems: 20, description: 'Role names that are the top admin role (default Global Administrator, Company Administrator, Domain Admins, Enterprise Admins, Super Admin)' },
  max_global_admins: { type: 'integer', minimum: 1, description: 'Most people who should hold the top role, break-glass accounts not counted (default 4)' },
  require_jit: { type: 'boolean', description: 'Whether admins should be eligible and activate just in time rather than hold standing roles (default true)' },
  break_glass_accounts: { type: 'array', items: { type: 'string' }, maxItems: 10, description: 'Emergency access accounts (also read from a break-glass column)' },
  stale_admin_days: { type: 'integer', minimum: 1, description: 'Days without a sign-in after which an admin counts as stale (default 90)' },
  break_glass_signin_days: { type: 'integer', minimum: 1, description: 'Days back within which a break-glass sign-in is flagged (default 30)' },
} };
export const DEFAULTS = Object.freeze({ global_roles: ['Global Administrator', 'Company Administrator', 'Domain Admins', 'Enterprise Admins', 'Super Admin'], max_global_admins: 4, require_jit: true, break_glass_accounts: [], stale_admin_days: 90, break_glass_signin_days: 30 });

export function reviewAdmins(rows, settings = {}, asOf) {
  const s = { ...DEFAULTS, ...settings };
  const rs = rows.filter((r) => str(r.user) && str(r.role)).map((r) => ({ user: low(r.user), shown: str(r.user), name: str(r.display_name), role: str(r.role), eligible: /eligible|jit|pim/i.test(str(r.assignment_type)), guest: /guest|external|b2b/i.test(str(r.user_type)) || /#ext#/i.test(str(r.user)), mfa: str(r.mfa), mailbox: yes(r.mailbox) === true, last: isoDate(r.last_sign_in), bg: yes(r.break_glass) === true, note: str(r.note) }));
  const bgList = new Set(s.break_glass_accounts.map(low));
  const isBg = (r) => r.bg || bgList.has(r.user);
  const global = new Set(s.global_roles.map(low));
  const byUser = new Map(); for (const r of rs) byUser.set(r.user, [...(byUser.get(r.user) || []), r]);
  const items = []; const label = (r) => (r.name ? `${r.name} (${r.shown})` : r.shown);
  const globals = [...byUser.values()].filter((l) => l.some((r) => global.has(low(r.role))) && !l.some(isBg));
  if (globals.length > s.max_global_admins) items.push(finding('too_many_global_admins', 'high', 'global-admins', `${globals.length} people hold a top admin role (${[...new Set(globals.flatMap((l) => l.filter((r) => global.has(low(r.role))).map((r) => r.role)))].sort().join(', ')}); your cap is ${s.max_global_admins}.`, 'Move people to narrower roles (user, exchange, security admin) and keep the top role for a few.', { subject: 'tenant' }));
  for (const [, list] of byUser) {
    const r = list[0]; const roles = [...new Set(list.map((x) => x.role))].sort(); const bg = list.some(isBg);
    if (list.some((x) => x.guest)) items.push(finding('guest_with_admin_role', 'high', r.shown, `Guest account ${label(r)} holds ${roles.join(', ')}.`, 'Remove the role, or give the person an internal admin account you control.', { subject: roles[0] }));
    if (bg) {
      if (r.last && asOf && daysBetween(r.last, asOf) <= s.break_glass_signin_days) items.push(finding('break_glass_signed_in', 'high', r.shown, `Emergency account ${label(r)} signed in on ${r.last}.`, 'Find out who used it and why; rotate its credentials after any use.', { subject: 'break-glass' }));
      if (!list.some((x) => x.note)) items.push(finding('break_glass_no_note', 'low', r.shown, `Emergency account ${label(r)} has no note on storage, monitoring or testing.`, 'Record where its credentials are kept, who is alerted when it signs in, and when it was last tested.', { subject: 'break-glass' }));
      continue;
    }
    if (!r.mfa || yes(r.mfa) === false || /^(none|disabled|not registered)$/i.test(r.mfa)) items.push(finding('admin_without_mfa', 'high', r.shown, `${label(r)} holds ${roles.join(', ')} with no MFA registered.`, 'Register phishing-resistant MFA before the next admin session, or remove the role.', { subject: roles[0] }));
    if (s.require_jit && list.some((x) => !x.eligible)) items.push(finding('standing_admin', 'medium', r.shown, `${label(r)} holds ${list.filter((x) => !x.eligible).map((x) => x.role).sort().join(', ')} permanently.`, 'Make the assignment eligible so it is activated just in time, with approval for the top roles.', { subject: roles[0] }));
    if (list.some((x) => x.mailbox)) items.push(finding('admin_reads_mail', 'medium', r.shown, `Admin account ${label(r)} also has a mailbox.`, 'Give the person a separate admin account without mail.', { subject: roles[0] }));
    if (r.last && asOf && daysBetween(r.last, asOf) > s.stale_admin_days) items.push(finding('stale_admin', 'low', r.shown, `${label(r)} holds ${roles.join(', ')} but last signed in on ${r.last}.`, 'Remove roles nobody uses; they are risk without benefit.', { subject: roles[0] }));
  }
  const roles = {}; for (const r of rs) { const e = roles[r.role] || (roles[r.role] = { role: r.role, holders: 0, standing: 0 }); e.holders++; if (!r.eligible) e.standing++; }
  return { assignments: rs.length, admins: byUser.size, global_admins: globals.length, by_role: Object.values(roles).sort((a, b) => (a.role < b.role ? -1 : 1)), items };
}
