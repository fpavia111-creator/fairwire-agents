// Bora of MFA: multi-factor coverage from an identity provider export. Pure functions.
import { str, low, yes, isoDate, daysBetween, pct, finding } from 'fairwire-core';

export const CHECKS = Object.freeze({
  admin_without_strong_mfa: 'An administrator with no phishing-resistant method (security key, passkey, Windows Hello or certificate).',
  no_mfa: 'An active account that can sign in with no second factor registered.',
  excluded_from_mfa: 'An active account excluded from the MFA policy that is not one of your listed break-glass accounts.',
  weak_methods_only: 'An account whose only second factors are SMS, voice calls or e-mail codes.',
  shared_account_can_sign_in: 'A shared or resource mailbox that can sign in directly (nobody owns its second factor).',
  registered_never_used: 'An account that signs in but has registered MFA it never uses (often a policy gap).',
});

export const USER_FIELDS = Object.freeze({
  user: { aliases: ['User principal name', 'UPN', 'User', 'Username', 'Login', 'Email'], required: true, pii: 'user' },
  display_name: { aliases: ['Display name', 'Name', 'Full Name'], pii: 'name' },
  enabled: { aliases: ['Account enabled', 'Enabled', 'Status', 'Active', 'Sign-in allowed'] },
  user_type: { aliases: ['User type', 'Type', 'Account Type', 'Recipient Type'] },
  is_admin: { aliases: ['Is admin', 'Admin', 'Privileged', 'Has admin role', 'Administrator'] },
  mfa_registered: { aliases: ['Is MFA registered', 'MFA Registered', 'MFA Enrolled', 'Multifactor', 'MFA Status'] },
  methods: { aliases: ['Methods registered', 'Methods', 'Authentication Methods', 'Factors', 'Enrolled Factors'] },
  excluded: { aliases: ['Excluded from MFA', 'MFA Exclusion', 'Excluded', 'Policy Exclusion'] },
  last_sign_in: { type: 'date', aliases: ['Last sign-in', 'Last Sign In', 'Last Login', 'Last Activity'] },
  last_mfa: { type: 'date', aliases: ['Last MFA', 'Last MFA Use', 'Last Second Factor', 'Last strong auth'] },
  department: { aliases: ['Department', 'Team', 'Division'] },
});

export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  break_glass: { type: 'array', items: { type: 'string' }, maxItems: 10, description: 'Emergency access accounts that are excluded from MFA on purpose' },
  weak_methods: { type: 'array', items: { type: 'string' }, maxItems: 20, description: 'Method words that count as weak (default sms, voice, phone call, text, email)' },
  strong_methods: { type: 'array', items: { type: 'string' }, maxItems: 20, description: 'Method words that count as phishing-resistant (default fido2, security key, passkey, windows hello, certificate)' },
  unused_days: { type: 'integer', minimum: 1, description: 'Days without a second factor after which a registered account counts as not using it (default 90)' },
} };
export const DEFAULTS = Object.freeze({ break_glass: [], weak_methods: ['sms', 'voice', 'phone call', 'text', 'email', 'mobile phone'], strong_methods: ['fido2', 'security key', 'passkey', 'windows hello', 'certificate', 'phishing-resistant'], unused_days: 90 });

export function reviewMfa(rows, settings = {}, asOf) {
  const s = { ...DEFAULTS, ...settings };
  const us = rows.filter((r) => str(r.user)).map((r) => {
    const methods = low(r.methods).split(/[,;|]+/).map((x) => x.trim()).filter(Boolean);
    const reg = yes(r.mfa_registered); const en = str(r.enabled);
    return { user: str(r.user), name: str(r.display_name), enabled: !en || !/^(false|no|0|disabled|blocked|inactive)$/i.test(en), type: low(r.user_type), admin: yes(r.is_admin) === true, registered: reg === true || (reg === null && methods.length > 0), methods, excluded: yes(r.excluded) === true, last: isoDate(r.last_sign_in), lastMfa: isoDate(r.last_mfa), dept: str(r.department) || '(no department)' };
  });
  const has = (u, words) => u.methods.some((m) => words.some((w) => m.includes(low(w))));
  const breakGlass = new Set(s.break_glass.map(low));
  const items = []; const active = us.filter((u) => u.enabled);
  for (const u of active) {
    const label = u.name ? `${u.name} (${u.user})` : u.user; const shared = /shared|resource|room|equipment|mailbox/.test(u.type);
    if (shared) { items.push(finding('shared_account_can_sign_in', 'medium', u.user, `${label} is a ${u.type} account that can sign in directly.`, 'Block sign-in for the account and give people delegated access instead.', { subject: u.dept })); continue; }
    if (u.excluded && !breakGlass.has(low(u.user))) items.push(finding('excluded_from_mfa', 'medium', u.user, `${label} is excluded from the MFA policy.`, 'Remove the exclusion, or record why and until when, and add it to the break-glass list only if it is one.', { subject: u.dept }));
    if (u.admin && !has(u, s.strong_methods)) items.push(finding('admin_without_strong_mfa', 'high', u.user, `Administrator ${label} has no phishing-resistant method${u.methods.length ? ` (only ${u.methods.join(', ')})` : ''}.`, 'Register a security key or passkey for this admin and require it for admin roles.', { subject: u.dept }));
    if (!u.registered && !breakGlass.has(low(u.user))) items.push(finding('no_mfa', 'high', u.user, `${label} can sign in with no second factor registered.`, 'Ask the person to register an authenticator app or passkey; require registration at next sign-in.', { subject: u.dept }));
    else if (u.registered && u.methods.length && u.methods.every((m) => s.weak_methods.some((w) => m.includes(low(w))))) items.push(finding('weak_methods_only', 'medium', u.user, `${label} only has ${u.methods.join(', ')} as second factors.`, 'Move them to an authenticator app or a passkey; keep SMS only as a fallback if at all.', { subject: u.dept }));
    if (u.registered && u.last && asOf && daysBetween(u.last, asOf) <= 30 && (!u.lastMfa || daysBetween(u.lastMfa, asOf) > s.unused_days)) items.push(finding('registered_never_used', 'low', u.user, `${label} signs in but has not used a second factor ${u.lastMfa ? `since ${u.lastMfa}` : 'on record'}.`, 'Check which sign-ins skip MFA (trusted locations, legacy apps) and close the gap.', { subject: u.dept }));
  }
  const depts = {}; for (const u of active) { const e = depts[u.dept] || (depts[u.dept] = { department: u.dept, users: 0, registered: 0 }); e.users++; if (u.registered) e.registered++; }
  const strong = active.filter((u) => has(u, s.strong_methods)).length;
  return { accounts: us.length, active: active.length, registered_pct: pct(active.filter((u) => u.registered).length, active.length), strong_pct: pct(strong, active.length), admins: active.filter((u) => u.admin).length, by_department: Object.values(depts).sort((a, b) => (a.department < b.department ? -1 : 1)), items };
}
