// Fairwire VPN Access: remote-access log review. Pure functions.
import { str, low, toMs, isoDate, hoursBetween, versionCompare, cleanIp, round1, finding } from 'fairwire-core';

export const CHECKS = Object.freeze({
  leaver_connected: 'Someone on your leavers list connected after their last day.',
  two_places_at_once: 'One account connected from two countries within a time no one could travel.',
  country_not_allowed: 'A successful connection from a country outside your list.',
  failed_login_burst: 'Many failed sign-ins for one account in a few minutes (password guessing, or a stale saved password).',
  shared_account: 'One account had overlapping sessions from different addresses (a shared or stolen login).',
  long_session: 'A session longer than your limit.',
  old_client: 'A VPN client older than the version you require.',
});

export const SESSION_FIELDS = Object.freeze({
  user: { aliases: ['User', 'Username', 'User Name', 'Login', 'Account', 'UPN'], required: true, pii: 'user' },
  connected_at: { type: 'datetime', aliases: ['Connected', 'Start', 'Start Time', 'Login Time', 'Session Start', 'Timestamp'], required: true },
  disconnected_at: { type: 'datetime', aliases: ['Disconnected', 'End', 'End Time', 'Logout Time', 'Session End'] },
  client_ip: { aliases: ['Client IP', 'Public IP', 'Source IP', 'Remote IP', 'Real IP', 'Outside IP'], pii: 'ip' },
  country: { aliases: ['Country', 'Geo', 'Location', 'Country Code', 'Source Country'] },
  result: { aliases: ['Result', 'Status', 'Outcome', 'Auth Result', 'Event'] },
  client_version: { aliases: ['Client Version', 'Agent Version', 'Version', 'Client'] },
  gateway: { aliases: ['Gateway', 'Portal', 'Concentrator', 'Server'] },
});
export const LEAVER_FIELDS = Object.freeze({
  user: { aliases: ['User', 'Username', 'Login', 'Account', 'UPN', 'Email'], required: true, pii: 'user' },
  end_date: { type: 'date', aliases: ['End Date', 'Last Day', 'Termination Date', 'Leaving Date', 'Exit Date'], required: true },
});

export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  allowed_countries: { type: 'array', items: { type: 'string' }, maxItems: 250, description: 'Countries people may connect from, as the export writes them (no check when empty)' },
  travel_hours: { type: 'number', minimum: 0, description: 'Hours within which connections from two countries are flagged (default 2)' },
  burst_failures: { type: 'integer', minimum: 2, description: 'Failed sign-ins for one account that make a burst (default 10)' },
  burst_minutes: { type: 'number', minimum: 1, description: 'Minutes the burst must fall within (default 15)' },
  max_session_hours: { type: 'number', minimum: 1, description: 'Longest acceptable session in hours (default 24)' },
  min_client_version: { type: 'string', maxLength: 40, description: 'Oldest VPN client version you accept, e.g. "5.0" (no check when empty)' },
} };
export const DEFAULTS = Object.freeze({ allowed_countries: [], travel_hours: 2, burst_failures: 10, burst_minutes: 15, max_session_hours: 24, min_client_version: '' });

const OK = /^(success|succeeded|ok|connected|login|logged in|allowed|pass|passed|accept|accepted|true|yes|1)$/i;

export function reviewSessions(rows, leaverRows = [], settings = {}) {
  const s = { ...DEFAULTS, ...settings };
  const ss = rows.filter((r) => str(r.user) && str(r.connected_at)).map((r) => ({ user: low(r.user), shown: str(r.user), start: str(r.connected_at), end: str(r.disconnected_at), ip: cleanIp(r.client_ip), country: str(r.country), ok: !str(r.result) || OK.test(str(r.result)), version: str(r.client_version) }));
  const leavers = new Map(leaverRows.filter((r) => str(r.user) && isoDate(r.end_date)).map((r) => [low(r.user), isoDate(r.end_date)]));
  const allowed = s.allowed_countries.map(low);
  const items = []; const byUser = new Map();
  for (const x of ss) byUser.set(x.user, [...(byUser.get(x.user) || []), x]);
  for (const [, list] of byUser) {
    list.sort((a, b) => toMs(a.start) - toMs(b.start) || (a.ip < b.ip ? -1 : 1));
    const u = list[0].shown; const ok = list.filter((x) => x.ok);
    const end = leavers.get(list[0].user);
    if (end) { const after = ok.filter((x) => isoDate(x.start) > end); if (after.length) items.push(finding('leaver_connected', 'high', u, `${u} left on ${end} but connected ${after.length} time(s) after that (last ${after.at(-1).start}).`, 'Disable the account and its VPN access today and find out who used it.', { subject: u })); }
    let travel = null;
    for (let i = 1; i < ok.length && !travel; i++) for (let j = 0; j < i; j++) { const a = ok[j], b = ok[i]; if (a.country && b.country && low(a.country) !== low(b.country) && Math.abs(hoursBetween(a.start, b.start)) <= s.travel_hours) { travel = [a, b]; break; } }
    if (travel) items.push(finding('two_places_at_once', 'high', u, `${u} connected from ${travel[0].country} at ${travel[0].start} and from ${travel[1].country} at ${travel[1].start}.`, 'Ask the person; if it was not them, reset the password and revoke their sessions.', { subject: u }));
    if (allowed.length) { const bad = ok.filter((x) => x.country && !allowed.includes(low(x.country))); if (bad.length) items.push(finding('country_not_allowed', 'medium', u, `${u} connected ${bad.length} time(s) from ${[...new Set(bad.map((x) => x.country))].sort().join(', ')}.`, 'Confirm the trip with the person or their manager; block the country at the gateway if no one travels there.', { subject: u })); }
    const fails = list.filter((x) => !x.ok).map((x) => toMs(x.start)).filter(Number.isFinite).sort((a, b) => a - b);
    let burst = 0; for (let i = 0, j = 0; j < fails.length; j++) { while (fails[j] - fails[i] > s.burst_minutes * 60000) i++; burst = Math.max(burst, j - i + 1); }
    if (burst >= s.burst_failures) items.push(finding('failed_login_burst', 'medium', u, `${u} had ${burst} failed sign-ins within ${s.burst_minutes} minutes.`, 'Check whether the account is locked and whether a device keeps an old password; watch the source addresses.', { subject: u, failures: burst }));
    let shared = null;
    for (let i = 1; i < ok.length && !shared; i++) for (let j = 0; j < i; j++) { const a = ok[j], b = ok[i]; const aEnd = toMs(a.end); if (a.ip && b.ip && a.ip !== b.ip && Number.isFinite(aEnd) && toMs(b.start) < aEnd && (!a.country || !b.country || low(a.country) === low(b.country))) { shared = [a, b]; break; } }
    if (shared) items.push(finding('shared_account', 'medium', u, `${u} had two sessions at once from different addresses (${shared[0].start} and ${shared[1].start}).`, 'Give each person their own account; if the account is not shared, treat it as stolen.', { subject: u }));
    const longest = ok.map((x) => hoursBetween(x.start, x.end)).filter((h) => h !== null).sort((a, b) => b - a)[0];
    if (longest !== undefined && longest > s.max_session_hours) items.push(finding('long_session', 'low', u, `${u} stayed connected for ${round1(longest)} hours.`, 'Set a session time-out on the gateway and ask whether the connection was left open by a forgotten device.', { subject: u, hours: round1(longest) }));
    if (s.min_client_version) { const old = ok.filter((x) => x.version && versionCompare(x.version, s.min_client_version) < 0); if (old.length) items.push(finding('old_client', 'low', u, `${u} connected with client ${[...new Set(old.map((x) => x.version))].sort().join(', ')}, older than ${s.min_client_version}.`, 'Update the VPN client on this person\'s device.', { subject: u })); }
  }
  return { sessions: ss.length, users: byUser.size, successful: ss.filter((x) => x.ok).length, failed: ss.filter((x) => !x.ok).length, countries: [...new Set(ss.map((x) => x.country).filter(Boolean))].sort(), items };
}
