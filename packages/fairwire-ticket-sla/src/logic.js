// Fairwire Ticket SLA: service desk SLA aging. Pure functions.
import { num, str, low, toMs, round1, pct, finding } from 'fairwire-core';

export const CHECKS = Object.freeze({
  resolution_breached: 'An open ticket past its resolution target (high for P1 and P2).',
  response_breached: 'An open ticket with no first response past its response target, or a first response that came late.',
  no_assignee: 'An open ticket older than a day with nobody assigned.',
  team_breach_rate: 'A team where more than your share of tickets breached their resolution target.',
  parked_on_hold: 'A ticket on hold for longer than your limit (on hold often stops the SLA clock).',
  reopened_often: 'A ticket reopened several times (the fix did not hold).',
});

export const TICKET_FIELDS = Object.freeze({
  ticket: { aliases: ['Number', 'Ticket', 'Ticket ID', 'Issue key', 'ID', 'Incident'], required: true },
  priority: { aliases: ['Priority', 'Urgency', 'Severity', 'Impact'] },
  opened_at: { type: 'datetime', aliases: ['Opened', 'Created', 'opened_at', 'Created Date', 'Submitted'], required: true },
  first_response_at: { type: 'datetime', aliases: ['First Response', 'First Responded', 'Responded At', 'First Reply'] },
  resolved_at: { type: 'datetime', aliases: ['Resolved', 'Resolved At', 'Closed', 'Resolution Date', 'resolved_at'] },
  state: { aliases: ['State', 'Status', 'Ticket Status'] },
  team: { aliases: ['Assignment group', 'Team', 'Group', 'Queue', 'assignment_group'] },
  assignee: { aliases: ['Assigned to', 'Assignee', 'Agent', 'Technician', 'Owner'], pii: 'name' },
  reopen_count: { type: 'number', aliases: ['Reopen Count', 'Reopened', 'Times Reopened'] },
});

export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  response_hours: { type: 'object', additionalProperties: { type: 'number', minimum: 0 }, description: 'First response target in hours per priority, e.g. {"P1": 1, "P2": 4, "P3": 8, "P4": 24} (default)' },
  resolve_hours: { type: 'object', additionalProperties: { type: 'number', minimum: 0 }, description: 'Resolution target in hours per priority, e.g. {"P1": 4, "P2": 24, "P3": 72, "P4": 120} (default)' },
  hold_days: { type: 'number', minimum: 1, description: 'Days on hold after which a ticket is flagged (default 7)' },
  reopen_min: { type: 'integer', minimum: 1, description: 'Reopens after which a ticket is flagged (default 2)' },
  team_breach_pct: { type: 'number', minimum: 1, maximum: 100, description: 'Share of a team\'s tickets breached above which the team is flagged (default 20)' },
} };
export const DEFAULTS = Object.freeze({ response_hours: { P1: 1, P2: 4, P3: 8, P4: 24 }, resolve_hours: { P1: 4, P2: 24, P3: 72, P4: 120 }, hold_days: 7, reopen_min: 2, team_breach_pct: 20 });

/** P1..P4 from words or numbers: "1 - Critical", "High", "P2". */
export function priorityOf(v) {
  const t = low(v); const m = /(?:^|p|\b)([1-4])\b/.exec(t);
  if (m) return `P${m[1]}`;
  return /crit|urgent|highest/.test(t) ? 'P1' : /high/.test(t) ? 'P2' : /med|normal|moderate/.test(t) ? 'P3' : /low|lowest|plan/.test(t) ? 'P4' : 'P3';
}
const OPEN = (st) => !/resolved|closed|cancel|done|complete/.test(low(st));

export function reviewTickets(rows, settings = {}, asOf) {
  const s = { ...DEFAULTS, ...settings, response_hours: { ...DEFAULTS.response_hours, ...(settings.response_hours || {}) }, resolve_hours: { ...DEFAULTS.resolve_hours, ...(settings.resolve_hours || {}) } };
  const now = asOf ? toMs(`${asOf} 23:59:59`) : Date.now();
  const ts = rows.filter((r) => str(r.ticket) && Number.isFinite(toMs(r.opened_at))).map((r) => ({ id: str(r.ticket), p: priorityOf(r.priority), open: toMs(r.opened_at), resp: toMs(r.first_response_at), res: toMs(r.resolved_at), state: str(r.state), team: str(r.team) || '(no team)', who: str(r.assignee), reopen: num(r.reopen_count) || 0 }));
  const items = []; const teams = {}; const pri = {};
  const hours = (a, b) => round1((b - a) / 3600000);
  for (const t of ts) {
    const isOpen = OPEN(t.state) && !Number.isFinite(t.res); const end = Number.isFinite(t.res) ? t.res : now; const age = hours(t.open, end);
    const resT = s.resolve_hours[t.p]; const respT = s.response_hours[t.p];
    const breached = resT !== undefined && age > resT;
    const tm = teams[t.team] || (teams[t.team] = { team: t.team, tickets: 0, breached: 0, open: 0 }); tm.tickets++; if (breached) tm.breached++; if (isOpen) tm.open++;
    const pr = pri[t.p] || (pri[t.p] = { priority: t.p, open: 0, breached_open: 0 }); if (isOpen) { pr.open++; if (breached) pr.breached_open++; }
    if (isOpen && breached) items.push(finding('resolution_breached', ['P1', 'P2'].includes(t.p) ? 'high' : 'medium', t.id, `${t.p} ticket ${t.id} (${t.team}) has been open ${age} hours; the target is ${resT}.`, 'Escalate it to the team lead today, or agree a new date with the requester.', { subject: t.team }));
    if (respT !== undefined) { const r = Number.isFinite(t.resp) ? hours(t.open, t.resp) : null; if ((r === null && isOpen && age > respT) || (r !== null && r > respT)) items.push(finding('response_breached', 'medium', t.id, `${t.p} ticket ${t.id} ${r === null ? `has had no first response after ${age} hours` : `got its first response after ${r} hours`}; the target is ${respT}.`, 'Check the queue for this team and priority; an automatic acknowledgement does not count as a response.', { subject: t.team })); }
    if (isOpen && !t.who && age > 24) items.push(finding('no_assignee', 'medium', t.id, `Ticket ${t.id} has been open ${age} hours with nobody assigned.`, 'Assign it in the next triage round.', { subject: t.team }));
    if (isOpen && /hold|pending|waiting/i.test(t.state) && age > s.hold_days * 24) items.push(finding('parked_on_hold', 'low', t.id, `Ticket ${t.id} is "${t.state}" and was opened ${round1(age / 24)} days ago.`, 'Chase the person it waits for, or close it with a note.', { subject: t.team }));
    if (t.reopen >= s.reopen_min) items.push(finding('reopened_often', 'low', t.id, `Ticket ${t.id} was reopened ${t.reopen} times.`, 'Look for the root cause instead of closing it again.', { subject: t.team }));
  }
  for (const tm of Object.values(teams)) { const sh = pct(tm.breached, tm.tickets); if (tm.tickets >= 3 && sh > s.team_breach_pct) items.push(finding('team_breach_rate', 'medium', tm.team, `${sh}% of the tickets for ${tm.team} missed their resolution target (${tm.breached} of ${tm.tickets}).`, 'Look at staffing, triage and the priorities the team receives.', { subject: tm.team })); }
  const open = ts.filter((t) => OPEN(t.state) && !Number.isFinite(t.res)); const ageDays = (t) => (now - t.open) / 86400000;
  const buckets = { under_1_day: 0, '1_to_7_days': 0, '8_to_30_days': 0, over_30_days: 0 };
  for (const t of open) { const d = ageDays(t); buckets[d < 1 ? 'under_1_day' : d <= 7 ? '1_to_7_days' : d <= 30 ? '8_to_30_days' : 'over_30_days']++; }
  return { tickets: ts.length, open_tickets: open.length, aging: buckets, by_priority: Object.values(pri).sort((a, b) => (a.priority < b.priority ? -1 : 1)), by_team: Object.values(teams).sort((a, b) => (a.team < b.team ? -1 : 1)), items };
}
