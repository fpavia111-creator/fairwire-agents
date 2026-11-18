// Ossa of Logs: log retention and coverage. Pure functions.
import { num, str, low, toMs, hostKey, round1, pct, finding } from 'fairwire-core';

export const CHECKS = Object.freeze({
  retention_too_short: 'Logs kept for fewer days than your policy for that kind of log (high for security logs).',
  source_silent: 'A log source that sent nothing for longer than your limit (high for security sources).',
  asset_not_logging: 'A system in your asset list that sends no logs at all.',
  volume_jump: 'A source sending far more data a day than its usual amount (cost, or something noisy going on).',
  kept_too_long: 'Logs kept far longer than your policy (cost, and personal data kept longer than needed).',
});

export const SOURCE_FIELDS = Object.freeze({
  source: { aliases: ['Source', 'Log Source', 'Data Source', 'Index', 'Table', 'Name'], required: true },
  host: { aliases: ['Host', 'Hostname', 'Device', 'System', 'Computer'] },
  category: { aliases: ['Category', 'Type', 'Log Type', 'Source Type'] },
  retention_days: { type: 'number', aliases: ['Retention Days', 'Retention', 'Retention (days)', 'Keep Days'], required: true },
  last_event: { type: 'datetime', aliases: ['Last Event', 'Last Seen', 'Last Received', 'Latest Event', 'Last Log'] },
  daily_gb: { type: 'number', aliases: ['Daily GB', 'GB per Day', 'Ingest GB/day', 'Volume (GB)', 'Today GB'] },
  avg_daily_gb: { type: 'number', aliases: ['Average Daily GB', 'Avg GB/day', 'Baseline GB', '30-day Average GB'] },
});
export const ASSET_FIELDS = Object.freeze({
  host: { aliases: ['Host', 'Hostname', 'Device Name', 'Name', 'Asset'], required: true },
  type: { aliases: ['Type', 'Class', 'Category'] },
});

export const SETTINGS_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  retention_policy_days: { type: 'object', additionalProperties: { type: 'integer', minimum: 1 }, description: 'Days to keep each category of log, e.g. {"security": 365, "network": 90, "application": 30} (default); other categories use "default" (90)' },
  silent_hours: { type: 'number', minimum: 1, description: 'Hours without events after which a source counts as silent (default 24)' },
  volume_jump_pct: { type: 'number', minimum: 1, description: 'Rise over the usual daily volume, in percent, that is flagged (default 100)' },
  too_long_factor: { type: 'number', minimum: 1, description: 'How many times the policy a source may be kept before it is flagged (default 3)' },
  asset_types_logged: { type: 'array', items: { type: 'string' }, maxItems: 50, description: 'Asset types expected to send logs (default server, firewall, domain controller, vpn, switch)' },
} };
export const DEFAULTS = Object.freeze({ retention_policy_days: { security: 365, network: 90, application: 30, default: 90 }, silent_hours: 24, volume_jump_pct: 100, too_long_factor: 3, asset_types_logged: ['server', 'firewall', 'domain controller', 'vpn', 'switch'] });

const catOf = (c) => { const t = low(c); return /sec|audit|auth|siem|edr|identity|firewall/.test(t) ? 'security' : /net|flow|dns|dhcp|proxy/.test(t) ? 'network' : /app|web|api|service/.test(t) ? 'application' : t || 'default'; };

export function reviewLogs(rows, assetRows = [], settings = {}, asOf) {
  const s = { ...DEFAULTS, ...settings, retention_policy_days: { ...DEFAULTS.retention_policy_days, ...(settings.retention_policy_days || {}) } };
  const now = asOf ? toMs(`${asOf} 23:59:59`) : Date.now();
  const src = rows.filter((r) => str(r.source)).map((r) => ({ source: str(r.source), host: hostKey(r.host), hostShown: str(r.host), cat: catOf(r.category), ret: num(r.retention_days), last: toMs(r.last_event), lastShown: str(r.last_event), gb: num(r.daily_gb), avg: num(r.avg_daily_gb) }));
  const items = [];
  for (const x of src) {
    const policy = s.retention_policy_days[x.cat] ?? s.retention_policy_days.default; const key = `${x.source}${x.hostShown ? `@${x.hostShown}` : ''}`;
    if (x.ret !== null && x.ret < policy) items.push(finding('retention_too_short', x.cat === 'security' ? 'high' : 'medium', key, `${key} (${x.cat}) is kept ${x.ret} days; your policy says ${policy}.`, 'Raise the retention, or archive to cheaper storage for the rest of the period.', { subject: x.cat }));
    if (x.ret !== null && x.ret > policy * s.too_long_factor) items.push(finding('kept_too_long', 'low', key, `${key} (${x.cat}) is kept ${x.ret} days, more than ${s.too_long_factor} times your policy of ${policy}.`, 'Shorten it unless a legal hold or contract needs it; old logs cost money and hold personal data.', { subject: x.cat }));
    if (Number.isFinite(x.last) && (now - x.last) / 3600000 > s.silent_hours) items.push(finding('source_silent', x.cat === 'security' ? 'high' : 'medium', key, `${key} (${x.cat}) has sent nothing since ${x.lastShown}.`, 'Check the forwarder or agent on the source and the collector it sends to.', { subject: x.cat }));
    if (x.gb !== null && x.avg !== null && x.avg > 0 && x.gb > x.avg * (1 + s.volume_jump_pct / 100)) items.push(finding('volume_jump', x.gb > x.avg * 5 ? 'medium' : 'low', key, `${key} sent ${x.gb} GB a day against a usual ${x.avg} GB (+${round1(pct(x.gb - x.avg, x.avg))}%).`, 'Find what got noisy (debug logging, a loop, an attack) before the bill arrives.', { subject: x.cat }));
  }
  const types = s.asset_types_logged.map(low); const logging = new Set(src.map((x) => x.host).filter(Boolean)); let inScope = 0;
  for (const a of assetRows) { const k = hostKey(a.host); if (!k) continue; const t = low(a.type); if (t && !types.some((x) => t.includes(x))) continue; inScope++; if (!logging.has(k)) items.push(finding('asset_not_logging', 'medium', str(a.host), `${str(a.host)}${t ? ` (${t})` : ''} is in your asset list but sends no logs.`, 'Install or configure the log forwarder, or record why it is out of scope.', { subject: 'coverage' })); }
  const cats = {}; for (const x of src) { const e = cats[x.cat] || (cats[x.cat] = { category: x.cat, sources: 0, gb_per_day: 0 }); e.sources++; e.gb_per_day = round1(e.gb_per_day + (x.gb || 0)); }
  return { sources: src.length, assets_in_scope: inScope, coverage_pct: inScope ? pct([...new Set(assetRows.map((a) => hostKey(a.host)))].filter((k) => logging.has(k)).length, inScope) : null, gb_per_day: round1(src.reduce((t, x) => t + (x.gb || 0), 0)), by_category: Object.values(cats).sort((a, b) => (a.category < b.category ? -1 : 1)), items };
}
