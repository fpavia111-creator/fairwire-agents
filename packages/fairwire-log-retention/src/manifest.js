import { readFileSync } from 'node:fs';
import { wireAgent, fileArg, SETTINGS_ARG, AS_OF_ARG, settingsFrom, LIMITS, today } from 'fairwire-core';
import { SOURCE_FIELDS, ASSET_FIELDS, SETTINGS_SCHEMA, DEFAULTS, reviewLogs } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  sources: fileArg('Log source inventory under --root (SIEM or log platform export: Sentinel, Splunk, Elastic, Graylog or any CSV, Excel or JSON): one row per source with host, category, retention days, last event and daily volume against its usual volume'),
  assets: fileArg('Optional asset list (host and type) to find systems that send no logs'),
  settings: SETTINGS_ARG('retention_policy_days, silent_hours, volume_jump_pct, too_long_factor, asset_types_logged'),
  as_of: AS_OF_ARG,
};

export const manifest = wireAgent({
  pkg, prefix: 'logs', title: 'Fairwire Log Retention',
  description: 'Reviews log retention and coverage: sources kept shorter than your policy, sources that went quiet, systems in your asset list sending no logs, daily volume jumps that raise cost, and sources kept far longer than policy. Drafts notes for the log platform owner; never changes retention.',
  args, required: ['sources'],
  sources: { sources: { label: 'Log sources', args: ['sources'], fields: SOURCE_FIELDS }, assets: { label: 'Asset list', args: ['assets'], fields: ASSET_FIELDS } },
  configSchemas: { logs_settings: SETTINGS_SCHEMA },
  run: (a, ctx) => reviewLogs(ctx.records(a.sources, 'sources'), a.assets ? ctx.records(a.assets, 'assets') : [], settingsFrom(a, ctx, 'logs_settings', DEFAULTS), a.as_of || today()),
  summary: (o) => `${o.sources} log source(s), ${o.gb_per_day} GB a day${o.coverage_pct !== null ? `, ${o.coverage_pct}% of ${o.assets_in_scope} in-scope assets logging` : ''}: ${o.open} open finding(s), ${o.high} high.`,
  check: { title: 'Review log retention and coverage', description: 'Review the log source inventory against your retention policy and asset list and list short retention, silent sources, missing systems, volume jumps and over-long retention.' },
  explain: { arg: 'source', argSchema: { type: 'string', maxLength: 300, description: 'Source (source@host) or category from logs_check' }, title: 'Explain one source or category', description: 'Every finding for one log source, host or category.', match: (i, v) => i.key === v || String(i.key).split('@')[0] === v || i.subject === String(v).toLowerCase() },
  report: {
    title: 'Log retention and coverage', base: 'log-retention',
    sections: (o) => [{ title: 'By type', rows: o.by_category, columns: ['category', 'sources', 'gb_per_day'] }],
    limits: [LIMITS.files, 'Retention defaults (365 days for security, 90 for network, 30 for application logs) are working defaults, not a legal requirement; your regulator, insurer or contracts decide what you must keep.', 'A source counts as silent from the last event in the export; time zones in the export are taken as written.', LIMITS.defaults, LIMITS.live],
  },
  note: { noun: 'logging_note', verb: 'send', category: 'binding_send', actor: 'the log platform owner', to: 'security operations and the log platform owner', subject: 'Logging gaps and retention to fix', ask: 'Please restore silent security sources first, then plan retention and coverage changes.' },
  refused: [
    { name: 'siem_change_retention', category: 'production_deploy', description: 'Fairwire Log Retention never changes retention, ingestion or collection settings.' },
    { name: 'siem_delete_logs', category: 'delete_personal_data', description: 'Fairwire Log Retention never deletes logs.' },
  ],
  prompt: { title: 'Review log retention', description: 'Walks the host model through a logging review with Fairwire Log Retention.', text: 'You are helping a security lead review log retention and coverage with fairwire-log-retention. Fairwire Log Retention only reads exports. 1. Call logs_check; lead with silent security sources and retention under policy. 2. Use logs_explain for one source. 3. Call logs_write_report. 4. Offer logs_draft_logging_note; logs_request_send waits for one named click.' },
});
