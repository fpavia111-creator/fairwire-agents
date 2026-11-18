import { readFileSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, AS_OF_ARG, settingsFrom, LIMITS, today } from 'fairwire-core';
import { TEST_FIELDS, CRITICAL_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewRestores } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  tests: fileArg('Restore test log under --root (spreadsheet, ticket export or backup tool report as CSV, Excel or JSON): one row per test with system, date, result, minutes taken, age of the restored data and who signed it off'),
  critical: fileArg('Optional list of critical systems with RTO minutes, RPO hours and test interval days'),
  settings: SETTINGS_ARG('test_interval_days, rto_minutes, rpo_hours'),
  as_of: AS_OF_ARG,
};

export const manifest = wireAgent({
  pkg, prefix: 'aparctias', title: 'Aparctias of Restores',
  description: 'Reviews restore tests: critical systems never tested, failed tests not repeated, tests overdue for their interval, restores slower than the RTO, restored data older than the RPO and tests nobody signed off. Writes a test calendar and drafts the next test plan.',
  args, required: ['tests'],
  sources: { tests: { label: 'Restore tests', args: ['tests'], fields: TEST_FIELDS }, critical: { label: 'Critical systems', args: ['critical'], fields: CRITICAL_FIELDS } },
  configSchemas: { aparctias_settings: SETTINGS_SCHEMA },
  run: (a, ctx) => reviewRestores(ctx.records(a.tests, 'tests'), a.critical ? ctx.records(a.critical, 'critical') : [], settingsFrom(a, ctx, 'aparctias_settings', DEFAULTS), a.as_of || today()),
  summary: (o) => `${o.tests} restore test(s) for ${o.systems} system(s), ${o.passed} passed, ${o.critical} critical system(s) listed: ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Review restore tests', description: 'Review the restore test log against your critical systems and list missing, failed, overdue, slow, stale and unsigned tests.' },
  explain: { arg: 'system', argSchema: { type: 'string', maxLength: 200, description: 'System from aparctias_check' }, title: 'Explain one system', description: 'Every finding for one system.', match: (i, v) => String(i.key).toLowerCase() === String(v).toLowerCase() },
  report: {
    title: 'Restore tests', base: 'aparctias-restores',
    sections: (o) => [{ title: 'By system', rows: o.due, columns: ['system', 'date'] }],
    ics: (o) => o.due.map((d) => ({ date: d.date, summary: `Restore test due: ${d.system}`, description: 'Written by aparctias-of-restores from your restore test log.' })),
    limits: [LIMITS.files, 'A restore test is only as good as what was checked afterwards; the log should say who confirmed the data was usable.', LIMITS.defaults, LIMITS.pii],
  },
  note: { noun: 'test_plan', verb: 'send', category: 'binding_send', actor: 'the backup owner', to: 'system owners and the backup team', subject: 'Restore tests to schedule', ask: 'Please book a date for each test and name who will check the restored data.' },
  refused: [
    { name: 'backup_restore_to_production', category: 'production_deploy', description: 'Aparctias never starts a restore, least of all over a live system.' },
    { name: 'calendar_send_invites', category: 'binding_send', description: 'Aparctias never sends calendar invitations; it writes an .ics file a person imports.' },
  ],
  prompt: { title: 'Review restore tests', description: 'Walks the host model through a restore test review with Aparctias.', text: 'You are helping an IT lead review restore tests with aparctias-of-restores. Aparctias only reads the log. 1. Call aparctias_check; lead with critical systems never tested and failed tests. 2. Use aparctias_explain for one system. 3. Call aparctias_write_report (it writes a calendar of due tests). 4. Offer aparctias_draft_test_plan; aparctias_request_send waits for one named click.' },
});
