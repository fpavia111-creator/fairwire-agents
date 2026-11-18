// Fairwire Sign-In Logs: identity provider sign-in log review. Pure functions.
import { str, low, toMs, hoursBetween, cleanIp, finding } from 'fairwire-core';

export const CHECKS = Object.freeze({
  password_spray: 'One address failing to sign in to many different accounts in a short time (password spraying).',
  success_after_failures: 'A successful sign-in right after a run of failures for the same account (a guessed password?).',
  two_places_at_once: 'Successful sign-ins for one account from two countries within a time no one could travel.',
  legacy_protocol: 'A successful sign-in over a legacy protocol (IMAP, POP, SMTP AUTH, basic Exchange ActiveSync) that cannot do MFA.',
  country_not_allowed: 'A successful sign-in from a country outside your list.',
  service_account_interactive: 'A service account signing in interactively, as a person would.',
  failed_burst: 'Many failed sign-ins for one account with no success (a stale saved password or someone guessing).',
  disabled_account_attempts: 'Sign-in attempts on a disabled account.',
});

export const SIGNIN_FIELDS = Object.freeze({
  at: { type: 'datetime', aliases: ['Date (UTC)', 'Date', 'Time', 'Timestamp', 'published', 'Created'], required: true },
  user: { aliases: ['User principal name', 'User', 'Username', 'UPN', 'actor.alternateId', 'Account'], required: true, pii: 'user' },
  app: { aliases: ['Application', 'App', 'Resource', 'target.displayName', 'Service'] },
  client_ip: { aliases: ['IP address', 'IP Address', 'Client IP', 'client.ipAddress', 'Source IP'], pii: 'ip' },
  country: { aliases: ['Location', 'Country', 'client.geographicalContext.country', 'Country/Region'] },
  result: { aliases: ['Status', 'Result', 'outcome.result', 'Outcome', 'Sign-in status'], required: true },
  failure_reason: { aliases: ['Failure reason', 'Reason', 'outcome.reason', 'Error'] },
  client_app: { aliases: ['Client app', 'Client App', 'Protocol', 'client.userAgent.rawUserAgent', 'Authentication Protocol'] },
  interactive: { aliases: ['Interactive', 'Sign-in type', 'Is interactive', 'Login Type'] },
});

export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  allowed_countries: { type: 'array', items: { type: 'string' }, maxItems: 250, description: 'Countries people sign in from, as the log writes them (no check when empty)' },
  spray_users: { type: 'integer', minimum: 2, description: 'Distinct accounts one address must fail on to count as spraying (default 10)' },
  spray_minutes: { type: 'number', minimum: 1, description: 'Window for the spraying check in minutes (default 60)' },
  burst_failures: { type: 'integer', minimum: 2, description: 'Failures for one account that make a burst (default 10)' },
  burst_minutes: { type: 'number', minimum: 1, description: 'Window for a burst in minutes (default 30)' },
  travel_hours: { type: 'number', minimum: 0, description: 'Hours within which two countries are flagged (default 2)' },
  service_accounts: { type: 'array', items: { type: 'string' }, maxItems: 500, description: 'Service account names, or prefixes ending in * (default "svc-*")' },
} };
export const DEFAULTS = Object.freeze({ allowed_countries: [], spray_users: 10, spray_minutes: 60, burst_failures: 10, burst_minutes: 30, travel_hours: 2, service_accounts: ['svc-*'] });

const OK = /^(success|succeeded|0|allow|allowed|true|yes)$/i;
const LEGACY = /imap|pop3?|smtp|exchange activesync|activesync|other clients|autodiscover|mapi over http|basic auth|legacy/i;

export function reviewSignins(rows, settings = {}) {
  const s = { ...DEFAULTS, ...settings };
  const ev = rows.filter((r) => str(r.user) && Number.isFinite(toMs(r.at))).map((r) => ({ at: str(r.at), ms: toMs(r.at), user: low(r.user), shown: str(r.user), app: str(r.app), ip: cleanIp(r.client_ip), country: str(r.country), ok: OK.test(str(r.result)), reason: low(r.failure_reason), client: str(r.client_app), interactive: !/non.?interactive|^no$|^false$/i.test(str(r.interactive)) })).sort((a, b) => a.ms - b.ms || (a.user < b.user ? -1 : a.user > b.user ? 1 : a.ip < b.ip ? -1 : 1));
  const items = []; const win = (m) => m * 60000;
  const byIp = new Map(); for (const e of ev) if (!e.ok && e.ip) byIp.set(e.ip, [...(byIp.get(e.ip) || []), e]);
  for (const [ip, list] of byIp) { let best = 0; for (let i = 0, j = 0; j < list.length; j++) { while (list[j].ms - list[i].ms > win(s.spray_minutes)) i++; best = Math.max(best, new Set(list.slice(i, j + 1).map((e) => e.user)).size); } if (best >= s.spray_users) items.push(finding('password_spray', 'high', ip, `${ip} failed to sign in to ${best} different accounts within ${s.spray_minutes} minutes.`, 'Block the address, check whether any of those accounts then signed in successfully, and make sure MFA covers them all.', { subject: ip, accounts: best })); }
  const byUser = new Map(); for (const e of ev) byUser.set(e.user, [...(byUser.get(e.user) || []), e]);
  const allowed = s.allowed_countries.map(low);
  const isSvc = (u) => s.service_accounts.some((p) => (p.endsWith('*') ? u.startsWith(low(p.slice(0, -1))) : u === low(p)));
  for (const [, list] of byUser) {
    const u = list[0].shown; const ok = list.filter((e) => e.ok); const fails = list.filter((e) => !e.ok);
    let burst = 0; for (let i = 0, j = 0; j < fails.length; j++) { while (fails[j].ms - fails[i].ms > win(s.burst_minutes)) i++; burst = Math.max(burst, j - i + 1); }
    const after = ok.find((e) => fails.filter((f) => f.ms < e.ms && e.ms - f.ms <= win(s.burst_minutes)).length >= s.burst_failures);
    if (after) items.push(finding('success_after_failures', 'high', u, `${u} signed in at ${after.at} after ${fails.filter((f) => f.ms < after.ms && after.ms - f.ms <= win(s.burst_minutes)).length} failures in the previous ${s.burst_minutes} minutes.`, 'Confirm with the person that it was them; if not, reset the password and revoke sessions.', { subject: u }));
    else if (burst >= s.burst_failures) items.push(finding('failed_burst', 'low', u, `${u} had ${burst} failed sign-ins within ${s.burst_minutes} minutes and no success.`, 'Look for a device with an old saved password, or block the source if it is not the person.', { subject: u }));
    let travel = null; for (let i = 1; i < ok.length && !travel; i++) for (let j = 0; j < i; j++) if (ok[i].country && ok[j].country && low(ok[i].country) !== low(ok[j].country) && hoursBetween(ok[j].at, ok[i].at) <= s.travel_hours) { travel = [ok[j], ok[i]]; break; }
    if (travel) items.push(finding('two_places_at_once', 'high', u, `${u} signed in from ${travel[0].country} at ${travel[0].at} and from ${travel[1].country} at ${travel[1].at}.`, 'Ask the person; a VPN can explain it, a stolen session cannot.', { subject: u }));
    const leg = ok.filter((e) => LEGACY.test(e.client)); if (leg.length) items.push(finding('legacy_protocol', 'medium', u, `${u} signed in ${leg.length} time(s) over ${[...new Set(leg.map((e) => e.client))].sort().join(', ')}.`, 'Move the app or device to modern authentication and block legacy protocols for the account.', { subject: u }));
    if (allowed.length) { const bad = ok.filter((e) => e.country && !allowed.includes(low(e.country))); if (bad.length) items.push(finding('country_not_allowed', 'medium', u, `${u} signed in from ${[...new Set(bad.map((e) => e.country))].sort().join(', ')}.`, 'Confirm the trip; add a location-based policy if no one works from there.', { subject: u })); }
    if (isSvc(list[0].user)) { const inter = ok.filter((e) => e.interactive); if (inter.length) items.push(finding('service_account_interactive', 'medium', u, `Service account ${u} signed in interactively ${inter.length} time(s) (${[...new Set(inter.map((e) => e.app).filter(Boolean))].sort().join(', ') || 'unknown app'}).`, 'Find who uses it as a person; service accounts should only sign in from their workload.', { subject: u })); }
    const dis = list.filter((e) => /disabled|blocked|locked out|deactivated/.test(e.reason)); if (dis.length) items.push(finding('disabled_account_attempts', 'low', u, `${dis.length} sign-in attempt(s) on disabled account ${u}.`, 'Find what still tries to use the account (a script, a phone) and remove it.', { subject: u }));
  }
  return { events: ev.length, accounts: byUser.size, failures: ev.filter((e) => !e.ok).length, addresses: new Set(ev.map((e) => e.ip).filter(Boolean)).size, items };
}
