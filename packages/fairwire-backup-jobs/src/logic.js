// Fairwire Backup Jobs: backup job results review. Pure functions.
import { num, str, low, toMs, isoDate, daysBetween, humanBytes, finding } from 'fairwire-core';

export const CHECKS = Object.freeze({
  not_covered: 'A system on your critical list that no backup job protects.',
  no_recent_good_backup: 'A system with no successful backup inside its recovery point objective (RPO).',
  repeated_failures: 'The last few runs for a system all failed.',
  size_drop: 'The last good backup is far smaller than usual (data may be missing from it).',
  no_offsite_copy: 'A critical system with no recent offsite or immutable copy (ransomware can reach copies kept next to the original).',
  short_retention: 'Backups kept for fewer days than your policy.',
  warnings_ignored: 'The last few runs for a system all ended with warnings.',
});

export const JOB_FIELDS = Object.freeze({
  job: { aliases: ['Job Name', 'Job', 'Policy', 'Backup Job', 'Plan'], required: true },
  system: { aliases: ['Object', 'VM', 'Server', 'System', 'Client', 'Source', 'Workload', 'Machine'], required: true },
  status: { aliases: ['Status', 'Result', 'State', 'Outcome', 'Session Result'], required: true },
  started_at: { type: 'datetime', aliases: ['Start Time', 'Started', 'Start', 'Creation Time'], required: true },
  ended_at: { type: 'datetime', aliases: ['End Time', 'Finished', 'End', 'Stop Time'] },
  size_bytes: { type: 'number', aliases: ['Backup Size', 'Transferred', 'Size', 'Bytes', 'Data Size'] },
  copy_type: { aliases: ['Copy Type', 'Type', 'Target Type', 'Tier', 'Destination Type'] },
  target: { aliases: ['Target', 'Repository', 'Destination', 'Storage', 'Vault'] },
  retention_days: { type: 'number', aliases: ['Retention', 'Retention Days', 'Restore Points Days', 'Keep Days'] },
});
export const CRITICAL_FIELDS = Object.freeze({
  system: { aliases: ['System', 'Server', 'VM', 'Name', 'Application'], required: true },
  rpo_hours: { type: 'number', aliases: ['RPO', 'RPO Hours', 'Recovery Point Objective'] },
  tier: { aliases: ['Tier', 'Criticality', 'Class'] },
});

export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  rpo_hours: { type: 'number', minimum: 1, description: 'Default recovery point objective in hours when a system has none (default 24)' },
  failures_in_a_row: { type: 'integer', minimum: 2, description: 'Failed runs in a row before a system is flagged (default 3)' },
  warnings_in_a_row: { type: 'integer', minimum: 2, description: 'Warning runs in a row before a system is flagged (default 3)' },
  size_drop_pct: { type: 'number', minimum: 1, maximum: 99, description: 'Drop below the usual size, in percent, that is flagged (default 50)' },
  offsite_days: { type: 'integer', minimum: 1, description: 'Days within which a critical system needs an offsite or immutable copy (default 7)' },
  retention_days_min: { type: 'integer', minimum: 1, description: 'Days your policy says backups must be kept (default 30)' },
} };
export const DEFAULTS = Object.freeze({ rpo_hours: 24, failures_in_a_row: 3, warnings_in_a_row: 3, size_drop_pct: 50, offsite_days: 7, retention_days_min: 30 });

const statusOf = (v) => { const t = low(v); return /fail|error|abort|cancel|miss/.test(t) ? 'failed' : /warn|partial/.test(t) ? 'warning' : /success|succeed|complete|ok|done/.test(t) ? 'success' : 'unknown'; };
const median = (xs) => { const a = [...xs].sort((x, y) => x - y); const m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };

export function reviewBackups(jobRows, criticalRows = [], settings = {}, asOf) {
  const s = { ...DEFAULTS, ...settings };
  const runs = jobRows.filter((r) => str(r.system) && str(r.started_at)).map((r) => ({ job: str(r.job), system: str(r.system), key: low(r.system), status: statusOf(r.status), start: str(r.started_at), ms: toMs(r.started_at), size: num(r.size_bytes), copy: low(r.copy_type), retention: num(r.retention_days) }));
  const crit = new Map(criticalRows.filter((r) => str(r.system)).map((r) => [low(r.system), { name: str(r.system), rpo: num(r.rpo_hours) ?? s.rpo_hours }]));
  const bySys = new Map(); for (const r of runs) bySys.set(r.key, [...(bySys.get(r.key) || []), r]);
  const items = []; const now = asOf ? toMs(`${asOf} 23:59:59`) : Date.now();
  for (const [k, c] of crit) if (!bySys.has(k)) items.push(finding('not_covered', 'high', c.name, `${c.name} is on your critical list but no backup job in the export protects it.`, 'Add it to a backup job today and run a first backup.', { subject: c.name }));
  for (const [k, list] of bySys) {
    list.sort((a, b) => a.ms - b.ms || (a.job < b.job ? -1 : 1));
    const name = list[0].system; const c = crit.get(k); const rpo = c ? c.rpo : s.rpo_hours;
    const primary = list.filter((r) => !/offsite|copy|cloud|immutable|tape|secondary|vault/.test(r.copy));
    const good = primary.filter((r) => r.status === 'success' || r.status === 'warning');
    const last = good.at(-1);
    if (!last || (now - last.ms) / 3600000 > rpo) items.push(finding('no_recent_good_backup', c ? 'high' : 'medium', name, `${name} has no good backup in the last ${rpo} hours${last ? ` (last good run ${last.start})` : ' in the export'}.`, 'Run the job now and fix whatever stopped it.', { subject: name, rpo_hours: rpo }));
    const tail = (st, n) => primary.length >= n && primary.slice(-n).every((r) => r.status === st);
    if (tail('failed', s.failures_in_a_row)) items.push(finding('repeated_failures', 'medium', name, `The last ${s.failures_in_a_row} runs for ${name} (${list.at(-1).job}) failed.`, 'Read the job log; common causes are credentials, a full repository or a changed host.', { subject: name }));
    else if (tail('warning', s.warnings_in_a_row)) items.push(finding('warnings_ignored', 'low', name, `The last ${s.warnings_in_a_row} runs for ${name} ended with warnings.`, 'Read the warnings: skipped files or disks mean the backup is not complete.', { subject: name }));
    const sizes = good.filter((r) => r.size !== null && r.size > 0);
    if (sizes.length >= 4) { const prev = median(sizes.slice(0, -1).map((r) => r.size)); const cur = sizes.at(-1).size; if (cur < prev * (1 - s.size_drop_pct / 100)) items.push(finding('size_drop', 'medium', name, `The last good backup of ${name} was ${humanBytes(cur)}, against a usual ${humanBytes(prev)}.`, 'Check that no disk, database or folder was dropped from the job.', { subject: name })); }
    if (c) { const off = list.filter((r) => /offsite|copy|cloud|immutable|tape|secondary|vault/.test(r.copy) && (r.status === 'success' || r.status === 'warning')); const lastOff = off.at(-1); if (!lastOff || (asOf && daysBetween(isoDate(lastOff.start), asOf) > s.offsite_days)) items.push(finding('no_offsite_copy', 'medium', name, `${name} has no offsite or immutable copy${lastOff ? ` since ${isoDate(lastOff.start)}` : ' in the export'}.`, 'Add a copy job to an offsite or immutable target.', { subject: name })); }
    const ret = list.map((r) => r.retention).filter((x) => x !== null);
    if (ret.length && Math.min(...ret) < s.retention_days_min) items.push(finding('short_retention', 'low', name, `Backups of ${name} are kept for ${Math.min(...ret)} days; your policy says ${s.retention_days_min}.`, 'Raise the retention on the job, or record why this system needs less.', { subject: name }));
  }
  return { runs: runs.length, systems: bySys.size, critical: crit.size, failed_runs: runs.filter((r) => r.status === 'failed').length, success_pct: runs.length ? Math.round((1000 * runs.filter((r) => r.status === 'success').length) / runs.length) / 10 : 0, items };
}
