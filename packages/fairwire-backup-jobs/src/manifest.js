import { readFileSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, AS_OF_ARG, settingsFrom, LIMITS, exportProfile, today } from 'fairwire-core';
import { JOB_FIELDS, CRITICAL_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewBackups } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  jobs: fileArg('Backup job history under --root (Veeam, Commvault, Datto, Acronis, Azure Backup or any CSV, Excel or JSON): one row per run and system with job, status, start, end, size, copy type and retention'),
  critical: fileArg('Optional list of critical systems with their recovery point objective in hours'),
  settings: SETTINGS_ARG('rpo_hours, failures_in_a_row, warnings_in_a_row, size_drop_pct, offsite_days, retention_days_min'),
  as_of: AS_OF_ARG,
};

export const manifest = wireAgent({
  pkg, prefix: 'backups', title: 'Fairwire Backup Jobs',
  description: 'Reviews backup job results: critical systems no job covers, systems with no good backup inside their RPO, runs failing or warning again and again, backups much smaller than usual, no offsite or immutable copy, and retention shorter than your policy. Drafts notes; never starts or deletes a backup.',
  args, required: ['jobs'],
  sources: { jobs: { label: 'Backup runs', args: ['jobs'], fields: JOB_FIELDS, profiles: [exportProfile('veeam_job_sessions', { job: 'Job Name', status: 'Status', started_at: 'Start Time', ended_at: 'End Time', system: 'Object Name', size_bytes: 'Transferred' })] }, critical: { label: 'Critical systems', args: ['critical'], fields: CRITICAL_FIELDS } },
  configSchemas: { backups_settings: SETTINGS_SCHEMA },
  run: (a, ctx) => reviewBackups(ctx.records(a.jobs, 'jobs'), a.critical ? ctx.records(a.critical, 'critical') : [], settingsFrom(a, ctx, 'backups_settings', DEFAULTS), a.as_of || today()),
  summary: (o) => `${o.runs} run(s) for ${o.systems} system(s), ${o.success_pct}% successful, ${o.failed_runs} failed, ${o.critical} critical system(s) listed: ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Review backup results', description: 'Review the job history per system and list uncovered critical systems, missed RPOs, repeated failures and warnings, size drops, missing offsite copies and short retention.' },
  explain: { arg: 'system', argSchema: { type: 'string', maxLength: 200, description: 'System name from backups_check' }, title: 'Explain one system', description: 'Every finding for one protected system.', match: (i, v) => String(i.key).toLowerCase() === String(v).toLowerCase() },
  report: {
    title: 'Backup job results', base: 'backup-jobs',
    limits: [LIMITS.files, 'A successful job is not a tested restore: only a restore test shows the data comes back (see fairwire-restore-tests).', 'Copy type is read from words like offsite, cloud, immutable or tape in the export; name your targets that way or the offsite check cannot see them.', LIMITS.defaults, LIMITS.live],
  },
  note: { noun: 'backup_note', verb: 'send', category: 'binding_send', actor: 'the backup owner', to: 'backup and infrastructure team', subject: 'Backups to fix', ask: 'Please fix the critical systems first and confirm when each has a good backup again.' },
  refused: [
    { name: 'backup_start_job', category: 'production_deploy', description: 'Fairwire Backup Jobs never starts, stops or edits a backup job.' },
    { name: 'backup_delete_restore_points', category: 'delete_personal_data', description: 'Fairwire Backup Jobs never deletes a backup or restore point.' },
  ],
  prompt: { title: 'Review backups', description: 'Walks the host model through a backup review with Fairwire Backup Jobs.', text: 'You are helping an IT lead review backup results with fairwire-backup-jobs. Fairwire Backup Jobs only reads the history. 1. Call backups_check; lead with critical systems that are not covered or are outside their RPO. 2. Use backups_explain for one system. 3. Call backups_write_report. 4. Offer backups_draft_backup_note; backups_request_send waits for one named click.' },
});
