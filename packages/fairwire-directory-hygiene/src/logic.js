// Fairwire Directory Hygiene: Active Directory or Entra ID hygiene. Pure functions.
import { num, str, low, yes, isoDate, daysBetween, finding, END_OF_SUPPORT_OS, osPastSupport } from 'fairwire-core';

export const CHECKS = Object.freeze({
  password_not_required: 'An enabled user account flagged "password not required" (it may have an empty password).',
  nested_group_loop: 'Groups that contain each other in a loop, which breaks access reviews and some applications.',
  password_never_expires: 'An enabled user account whose password never expires (low for accounts you mark as service accounts).',
  unsupported_os_computer: 'An enabled computer object with an operating system past its vendor end of support.',
  disabled_in_groups: 'A disabled account that is still a member of groups (medium when one of them is privileged).',
  stale_computer: 'An enabled computer object that has not logged on for longer than your limit.',
  group_without_owner: 'A group with no owner (managed by), so nobody reviews who is in it.',
  empty_group: 'A group with no members.',
});

export const OBJECT_FIELDS = Object.freeze({
  type: { aliases: ['Type', 'Object Class', 'ObjectClass', 'Object Type'], required: true },
  name: { aliases: ['Name', 'SamAccountName', 'sAMAccountName', 'Display Name', 'CN'], required: true },
  enabled: { aliases: ['Enabled', 'Account Enabled', 'Status'] },
  last_logon: { type: 'date', aliases: ['LastLogonDate', 'Last Logon', 'lastLogonTimestamp', 'Last Sign-in', 'ApproximateLastSignInDateTime'] },
  os: { aliases: ['OperatingSystem', 'Operating System', 'OS'] },
  pwd_never_expires: { aliases: ['PasswordNeverExpires', 'Password Never Expires', 'DONT_EXPIRE_PASSWORD'] },
  pwd_not_required: { aliases: ['PasswordNotRequired', 'Password Not Required', 'PASSWD_NOTREQD'] },
  member_of: { aliases: ['MemberOf', 'Member Of', 'Groups'] },
  members: { type: 'number', aliases: ['Members', 'Member Count', 'MemberCount'] },
  managed_by: { aliases: ['ManagedBy', 'Managed By', 'Owner', 'Owners'] },
  nested_groups: { aliases: ['Nested Groups', 'Member Groups', 'Group Members'] },
});

export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  stale_days: { type: 'integer', minimum: 1, description: 'Days without a logon after which a computer counts as stale (default 90)' },
  unsupported_os: { type: 'array', items: { type: 'string' }, maxItems: 100, description: 'Operating systems past end of support, matched as text; "*" stands for any text, and LTSC, LTSB or IoT systems are only matched by an entry that names them (default: END_OF_SUPPORT_OS as of 19 Nov 2026: Windows 2000, XP, Vista, 7, 8, 8.1 and 10, Windows 10 LTSB, Windows 11 21H2 to 23H2 and Home and Pro 24H2, Windows Server 2003, 2008 and 2012)' },
  privileged_groups: { type: 'array', items: { type: 'string' }, maxItems: 100, description: 'Groups that grant admin rights (default Domain Admins, Enterprise Admins, Schema Admins, Administrators, Account Operators, Backup Operators)' },
  service_account_prefixes: { type: 'array', items: { type: 'string' }, maxItems: 20, description: 'Name prefixes of service accounts, e.g. "svc-" (their non-expiring passwords are low, not medium)' },
  builtin_groups: { type: 'array', items: { type: 'string' }, maxItems: 200, description: 'Groups that need no owner (default the built-in admin and user groups)' },
} };
const PRIV = ['Domain Admins', 'Enterprise Admins', 'Schema Admins', 'Administrators', 'Account Operators', 'Backup Operators'];
export const DEFAULTS = Object.freeze({ stale_days: 90, unsupported_os: END_OF_SUPPORT_OS, privileged_groups: PRIV, service_account_prefixes: ['svc-', 'svc_', 'sa-'], builtin_groups: [...PRIV, 'Domain Users', 'Domain Computers', 'Domain Controllers', 'Users', 'Guests'] });

const list = (v) => str(v).split(/[;|]/).map((x) => x.replace(/^CN=([^,]+).*$/i, '$1').trim()).filter(Boolean);

export function reviewDirectory(rows, settings = {}, asOf) {
  const s = { ...DEFAULTS, ...settings };
  const objs = rows.filter((r) => str(r.name) && str(r.type)).map((r) => ({ type: /computer|device/i.test(str(r.type)) ? 'computer' : /group/i.test(str(r.type)) ? 'group' : 'user', name: str(r.name), enabled: yes(r.enabled) !== false, last: isoDate(r.last_logon), os: str(r.os), never: yes(r.pwd_never_expires) === true, notreq: yes(r.pwd_not_required) === true, memberOf: list(r.member_of), members: num(r.members), owner: str(r.managed_by), nested: list(r.nested_groups) }));
  const priv = new Set(s.privileged_groups.map(low)); const builtin = new Set(s.builtin_groups.map(low));
  const items = [];
  for (const o of objs) {
    if (o.type === 'computer' && o.enabled) {
      if (o.last && asOf && daysBetween(o.last, asOf) > s.stale_days) items.push(finding('stale_computer', 'low', o.name, `Computer ${o.name} last logged on to the domain on ${o.last}.`, 'Disable it, move it to a holding OU, and delete it after a further wait if nobody asks.', { subject: 'computer' }));
      const bad = osPastSupport(o.os, s.unsupported_os); if (bad) items.push(finding('unsupported_os_computer', 'medium', o.name, `Computer ${o.name} runs ${o.os}, which is past end of support.`, 'Upgrade or retire it; if it is already gone, clean up the object.', { subject: 'computer' }));
    }
    if (o.type === 'user') {
      if (o.enabled && o.notreq) items.push(finding('password_not_required', 'high', o.name, `User ${o.name} is enabled and flagged "password not required".`, 'Clear the flag and set a strong password; check when and why it was set.', { subject: 'user' }));
      if (o.enabled && o.never) { const svc = s.service_account_prefixes.some((p) => low(o.name).startsWith(low(p))); items.push(finding('password_never_expires', svc ? 'low' : 'medium', o.name, `${svc ? 'Service account' : 'User'} ${o.name} has a password that never expires.`, svc ? 'Move it to a managed service account or rotate its password on a schedule.' : 'Clear the flag; long passwords with MFA are fine to keep, but not ones that never change after a leak.', { subject: 'user' })); }
      if (!o.enabled && o.memberOf.length) { const p = o.memberOf.filter((g) => priv.has(low(g))); items.push(finding('disabled_in_groups', p.length ? 'medium' : 'low', o.name, `Disabled account ${o.name} is still in ${o.memberOf.length} group(s)${p.length ? `, including ${p.join(', ')}` : ''}.`, 'Remove the memberships, so re-enabling the account by mistake does not restore its access.', { subject: 'user' })); }
    }
    if (o.type === 'group' && !builtin.has(low(o.name))) {
      if (o.members === 0 && !o.nested.length) items.push(finding('empty_group', 'info', o.name, `Group ${o.name} has no members.`, 'Delete it if nothing grants access through it.', { subject: 'group' }));
      if (!o.owner) items.push(finding('group_without_owner', 'low', o.name, `Group ${o.name} has no owner.`, 'Name the person or team who decides who belongs in it.', { subject: 'group' }));
    }
  }
  const groups = new Map(objs.filter((o) => o.type === 'group').map((o) => [low(o.name), o]));
  const seenLoop = new Set();
  for (const g of groups.values()) {
    const path = []; const onPath = new Set();
    const visit = (n) => { const k = low(n); if (onPath.has(k)) { const raw = path.slice(path.indexOf(k)); const m = raw.indexOf([...raw].sort()[0]); const cyc = [...raw.slice(m), ...raw.slice(0, m)]; const key = [...cyc].sort().join(' > '); if (!seenLoop.has(key)) { seenLoop.add(key); items.push(finding('nested_group_loop', 'medium', key, `Groups ${cyc.map((x) => groups.get(x)?.name || x).join(' > ')} contain each other in a loop.`, 'Break the loop by removing one of the nested memberships.', { subject: 'group' })); } return; } const node = groups.get(k); if (!node || path.length > 50) return; path.push(k); onPath.add(k); for (const c of node.nested) visit(c); path.pop(); onPath.delete(k); };
    visit(g.name);
  }
  const count = (t) => objs.filter((o) => o.type === t).length;
  return { objects: objs.length, users: count('user'), computers: count('computer'), groups: count('group'), user_names: objs.filter((o) => o.type === 'user').map((o) => o.name), items };
}
