// Fairwire Uptime Incidents: uptime and incident review. Pure functions.
import { num, str, low, yes, toMs, round1, round2, finding } from 'fairwire-core';

export const CHECKS = Object.freeze({
  below_slo: 'A service whose availability was below its target.',
  missing_postmortem: 'A major incident (SEV1 or SEV2 by default) resolved with no review written.',
  repeat_failures: 'The same service had several incidents in the period.',
  slow_acknowledge: 'An incident acknowledged later than the target for its severity.',
  slow_resolve: 'An incident resolved later than the target for its severity.',
  error_budget_nearly_spent: 'A service still meeting its target but with most of its error budget used.',
  change_caused: 'Incidents linked to a change (a sign to look at change testing for that service).',
});

export const INCIDENT_FIELDS = Object.freeze({
  incident_id: { aliases: ['Incident', 'Incident ID', 'ID', 'Number', 'Key'], required: true },
  service: { aliases: ['Service', 'Application', 'System', 'Component', 'Business Service'], required: true },
  severity: { aliases: ['Severity', 'Priority', 'SEV', 'Impact', 'Urgency'] },
  started_at: { type: 'datetime', aliases: ['Started', 'Start', 'Opened', 'Created', 'Triggered At', 'Detected'], required: true },
  acknowledged_at: { type: 'datetime', aliases: ['Acknowledged', 'Acknowledged At', 'Ack Time', 'First Response'] },
  resolved_at: { type: 'datetime', aliases: ['Resolved', 'Resolved At', 'Closed', 'End'] },
  postmortem: { aliases: ['Postmortem', 'Post-incident Review', 'PIR', 'Review', 'RCA Link'] },
  change_id: { aliases: ['Change', 'Change ID', 'Caused by Change', 'Related Change'] },
});
export const UPTIME_FIELDS = Object.freeze({
  service: { aliases: ['Service', 'Monitor', 'Check', 'Application'], required: true },
  availability_pct: { type: 'number', aliases: ['Availability %', 'Uptime %', 'Availability', 'Uptime', 'SLI'], required: true },
  target_pct: { type: 'number', aliases: ['Target %', 'SLO', 'Target', 'SLA %'] },
});

export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  ack_minutes: { type: 'object', additionalProperties: { type: 'number', minimum: 0 }, description: 'Acknowledge target in minutes per severity (default SEV1 15, SEV2 30, SEV3 60, SEV4 240)' },
  resolve_hours: { type: 'object', additionalProperties: { type: 'number', minimum: 0 }, description: 'Resolve target in hours per severity (default SEV1 4, SEV2 8, SEV3 24, SEV4 72)' },
  postmortem_for: { type: 'array', items: { type: 'string' }, maxItems: 4, description: 'Severities that need a written review (default SEV1, SEV2)' },
  repeat_min: { type: 'integer', minimum: 2, description: 'Incidents on one service in the file before it is flagged (default 3)' },
  default_slo_pct: { type: 'number', minimum: 50, maximum: 100, description: 'Availability target for services with none in the file (default 99.9)' },
  budget_warn_pct: { type: 'number', minimum: 1, maximum: 100, description: 'Share of the error budget used that is flagged (default 80)' },
} };
export const DEFAULTS = Object.freeze({ ack_minutes: { SEV1: 15, SEV2: 30, SEV3: 60, SEV4: 240 }, resolve_hours: { SEV1: 4, SEV2: 8, SEV3: 24, SEV4: 72 }, postmortem_for: ['SEV1', 'SEV2'], repeat_min: 3, default_slo_pct: 99.9, budget_warn_pct: 80 });

export const sevOf = (v) => { const t = low(v); const m = /([1-4])/.exec(t); if (m) return `SEV${m[1]}`; return /crit|major|outage/.test(t) ? 'SEV1' : /high/.test(t) ? 'SEV2' : /low|minor/.test(t) ? 'SEV4' : 'SEV3'; };

export function reviewIncidents(incRows, uptimeRows = [], settings = {}) {
  const s = { ...DEFAULTS, ...settings, ack_minutes: { ...DEFAULTS.ack_minutes, ...(settings.ack_minutes || {}) }, resolve_hours: { ...DEFAULTS.resolve_hours, ...(settings.resolve_hours || {}) } };
  const inc = incRows.filter((r) => str(r.incident_id) && str(r.service) && Number.isFinite(toMs(r.started_at))).map((r) => ({ id: str(r.incident_id), service: str(r.service), sev: sevOf(r.severity), start: toMs(r.started_at), ack: toMs(r.acknowledged_at), res: toMs(r.resolved_at), pm: str(r.postmortem), change: str(r.change_id) }));
  const items = []; const needPm = new Set(s.postmortem_for.map((x) => x.toUpperCase()));
  for (const i of inc) {
    const ackMin = Number.isFinite(i.ack) ? round1((i.ack - i.start) / 60000) : null; const resH = Number.isFinite(i.res) ? round2((i.res - i.start) / 3600000) : null;
    if (ackMin !== null && s.ack_minutes[i.sev] !== undefined && ackMin > s.ack_minutes[i.sev]) items.push(finding('slow_acknowledge', 'medium', i.id, `${i.sev} incident ${i.id} on ${i.service} was acknowledged after ${ackMin} minutes; the target is ${s.ack_minutes[i.sev]}.`, 'Check the on-call rota and paging for that time.', { subject: i.service }));
    if (resH !== null && s.resolve_hours[i.sev] !== undefined && resH > s.resolve_hours[i.sev]) items.push(finding('slow_resolve', 'medium', i.id, `${i.sev} incident ${i.id} on ${i.service} took ${resH} hours to resolve; the target is ${s.resolve_hours[i.sev]}.`, 'Cover it in the review: what slowed diagnosis or recovery?', { subject: i.service }));
    if (resH !== null && needPm.has(i.sev) && (!i.pm || yes(i.pm) === false || /^(n\/a|none|-)$/i.test(i.pm))) items.push(finding('missing_postmortem', 'medium', i.id, `${i.sev} incident ${i.id} on ${i.service} is resolved with no review written.`, 'Hold a blameless review and record the actions with owners.', { subject: i.service }));
  }
  const bySvc = new Map(); for (const i of inc) bySvc.set(low(i.service), [...(bySvc.get(low(i.service)) || []), i]);
  for (const [, list] of bySvc) {
    const svc = [...list].sort((a, b) => (a.id < b.id ? -1 : 1))[0].service;
    if (list.length >= s.repeat_min) items.push(finding('repeat_failures', 'medium', svc, `${svc} had ${list.length} incidents (${list.map((i) => i.id).sort().join(', ')}).`, 'Look for a shared cause across them and fund a fix, not another patch.', { subject: svc }));
    const ch = list.filter((i) => i.change); if (ch.length) items.push(finding('change_caused', 'low', svc, `${ch.length} incident(s) on ${svc} followed a change (${[...new Set(ch.map((i) => i.change))].sort().join(', ')}).`, 'Review how changes to this service are tested and rolled back.', { subject: svc }));
  }
  const svcs = [];
  for (const r of uptimeRows) {
    const svc = str(r.service); const av = num(r.availability_pct); if (!svc || av === null) continue; const tgt = num(r.target_pct) ?? s.default_slo_pct;
    const budget = 100 - tgt; const used = 100 - av; const usedPct = budget > 0 ? round1((100 * used) / budget) : 0;
    svcs.push({ service: svc, availability_pct: av, target_pct: tgt, budget_used_pct: usedPct });
    if (av < tgt) items.push(finding('below_slo', 'high', `uptime:${svc}`, `${svc} was available ${av}% against a target of ${tgt}%.`, 'Agree a recovery plan with the service owner; tell the people who rely on the target.', { subject: svc }));
    else if (usedPct >= s.budget_warn_pct) items.push(finding('error_budget_nearly_spent', 'low', `uptime:${svc}`, `${svc} met its ${tgt}% target but used ${usedPct}% of its error budget.`, 'Slow risky changes to this service until the period ends.', { subject: svc }));
  }
  const resolved = inc.filter((i) => Number.isFinite(i.res));
  const mttr = resolved.length ? round2(resolved.reduce((t, i) => t + (i.res - i.start), 0) / resolved.length / 3600000) : null;
  return { incidents: inc.length, services: bySvc.size, major: inc.filter((i) => needPm.has(i.sev)).length, mttr_hours: mttr, by_service: svcs.sort((a, b) => (a.service < b.service ? -1 : 1)), items };
}
