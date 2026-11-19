import { readFileSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, settingsFrom, LIMITS } from 'fairwire-core';
import { INCIDENT_FIELDS, UPTIME_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewIncidents } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  incidents: fileArg('Incident export under --root (PagerDuty, Opsgenie, ServiceNow, Jira or any CSV, Excel or JSON) for one period: one row per incident with service, severity, start, acknowledged, resolved, review link and related change'),
  uptime: fileArg('Optional availability per service for the same period, with its target'),
  settings: SETTINGS_ARG('ack_minutes, resolve_hours, postmortem_for, repeat_min, default_slo_pct, budget_warn_pct'),
};

export const manifest = wireAgent({
  // Columns the "value is missing" checks depend on: an export without the column skips the check instead of flagging every row.
  needs: { missing_postmortem: ['postmortem'] },
  pkg, prefix: 'incidents', title: 'Fairwire Uptime Incidents',
  description: 'Reviews uptime and incident exports: services below their availability target, major incidents with no review, services failing again and again, slow acknowledgement and resolution against your targets, error budgets nearly spent and incidents that followed a change. Drafts review notes.',
  args, required: ['incidents'],
  sources: { incidents: { label: 'Incidents', args: ['incidents'], fields: INCIDENT_FIELDS }, uptime: { label: 'Availability', args: ['uptime'], fields: UPTIME_FIELDS } },
  configSchemas: { incidents_settings: SETTINGS_SCHEMA },
  run: (a, ctx) => reviewIncidents(ctx.records(a.incidents, 'incidents'), a.uptime ? ctx.records(a.uptime, 'uptime') : [], settingsFrom(a, ctx, 'incidents_settings', DEFAULTS)),
  summary: (o) => `${o.incidents} incident(s) on ${o.services} service(s), ${o.major} major, mean time to resolve ${o.mttr_hours ?? 'n/a'} hours: ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Review uptime and incidents', description: 'Review incidents and availability for the period and list missed targets, missing reviews, repeat failures, slow responses, budget burn and change-related incidents.' },
  explain: { arg: 'service', argSchema: { type: 'string', maxLength: 200, description: 'Service or incident id from incidents_check' }, title: 'Explain one service or incident', description: 'Every finding for one service or incident.', match: (i, v) => i.key === v || String(i.subject).toLowerCase() === String(v).toLowerCase() },
  report: {
    title: 'Uptime and incidents', base: 'uptime-incidents',
    sections: (o) => [{ title: 'By service', rows: o.by_service, columns: ['service', 'availability_pct', 'target_pct', 'budget_used_pct'] }],
    limits: [LIMITS.files, 'Availability is the figure your monitoring exported for the period; targets are yours, not contractual SLAs unless you say so.', 'Times are measured from the start time in the export; detection delays before that are not visible.', LIMITS.defaults, LIMITS.live],
  },
  note: { noun: 'review_note', verb: 'send', category: 'binding_send', actor: 'the service owner', to: 'service owners and the incident manager', subject: 'Incident follow-ups for the period', ask: 'Please book the missing reviews and name an owner for each repeat failure.' },
  refused: [
    { name: 'status_page_publish', category: 'binding_send', description: 'Fairwire Uptime Incidents never posts to a status page or tells customers anything.' },
    { name: 'oncall_page_responder', category: 'binding_send', description: 'Fairwire Uptime Incidents never pages anyone.' },
  ],
  prompt: { title: 'Review uptime and incidents', description: 'Walks the host model through an incident review with Fairwire Uptime Incidents.', text: 'You are helping an IT or SRE lead review incidents with fairwire-uptime-incidents. Fairwire Uptime Incidents only reads exports. 1. Call incidents_check; lead with services below target and major incidents with no review. 2. Use incidents_explain for a service. 3. Call incidents_write_report. 4. Offer incidents_draft_review_note; incidents_request_send waits for one named click.' },
});
