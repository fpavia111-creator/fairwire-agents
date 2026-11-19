import { readFileSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, settingsFrom, LIMITS } from 'fairwire-core';
import { CHANGE_FIELDS, FREEZE_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewChanges } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  changes: fileArg('Change calendar export under --root (ServiceNow, Jira, Freshservice or any CSV, Excel or JSON): one row per change with system, planned start and end, risk, type, approval, back-out plan, test evidence and outcome'),
  freezes: fileArg('Optional change freeze windows with name, start and end'),
  settings: SETTINGS_ARG('business_hours, emergency_share_pct, failed_min'),
};

export const manifest = wireAgent({
  // Columns the "value is missing" checks depend on: an export without the column skips the check instead of flagging every row.
  needs: { not_approved: ['approval'], no_backout_plan: ['backout_plan'], no_test_evidence: ['test_evidence'] },
  pkg, prefix: 'changes', title: 'Fairwire Change Calendar',
  description: 'Reviews a change calendar: changes inside a freeze, changes with no approval, overlapping changes on the same system, no back-out plan or test evidence, high-risk changes in business hours, systems whose changes keep failing and a high share of emergency changes. Drafts notes for the change board.',
  args, required: ['changes'],
  sources: { changes: { label: 'Changes', args: ['changes'], fields: CHANGE_FIELDS }, freezes: { label: 'Change freezes', args: ['freezes'], fields: FREEZE_FIELDS } },
  configSchemas: { changes_settings: SETTINGS_SCHEMA },
  run: (a, ctx) => reviewChanges(ctx.records(a.changes, 'changes'), a.freezes ? ctx.records(a.freezes, 'freezes') : [], settingsFrom(a, ctx, 'changes_settings', DEFAULTS)),
  summary: (o) => `${o.changes} change(s) on ${o.systems} system(s), ${o.emergency} emergency, ${o.failed} failed, ${o.freezes} freeze window(s): ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Review the change calendar', description: 'Review planned and past changes and list freeze clashes, missing approvals, overlaps, missing back-out plans and tests, risky timing, repeat failures and emergency share.' },
  explain: { arg: 'change', argSchema: { type: 'string', maxLength: 200, description: 'Change id or system from changes_check' }, title: 'Explain one change or system', description: 'Every finding for one change or system.', match: (i, v) => i.key === v || String(i.key).split('+').includes(v) || String(i.subject).toLowerCase() === String(v).toLowerCase() },
  report: {
    title: 'Change calendar review', base: 'change-calendar',
    limits: [LIMITS.files, 'Business hours use the times as written in the export, in one time zone; changes across time zones need a setting per site.', 'A recorded approval is taken at face value; this does not check who approved or whether they could.', LIMITS.defaults, LIMITS.live],
  },
  note: { noun: 'cab_note', verb: 'send', category: 'binding_send', actor: 'the change manager', to: 'change advisory board', subject: 'Changes to review at the next board', ask: 'Please decide on each item at the next board; changes inside a freeze need an explicit yes or a new date.' },
  refused: [
    { name: 'itsm_approve_change', category: 'production_deploy', description: 'Fairwire Change Calendar never approves, schedules or cancels a change.' },
    { name: 'deploy_run_pipeline', category: 'production_deploy', description: 'Fairwire Change Calendar never runs a deployment.' },
  ],
  prompt: { title: 'Review the change calendar', description: 'Walks the host model through a change review with Fairwire Change Calendar.', text: 'You are helping a change manager review the calendar with fairwire-change-calendar. Fairwire Change Calendar only reads exports. 1. Call changes_check; lead with freeze clashes and missing approvals. 2. Use changes_explain for a change or system. 3. Call changes_write_report. 4. Offer changes_draft_cab_note; changes_request_send waits for one named click.' },
});
