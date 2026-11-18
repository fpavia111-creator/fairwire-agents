// Aparctias of Restores: restore test review. Pure functions.
import { num, str, low, isoDate, addDays, daysBetween, finding } from 'fairwire-core';

export const CHECKS = Object.freeze({
  never_tested: 'A critical system with no restore test on record.',
  failed_not_retested: 'The latest restore test of a system failed and has not been run again successfully.',
  test_overdue: 'The last restore test is older than the test interval for that system.',
  rto_missed: 'The last restore took longer than the recovery time objective (RTO).',
  rpo_missed: 'The restored data was older than the recovery point objective (RPO).',
  no_sign_off: 'The last restore test has no named person signing off the result.',
});

export const TEST_FIELDS = Object.freeze({
  test_id: { aliases: ['Test ID', 'ID', 'Reference', 'Ticket'], required: true },
  system: { aliases: ['System', 'Application', 'Server', 'VM', 'Service'], required: true },
  tested_on: { type: 'date', aliases: ['Tested On', 'Test Date', 'Date', 'Performed'], required: true },
  result: { aliases: ['Result', 'Outcome', 'Status', 'Pass/Fail'], required: true },
  restore_minutes: { type: 'number', aliases: ['Restore Minutes', 'Restore Time (min)', 'Duration (min)', 'Time to Restore'] },
  data_age_hours: { type: 'number', aliases: ['Data Age Hours', 'Restore Point Age (h)', 'Data Loss (h)', 'Recovery Point Age'] },
  signed_off_by: { aliases: ['Signed Off By', 'Approved By', 'Verified By', 'Reviewer'], pii: 'name' },
});
export const CRITICAL_FIELDS = Object.freeze({
  system: { aliases: ['System', 'Application', 'Server', 'Name'], required: true },
  rto_minutes: { type: 'number', aliases: ['RTO', 'RTO Minutes', 'Recovery Time Objective'] },
  rpo_hours: { type: 'number', aliases: ['RPO', 'RPO Hours', 'Recovery Point Objective'] },
  test_interval_days: { type: 'number', aliases: ['Test Interval Days', 'Test Every (days)', 'Interval'] },
});

export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  test_interval_days: { type: 'integer', minimum: 1, description: 'Days between restore tests when a system has none of its own (default 180)' },
  rto_minutes: { type: 'number', minimum: 1, description: 'Recovery time objective when a system has none (default 240)' },
  rpo_hours: { type: 'number', minimum: 1, description: 'Recovery point objective when a system has none (default 24)' },
} };
export const DEFAULTS = Object.freeze({ test_interval_days: 180, rto_minutes: 240, rpo_hours: 24 });

const passed = (v) => /^(pass|passed|success|successful|ok|yes|green)$/i.test(str(v));

export function reviewRestores(testRows, criticalRows = [], settings = {}, asOf) {
  const s = { ...DEFAULTS, ...settings };
  const crit = new Map(criticalRows.filter((r) => str(r.system)).map((r) => [low(r.system), { name: str(r.system), rto: num(r.rto_minutes) ?? s.rto_minutes, rpo: num(r.rpo_hours) ?? s.rpo_hours, every: num(r.test_interval_days) ?? s.test_interval_days }]));
  const tests = testRows.filter((r) => str(r.system) && isoDate(r.tested_on)).map((r) => ({ id: str(r.test_id), system: str(r.system), key: low(r.system), on: isoDate(r.tested_on), pass: passed(r.result), minutes: num(r.restore_minutes), age: num(r.data_age_hours), by: str(r.signed_off_by) }));
  const bySys = new Map(); for (const t of tests) bySys.set(t.key, [...(bySys.get(t.key) || []), t]);
  const items = []; const due = [];
  for (const [k, c] of crit) if (!bySys.has(k)) { items.push(finding('never_tested', 'high', c.name, `${c.name} is critical but has never had a restore test on record.`, 'Plan a restore test this month and record time taken and data age.', { subject: c.name })); due.push({ system: c.name, date: asOf }); }
  for (const [k, list] of bySys) {
    list.sort((a, b) => (a.on < b.on ? -1 : a.on > b.on ? 1 : a.id < b.id ? -1 : 1));
    const c = crit.get(k) || { name: list[0].system, rto: s.rto_minutes, rpo: s.rpo_hours, every: s.test_interval_days };
    const last = list.at(-1); const name = c.name;
    if (!last.pass) items.push(finding('failed_not_retested', 'high', name, `The latest restore test of ${name} (${last.id}, ${last.on}) failed and has not been repeated successfully.`, 'Fix the cause and run the test again; until then treat the backup as unproven.', { subject: name }));
    const lastPass = [...list].reverse().find((t) => t.pass);
    const ref = lastPass || last; const next = addDays(ref.on, c.every); due.push({ system: name, date: last.pass ? next : asOf || next });
    if (asOf && daysBetween(ref.on, asOf) > c.every) items.push(finding('test_overdue', 'medium', name, `${name} was last restore-tested${lastPass ? ' successfully' : ''} on ${ref.on}; the test was due by ${next}.`, 'Schedule the next restore test.', { subject: name, due: next }));
    if (lastPass && lastPass.minutes !== null && lastPass.minutes > c.rto) items.push(finding('rto_missed', 'medium', name, `The last restore of ${name} took ${lastPass.minutes} minutes; the RTO is ${c.rto}.`, 'Look at what took the time (copy speed, rebuild steps, approvals) and change the plan or the RTO.', { subject: name }));
    if (lastPass && lastPass.age !== null && lastPass.age > c.rpo) items.push(finding('rpo_missed', 'medium', name, `The last restore of ${name} brought back data ${lastPass.age} hours old; the RPO is ${c.rpo}.`, 'Back up more often, or agree a longer RPO with the system owner.', { subject: name }));
    if (!last.by) items.push(finding('no_sign_off', 'low', name, `Restore test ${last.id} of ${name} has no sign-off.`, 'Ask the system owner to confirm the restored data was usable and record their name.', { subject: name }));
  }
  return { tests: tests.length, systems: bySys.size, critical: crit.size, passed: tests.filter((t) => t.pass).length, due: due.filter((d) => d.date).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.system < b.system ? -1 : 1)), items };
}
