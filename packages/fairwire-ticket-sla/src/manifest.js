import { readFileSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, AS_OF_ARG, settingsFrom, LIMITS, exportProfile, today } from 'fairwire-core';
import { TICKET_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewTickets } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  tickets: fileArg('Service desk export under --root (ServiceNow, Jira Service Management, Freshservice, Zendesk or any CSV, Excel or JSON): one row per ticket with priority, opened, first response, resolved, state, team, assignee and reopen count'),
  settings: SETTINGS_ARG('response_hours, resolve_hours, hold_days, reopen_min, team_breach_pct'),
  as_of: AS_OF_ARG,
};
const PROFILES = [
  exportProfile('servicenow_incidents', { ticket: 'number', priority: 'priority', opened_at: 'opened_at', state: 'state', team: 'assignment_group', assignee: 'assigned_to', resolved_at: 'resolved_at', reopen_count: 'reopen_count' }),
  exportProfile('jira_service_management', { ticket: 'Issue key', priority: 'Priority', opened_at: 'Created', state: 'Status', resolved_at: 'Resolved', assignee: 'Assignee' }),
];

export const manifest = wireAgent({
  // Columns the "value is missing" checks depend on: an export without the column skips the check instead of flagging every row.
  needs: { response_breached: ['first_response_at'], no_assignee: ['assignee'] },
  pkg, prefix: 'tickets', title: 'Fairwire Ticket SLA',
  description: 'Reviews a service desk export for SLA aging: open tickets past their resolution or response targets, tickets with nobody assigned, teams with many breaches, tickets parked on hold and tickets reopened again and again, with aging buckets by priority. Assignee names are masked for the model. Drafts a status note; never closes a ticket.',
  args, required: ['tickets'],
  sources: { tickets: { label: 'Tickets', args: ['tickets'], fields: TICKET_FIELDS, profiles: PROFILES } },
  configSchemas: { tickets_settings: SETTINGS_SCHEMA },
  run: (a, ctx) => reviewTickets(ctx.records(a.tickets, 'tickets'), settingsFrom(a, ctx, 'tickets_settings', DEFAULTS), a.as_of || today()),
  summary: (o) => `${o.tickets} ticket(s), ${o.open_tickets} open (${o.aging.over_30_days} older than 30 days): ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Review ticket SLAs', description: 'Review tickets against your response and resolution targets and list breaches, unassigned tickets, team breach rates, parked and reopened tickets.' },
  explain: { arg: 'ticket', argSchema: { type: 'string', maxLength: 100, description: 'Ticket number or team from tickets_check' }, title: 'Explain one ticket or team', description: 'Every finding for one ticket or team.', match: (i, v) => i.key === v || i.subject === v },
  report: {
    title: 'Ticket SLA aging', base: 'ticket-sla',
    sections: (o) => [{ title: 'By priority', rows: o.by_priority, columns: ['priority', 'open', 'breached_open'] }, { title: 'By team', rows: o.by_team, columns: ['team', 'tickets', 'breached', 'open'] }],
    limits: [LIMITS.files, 'Targets are counted in calendar hours from the opened time; business hours, holidays and SLA pauses in your tool are not modelled, so your tool\'s own SLA flag wins where they differ.', LIMITS.defaults, LIMITS.pii, LIMITS.live],
  },
  note: { noun: 'status_note', verb: 'send', category: 'binding_send', actor: 'the service desk manager', to: 'service desk team leads', subject: 'Tickets behind their targets', ask: 'Please take each item to your next stand-up and reply with an owner and a date.' },
  refused: [
    { name: 'itsm_update_ticket', category: 'production_deploy', description: 'Fairwire Ticket SLA never edits, assigns, closes or reprioritises a ticket.' },
    { name: 'itsm_notify_requester', category: 'binding_send', description: 'Fairwire Ticket SLA never messages requesters.' },
  ],
  prompt: { title: 'Review ticket SLAs', description: 'Walks the host model through an SLA review with Fairwire Ticket SLA.', text: 'You are helping a service desk manager review ticket aging with fairwire-ticket-sla. Assignees are pseudonyms. 1. Call tickets_check; lead with P1 and P2 tickets past their target. 2. Use tickets_explain for a ticket or team. 3. Call tickets_write_report. 4. Offer tickets_draft_status_note; tickets_request_send waits for one named click.' },
});
